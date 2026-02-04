import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.84.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Types
interface PaymentRequest {
  amount: number;
  payerName: string;
  payerDocument: string;
  payerEmail?: string;
  description?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
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
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }), 
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize service role client for system operations (payment gateways)
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    const paymentRequest: PaymentRequest = await req.json();

    // Validation
    if (!paymentRequest.amount || paymentRequest.amount <= 0) {
      return new Response(
        JSON.stringify({ error: 'Invalid amount' }), 
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get active gateway from database using service role (bypasses RLS)
    const { data: gateways, error: gatewayError } = await supabaseAdmin
      .from('payment_gateways')
      .select('*')
      .eq('type', 'pix')
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(1);

    if (gatewayError || !gateways || gateways.length === 0) {
      console.error('No active gateway found:', gatewayError);
      return new Response(
        JSON.stringify({ error: 'Gateway de pagamento não configurado. Entre em contato com o suporte.' }), 
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const gateway = gateways[0];
    console.log('Using gateway:', gateway.name, 'Provider:', gateway.config?.provider);

    // Create pending transaction
    const { data: transaction, error: txError } = await supabaseClient
      .from('transactions')
      .insert({
        user_id: user.id,
        type: 'deposit',
        amount: paymentRequest.amount,
        status: 'pending',
        payment_method: gateway.type,
      })
      .select()
      .single();

    if (txError) {
      console.error('Error creating transaction:', txError);
      return new Response(
        JSON.stringify({ error: 'Failed to create transaction' }), 
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get gateway credentials from config
    const credentials = gateway.config?.credentials || {};
    const provider = gateway.config?.provider || 'mercado_pago';
    
    console.log('Processing payment with provider:', provider);
    console.log('Available credentials:', Object.keys(credentials));

    // Route to appropriate provider
    if (provider === 'mercado_pago') {
      return await processMercadoPago(credentials, transaction, paymentRequest, supabaseClient, supabaseAdmin, corsHeaders);
    } else if (provider === 'pixup') {
      return await processPixUp(credentials, transaction, paymentRequest, supabaseClient, supabaseAdmin, corsHeaders);
    } else if (provider === 'woovi') {
      return await processWoovi(credentials, transaction, paymentRequest, supabaseClient, supabaseAdmin, corsHeaders);
    } else if (provider === 'pushin_pay') {
      return await processPushinPay(credentials, transaction, paymentRequest, supabaseClient, supabaseAdmin, corsHeaders);
    } else {
      await supabaseAdmin
        .from('transactions')
        .update({ status: 'failed', notes: `Provedor não suportado: ${provider}` })
        .eq('id', transaction.id);
      
      return new Response(
        JSON.stringify({ error: `Provedor não suportado: ${provider}` }), 
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

  } catch (error) {
    console.error('Error in process-payment:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }), 
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

// ============= MERCADO PAGO PROCESSOR =============
async function processMercadoPago(
  credentials: any,
  transaction: any,
  paymentRequest: PaymentRequest,
  supabaseClient: any,
  supabaseAdmin: any,
  corsHeaders: any
) {
  const accessToken = credentials.ACCESS_TOKEN;
  const publicKey = credentials.PUBLIC_KEY;
  
  if (!accessToken) {
    console.error('Missing ACCESS_TOKEN for Mercado Pago');
    await supabaseAdmin
      .from('transactions')
      .update({ status: 'failed', notes: 'Access Token do Mercado Pago não configurado' })
      .eq('id', transaction.id);
    
    return new Response(
      JSON.stringify({ error: 'Access Token do Mercado Pago não configurado' }), 
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  console.log('Creating Mercado Pago PIX payment...');

  const mpPayload = {
    transaction_amount: paymentRequest.amount,
    description: paymentRequest.description || "Depósito",
    payment_method_id: "pix",
    external_reference: transaction.id,
    payer: {
      email: paymentRequest.payerEmail || "cliente@exemplo.com",
      first_name: paymentRequest.payerName,
      identification: {
        type: paymentRequest.payerDocument.length === 11 ? "CPF" : "CNPJ",
        number: paymentRequest.payerDocument
      }
    }
  };

  const mpResponse = await fetch('https://api.mercadopago.com/v1/payments', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      'X-Idempotency-Key': transaction.id,
    },
    body: JSON.stringify(mpPayload),
  });

  const responseText = await mpResponse.text();
  console.log('Mercado Pago response status:', mpResponse.status);

  if (!mpResponse.ok) {
    console.error('Mercado Pago API error:', responseText);
    
    let errorMessage = 'Erro ao criar pagamento';
    try {
      const errorData = JSON.parse(responseText);
      errorMessage = errorData.message || errorData.error || errorMessage;
    } catch (e) {
      errorMessage = responseText || errorMessage;
    }
    
    await supabaseAdmin
      .from('transactions')
      .update({ 
        status: 'failed', 
        notes: `Erro Mercado Pago: ${errorMessage}` 
      })
      .eq('id', transaction.id);

    return new Response(
      JSON.stringify({ 
        error: errorMessage,
        details: responseText 
      }), 
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  const mpData = JSON.parse(responseText);
  console.log('Mercado Pago payment created successfully:', mpData.id);

  const qrCode = mpData.point_of_interaction?.transaction_data?.qr_code;
  const qrCodeBase64 = mpData.point_of_interaction?.transaction_data?.qr_code_base64;
  const ticketUrl = mpData.point_of_interaction?.transaction_data?.ticket_url;

  await supabaseAdmin
    .from('transactions')
    .update({ 
      transaction_reference: mpData.id.toString(),
      status: mpData.status === 'approved' ? 'completed' : 'pending',
      notes: JSON.stringify({
        provider: 'mercado_pago',
        mercado_pago_id: mpData.id,
        status: mpData.status,
        qr_code: qrCode,
        qr_code_base64: qrCodeBase64,
        ticket_url: ticketUrl,
        created_at: mpData.date_created,
        expires_at: mpData.date_of_expiration,
      }),
    })
    .eq('id', transaction.id);

  return new Response(
    JSON.stringify({
      success: true,
      transaction_id: transaction.id,
      external_transaction_id: mpData.id.toString(),
      qr_code: qrCode,
      qr_code_base64: qrCodeBase64,
      ticket_url: ticketUrl,
      amount: mpData.transaction_amount,
      status: mpData.status,
      expires_at: mpData.date_of_expiration,
    }), 
    { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

// ============= PIXUP PROCESSOR =============
async function processPixUp(
  credentials: any,
  transaction: any,
  paymentRequest: PaymentRequest,
  supabaseClient: any,
  supabaseAdmin: any,
  corsHeaders: any
) {
  const clientId = credentials.CLIENT_ID;
  const clientSecret = credentials.CLIENT_SECRET;
  
  if (!clientId || !clientSecret) {
    console.error('Missing CLIENT_ID or CLIENT_SECRET for PixUP');
    await supabaseAdmin
      .from('transactions')
      .update({ status: 'failed', notes: 'Credenciais do PixUP não configuradas' })
      .eq('id', transaction.id);
    
    return new Response(
      JSON.stringify({ error: 'Credenciais do PixUP não configuradas' }), 
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  console.log('Authenticating with PixUP...');

  // Step 1: Get access token using Basic Auth
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
    const errorText = await tokenResponse.text();
    console.error('PixUP authentication failed:', errorText);
    
    await supabaseAdmin
      .from('transactions')
      .update({ status: 'failed', notes: 'Falha na autenticação PixUP' })
      .eq('id', transaction.id);
    
    return new Response(
      JSON.stringify({ error: 'Falha na autenticação PixUP', details: errorText }), 
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  const tokenData = await tokenResponse.json();
  const accessToken = tokenData.access_token;
  
  console.log('PixUP access token obtained, creating QR code...');

  // Step 2: Create PIX QR Code with postbackUrl (webhook)
  const webhookUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/payment-webhook`;
  
  const pixupPayload = {
    amount: paymentRequest.amount,
    external_id: transaction.id,
    payerQuestion: paymentRequest.description || "Depósito",
    postbackUrl: webhookUrl,
    payer: {
      name: paymentRequest.payerName,
      document: paymentRequest.payerDocument.replace(/\D/g, ''),
      email: paymentRequest.payerEmail || ""
    }
  };

  console.log('Creating PixUP QR code with webhook:', webhookUrl);

  const pixupResponse = await fetch('https://api.pixupbr.com/v2/pix/qrcode', {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`
    },
    body: JSON.stringify(pixupPayload)
  });

  const responseText = await pixupResponse.text();
  console.log('PixUP QR code response status:', pixupResponse.status);

  if (!pixupResponse.ok) {
    console.error('PixUP QR code creation failed:', responseText);
    
    let errorMessage = 'Erro ao criar QR code PixUP';
    try {
      const errorData = JSON.parse(responseText);
      errorMessage = errorData.message || errorMessage;
    } catch (e) {
      errorMessage = responseText || errorMessage;
    }
    
    await supabaseAdmin
      .from('transactions')
      .update({ 
        status: 'failed', 
        notes: `Erro PixUP: ${errorMessage}` 
      })
      .eq('id', transaction.id);

    return new Response(
      JSON.stringify({ 
        error: errorMessage,
        details: responseText 
      }), 
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  const pixupData = JSON.parse(responseText);
  console.log('PixUP QR code created successfully:', pixupData.transactionId);

  // Update transaction with PixUP details
  await supabaseAdmin
    .from('transactions')
    .update({ 
      transaction_reference: pixupData.transactionId,
      status: pixupData.status.toLowerCase() === 'approved' ? 'completed' : 'pending',
      notes: JSON.stringify({
        provider: 'pixup',
        pixup_transaction_id: pixupData.transactionId,
        external_id: pixupData.external_id,
        status: pixupData.status,
        qr_code: pixupData.qrcode,
        expiration: pixupData.calendar?.expiration,
        due_date: pixupData.calendar?.dueDate,
        debtor: pixupData.debtor
      }),
    })
    .eq('id', transaction.id);

  return new Response(
    JSON.stringify({
      success: true,
      transaction_id: transaction.id,
      external_transaction_id: pixupData.transactionId,
      qr_code: pixupData.qrcode,
      amount: pixupData.amount,
      status: pixupData.status,
      expires_at: pixupData.calendar?.dueDate,
    }), 
    { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

// ============= WOOVI/OPENPIX PROCESSOR =============
async function processWoovi(
  credentials: any,
  transaction: any,
  paymentRequest: PaymentRequest,
  supabaseClient: any,
  supabaseAdmin: any,
  corsHeaders: any
) {
  // Try to get APP_ID from credentials first, then from env
  const appId = credentials.APP_ID || Deno.env.get('WOOVI_APP_ID');
  
  if (!appId) {
    console.error('Missing APP_ID for Woovi');
    await supabaseAdmin
      .from('transactions')
      .update({ status: 'failed', notes: 'App ID da Woovi não configurado' })
      .eq('id', transaction.id);
    
    return new Response(
      JSON.stringify({ error: 'App ID da Woovi não configurado' }), 
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  console.log('Creating Woovi PIX charge...');

  // Build the payload
  const wooviPayload: any = {
    correlationID: transaction.id,
    value: Math.round(paymentRequest.amount * 100), // Value in cents
    comment: paymentRequest.description || "Depósito PIX",
  };

  // Add customer info if available
  if (paymentRequest.payerName || paymentRequest.payerEmail || paymentRequest.payerDocument) {
    wooviPayload.customer = {
      name: paymentRequest.payerName || "Cliente",
      email: paymentRequest.payerEmail || undefined,
      phone: undefined,
      taxID: paymentRequest.payerDocument?.replace(/\D/g, '') || undefined,
    };
  }

  console.log('Woovi payload:', JSON.stringify(wooviPayload));

  const wooviResponse = await fetch('https://api.openpix.com.br/api/v1/charge', {
    method: 'POST',
    headers: {
      'Authorization': appId,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(wooviPayload),
  });

  const responseText = await wooviResponse.text();
  console.log('Woovi response status:', wooviResponse.status);

  if (!wooviResponse.ok) {
    console.error('Woovi API error:', responseText);
    
    let errorMessage = 'Erro ao criar cobrança Woovi';
    try {
      const errorData = JSON.parse(responseText);
      errorMessage = errorData.errors?.[0]?.message || errorData.message || errorMessage;
    } catch (e) {
      errorMessage = responseText || errorMessage;
    }
    
    await supabaseAdmin
      .from('transactions')
      .update({ 
        status: 'failed', 
        notes: `Erro Woovi: ${errorMessage}` 
      })
      .eq('id', transaction.id);

    return new Response(
      JSON.stringify({ 
        error: errorMessage,
        details: responseText 
      }), 
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  const wooviData = JSON.parse(responseText);
  const charge = wooviData.charge;
  
  console.log('Woovi charge created successfully:', charge?.identifier);
  console.log('Woovi charge data:', JSON.stringify(charge, null, 2));

  // Woovi/OpenPix uses brCode for the EMV code and qrCodeImage for the image URL
  const qrCode = charge?.brCode || '';
  // qrCodeImage is a URL to the QR code image, not base64
  const qrCodeImageUrl = charge?.qrCodeImage || '';
  const identifier = charge?.identifier;
  const paymentLinkUrl = charge?.paymentLinkUrl;

  console.log('Extracted QR data - brCode length:', qrCode?.length, 'qrCodeImageUrl:', qrCodeImageUrl);

  // Update transaction with Woovi details
  // Store correlationID as transaction_reference for webhook matching
  await supabaseAdmin
    .from('transactions')
    .update({ 
      transaction_reference: transaction.id, // correlationID = transaction.id
      status: 'pending',
      notes: JSON.stringify({
        provider: 'woovi',
        woovi_identifier: identifier,
        correlation_id: transaction.id,
        qr_code: qrCode,
        qr_code_image_url: qrCodeImageUrl,
        payment_link_url: paymentLinkUrl,
        created_at: new Date().toISOString(),
      }),
    })
    .eq('id', transaction.id);

  return new Response(
    JSON.stringify({
      success: true,
      transaction_id: transaction.id,
      external_transaction_id: identifier,
      qr_code: qrCode,
      qr_code_image_url: qrCodeImageUrl,
      payment_link_url: paymentLinkUrl,
      amount: paymentRequest.amount,
      status: 'pending',
    }), 
    { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

// ============= PUSHIN PAY PROCESSOR =============
async function processPushinPay(
  credentials: any,
  transaction: any,
  paymentRequest: PaymentRequest,
  supabaseClient: any,
  supabaseAdmin: any,
  corsHeaders: any
) {
  // Try to get API_TOKEN from credentials first, then from env
  const apiToken = credentials.API_TOKEN || Deno.env.get('PUSHIN_PAY_TOKEN');
  
  if (!apiToken) {
    console.error('Missing API_TOKEN for Pushin Pay');
    await supabaseAdmin
      .from('transactions')
      .update({ status: 'failed', notes: 'Token da Pushin Pay não configurado' })
      .eq('id', transaction.id);
    
    return new Response(
      JSON.stringify({ error: 'Token da Pushin Pay não configurado' }), 
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  console.log('Creating Pushin Pay PIX charge...');

  // Pushin Pay expects value in cents
  const valueInCents = Math.round(paymentRequest.amount * 100);
  
  // Build webhook URL
  const webhookUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/pushin-pay-webhook`;

  const pushinPayload: any = {
    value: valueInCents,
    webhook_url: webhookUrl,
    correlationID: transaction.id, // For tracking
  };

  console.log('Pushin Pay payload:', JSON.stringify(pushinPayload));

  const pushinResponse = await fetch('https://api.pushinpay.com.br/api/pix/cashIn', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiToken}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: JSON.stringify(pushinPayload),
  });

  const responseText = await pushinResponse.text();
  console.log('Pushin Pay response status:', pushinResponse.status);
  console.log('Pushin Pay response body:', responseText);

  if (!pushinResponse.ok) {
    console.error('Pushin Pay API error:', responseText);
    
    let errorMessage = 'Erro ao criar cobrança Pushin Pay';
    try {
      const errorData = JSON.parse(responseText);
      errorMessage = errorData.message || errorData.error || errorMessage;
    } catch (e) {
      errorMessage = responseText || errorMessage;
    }
    
    await supabaseAdmin
      .from('transactions')
      .update({ 
        status: 'failed', 
        notes: `Erro Pushin Pay: ${errorMessage}` 
      })
      .eq('id', transaction.id);

    return new Response(
      JSON.stringify({ 
        error: errorMessage,
        details: responseText 
      }), 
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  const pushinData = JSON.parse(responseText);
  
  console.log('Pushin Pay charge created successfully:', pushinData.id);
  console.log('Pushin Pay charge data:', JSON.stringify(pushinData, null, 2));

  // Extract QR code data
  const qrCode = pushinData.qr_code || pushinData.brCode || '';
  const qrCodeBase64 = pushinData.qr_code_base64 || '';
  const externalId = pushinData.id;

  console.log('Extracted QR data - qr_code length:', qrCode?.length, 'qr_code_base64 present:', !!qrCodeBase64);

  // Update transaction with Pushin Pay details
  await supabaseAdmin
    .from('transactions')
    .update({ 
      transaction_reference: externalId,
      status: 'pending',
      notes: JSON.stringify({
        provider: 'pushin_pay',
        pushin_pay_id: externalId,
        correlation_id: transaction.id,
        qr_code: qrCode,
        qr_code_base64: qrCodeBase64,
        created_at: new Date().toISOString(),
      }),
    })
    .eq('id', transaction.id);

  return new Response(
    JSON.stringify({
      success: true,
      transaction_id: transaction.id,
      external_transaction_id: externalId,
      qr_code: qrCode,
      qr_code_base64: qrCodeBase64,
      amount: paymentRequest.amount,
      status: 'pending',
    }), 
    { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}
