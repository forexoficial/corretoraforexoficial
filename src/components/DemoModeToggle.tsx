import { useTranslation } from "@/hooks/useTranslation";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { RotateCcw, TrendingUp, Wallet } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { formatCurrencyCompact } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

interface DemoModeToggleProps {
  isDemoMode: boolean;
  onToggle: () => void;
  onReset: () => void;
  demoBalance: number;
  realBalance: number;
}

export default function DemoModeToggle({
  isDemoMode,
  onToggle,
  onReset,
  demoBalance,
  realBalance,
}: DemoModeToggleProps) {
  const { t } = useTranslation();
  
  return (
    <div className="space-y-3">
      {/* Balance Cards */}
      <div className="grid grid-cols-2 gap-3">
        {/* Demo Balance */}
        <div className={`p-3 rounded-lg border transition-all ${
          isDemoMode 
            ? 'border-primary bg-primary/10 ring-2 ring-primary/20' 
            : 'border-border bg-card'
        }`}>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-primary" />
              <span className="text-xs font-semibold text-foreground">{t("demo_mode", "Demo")}</span>
            </div>
            <Switch
              id="demo-mode"
              checked={isDemoMode}
              onCheckedChange={onToggle}
              className="scale-75"
            />
          </div>
          <div className="font-bold text-base text-foreground">
            R$ {formatCurrencyCompact(demoBalance)}
          </div>
          {isDemoMode && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={onReset}
                    className="mt-2 w-full h-7 text-xs text-foreground hover:bg-accent hover:text-accent-foreground"
                  >
                    <RotateCcw className="h-3 w-3 mr-1" />
                    {t("reset", "Resetar")}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{t("reset_balance", "Resetar saldo para R$ 10.000,00")}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>

        {/* Real Balance */}
        <div className={`p-3 rounded-lg border transition-all ${
          !isDemoMode 
            ? 'border-success bg-success/10 ring-2 ring-success/20' 
            : 'border-border bg-card'
        }`}>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Wallet className={`w-4 h-4 ${!isDemoMode ? 'text-success' : 'text-muted-foreground'}`} />
              <span className="text-xs font-semibold text-foreground">{t("real_mode", "Real")}</span>
            </div>
            <Switch
              id="real-mode"
              checked={!isDemoMode}
              onCheckedChange={onToggle}
              className="scale-75"
            />
          </div>
          <div className={`font-bold text-base ${!isDemoMode ? 'text-success' : 'text-foreground'}`}>
            R$ {formatCurrencyCompact(realBalance)}
          </div>
        </div>
      </div>

      {/* Info Banner */}
      <div className="p-3 rounded-lg bg-muted border border-border">
        <p className="text-xs text-muted-foreground leading-relaxed">
          {isDemoMode ? (
            <>
              💡 {t("demo_info", "Modo treino: Pratique suas estratégias com R$ 10.000 virtuais. Sem risco real.")}
            </>
          ) : (
            <>
              ⚡ {t("real_info", "Modo real: Suas operações afetam seu saldo real. Depósitos e saques disponíveis.")}
            </>
          )}
        </p>
      </div>
    </div>
  );
}
