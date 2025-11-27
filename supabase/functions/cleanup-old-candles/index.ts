import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Asset {
  id: string;
  symbol: string;
  is_active: boolean;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('🧹 Starting daily candles cleanup...');

    // Fetch all active assets
    const { data: assets, error: assetsError } = await supabase
      .from('assets')
      .select('id, symbol, is_active')
      .eq('is_active', true);

    if (assetsError) {
      console.error('Error fetching assets:', assetsError);
      throw assetsError;
    }

    if (!assets || assets.length === 0) {
      console.log('No active assets found');
      return new Response(
        JSON.stringify({ success: true, message: 'No active assets found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Found ${assets.length} active assets`);

    // Timeframes to clean
    const timeframes = ['10s', '30s', '1m', '5m'];
    const KEEP_LAST_N_CANDLES = 200;

    let totalDeleted = 0;
    const cleanupResults: any[] = [];

    // Process each asset and timeframe
    for (const asset of assets as Asset[]) {
      for (const timeframe of timeframes) {
        console.log(`Processing ${asset.symbol} - ${timeframe}`);

        // Get total count of candles for this asset/timeframe
        const { count: totalCount, error: countError } = await supabase
          .from('candles')
          .select('id', { count: 'exact', head: true })
          .eq('asset_id', asset.id)
          .eq('timeframe', timeframe);

        if (countError) {
          console.error(`Error counting candles for ${asset.symbol} ${timeframe}:`, countError);
          continue;
        }

        if (!totalCount || totalCount <= KEEP_LAST_N_CANDLES) {
          console.log(`  ✓ ${asset.symbol} ${timeframe}: ${totalCount} candles (within limit)`);
          continue;
        }

        // Calculate how many to delete
        const candlesToDelete = totalCount - KEEP_LAST_N_CANDLES;

        // Get the IDs of the oldest candles to delete
        const { data: oldestCandles, error: fetchError } = await supabase
          .from('candles')
          .select('id')
          .eq('asset_id', asset.id)
          .eq('timeframe', timeframe)
          .order('timestamp', { ascending: true })
          .limit(candlesToDelete);

        if (fetchError) {
          console.error(`Error fetching old candles for ${asset.symbol} ${timeframe}:`, fetchError);
          continue;
        }

        if (!oldestCandles || oldestCandles.length === 0) {
          continue;
        }

        // Delete the old candles
        const idsToDelete = oldestCandles.map(c => c.id);
        const { error: deleteError } = await supabase
          .from('candles')
          .delete()
          .in('id', idsToDelete);

        if (deleteError) {
          console.error(`Error deleting candles for ${asset.symbol} ${timeframe}:`, deleteError);
          continue;
        }

        const deletedCount = oldestCandles.length;
        totalDeleted += deletedCount;

        console.log(`  🗑️  ${asset.symbol} ${timeframe}: Deleted ${deletedCount} old candles (kept last ${KEEP_LAST_N_CANDLES})`);

        cleanupResults.push({
          asset: asset.symbol,
          timeframe,
          deleted: deletedCount,
          remaining: KEEP_LAST_N_CANDLES
        });
      }
    }

    console.log(`✅ Cleanup completed! Total deleted: ${totalDeleted} candles`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Cleanup completed successfully`,
        totalDeleted,
        results: cleanupResults
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error: any) {
    console.error('Error in cleanup-old-candles:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});
