import { useState } from "react";
import { TrendingUp, TrendingDown } from "lucide-react";
import { useTranslation } from "@/hooks/useTranslation";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { useIsMobile } from "@/hooks/use-mobile";
import { useTradeHistory } from "../hooks/useTradeHistory";
import { supabase } from "@/integrations/supabase/client";
import { useEffect } from "react";
import type { Trade } from "../types/trade.types";

interface TradeHistoryListProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const TradeHistoryList = ({ open, onOpenChange }: TradeHistoryListProps) => {
  const { t } = useTranslation();
  const [filter, setFilter] = useState<'all' | 'won' | 'lost'>('all');
  const [userId, setUserId] = useState<string>();
  const isMobile = useIsMobile();

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setUserId(user.id);
    });
  }, []);

  const { trades, isLoading } = useTradeHistory(userId, {
    status: filter,
    limit: 20,
  });

  const formatTime = (date: string) => {
    return format(new Date(date), "HH:mm", { locale: ptBR });
  };

  const formatDate = (date: string) => {
    return format(new Date(date), "d MMM", { locale: ptBR });
  };

  const formatResult = (trade: Trade) => {
    if (trade.result === null) return t("pending", "Pendente");
    
    const isWin = trade.result > 0;
    const displayAmount = Math.abs(trade.result);
    const percentage = ((displayAmount / trade.amount) * 100).toFixed(0);
    const sign = isWin ? "+" : "-";
    
    let priceInfo = '';
    if (trade.entry_price && trade.exit_price) {
      const priceDiff = ((trade.exit_price - trade.entry_price) / trade.entry_price * 100).toFixed(2);
      priceInfo = ` | ${trade.entry_price.toFixed(2)} → ${trade.exit_price.toFixed(2)} (${Number(priceDiff) > 0 ? '+' : ''}${priceDiff}%)`;
    }
    
    return `${sign}R$ ${displayAmount.toFixed(2)} (${sign}${percentage}%)${priceInfo}`;
  };

  const getResultColor = (result: number | null) => {
    if (result === null) return "text-muted-foreground";
    return result > 0 ? "text-green-500" : "text-red-500";
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:w-[350px] p-0 bg-card">
        <SheetHeader className="border-b border-border p-4 pb-3">
          <SheetTitle className="text-base font-semibold">{t("trade_history", "Histórico de trading")}</SheetTitle>
        </SheetHeader>

        <div className="p-4 space-y-4">
          <Select value={filter} onValueChange={(val) => setFilter(val as any)}>
            <SelectTrigger className="w-full bg-background">
              <SelectValue placeholder={t("all_positions", "Todas as posições")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("all_positions", "Todas as posições")}</SelectItem>
              <SelectItem value="won">{t("won_positions", "Ganhas")}</SelectItem>
              <SelectItem value="lost">{t("lost_positions", "Perdidas")}</SelectItem>
            </SelectContent>
          </Select>

          <div className={`space-y-2 overflow-y-auto ${isMobile ? 'max-h-[calc(100vh-280px)]' : 'max-h-[calc(100vh-180px)]'}`}>
            {isLoading ? (
              <LoadingSpinner size="sm" className="py-8" />
            ) : trades.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-sm">
                {t("no_trades_found", "Nenhuma operação encontrada")}
              </div>
            ) : (
              trades.map((trade) => (
                <div
                  key={trade.id}
                  className="bg-background rounded-lg p-3 space-y-2 hover:bg-accent/5 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <div className="flex flex-col text-xs">
                        <span className="font-semibold">{formatTime(trade.created_at)}</span>
                        <span className="text-muted-foreground">{formatDate(trade.created_at)}</span>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        {trade.assets?.icon_url ? (
                          <img 
                            src={trade.assets.icon_url} 
                            alt={trade.assets.name}
                            className="w-5 h-5 rounded-full"
                          />
                        ) : (
                          <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold">
                            {trade.assets?.symbol.charAt(0)}
                          </div>
                        )}
                        <span className="text-sm font-medium">{trade.assets?.name}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      {trade.trade_type === "call" ? (
                        <TrendingUp className="h-4 w-4 text-green-500" />
                      ) : (
                        <TrendingDown className="h-4 w-4 text-red-500" />
                      )}
                      <span className="text-sm font-semibold">
                        R$ {trade.amount.toFixed(2)}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">
                      {trade.duration_minutes} min
                    </span>
                    <span className={`font-semibold text-xs ${getResultColor(trade.result)}`}>
                      {formatResult(trade)}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>

          {isMobile && (
            <div className="pt-4 border-t border-border">
              <Button 
                onClick={() => onOpenChange(false)}
                className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
                size="lg"
              >
                {t("back_to_trading", "Voltar a Negociar")}
              </Button>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
};
