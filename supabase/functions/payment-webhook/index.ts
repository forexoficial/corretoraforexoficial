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
    const webhookData = await req.json();
    console.log('Payment webhook received:', JSON.stringify(webhookData, null, 2));

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Determine provider from webhook structure
    // Mercado Pago sends: { action, api_version, data: { id }, type }
    // PixUP sends: { requestBody: { transactionId, external_id, status, etc } }
    let paymentId: string;
    let provider: string;

    // Check if it's a PixUP webhook (real format from PixUP support)
    if (webhookData.requestBody && webhookData.requestBody.transactionId && webhookData.requestBody.external_id) {
      // PixUP webhook
      provider = 'pixup';
      const pixupData = webhookData.requestBody;
      paymentId = pixupData.transactionId;
      
      console.log('PixUP webhook detected:', paymentId);
      console.log('Full PixUP webhook data:', JSON.stringify(pixupData, null, 2));

      // Find transaction by external_id (our transaction ID)
      const { data: transaction, error: searchError } = await supabaseClient
        .from('transactions')
        .select('*')
        .eq('id', pixupData.external_id)
        .single();

      if (searchError || !transaction) {
        console.error('Transaction not found:', webhookData.external_id, searchError);
        return new Response(
          JSON.stringify({ error: 'Transaction not found' }), 
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Map PixUP status to our status
      let newStatus = 'pending';
      let shouldUpdateBalance = false;

      const pixupStatus = pixupData.status?.toUpperCase();
      console.log('PixUP status received:', pixupStatus);
      
      switch (pixupStatus) {
        case 'PAID':
        case 'APPROVED':
        case 'CONFIRMED':
          newStatus = 'completed';
          shouldUpdateBalance = true;
          break;
        case 'PENDING':
        case 'WAITING':
          newStatus = 'pending';
          break;
        case 'REJECTED':
        case 'CANCELLED':
        case 'EXPIRED':
          newStatus = 'failed';
          break;
        default:
          newStatus = 'pending';
      }

      console.log('Updating PixUP transaction:', transaction.id, 'Status:', newStatus);

      // Update transaction
      const updateResult = await supabaseClient
        .from('transactions')
        .update({
          status: newStatus,
          transaction_reference: paymentId,
          notes: JSON.stringify({
            provider: 'pixup',
            pixup_id: paymentId,
            status: pixupData.status,
            transaction_type: pixupData.transactionType,
            payment_type: pixupData.paymentType,
            date_approval: pixupData.dateApproval,
            credit_party: pixupData.creditParty,
            debit_party: pixupData.debitParty,
            webhook_received_at: new Date().toISOString(),
            full_response: webhookData,
          }),
          updated_at: new Date().toISOString(),
        })
        .eq('id', transaction.id);

      console.log('Transaction update result:', updateResult.error ? 'ERROR' : 'SUCCESS');

      // Update balance if payment was approved
      if (shouldUpdateBalance && transaction.status !== 'completed') {
        console.log('Updating balance for user:', transaction.user_id);
        
        const { data: profile, error: profileError } = await supabaseClient
          .from('profiles')
          .select('balance')
          .eq('user_id', transaction.user_id)
          .single();

        if (!profileError && profile) {
          const newBalance = (Number(profile.balance) || 0) + Number(transaction.amount);
          
          await supabaseClient
            .from('profiles')
            .update({ balance: newBalance })
            .eq('user_id', transaction.user_id);

          console.log(`Balance updated: ${profile.balance} -> ${newBalance}`);
        }
      }

      return new Response(
        JSON.stringify({ 
          success: true,
          message: 'PixUP webhook processed successfully',
          transaction_id: transaction.id,
          status: newStatus,
        }), 
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    if (webhookData.type === 'payment') {
      // Mercado Pago webhook
      provider = 'mercado_pago';
      paymentId = webhookData.data?.id?.toString();
      
      if (!paymentId) {
        console.error('Payment ID not found in Mercado Pago webhook');
        return new Response(
          JSON.stringify({ error: 'Payment ID not found' }), 
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Get Mercado Pago credentials from payment_gateways
      const { data: gateway } = await supabaseClient
        .from('payment_gateways')
        .select('config')
        .eq('config->provider', 'mercado_pago')
        .eq('is_active', true)
        .single();

      const accessToken = gateway?.config?.credentials?.ACCESS_TOKEN;
      if (!accessToken) {
        console.error('Mercado Pago access token not configured in gateway');
        return new Response(
          JSON.stringify({ error: 'Gateway credentials not configured' }), 
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const mpResponse = await fetch(
        `https://api.mercadopago.com/v1/payments/${paymentId}`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          },
        }
      );

      if (!mpResponse.ok) {
        console.error('Failed to fetch payment from Mercado Pago');
        return new Response(
          JSON.stringify({ error: 'Failed to fetch payment details' }), 
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const paymentData = await mpResponse.json();
      console.log('Mercado Pago payment data:', JSON.stringify(paymentData, null, 2));

      // Find transaction by external reference or payment ID
      const { data: transactions, error: searchError } = await supabaseClient
        .from('transactions')
        .select('*')
        .or(`transaction_reference.eq.${paymentId},id.eq.${paymentData.external_reference}`)
        .limit(1);

      if (searchError || !transactions || transactions.length === 0) {
        console.error('Transaction not found:', searchError);
        return new Response(
          JSON.stringify({ error: 'Transaction not found' }), 
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const transaction = transactions[0];
      
      // Map Mercado Pago status to our status
      let newStatus = 'pending';
      let shouldUpdateBalance = false;

      switch (paymentData.status) {
        case 'approved':
          newStatus = 'completed';
          shouldUpdateBalance = true;
          break;
        case 'pending':
        case 'in_process':
          newStatus = 'pending';
          break;
        case 'rejected':
        case 'cancelled':
        case 'refunded':
          newStatus = 'failed';
          break;
        default:
          newStatus = 'pending';
      }

      console.log('Updating transaction:', transaction.id, 'Status:', newStatus);

      // Update transaction
      await supabaseClient
        .from('transactions')
        .update({
          status: newStatus,
          notes: JSON.stringify({
            mercado_pago_id: paymentId,
            status: paymentData.status,
            status_detail: paymentData.status_detail,
            payment_type_id: paymentData.payment_type_id,
            webhook_received_at: new Date().toISOString(),
            full_response: paymentData,
          }),
          updated_at: new Date().toISOString(),
        })
        .eq('id', transaction.id);

      // Update balance if payment was approved
      if (shouldUpdateBalance && transaction.status !== 'completed') {
        console.log('Updating balance for user:', transaction.user_id);
        
        const { data: profile, error: profileError } = await supabaseClient
          .from('profiles')
          .select('balance')
          .eq('user_id', transaction.user_id)
          .single();

        if (!profileError && profile) {
          const newBalance = (Number(profile.balance) || 0) + Number(transaction.amount);
          
          await supabaseClient
            .from('profiles')
            .update({ balance: newBalance })
            .eq('user_id', transaction.user_id);

          console.log(`Balance updated: ${profile.balance} -> ${newBalance}`);
        }
      }

      return new Response(
        JSON.stringify({ 
          success: true,
          message: 'Webhook processed successfully',
          transaction_id: transaction.id,
          status: newStatus,
        }), 
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Unknown webhook format
    console.error('Unknown webhook format:', webhookData);
    return new Response(
      JSON.stringify({ error: 'Unknown webhook format' }), 
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in payment-webhook:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }), 
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
