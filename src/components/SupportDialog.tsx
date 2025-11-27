import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Mail, MessageCircle, Send, Clock, Phone } from "lucide-react";
import { usePlatformSettings } from "@/hooks/usePlatformSettings";

interface SupportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const SupportDialog = ({ open, onOpenChange }: SupportDialogProps) => {
  const { settings } = usePlatformSettings();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Suporte ao Cliente - {settings.platform_name}</DialogTitle>
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
                <div className="font-semibold">WhatsApp</div>
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
                <div className="font-semibold">Telefone</div>
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
                <div className="font-semibold">Email</div>
                <div className="text-xs text-muted-foreground">{settings.support_email}</div>
              </div>
            </Button>
          </div>

          <Separator />

          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="font-semibold">Horário de Atendimento</span>
            </div>
            <p className="text-muted-foreground">
              Segunda a Sexta: 9h às 18h (Horário de Brasília)<br />
              Sábados: 9h às 13h<br />
              Domingos e Feriados: Fechado
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
