import { TrendingUp } from "lucide-react";

export const ChartPlaceholder = () => {
  return (
    <div className="flex-1 bg-[hsl(var(--chart-bg))] rounded-lg p-6 flex items-center justify-center">
      <div className="text-center space-y-4">
        <div className="flex justify-center">
          <TrendingUp className="w-16 h-16 text-muted-foreground" />
        </div>
        <div className="space-y-2">
          <h3 className="text-xl font-medium">Gráfico de Trading</h3>
          <p className="text-sm text-muted-foreground">
            Aqui será integrado o TradingView ou outro gráfico
          </p>
        </div>
        <div className="grid grid-cols-3 gap-8 pt-4">
          <div className="space-y-1">
            <div className="text-xs text-muted-foreground">Alta</div>
            <div className="text-lg font-medium text-success">▲ 2.45%</div>
          </div>
          <div className="space-y-1">
            <div className="text-xs text-muted-foreground">Atual</div>
            <div className="text-lg font-medium">0.8734</div>
          </div>
          <div className="space-y-1">
            <div className="text-xs text-muted-foreground">Baixa</div>
            <div className="text-lg font-medium text-destructive">▼ 1.12%</div>
          </div>
        </div>
      </div>
    </div>
  );
};
