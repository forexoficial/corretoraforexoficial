import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { 
  ArrowLeft, 
  RefreshCw, 
  PlayCircle, 
  CheckCircle2, 
  XCircle, 
  Clock,
  TrendingUp,
  TrendingDown,
  Activity,
  DollarSign,
  Users,
  AlertTriangle,
  CheckCircle,
  Timer
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface TradeStats {
  total_open: number;
  total_closed: number;
  total_won: number;
  total_lost: number;
  total_volume: number;
  total_profit: number;
  expired_pending: number;
}

interface Trade {
  id: string;
  user_id: string;
  asset_id: string;
  trade_type: 'call' | 'put';
  amount: number;
  entry_price: number | null;
  status: string;
  result: number | null;
  created_at: string;
  expires_at: string;
  closed_at: string | null;
  duration_minutes: number;
  is_demo: boolean;
  assets?: {
    name: string;
    symbol: string;
  };
  profiles?: {
    full_name: string;
    document: string;
  };
}

interface CronJob {
  jobname: string;
  active: boolean;
  schedule: string;
}

export default function AdminTradeManagement() {
  const navigate = useNavigate();
  const [stats, setStats] = useState<TradeStats>({
    total_open: 0,
    total_closed: 0,
    total_won: 0,
    total_lost: 0,
    total_volume: 0,
    total_profit: 0,
    expired_pending: 0
  });
  const [trades, setTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [cronStatus, setCronStatus] = useState<CronJob | null>(null);
  const [selectedTab, setSelectedTab] = useState("overview");

  useEffect(() => {
    loadData();
    checkCronStatus();
  }, []);

  const loadData = async () => {
    setLoading(true);
    await Promise.all([
      loadStats(),
      loadTrades()
    ]);
    setLoading(false);
  };

  const loadStats = async () => {
    try {
      // Get all trades
      const { data: allTrades, error } = await supabase
        .from('trades')
        .select('*');

      if (error) throw error;

      const now = new Date();
      const stats: TradeStats = {
        total_open: allTrades?.filter(t => t.status === 'open').length || 0,
        total_closed: allTrades?.filter(t => t.status !== 'open').length || 0,
        total_won: allTrades?.filter(t => t.status === 'won').length || 0,
        total_lost: allTrades?.filter(t => t.status === 'lost').length || 0,
        total_volume: allTrades?.reduce((sum, t) => sum + Number(t.amount), 0) || 0,
        total_profit: allTrades?.filter(t => t.result).reduce((sum, t) => sum + Number(t.result), 0) || 0,
        expired_pending: allTrades?.filter(t => 
          t.status === 'open' && new Date(t.expires_at) < now
        ).length || 0
      };

      setStats(stats);
    } catch (error) {
      console.error('Error loading stats:', error);
      toast.error('Erro ao carregar estatísticas');
    }
  };

  const loadTrades = async () => {
    try {
      // Get trades with assets
      const { data: tradesData, error: tradesError } = await supabase
        .from('trades')
        .select('*, assets (name, symbol)')
        .order('created_at', { ascending: false })
        .limit(100);

      if (tradesError) throw tradesError;

      if (!tradesData) {
        setTrades([]);
        return;
      }

      // Get unique user IDs
      const userIds = [...new Set(tradesData.map(t => t.user_id))];

      // Get profiles for these users
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('user_id, full_name, document')
        .in('user_id', userIds);

      // Create a map of profiles by user_id
      const profilesMap = new Map(
        (profilesData || []).map(p => [p.user_id, p])
      );

      // Combine trades with profiles
      const tradesWithProfiles = tradesData.map(trade => ({
        ...trade,
        profiles: profilesMap.get(trade.user_id)
      })) as Trade[];

      setTrades(tradesWithProfiles);
    } catch (error) {
      console.error('Error loading trades:', error);
      toast.error('Erro ao carregar operações');
    }
  };

  const checkCronStatus = async () => {
    try {
      const { data, error } = await supabase.rpc('has_role', {
        _user_id: (await supabase.auth.getUser()).data.user?.id,
        _role: 'admin'
      });

      if (!data) return;

      // Note: Cannot query pg_cron directly, this is just for display
      // In production, you'd need to check via SQL query or logs
      setCronStatus({
        jobname: 'process-expired-trades-every-minute',
        active: true,
        schedule: '* * * * *'
      });
    } catch (error) {
      console.error('Error checking cron status:', error);
    }
  };

  const processExpiredTrades = async () => {
    setProcessing(true);
    try {
      const { data, error } = await supabase.functions.invoke('process-expired-trades');

      if (error) throw error;

      toast.success(`${data.processed} operações processadas com sucesso!`);
      await loadData();
    } catch (error: any) {
      console.error('Error processing trades:', error);
      toast.error('Erro ao processar operações: ' + error.message);
    } finally {
      setProcessing(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: any; icon: any; label: string }> = {
      open: { variant: "default", icon: Clock, label: "Aberta" },
      won: { variant: "default", icon: CheckCircle2, label: "Ganhou" },
      lost: { variant: "destructive", icon: XCircle, label: "Perdeu" }
    };

    const config = variants[status] || variants.open;
    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className="gap-1">
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    );
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleString('pt-BR', {
      timeZone: 'America/Sao_Paulo',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const openTrades = trades.filter(t => t.status === 'open');
  const closedTrades = trades.filter(t => t.status !== 'open');
  const expiredTrades = trades.filter(t => 
    t.status === 'open' && new Date(t.expires_at) < new Date()
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/admin')}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Gerenciamento de Trades</h1>
            <p className="text-muted-foreground">
              Monitore e gerencie todas as operações de trading
            </p>
          </div>
        </div>
        <Button onClick={loadData} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Atualizar
        </Button>
      </div>

      {/* Cron Status Alert */}
      {stats.expired_pending > 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Trades Expiradas Pendentes</AlertTitle>
          <AlertDescription className="flex items-center justify-between">
            <span>
              Existem {stats.expired_pending} operações expiradas aguardando processamento.
            </span>
            <Button
              size="sm"
              onClick={processExpiredTrades}
              disabled={processing}
            >
              {processing ? (
                <>
                  <RefreshCw className="h-3 w-3 mr-2 animate-spin" />
                  Processando...
                </>
              ) : (
                <>
                  <PlayCircle className="h-3 w-3 mr-2" />
                  Processar Agora
                </>
              )}
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {cronStatus && (
        <Alert>
          <CheckCircle className="h-4 w-4" />
          <AlertTitle>Cron Job Ativo</AlertTitle>
          <AlertDescription>
            O processamento automático está {cronStatus.active ? 'ativo' : 'inativo'} e roda {cronStatus.schedule}
          </AlertDescription>
        </Alert>
      )}

      {!cronStatus && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Cron Job Não Configurado</AlertTitle>
          <AlertDescription>
            O processamento automático de trades não está configurado. 
            Consulte a documentação em docs/CRON-SETUP-TRADES.md
          </AlertDescription>
        </Alert>
      )}

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Trades Abertas</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total_open}</div>
            <p className="text-xs text-muted-foreground">
              Aguardando expiração
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Taxa de Vitória</CardTitle>
            <TrendingUp className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.total_closed > 0 
                ? ((stats.total_won / stats.total_closed) * 100).toFixed(1)
                : 0}%
            </div>
            <p className="text-xs text-muted-foreground">
              {stats.total_won} vitórias / {stats.total_closed} total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Volume Total</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats.total_volume)}</div>
            <p className="text-xs text-muted-foreground">
              Todas as operações
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Resultado Líquido</CardTitle>
            <TrendingDown className={`h-4 w-4 ${stats.total_profit >= 0 ? 'text-success' : 'text-destructive'}`} />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${stats.total_profit >= 0 ? 'text-success' : 'text-destructive'}`}>
              {formatCurrency(stats.total_profit)}
            </div>
            <p className="text-xs text-muted-foreground">
              Lucro/Perda total
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Trades Tables */}
      <Tabs value={selectedTab} onValueChange={setSelectedTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">
            Visão Geral ({trades.length})
          </TabsTrigger>
          <TabsTrigger value="open">
            Abertas ({openTrades.length})
          </TabsTrigger>
          <TabsTrigger value="closed">
            Fechadas ({closedTrades.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Todas as Operações</CardTitle>
              <CardDescription>
                Histórico completo de todas as trades
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[600px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data/Hora</TableHead>
                      <TableHead>Usuário</TableHead>
                      <TableHead>Ativo</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Valor</TableHead>
                      <TableHead>Entrada</TableHead>
                      <TableHead>Duração</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Resultado</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {trades.map((trade) => (
                      <TableRow key={trade.id}>
                        <TableCell className="text-xs">
                          {formatDate(trade.created_at)}
                        </TableCell>
                        <TableCell className="text-xs">
                          <div>{trade.profiles?.full_name || 'N/A'}</div>
                          <div className="text-muted-foreground">{trade.profiles?.document}</div>
                        </TableCell>
                        <TableCell>
                          <div className="font-medium">{trade.assets?.name}</div>
                          <div className="text-xs text-muted-foreground">{trade.assets?.symbol}</div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={trade.trade_type === 'call' ? 'default' : 'destructive'}>
                            {trade.trade_type === 'call' ? (
                              <><TrendingUp className="h-3 w-3 mr-1" /> CALL</>
                            ) : (
                              <><TrendingDown className="h-3 w-3 mr-1" /> PUT</>
                            )}
                          </Badge>
                        </TableCell>
                        <TableCell>{formatCurrency(trade.amount)}</TableCell>
                        <TableCell>{trade.entry_price || 'N/A'}</TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            <Timer className="h-3 w-3 mr-1" />
                            {trade.duration_minutes}m
                          </Badge>
                        </TableCell>
                        <TableCell>{getStatusBadge(trade.status)}</TableCell>
                        <TableCell>
                          {trade.result ? (
                            <span className={trade.result > 0 ? 'text-success' : 'text-destructive'}>
                              {formatCurrency(trade.result)}
                            </span>
                          ) : '-'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="open" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Operações Abertas</CardTitle>
              <CardDescription>
                Trades em andamento aguardando expiração
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[600px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data/Hora</TableHead>
                      <TableHead>Usuário</TableHead>
                      <TableHead>Ativo</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Valor</TableHead>
                      <TableHead>Entrada</TableHead>
                      <TableHead>Expira em</TableHead>
                      <TableHead>Modo</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {openTrades.map((trade) => (
                      <TableRow key={trade.id}>
                        <TableCell className="text-xs">
                          {formatDate(trade.created_at)}
                        </TableCell>
                        <TableCell className="text-xs">
                          <div>{trade.profiles?.full_name || 'N/A'}</div>
                        </TableCell>
                        <TableCell>
                          <div className="font-medium">{trade.assets?.name}</div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={trade.trade_type === 'call' ? 'default' : 'destructive'}>
                            {trade.trade_type === 'call' ? 'CALL' : 'PUT'}
                          </Badge>
                        </TableCell>
                        <TableCell>{formatCurrency(trade.amount)}</TableCell>
                        <TableCell>{trade.entry_price || 'N/A'}</TableCell>
                        <TableCell className="text-xs">
                          {formatDate(trade.expires_at)}
                        </TableCell>
                        <TableCell>
                          <Badge variant={trade.is_demo ? 'outline' : 'default'}>
                            {trade.is_demo ? 'Demo' : 'Real'}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="closed" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Operações Fechadas</CardTitle>
              <CardDescription>
                Histórico de trades finalizadas
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[600px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Fechamento</TableHead>
                      <TableHead>Usuário</TableHead>
                      <TableHead>Ativo</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Valor</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Resultado</TableHead>
                      <TableHead>Modo</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {closedTrades.map((trade) => (
                      <TableRow key={trade.id}>
                        <TableCell className="text-xs">
                          {trade.closed_at ? formatDate(trade.closed_at) : 'N/A'}
                        </TableCell>
                        <TableCell className="text-xs">
                          {trade.profiles?.full_name || 'N/A'}
                        </TableCell>
                        <TableCell>
                          <div className="font-medium">{trade.assets?.name}</div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={trade.trade_type === 'call' ? 'default' : 'destructive'}>
                            {trade.trade_type === 'call' ? 'CALL' : 'PUT'}
                          </Badge>
                        </TableCell>
                        <TableCell>{formatCurrency(trade.amount)}</TableCell>
                        <TableCell>{getStatusBadge(trade.status)}</TableCell>
                        <TableCell>
                          {trade.result ? (
                            <span className={`font-bold ${trade.result > 0 ? 'text-success' : 'text-destructive'}`}>
                              {formatCurrency(trade.result)}
                            </span>
                          ) : '-'}
                        </TableCell>
                        <TableCell>
                          <Badge variant={trade.is_demo ? 'outline' : 'default'}>
                            {trade.is_demo ? 'Demo' : 'Real'}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
