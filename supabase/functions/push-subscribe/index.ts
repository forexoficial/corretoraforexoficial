import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { endpoint, p256dh, auth, userId } = await req.json();

    console.log('[Push Subscribe] Recebendo subscription:', { endpoint, userId });

    if (!endpoint || !p256dh || !auth) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: endpoint, p256dh, auth' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Criar cliente Supabase com service role
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verificar se já existe uma subscription com este endpoint
    const { data: existing } = await supabase
      .from('push_subscriptions')
      .select('id')
      .eq('endpoint', endpoint)
      .single();

    if (existing) {
      // Atualizar subscription existente
      const { error: updateError } = await supabase
        .from('push_subscriptions')
        .update({
          p256dh,
          auth,
          user_id: userId || null,
          updated_at: new Date().toISOString()
        })
        .eq('endpoint', endpoint);

      if (updateError) {
        console.error('[Push Subscribe] Erro ao atualizar:', updateError);
        throw updateError;
      }

      console.log('[Push Subscribe] Subscription atualizada com sucesso');
    } else {
      // Criar nova subscription
      const { error: insertError } = await supabase
        .from('push_subscriptions')
        .insert({
          endpoint,
          p256dh,
          auth,
          user_id: userId || null
        });

      if (insertError) {
        console.error('[Push Subscribe] Erro ao inserir:', insertError);
        throw insertError;
      }

      console.log('[Push Subscribe] Nova subscription criada com sucesso');
    }

    return new Response(
      JSON.stringify({ success: true }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  } catch (error) {
    console.error('[Push Subscribe] Erro:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
