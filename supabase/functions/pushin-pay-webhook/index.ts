import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.84.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

serve(async (req) => {
  // Handle OPTIONS preflight request
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Handle GET request for webhook registration (some providers test with GET)
  if (req.method === 'GET') {
    console.log('Pushin Pay webhook GET request (health check)');
    return new Response(JSON.stringify({ status: 'ok' }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  try {
    console.log('Pushin Pay webhook received');
    
    const contentType = req.headers.get('content-type') || '';
    const body = await req.text();
    console.log('Webhook content-type:', contentType);
    console.log('Webhook body:', body);

    let payload: any = {};
    
    // Parse based on content type - Pushin Pay sends URL-encoded form data
    if (contentType.includes('application/x-www-form-urlencoded') || body.includes('=')) {
      // Parse URL-encoded form data
      console.log('Parsing as URL-encoded form data');
      const params = new URLSearchParams(body);
      for (const [key, value] of params.entries()) {
        payload[key] = value;
      }
      // Convert value to number if present
      if (payload.value) {
        payload.value = parseInt(payload.value, 10);
      }
    } else {
      // Try to parse as JSON
      try {
        payload = JSON.parse(body);
      } catch (e) {
        console.error('Failed to parse webhook body as JSON:', e);
        // Try URL-encoded as fallback
        const params = new URLSearchParams(body);
        for (const [key, value] of params.entries()) {
          payload[key] = value;
        }
        if (payload.value) {
          payload.value = parseInt(payload.value, 10);
        }
      }
    }

    console.log('Parsed payload:', JSON.stringify(payload, null, 2));

    // Pushin Pay webhook payload structure:
    // { id, value, status, end_to_end_id, payer_name, payer_national_registration }
    const transactionId = payload.id;
    const status = payload.status;
    const value = payload.value; // in cents
    const endToEndId = payload.end_to_end_id;
    const payerName = payload.payer_name;

    if (!transactionId) {
      console.error('Missing transaction ID in webhook');
      return new Response(JSON.stringify({ error: 'Missing transaction ID' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Initialize Supabase admin client
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    // Verify payment status by calling Pushin Pay API
    const apiToken = Deno.env.get('PUSHIN_PAY_TOKEN');
    if (apiToken) {
      console.log('Verifying payment status with Pushin Pay API...');
      
      const verifyResponse = await fetch(`https://api.pushinpay.com.br/api/transaction/${transactionId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${apiToken}`,
          'Accept': 'application/json',
        },
      });

      if (verifyResponse.ok) {
        const verifyData = await verifyResponse.json();
        console.log('Verification response:', JSON.stringify(verifyData, null, 2));
        
        // Use the verified status
        if (verifyData.status !== 'paid') {
          console.log('Payment not confirmed as paid, current status:', verifyData.status);
          return new Response(JSON.stringify({ 
            received: true, 
            verified: false,
            status: verifyData.status 
          }), {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }
      } else {
        console.warn('Failed to verify payment status, proceeding with webhook data');
      }
    }

    // Find transaction by transaction_reference (Pushin Pay ID)
    const { data: transactions, error: findError } = await supabaseAdmin
      .from('transactions')
      .select('*')
      .eq('transaction_reference', transactionId)
      .limit(1);

    if (findError) {
      console.error('Error finding transaction:', findError);
      return new Response(JSON.stringify({ error: 'Database error' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (!transactions || transactions.length === 0) {
      console.error('Transaction not found for Pushin Pay ID:', transactionId);
      return new Response(JSON.stringify({ error: 'Transaction not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const transaction = transactions[0];
    console.log('Found transaction:', transaction.id);

    // Check if payment is confirmed (paid)
    if (status === 'paid' || status === 'PAID') {
      console.log('Payment confirmed, updating transaction and balance...');
      
      // Update transaction status
      const { error: updateError } = await supabaseAdmin
        .from('transactions')
        .update({
          status: 'completed',
          notes: JSON.stringify({
            ...JSON.parse(transaction.notes || '{}'),
            paid_at: new Date().toISOString(),
            end_to_end_id: endToEndId,
            payer_name: payerName,
            webhook_status: status,
          }),
          updated_at: new Date().toISOString(),
        })
        .eq('id', transaction.id);

      if (updateError) {
        console.error('Error updating transaction:', updateError);
        return new Response(JSON.stringify({ error: 'Failed to update transaction' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // Update user balance
      const amountInReais = value ? value / 100 : transaction.amount;
      
      // Direct balance update
      const { data: profile, error: profileError } = await supabaseAdmin
        .from('profiles')
        .select('balance')
        .eq('user_id', transaction.user_id)
        .single();

      if (profileError) {
        console.error('Error fetching profile:', profileError);
      } else {
        const newBalance = (profile?.balance || 0) + amountInReais;
        
        const { error: updateBalanceError } = await supabaseAdmin
          .from('profiles')
          .update({ 
            balance: newBalance,
            updated_at: new Date().toISOString()
          })
          .eq('user_id', transaction.user_id);

        if (updateBalanceError) {
          console.error('Error updating balance:', updateBalanceError);
        } else {
          console.log('Balance updated successfully. New balance:', newBalance);
        }
      }

      console.log('Payment processed successfully');
      return new Response(JSON.stringify({ 
        success: true, 
        transaction_id: transaction.id,
        status: 'completed'
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Handle other statuses
    console.log('Payment status:', status);
    return new Response(JSON.stringify({ 
      received: true,
      status: status
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error processing Pushin Pay webhook:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
