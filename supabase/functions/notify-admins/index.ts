import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Tipos de notificação para admins
type AdminNotificationType = 
  | 'new_deposit'
  | 'withdrawal_request'
  | 'identity_verification'
  | 'affiliate_withdrawal'
  | 'new_user'
  | 'large_trade';

interface AdminNotificationPayload {
  type: AdminNotificationType;
  userId?: string;
  amount?: number;
  userName?: string;
  details?: string;
}

// Mensagens pré-definidas para cada tipo de notificação
const notificationMessages: Record<AdminNotificationType, { title: string; getBody: (payload: AdminNotificationPayload) => string; url: string }> = {
  new_deposit: {
    title: '💰 Novo Depósito!',
    getBody: (p) => `${p.userName || 'Usuário'} realizou um depósito de R$ ${p.amount?.toFixed(2) || '0.00'}`,
    url: '/admin/transactions'
  },
  withdrawal_request: {
    title: '🏦 Solicitação de Saque!',
    getBody: (p) => `${p.userName || 'Usuário'} solicitou saque de R$ ${p.amount?.toFixed(2) || '0.00'}`,
    url: '/admin/transactions'
  },
  identity_verification: {
    title: '🪪 Verificação de Identidade!',
    getBody: (p) => `${p.userName || 'Usuário'} enviou documentos para verificação`,
    url: '/admin/verifications'
  },
  affiliate_withdrawal: {
    title: '👥 Saque de Afiliado!',
    getBody: (p) => `Afiliado solicitou saque de R$ ${p.amount?.toFixed(2) || '0.00'}`,
    url: '/admin/withdrawals'
  },
  new_user: {
    title: '🎉 Novo Usuário!',
    getBody: (p) => `${p.userName || 'Novo usuário'} se cadastrou na plataforma`,
    url: '/admin/users'
  },
  large_trade: {
    title: '📊 Trade de Alto Valor!',
    getBody: (p) => `Trade de R$ ${p.amount?.toFixed(2) || '0.00'} por ${p.userName || 'usuário'}`,
    url: '/admin/trades'
  }
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const payload: AdminNotificationPayload = await req.json();

    console.log('[Notify Admins] Recebendo requisição:', payload);

    if (!payload.type) {
      return new Response(
        JSON.stringify({ error: 'Missing required field: type' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const notificationConfig = notificationMessages[payload.type];
    if (!notificationConfig) {
      return new Response(
        JSON.stringify({ error: 'Invalid notification type' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Criar cliente Supabase
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Buscar todos os user_ids que são admin
    const { data: adminRoles, error: rolesError } = await supabase
      .from('user_roles')
      .select('user_id')
      .eq('role', 'admin');

    if (rolesError) {
      console.error('[Notify Admins] Erro ao buscar admins:', rolesError);
      throw rolesError;
    }

    if (!adminRoles || adminRoles.length === 0) {
      console.log('[Notify Admins] Nenhum admin encontrado');
      return new Response(
        JSON.stringify({ success: true, sent: 0, message: 'No admins found' }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const adminUserIds = adminRoles.map(r => r.user_id);
    console.log(`[Notify Admins] Encontrados ${adminUserIds.length} admins`);

    // Buscar push subscriptions dos admins
    const { data: subscriptions, error: queryError } = await supabase
      .from('push_subscriptions')
      .select('*')
      .in('user_id', adminUserIds);

    if (queryError) {
      console.error('[Notify Admins] Erro ao buscar subscriptions:', queryError);
      throw queryError;
    }

    if (!subscriptions || subscriptions.length === 0) {
      console.log('[Notify Admins] Nenhuma subscription de admin encontrada');
      return new Response(
        JSON.stringify({ success: true, sent: 0, message: 'No admin subscriptions found' }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log(`[Notify Admins] Enviando para ${subscriptions.length} subscriptions de admins`);

    // Preparar payload da notificação
    const title = notificationConfig.title;
    const body = notificationConfig.getBody(payload);
    const url = notificationConfig.url;

    // Chamar a edge function send-push-notification para cada admin
    // Usando fetch interno para manter a lógica de envio centralizada
    const notificationPayload = {
      title,
      body,
      icon: '/pwa-192x192.png',
      url,
      tag: `admin-${payload.type}`,
      sendToAll: false
    };

    let sent = 0;
    let failed = 0;

    // Enviar para cada admin individualmente
    for (const adminId of adminUserIds) {
      try {
        const { error } = await supabase.functions.invoke('send-push-notification', {
          body: {
            ...notificationPayload,
            userId: adminId
          }
        });

        if (error) {
          console.error(`[Notify Admins] Erro ao enviar para admin ${adminId}:`, error);
          failed++;
        } else {
          sent++;
        }
      } catch (err) {
        console.error(`[Notify Admins] Erro ao enviar para admin ${adminId}:`, err);
        failed++;
      }
    }

    console.log(`[Notify Admins] Resultado: ${sent} enviados, ${failed} falharam`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        sent,
        failed,
        total: adminUserIds.length,
        type: payload.type
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  } catch (error) {
    console.error('[Notify Admins] Erro:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
