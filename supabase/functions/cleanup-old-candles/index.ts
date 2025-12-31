import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('🧹 Starting AGGRESSIVE candles cleanup (keeping only last 24 hours)...');

    // Calculate cutoff time (24 hours ago)
    const cutoffTime = new Date();
    cutoffTime.setHours(cutoffTime.getHours() - 24);
    const cutoffTimestamp = cutoffTime.toISOString();

    console.log(`Cutoff timestamp: ${cutoffTimestamp}`);

    // Count candles before deletion
    const { count: beforeCount } = await supabase
      .from('candles')
      .select('id', { count: 'exact', head: true });

    console.log(`Total candles before cleanup: ${beforeCount}`);

    // Count candles to be deleted
    const { count: toDeleteCount } = await supabase
      .from('candles')
      .select('id', { count: 'exact', head: true })
      .lt('timestamp', cutoffTimestamp);

    console.log(`Candles older than 24h to delete: ${toDeleteCount}`);

    // Delete all candles older than 24 hours in smaller batches
    let totalDeleted = 0;
    const BATCH_SIZE = 1000; // Smaller batch size
    let hasMore = true;
    let iterations = 0;
    const MAX_ITERATIONS = 500; // Safety limit

    while (hasMore && iterations < MAX_ITERATIONS) {
      iterations++;
      
      // Get batch of old candle IDs
      const { data: oldCandles, error: fetchError } = await supabase
        .from('candles')
        .select('id')
        .lt('timestamp', cutoffTimestamp)
        .limit(BATCH_SIZE);

      if (fetchError) {
        console.error('Error fetching old candles:', fetchError);
        throw fetchError;
      }

      if (!oldCandles || oldCandles.length === 0) {
        hasMore = false;
        break;
      }

      // Delete batch using direct filter instead of IN clause
      const { error: deleteError, count: deletedCount } = await supabase
        .from('candles')
        .delete()
        .lt('timestamp', cutoffTimestamp)
        .limit(BATCH_SIZE);

      if (deleteError) {
        console.error('Error deleting candles batch:', deleteError);
        // Try alternative approach: delete by IDs in smaller chunks
        const chunkSize = 100;
        for (let i = 0; i < oldCandles.length; i += chunkSize) {
          const chunk = oldCandles.slice(i, i + chunkSize).map(c => c.id);
          await supabase.from('candles').delete().in('id', chunk);
        }
      }

      totalDeleted += oldCandles.length;
      
      if (iterations % 50 === 0) {
        console.log(`🗑️ Progress: Deleted ${totalDeleted} candles so far...`);
      }

      // Continue if we got a full batch
      hasMore = oldCandles.length === BATCH_SIZE;
    }

    // Count candles after deletion
    const { count: afterCount } = await supabase
      .from('candles')
      .select('id', { count: 'exact', head: true });

    const estimatedMBFreed = Math.round((totalDeleted * 600) / 1024 / 1024);

    console.log(`✅ Cleanup completed!`);
    console.log(`   - Deleted: ${totalDeleted} candles`);
    console.log(`   - Remaining: ${afterCount} candles`);
    console.log(`   - Space freed: ~${estimatedMBFreed} MB`);
    console.log(`   - Iterations: ${iterations}`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Aggressive cleanup completed - kept only last 24 hours`,
        before: beforeCount,
        deleted: totalDeleted,
        remaining: afterCount,
        estimatedMBFreed,
        iterations
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
