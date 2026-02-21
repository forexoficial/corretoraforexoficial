import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface PushNotificationState {
  isSupported: boolean;
  isSubscribed: boolean;
  permission: NotificationPermission | 'default';
  isLoading: boolean;
  error: string | null;
}

export function usePushNotifications() {
  const [userId, setUserId] = useState<string | null>(null);
  const [state, setState] = useState<PushNotificationState>({
    isSupported: false,
    isSubscribed: false,
    permission: 'default',
    isLoading: true,
    error: null
  });

  // Obter usuário atual
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUserId(session?.user?.id || null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserId(session?.user?.id || null);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Verificar suporte e estado inicial
  useEffect(() => {
    const checkSupport = async () => {
      const isSupported = 'serviceWorker' in navigator && 
                          'PushManager' in window && 
                          'Notification' in window;
      
      if (!isSupported) {
        setState(prev => ({ 
          ...prev, 
          isSupported: false, 
          isLoading: false,
          error: 'Push notifications não são suportadas neste navegador'
        }));
        return;
      }

      const permission = Notification.permission;
      
      // Verificar se já está inscrito
      try {
        const registration = await navigator.serviceWorker.ready;
        const subscription = await (registration as any).pushManager.getSubscription();
        
        setState(prev => ({
          ...prev,
          isSupported: true,
          isSubscribed: !!subscription,
          permission,
          isLoading: false
        }));
      } catch (error) {
        console.error('[Push] Erro ao verificar subscription:', error);
        setState(prev => ({
          ...prev,
          isSupported: true,
          permission,
          isLoading: false
        }));
      }
    };

    checkSupport();
  }, []);

  // Registrar service worker de push
  const registerServiceWorker = useCallback(async () => {
    try {
      const registration = await navigator.serviceWorker.register('/sw-push.js', {
        scope: '/'
      });
      
      console.log('[Push] Service Worker registrado:', registration);
      return registration;
    } catch (error) {
      console.error('[Push] Erro ao registrar Service Worker:', error);
      throw error;
    }
  }, []);

  // Converter VAPID key de base64 para Uint8Array
  const urlBase64ToUint8Array = (base64String: string): Uint8Array => {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
      .replace(/-/g, '+')
      .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  };

  // Solicitar permissão e inscrever
  const subscribe = useCallback(async () => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      // Solicitar permissão
      const permission = await Notification.requestPermission();
      
      if (permission !== 'granted') {
        setState(prev => ({ 
          ...prev, 
          permission, 
          isLoading: false,
          error: 'Permissão de notificações negada'
        }));
        return false;
      }

      // Registrar service worker
      await registerServiceWorker();
      const registration = await navigator.serviceWorker.ready;

      // Buscar VAPID public key
      const { data: vapidData, error: vapidError } = await supabase.functions.invoke('get-vapid-key');
      
      if (vapidError || !vapidData?.publicKey) {
        throw new Error('Não foi possível obter a chave VAPID');
      }

      const applicationServerKey = urlBase64ToUint8Array(vapidData.publicKey);

      // Criar subscription
      const subscription = await (registration as any).pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: applicationServerKey.buffer as ArrayBuffer
      });

      console.log('[Push] Subscription criada:', subscription);

      // Extrair dados da subscription
      const subscriptionJSON = subscription.toJSON();
      const p256dh = subscriptionJSON.keys?.p256dh;
      const auth = subscriptionJSON.keys?.auth;

      if (!p256dh || !auth) {
        throw new Error('Chaves de subscription inválidas');
      }

      // Salvar no backend
      const { error: saveError } = await supabase.functions.invoke('push-subscribe', {
        body: {
          endpoint: subscriptionJSON.endpoint,
          p256dh,
          auth,
          userId
        }
      });

      if (saveError) {
        throw saveError;
      }

      setState(prev => ({
        ...prev,
        isSubscribed: true,
        permission: 'granted',
        isLoading: false
      }));

      return true;
    } catch (error) {
      console.error('[Push] Erro ao inscrever:', error);
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Erro ao ativar notificações'
      }));
      return false;
    }
  }, [userId, registerServiceWorker]);

  // Cancelar inscrição
  const unsubscribe = useCallback(async () => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await (registration as any).pushManager.getSubscription();

      if (subscription) {
        // Remover do backend
        await supabase.functions.invoke('push-unsubscribe', {
          body: {
            endpoint: subscription.endpoint
          }
        });

        // Cancelar subscription local
        await subscription.unsubscribe();
      }

      setState(prev => ({
        ...prev,
        isSubscribed: false,
        isLoading: false
      }));

      return true;
    } catch (error) {
      console.error('[Push] Erro ao cancelar inscrição:', error);
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Erro ao desativar notificações'
      }));
      return false;
    }
  }, []);

  return {
    ...state,
    subscribe,
    unsubscribe
  };
}
