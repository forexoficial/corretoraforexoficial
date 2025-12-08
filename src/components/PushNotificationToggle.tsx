import { Bell, BellOff, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from '@/hooks/useTranslation';

interface PushNotificationToggleProps {
  variant?: 'button' | 'switch';
  showLabel?: boolean;
}

export function PushNotificationToggle({ 
  variant = 'switch',
  showLabel = true 
}: PushNotificationToggleProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const {
    isSupported,
    isSubscribed,
    permission,
    isLoading,
    error,
    subscribe,
    unsubscribe
  } = usePushNotifications();

  const handleToggle = async () => {
    if (isSubscribed) {
      const success = await unsubscribe();
      if (success) {
        toast({
          title: t('notifications.disabled'),
          description: t('notifications.disabledDescription')
        });
      }
    } else {
      const success = await subscribe();
      if (success) {
        toast({
          title: t('notifications.enabled'),
          description: t('notifications.enabledDescription')
        });
      } else if (permission === 'denied') {
        toast({
          title: t('notifications.blocked'),
          description: t('notifications.blockedDescription'),
          variant: 'destructive'
        });
      }
    }
  };

  if (!isSupported) {
    return null;
  }

  if (variant === 'button') {
    return (
      <Button
        variant={isSubscribed ? 'default' : 'outline'}
        size="sm"
        onClick={handleToggle}
        disabled={isLoading || permission === 'denied'}
        className="gap-2"
      >
        {isLoading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : isSubscribed ? (
          <Bell className="h-4 w-4" />
        ) : (
          <BellOff className="h-4 w-4" />
        )}
        {showLabel && (
          <span>
            {isSubscribed ? t('notifications.active') : t('notifications.activate')}
          </span>
        )}
      </Button>
    );
  }

  return (
    <div className="flex items-center justify-between gap-4">
      {showLabel && (
        <div className="flex items-center gap-2">
          {isSubscribed ? (
            <Bell className="h-4 w-4 text-primary" />
          ) : (
            <BellOff className="h-4 w-4 text-muted-foreground" />
          )}
          <Label htmlFor="push-notifications" className="cursor-pointer">
            {t('notifications.pushNotifications')}
          </Label>
        </div>
      )}
      <div className="flex items-center gap-2">
        {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
        <Switch
          id="push-notifications"
          checked={isSubscribed}
          onCheckedChange={handleToggle}
          disabled={isLoading || permission === 'denied'}
        />
      </div>
    </div>
  );
}
