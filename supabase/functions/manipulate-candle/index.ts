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
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Get user from auth header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('No authorization header')
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token)
    
    if (authError || !user) {
      throw new Error('Unauthorized')
    }

    const { 
      candleId, 
      manipulationType, 
      manipulatedValues,
      biasDirection,
      biasStrength,
      expiresAt,
      notes
    } = await req.json()

    if (!candleId || !manipulationType || !manipulatedValues) {
      throw new Error('Missing required fields')
    }

    // Get the original candle
    const { data: candle, error: candleError } = await supabaseClient
      .from('candles')
      .select('*')
      .eq('id', candleId)
      .single()

    if (candleError || !candle) {
      throw new Error('Candle not found')
    }

    // Store original values
    const originalValues = {
      open: candle.open,
      high: candle.high,
      low: candle.low,
      close: candle.close,
      volume: candle.volume
    }

    // Validate manipulated values
    if (manipulationType === 'full_control') {
      // Ensure OHLC relationship is valid
      const { open, high, low, close } = manipulatedValues
      if (high < Math.max(open, close) || low > Math.min(open, close)) {
        throw new Error('Invalid OHLC values: high must be >= max(open, close) and low must be <= min(open, close)')
      }
    }

    // Update the candle with manipulated values
    const { error: updateError } = await supabaseClient
      .from('candles')
      .update({
        ...manipulatedValues,
        is_manipulated: true,
        manipulation_type: manipulationType
      })
      .eq('id', candleId)

    if (updateError) {
      throw updateError
    }

    // Create manipulation record
    const { data: manipulation, error: manipError } = await supabaseClient
      .from('chart_manipulations')
      .insert({
        asset_id: candle.asset_id,
        candle_id: candleId,
        manipulation_type: manipulationType,
        original_values: originalValues,
        manipulated_values: manipulatedValues,
        bias_direction: biasDirection,
        bias_strength: biasStrength,
        admin_id: user.id,
        expires_at: expiresAt,
        notes: notes
      })
      .select()
      .single()

    if (manipError) {
      throw manipError
    }

    console.log('Candle manipulated successfully:', {
      candleId,
      manipulationType,
      adminId: user.id
    })

    return new Response(
      JSON.stringify({ 
        success: true, 
        manipulation,
        updatedCandle: {
          ...candle,
          ...manipulatedValues,
          is_manipulated: true,
          manipulation_type: manipulationType
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error:', error)
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})