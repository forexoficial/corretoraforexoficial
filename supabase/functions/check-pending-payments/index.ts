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
    console.log('Starting automatic payment verification...');

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get pending transactions from last 24 hours
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    
    const { data: pendingTransactions, error: fetchError } = await supabaseAdmin
      .from('transactions')
      .select('*')
      .eq('type', 'deposit')
      .eq('status', 'pending')
      .gte('created_at', twentyFourHoursAgo)
      .order('created_at', { ascending: false });

    if (fetchError) {
      console.error('Error fetching pending transactions:', fetchError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch transactions' }), 
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Found ${pendingTransactions?.length || 0} pending transactions`);

    if (!pendingTransactions || pendingTransactions.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: true,
          message: 'No pending transactions',
          checked: 0
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

    console.log('Found gateways:', gateways?.length);
    if (gateways && gateways.length > 0) {
      console.log('Gateway configs:', gateways.map(g => ({
        name: g.name,
        provider: g.config?.provider
      })));
    }

    // Find PixUP gateway
    const gateway = gateways?.find(g => g.config?.provider === 'pixup');

    if (!gateway) {
      console.log('No active PixUP gateway found');
      return new Response(
        JSON.stringify({ 
          success: false,
          message: 'No active PixUP gateway'
        }), 
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Using PixUP gateway:', gateway.name);

    const credentials = gateway.config?.credentials;
    const clientId = credentials?.CLIENT_ID;
    const clientSecret = credentials?.CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      console.error('PixUP credentials not configured');
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

    let processed = 0;
    let credited = 0;

    // Check each pending transaction
    for (const transaction of pendingTransactions) {
      try {
        console.log(`Checking transaction ${transaction.id}...`);

        // Query PixUP using external_id (our transaction ID)
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
          continue;
        }

        const pixupData = await pixupResponse.json();
        const payment = Array.isArray(pixupData) ? pixupData[0] : pixupData;
        
        if (!payment || !payment.transactionId) {
          console.log(`No valid payment data for transaction ${transaction.id}`);
          continue;
        }

        const pixupStatus = payment.status?.toLowerCase();
        console.log(`Transaction ${transaction.id} - PixUP status: ${pixupStatus}`);

        // Map status
        let newStatus = 'pending';
        let shouldUpdateBalance = false;

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

        // Only update if status changed
        if (newStatus !== transaction.status) {
          console.log(`Updating transaction ${transaction.id} from ${transaction.status} to ${newStatus}`);

          await supabaseAdmin
            .from('transactions')
            .update({
              transaction_reference: payment.transactionId,
              status: newStatus,
              notes: JSON.stringify({
                provider: 'pixup',
                pixup_transaction_id: payment.transactionId,
                status: payment.status,
                auto_verified_at: new Date().toISOString(),
                verification_source: 'automatic_polling',
              }),
              updated_at: new Date().toISOString(),
            })
            .eq('id', transaction.id);

          processed++;

          // Update balance if payment approved
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

              console.log(`✅ Balance credited! User ${transaction.user_id}: R$ ${profile.balance} → R$ ${newBalance}`);
              credited++;
            }
          }
        } else {
          console.log(`Transaction ${transaction.id} status unchanged (${newStatus})`);
        }

      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error(`Error processing transaction ${transaction.id}:`, errorMessage);
      }
    }

    console.log(`✅ Verification complete: ${processed} updated, ${credited} credited`);

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Payment verification completed',
        total_pending: pendingTransactions.length,
        processed: processed,
        credited: credited
      }), 
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in check-pending-payments:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }), 
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
