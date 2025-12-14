import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Mail, MessageCircle, Send, Clock, Phone } from "lucide-react";
import { usePlatformSettings } from "@/hooks/usePlatformSettings";
import { useTranslation } from "@/hooks/useTranslation";

interface SupportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const SupportDialog = ({ open, onOpenChange }: SupportDialogProps) => {
  const { settings } = usePlatformSettings();
  const { t } = useTranslation();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md mobile-header-safe-offset">
        <DialogHeader>
          <DialogTitle>{t('customer_support')} - {settings.platform_name}</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="space-y-3">
            <Button 
              variant="outline" 
              className="w-full justify-start gap-3 h-12"
              onClick={() => {
                const phone = settings.support_phone.replace(/\D/g, '');
                window.open(`https://wa.me/${phone}`, '_blank');
              }}
            >
              <MessageCircle className="h-5 w-5 text-green-600" />
              <div className="text-left">
                <div className="font-semibold">{t('whatsapp')}</div>
                <div className="text-xs text-muted-foreground">{settings.support_phone}</div>
              </div>
            </Button>

            <Button 
              variant="outline" 
              className="w-full justify-start gap-3 h-12"
              onClick={() => {
                const phone = settings.support_phone.replace(/\D/g, '');
                window.open(`tel:${phone}`);
              }}
            >
              <Phone className="h-5 w-5 text-blue-500" />
              <div className="text-left">
                <div className="font-semibold">{t('phone')}</div>
                <div className="text-xs text-muted-foreground">{settings.support_phone}</div>
              </div>
            </Button>

            <Button 
              variant="outline" 
              className="w-full justify-start gap-3 h-12"
              onClick={() => window.location.href = `mailto:${settings.support_email}`}
            >
              <Mail className="h-5 w-5 text-red-500" />
              <div className="text-left">
                <div className="font-semibold">{t('email')}</div>
                <div className="text-xs text-muted-foreground">{settings.support_email}</div>
              </div>
            </Button>
          </div>

          <Separator />

          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="font-semibold">{t('business_hours')}</span>
            </div>
            <p className="text-muted-foreground">
              {t('weekday_hours')}<br />
              {t('saturday_hours')}<br />
              {t('sunday_closed')}
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
