import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import webpush from "https://esm.sh/web-push@3.6.7";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
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
      tag = 'platform-notification'
    } = await req.json();

    console.log('[Send Push] Requisição:', { title, userId, sendToAll });

    if (!title || !body) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: title, body' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY');
    const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY');
    
    if (!vapidPublicKey || !vapidPrivateKey) {
      console.error('[Send Push] Chaves VAPID não configuradas');
      return new Response(
        JSON.stringify({ error: 'VAPID keys not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Configurar VAPID
    webpush.setVapidDetails(
      'mailto:admin@platform.com',
      vapidPublicKey,
      vapidPrivateKey
    );

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

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
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[Send Push] Enviando para ${subscriptions.length} subscriptions`);

    const payload = JSON.stringify({
      title,
      body,
      icon: icon || '/pwa-192x192.png',
      badge: '/pwa-192x192.png',
      url: url || '/',
      tag,
      timestamp: Date.now()
    });

    let sent = 0;
    let failed = 0;

    for (const sub of subscriptions) {
      try {
        const pushSubscription = {
          endpoint: sub.endpoint,
          keys: {
            p256dh: sub.p256dh,
            auth: sub.auth
          }
        };

        await webpush.sendNotification(pushSubscription, payload);
        sent++;
        console.log(`[Send Push] Enviado com sucesso para: ${sub.endpoint.substring(0, 50)}...`);
      } catch (error: unknown) {
        failed++;
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error(`[Send Push] Erro ao enviar:`, errorMessage);
        
        // Remover subscriptions expiradas/inválidas
        if (errorMessage.includes('410') || errorMessage.includes('404') || errorMessage.includes('expired')) {
          console.log(`[Send Push] Removendo subscription inválida`);
          await supabase.from('push_subscriptions').delete().eq('endpoint', sub.endpoint);
        }
      }
    }

    console.log(`[Send Push] Resultado: ${sent} enviados, ${failed} falharam`);

    return new Response(
      JSON.stringify({ success: true, sent, failed, total: subscriptions.length }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[Send Push] Erro geral:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error instanceof Error ? error.message : String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
