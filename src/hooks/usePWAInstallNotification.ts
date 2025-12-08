import { useEffect, useRef } from 'react';
import { usePushNotifications } from './usePushNotifications';

/**
 * Hook that automatically requests push notification permissions
 * when the PWA is installed or when running in standalone mode
 */
export function usePWAInstallNotification() {
  const { isSupported, isSubscribed, subscribe, permission } = usePushNotifications();
  const hasRequestedRef = useRef(false);

  useEffect(() => {
    // Check if running as installed PWA (standalone mode)
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches ||
                         (window.navigator as any).standalone === true;

    // Only proceed if:
    // 1. Running as PWA (standalone)
    // 2. Push notifications are supported
    // 3. Not already subscribed
    // 4. Haven't already requested this session
    // 5. Permission is not denied
    if (
      isStandalone &&
      isSupported &&
      !isSubscribed &&
      !hasRequestedRef.current &&
      permission !== 'denied'
    ) {
      hasRequestedRef.current = true;
      
      // Small delay to ensure app is fully loaded
      const timer = setTimeout(() => {
        console.log('[PWA] Requesting push notification permission automatically...');
        subscribe();
      }, 1500);

      return () => clearTimeout(timer);
    }
  }, [isSupported, isSubscribed, subscribe, permission]);

  // Also listen for the appinstalled event (triggered when PWA is installed)
  useEffect(() => {
    const handleAppInstalled = () => {
      console.log('[PWA] App installed event detected');
      
      if (isSupported && !isSubscribed && !hasRequestedRef.current && permission !== 'denied') {
        hasRequestedRef.current = true;
        
        // Request permission after installation
        setTimeout(() => {
          console.log('[PWA] Requesting push notification permission after install...');
          subscribe();
        }, 2000);
      }
    };

    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, [isSupported, isSubscribed, subscribe, permission]);
}
