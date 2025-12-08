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
    console.log('[Process Admin Notifications] Iniciando processamento...');

    // Criar cliente Supabase
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Buscar notificações não processadas
    const { data: pendingNotifications, error: queryError } = await supabase
      .from('admin_notification_queue')
      .select('*')
      .eq('processed', false)
      .order('created_at', { ascending: true })
      .limit(50);

    if (queryError) {
      console.error('[Process Admin Notifications] Erro ao buscar fila:', queryError);
      throw queryError;
    }

    if (!pendingNotifications || pendingNotifications.length === 0) {
      console.log('[Process Admin Notifications] Nenhuma notificação pendente');
      return new Response(
        JSON.stringify({ success: true, processed: 0 }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log(`[Process Admin Notifications] ${pendingNotifications.length} notificações pendentes`);

    // Buscar todos os user_ids que são admin
    const { data: adminRoles, error: rolesError } = await supabase
      .from('user_roles')
      .select('user_id')
      .eq('role', 'admin');

    if (rolesError) {
      console.error('[Process Admin Notifications] Erro ao buscar admins:', rolesError);
      throw rolesError;
    }

    if (!adminRoles || adminRoles.length === 0) {
      console.log('[Process Admin Notifications] Nenhum admin encontrado');
      // Marcar todas como processadas mesmo assim
      const ids = pendingNotifications.map(n => n.id);
      await supabase
        .from('admin_notification_queue')
        .update({ processed: true })
        .in('id', ids);
      
      return new Response(
        JSON.stringify({ success: true, processed: 0, message: 'No admins found' }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const adminUserIds = adminRoles.map(r => r.user_id);

    // Mensagens pré-definidas para cada tipo
    const notificationMessages: Record<string, { title: string; getBody: (n: any) => string; url: string }> = {
      new_deposit: {
        title: '💰 Novo Depósito!',
        getBody: (n) => `${n.user_name || 'Usuário'} realizou um depósito de R$ ${n.amount?.toFixed(2) || '0.00'}`,
        url: '/admin/transactions'
      },
      withdrawal_request: {
        title: '🏦 Solicitação de Saque!',
        getBody: (n) => `${n.user_name || 'Usuário'} solicitou saque de R$ ${n.amount?.toFixed(2) || '0.00'}`,
        url: '/admin/transactions'
      },
      identity_verification: {
        title: '🪪 Verificação de Identidade!',
        getBody: (n) => `${n.user_name || 'Usuário'} enviou documentos para verificação`,
        url: '/admin/verifications'
      },
      affiliate_withdrawal: {
        title: '👥 Saque de Afiliado!',
        getBody: (n) => `Afiliado solicitou saque de R$ ${n.amount?.toFixed(2) || '0.00'}`,
        url: '/admin/withdrawals'
      },
      new_user: {
        title: '🎉 Novo Usuário!',
        getBody: (n) => `${n.user_name || 'Novo usuário'} se cadastrou na plataforma`,
        url: '/admin/users'
      },
      large_trade: {
        title: '📊 Trade de Alto Valor!',
        getBody: (n) => `Trade de R$ ${n.amount?.toFixed(2) || '0.00'} por ${n.user_name || 'usuário'}`,
        url: '/admin/trades'
      }
    };

    let processed = 0;
    const processedIds: string[] = [];

    // Processar cada notificação
    for (const notification of pendingNotifications) {
      const config = notificationMessages[notification.notification_type];
      
      if (!config) {
        console.log(`[Process Admin Notifications] Tipo desconhecido: ${notification.notification_type}`);
        processedIds.push(notification.id);
        continue;
      }

      const title = config.title;
      const body = config.getBody(notification);
      const url = config.url;

      // Enviar para cada admin
      for (const adminId of adminUserIds) {
        try {
          await supabase.functions.invoke('send-push-notification', {
            body: {
              title,
              body,
              icon: '/pwa-192x192.png',
              url,
              userId: adminId,
              tag: `admin-${notification.notification_type}`,
              sendToAll: false
            }
          });
        } catch (err) {
          console.error(`[Process Admin Notifications] Erro ao enviar para admin ${adminId}:`, err);
        }
      }

      processedIds.push(notification.id);
      processed++;
    }

    // Marcar como processadas
    if (processedIds.length > 0) {
      await supabase
        .from('admin_notification_queue')
        .update({ processed: true })
        .in('id', processedIds);
    }

    console.log(`[Process Admin Notifications] Processadas: ${processed} notificações`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        processed,
        admins: adminUserIds.length
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  } catch (error) {
    console.error('[Process Admin Notifications] Erro:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
