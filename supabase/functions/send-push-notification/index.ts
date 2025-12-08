import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Função para criar assinatura JWT para web push
async function signPayload(privateKey: string, payload: object): Promise<string> {
  const header = { alg: 'ES256', typ: 'JWT' };
  
  const now = Math.floor(Date.now() / 1000);
  const jwtPayload = {
    ...payload,
    iat: now,
    exp: now + 12 * 60 * 60 // 12 horas
  };
  
  const encoder = new TextEncoder();
  const headerB64 = btoa(JSON.stringify(header)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  const payloadB64 = btoa(JSON.stringify(jwtPayload)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  
  const data = encoder.encode(`${headerB64}.${payloadB64}`);
  
  // Converter chave privada de base64 para CryptoKey
  const keyData = Uint8Array.from(atob(privateKey.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0));
  
  const key = await crypto.subtle.importKey(
    'pkcs8',
    keyData,
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['sign']
  );
  
  const signature = await crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' },
    key,
    data
  );
  
  const signatureB64 = btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  
  return `${headerB64}.${payloadB64}.${signatureB64}`;
}

// Enviar notificação para uma subscription
async function sendNotification(
  subscription: { endpoint: string; p256dh: string; auth: string },
  payload: object,
  vapidPublicKey: string,
  vapidPrivateKey: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const url = new URL(subscription.endpoint);
    const audience = `${url.protocol}//${url.host}`;
    
    const payloadString = JSON.stringify(payload);
    const payloadBuffer = new TextEncoder().encode(payloadString);
    
    // Criar JWT para autorização
    const jwt = await signPayload(vapidPrivateKey, {
      aud: audience,
      sub: 'mailto:admin@blackrockbroker.com'
    });
    
    const response = await fetch(subscription.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/octet-stream',
        'Content-Encoding': 'aes128gcm',
        'TTL': '86400',
        'Authorization': `vapid t=${jwt}, k=${vapidPublicKey}`,
        'Urgency': 'high'
      },
      body: payloadBuffer
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[Send Push] Erro ao enviar para ${subscription.endpoint}:`, response.status, errorText);
      return { success: false, error: `HTTP ${response.status}: ${errorText}` };
    }
    
    console.log(`[Send Push] Notificação enviada com sucesso para ${subscription.endpoint}`);
    return { success: true };
  } catch (error: unknown) {
    console.error(`[Send Push] Erro ao enviar notificação:`, error);
    return { success: false, error: error instanceof Error ? error.message : String(error) };
  }
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      title, 
      body, 
      icon, 
      url, 
      userId, 
      sendToAll = false,
      tag = 'blackrock-notification'
    } = await req.json();

    console.log('[Send Push] Recebendo requisição:', { title, userId, sendToAll });

    if (!title || !body) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: title, body' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Obter chaves VAPID
    const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY');
    const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY');
    
    if (!vapidPublicKey || !vapidPrivateKey) {
      console.error('[Send Push] Chaves VAPID não configuradas');
      return new Response(
        JSON.stringify({ error: 'VAPID keys not configured' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Criar cliente Supabase
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Buscar subscriptions
    let query = supabase.from('push_subscriptions').select('*');
    
    if (!sendToAll && userId) {
      query = query.eq('user_id', userId);
    }
    
    const { data: subscriptions, error: queryError } = await query;
    
    if (queryError) {
      console.error('[Send Push] Erro ao buscar subscriptions:', queryError);
      throw queryError;
    }

    if (!subscriptions || subscriptions.length === 0) {
      console.log('[Send Push] Nenhuma subscription encontrada');
      return new Response(
        JSON.stringify({ success: true, sent: 0, message: 'No subscriptions found' }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log(`[Send Push] Enviando para ${subscriptions.length} subscriptions`);

    // Payload da notificação
    const payload = {
      title,
      body,
      icon: icon || '/pwa-192x192.png',
      badge: '/pwa-192x192.png',
      url: url || '/',
      tag,
      timestamp: Date.now()
    };

    // Enviar para todas as subscriptions
    let sent = 0;
    let failed = 0;
    const failedEndpoints: string[] = [];

    for (const sub of subscriptions) {
      const result = await sendNotification(
        { endpoint: sub.endpoint, p256dh: sub.p256dh, auth: sub.auth },
        payload,
        vapidPublicKey,
        vapidPrivateKey
      );
      
      if (result.success) {
        sent++;
      } else {
        failed++;
        failedEndpoints.push(sub.endpoint);
        
        // Remover subscriptions inválidas (status 404 ou 410)
        if (result.error?.includes('410') || result.error?.includes('404')) {
          console.log(`[Send Push] Removendo subscription inválida: ${sub.endpoint}`);
          await supabase
            .from('push_subscriptions')
            .delete()
            .eq('endpoint', sub.endpoint);
        }
      }
    }

    console.log(`[Send Push] Resultado: ${sent} enviados, ${failed} falharam`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        sent, 
        failed,
        total: subscriptions.length
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  } catch (error) {
    console.error('[Send Push] Erro:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
