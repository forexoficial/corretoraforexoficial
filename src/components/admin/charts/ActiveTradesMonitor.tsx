import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Clock } from "lucide-react";

interface ActiveTradesMonitorProps {
  assetId: string;
}

export function ActiveTradesMonitor({ assetId }: ActiveTradesMonitorProps) {
  const [activeTrades, setActiveTrades] = useState<any[]>([]);
  const [stats, setStats] = useState({
    totalCall: 0,
    totalPut: 0,
    totalAmount: 0,
    totalPayout: 0
  });

  useEffect(() => {
    fetchActiveTrades();

    // Subscribe to trade updates
    const channel = supabase
      .channel('trades-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'trades',
          filter: `asset_id=eq.${assetId}`
        },
        () => {
          fetchActiveTrades();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [assetId]);

  const fetchActiveTrades = async () => {
    const { data, error } = await supabase
      .from('trades')
      .select(`
        *,
        profiles!inner(full_name, is_demo_mode)
      `)
      .eq('asset_id', assetId)
      .eq('status', 'open')
      .order('created_at', { ascending: false });

    if (error) {
      console.error("Error fetching trades:", error);
      return;
    }

    setActiveTrades(data || []);

    // Calculate stats
    const callTrades = data?.filter(t => t.trade_type === 'call') || [];
    const putTrades = data?.filter(t => t.trade_type === 'put') || [];
    const totalAmount = data?.reduce((sum, t) => sum + Number(t.amount), 0) || 0;
    const totalPayout = data?.reduce((sum, t) => sum + Number(t.payout), 0) || 0;

    setStats({
      totalCall: callTrades.length,
      totalPut: putTrades.length,
      totalAmount,
      totalPayout
    });
  };

  const getRemainingTime = (expiresAt: string) => {
    const now = new Date();
    const expiry = new Date(expiresAt);
    const diffMs = expiry.getTime() - now.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffSecs = Math.floor((diffMs % 60000) / 1000);
    
    if (diffMs < 0) return 'Expirado';
    if (diffMins > 0) return `${diffMins}m ${diffSecs}s`;
    return `${diffSecs}s`;
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Operações Ativas</h3>

      {/* Stats Summary */}
      <div className="grid grid-cols-2 gap-2">
        <Card className="p-3">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-success" />
            <div>
              <div className="text-xs text-muted-foreground">Call</div>
              <div className="text-lg font-bold">{stats.totalCall}</div>
            </div>
          </div>
        </Card>
        <Card className="p-3">
          <div className="flex items-center gap-2">
            <TrendingDown className="w-4 h-4 text-destructive" />
            <div>
              <div className="text-xs text-muted-foreground">Put</div>
              <div className="text-lg font-bold">{stats.totalPut}</div>
            </div>
          </div>
        </Card>
        <Card className="p-3 col-span-2">
          <div className="text-xs text-muted-foreground">Volume Total</div>
          <div className="text-lg font-bold">
            R$ {stats.totalAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            Payout: R$ {stats.totalPayout.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </div>
        </Card>
      </div>

      {/* Active Trades List */}
      <div className="space-y-2 max-h-96 overflow-y-auto">
        {activeTrades.length === 0 ? (
          <p className="text-muted-foreground text-center py-4 text-sm">
            Nenhuma operação ativa
          </p>
        ) : (
          activeTrades.map((trade) => (
            <Card key={trade.id} className="p-3">
              <div className="flex justify-between items-start mb-2">
                <div className="flex items-center gap-2">
                  <Badge variant={trade.trade_type === 'call' ? 'default' : 'destructive'}>
                    {trade.trade_type === 'call' ? '⬆️' : '⬇️'} {trade.trade_type.toUpperCase()}
                  </Badge>
                  {trade.is_demo && (
                    <Badge variant="outline" className="text-xs">
                      Demo
                    </Badge>
                  )}
                </div>
                <div className="text-right">
                  <div className="text-sm font-bold">
                    R$ {Number(trade.amount).toFixed(2)}
                  </div>
                  <div className="text-xs text-success">
                    +R$ {(Number(trade.payout) - Number(trade.amount)).toFixed(2)}
                  </div>
                </div>
              </div>

              <div className="text-xs text-muted-foreground space-y-1">
                <div className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {getRemainingTime(trade.expires_at)}
                </div>
                <div>
                  {(trade as any).profiles?.full_name || 'Usuário'}
                </div>
                <div className="font-mono">
                  {new Date(trade.created_at).toLocaleString('pt-BR', {
                    timeZone: 'America/Sao_Paulo',
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit'
                  })}
                </div>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}