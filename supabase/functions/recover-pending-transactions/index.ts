import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.84.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get pending transactions without transaction_reference
    const { data: pendingTransactions, error: fetchError } = await supabaseAdmin
      .from('transactions')
      .select('*')
      .eq('type', 'deposit')
      .eq('status', 'pending')
      .is('transaction_reference', null)
      .order('created_at', { ascending: false })
      .limit(50);

    if (fetchError) {
      console.error('Error fetching pending transactions:', fetchError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch transactions' }), 
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Found ${pendingTransactions?.length || 0} pending transactions to recover`);

    if (!pendingTransactions || pendingTransactions.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: true,
          message: 'No pending transactions to recover',
          recovered: 0
        }), 
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get active PixUP gateway
    const { data: gateways } = await supabaseAdmin
      .from('payment_gateways')
      .select('*')
      .eq('type', 'pix')
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    // Find PixUP gateway
    const gateway = gateways?.find(g => g.config?.provider === 'pixup');

    if (!gateway) {
      console.log('No active PixUP gateway found');
      return new Response(
        JSON.stringify({ error: 'PixUP credentials not configured' }), 
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const credentials = gateway.config?.credentials;
    const clientId = credentials?.CLIENT_ID;
    const clientSecret = credentials?.CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      return new Response(
        JSON.stringify({ error: 'PixUP credentials not configured' }), 
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get PixUP access token
    const authString = `${clientId}:${clientSecret}`;
    const base64Auth = btoa(authString);

    const tokenResponse = await fetch('https://api.pixupbr.com/v2/oauth/token', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Authorization': `Basic ${base64Auth}`
      }
    });

    if (!tokenResponse.ok) {
      console.error('PixUP authentication failed');
      return new Response(
        JSON.stringify({ error: 'PixUP authentication failed' }), 
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;

    let recovered = 0;
    let updated = 0;
    const results = [];

    // Check each transaction in PixUP
    for (const transaction of pendingTransactions) {
      try {
        console.log(`Checking transaction ${transaction.id} in PixUP...`);

        // Query PixUP for this transaction using external_id
        const pixupResponse = await fetch(
          `https://api.pixupbr.com/v2/pix/qrcode?external_id=${transaction.id}`,
          {
            method: 'GET',
            headers: {
              'Accept': 'application/json',
              'Authorization': `Bearer ${accessToken}`
            }
          }
        );

        if (!pixupResponse.ok) {
          console.log(`Transaction ${transaction.id} not found in PixUP or error`);
          results.push({
            transaction_id: transaction.id,
            status: 'not_found',
            message: 'Not found in PixUP'
          });
          continue;
        }

        const pixupData = await pixupResponse.json();
        
        // Check if it's an array (multiple results) or single object
        const payment = Array.isArray(pixupData) ? pixupData[0] : pixupData;
        
        if (!payment) {
          results.push({
            transaction_id: transaction.id,
            status: 'not_found',
            message: 'No payment data returned'
          });
          continue;
        }

        console.log(`Found payment in PixUP: ${payment.transactionId}, status: ${payment.status}`);

        // Map status
        let newStatus = 'pending';
        let shouldUpdateBalance = false;

        const pixupStatus = payment.status?.toLowerCase();
        switch (pixupStatus) {
          case 'approved':
          case 'paid':
          case 'confirmed':
            newStatus = 'completed';
            shouldUpdateBalance = true;
            break;
          case 'pending':
          case 'waiting':
            newStatus = 'pending';
            break;
          case 'rejected':
          case 'cancelled':
          case 'expired':
            newStatus = 'failed';
            break;
        }

        // Update transaction
        await supabaseAdmin
          .from('transactions')
          .update({
            transaction_reference: payment.transactionId,
            status: newStatus,
            notes: JSON.stringify({
              provider: 'pixup',
              pixup_transaction_id: payment.transactionId,
              status: payment.status,
              recovered_at: new Date().toISOString(),
              recovery_source: 'automatic',
            }),
            updated_at: new Date().toISOString(),
          })
          .eq('id', transaction.id);

        updated++;

        // Update balance if payment was approved
        if (shouldUpdateBalance) {
          const { data: profile } = await supabaseAdmin
            .from('profiles')
            .select('balance')
            .eq('user_id', transaction.user_id)
            .single();

          if (profile) {
            const newBalance = (Number(profile.balance) || 0) + Number(transaction.amount);
            
            await supabaseAdmin
              .from('profiles')
              .update({ balance: newBalance })
              .eq('user_id', transaction.user_id);

            console.log(`Balance updated for user ${transaction.user_id}: ${profile.balance} -> ${newBalance}`);
            recovered++;
          }
        }

        results.push({
          transaction_id: transaction.id,
          status: 'updated',
          new_status: newStatus,
          pixup_id: payment.transactionId,
          balance_updated: shouldUpdateBalance
        });

      } catch (error) {
        console.error(`Error processing transaction ${transaction.id}:`, error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        results.push({
          transaction_id: transaction.id,
          status: 'error',
          error: errorMessage
        });
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        message: `Recovery completed`,
        total_pending: pendingTransactions.length,
        updated: updated,
        recovered_and_credited: recovered,
        results: results
      }), 
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in recover-pending-transactions:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }), 
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
