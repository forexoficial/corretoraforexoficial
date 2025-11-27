import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Check if continuous mode is requested
    let body: any = {}
    try {
      body = await req.json()
    } catch {
      // If no body, use default single execution
    }

    const isContinuous = body.continuous === true
    const intervalSeconds = body.interval || 2
    const specificUserId = body.specificUserId || null

    console.log(`Starting trade processor - Continuous: ${isContinuous}, Interval: ${intervalSeconds}s, User: ${specificUserId || 'all'}`)

    if (isContinuous) {
      // Continuous mode: run for ~55 seconds with interval
      const startTime = Date.now()
      const maxDuration = 55 * 1000 // 55 seconds max (leave 5s buffer)
      let totalProcessed = 0
      let totalErrors = 0
      let cycles = 0

      while (Date.now() - startTime < maxDuration) {
        cycles++
        console.log(`[Cycle ${cycles}] Processing expired trades...`)

        const result = await processExpiredTrades(supabase, specificUserId)
        totalProcessed += result.processed
        totalErrors += result.errors

        if (result.processed > 0) {
          console.log(`[Cycle ${cycles}] Processed ${result.processed} trades`)
        }

        // Wait for next interval (unless we're close to timeout)
        const remainingTime = maxDuration - (Date.now() - startTime)
        if (remainingTime > intervalSeconds * 1000) {
          await new Promise(resolve => setTimeout(resolve, intervalSeconds * 1000))
        } else {
          break
        }
      }

      console.log(`Continuous processing completed: ${cycles} cycles, ${totalProcessed} trades, ${totalErrors} errors`)

      return new Response(
        JSON.stringify({
          success: true,
          mode: 'continuous',
          cycles,
          processed: totalProcessed,
          errors: totalErrors,
          duration: Date.now() - startTime
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Single execution mode
    console.log('Starting to process expired trades (single execution)...')
    const result = await processExpiredTrades(supabase, specificUserId)

    return new Response(
      JSON.stringify({ 
        success: true, 
        processed: result.processed,
        errors: result.errors,
        total: result.total
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Fatal error:', error)
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

// Main processing function
async function processExpiredTrades(supabase: any, specificUserId: string | null = null) {
  // Get all expired open trades
  const now = new Date().toISOString()
  
  let query = supabase
    .from('trades')
    .select('*')
    .eq('status', 'open')
    .lt('expires_at', now)
  
  // Filter by specific user if provided
  if (specificUserId) {
    query = query.eq('user_id', specificUserId)
  }
  
  const { data: expiredTrades, error: tradesError } = await query

  if (tradesError) {
    console.error('Error fetching expired trades:', tradesError)
    throw tradesError
  }

  if (!expiredTrades || expiredTrades.length === 0) {
    return { processed: 0, errors: 0, total: 0 }
  }

  console.log(`Found ${expiredTrades.length} expired trades to process`)

  let processedCount = 0
  let errorCount = 0

  for (const trade of expiredTrades) {
      try {
        console.log(`Processing trade ${trade.id}...`)

        // CRITICAL: Use the entry_price that was saved when the trade was created
        // This is the VISUAL price the user saw on the chart
        const entryPrice = parseFloat(trade.entry_price)

        if (!entryPrice || entryPrice <= 0) {
          console.error(`Invalid entry_price for trade ${trade.id}: ${entryPrice}`)
          errorCount++
          continue
        }

        // Get closing price (candle at trade expiration time)
        const { data: closeCandle } = await supabase
          .from('candles')
          .select('close')
          .eq('asset_id', trade.asset_id)
          .lte('timestamp', trade.expires_at)
          .order('timestamp', { ascending: false })
          .limit(1)
          .single()

        if (!closeCandle) {
          console.error(`Missing close candle data for trade ${trade.id}`)
          errorCount++
          continue
        }

        const exitPrice = parseFloat(closeCandle.close)
        
        console.log(`Trade ${trade.id}: Entry=${entryPrice}, Exit=${exitPrice}, Type=${trade.trade_type}`)

        // Binary Options Logic:
        // CALL: Win if exit_price > entry_price
        // PUT: Win if exit_price < entry_price
        let won = false
        if (trade.trade_type === 'call') {
          won = exitPrice > entryPrice
        } else {
          won = exitPrice < entryPrice
        }

        const status = won ? 'won' : 'lost'

        // Calculate result amount for balance update
        // CRITICAL: When the trade was created, the amount was already deducted from balance
        // If WON: Add payout (which already includes investment + profit)
        // If LOST: Do nothing (amount was already deducted when trade was created)
        const result = won ? trade.payout : 0

        console.log(`Trade ${trade.id} result: ${status.toUpperCase()}, balance change: ${won ? '+' : ''}${result}`)

        // Update trade status with exit_price
        // Store the actual result for display purposes (positive for win, negative for loss)
        const tradeResult = won ? trade.payout : -trade.amount
        
        const { error: updateTradeError } = await supabase
          .from('trades')
          .update({
            status: status,
            result: tradeResult,
            exit_price: exitPrice,
            closed_at: now
          })
          .eq('id', trade.id)

        if (updateTradeError) {
          console.error(`Error updating trade ${trade.id}:`, updateTradeError)
          errorCount++
          continue
        }

        // Update user balance
        const balanceField = trade.is_demo ? 'demo_balance' : 'balance'
        
        console.log(`[Balance Update] Trade ${trade.id} - Mode: ${trade.is_demo ? 'DEMO' : 'REAL'}, Field: ${balanceField}`)
        
        // Get current balance
        const { data: profile } = await supabase
          .from('profiles')
          .select('demo_balance, balance')
          .eq('user_id', trade.user_id)
          .single()

        if (!profile) {
          console.error(`Profile not found for user ${trade.user_id}`)
          errorCount++
          continue
        }

        const currentBalance = trade.is_demo ? parseFloat(profile.demo_balance || 0) : parseFloat(profile.balance || 0)
        const newBalance = currentBalance + result

        console.log(`[Balance Update] User ${trade.user_id} - Current ${balanceField}: ${currentBalance}, Adding: ${result}, New: ${newBalance}`)

        const { error: updateBalanceError } = await supabase
          .from('profiles')
          .update({ [balanceField]: newBalance })
          .eq('user_id', trade.user_id)

        if (updateBalanceError) {
          console.error(`Error updating balance for user ${trade.user_id}:`, updateBalanceError)
          errorCount++
          continue
        }

        console.log(`[Balance Update] SUCCESS - User ${trade.user_id} ${balanceField} updated to ${newBalance}`)

        processedCount++
        console.log(`Successfully processed trade ${trade.id}`)

      } catch (error) {
        console.error(`Error processing trade ${trade.id}:`, error)
        errorCount++
      }
    }

  console.log(`Finished processing. Success: ${processedCount}, Errors: ${errorCount}`)

  return {
    processed: processedCount,
    errors: errorCount,
    total: expiredTrades.length
  }
}