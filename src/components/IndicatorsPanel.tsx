import { useState } from "react";
import { TrendingUp, Activity, Layers, BarChart3, Settings2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";

export interface IndicatorSettings {
  sma: { enabled: boolean; period: number; color: string };
  ema: { enabled: boolean; period: number; color: string };
  rsi: { enabled: boolean; period: number };
  bollingerBands: { enabled: boolean; period: number; stdDev: number };
  macd: { enabled: boolean; fastPeriod: number; slowPeriod: number; signalPeriod: number };
}

interface IndicatorsPanelProps {
  settings: IndicatorSettings;
  onChange: (settings: IndicatorSettings) => void;
}

export function IndicatorsPanel({ settings, onChange }: IndicatorsPanelProps) {
  const [open, setOpen] = useState(false);

  const updateIndicator = <T extends keyof IndicatorSettings>(
    indicator: T,
    updates: Partial<IndicatorSettings[T]>
  ) => {
    onChange({
      ...settings,
      [indicator]: { ...settings[indicator], ...updates }
    });
  };

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setOpen(true)}
        className="h-10 w-10 rounded-lg bg-muted/60 hover:bg-muted transition-colors"
        title="Indicadores Técnicos"
      >
        <Activity className="h-4 w-4 text-muted-foreground" />
      </Button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent className="w-full sm:w-[400px] overflow-y-auto">
          <SheetHeader className="pb-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-xl">
                  <BarChart3 className="h-5 w-5 text-primary" />
                </div>
                <SheetTitle>Indicadores Técnicos</SheetTitle>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setOpen(false)}
                className="h-8 w-8"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </SheetHeader>

          <div className="space-y-6">
            {/* Moving Averages */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-blue-500" />
                <h3 className="font-semibold">Médias Móveis</h3>
              </div>

              {/* SMA */}
              <div className="space-y-3 pl-6">
                <div className="flex items-center justify-between">
                  <Label htmlFor="sma" className="text-sm">
                    SMA (Média Simples)
                    <span className="text-xs text-muted-foreground ml-2">
                      Período: {settings.sma.period}
                    </span>
                  </Label>
                  <Switch
                    id="sma"
                    checked={settings.sma.enabled}
                    onCheckedChange={(enabled) => updateIndicator('sma', { enabled })}
                  />
                </div>
              </div>

              {/* EMA */}
              <div className="space-y-3 pl-6">
                <div className="flex items-center justify-between">
                  <Label htmlFor="ema" className="text-sm">
                    EMA (Média Exponencial)
                    <span className="text-xs text-muted-foreground ml-2">
                      Período: {settings.ema.period}
                    </span>
                  </Label>
                  <Switch
                    id="ema"
                    checked={settings.ema.enabled}
                    onCheckedChange={(enabled) => updateIndicator('ema', { enabled })}
                  />
                </div>
              </div>
            </div>

            <Separator />

            {/* RSI */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Activity className="h-4 w-4 text-purple-500" />
                <h3 className="font-semibold">RSI</h3>
              </div>
              <div className="space-y-3 pl-6">
                <div className="flex items-center justify-between">
                  <Label htmlFor="rsi" className="text-sm">
                    Relative Strength Index
                    <span className="text-xs text-muted-foreground ml-2">
                      Período: {settings.rsi.period}
                    </span>
                  </Label>
                  <Switch
                    id="rsi"
                    checked={settings.rsi.enabled}
                    onCheckedChange={(enabled) => updateIndicator('rsi', { enabled })}
                  />
                </div>
                {settings.rsi.enabled && (
                  <div className="text-xs text-muted-foreground">
                    <div className="flex justify-between py-1">
                      <span>Sobrecompra:</span>
                      <span className="text-red-500">&gt; 70</span>
                    </div>
                    <div className="flex justify-between py-1">
                      <span>Sobrevenda:</span>
                      <span className="text-green-500">&lt; 30</span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <Separator />

            {/* Bollinger Bands */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Layers className="h-4 w-4 text-orange-500" />
                <h3 className="font-semibold">Bollinger Bands</h3>
              </div>
              <div className="space-y-3 pl-6">
                <div className="flex items-center justify-between">
                  <Label htmlFor="bb" className="text-sm">
                    Bandas de Bollinger
                    <span className="text-xs text-muted-foreground ml-2">
                      Período: {settings.bollingerBands.period}, Desvio: {settings.bollingerBands.stdDev}
                    </span>
                  </Label>
                  <Switch
                    id="bb"
                    checked={settings.bollingerBands.enabled}
                    onCheckedChange={(enabled) => updateIndicator('bollingerBands', { enabled })}
                  />
                </div>
              </div>
            </div>

            <Separator />

            {/* MACD */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Settings2 className="h-4 w-4 text-cyan-500" />
                <h3 className="font-semibold">MACD</h3>
              </div>
              <div className="space-y-3 pl-6">
                <div className="flex items-center justify-between">
                  <Label htmlFor="macd" className="text-sm">
                    Moving Average Convergence Divergence
                    <span className="text-xs text-muted-foreground ml-2">
                      {settings.macd.fastPeriod}/{settings.macd.slowPeriod}/{settings.macd.signalPeriod}
                    </span>
                  </Label>
                  <Switch
                    id="macd"
                    checked={settings.macd.enabled}
                    onCheckedChange={(enabled) => updateIndicator('macd', { enabled })}
                  />
                </div>
              </div>
            </div>

            {/* Info Box */}
            <div className="mt-6 p-4 bg-muted/50 rounded-lg">
              <p className="text-xs text-muted-foreground">
                💡 <strong>Dica:</strong> Os indicadores técnicos ajudam a identificar tendências e pontos de entrada/saída. 
                Combine múltiplos indicadores para aumentar a precisão das suas análises.
              </p>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
