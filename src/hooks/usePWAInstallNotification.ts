import { useEffect, useRef, useState } from 'react';
import { usePushNotifications } from './usePushNotifications';
import { toast } from 'sonner';

/**
 * Hook that automatically requests push notification permissions
 * when the PWA is installed or when running in standalone mode
 */
export function usePWAInstallNotification() {
  const { isSupported, isSubscribed, subscribe, permission, isLoading } = usePushNotifications();
  const hasRequestedRef = useRef(false);
  const [showPrompt, setShowPrompt] = useState(false);

  // Check if this is a first-time PWA install
  useEffect(() => {
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches ||
                         (window.navigator as any).standalone === true;

    // Check if we've already prompted in this PWA install
    const hasPrompted = localStorage.getItem('pwa_notification_prompted');

    if (
      isStandalone &&
      isSupported &&
      !isSubscribed &&
      !hasRequestedRef.current &&
      !hasPrompted &&
      permission !== 'denied' &&
      !isLoading
    ) {
      hasRequestedRef.current = true;
      
      // Show prompt after a delay to let the app load
      const timer = setTimeout(() => {
        console.log('[PWA] Showing notification permission prompt...');
        setShowPrompt(true);
      }, 2000);

      return () => clearTimeout(timer);
    }
  }, [isSupported, isSubscribed, permission, isLoading]);

  // Handle the appinstalled event
  useEffect(() => {
    const handleAppInstalled = () => {
      console.log('[PWA] App installed event detected');
      
      const hasPrompted = localStorage.getItem('pwa_notification_prompted');
      
      if (isSupported && !isSubscribed && !hasRequestedRef.current && !hasPrompted && permission !== 'denied') {
        hasRequestedRef.current = true;
        
        setTimeout(() => {
          console.log('[PWA] Showing notification prompt after install...');
          setShowPrompt(true);
        }, 2500);
      }
    };

    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, [isSupported, isSubscribed, permission]);

  // Handle user response to prompt
  const handleAcceptNotifications = async () => {
    setShowPrompt(false);
    localStorage.setItem('pwa_notification_prompted', 'true');
    
    const success = await subscribe();
    
    if (success) {
      toast.success('Notificações ativadas!', {
        description: 'Você receberá alertas importantes sobre suas operações.',
        duration: 4000
      });
    } else {
      toast.error('Não foi possível ativar notificações', {
        description: 'Você pode ativar depois nas configurações.',
        duration: 4000
      });
    }
  };

  const handleDeclineNotifications = () => {
    setShowPrompt(false);
    localStorage.setItem('pwa_notification_prompted', 'true');
    toast.info('Você pode ativar notificações depois no seu perfil.', {
      duration: 3000
    });
  };

  return {
    showPrompt,
    handleAcceptNotifications,
    handleDeclineNotifications
  };
}
