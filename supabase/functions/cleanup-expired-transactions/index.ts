import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.84.0';

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
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Calculate timestamp for 1 hour ago
    const oneHourAgo = new Date();
    oneHourAgo.setHours(oneHourAgo.getHours() - 1);

    console.log('Cleaning up expired transactions older than:', oneHourAgo.toISOString());

    // Find and delete pending transactions older than 1 hour
    const { data: expiredTransactions, error: fetchError } = await supabase
      .from('transactions')
      .select('id, created_at, amount, user_id')
      .eq('status', 'pending')
      .lt('created_at', oneHourAgo.toISOString());

    if (fetchError) {
      console.error('Error fetching expired transactions:', fetchError);
      throw fetchError;
    }

    if (!expiredTransactions || expiredTransactions.length === 0) {
      console.log('No expired transactions found');
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'No expired transactions to clean up',
          deleted: 0 
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200 
        }
      );
    }

    console.log(`Found ${expiredTransactions.length} expired transactions to delete`);

    // Delete expired transactions
    const { error: deleteError } = await supabase
      .from('transactions')
      .delete()
      .eq('status', 'pending')
      .lt('created_at', oneHourAgo.toISOString());

    if (deleteError) {
      console.error('Error deleting expired transactions:', deleteError);
      throw deleteError;
    }

    console.log(`Successfully deleted ${expiredTransactions.length} expired transactions`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Deleted ${expiredTransactions.length} expired transactions`,
        deleted: expiredTransactions.length,
        transactions: expiredTransactions
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('Error in cleanup-expired-transactions:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: errorMessage 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});
