import { useState, useEffect } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useTranslation } from "@/hooks/useTranslation";
import { ArrowUp, ArrowDown, Clock } from "lucide-react";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { useTradeContext } from "../context/TradeContext";

export const RecentTradesList = () => {
  const { t } = useTranslation();
  const { recentTrades, isLoadingHistory } = useTradeContext();
  const [currentTime, setCurrentTime] = useState(Date.now());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(Date.now());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'won': return 'text-success';
      case 'lost': return 'text-destructive';
      default: return 'text-muted-foreground';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'won': return t("won", "Ganhou");
      case 'lost': return t("lost", "Perdeu");
      default: return t("open", "Em aberto");
    }
  };

  const formatTimeRemaining = (expiresAt: string, status: string) => {
    if (status !== 'open') return null;
    
    const expiresAtMs = new Date(expiresAt).getTime();
    const remainingMs = Math.max(0, expiresAtMs - currentTime);
    
    if (remainingMs === 0) return t("processing", "Processando...");
    
    const totalSeconds = Math.floor(remainingMs / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  if (isLoadingHistory) {
    return <LoadingSpinner size="sm" className="h-32" />;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between px-4">
        <h3 className="font-medium">{t("recent_trades", "Operações Recentes")}</h3>
        <div className="bg-muted px-2 py-1 rounded text-xs">{recentTrades.length}</div>
      </div>

      <ScrollArea className="h-[400px]">
        <div className="space-y-2 px-4">
          {recentTrades.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              {t("no_recent_trades", "Nenhuma operação recente")}
            </div>
          ) : (
            recentTrades.map((trade) => (
              <div
                key={trade.id}
                className="bg-card rounded-lg p-4 space-y-2 border border-border hover:border-primary/50 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <img src={trade.assets?.icon_url} alt="" className="w-6 h-6" />
                    <span className="font-medium">{trade.assets?.name}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    {trade.trade_type === 'call' ? (
                      <ArrowUp className="w-4 h-4 text-success" />
                    ) : (
                      <ArrowDown className="w-4 h-4 text-destructive" />
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{t("investment", "Investimento")}:</span>
                  <span className="font-medium">R$ {trade.amount.toFixed(2)}</span>
                </div>

                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{t("potential_return", "Retorno")}:</span>
                  <span className={`font-medium ${getStatusColor(trade.status)}`}>
                    R$ {trade.payout.toFixed(2)}
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs pt-2 border-t border-border">
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <Clock className="w-3 h-3" />
                    {new Date(trade.created_at).toLocaleString('pt-BR', {
                      timeZone: 'America/Sao_Paulo',
                      hour: '2-digit',
                      minute: '2-digit',
                      second: '2-digit'
                    })}
                  </div>
                  <div className="flex items-center gap-2">
                    {trade.status === 'open' ? (
                      <>
                        {formatTimeRemaining(trade.expires_at, trade.status) && (
                          <div className="flex items-center gap-1 px-2 py-1 bg-primary/10 rounded text-primary font-mono font-bold">
                            <Clock className="w-3 h-3" />
                            {formatTimeRemaining(trade.expires_at, trade.status)}
                          </div>
                        )}
                        <span className={getStatusColor(trade.status)}>
                          {getStatusText(trade.status)}
                        </span>
                      </>
                    ) : (
                      <span className={`font-bold ${getStatusColor(trade.status)}`}>
                        {getStatusText(trade.status)}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
};
