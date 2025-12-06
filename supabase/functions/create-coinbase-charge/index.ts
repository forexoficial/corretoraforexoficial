import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.84.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ChargeRequest {
  amount: number;
  currency?: string;
  description?: string;
  metadata?: Record<string, string>;
}

interface CoinbaseCharge {
  data: {
    id: string;
    code: string;
    name: string;
    description: string;
    hosted_url: string;
    created_at: string;
    expires_at: string;
    pricing: {
      local: { amount: string; currency: string };
      settlement: { amount: string; currency: string };
    };
    pricing_type: string;
    web3_data?: {
      contract_addresses: Record<string, string>;
      transfer_intent?: {
        call_data: {
          deadline: string;
          fee_amount: string;
          id: string;
          recipient: string;
          recipient_amount: string;
          recipient_currency: string;
        };
        metadata: {
          chain_id: number;
          contract_address: string;
        };
      };
    };
    timeline: Array<{ status: string; time: string }>;
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('[Coinbase] Starting charge creation...');

    // Initialize Supabase client for user authentication
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    // Authenticate user
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      console.error('[Coinbase] Authentication failed:', userError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }), 
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[Coinbase] User authenticated:', user.id);

    // Initialize service role client
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    const chargeRequest: ChargeRequest = await req.json();
    console.log('[Coinbase] Charge request:', chargeRequest);

    // Validation
    if (!chargeRequest.amount || chargeRequest.amount <= 0) {
      return new Response(
        JSON.stringify({ error: 'Invalid amount' }), 
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get active crypto gateway with Coinbase provider
    const { data: gateways, error: gatewayError } = await supabaseAdmin
      .from('payment_gateways')
      .select('*')
      .eq('type', 'crypto')
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (gatewayError) {
      console.error('[Coinbase] Gateway query error:', gatewayError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch gateway configuration' }), 
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Find Coinbase gateway
    const coinbaseGateway = gateways?.find(g => 
      g.config?.provider === 'coinbase' || g.name?.toLowerCase().includes('coinbase')
    );

    if (!coinbaseGateway) {
      console.error('[Coinbase] No active Coinbase gateway found');
      return new Response(
        JSON.stringify({ error: 'Coinbase Commerce gateway not configured. Please contact support.' }), 
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[Coinbase] Using gateway:', coinbaseGateway.name);

    // Get API key from gateway config
    const apiKey = coinbaseGateway.config?.credentials?.API_KEY;
    
    if (!apiKey) {
      console.error('[Coinbase] API_KEY not configured');
      return new Response(
        JSON.stringify({ error: 'Coinbase API key not configured' }), 
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create pending transaction
    const { data: transaction, error: txError } = await supabaseClient
      .from('transactions')
      .insert({
        user_id: user.id,
        type: 'deposit',
        amount: chargeRequest.amount,
        status: 'pending',
        payment_method: 'crypto',
        notes: JSON.stringify({ provider: 'coinbase', currency: chargeRequest.currency || 'USD' }),
      })
      .select()
      .single();

    if (txError) {
      console.error('[Coinbase] Error creating transaction:', txError);
      return new Response(
        JSON.stringify({ error: 'Failed to create transaction' }), 
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[Coinbase] Transaction created:', transaction.id);

    // Create Coinbase Commerce charge
    const webhookUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/coinbase-webhook`;
    
    const chargePayload = {
      name: chargeRequest.description || 'Deposit',
      description: `Deposit #${transaction.id.slice(0, 8)}`,
      pricing_type: 'fixed_price',
      local_price: {
        amount: chargeRequest.amount.toString(),
        currency: chargeRequest.currency || 'USD',
      },
      metadata: {
        transaction_id: transaction.id,
        user_id: user.id,
        ...chargeRequest.metadata,
      },
      redirect_url: `${req.headers.get('origin')}/deposit?payment_status=success`,
      cancel_url: `${req.headers.get('origin')}/deposit?payment_status=cancelled`,
    };

    console.log('[Coinbase] Creating charge with payload:', JSON.stringify(chargePayload));

    const coinbaseResponse = await fetch('https://api.commerce.coinbase.com/charges', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-CC-Api-Key': apiKey,
        'X-CC-Version': '2018-03-22',
      },
      body: JSON.stringify(chargePayload),
    });

    const responseText = await coinbaseResponse.text();
    console.log('[Coinbase] API response status:', coinbaseResponse.status);

    if (!coinbaseResponse.ok) {
      console.error('[Coinbase] API error:', responseText);
      
      let errorMessage = 'Failed to create Coinbase charge';
      try {
        const errorData = JSON.parse(responseText);
        errorMessage = errorData.error?.message || errorData.message || errorMessage;
      } catch (e) {
        errorMessage = responseText || errorMessage;
      }

      // Update transaction as failed
      await supabaseAdmin
        .from('transactions')
        .update({ 
          status: 'failed', 
          notes: JSON.stringify({ 
            provider: 'coinbase', 
            error: errorMessage 
          }) 
        })
        .eq('id', transaction.id);

      return new Response(
        JSON.stringify({ error: errorMessage }), 
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const coinbaseData: CoinbaseCharge = JSON.parse(responseText);
    console.log('[Coinbase] Charge created successfully:', coinbaseData.data.id);

    // Update transaction with Coinbase details
    await supabaseAdmin
      .from('transactions')
      .update({ 
        transaction_reference: coinbaseData.data.code,
        notes: JSON.stringify({
          provider: 'coinbase',
          charge_id: coinbaseData.data.id,
          charge_code: coinbaseData.data.code,
          hosted_url: coinbaseData.data.hosted_url,
          expires_at: coinbaseData.data.expires_at,
          pricing: coinbaseData.data.pricing,
          web3_data: coinbaseData.data.web3_data,
        }),
      })
      .eq('id', transaction.id);

    // Extract payment addresses from web3_data
    const contractAddresses = coinbaseData.data.web3_data?.contract_addresses || {};
    const transferIntent = coinbaseData.data.web3_data?.transfer_intent;

    return new Response(
      JSON.stringify({
        success: true,
        transaction_id: transaction.id,
        charge_id: coinbaseData.data.id,
        charge_code: coinbaseData.data.code,
        hosted_url: coinbaseData.data.hosted_url,
        expires_at: coinbaseData.data.expires_at,
        amount: chargeRequest.amount,
        currency: chargeRequest.currency || 'USD',
        pricing: coinbaseData.data.pricing,
        contract_addresses: contractAddresses,
        transfer_intent: transferIntent,
        web3_data: coinbaseData.data.web3_data,
      }), 
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[Coinbase] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }), 
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
