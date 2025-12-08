import { usePWAInstallNotification } from '@/hooks/usePWAInstallNotification';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Bell } from 'lucide-react';

/**
 * Component that shows an automatic prompt to enable push notifications
 * when the PWA is installed.
 */
export function PWANotificationInit() {
  const { showPrompt, handleAcceptNotifications, handleDeclineNotifications } = usePWAInstallNotification();

  return (
    <AlertDialog open={showPrompt}>
      <AlertDialogContent className="max-w-[90vw] sm:max-w-md">
        <AlertDialogHeader>
          <div className="flex items-center justify-center mb-4">
            <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
              <Bell className="h-8 w-8 text-primary animate-pulse" />
            </div>
          </div>
          <AlertDialogTitle className="text-center text-lg">
            Ativar Notificações?
          </AlertDialogTitle>
          <AlertDialogDescription className="text-center text-sm">
            Receba alertas em tempo real sobre suas operações, resultados de trades, 
            promoções exclusivas e atualizações importantes.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex-col gap-2 sm:flex-row">
          <AlertDialogCancel 
            onClick={handleDeclineNotifications}
            className="w-full sm:w-auto"
          >
            Agora não
          </AlertDialogCancel>
          <AlertDialogAction 
            onClick={handleAcceptNotifications}
            className="w-full sm:w-auto"
          >
            <Bell className="h-4 w-4 mr-2" />
            Ativar Notificações
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
