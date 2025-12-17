import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { TrendingUp, Shield, Zap } from "lucide-react";
import { useTranslation } from "@/hooks/useTranslation";
import { usePlatformCustomization } from "@/contexts/PlatformCustomizationContext";

interface FirstDepositDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function FirstDepositDialog({ open, onOpenChange }: FirstDepositDialogProps) {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { customization } = usePlatformCustomization();

  const handleDeposit = () => {
    onOpenChange(false);
    navigate('/deposit');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center justify-center mb-4">
            <div className="relative">
              <div className="absolute inset-0 rounded-full bg-success/20 blur-xl animate-pulse" />
              <div className="relative w-16 h-16 rounded-full bg-gradient-to-br from-success via-success to-success/80 flex items-center justify-center overflow-hidden">
                {customization.currentLogo ? (
                  <img 
                    src={customization.currentLogo} 
                    alt="Logo" 
                    className="w-10 h-10 object-contain"
                  />
                ) : (
                  <span className="text-2xl font-bold text-success-foreground">$</span>
                )}
              </div>
            </div>
          </div>
          <DialogTitle className="text-center text-2xl">
            {t('ready_to_start')}
          </DialogTitle>
          <DialogDescription className="text-center text-base">
            {t('activated_real_account')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-4">
          {/* Benefits */}
          <div className="space-y-3">
            <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
              <div className="p-2 rounded-full bg-success/10">
                <TrendingUp className="w-4 h-4 text-success" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold">{t('operate_real_values')}</p>
                <p className="text-xs text-muted-foreground">
                  {t('transform_strategies')}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
              <div className="p-2 rounded-full bg-primary/10">
                <Zap className="w-4 h-4 text-primary" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold">{t('instant_deposit')}</p>
                <p className="text-xs text-muted-foreground">
                  {t('pix_instant_credit')}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
              <div className="p-2 rounded-full bg-accent/10">
                <Shield className="w-4 h-4 text-accent" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold">{t('secure_100')}</p>
                <p className="text-xs text-muted-foreground">
                  {t('regulated_platform')}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <Button
            onClick={handleDeposit}
            className="w-full bg-success hover:bg-success/90"
            size="lg"
          >
            {t('make_first_deposit')}
          </Button>
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            className="w-full"
          >
            {t('not_now')}
          </Button>
        </div>

        <p className="text-center text-xs text-muted-foreground mt-2">
          {t('deposit_anytime')}
        </p>
      </DialogContent>
    </Dialog>
  );
}
