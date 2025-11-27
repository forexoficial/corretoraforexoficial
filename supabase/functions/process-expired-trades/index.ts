import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { rateLimitMiddleware, getRateLimitHeaders } from '../_shared/rate-limiter.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  // Rate limiting: 10 requests por minuto por usuário
  const rateLimitResponse = rateLimitMiddleware(req, {
    windowMs: 60 * 1000, // 1 minuto
    maxRequests: 10
  });

  if (rateLimitResponse) {
    return rateLimitResponse;
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

      // Adicionar headers de rate limit
      const ip = req.headers.get('x-forwarded-for') || 'unknown';
      const rateLimitHeaders = getRateLimitHeaders(ip, { windowMs: 60000, maxRequests: 10 });

      return new Response(
        JSON.stringify({
          success: true,
          mode: 'continuous',
          cycles,
          processed: totalProcessed,
          errors: totalErrors,
          duration: Date.now() - startTime
        }),
        { headers: { ...corsHeaders, ...rateLimitHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Single execution mode
    console.log('Starting to process expired trades (single execution)...')
    const result = await processExpiredTrades(supabase, specificUserId)

    // Adicionar headers de rate limit
    const ip = req.headers.get('x-forwarded-for') || 'unknown';
    const rateLimitHeaders = getRateLimitHeaders(ip, { windowMs: 60000, maxRequests: 10 });

    return new Response(
      JSON.stringify({ 
        success: true, 
        processed: result.processed,
        errors: result.errors,
        total: result.total
      }),
      { headers: { ...corsHeaders, ...rateLimitHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Fatal error:', error)
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

// Main processing function - Refactored to use database function
async function processExpiredTrades(supabase: any, specificUserId: string | null = null) {
  // Get all expired open trades
  const now = new Date().toISOString()
  
  let query = supabase
    .from('trades')
    .select('id, user_id, expires_at')
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

  // Process each trade using the database function
  for (const trade of expiredTrades) {
    try {
      console.log(`Processing trade ${trade.id}...`)
      
      // Call the database function to process single trade
      // This function handles all logic with proper locking and triggers
      const { data, error } = await supabase.rpc('process_single_expired_trade', {
        p_trade_id: trade.id
      })

      if (error) {
        console.error(`Error processing trade ${trade.id}:`, error)
        errorCount++
        continue
      }

      if (data?.success) {
        console.log(`Trade ${trade.id} processed: ${data.status}`)
        processedCount++
      } else {
        console.log(`Trade ${trade.id} already processed or not found`)
      }

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