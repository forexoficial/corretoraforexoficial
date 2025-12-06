import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.84.0";
import { createHmac } from "node:crypto";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-cc-webhook-signature',
};

interface CoinbaseWebhookEvent {
  id: string;
  type: string;
  api_version: string;
  created_at: string;
  data: {
    id: string;
    code: string;
    name: string;
    description: string;
    hosted_url: string;
    created_at: string;
    expires_at: string;
    confirmed_at?: string;
    pricing: {
      local: { amount: string; currency: string };
      settlement: { amount: string; currency: string };
    };
    pricing_type: string;
    payments: Array<{
      network: string;
      transaction_id: string;
      status: string;
      value: { local: { amount: string; currency: string }; crypto: { amount: string; currency: string } };
      block: { height: number; hash: string; confirmations: number; confirmations_required: number };
    }>;
    timeline: Array<{ status: string; time: string }>;
    metadata: {
      transaction_id?: string;
      user_id?: string;
      [key: string]: string | undefined;
    };
  };
}

// Verify Coinbase webhook signature
function verifyWebhookSignature(payload: string, signature: string, secret: string): boolean {
  try {
    const hmac = createHmac('sha256', secret);
    hmac.update(payload);
    const computedSignature = hmac.digest('hex');
    return computedSignature === signature;
  } catch (error) {
    console.error('[Coinbase Webhook] Signature verification error:', error);
    return false;
  }
}

// Map Coinbase event types to internal status
function mapCoinbaseStatus(eventType: string, timeline: Array<{ status: string }>): string {
  const latestStatus = timeline[timeline.length - 1]?.status?.toUpperCase();
  
  switch (eventType) {
    case 'charge:confirmed':
    case 'charge:resolved':
      return 'completed';
    case 'charge:pending':
      return 'pending';
    case 'charge:failed':
    case 'charge:expired':
    case 'charge:canceled':
      return 'failed';
    default:
      // Fallback to timeline status
      if (latestStatus === 'COMPLETED' || latestStatus === 'RESOLVED' || latestStatus === 'CONFIRMED') {
        return 'completed';
      } else if (latestStatus === 'PENDING' || latestStatus === 'NEW') {
        return 'pending';
      }
      return 'failed';
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('[Coinbase Webhook] Received webhook request');

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    // Get raw body for signature verification
    const rawBody = await req.text();
    console.log('[Coinbase Webhook] Raw body length:', rawBody.length);

    // Get signature from header
    const signature = req.headers.get('x-cc-webhook-signature');
    
    // Get webhook secret from gateway config
    const { data: gateways } = await supabaseAdmin
      .from('payment_gateways')
      .select('config')
      .eq('type', 'crypto')
      .eq('is_active', true);

    const coinbaseGateway = gateways?.find(g => 
      g.config?.provider === 'coinbase'
    );

    const webhookSecret = coinbaseGateway?.config?.credentials?.WEBHOOK_SECRET;

    // Verify signature if webhook secret is configured
    if (webhookSecret && signature) {
      const isValid = verifyWebhookSignature(rawBody, signature, webhookSecret);
      if (!isValid) {
        console.error('[Coinbase Webhook] Invalid signature');
        return new Response(
          JSON.stringify({ error: 'Invalid webhook signature' }), 
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      console.log('[Coinbase Webhook] Signature verified');
    } else {
      console.log('[Coinbase Webhook] No webhook secret configured, skipping signature verification');
    }

    // Parse webhook event
    let event: CoinbaseWebhookEvent;
    try {
      event = JSON.parse(rawBody);
    } catch (parseError) {
      console.error('[Coinbase Webhook] Failed to parse webhook body:', parseError);
      return new Response(
        JSON.stringify({ error: 'Invalid JSON' }), 
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[Coinbase Webhook] Event type:', event.type);
    console.log('[Coinbase Webhook] Charge code:', event.data.code);
    console.log('[Coinbase Webhook] Metadata:', event.data.metadata);

    // Get transaction ID from metadata
    const transactionId = event.data.metadata?.transaction_id;
    const userId = event.data.metadata?.user_id;

    if (!transactionId) {
      console.error('[Coinbase Webhook] No transaction_id in metadata');
      // Try to find transaction by charge code
      const { data: txByCode } = await supabaseAdmin
        .from('transactions')
        .select('*')
        .eq('transaction_reference', event.data.code)
        .single();

      if (!txByCode) {
        console.error('[Coinbase Webhook] Transaction not found by charge code');
        return new Response(
          JSON.stringify({ error: 'Transaction not found' }), 
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Determine new status
    const newStatus = mapCoinbaseStatus(event.type, event.data.timeline);
    console.log('[Coinbase Webhook] Mapped status:', newStatus);

    // Find and update transaction
    const { data: transaction, error: findError } = await supabaseAdmin
      .from('transactions')
      .select('*')
      .or(`id.eq.${transactionId},transaction_reference.eq.${event.data.code}`)
      .single();

    if (findError || !transaction) {
      console.error('[Coinbase Webhook] Transaction not found:', findError);
      return new Response(
        JSON.stringify({ error: 'Transaction not found' }), 
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[Coinbase Webhook] Found transaction:', transaction.id, 'current status:', transaction.status);

    // Don't update if already completed
    if (transaction.status === 'completed') {
      console.log('[Coinbase Webhook] Transaction already completed, skipping');
      return new Response(
        JSON.stringify({ success: true, message: 'Already processed' }), 
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse existing notes
    let existingNotes = {};
    try {
      existingNotes = JSON.parse(transaction.notes || '{}');
    } catch (e) {
      existingNotes = {};
    }

    // Update transaction
    const { error: updateError } = await supabaseAdmin
      .from('transactions')
      .update({
        status: newStatus,
        notes: JSON.stringify({
          ...existingNotes,
          provider: 'coinbase',
          event_type: event.type,
          confirmed_at: event.data.confirmed_at,
          payments: event.data.payments,
          timeline: event.data.timeline,
          last_webhook_at: new Date().toISOString(),
        }),
      })
      .eq('id', transaction.id);

    if (updateError) {
      console.error('[Coinbase Webhook] Failed to update transaction:', updateError);
      return new Response(
        JSON.stringify({ error: 'Failed to update transaction' }), 
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[Coinbase Webhook] Transaction updated to status:', newStatus);

    // If payment completed, update user balance
    if (newStatus === 'completed') {
      console.log('[Coinbase Webhook] Payment completed, updating user balance...');

      const { data: profile, error: profileError } = await supabaseAdmin
        .from('profiles')
        .select('balance, user_id')
        .eq('user_id', transaction.user_id)
        .single();

      if (!profileError && profile) {
        const newBalance = (profile.balance || 0) + transaction.amount;
        
        const { error: balanceError } = await supabaseAdmin
          .from('profiles')
          .update({ balance: newBalance })
          .eq('user_id', transaction.user_id);

        if (balanceError) {
          console.error('[Coinbase Webhook] Failed to update balance:', balanceError);
        } else {
          console.log('[Coinbase Webhook] Balance updated:', profile.balance, '->', newBalance);
        }
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        transaction_id: transaction.id,
        status: newStatus 
      }), 
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[Coinbase Webhook] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }), 
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
