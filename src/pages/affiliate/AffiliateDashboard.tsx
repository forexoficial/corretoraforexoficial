import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { 
  Users, 
  DollarSign, 
  TrendingUp, 
  Copy,
  CheckCircle2,
  CalendarIcon,
  Filter
} from "lucide-react";
import { formatCurrency, cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface AffiliateStats {
  totalReferrals: number;
  activeReferrals: number;
  totalCommissions: number;
  pendingCommissions: number;
  monthlyEarnings: number;
  conversionRate: number;
  affiliateCode: string;
  affiliateLink: string;
}

interface ChartData {
  date: string;
  commissions: number;
  referrals: number;
}

export default function AffiliateDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState<AffiliateStats | null>(null);
  const [chartData, setChartData] = useState<ChartData[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [startDate, setStartDate] = useState<Date | undefined>(() => {
    const date = new Date();
    date.setDate(date.getDate() - 30);
    return date;
  });
  const [endDate, setEndDate] = useState<Date | undefined>(new Date());

  useEffect(() => {
    if (user && startDate && endDate) {
      fetchAffiliateData();
      fetchChartData();
    }
  }, [user, startDate, endDate]);

  const fetchAffiliateData = async () => {
    try {
      // Get affiliate info
      const { data: affiliate, error: affiliateError } = await supabase
        .from("affiliates")
        .select("*")
        .eq("user_id", user?.id)
        .single();

      if (affiliateError) throw affiliateError;

      if (!affiliate) {
        toast.error("Você não é um afiliado cadastrado");
        return;
      }

      // Get referrals
      const { data: referrals, error: referralsError } = await supabase
        .from("referrals")
        .select("*")
        .eq("affiliate_id", affiliate.id);

      if (referralsError) throw referralsError;

      // Get commissions
      const { data: commissions, error: commissionsError } = await supabase
        .from("commissions")
        .select("*")
        .eq("affiliate_id", affiliate.id);

      if (commissionsError) throw commissionsError;

      // Filter data by selected date range
      const filteredCommissions = commissions?.filter(c => {
        const commissionDate = new Date(c.created_at);
        return commissionDate >= startDate! && commissionDate <= endDate!;
      }) || [];

      const filteredReferrals = referrals?.filter(r => {
        const referralDate = new Date(r.created_at);
        return referralDate >= startDate! && referralDate <= endDate!;
      }) || [];

      const totalCommissions = filteredCommissions.reduce((sum, c) => sum + Number(c.amount), 0);
      const activeReferrals = referrals?.filter(r => r.status === 'active').length || 0;
      const periodEarnings = totalCommissions;

      const affiliateLink = `${window.location.origin}/auth?ref=${affiliate.affiliate_code}`;

      setStats({
        totalReferrals: filteredReferrals.length,
        activeReferrals,
        totalCommissions,
        pendingCommissions: Number(affiliate.total_commission) - totalCommissions,
        monthlyEarnings: periodEarnings,
        conversionRate: referrals?.length ? (activeReferrals / referrals.length) * 100 : 0,
        affiliateCode: affiliate.affiliate_code,
        affiliateLink
      });
    } catch (error) {
      console.error("Error fetching affiliate data:", error);
      toast.error("Erro ao carregar dados");
    } finally {
      setLoading(false);
    }
  };

  const fetchChartData = async () => {
    try {
      const { data: affiliate } = await supabase
        .from("affiliates")
        .select("id")
        .eq("user_id", user?.id)
        .single();

      if (!affiliate || !startDate || !endDate) return;

      // Calculate number of days in the selected range
      const daysDiff = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
      const days = Math.min(daysDiff + 1, 30); // Max 30 days for chart
      const chartData: ChartData[] = [];
      
      for (let i = days - 1; i >= 0; i--) {
        const date = new Date(endDate);
        date.setDate(date.getDate() - i);
        
        if (date < startDate) continue;
        
        const dateStr = date.toISOString().split('T')[0];
        
        // Get commissions for this day
        const { data: dayCommissions } = await supabase
          .from("commissions")
          .select("amount")
          .eq("affiliate_id", affiliate.id)
          .gte("created_at", `${dateStr}T00:00:00`)
          .lt("created_at", `${dateStr}T23:59:59`);

        // Get referrals for this day
        const { data: dayReferrals } = await supabase
          .from("referrals")
          .select("id")
          .eq("affiliate_id", affiliate.id)
          .gte("created_at", `${dateStr}T00:00:00`)
          .lt("created_at", `${dateStr}T23:59:59`);

        chartData.push({
          date: date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
          commissions: dayCommissions?.reduce((sum, c) => sum + Number(c.amount), 0) || 0,
          referrals: dayReferrals?.length || 0
        });
      }

      setChartData(chartData);
    } catch (error) {
      console.error("Error fetching chart data:", error);
    }
  };

  const copyAffiliateLink = () => {
    if (stats?.affiliateLink) {
      navigator.clipboard.writeText(stats.affiliateLink);
      setCopied(true);
      toast.success("Link copiado!");
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (loading) {
    return <LoadingSpinner size="lg" className="min-h-[400px]" />;
  }

  if (!stats) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Você não está cadastrado como afiliado.</p>
      </div>
    );
  }

  const setDatePreset = (days: number) => {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - days);
    setStartDate(start);
    setEndDate(end);
  };

  return (
    <div className="space-y-6 lg:space-y-8">
      {/* Header with Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl lg:text-3xl font-bold">Dashboard</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Acompanhe seu desempenho e ganhos
          </p>
        </div>
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2">
              <Filter className="h-4 w-4" />
              <span className="hidden sm:inline">Filtrar Período</span>
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80 bg-popover backdrop-blur-xl border-border z-50" align="end">
            <div className="space-y-4">
              <h3 className="font-semibold text-sm">Filtro de Período</h3>
              
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Data Inicial</label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !startDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-3.5 w-3.5" />
                        <span className="text-xs">
                          {startDate ? format(startDate, "dd/MM/yyyy") : "Selecione"}
                        </span>
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0 bg-popover backdrop-blur-xl border-border z-50" align="start">
                      <Calendar
                        mode="single"
                        selected={startDate}
                        onSelect={setStartDate}
                        initialFocus
                        className={cn("p-3 pointer-events-auto")}
                        disabled={(date) => date > new Date()}
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Data Final</label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !endDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-3.5 w-3.5" />
                        <span className="text-xs">
                          {endDate ? format(endDate, "dd/MM/yyyy") : "Selecione"}
                        </span>
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0 bg-popover backdrop-blur-xl border-border z-50" align="start">
                      <Calendar
                        mode="single"
                        selected={endDate}
                        onSelect={setEndDate}
                        initialFocus
                        className={cn("p-3 pointer-events-auto")}
                        disabled={(date) => date > new Date() || (startDate && date < startDate)}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              <div className="pt-2 border-t">
                <p className="text-xs text-muted-foreground mb-2">Períodos rápidos</p>
                <div className="flex flex-col gap-1.5">
                  <Button variant="ghost" size="sm" className="justify-start h-8 text-xs" onClick={() => setDatePreset(7)}>
                    Últimos 7 dias
                  </Button>
                  <Button variant="ghost" size="sm" className="justify-start h-8 text-xs" onClick={() => setDatePreset(30)}>
                    Últimos 30 dias
                  </Button>
                  <Button variant="ghost" size="sm" className="justify-start h-8 text-xs" onClick={() => setDatePreset(90)}>
                    Últimos 90 dias
                  </Button>
                </div>
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {/* Stats Cards - Desktop Optimized */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm lg:text-base font-medium">Total de Referidos</CardTitle>
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Users className="h-5 w-5 text-primary" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl lg:text-3xl font-bold">{stats.totalReferrals}</div>
            <p className="text-xs lg:text-sm text-muted-foreground mt-1">
              {stats.activeReferrals} ativos
            </p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm lg:text-base font-medium">Comissões Totais</CardTitle>
            <div className="w-10 h-10 rounded-lg bg-success/10 flex items-center justify-center">
              <DollarSign className="h-5 w-5 text-success" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl lg:text-3xl font-bold">R$ {formatCurrency(stats.totalCommissions)}</div>
            <p className="text-xs lg:text-sm text-muted-foreground mt-1">
              Ganhos acumulados
            </p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm lg:text-base font-medium">Ganhos no Período</CardTitle>
            <div className="w-10 h-10 rounded-lg bg-chart-1/10 flex items-center justify-center">
              <TrendingUp className="h-5 w-5 text-chart-1" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl lg:text-3xl font-bold">R$ {formatCurrency(stats.monthlyEarnings)}</div>
            <p className="text-xs lg:text-sm text-muted-foreground mt-1">
              Período selecionado
            </p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm lg:text-base font-medium">Taxa de Conversão</CardTitle>
            <div className="w-10 h-10 rounded-lg bg-chart-2/10 flex items-center justify-center">
              <TrendingUp className="h-5 w-5 text-chart-2" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl lg:text-3xl font-bold">{stats.conversionRate.toFixed(1)}%</div>
            <p className="text-xs lg:text-sm text-muted-foreground mt-1">
              Referidos ativos
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Grid - Desktop 2 columns */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
        {/* Left Column - 2/3 width on desktop */}
        <div className="lg:col-span-2 space-y-6">
          {/* Affiliate Link */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg lg:text-xl">Seu Link de Afiliado</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="flex-1 p-3 lg:p-4 bg-muted rounded-lg font-mono text-sm break-all">
                  {stats.affiliateLink}
                </div>
                <Button onClick={copyAffiliateLink} variant="outline" className="w-full sm:w-auto">
                  {copied ? (
                    <>
                      <CheckCircle2 className="w-4 h-4 mr-2" />
                      Copiado
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4 mr-2" />
                      Copiar Link
                    </>
                  )}
                </Button>
              </div>
              <p className="text-sm text-muted-foreground mt-3">
                Código de afiliado: <span className="font-mono font-bold text-foreground">{stats.affiliateCode}</span>
              </p>
            </CardContent>
          </Card>

          {/* Performance Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg lg:text-xl">Performance no Período</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[300px] lg:h-[350px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis 
                      dataKey="date" 
                      className="text-xs lg:text-sm"
                    />
                    <YAxis className="text-xs lg:text-sm" />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px'
                      }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="commissions" 
                      stroke="hsl(var(--primary))" 
                      strokeWidth={3}
                      name="Comissões (R$)"
                    />
                    <Line 
                      type="monotone" 
                      dataKey="referrals" 
                      stroke="hsl(var(--success))" 
                      strokeWidth={3}
                      name="Novos Referidos"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column - 1/3 width on desktop - Quick Stats */}
        <div className="space-y-6">

          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="text-base lg:text-lg">Próximo Pagamento</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl lg:text-3xl font-bold text-primary">
                R$ {formatCurrency(stats.pendingCommissions)}
              </div>
              <p className="text-sm text-muted-foreground mt-2">
                Comissões pendentes
              </p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="text-base lg:text-lg">Média por Referido</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl lg:text-3xl font-bold">
                R$ {stats.totalReferrals > 0 
                  ? formatCurrency(stats.totalCommissions / stats.totalReferrals)
                  : '0,00'
                }
              </div>
              <p className="text-sm text-muted-foreground mt-2">
                Ganho médio por pessoa
              </p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="text-base lg:text-lg">Status da Conta</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-3 h-3 rounded-full bg-success animate-pulse"></div>
                <span className="text-2xl font-bold">Ativo</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Conta verificada e operacional
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
