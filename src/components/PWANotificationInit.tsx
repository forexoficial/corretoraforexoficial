import { usePWAInstallNotification } from '@/hooks/usePWAInstallNotification';

/**
 * Component that initializes automatic push notification permission request
 * when the PWA is installed. This component renders nothing visually.
 */
export function PWANotificationInit() {
  usePWAInstallNotification();
  return null;
}
