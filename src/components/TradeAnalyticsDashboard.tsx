import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, TrendingDown, Target, Zap, DollarSign, Award, BarChart3, Activity } from "lucide-react";
import { useTradeAnalytics } from "@/hooks/useTradeAnalytics";
import { LoadingSpinner } from "./LoadingSpinner";
import { useTranslation } from "@/hooks/useTranslation";

interface TradeAnalyticsDashboardProps {
  userId: string | undefined;
  isDemoMode: boolean;
}

export function TradeAnalyticsDashboard({ userId, isDemoMode }: TradeAnalyticsDashboardProps) {
  const stats = useTradeAnalytics(userId, isDemoMode);
  const { t } = useTranslation();

  if (stats.loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (stats.totalTrades === 0) {
    return (
      <div className="text-center p-8">
        <Activity className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
        <p className="text-muted-foreground">
          {t("no_trades_yet", "No trades completed yet. Start trading to see your statistics!")}
        </p>
      </div>
    );
  }

  const StatCard = ({ 
    title, 
    value, 
    icon: Icon, 
    trend, 
    color = "default"
  }: { 
    title: string; 
    value: string | number; 
    icon: any; 
    trend?: string;
    color?: "green" | "red" | "blue" | "purple" | "default";
  }) => {
    const colorClasses = {
      green: "bg-green-500/10 text-green-500 border-green-500/20",
      red: "bg-red-500/10 text-red-500 border-red-500/20",
      blue: "bg-blue-500/10 text-blue-500 border-blue-500/20",
      purple: "bg-purple-500/10 text-purple-500 border-purple-500/20",
      default: "bg-primary/10 text-primary border-primary/20",
    };

    return (
      <Card className="hover:shadow-lg transition-shadow">
        <CardContent className="pt-3 sm:pt-4 md:pt-6 px-3 sm:px-4 md:px-6 pb-3 sm:pb-4 md:pb-6">
          <div className="flex items-center justify-between mb-2 sm:mb-3 md:mb-4">
            <div className={`p-1.5 sm:p-2 md:p-3 rounded-lg sm:rounded-xl ${colorClasses[color]}`}>
              <Icon className="w-3.5 h-3.5 sm:w-4 sm:h-4 md:w-5 md:h-5" />
            </div>
            {trend && (
              <span className={`text-[10px] sm:text-xs font-semibold ${
                trend.startsWith('+') ? 'text-green-500' : 'text-red-500'
              }`}>
                {trend}
              </span>
            )}
          </div>
          <p className="text-lg sm:text-xl md:text-2xl font-bold mb-0.5 sm:mb-1">{value}</p>
          <p className="text-xs sm:text-sm text-muted-foreground line-clamp-2">{title}</p>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-3 sm:space-y-4 md:space-y-6">
      {/* Main Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 md:gap-4">
        <StatCard
          title="Taxa de Vitória"
          value={`${stats.winRate.toFixed(1)}%`}
          icon={Target}
          color={stats.winRate >= 50 ? "green" : "red"}
          trend={stats.winRate >= 50 ? `+${(stats.winRate - 50).toFixed(1)}%` : undefined}
        />
        
        <StatCard
          title="Lucro Total"
          value={`R$ ${stats.totalProfit.toFixed(2)}`}
          icon={DollarSign}
          color={stats.totalProfit >= 0 ? "green" : "red"}
          trend={stats.totalProfit >= 0 ? `+${stats.todayProfit.toFixed(2)}` : undefined}
        />
        
        <StatCard
          title="Melhor Sequência"
          value={`${stats.bestStreak} wins`}
          icon={Zap}
          color="purple"
        />
        
        <StatCard
          title="Total de Operações"
          value={stats.totalTrades}
          icon={BarChart3}
          color="blue"
        />
      </div>

      {/* Detailed Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-2 sm:gap-3 md:gap-4">
        <Card>
            <CardHeader className="pb-2 sm:pb-3 md:pb-4 px-3 sm:px-4 md:px-6 pt-3 sm:pt-4 md:pt-6">
              <CardTitle className="text-sm sm:text-base flex items-center gap-1.5 sm:gap-2">
                <TrendingUp className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-green-500" />
                Performance Geral
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 sm:space-y-3 px-3 sm:px-4 md:px-6 pb-3 sm:pb-4 md:pb-6">
              <div className="flex justify-between items-center">
                <span className="text-xs sm:text-sm text-muted-foreground">Vitórias</span>
                <span className="font-semibold text-green-500 text-sm sm:text-base">{stats.wonTrades}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs sm:text-sm text-muted-foreground">Derrotas</span>
                <span className="font-semibold text-red-500 text-sm sm:text-base">{stats.lostTrades}</span>
              </div>
              <div className="flex justify-between items-center pt-2 border-t">
                <span className="text-xs sm:text-sm text-muted-foreground">Sequência Atual</span>
                <span className="font-semibold text-sm sm:text-base">{stats.currentStreak} wins</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs sm:text-sm text-muted-foreground">Lucro Hoje</span>
                <span className={`font-semibold text-sm sm:text-base ${
                  stats.todayProfit >= 0 ? 'text-green-500' : 'text-red-500'
                }`}>
                  R$ {stats.todayProfit.toFixed(2)}
                </span>
              </div>
            </CardContent>
          </Card>

        <Card>
            <CardHeader className="pb-2 sm:pb-3 md:pb-4 px-3 sm:px-4 md:px-6 pt-3 sm:pt-4 md:pt-6">
              <CardTitle className="text-sm sm:text-base flex items-center gap-1.5 sm:gap-2">
                <Award className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-purple-500" />
                Análise Avançada
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 sm:space-y-3 px-3 sm:px-4 md:px-6 pb-3 sm:pb-4 md:pb-6">
              <div className="flex justify-between items-center">
                <span className="text-xs sm:text-sm text-muted-foreground">Média de Ganho</span>
                <span className="font-semibold text-green-500 text-sm sm:text-base">
                  R$ {stats.averageWin.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs sm:text-sm text-muted-foreground">Média de Perda</span>
                <span className="font-semibold text-red-500 text-sm sm:text-base">
                  R$ {stats.averageLoss.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between items-center pt-2 border-t">
                <span className="text-xs sm:text-sm text-muted-foreground">Profit Factor</span>
                <span className={`font-semibold text-sm sm:text-base ${
                  stats.profitFactor >= 1 ? 'text-green-500' : 'text-red-500'
                }`}>
                  {stats.profitFactor.toFixed(2)}x
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs sm:text-sm text-muted-foreground">Melhor Trade</span>
                <span className="font-semibold text-green-500 text-sm sm:text-base">
                  R$ {stats.bestTrade.toFixed(2)}
                </span>
              </div>
            </CardContent>
          </Card>
      </div>

      {/* Win Rate Visual */}
      <Card>
          <CardHeader className="pb-2 sm:pb-3 md:pb-4 px-3 sm:px-4 md:px-6 pt-3 sm:pt-4 md:pt-6">
            <CardTitle className="text-sm sm:text-base">Distribuição de Resultados</CardTitle>
          </CardHeader>
          <CardContent className="px-3 sm:px-4 md:px-6 pb-3 sm:pb-4 md:pb-6">
            <div className="space-y-3 sm:space-y-4">
              <div className="flex items-center gap-2 sm:gap-3 md:gap-4">
                <div className="flex-1">
                  <div className="flex justify-between mb-1">
                    <span className="text-xs sm:text-sm text-muted-foreground">Vitórias</span>
                    <span className="text-xs sm:text-sm font-semibold text-green-500">
                      {stats.wonTrades} ({((stats.wonTrades / stats.totalTrades) * 100).toFixed(1)}%)
                    </span>
                  </div>
                  <div className="h-2 sm:h-3 bg-muted rounded-full overflow-hidden">
                    <div
                      style={{ width: `${(stats.wonTrades / stats.totalTrades) * 100}%` }}
                      className="h-full bg-gradient-to-r from-green-500 to-green-600 rounded-full transition-all duration-500"
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 sm:gap-3 md:gap-4">
                <div className="flex-1">
                  <div className="flex justify-between mb-1">
                    <span className="text-xs sm:text-sm text-muted-foreground">Derrotas</span>
                    <span className="text-xs sm:text-sm font-semibold text-red-500">
                      {stats.lostTrades} ({((stats.lostTrades / stats.totalTrades) * 100).toFixed(1)}%)
                    </span>
                  </div>
                  <div className="h-2 sm:h-3 bg-muted rounded-full overflow-hidden">
                    <div
                      style={{ width: `${(stats.lostTrades / stats.totalTrades) * 100}%` }}
                      className="h-full bg-gradient-to-r from-red-500 to-red-600 rounded-full transition-all duration-500"
                    />
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
    </div>
  );
}