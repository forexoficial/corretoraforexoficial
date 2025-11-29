import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('Starting cleanup of demo trades older than 24 hours...');

    // Calculate the timestamp for 24 hours ago
    const twentyFourHoursAgo = new Date();
    twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);

    console.log(`Deleting demo trades created before: ${twentyFourHoursAgo.toISOString()}`);

    // Fetch demo trades older than 24 hours
    const { data: oldDemoTrades, error: fetchError } = await supabase
      .from('trades')
      .select('id, created_at')
      .eq('is_demo', true)
      .lt('created_at', twentyFourHoursAgo.toISOString());

    if (fetchError) {
      console.error('Error fetching old demo trades:', fetchError);
      throw fetchError;
    }

    console.log(`Found ${oldDemoTrades?.length || 0} demo trades to delete`);

    if (!oldDemoTrades || oldDemoTrades.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'No demo trades to delete',
          deleted: 0 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Delete the old demo trades
    const { error: deleteError } = await supabase
      .from('trades')
      .delete()
      .eq('is_demo', true)
      .lt('created_at', twentyFourHoursAgo.toISOString());

    if (deleteError) {
      console.error('Error deleting old demo trades:', deleteError);
      throw deleteError;
    }

    console.log(`Successfully deleted ${oldDemoTrades.length} demo trades`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Deleted ${oldDemoTrades.length} demo trades older than 24 hours`,
        deleted: oldDemoTrades.length 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in cleanup-demo-trades function:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
