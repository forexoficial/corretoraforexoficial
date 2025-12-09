import { useTranslation } from "@/hooks/useTranslation";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { RotateCcw, TrendingUp, Wallet } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useCurrency } from "@/hooks/useCurrency";

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
  const { formatBalance, symbol, currency } = useCurrency();
  
  const formatCompact = (value: number): string => {
    // Converter o saldo para a moeda atual antes de formatar
    const formattedFull = formatBalance(value);
    
    // Para valores grandes, usar formato compacto
    if (currency === 'BRL') {
      if (value >= 1000000) {
        return symbol + ' ' + (value / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
      }
      if (value >= 100000) {
        return symbol + ' ' + (value / 1000).toFixed(0) + 'k';
      }
    } else {
      // USD - valores já convertidos
      const convertedValue = parseFloat(formattedFull.replace(/[^0-9.-]+/g, ''));
      if (convertedValue >= 1000000) {
        return symbol + ' ' + (convertedValue / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
      }
      if (convertedValue >= 100000) {
        return symbol + ' ' + (convertedValue / 1000).toFixed(0) + 'k';
      }
    }
    return formattedFull;
  };
  
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
            {formatCompact(demoBalance)}
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
                  <p>{currency === 'BRL' ? t("reset_balance_brl", "Resetar saldo para R$ 10.000,00") : t("reset_balance_usd", "Reset balance to $10,000.00")}</p>
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
            {formatCompact(realBalance)}
          </div>
        </div>
      </div>

      {/* Info Banner */}
      <div className="p-3 rounded-lg bg-muted border border-border">
        <p className="text-xs text-muted-foreground leading-relaxed">
          {isDemoMode ? (
            <>
              💡 {currency === 'BRL' 
                ? t("demo_info", "Modo treino: Pratique suas estratégias com R$ 10.000 virtuais. Sem risco real.")
                : t("demo_info_usd", "Practice mode: Practice your strategies with $10,000 virtual. No real risk.")}
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
