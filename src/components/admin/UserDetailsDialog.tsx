import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, TrendingUp, TrendingDown, Wallet, ArrowUpCircle, ArrowDownCircle, Calendar, DollarSign, Target, Trophy, XCircle } from "lucide-react";

interface User {
  id: string;
  user_id: string;
  full_name: string;
  document: string;
  phone: string | null;
  email: string | null;
  balance: number;
  demo_balance?: number;
  verification_status: string;
  created_at: string;
  avatar_url: string | null;
  is_admin: boolean;
  is_blocked: boolean;
  country_code: string | null;
  country_name: string | null;
  preferred_currency: string | null;
  total_deposited?: number;
}

interface UserStats {
  totalDeposits: number;
  totalWithdrawals: number;
  totalTrades: number;
  wonTrades: number;
  lostTrades: number;
  totalWinnings: number;
  totalLosses: number;
  netProfit: number;
}

interface Trade {
  id: string;
  amount: number;
  payout: number;
  result: number | null;
  status: string;
  trade_type: string;
  created_at: string;
  is_demo: boolean;
}

interface Transaction {
  id: string;
  amount: number;
  type: string;
  status: string;
  payment_method: string | null;
  created_at: string;
}

interface UserDetailsDialogProps {
  user: User | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function UserDetailsDialog({ user, open, onOpenChange }: UserDetailsDialogProps) {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  useEffect(() => {
    if (user && open) {
      fetchUserDetails();
    }
  }, [user, open]);

  const fetchUserDetails = async () => {
    if (!user) return;
    setLoading(true);

    try {
      // Fetch trades
      const { data: tradesData } = await supabase
        .from("trades")
        .select("*")
        .eq("user_id", user.user_id)
        .eq("is_demo", false)
        .order("created_at", { ascending: false })
        .limit(50);

      // Fetch transactions
      const { data: transactionsData } = await supabase
        .from("transactions")
        .select("*")
        .eq("user_id", user.user_id)
        .order("created_at", { ascending: false })
        .limit(50);

      // Calculate stats
      const completedTrades = tradesData?.filter(t => t.status === 'won' || t.status === 'lost') || [];
      const wonTrades = completedTrades.filter(t => t.status === 'won');
      const lostTrades = completedTrades.filter(t => t.status === 'lost');
      
      const totalWinnings = wonTrades.reduce((sum, t) => sum + (t.result || 0), 0);
      const totalLosses = Math.abs(lostTrades.reduce((sum, t) => sum + (t.result || 0), 0));

      const deposits = transactionsData?.filter(t => t.type === 'deposit' && t.status === 'completed') || [];
      const withdrawals = transactionsData?.filter(t => t.type === 'withdrawal' && t.status === 'completed') || [];

      setStats({
        totalDeposits: deposits.reduce((sum, t) => sum + t.amount, 0),
        totalWithdrawals: withdrawals.reduce((sum, t) => sum + t.amount, 0),
        totalTrades: completedTrades.length,
        wonTrades: wonTrades.length,
        lostTrades: lostTrades.length,
        totalWinnings,
        totalLosses,
        netProfit: totalWinnings - totalLosses,
      });

      setTrades(tradesData || []);
      setTransactions(transactionsData || []);
    } catch (error) {
      console.error("Error fetching user details:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (!user) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <Avatar className="h-10 w-10">
              <AvatarImage src={user.avatar_url || undefined} />
              <AvatarFallback>{user.full_name?.charAt(0)?.toUpperCase()}</AvatarFallback>
            </Avatar>
            <div>
              <span className="block">{user.full_name}</span>
              <span className="text-sm text-muted-foreground font-normal">{user.email}</span>
            </div>
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <Tabs defaultValue="overview" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="overview">Resumo</TabsTrigger>
              <TabsTrigger value="trades">Trades</TabsTrigger>
              <TabsTrigger value="transactions">Transações</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-4 mt-4">
              {/* User Info */}
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Cadastro:</span>
                  <span>{formatDate(user.created_at)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Wallet className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Saldo:</span>
                  <span className="font-semibold text-primary">{formatCurrency(user.balance || 0)}</span>
                </div>
                {user.phone && (
                  <div className="col-span-2 text-muted-foreground">
                    Tel: {user.phone}
                  </div>
                )}
                {user.country_name && (
                  <div className="col-span-2 text-muted-foreground">
                    País: {user.country_name}
                  </div>
                )}
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-3 text-center">
                  <ArrowUpCircle className="h-5 w-5 text-green-500 mx-auto mb-1" />
                  <p className="text-xs text-muted-foreground">Total Depositado</p>
                  <p className="font-bold text-green-500">{formatCurrency(stats?.totalDeposits || 0)}</p>
                </div>
                
                <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 text-center">
                  <ArrowDownCircle className="h-5 w-5 text-red-500 mx-auto mb-1" />
                  <p className="text-xs text-muted-foreground">Total Sacado</p>
                  <p className="font-bold text-red-500">{formatCurrency(stats?.totalWithdrawals || 0)}</p>
                </div>

                <div className="bg-primary/10 border border-primary/20 rounded-lg p-3 text-center">
                  <Trophy className="h-5 w-5 text-green-500 mx-auto mb-1" />
                  <p className="text-xs text-muted-foreground">Ganhos (Trades)</p>
                  <p className="font-bold text-green-500">{formatCurrency(stats?.totalWinnings || 0)}</p>
                </div>

                <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 text-center">
                  <XCircle className="h-5 w-5 text-red-500 mx-auto mb-1" />
                  <p className="text-xs text-muted-foreground">Perdas (Trades)</p>
                  <p className="font-bold text-red-500">{formatCurrency(stats?.totalLosses || 0)}</p>
                </div>
              </div>

              {/* Trade Stats */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-muted/50 rounded-lg p-3 text-center">
                  <Target className="h-5 w-5 text-muted-foreground mx-auto mb-1" />
                  <p className="text-xs text-muted-foreground">Total Trades</p>
                  <p className="font-bold text-lg">{stats?.totalTrades || 0}</p>
                </div>
                
                <div className="bg-muted/50 rounded-lg p-3 text-center">
                  <TrendingUp className="h-5 w-5 text-green-500 mx-auto mb-1" />
                  <p className="text-xs text-muted-foreground">Vitórias</p>
                  <p className="font-bold text-lg text-green-500">{stats?.wonTrades || 0}</p>
                </div>

                <div className="bg-muted/50 rounded-lg p-3 text-center">
                  <TrendingDown className="h-5 w-5 text-red-500 mx-auto mb-1" />
                  <p className="text-xs text-muted-foreground">Derrotas</p>
                  <p className="font-bold text-lg text-red-500">{stats?.lostTrades || 0}</p>
                </div>
              </div>

              {/* Win Rate */}
              {stats && stats.totalTrades > 0 && (
                <div className="bg-muted/30 rounded-lg p-4">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm text-muted-foreground">Taxa de Acerto</span>
                    <span className="font-bold">
                      {((stats.wonTrades / stats.totalTrades) * 100).toFixed(1)}%
                    </span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2">
                    <div 
                      className="bg-green-500 h-2 rounded-full transition-all"
                      style={{ width: `${(stats.wonTrades / stats.totalTrades) * 100}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Net Profit */}
              <div className={`rounded-lg p-4 text-center ${
                (stats?.netProfit || 0) >= 0 
                  ? 'bg-green-500/10 border border-green-500/30' 
                  : 'bg-red-500/10 border border-red-500/30'
              }`}>
                <DollarSign className={`h-6 w-6 mx-auto mb-1 ${
                  (stats?.netProfit || 0) >= 0 ? 'text-green-500' : 'text-red-500'
                }`} />
                <p className="text-sm text-muted-foreground">Lucro/Prejuízo Líquido (Trades)</p>
                <p className={`font-bold text-xl ${
                  (stats?.netProfit || 0) >= 0 ? 'text-green-500' : 'text-red-500'
                }`}>
                  {formatCurrency(stats?.netProfit || 0)}
                </p>
              </div>
            </TabsContent>

            <TabsContent value="trades" className="mt-4">
              <ScrollArea className="h-[400px]">
                {trades.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">Nenhum trade encontrado</p>
                ) : (
                  <div className="space-y-2">
                    {trades.map((trade) => (
                      <div 
                        key={trade.id} 
                        className={`flex items-center justify-between p-3 rounded-lg border ${
                          trade.status === 'won' 
                            ? 'bg-green-500/5 border-green-500/20' 
                            : trade.status === 'lost'
                            ? 'bg-red-500/5 border-red-500/20'
                            : 'bg-muted/30 border-border'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-full ${
                            trade.trade_type === 'call' ? 'bg-green-500/20' : 'bg-red-500/20'
                          }`}>
                            {trade.trade_type === 'call' 
                              ? <TrendingUp className="h-4 w-4 text-green-500" />
                              : <TrendingDown className="h-4 w-4 text-red-500" />
                            }
                          </div>
                          <div>
                            <p className="font-medium text-sm">
                              {trade.trade_type.toUpperCase()} - {formatCurrency(trade.amount)}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {formatDate(trade.created_at)}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <Badge variant={
                            trade.status === 'won' ? 'default' : 
                            trade.status === 'lost' ? 'destructive' : 
                            'secondary'
                          } className={trade.status === 'won' ? 'bg-green-500' : ''}>
                            {trade.status === 'won' ? 'Ganhou' : 
                             trade.status === 'lost' ? 'Perdeu' : 
                             trade.status === 'open' ? 'Aberto' : trade.status}
                          </Badge>
                          {trade.result !== null && (
                            <p className={`text-sm font-semibold mt-1 ${
                              trade.result > 0 ? 'text-green-500' : 'text-red-500'
                            }`}>
                              {trade.result > 0 ? '+' : ''}{formatCurrency(trade.result)}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </TabsContent>

            <TabsContent value="transactions" className="mt-4">
              <ScrollArea className="h-[400px]">
                {transactions.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">Nenhuma transação encontrada</p>
                ) : (
                  <div className="space-y-2">
                    {transactions.map((tx) => (
                      <div 
                        key={tx.id} 
                        className="flex items-center justify-between p-3 rounded-lg border bg-muted/30"
                      >
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-full ${
                            tx.type === 'deposit' ? 'bg-green-500/20' : 'bg-red-500/20'
                          }`}>
                            {tx.type === 'deposit' 
                              ? <ArrowUpCircle className="h-4 w-4 text-green-500" />
                              : <ArrowDownCircle className="h-4 w-4 text-red-500" />
                            }
                          </div>
                          <div>
                            <p className="font-medium text-sm">
                              {tx.type === 'deposit' ? 'Depósito' : 
                               tx.type === 'withdrawal' ? 'Saque' : tx.type}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {formatDate(tx.created_at)}
                              {tx.payment_method && ` • ${tx.payment_method}`}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <Badge variant={
                            tx.status === 'completed' ? 'default' : 
                            tx.status === 'pending' ? 'secondary' : 
                            'destructive'
                          } className={tx.status === 'completed' ? 'bg-green-500' : ''}>
                            {tx.status === 'completed' ? 'Completo' : 
                             tx.status === 'pending' ? 'Pendente' : 
                             tx.status === 'failed' ? 'Falhou' : tx.status}
                          </Badge>
                          <p className={`text-sm font-semibold mt-1 ${
                            tx.type === 'deposit' ? 'text-green-500' : 'text-red-500'
                          }`}>
                            {tx.type === 'deposit' ? '+' : '-'}{formatCurrency(tx.amount)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </TabsContent>
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  );
}
