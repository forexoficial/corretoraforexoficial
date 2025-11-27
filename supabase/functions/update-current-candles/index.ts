import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.84.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Asset {
  id: string;
  symbol: string;
  auto_generate_candles: boolean;
}

interface Candle {
  id: string;
  asset_id: string;
  timeframe: string;
  timestamp: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    console.log('Starting current candle updates...');

    // Get all active assets with auto_generate_candles enabled
    const { data: assets, error: assetsError } = await supabaseClient
      .from('assets')
      .select('id, symbol, auto_generate_candles')
      .eq('is_active', true)
      .eq('auto_generate_candles', true);

    if (assetsError) {
      console.error('Error fetching assets:', assetsError);
      throw assetsError;
    }

    if (!assets || assets.length === 0) {
      console.log('No active assets found');
      return new Response(
        JSON.stringify({ message: 'No active assets to update' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    // Apenas timeframes curtos para operações rápidas (binary options)
    const timeframes = ['10s', '30s', '1m', '5m'];
    const updatedCandles: any[] = [];
    
    // Helper para obter tempo do Brasil (UTC-3)
    const getBrazilTime = () => {
      const brazilOffset = -3 * 60 * 60 * 1000
      return Date.now() + brazilOffset
    }
    
    // Helper para alinhar timestamp ao timeframe
    const alignToTimeframe = (timestamp: number, timeframeMs: number) => {
      return Math.floor(timestamp / timeframeMs) * timeframeMs
    }
    
    // Mapear timeframes para millisegundos (apenas operações curtas)
    const getTimeframeMs = (timeframe: string): number => {
      const map: Record<string, number> = {
        '10s': 10 * 1000,
        '30s': 30 * 1000,
        '1m': 60 * 1000,
        '5m': 5 * 60 * 1000
      }
      return map[timeframe] || 60 * 1000
    }

    // For each asset and timeframe, update or create new candle
    for (const asset of assets) {
      for (const timeframe of timeframes) {
        try {
          const timeframeMs = getTimeframeMs(timeframe)
          const nowBrazil = getBrazilTime()
          const alignedNow = alignToTimeframe(nowBrazil, timeframeMs)
          
          // Get the most recent candle
          const { data: candles, error: candlesError } = await supabaseClient
            .from('candles')
            .select('*')
            .eq('asset_id', asset.id)
            .eq('timeframe', timeframe)
            .order('timestamp', { ascending: false })
            .limit(1);

          if (candlesError) {
            console.error(`Error fetching candles for ${asset.symbol} ${timeframe}:`, candlesError);
            continue;
          }

          // Se não existe candle, pular (será criado pelo generate-candles)
          if (!candles || candles.length === 0) {
            console.log(`No candles found for ${asset.symbol} ${timeframe}`);
            continue;
          }

          const currentCandle = candles[0] as Candle;
          const candleTimestamp = new Date(currentCandle.timestamp).getTime()
          const candleExpiry = candleTimestamp + timeframeMs
          
          // Verificar se o candle atual expirou
          if (nowBrazil >= candleExpiry) {
            // Criar novo candle
            console.log(`Creating new candle for ${asset.symbol} ${timeframe} - expired at ${new Date(candleExpiry).toISOString()}`)
            
            const newCandleTimestamp = alignToTimeframe(nowBrazil, timeframeMs)
            const lastClose = Number(currentCandle.close)
            
            const volatility = 0.002
            const randomChange = (Math.random() - 0.5) * volatility
            const open = lastClose
            const close = open * (1 + randomChange)
            const high = Math.max(open, close) * (1 + Math.random() * volatility * 0.5)
            const low = Math.min(open, close) * (1 - Math.random() * volatility * 0.5)
            const volume = Math.random() * 1000000 + 100000
            
            const { error: insertError } = await supabaseClient
              .from('candles')
              .insert({
                asset_id: asset.id,
                timeframe,
                timestamp: new Date(newCandleTimestamp).toISOString(),
                open: open.toFixed(8),
                high: high.toFixed(8),
                low: low.toFixed(8),
                close: close.toFixed(8),
                volume: volume.toFixed(2),
                is_manipulated: false
              })
            
            if (insertError) {
              console.error(`Error creating new candle for ${asset.symbol} ${timeframe}:`, insertError)
              continue
            }
            
            updatedCandles.push({
              asset: asset.symbol,
              timeframe,
              action: 'created',
              timestamp: new Date(newCandleTimestamp).toISOString()
            })
            
            console.log(`Created new candle for ${asset.symbol} ${timeframe} at ${new Date(newCandleTimestamp).toISOString()}`)
          } else {
            // Atualizar candle atual
            const volatility = 0.002
            const randomChange = (Math.random() - 0.5) * volatility
            const currentClose = Number(currentCandle.close)
            const newClose = currentClose * (1 + randomChange)

            const currentHigh = Number(currentCandle.high)
            const currentLow = Number(currentCandle.low)
            const newHigh = Math.max(currentHigh, newClose)
            const newLow = Math.min(currentLow, newClose)

            const nowBrazilDate = new Date(nowBrazil)
            
            const { error: updateError } = await supabaseClient
              .from('candles')
              .update({
                close: newClose.toFixed(8),
                high: newHigh.toFixed(8),
                low: newLow.toFixed(8),
                updated_at: nowBrazilDate.toISOString()
              })
              .eq('id', currentCandle.id)

            if (updateError) {
              console.error(`Error updating candle for ${asset.symbol} ${timeframe}:`, updateError);
              continue;
            }

            updatedCandles.push({
              asset: asset.symbol,
              timeframe,
              action: 'updated',
              candle_id: currentCandle.id,
              expires_in_ms: candleExpiry - nowBrazil
            })

            console.log(`Updated ${asset.symbol} ${timeframe}: ${currentClose} -> ${newClose} (expires in ${Math.round((candleExpiry - nowBrazil) / 1000)}s)`)
          }
        } catch (error) {
          console.error(`Error processing ${asset.symbol} ${timeframe}:`, error);
          continue;
        }
      }
    }

    console.log(`Updated ${updatedCandles.length} candles`);

    return new Response(
      JSON.stringify({
        success: true,
        updated_count: updatedCandles.length,
        updates: updatedCandles
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );

  } catch (error) {
    console.error('Error in update-current-candles function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
