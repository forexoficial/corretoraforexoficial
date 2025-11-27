import { useEffect, useState, useMemo, useCallback, memo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ArrowUp, ArrowDown, Clock } from "lucide-react";
import { toast } from "sonner";
import { LoadingSpinner } from "@/components/LoadingSpinner";

interface Trade {
  id: string;
  asset_id: string;
  trade_type: string;
  amount: number;
  payout: number;
  status: string;
  created_at: string;
  expires_at: string;
  assets: {
    name: string;
    icon_url: string;
  };
}

// Memoizar componente individual de trade
const TradeItem = memo(({ 
  trade, 
  currentTime,
  getStatusColor,
  getStatusText,
  formatTimeRemaining
}: { 
  trade: Trade;
  currentTime: number;
  getStatusColor: (status: string) => string;
  getStatusText: (status: string) => string;
  formatTimeRemaining: (expiresAt: string, status: string) => string | null;
}) => (
  <div className="bg-card rounded-lg p-4 space-y-2 border border-border hover:border-primary/50 transition-colors">
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <img src={trade.assets.icon_url} alt="" className="w-6 h-6" />
        <span className="font-medium">{trade.assets.name}</span>
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
      <span className="text-muted-foreground">Investimento:</span>
      <span className="font-medium">R$ {trade.amount.toFixed(2)}</span>
    </div>

    <div className="flex items-center justify-between text-sm">
      <span className="text-muted-foreground">Retorno:</span>
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
));

TradeItem.displayName = 'TradeItem';

export const TradesList = () => {
  const [trades, setTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(Date.now());

  // Memoizar funções de formatação
  const getStatusColor = useCallback((status: string) => {
    switch (status) {
      case 'won': return 'text-success';
      case 'lost': return 'text-destructive';
      default: return 'text-muted-foreground';
    }
  }, []);

  const getStatusText = useCallback((status: string) => {
    switch (status) {
      case 'won': return 'Ganhou';
      case 'lost': return 'Perdeu';
      default: return 'Em aberto';
    }
  }, []);

  const formatTimeRemaining = useCallback((expiresAt: string, status: string) => {
    // Se a operação não está mais aberta, não mostrar contador
    if (status !== 'open') {
      return null;
    }
    
    const expiresAtMs = new Date(expiresAt).getTime();
    const remainingMs = Math.max(0, expiresAtMs - currentTime);
    
    if (remainingMs === 0) {
      return 'Processando...';
    }
    
    const totalSeconds = Math.floor(remainingMs / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }, [currentTime]);

  const loadTrades = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      setLoading(false);
      return;
    }

    // Load both open trades and recently closed trades (last 5 minutes)
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();

    const { data, error } = await supabase
      .from('trades')
      .select(`
        *,
        assets (
          name,
          icon_url
        )
      `)
      .eq('user_id', user.id)
      .or(`status.eq.open,and(status.in.(won,lost),closed_at.gte.${fiveMinutesAgo})`)
      .order('created_at', { ascending: false });

    if (error) {
      toast.error("Erro ao carregar operações");
      console.error(error);
    } else {
      setTrades(data || []);
    }
    
    setLoading(false);
  }, []);

  useEffect(() => {
    loadTrades();
    
    // Subscribe to real-time updates
    const channel = supabase
      .channel('trades-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'trades'
        },
        () => {
          loadTrades();
        }
      )
      .subscribe();

    // Listen for custom trade-created event
    const handleTradeCreated = () => {
      console.log('[TradesList] Trade criado, recarregando lista...');
      loadTrades();
    };

    window.addEventListener('trade-created', handleTradeCreated);

    // Update current time every second for countdown
    const timer = setInterval(() => {
      setCurrentTime(Date.now());
    }, 1000);

    return () => {
      supabase.removeChannel(channel);
      window.removeEventListener('trade-created', handleTradeCreated);
      clearInterval(timer);
    };
  }, [loadTrades]);

  if (loading) {
    return <LoadingSpinner size="sm" className="h-32" />;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between px-4">
        <h3 className="font-medium">Operações Recentes</h3>
        <div className="bg-muted px-2 py-1 rounded text-xs">{trades.length}</div>
      </div>

      <ScrollArea className="h-[400px]">
        <div className="space-y-2 px-4">
          {trades.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              Nenhuma operação recente
            </div>
          ) : (
            trades.map((trade) => (
              <TradeItem
                key={trade.id}
                trade={trade}
                currentTime={currentTime}
                getStatusColor={getStatusColor}
                getStatusText={getStatusText}
                formatTimeRemaining={formatTimeRemaining}
              />
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
};
