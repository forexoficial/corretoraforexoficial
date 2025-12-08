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

    const { assetId, timeframe = '1m', count = 300 } = await req.json()

    if (!assetId) {
      throw new Error('Asset ID is required')
    }

    // Get the asset details
    const { data: asset } = await supabase
      .from('assets')
      .select('*')
      .eq('id', assetId)
      .single()

    if (!asset) {
      throw new Error('Asset not found')
    }

    // Check for active biases
    const now = new Date()
    const { data: activeBiases } = await supabase
      .from('chart_biases')
      .select('*')
      .eq('asset_id', assetId)
      .eq('is_active', true)
      .lte('start_time', now.toISOString())
      .gte('end_time', now.toISOString())

    const bias = activeBiases && activeBiases.length > 0 ? activeBiases[0] : null

    // IMPORTANTE: Buscar o preço base de QUALQUER timeframe existente
    // para manter consistência entre todos os timeframes
    let basePrice = getInitialPrice(asset.symbol)
    
    // Tentar buscar preço do timeframe 1m primeiro (mais estável)
    const { data: referenceCandle } = await supabase
      .from('candles')
      .select('close')
      .eq('asset_id', assetId)
      .eq('timeframe', '1m')
      .order('timestamp', { ascending: false })
      .limit(1)
      .single()

    if (referenceCandle) {
      basePrice = parseFloat(referenceCandle.close)
      console.log(`Using reference price from 1m timeframe: ${basePrice}`)
    } else {
      // Se não houver 1m, tentar qualquer outro timeframe
      const { data: anyCandle } = await supabase
        .from('candles')
        .select('close, timeframe')
        .eq('asset_id', assetId)
        .order('timestamp', { ascending: false })
        .limit(1)
        .single()

      if (anyCandle) {
        basePrice = parseFloat(anyCandle.close)
        console.log(`Using reference price from ${anyCandle.timeframe} timeframe: ${basePrice}`)
      } else {
        console.log(`No existing candles, using initial price: ${basePrice}`)
      }
    }

    const timeframeMs = getTimeframeMs(timeframe)
    
    // Função para obter timestamp atual em UTC-3 (Horário de Brasília)
    const getBrazilTime = () => {
      const brazilOffset = -3 * 60 * 60 * 1000
      return Date.now() + brazilOffset
    }

    // Função para alinhar timestamp ao início do intervalo do timeframe em UTC-3
    const alignToTimeframe = (timestamp: number, tfMs: number) => {
      return Math.floor(timestamp / tfMs) * tfMs
    }

    const nowBrazil = getBrazilTime()
    const alignedNow = alignToTimeframe(nowBrazil, timeframeMs)
    
    // Verificar se já existe candle para este timeframe específico
    const { data: lastCandle } = await supabase
      .from('candles')
      .select('*')
      .eq('asset_id', assetId)
      .eq('timeframe', timeframe)
      .order('timestamp', { ascending: false })
      .limit(1)
      .single()

    // Se já existe candle para este timeframe, usar como base
    if (lastCandle) {
      basePrice = parseFloat(lastCandle.close)
      console.log(`Using existing ${timeframe} candle price: ${basePrice}`)
    }

    let startTimestamp = lastCandle 
      ? new Date(lastCandle.timestamp).getTime() + timeframeMs
      : alignedNow - (count * timeframeMs)

    const candles = []

    for (let i = 0; i < count; i++) {
      const candleTimestamp = startTimestamp + (i * timeframeMs)
      const alignedTimestamp = alignToTimeframe(candleTimestamp, timeframeMs)
      const timestamp = new Date(alignedTimestamp)
      
      // Generate realistic OHLCV data com volatilidade reduzida para manter consistência
      const volatility = 0.0015 // 0.15% volatility (reduzido para maior estabilidade)
      const trend = bias ? getBiasTrend(bias) : getRandomTrend()
      
      const open = basePrice
      const priceChange = basePrice * volatility * (Math.random() * 2 - 1) + trend
      const close = Math.max(0, open + priceChange)
      
      const high = Math.max(open, close) * (1 + Math.random() * volatility * 0.5)
      const low = Math.min(open, close) * (1 - Math.random() * volatility * 0.5)
      
      const volume = Math.random() * 1000000 + 100000

      candles.push({
        asset_id: assetId,
        timeframe,
        timestamp: timestamp.toISOString(),
        open: open.toFixed(8),
        high: high.toFixed(8),
        low: low.toFixed(8),
        close: close.toFixed(8),
        volume: volume.toFixed(2),
        is_manipulated: false
      })

      basePrice = close
    }

    // Insert candles
    const { data: insertedCandles, error: insertError } = await supabase
      .from('candles')
      .upsert(candles, { onConflict: 'asset_id,timeframe,timestamp' })
      .select()

    if (insertError) {
      console.error('Error inserting candles:', insertError)
      throw insertError
    }

    console.log(`Generated ${insertedCandles.length} candles for ${asset.symbol} ${timeframe}`)

    return new Response(
      JSON.stringify({ 
        success: true, 
        candles: insertedCandles,
        count: insertedCandles.length 
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

function getInitialPrice(symbol: string): number {
  // Return realistic initial prices for different asset types
  const prices: Record<string, number> = {
    'BTC': 45000,
    'ETH': 2500,
    'EUR/USD': 1.08,
    'GBP/USD': 1.25,
    'USD/JPY': 150,
    'GOLD': 2050,
    'OIL': 85,
    'AAPL': 185,
    'GOOGL': 140
  }
  
  return prices[symbol] || 100
}

function getTimeframeMs(timeframe: string): number {
  const map: Record<string, number> = {
    '10s': 10 * 1000,
    '30s': 30 * 1000,
    '1m': 60 * 1000,
    '5m': 5 * 60 * 1000
  }
  return map[timeframe] || 60 * 1000
}

function getRandomTrend(): number {
  // Random walk with slight upward bias
  return (Math.random() - 0.48) * 0.0005 // Reduzido para menor variação
}

function getBiasTrend(bias: any): number {
  const strength = parseFloat(bias.strength) / 100
  const direction = bias.direction === 'up' ? 1 : bias.direction === 'down' ? -1 : 0
  return direction * strength * 0.001 // Reduzido para menor variação
}
