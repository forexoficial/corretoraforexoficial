import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { Sparkles, TrendingUp, Shield, Zap } from "lucide-react";

interface FirstDepositDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function FirstDepositDialog({ open, onOpenChange }: FirstDepositDialogProps) {
  const navigate = useNavigate();

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
              <div className="relative w-16 h-16 rounded-full bg-gradient-to-br from-success via-success to-success/80 flex items-center justify-center">
                <Sparkles className="w-8 h-8 text-success-foreground" />
              </div>
            </div>
          </div>
          <DialogTitle className="text-center text-2xl">
            Pronto para começar?
          </DialogTitle>
          <DialogDescription className="text-center text-base">
            Você ativou sua conta real! Faça seu primeiro depósito e comece a operar com dinheiro de verdade.
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
                <p className="text-sm font-semibold">Opere com valores reais</p>
                <p className="text-xs text-muted-foreground">
                  Transforme suas estratégias em lucros reais
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
              <div className="p-2 rounded-full bg-primary/10">
                <Zap className="w-4 h-4 text-primary" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold">Depósito instantâneo</p>
                <p className="text-xs text-muted-foreground">
                  Via PIX, seu saldo é creditado na hora
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
              <div className="p-2 rounded-full bg-accent/10">
                <Shield className="w-4 h-4 text-accent" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold">100% seguro</p>
                <p className="text-xs text-muted-foreground">
                  Plataforma regulamentada e criptografada
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
            Fazer Primeiro Depósito
          </Button>
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            className="w-full"
          >
            Agora não
          </Button>
        </div>

        <p className="text-center text-xs text-muted-foreground mt-2">
          Você pode fazer seu primeiro depósito a qualquer momento
        </p>
      </DialogContent>
    </Dialog>
  );
}
