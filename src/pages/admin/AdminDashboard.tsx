import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
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
  Flame,
  CalendarIcon,
  Filter,
  RefreshCw
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
import { format, subDays, startOfDay, endOfDay, differenceInDays, eachDayOfInterval } from "date-fns";
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
  
  // Date filter states
  const [startDate, setStartDate] = useState<Date | undefined>(subDays(new Date(), 30));
  const [endDate, setEndDate] = useState<Date | undefined>(new Date());
  const [isFiltering, setIsFiltering] = useState(false);

  const fetchAllStats = async (filterStart?: Date, filterEnd?: Date) => {
    try {
      setLoading(true);
      const start = filterStart ? startOfDay(filterStart) : undefined;
      const end = filterEnd ? endOfDay(filterEnd) : undefined;
      
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
        // Users - filtered by date
        start && end 
          ? supabase.from("profiles").select("*", { count: "exact", head: true }).gte("created_at", start.toISOString()).lte("created_at", end.toISOString())
          : supabase.from("profiles").select("*", { count: "exact", head: true }),
        supabase.from("profiles").select("*", { count: "exact", head: true }).gte("created_at", today.toISOString()),
        supabase.from("profiles").select("*", { count: "exact", head: true }).gte("created_at", weekAgo.toISOString()),
        // Verifications - filtered by date
        start && end 
          ? supabase.from("verification_requests").select("*", { count: "exact", head: true }).eq("status", "under_review").gte("created_at", start.toISOString()).lte("created_at", end.toISOString())
          : supabase.from("verification_requests").select("*", { count: "exact", head: true }).eq("status", "under_review"),
        start && end 
          ? supabase.from("verification_requests").select("*", { count: "exact", head: true }).eq("status", "approved").gte("created_at", start.toISOString()).lte("created_at", end.toISOString())
          : supabase.from("verification_requests").select("*", { count: "exact", head: true }).eq("status", "approved"),
        start && end 
          ? supabase.from("verification_requests").select("*", { count: "exact", head: true }).eq("status", "rejected").gte("created_at", start.toISOString()).lte("created_at", end.toISOString())
          : supabase.from("verification_requests").select("*", { count: "exact", head: true }).eq("status", "rejected"),
        // Trades - filtered by date
        supabase.from("trades").select("*", { count: "exact", head: true }).eq("status", "open"),
        start && end 
          ? supabase.from("trades").select("*", { count: "exact", head: true }).eq("is_demo", false).gte("created_at", start.toISOString()).lte("created_at", end.toISOString())
          : supabase.from("trades").select("*", { count: "exact", head: true }).eq("is_demo", false),
        start && end 
          ? supabase.from("trades").select("*", { count: "exact", head: true }).eq("status", "won").eq("is_demo", false).gte("created_at", start.toISOString()).lte("created_at", end.toISOString())
          : supabase.from("trades").select("*", { count: "exact", head: true }).eq("status", "won").eq("is_demo", false),
        start && end 
          ? supabase.from("trades").select("*", { count: "exact", head: true }).eq("status", "lost").eq("is_demo", false).gte("created_at", start.toISOString()).lte("created_at", end.toISOString())
          : supabase.from("trades").select("*", { count: "exact", head: true }).eq("status", "lost").eq("is_demo", false),
        // Transactions - filtered by date
        start && end 
          ? supabase.from("transactions").select("*", { count: "exact", head: true }).gte("created_at", start.toISOString()).lte("created_at", end.toISOString())
          : supabase.from("transactions").select("*", { count: "exact", head: true }),
        start && end 
          ? supabase.from("transactions").select("*", { count: "exact", head: true }).eq("status", "pending").gte("created_at", start.toISOString()).lte("created_at", end.toISOString())
          : supabase.from("transactions").select("*", { count: "exact", head: true }).eq("status", "pending"),
        start && end 
          ? supabase.from("transactions").select("amount, created_at").eq("type", "deposit").eq("status", "completed").gte("created_at", start.toISOString()).lte("created_at", end.toISOString())
          : supabase.from("transactions").select("amount, created_at").eq("type", "deposit").eq("status", "completed"),
        start && end 
          ? supabase.from("transactions").select("amount, created_at").eq("type", "withdrawal").eq("status", "completed").gte("created_at", start.toISOString()).lte("created_at", end.toISOString())
          : supabase.from("transactions").select("amount, created_at").eq("type", "withdrawal").eq("status", "completed"),
        supabase.from("profiles").select("balance, demo_balance, total_deposited"),
        start && end 
          ? supabase.from("affiliates").select("*", { count: "exact", head: true }).eq("is_active", true).gte("created_at", start.toISOString()).lte("created_at", end.toISOString())
          : supabase.from("affiliates").select("*", { count: "exact", head: true }).eq("is_active", true),
        start && end 
          ? supabase.from("commissions").select("amount, created_at").gte("created_at", start.toISOString()).lte("created_at", end.toISOString())
          : supabase.from("commissions").select("amount, created_at"),
        start && end 
          ? supabase.from("user_boosters").select("*", { count: "exact", head: true }).eq("is_active", true).gte("created_at", start.toISOString()).lte("created_at", end.toISOString())
          : supabase.from("user_boosters").select("*", { count: "exact", head: true }).eq("is_active", true),
        // Chart data - use filter dates or last 30 days
        start && end 
          ? supabase.from("transactions").select("amount, created_at").eq("type", "deposit").eq("status", "completed").gte("created_at", start.toISOString()).lte("created_at", end.toISOString()).order("created_at", { ascending: true })
          : supabase.from("transactions").select("amount, created_at").eq("type", "deposit").eq("status", "completed").gte("created_at", subDays(new Date(), 30).toISOString()).order("created_at", { ascending: true }),
      ]);

      // Calculate totals
      const totalDeposits = depositsRes.data?.reduce((sum, t) => sum + Number(t.amount), 0) || 0;
      const totalWithdrawals = withdrawalsRes.data?.reduce((sum, t) => sum + Number(t.amount), 0) || 0;
      const totalBalance = profilesRes.data?.reduce((sum, p) => sum + Number(p.balance || 0), 0) || 0;
      const totalDemo = profilesRes.data?.reduce((sum, p) => sum + Number(p.demo_balance || 0), 0) || 0;
      const totalDeposited = profilesRes.data?.reduce((sum, p) => sum + Number(p.total_deposited || 0), 0) || 0;
      const totalCommissionsAmount = commissionsRes.data?.reduce((sum, c) => sum + Number(c.amount), 0) || 0;
      
      // Platform profit calculation - for filtered dates, use deposit/withdrawal from that period
      let platformProfit = 0;
      if (start && end) {
        // For date range: profit = deposits - withdrawals in that period
        platformProfit = totalDeposits - totalWithdrawals;
      } else {
        // All time: profit = total deposited - current balance - total withdrawals
        platformProfit = totalDeposited - totalBalance - totalWithdrawals;
      }

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
        totalCommissions: totalCommissionsAmount,
        activeBoosters: boostersRes.count || 0,
      });

      // Process deposit chart data
      const depositsByDay: Record<string, { amount: number; count: number }> = {};
      
      if (start && end) {
        // Use the filtered date range
        const days = eachDayOfInterval({ start, end });
        days.forEach(day => {
          const dateKey = format(day, "dd/MM");
          depositsByDay[dateKey] = { amount: 0, count: 0 };
        });
      } else {
        // Default: last 30 days
        for (let i = 29; i >= 0; i--) {
          const date = format(subDays(new Date(), i), "dd/MM");
          depositsByDay[date] = { amount: 0, count: 0 };
        }
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

  useEffect(() => {
    fetchAllStats();
  }, []);

  const handleApplyFilter = () => {
    setIsFiltering(true);
    fetchAllStats(startDate, endDate).finally(() => setIsFiltering(false));
  };

  const handleClearFilter = () => {
    setStartDate(subDays(new Date(), 30));
    setEndDate(new Date());
    setIsFiltering(true);
    fetchAllStats().finally(() => setIsFiltering(false));
  };

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
    <div className="space-y-4 md:space-y-8 pb-4 md:pb-8">
      {/* Header */}
      <div className="flex flex-col gap-3 md:gap-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 md:gap-4">
          <div>
            <h1 className="text-xl md:text-4xl font-bold mb-1 md:mb-2 bg-gradient-to-r from-white via-primary to-white bg-clip-text text-transparent">
              Dashboard Executivo
            </h1>
            <p className="text-xs md:text-base text-muted-foreground">
              Visão completa da plataforma em tempo real
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs md:text-sm text-muted-foreground">
            <Clock className="h-3 w-3 md:h-4 md:w-4" />
            <span>Atualizado: {format(new Date(), "dd/MM HH:mm", { locale: ptBR })}</span>
          </div>
        </div>

        {/* Date Filter */}
        <Card className="p-3 md:p-4 bg-gradient-to-r from-card to-card/80 border-border/50">
          <div className="flex flex-col gap-3 md:gap-4">
            <div className="flex items-center gap-2 text-xs md:text-sm font-medium">
              <Filter className="h-3 w-3 md:h-4 md:w-4 text-primary" />
              <span>Filtrar por período:</span>
            </div>
            
            <div className="flex flex-wrap items-center gap-2 md:gap-3">
              {/* Start Date */}
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className={cn(
                      "w-[120px] md:w-[160px] justify-start text-left font-normal text-xs md:text-sm h-8 md:h-10",
                      !startDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-1 md:mr-2 h-3 w-3 md:h-4 md:w-4" />
                    {startDate ? format(startDate, "dd/MM/yy") : "Início"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={startDate}
                    onSelect={setStartDate}
                    initialFocus
                    className="p-3 pointer-events-auto"
                    locale={ptBR}
                  />
                </PopoverContent>
              </Popover>

              <span className="text-xs md:text-sm text-muted-foreground">até</span>

              {/* End Date */}
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className={cn(
                      "w-[120px] md:w-[160px] justify-start text-left font-normal text-xs md:text-sm h-8 md:h-10",
                      !endDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-1 md:mr-2 h-3 w-3 md:h-4 md:w-4" />
                    {endDate ? format(endDate, "dd/MM/yy") : "Fim"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={endDate}
                    onSelect={setEndDate}
                    initialFocus
                    className="p-3 pointer-events-auto"
                    locale={ptBR}
                  />
                </PopoverContent>
              </Popover>

              {/* Quick Filters */}
              <div className="flex items-center gap-1 md:gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  className="text-xs h-7 md:h-9 px-2 md:px-3"
                  onClick={() => {
                    setStartDate(subDays(new Date(), 7));
                    setEndDate(new Date());
                  }}
                >
                  7d
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  className="text-xs h-7 md:h-9 px-2 md:px-3"
                  onClick={() => {
                    setStartDate(subDays(new Date(), 30));
                    setEndDate(new Date());
                  }}
                >
                  30d
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  className="text-xs h-7 md:h-9 px-2 md:px-3"
                  onClick={() => {
                    setStartDate(subDays(new Date(), 90));
                    setEndDate(new Date());
                  }}
                >
                  90d
                </Button>
              </div>

              {/* Apply and Clear Buttons */}
              <div className="flex items-center gap-1 md:gap-2">
                <Button
                  onClick={handleApplyFilter}
                  disabled={isFiltering || !startDate || !endDate}
                  size="sm"
                  className="gap-1 md:gap-2 text-xs h-7 md:h-9"
                >
                  {isFiltering ? (
                    <RefreshCw className="h-3 w-3 md:h-4 md:w-4 animate-spin" />
                  ) : (
                    <Filter className="h-3 w-3 md:h-4 md:w-4" />
                  )}
                  <span className="hidden sm:inline">Aplicar</span>
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs h-7 md:h-9"
                  onClick={handleClearFilter}
                  disabled={isFiltering}
                >
                  Limpar
                </Button>
              </div>
            </div>
          </div>
          
          {startDate && endDate && (
            <div className="mt-3 pt-3 border-t border-border/50">
              <p className="text-xs text-muted-foreground">
                Exibindo dados de <span className="font-medium text-foreground">{format(startDate, "dd/MM/yyyy")}</span> até <span className="font-medium text-foreground">{format(endDate, "dd/MM/yyyy")}</span>
                {" "}({differenceInDays(endDate, startDate) + 1} dias)
              </p>
            </div>
          )}
        </Card>
      </div>

      {/* Hero Profit Card - 3D Metallic Green */}
      <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-emerald-950 via-emerald-900 to-emerald-950 shadow-2xl">
        <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.15)_0%,transparent_50%,rgba(0,0,0,0.3)_100%)]" />
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-emerald-400/50 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-emerald-600/30 to-transparent" />
        <div className="absolute -top-24 -right-24 w-24 md:w-48 h-24 md:h-48 bg-emerald-500/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-24 -left-24 w-24 md:w-48 h-24 md:h-48 bg-emerald-400/10 rounded-full blur-3xl" />
        
        <div className="relative p-4 md:p-12">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 md:gap-8">
            <div className="flex-1">
              <div className="flex items-center gap-2 md:gap-3 mb-2 md:mb-4">
                <div className="p-2 md:p-3 rounded-lg md:rounded-xl bg-gradient-to-br from-emerald-500/30 to-emerald-600/30 border border-emerald-500/40 backdrop-blur-sm shadow-lg shadow-emerald-500/20">
                  <Flame className="h-4 w-4 md:h-6 md:w-6 text-emerald-400" />
                </div>
                <div>
                  <p className="text-emerald-300/80 text-xs md:text-sm font-medium uppercase tracking-wider">Lucro da Plataforma</p>
                  <p className="text-emerald-400/60 text-[10px] md:text-xs hidden sm:block">Ganhos acumulados</p>
                </div>
              </div>
              
              <div className="relative">
                <h2 className="text-2xl sm:text-4xl md:text-7xl font-black tracking-tight text-white"
                    style={{
                      textShadow: `
                        0 1px 0 #ccc,
                        0 2px 0 #c9c9c9,
                        0 0 60px rgba(34, 197, 94, 0.4)
                      `,
                      filter: "drop-shadow(0 4px 8px rgba(0,0,0,0.4))"
                    }}>
                  {formatCurrency(stats.platformProfit)}
                </h2>
                <div className="absolute -inset-4 bg-emerald-500/5 blur-2xl -z-10" />
              </div>
              
              <div className="flex items-center gap-1 md:gap-2 mt-2 md:mt-4 text-emerald-400/80">
                <ArrowUpRight className="h-3 w-3 md:h-5 md:w-5" />
                <span className="text-xs md:text-sm font-medium">
                  Margem: {((stats.platformProfit / (stats.totalDepositsAmount || 1)) * 100).toFixed(1)}%
                </span>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-2 md:gap-6">
              <div className="p-2 md:p-4 rounded-lg md:rounded-xl bg-emerald-900/40 border border-emerald-700/30 backdrop-blur-sm">
                <p className="text-emerald-400/70 text-[10px] md:text-xs mb-0.5 md:mb-1">Depositado</p>
                <p className="text-sm md:text-xl font-bold text-emerald-300">{formatCurrency(stats.totalDepositsAmount)}</p>
              </div>
              <div className="p-2 md:p-4 rounded-lg md:rounded-xl bg-emerald-900/40 border border-emerald-700/30 backdrop-blur-sm">
                <p className="text-emerald-400/70 text-[10px] md:text-xs mb-0.5 md:mb-1">Saldo</p>
                <p className="text-sm md:text-xl font-bold text-emerald-300">{formatCurrency(stats.totalUserBalance)}</p>
              </div>
              <div className="p-2 md:p-4 rounded-lg md:rounded-xl bg-emerald-900/40 border border-emerald-700/30 backdrop-blur-sm">
                <p className="text-emerald-400/70 text-[10px] md:text-xs mb-0.5 md:mb-1">Saques</p>
                <p className="text-sm md:text-xl font-bold text-emerald-300">{formatCurrency(stats.totalWithdrawalsAmount)}</p>
              </div>
              <div className="p-2 md:p-4 rounded-lg md:rounded-xl bg-emerald-900/40 border border-emerald-700/30 backdrop-blur-sm">
                <p className="text-emerald-400/70 text-[10px] md:text-xs mb-0.5 md:mb-1">Perda</p>
                <p className="text-sm md:text-xl font-bold text-emerald-300">{100 - Number(winRate)}%</p>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Quick Stats Grid */}
      <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2 md:gap-4">
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
          label="Ativos"
          value={stats.activeTrades}
          subValue={`${stats.totalTrades} total`}
          trend="neutral"
          color="yellow"
        />
        <QuickStatCard
          icon={CheckCircle2}
          label="Vitória"
          value={`${winRate}%`}
          subValue={`${stats.wonTrades} ganhas`}
          trend="up"
          color="green"
        />
        <QuickStatCard
          icon={DollarSign}
          label="Transações"
          value={stats.totalTransactions}
          subValue={`${stats.pendingTransactions} pend.`}
          trend="neutral"
          color="purple"
        />
        <QuickStatCard
          icon={Shield}
          label="Verif."
          value={stats.pendingVerifications}
          subValue="pendentes"
          trend={stats.pendingVerifications > 0 ? "warning" : "neutral"}
          color="amber"
        />
        <QuickStatCard
          icon={Zap}
          label="Boosters"
          value={stats.activeBoosters}
          subValue="ativos"
          trend="up"
          color="cyan"
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
        {/* Deposit Growth Chart */}
        <Card className="lg:col-span-2 p-3 md:p-6 bg-gradient-to-br from-card to-card/50 border-border/50">
          <div className="flex items-center justify-between mb-3 md:mb-6">
            <div>
              <h3 className="text-sm md:text-xl font-bold flex items-center gap-1.5 md:gap-2">
                <BarChart3 className="h-4 w-4 md:h-5 md:w-5 text-primary" />
                Depósitos
              </h3>
              <p className="text-[10px] md:text-sm text-muted-foreground">Últimos 30 dias</p>
            </div>
            <div className="flex items-center gap-2 md:gap-4 text-xs md:text-sm">
              <div className="flex items-center gap-1 md:gap-2">
                <div className="w-2 h-2 md:w-3 md:h-3 rounded-full bg-gradient-to-r from-primary to-primary/50" />
                <span className="text-muted-foreground hidden sm:inline">Volume</span>
              </div>
            </div>
          </div>
          
          <div className="h-[180px] md:h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={depositChartData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
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
                  fontSize={10}
                  tickLine={false}
                  axisLine={false}
                  interval="preserveStartEnd"
                />
                <YAxis 
                  stroke="hsl(var(--muted-foreground))" 
                  fontSize={10}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
                  width={35}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: "hsl(var(--card))", 
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                    boxShadow: "0 10px 40px -10px rgba(0,0,0,0.5)",
                    fontSize: "12px"
                  }}
                  formatter={(value: number) => [formatCurrency(value), "Depósitos"]}
                  labelStyle={{ color: "hsl(var(--foreground))" }}
                />
                <Area 
                  type="monotone" 
                  dataKey="amount" 
                  stroke="hsl(var(--primary))" 
                  strokeWidth={2}
                  fill="url(#depositGradient)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Trade Distribution Pie */}
        <Card className="p-3 md:p-6 bg-gradient-to-br from-card to-card/50 border-border/50">
          <div className="mb-3 md:mb-6">
            <h3 className="text-sm md:text-xl font-bold flex items-center gap-1.5 md:gap-2">
              <PieChart className="h-4 w-4 md:h-5 md:w-5 text-primary" />
              Trades
            </h3>
            <p className="text-[10px] md:text-sm text-muted-foreground">Distribuição</p>
          </div>
          
          <div className="h-[150px] md:h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <RechartsPieChart>
                <Pie
                  data={tradeDistribution}
                  cx="50%"
                  cy="50%"
                  innerRadius={35}
                  outerRadius={55}
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
                    borderRadius: "8px",
                    fontSize: "12px"
                  }}
                />
                <Legend 
                  verticalAlign="bottom" 
                  height={24}
                  formatter={(value) => <span className="text-xs text-muted-foreground">{value}</span>}
                />
              </RechartsPieChart>
            </ResponsiveContainer>
          </div>
          
          <div className="grid grid-cols-3 gap-1 md:gap-2 mt-2 md:mt-4">
            <div className="text-center p-1.5 md:p-2 rounded-lg bg-green-500/10">
              <p className="text-sm md:text-xl font-bold text-green-500">{stats.wonTrades}</p>
              <p className="text-[10px] md:text-xs text-muted-foreground">Ganhas</p>
            </div>
            <div className="text-center p-1.5 md:p-2 rounded-lg bg-red-500/10">
              <p className="text-sm md:text-xl font-bold text-red-500">{stats.lostTrades}</p>
              <p className="text-[10px] md:text-xs text-muted-foreground">Perdidas</p>
            </div>
            <div className="text-center p-1.5 md:p-2 rounded-lg bg-yellow-500/10">
              <p className="text-sm md:text-xl font-bold text-yellow-500">{stats.activeTrades}</p>
              <p className="text-[10px] md:text-xs text-muted-foreground">Ativas</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Detailed Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 md:gap-4">
        {/* Users Card */}
        <DetailCard
          title="Usuários"
          icon={Users}
          iconColor="text-blue-500"
          bgColor="from-blue-500/10 to-blue-600/5"
          stats={[
            { label: "Total", value: stats.totalUsers },
            { label: "Hoje", value: stats.newUsersToday, highlight: true },
            { label: "Semana", value: stats.newUsersWeek },
          ]}
        />

        {/* Verifications Card */}
        <DetailCard
          title="Verificações"
          icon={Shield}
          iconColor="text-amber-500"
          bgColor="from-amber-500/10 to-amber-600/5"
          stats={[
            { label: "Pend.", value: stats.pendingVerifications, highlight: stats.pendingVerifications > 0 },
            { label: "Aprov.", value: stats.approvedVerifications },
            { label: "Rejeit.", value: stats.rejectedVerifications },
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
          title="Demo"
          icon={Target}
          iconColor="text-cyan-500"
          bgColor="from-cyan-500/10 to-cyan-600/5"
          stats={[
            { label: "Saldo Demo", value: formatCurrency(stats.totalDemoBalance) },
            { label: "Boosters", value: stats.activeBoosters },
          ]}
        />
      </div>

      {/* Bottom Row - Financial Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 md:gap-6">
        <Card className="p-3 md:p-6 bg-gradient-to-br from-green-500/10 to-green-600/5 border-green-500/20">
          <div className="flex items-center gap-2 md:gap-4">
            <div className="p-2 md:p-3 rounded-lg md:rounded-xl bg-green-500/20">
              <ArrowUpRight className="h-4 w-4 md:h-6 md:w-6 text-green-500" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs md:text-sm text-muted-foreground">Entradas</p>
              <p className="text-base md:text-2xl font-bold text-green-500 truncate">{formatCurrency(stats.totalDepositsAmount)}</p>
              <p className="text-[10px] md:text-xs text-muted-foreground">{stats.completedDeposits} dep.</p>
            </div>
          </div>
        </Card>

        <Card className="p-3 md:p-6 bg-gradient-to-br from-red-500/10 to-red-600/5 border-red-500/20">
          <div className="flex items-center gap-2 md:gap-4">
            <div className="p-2 md:p-3 rounded-lg md:rounded-xl bg-red-500/20">
              <ArrowDownRight className="h-4 w-4 md:h-6 md:w-6 text-red-500" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs md:text-sm text-muted-foreground">Saídas</p>
              <p className="text-base md:text-2xl font-bold text-red-500 truncate">{formatCurrency(stats.totalWithdrawalsAmount)}</p>
              <p className="text-[10px] md:text-xs text-muted-foreground">saques</p>
            </div>
          </div>
        </Card>

        <Card className="p-3 md:p-6 bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
          <div className="flex items-center gap-2 md:gap-4">
            <div className="p-2 md:p-3 rounded-lg md:rounded-xl bg-primary/20">
              <Wallet className="h-4 w-4 md:h-6 md:w-6 text-primary" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs md:text-sm text-muted-foreground">Saldo</p>
              <p className="text-base md:text-2xl font-bold text-primary truncate">{formatCurrency(stats.totalUserBalance)}</p>
              <p className="text-[10px] md:text-xs text-muted-foreground">disponível</p>
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
      "p-2 md:p-4 bg-gradient-to-br border transition-all duration-300 hover:scale-105 hover:shadow-lg",
      colorClasses[color]
    )}>
      <div className="flex items-center gap-1.5 md:gap-3 mb-1 md:mb-2">
        <Icon className="h-3 w-3 md:h-5 md:w-5" />
        <span className="text-[10px] md:text-xs font-medium text-muted-foreground truncate">{label}</span>
      </div>
      <p className="text-base md:text-2xl font-bold">{value}</p>
      <p className={cn(
        "text-[10px] md:text-xs truncate",
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
    <Card className={cn("p-3 md:p-5 bg-gradient-to-br border-border/50", bgColor)}>
      <div className="flex items-center gap-2 md:gap-3 mb-2 md:mb-4">
        <div className={cn("p-1.5 md:p-2 rounded-md md:rounded-lg bg-background/50")}>
          <Icon className={cn("h-3 w-3 md:h-5 md:w-5", iconColor)} />
        </div>
        <h4 className="font-semibold text-xs md:text-base">{title}</h4>
      </div>
      <div className="space-y-1.5 md:space-y-3">
        {stats.map((stat, idx) => (
          <div key={idx} className="flex items-center justify-between">
            <span className="text-[10px] md:text-sm text-muted-foreground">{stat.label}</span>
            <span className={cn(
              "font-semibold text-xs md:text-base",
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
