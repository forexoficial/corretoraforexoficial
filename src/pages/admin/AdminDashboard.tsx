import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { 
  Users, 
  Shield, 
  TrendingUp, 
  DollarSign, 
  Wallet, 
  Activity,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Zap,
  Target,
  PieChart,
  BarChart3,
  Coins,
  BadgeDollarSign,
  Trophy,
  Flame
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/hooks/useTranslation";
import { useCurrency } from "@/hooks/useCurrency";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  Legend
} from "recharts";
import { format, subDays, startOfDay, endOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";

interface DashboardStats {
  totalUsers: number;
  newUsersToday: number;
  newUsersWeek: number;
  pendingVerifications: number;
  approvedVerifications: number;
  rejectedVerifications: number;
  activeTrades: number;
  totalTrades: number;
  wonTrades: number;
  lostTrades: number;
  totalTransactions: number;
  pendingTransactions: number;
  completedDeposits: number;
  totalDepositsAmount: number;
  totalWithdrawalsAmount: number;
  platformProfit: number;
  totalUserBalance: number;
  totalDemoBalance: number;
  activeAffiliates: number;
  totalCommissions: number;
  activeBoosters: number;
}

interface DepositData {
  date: string;
  amount: number;
  count: number;
}

interface TradeData {
  name: string;
  value: number;
  color: string;
}

export default function AdminDashboard() {
  const { t } = useTranslation();
  const { formatCurrency } = useCurrency();
  const [stats, setStats] = useState<DashboardStats>({
    totalUsers: 0,
    newUsersToday: 0,
    newUsersWeek: 0,
    pendingVerifications: 0,
    approvedVerifications: 0,
    rejectedVerifications: 0,
    activeTrades: 0,
    totalTrades: 0,
    wonTrades: 0,
    lostTrades: 0,
    totalTransactions: 0,
    pendingTransactions: 0,
    completedDeposits: 0,
    totalDepositsAmount: 0,
    totalWithdrawalsAmount: 0,
    platformProfit: 0,
    totalUserBalance: 0,
    totalDemoBalance: 0,
    activeAffiliates: 0,
    totalCommissions: 0,
    activeBoosters: 0,
  });
  const [depositChartData, setDepositChartData] = useState<DepositData[]>([]);
  const [tradeDistribution, setTradeDistribution] = useState<TradeData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAllStats = async () => {
      try {
        const today = startOfDay(new Date());
        const weekAgo = subDays(today, 7);

        // Fetch all stats in parallel
        const [
          usersRes,
          newUsersTodayRes,
          newUsersWeekRes,
          pendingVerRes,
          approvedVerRes,
          rejectedVerRes,
          activeTradesRes,
          totalTradesRes,
          wonTradesRes,
          lostTradesRes,
          totalTransRes,
          pendingTransRes,
          depositsRes,
          withdrawalsRes,
          profilesRes,
          affiliatesRes,
          commissionsRes,
          boostersRes,
          depositsChartRes,
        ] = await Promise.all([
          supabase.from("profiles").select("*", { count: "exact", head: true }),
          supabase.from("profiles").select("*", { count: "exact", head: true }).gte("created_at", today.toISOString()),
          supabase.from("profiles").select("*", { count: "exact", head: true }).gte("created_at", weekAgo.toISOString()),
          supabase.from("verification_requests").select("*", { count: "exact", head: true }).eq("status", "under_review"),
          supabase.from("verification_requests").select("*", { count: "exact", head: true }).eq("status", "approved"),
          supabase.from("verification_requests").select("*", { count: "exact", head: true }).eq("status", "rejected"),
          supabase.from("trades").select("*", { count: "exact", head: true }).eq("status", "open"),
          supabase.from("trades").select("*", { count: "exact", head: true }).eq("is_demo", false),
          supabase.from("trades").select("*", { count: "exact", head: true }).eq("status", "won").eq("is_demo", false),
          supabase.from("trades").select("*", { count: "exact", head: true }).eq("status", "lost").eq("is_demo", false),
          supabase.from("transactions").select("*", { count: "exact", head: true }),
          supabase.from("transactions").select("*", { count: "exact", head: true }).eq("status", "pending"),
          supabase.from("transactions").select("amount").eq("type", "deposit").eq("status", "completed"),
          supabase.from("transactions").select("amount").eq("type", "withdrawal").eq("status", "completed"),
          supabase.from("profiles").select("balance, demo_balance, total_deposited"),
          supabase.from("affiliates").select("*", { count: "exact", head: true }).eq("is_active", true),
          supabase.from("commissions").select("amount"),
          supabase.from("user_boosters").select("*", { count: "exact", head: true }).eq("is_active", true),
          supabase.from("transactions").select("amount, created_at").eq("type", "deposit").eq("status", "completed").gte("created_at", subDays(new Date(), 30).toISOString()).order("created_at", { ascending: true }),
        ]);

        // Calculate totals
        const totalDeposits = depositsRes.data?.reduce((sum, t) => sum + Number(t.amount), 0) || 0;
        const totalWithdrawals = withdrawalsRes.data?.reduce((sum, t) => sum + Number(t.amount), 0) || 0;
        const totalBalance = profilesRes.data?.reduce((sum, p) => sum + Number(p.balance || 0), 0) || 0;
        const totalDemo = profilesRes.data?.reduce((sum, p) => sum + Number(p.demo_balance || 0), 0) || 0;
        const totalDeposited = profilesRes.data?.reduce((sum, p) => sum + Number(p.total_deposited || 0), 0) || 0;
        const totalCommissions = commissionsRes.data?.reduce((sum, c) => sum + Number(c.amount), 0) || 0;
        
        // Platform profit = total deposited - total current balance - total withdrawals
        const platformProfit = totalDeposited - totalBalance - totalWithdrawals;

        setStats({
          totalUsers: usersRes.count || 0,
          newUsersToday: newUsersTodayRes.count || 0,
          newUsersWeek: newUsersWeekRes.count || 0,
          pendingVerifications: pendingVerRes.count || 0,
          approvedVerifications: approvedVerRes.count || 0,
          rejectedVerifications: rejectedVerRes.count || 0,
          activeTrades: activeTradesRes.count || 0,
          totalTrades: totalTradesRes.count || 0,
          wonTrades: wonTradesRes.count || 0,
          lostTrades: lostTradesRes.count || 0,
          totalTransactions: totalTransRes.count || 0,
          pendingTransactions: pendingTransRes.count || 0,
          completedDeposits: depositsRes.data?.length || 0,
          totalDepositsAmount: totalDeposits,
          totalWithdrawalsAmount: totalWithdrawals,
          platformProfit: platformProfit > 0 ? platformProfit : 0,
          totalUserBalance: totalBalance,
          totalDemoBalance: totalDemo,
          activeAffiliates: affiliatesRes.count || 0,
          totalCommissions,
          activeBoosters: boostersRes.count || 0,
        });

        // Process deposit chart data (last 30 days)
        const depositsByDay: Record<string, { amount: number; count: number }> = {};
        for (let i = 29; i >= 0; i--) {
          const date = format(subDays(new Date(), i), "dd/MM");
          depositsByDay[date] = { amount: 0, count: 0 };
        }
        
        depositsChartRes.data?.forEach((deposit) => {
          const date = format(new Date(deposit.created_at), "dd/MM");
          if (depositsByDay[date]) {
            depositsByDay[date].amount += Number(deposit.amount);
            depositsByDay[date].count += 1;
          }
        });

        setDepositChartData(
          Object.entries(depositsByDay).map(([date, data]) => ({
            date,
            amount: data.amount,
            count: data.count,
          }))
        );

        // Trade distribution
        const won = wonTradesRes.count || 0;
        const lost = lostTradesRes.count || 0;
        const active = activeTradesRes.count || 0;
        setTradeDistribution([
          { name: "Ganhas", value: won, color: "#22c55e" },
          { name: "Perdidas", value: lost, color: "#ef4444" },
          { name: "Ativas", value: active, color: "#eab308" },
        ]);

      } catch (error) {
        console.error("Error fetching dashboard stats:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchAllStats();
  }, []);

  const winRate = stats.totalTrades > 0 
    ? ((stats.wonTrades / (stats.wonTrades + stats.lostTrades)) * 100).toFixed(1)
    : "0";

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-muted-foreground">Carregando métricas...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-white via-primary to-white bg-clip-text text-transparent">
            Dashboard Executivo
          </h1>
          <p className="text-muted-foreground">
            Visão completa da plataforma em tempo real
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Clock className="h-4 w-4" />
          <span>Última atualização: {format(new Date(), "dd/MM/yyyy HH:mm", { locale: ptBR })}</span>
        </div>
      </div>

      {/* Hero Profit Card - 3D Metallic Green */}
      <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-emerald-950 via-emerald-900 to-emerald-950 shadow-2xl">
        <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.15)_0%,transparent_50%,rgba(0,0,0,0.3)_100%)]" />
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-emerald-400/50 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-emerald-600/30 to-transparent" />
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-emerald-500/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-emerald-400/10 rounded-full blur-3xl" />
        
        <div className="relative p-8 md:p-12">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-8">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 rounded-xl bg-gradient-to-br from-emerald-500/30 to-emerald-600/30 border border-emerald-500/40 backdrop-blur-sm shadow-lg shadow-emerald-500/20">
                  <Flame className="h-6 w-6 text-emerald-400" />
                </div>
                <div>
                  <p className="text-emerald-300/80 text-sm font-medium uppercase tracking-wider">Lucro da Plataforma</p>
                  <p className="text-emerald-400/60 text-xs">Ganhos acumulados das operações</p>
                </div>
              </div>
              
              <div className="relative">
                <h2 className="text-5xl md:text-7xl font-black tracking-tight"
                    style={{
                      background: "linear-gradient(180deg, #86efac 0%, #22c55e 40%, #15803d 80%, #166534 100%)",
                      WebkitBackgroundClip: "text",
                      WebkitTextFillColor: "transparent",
                      textShadow: "0 0 80px rgba(34, 197, 94, 0.5)",
                      filter: "drop-shadow(0 4px 8px rgba(0,0,0,0.3))"
                    }}>
                  {formatCurrency(stats.platformProfit)}
                </h2>
                <div className="absolute -inset-4 bg-emerald-500/5 blur-2xl -z-10" />
              </div>
              
              <div className="flex items-center gap-2 mt-4 text-emerald-400/80">
                <ArrowUpRight className="h-5 w-5" />
                <span className="text-sm font-medium">
                  Margem de {((stats.platformProfit / (stats.totalDepositsAmount || 1)) * 100).toFixed(1)}% sobre depósitos
                </span>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4 md:gap-6">
              <div className="p-4 rounded-xl bg-emerald-900/40 border border-emerald-700/30 backdrop-blur-sm">
                <p className="text-emerald-400/70 text-xs mb-1">Total Depositado</p>
                <p className="text-xl font-bold text-emerald-300">{formatCurrency(stats.totalDepositsAmount)}</p>
              </div>
              <div className="p-4 rounded-xl bg-emerald-900/40 border border-emerald-700/30 backdrop-blur-sm">
                <p className="text-emerald-400/70 text-xs mb-1">Saldo Usuários</p>
                <p className="text-xl font-bold text-emerald-300">{formatCurrency(stats.totalUserBalance)}</p>
              </div>
              <div className="p-4 rounded-xl bg-emerald-900/40 border border-emerald-700/30 backdrop-blur-sm">
                <p className="text-emerald-400/70 text-xs mb-1">Total Saques</p>
                <p className="text-xl font-bold text-emerald-300">{formatCurrency(stats.totalWithdrawalsAmount)}</p>
              </div>
              <div className="p-4 rounded-xl bg-emerald-900/40 border border-emerald-700/30 backdrop-blur-sm">
                <p className="text-emerald-400/70 text-xs mb-1">Taxa de Perda</p>
                <p className="text-xl font-bold text-emerald-300">{100 - Number(winRate)}%</p>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Quick Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        <QuickStatCard
          icon={Users}
          label="Usuários"
          value={stats.totalUsers}
          subValue={`+${stats.newUsersToday} hoje`}
          trend="up"
          color="blue"
        />
        <QuickStatCard
          icon={TrendingUp}
          label="Trades Ativos"
          value={stats.activeTrades}
          subValue={`${stats.totalTrades} total`}
          trend="neutral"
          color="yellow"
        />
        <QuickStatCard
          icon={CheckCircle2}
          label="Taxa de Vitória"
          value={`${winRate}%`}
          subValue={`${stats.wonTrades} ganhas`}
          trend="up"
          color="green"
        />
        <QuickStatCard
          icon={DollarSign}
          label="Transações"
          value={stats.totalTransactions}
          subValue={`${stats.pendingTransactions} pendentes`}
          trend="neutral"
          color="purple"
        />
        <QuickStatCard
          icon={Shield}
          label="Verificações"
          value={stats.pendingVerifications}
          subValue="pendentes"
          trend={stats.pendingVerifications > 0 ? "warning" : "neutral"}
          color="amber"
        />
        <QuickStatCard
          icon={Zap}
          label="Boosters Ativos"
          value={stats.activeBoosters}
          subValue="em uso"
          trend="up"
          color="cyan"
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Deposit Growth Chart */}
        <Card className="lg:col-span-2 p-6 bg-gradient-to-br from-card to-card/50 border-border/50">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-xl font-bold flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-primary" />
                Crescimento de Depósitos
              </h3>
              <p className="text-sm text-muted-foreground">Últimos 30 dias</p>
            </div>
            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-gradient-to-r from-primary to-primary/50" />
                <span className="text-muted-foreground">Volume</span>
              </div>
            </div>
          </div>
          
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={depositChartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="depositGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.4} />
                    <stop offset="50%" stopColor="hsl(var(--primary))" stopOpacity={0.2} />
                    <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                <XAxis 
                  dataKey="date" 
                  stroke="hsl(var(--muted-foreground))" 
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis 
                  stroke="hsl(var(--muted-foreground))" 
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: "hsl(var(--card))", 
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                    boxShadow: "0 10px 40px -10px rgba(0,0,0,0.5)"
                  }}
                  formatter={(value: number) => [formatCurrency(value), "Depósitos"]}
                  labelStyle={{ color: "hsl(var(--foreground))" }}
                />
                <Area 
                  type="monotone" 
                  dataKey="amount" 
                  stroke="hsl(var(--primary))" 
                  strokeWidth={3}
                  fill="url(#depositGradient)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Trade Distribution Pie */}
        <Card className="p-6 bg-gradient-to-br from-card to-card/50 border-border/50">
          <div className="mb-6">
            <h3 className="text-xl font-bold flex items-center gap-2">
              <PieChart className="h-5 w-5 text-primary" />
              Distribuição de Trades
            </h3>
            <p className="text-sm text-muted-foreground">Por resultado</p>
          </div>
          
          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <RechartsPieChart>
                <Pie
                  data={tradeDistribution}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={4}
                  dataKey="value"
                  strokeWidth={0}
                >
                  {tradeDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: "hsl(var(--card))", 
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px"
                  }}
                />
                <Legend 
                  verticalAlign="bottom" 
                  height={36}
                  formatter={(value) => <span className="text-sm text-muted-foreground">{value}</span>}
                />
              </RechartsPieChart>
            </ResponsiveContainer>
          </div>
          
          <div className="grid grid-cols-3 gap-2 mt-4">
            <div className="text-center p-2 rounded-lg bg-green-500/10">
              <p className="text-xl font-bold text-green-500">{stats.wonTrades}</p>
              <p className="text-xs text-muted-foreground">Ganhas</p>
            </div>
            <div className="text-center p-2 rounded-lg bg-red-500/10">
              <p className="text-xl font-bold text-red-500">{stats.lostTrades}</p>
              <p className="text-xs text-muted-foreground">Perdidas</p>
            </div>
            <div className="text-center p-2 rounded-lg bg-yellow-500/10">
              <p className="text-xl font-bold text-yellow-500">{stats.activeTrades}</p>
              <p className="text-xs text-muted-foreground">Ativas</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Detailed Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Users Card */}
        <DetailCard
          title="Usuários"
          icon={Users}
          iconColor="text-blue-500"
          bgColor="from-blue-500/10 to-blue-600/5"
          stats={[
            { label: "Total", value: stats.totalUsers },
            { label: "Hoje", value: stats.newUsersToday, highlight: true },
            { label: "Esta semana", value: stats.newUsersWeek },
          ]}
        />

        {/* Verifications Card */}
        <DetailCard
          title="Verificações"
          icon={Shield}
          iconColor="text-amber-500"
          bgColor="from-amber-500/10 to-amber-600/5"
          stats={[
            { label: "Pendentes", value: stats.pendingVerifications, highlight: stats.pendingVerifications > 0 },
            { label: "Aprovadas", value: stats.approvedVerifications },
            { label: "Rejeitadas", value: stats.rejectedVerifications },
          ]}
        />

        {/* Affiliates Card */}
        <DetailCard
          title="Afiliados"
          icon={Trophy}
          iconColor="text-purple-500"
          bgColor="from-purple-500/10 to-purple-600/5"
          stats={[
            { label: "Ativos", value: stats.activeAffiliates },
            { label: "Comissões", value: formatCurrency(stats.totalCommissions) },
          ]}
        />

        {/* Demo Mode Card */}
        <DetailCard
          title="Modo Demo"
          icon={Target}
          iconColor="text-cyan-500"
          bgColor="from-cyan-500/10 to-cyan-600/5"
          stats={[
            { label: "Saldo Total Demo", value: formatCurrency(stats.totalDemoBalance) },
            { label: "Boosters Ativos", value: stats.activeBoosters },
          ]}
        />
      </div>

      {/* Bottom Row - Financial Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="p-6 bg-gradient-to-br from-green-500/10 to-green-600/5 border-green-500/20">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-green-500/20">
              <ArrowUpRight className="h-6 w-6 text-green-500" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Entradas</p>
              <p className="text-2xl font-bold text-green-500">{formatCurrency(stats.totalDepositsAmount)}</p>
              <p className="text-xs text-muted-foreground">{stats.completedDeposits} depósitos</p>
            </div>
          </div>
        </Card>

        <Card className="p-6 bg-gradient-to-br from-red-500/10 to-red-600/5 border-red-500/20">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-red-500/20">
              <ArrowDownRight className="h-6 w-6 text-red-500" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Saídas</p>
              <p className="text-2xl font-bold text-red-500">{formatCurrency(stats.totalWithdrawalsAmount)}</p>
              <p className="text-xs text-muted-foreground">saques aprovados</p>
            </div>
          </div>
        </Card>

        <Card className="p-6 bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-primary/20">
              <Wallet className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Saldo em Contas</p>
              <p className="text-2xl font-bold text-primary">{formatCurrency(stats.totalUserBalance)}</p>
              <p className="text-xs text-muted-foreground">disponível para operações</p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}

// Quick Stat Card Component
function QuickStatCard({ 
  icon: Icon, 
  label, 
  value, 
  subValue, 
  trend, 
  color 
}: { 
  icon: any; 
  label: string; 
  value: string | number; 
  subValue: string;
  trend: "up" | "down" | "neutral" | "warning";
  color: string;
}) {
  const colorClasses: Record<string, string> = {
    blue: "from-blue-500/20 to-blue-600/10 border-blue-500/30 text-blue-500",
    green: "from-green-500/20 to-green-600/10 border-green-500/30 text-green-500",
    yellow: "from-yellow-500/20 to-yellow-600/10 border-yellow-500/30 text-yellow-500",
    purple: "from-purple-500/20 to-purple-600/10 border-purple-500/30 text-purple-500",
    amber: "from-amber-500/20 to-amber-600/10 border-amber-500/30 text-amber-500",
    cyan: "from-cyan-500/20 to-cyan-600/10 border-cyan-500/30 text-cyan-500",
  };

  return (
    <Card className={cn(
      "p-4 bg-gradient-to-br border transition-all duration-300 hover:scale-105 hover:shadow-lg",
      colorClasses[color]
    )}>
      <div className="flex items-center gap-3 mb-2">
        <Icon className="h-5 w-5" />
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
      </div>
      <p className="text-2xl font-bold">{value}</p>
      <p className={cn(
        "text-xs",
        trend === "up" && "text-green-500",
        trend === "down" && "text-red-500",
        trend === "warning" && "text-amber-500",
        trend === "neutral" && "text-muted-foreground"
      )}>
        {subValue}
      </p>
    </Card>
  );
}

// Detail Card Component
function DetailCard({
  title,
  icon: Icon,
  iconColor,
  bgColor,
  stats
}: {
  title: string;
  icon: any;
  iconColor: string;
  bgColor: string;
  stats: Array<{ label: string; value: string | number; highlight?: boolean }>;
}) {
  return (
    <Card className={cn("p-5 bg-gradient-to-br border-border/50", bgColor)}>
      <div className="flex items-center gap-3 mb-4">
        <div className={cn("p-2 rounded-lg bg-background/50")}>
          <Icon className={cn("h-5 w-5", iconColor)} />
        </div>
        <h4 className="font-semibold">{title}</h4>
      </div>
      <div className="space-y-3">
        {stats.map((stat, idx) => (
          <div key={idx} className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">{stat.label}</span>
            <span className={cn(
              "font-semibold",
              stat.highlight && "text-primary"
            )}>
              {stat.value}
            </span>
          </div>
        ))}
      </div>
    </Card>
  );
}
