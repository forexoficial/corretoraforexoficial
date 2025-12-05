import { TrendingUp, SlidersHorizontal, Pencil, Activity, ChevronLeft, X, TrendingUpIcon, CandlestickChart, AreaChart, BarChart3, Search, MousePointer, Minus, Ruler, Square, Percent, Trash2 } from "lucide-react";
import { useState, useEffect } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { TradingViewChart } from "@/components/TradingViewChart";
import { useClickSound } from "@/hooks/useClickSound";
import { useTranslation } from "@/hooks/useTranslation";
import { useTradeContext } from "@/features/trading/context/TradeContext";
import { useChartAppearance } from "@/hooks/useChartAppearance";
import { DrawingTool } from "@/components/ChartDrawingTools";
import { IndicatorSettings } from "@/components/IndicatorsPanel";

interface Asset {
  id: string;
  name: string;
  symbol: string;
  icon_url: string;
  payout_percentage: number;
}

interface MobileChartViewProps {
  selectedAsset: Asset;
  onAssetChange?: (asset: Asset) => void;
  onCurrentPriceUpdate?: (price: number) => void;
}

// Apenas timeframes curtos para binary options
const timeframeOptions = [
  { value: '10s', labelKey: 'timeframe_10s' },
  { value: '30s', labelKey: 'timeframe_30s' },
  { value: '1m', labelKey: 'timeframe_1m' },
  { value: '5m', labelKey: 'timeframe_5m' }
];

const chartTypeOptions = [
  { value: 'candle', labelKey: 'candles', icon: CandlestickChart },
];

// Chart preview components
const LineChartPreview = () => (
  <svg viewBox="0 0 120 40" className="w-full h-full">
    <path
      d="M0,35 L15,30 L30,32 L45,20 L60,25 L75,15 L90,18 L105,10 L120,12"
      fill="none"
      stroke="hsl(var(--primary))"
      strokeWidth="2"
    />
  </svg>
);

const CandleChartPreview = () => (
  <svg viewBox="0 0 120 50" className="w-full h-full">
    <g>
      <line x1="10" y1="8" x2="10" y2="42" stroke="#ef4444" strokeWidth="1" />
      <rect x="6" y="15" width="8" height="20" fill="#ef4444" />
      <line x1="25" y1="5" x2="25" y2="38" stroke="#22c55e" strokeWidth="1" />
      <rect x="21" y="10" width="8" height="22" fill="#22c55e" />
      <line x1="40" y1="12" x2="40" y2="45" stroke="#ef4444" strokeWidth="1" />
      <rect x="36" y="18" width="8" height="18" fill="#ef4444" />
      <line x1="55" y1="8" x2="55" y2="40" stroke="#22c55e" strokeWidth="1" />
      <rect x="51" y="12" width="8" height="20" fill="#22c55e" />
      <line x1="70" y1="5" x2="70" y2="35" stroke="#22c55e" strokeWidth="1" />
      <rect x="66" y="8" width="8" height="18" fill="#22c55e" />
      <line x1="85" y1="10" x2="85" y2="42" stroke="#ef4444" strokeWidth="1" />
      <rect x="81" y="15" width="8" height="20" fill="#ef4444" />
      <line x1="100" y1="8" x2="100" y2="38" stroke="#22c55e" strokeWidth="1" />
      <rect x="96" y="12" width="8" height="18" fill="#22c55e" />
      <line x1="115" y1="12" x2="115" y2="45" stroke="#ef4444" strokeWidth="1" />
      <rect x="111" y="18" width="8" height="15" fill="#ef4444" />
    </g>
  </svg>
);

const AreaChartPreview = () => (
  <svg viewBox="0 0 120 40" className="w-full h-full">
    <defs>
      <linearGradient id="areaGradient" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.3" />
        <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0" />
      </linearGradient>
    </defs>
    <path
      d="M0,35 L15,28 L30,30 L45,18 L60,22 L75,12 L90,15 L105,8 L120,10 L120,40 L0,40 Z"
      fill="url(#areaGradient)"
    />
    <path
      d="M0,35 L15,28 L30,30 L45,18 L60,22 L75,12 L90,15 L105,8 L120,10"
      fill="none"
      stroke="hsl(var(--primary))"
      strokeWidth="2"
    />
  </svg>
);

const BarChartPreview = () => (
  <svg viewBox="0 0 120 50" className="w-full h-full">
    <g>
      <g stroke="#ef4444" strokeWidth="1">
        <line x1="10" y1="10" x2="10" y2="40" />
        <line x1="6" y1="15" x2="10" y2="15" />
        <line x1="10" y1="35" x2="14" y2="35" />
      </g>
      <g stroke="#22c55e" strokeWidth="1">
        <line x1="25" y1="8" x2="25" y2="35" />
        <line x1="21" y1="30" x2="25" y2="30" />
        <line x1="25" y1="12" x2="29" y2="12" />
      </g>
      <g stroke="#ef4444" strokeWidth="1">
        <line x1="40" y1="15" x2="40" y2="42" />
        <line x1="36" y1="20" x2="40" y2="20" />
        <line x1="40" y1="38" x2="44" y2="38" />
      </g>
      <g stroke="#22c55e" strokeWidth="1">
        <line x1="55" y1="10" x2="55" y2="38" />
        <line x1="51" y1="32" x2="55" y2="32" />
        <line x1="55" y1="14" x2="59" y2="14" />
      </g>
      <g stroke="#22c55e" strokeWidth="1">
        <line x1="70" y1="5" x2="70" y2="32" />
        <line x1="66" y1="28" x2="70" y2="28" />
        <line x1="70" y1="8" x2="74" y2="8" />
      </g>
      <g stroke="#ef4444" strokeWidth="1">
        <line x1="85" y1="12" x2="85" y2="40" />
        <line x1="81" y1="16" x2="85" y2="16" />
        <line x1="85" y1="36" x2="89" y2="36" />
      </g>
      <g stroke="#22c55e" strokeWidth="1">
        <line x1="100" y1="8" x2="100" y2="35" />
        <line x1="96" y1="30" x2="100" y2="30" />
        <line x1="100" y1="12" x2="104" y2="12" />
      </g>
      <g stroke="#ef4444" strokeWidth="1">
        <line x1="115" y1="14" x2="115" y2="42" />
        <line x1="111" y1="18" x2="115" y2="18" />
        <line x1="115" y1="38" x2="119" y2="38" />
      </g>
    </g>
  </svg>
);

const HeikinAshiPreview = () => (
  <svg viewBox="0 0 120 50" className="w-full h-full">
    <g>
      <line x1="10" y1="15" x2="10" y2="40" stroke="#ef4444" strokeWidth="1" />
      <rect x="6" y="20" width="8" height="15" fill="#ef4444" rx="1" />
      <line x1="25" y1="18" x2="25" y2="42" stroke="#ef4444" strokeWidth="1" />
      <rect x="21" y="22" width="8" height="15" fill="#ef4444" rx="1" />
      <line x1="40" y1="20" x2="40" y2="38" stroke="#22c55e" strokeWidth="1" />
      <rect x="36" y="24" width="8" height="10" fill="#22c55e" rx="1" />
      <line x1="55" y1="15" x2="55" y2="32" stroke="#22c55e" strokeWidth="1" />
      <rect x="51" y="18" width="8" height="10" fill="#22c55e" rx="1" />
      <line x1="70" y1="10" x2="70" y2="28" stroke="#22c55e" strokeWidth="1" />
      <rect x="66" y="12" width="8" height="12" fill="#22c55e" rx="1" />
      <line x1="85" y1="8" x2="85" y2="25" stroke="#22c55e" strokeWidth="1" />
      <rect x="81" y="10" width="8" height="10" fill="#22c55e" rx="1" />
      <line x1="100" y1="12" x2="100" y2="30" stroke="#ef4444" strokeWidth="1" />
      <rect x="96" y="15" width="8" height="10" fill="#ef4444" rx="1" />
      <line x1="115" y1="18" x2="115" y2="35" stroke="#ef4444" strokeWidth="1" />
      <rect x="111" y="20" width="8" height="10" fill="#ef4444" rx="1" />
    </g>
  </svg>
);

const chartPreviews: Record<string, React.FC> = {
  line: LineChartPreview,
  candle: CandleChartPreview,
  area: AreaChartPreview,
  bar: BarChartPreview,
  heikin: HeikinAshiPreview,
};

export function MobileChartView({ selectedAsset, onAssetChange, onCurrentPriceUpdate }: MobileChartViewProps) {
  const [selectedTimeframe, setSelectedTimeframe] = useState('1m');
  const [selectedChartType, setSelectedChartType] = useState('candle');
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isTimeframeModalOpen, setIsTimeframeModalOpen] = useState(false);
  const [isChartTypeModalOpen, setIsChartTypeModalOpen] = useState(false);
  const [isAssetModalOpen, setIsAssetModalOpen] = useState(false);
  const [isDrawingToolsOpen, setIsDrawingToolsOpen] = useState(false);
  const [isIndicatorsOpen, setIsIndicatorsOpen] = useState(false);
  const [selectedDrawingTool, setSelectedDrawingTool] = useState<DrawingTool>('select');
  const [indicatorSettings, setIndicatorSettings] = useState<IndicatorSettings>({
    sma: { enabled: false, period: 20, color: '#3b82f6' },
    ema: { enabled: false, period: 20, color: '#f59e0b' },
    rsi: { enabled: false, period: 14 },
    bollingerBands: { enabled: false, period: 20, stdDev: 2 },
    macd: { enabled: false, fastPeriod: 12, slowPeriod: 26, signalPeriod: 9 },
  });
  const [assets, setAssets] = useState<Asset[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [tradeProgress, setTradeProgress] = useState(0);
  const { withClickSound } = useClickSound();
  const { t } = useTranslation();
  const { activeTrade } = useTradeContext();
  const { settings: appearanceSettings } = useChartAppearance();

  const drawingTools = [
    { id: "select" as DrawingTool, icon: MousePointer, label: t("select_tool", "Seleção") },
    { id: "trendline" as DrawingTool, icon: TrendingUp, label: t("trendline", "Linha de tendência") },
    { id: "horizontal" as DrawingTool, icon: Minus, label: t("horizontal_line", "Linha horizontal") },
    { id: "vertical" as DrawingTool, icon: Ruler, label: t("vertical_line", "Linha vertical") },
    { id: "rectangle" as DrawingTool, icon: Square, label: t("rectangle", "Retângulo") },
    { id: "fibonacci" as DrawingTool, icon: Percent, label: t("fibonacci", "Fibonacci") },
  ];
  
  // Get dynamic chart height from settings
  const mobileChartHeight = appearanceSettings?.chart_height_mobile || 350;

  // Track trade progress
  useEffect(() => {
    if (!activeTrade || activeTrade.status !== 'open') {
      setTradeProgress(0);
      return;
    }

    const updateProgress = () => {
      const createdAt = new Date(activeTrade.created_at).getTime();
      const expiresAt = new Date(activeTrade.expires_at).getTime();
      const now = Date.now();
      
      const totalDuration = expiresAt - createdAt;
      const elapsed = now - createdAt;
      const progress = Math.min(100, Math.max(0, (elapsed / totalDuration) * 100));
      
      setTradeProgress(progress);
    };

    updateProgress();
    const interval = setInterval(updateProgress, 100);

    return () => clearInterval(interval);
  }, [activeTrade]);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const fetchAssets = async () => {
      const { data } = await supabase
        .from('assets')
        .select('*')
        .eq('is_active', true)
        .order('name');
      
      if (data) {
        setAssets(data);
      }
    };

    if (isAssetModalOpen) {
      fetchAssets();
    }
  }, [isAssetModalOpen]);

  const filteredAssets = assets.filter(asset => 
    asset.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    asset.symbol.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getTimeframeLabel = (value: string) => {
    const option = timeframeOptions.find(opt => opt.value === value);
    return option ? value : '5m';
  };

  const handleTimeframeSelect = (value: string) => {
    setSelectedTimeframe(value);
    setIsTimeframeModalOpen(false);
  };

  const handleChartTypeSelect = (value: string) => {
    setSelectedChartType(value);
    setIsChartTypeModalOpen(false);
  };

  const handleAssetSelect = (asset: Asset) => {
    onAssetChange?.(asset);
    setIsAssetModalOpen(false);
  };

  return (
    <div className="flex-1 bg-[hsl(var(--chart-bg))] relative flex flex-col">
      {/* Asset Selector Row */}
      <div className="px-3 py-2.5">
        {(() => {
          const hasActiveTrade = activeTrade && activeTrade.status === 'open' && activeTrade.asset_id === selectedAsset.id;
          
          return (
            <button 
              onClick={withClickSound(() => setIsAssetModalOpen(true))}
              className={`relative inline-flex items-center gap-2 bg-card/80 hover:bg-card border rounded-full pl-2 pr-4 py-1.5 transition-colors overflow-hidden ${
                hasActiveTrade ? 'border-primary ring-2 ring-primary/40' : 'border-border'
              }`}
            >
              {/* Progress bar for active trade */}
              {hasActiveTrade && (
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-muted/50 overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-primary via-primary/80 to-primary transition-all duration-100 ease-linear relative"
                    style={{ width: `${tradeProgress}%` }}
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer" />
                  </div>
                  <div 
                    className="absolute top-0 bottom-0 w-2 bg-primary/80 blur-sm transition-all duration-100"
                    style={{ left: `calc(${tradeProgress}% - 4px)` }}
                  />
                </div>
              )}
              
              <div className="flex items-center justify-center h-7 w-7 rounded-full bg-muted/50">
                <ChevronLeft className="h-4 w-4 text-muted-foreground" />
              </div>
              <img src={selectedAsset.icon_url} alt={selectedAsset.name} className="w-6 h-6 rounded-full" />
              <span className="font-medium text-sm text-foreground">{selectedAsset.name}</span>
              <span className="text-sm font-medium text-primary">{selectedAsset.payout_percentage}%</span>
            </button>
          );
        })()}
      </div>

      {/* Chart Area */}
      <div className="flex-1 relative w-full h-full" style={{ minHeight: `${mobileChartHeight}px` }}>
        <div className="w-full h-full">
          <TradingViewChart
            assetId={selectedAsset.id}
            assetName={selectedAsset.name}
            timeframe={selectedTimeframe}
            height={mobileChartHeight}
            onCurrentPriceUpdate={onCurrentPriceUpdate}
          />
        </div>

        {/* Chart Controls - Bottom Left */}
        <div className="absolute bottom-3 left-3 flex items-center gap-2 bg-card/90 backdrop-blur-sm rounded-xl p-2 border border-border/50 z-50">
          <button 
            onClick={withClickSound(() => setIsTimeframeModalOpen(true))}
            className="h-11 w-11 flex items-center justify-center rounded-lg bg-muted/60 hover:bg-muted text-xs font-semibold text-foreground transition-colors active:scale-95"
          >
            {getTimeframeLabel(selectedTimeframe)}
          </button>
          <button 
            onClick={withClickSound(() => setIsChartTypeModalOpen(true))}
            className="h-11 w-11 flex items-center justify-center rounded-lg bg-muted/60 hover:bg-muted transition-colors active:scale-95"
          >
            <SlidersHorizontal className="h-5 w-5 text-muted-foreground" />
          </button>
          <button 
            onClick={withClickSound(() => setIsDrawingToolsOpen(true))}
            className={`h-11 w-11 flex items-center justify-center rounded-lg transition-colors active:scale-95 ${
              selectedDrawingTool !== 'select' 
                ? 'bg-primary/20 border border-primary/50 text-primary' 
                : 'bg-muted/60 hover:bg-muted'
            }`}
          >
            <Pencil className="h-5 w-5" />
          </button>
          <button 
            onClick={withClickSound(() => setIsIndicatorsOpen(true))}
            className={`h-11 w-11 flex items-center justify-center rounded-lg transition-colors active:scale-95 ${
              Object.values(indicatorSettings).some(i => i.enabled)
                ? 'bg-primary/20 border border-primary/50 text-primary' 
                : 'bg-muted/60 hover:bg-muted'
            }`}
          >
            <Activity className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Current Time */}
      <div className="text-center text-[10px] text-muted-foreground py-1 border-t border-border bg-background/30">
        {currentTime.toLocaleTimeString('pt-BR', { timeZone: 'America/Sao_Paulo' })} GMT-3
      </div>

      {/* Timeframe Selection Modal */}
      <Sheet open={isTimeframeModalOpen} onOpenChange={setIsTimeframeModalOpen}>
        <SheetContent side="bottom" hideCloseButton className="h-auto max-h-[70vh] rounded-t-2xl bg-background border-border">
          <SheetHeader className="flex flex-row items-center justify-between pb-4">
            <SheetTitle className="text-left text-foreground">{t("timeframe", "Prazo")}</SheetTitle>
            <button 
              onClick={withClickSound(() => setIsTimeframeModalOpen(false))}
              className="h-8 w-8 flex items-center justify-center rounded-full hover:bg-muted transition-colors"
            >
              <X className="h-5 w-5 text-muted-foreground" />
            </button>
          </SheetHeader>
          
          <div className="grid grid-cols-2 gap-3 pb-6">
            {timeframeOptions.map((option) => (
              <button
                key={option.value}
                onClick={withClickSound(() => handleTimeframeSelect(option.value))}
                className={`
                  py-4 px-4 rounded-xl text-center font-medium transition-all
                  ${selectedTimeframe === option.value 
                    ? 'bg-muted border-2 border-primary text-foreground' 
                    : 'bg-muted/50 border-2 border-transparent text-foreground hover:bg-muted'
                  }
                `}
              >
                {t(option.labelKey)}
              </button>
            ))}
          </div>
        </SheetContent>
      </Sheet>

      {/* Chart Type Selection Modal */}
      <Sheet open={isChartTypeModalOpen} onOpenChange={setIsChartTypeModalOpen}>
        <SheetContent side="bottom" hideCloseButton className="h-auto max-h-[85vh] rounded-t-2xl bg-background border-border">
          <SheetHeader className="flex flex-row items-center justify-between pb-4">
            <SheetTitle className="text-left text-foreground">{t("chart_type", "Tipo de gráfico")}</SheetTitle>
            <button 
              onClick={withClickSound(() => setIsChartTypeModalOpen(false))}
              className="h-8 w-8 flex items-center justify-center rounded-full hover:bg-muted transition-colors"
            >
              <X className="h-5 w-5 text-muted-foreground" />
            </button>
          </SheetHeader>
          
          <div className="flex flex-col gap-3 pb-6">
            {chartTypeOptions.map((option) => {
              const Icon = option.icon;
              const Preview = chartPreviews[option.value];
              return (
                <button
                  key={option.value}
                  onClick={withClickSound(() => handleChartTypeSelect(option.value))}
                  className={`
                    flex items-center gap-3 p-4 rounded-2xl transition-all h-24
                    ${selectedChartType === option.value 
                      ? 'bg-muted border-2 border-primary' 
                      : 'bg-muted/50 border-2 border-transparent hover:bg-muted'
                    }
                  `}
                >
                  <div className="flex items-center gap-3 min-w-[100px]">
                    <Icon className="h-5 w-5 text-muted-foreground" />
                    <span className="font-medium text-foreground">{t(option.labelKey)}</span>
                  </div>
                  <div className="flex-1 h-full">
                    <Preview />
                  </div>
                </button>
              );
            })}
          </div>
        </SheetContent>
      </Sheet>

      {/* Asset Selection Modal */}
      <Sheet open={isAssetModalOpen} onOpenChange={setIsAssetModalOpen}>
        <SheetContent side="bottom" hideCloseButton className="h-[80vh] rounded-t-2xl bg-background border-border p-0 flex flex-col">
          {/* Header */}
          <div className="px-4 pt-4 pb-3">
            <div className="flex items-center justify-between mb-4">
              <SheetTitle className="text-left text-foreground">{t("assets", "Ativos")}</SheetTitle>
              <button 
                onClick={withClickSound(() => setIsAssetModalOpen(false))}
                className="h-8 w-8 flex items-center justify-center rounded-full hover:bg-muted transition-colors"
              >
                <X className="h-5 w-5 text-muted-foreground" />
              </button>
            </div>

            {/* Search */}
            <div className="relative mb-3">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t("search", "Buscar")}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-muted/50 border-border rounded-xl"
              />
            </div>

            {/* Stats */}
            <div className="py-2 text-center text-sm">
              <span className="text-success">{filteredAssets.length} {t("available", "disponíveis")}</span>
            </div>

            {/* Table Header */}
            <div className="flex items-center py-2 text-xs text-muted-foreground border-b border-border">
              <span className="flex-1">{t("asset", "Ativo")}</span>
              <span className="w-20 text-center">{t("payout", "Payout")}</span>
            </div>
          </div>

          {/* Asset List */}
          <ScrollArea className="flex-1 px-4">
            <div className="flex flex-col gap-1 pb-6">
              {filteredAssets.map((asset) => (
                <button
                  key={asset.id}
                  onClick={withClickSound(() => handleAssetSelect(asset))}
                  className={`flex items-center py-3 px-3 rounded-xl transition-all ${
                    selectedAsset.id === asset.id
                      ? 'bg-muted border border-primary'
                      : 'hover:bg-muted/50'
                  }`}
                >
                  <div className="flex items-center gap-3 flex-1">
                    {asset.icon_url && (
                      <img 
                        src={asset.icon_url} 
                        alt={asset.name} 
                        className="w-8 h-8 rounded-full object-cover"
                      />
                    )}
                    <div className="flex flex-col items-start">
                      <span className="font-medium text-foreground">{asset.name}</span>
                      <span className="text-xs text-muted-foreground">{asset.symbol}</span>
                    </div>
                  </div>
                  <span className="w-20 text-center text-success font-semibold">
                    {asset.payout_percentage}%
                  </span>
                </button>
              ))}
              
              {filteredAssets.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  {t("no_assets_found", "Nenhum ativo encontrado")}
                </div>
              )}
            </div>
          </ScrollArea>
        </SheetContent>
      </Sheet>

      {/* Drawing Tools Modal */}
      <Sheet open={isDrawingToolsOpen} onOpenChange={setIsDrawingToolsOpen}>
        <SheetContent side="bottom" hideCloseButton className="h-auto max-h-[70vh] rounded-t-2xl bg-background border-border">
          <SheetHeader className="flex flex-row items-center justify-between pb-4">
            <SheetTitle className="text-left text-foreground">{t("drawing_tools", "Ferramentas de Desenho")}</SheetTitle>
            <button 
              onClick={withClickSound(() => setIsDrawingToolsOpen(false))}
              className="h-8 w-8 flex items-center justify-center rounded-full hover:bg-muted transition-colors"
            >
              <X className="h-5 w-5 text-muted-foreground" />
            </button>
          </SheetHeader>
          
          <div className="flex flex-col gap-2 pb-6">
            {drawingTools.map((tool) => {
              const Icon = tool.icon;
              return (
                <button
                  key={tool.id}
                  onClick={withClickSound(() => {
                    setSelectedDrawingTool(tool.id);
                    setIsDrawingToolsOpen(false);
                  })}
                  className={`
                    flex items-center gap-3 p-4 rounded-xl transition-all
                    ${selectedDrawingTool === tool.id 
                      ? 'bg-primary/10 border-2 border-primary text-primary' 
                      : 'bg-muted/50 border-2 border-transparent text-foreground hover:bg-muted'
                    }
                  `}
                >
                  <div className="p-2 rounded-lg bg-muted/60">
                    <Icon className="h-5 w-5" />
                  </div>
                  <span className="font-medium">{tool.label}</span>
                </button>
              );
            })}
          </div>
        </SheetContent>
      </Sheet>

      {/* Indicators Modal */}
      <Sheet open={isIndicatorsOpen} onOpenChange={setIsIndicatorsOpen}>
        <SheetContent side="bottom" hideCloseButton className="h-auto max-h-[80vh] rounded-t-2xl bg-background border-border">
          <SheetHeader className="flex flex-row items-center justify-between pb-4">
            <SheetTitle className="text-left text-foreground">{t("technical_indicators", "Indicadores Técnicos")}</SheetTitle>
            <button 
              onClick={withClickSound(() => setIsIndicatorsOpen(false))}
              className="h-8 w-8 flex items-center justify-center rounded-full hover:bg-muted transition-colors"
            >
              <X className="h-5 w-5 text-muted-foreground" />
            </button>
          </SheetHeader>
          
          <ScrollArea className="max-h-[60vh]">
            <div className="space-y-4 pb-6">
              {/* SMA */}
              <div className="flex items-center justify-between p-3 bg-muted/30 rounded-xl">
                <div>
                  <Label className="text-sm font-medium">{t("sma_simple", "SMA (Média Simples)")}</Label>
                  <p className="text-xs text-muted-foreground">{t("period", "Período")}: {indicatorSettings.sma.period}</p>
                </div>
                <Switch
                  checked={indicatorSettings.sma.enabled}
                  onCheckedChange={(enabled) => setIndicatorSettings(prev => ({
                    ...prev,
                    sma: { ...prev.sma, enabled }
                  }))}
                />
              </div>

              {/* EMA */}
              <div className="flex items-center justify-between p-3 bg-muted/30 rounded-xl">
                <div>
                  <Label className="text-sm font-medium">{t("ema_exponential", "EMA (Média Exponencial)")}</Label>
                  <p className="text-xs text-muted-foreground">{t("period", "Período")}: {indicatorSettings.ema.period}</p>
                </div>
                <Switch
                  checked={indicatorSettings.ema.enabled}
                  onCheckedChange={(enabled) => setIndicatorSettings(prev => ({
                    ...prev,
                    ema: { ...prev.ema, enabled }
                  }))}
                />
              </div>

              <Separator />

              {/* RSI */}
              <div className="flex items-center justify-between p-3 bg-muted/30 rounded-xl">
                <div>
                  <Label className="text-sm font-medium">RSI</Label>
                  <p className="text-xs text-muted-foreground">{t("period", "Período")}: {indicatorSettings.rsi.period}</p>
                </div>
                <Switch
                  checked={indicatorSettings.rsi.enabled}
                  onCheckedChange={(enabled) => setIndicatorSettings(prev => ({
                    ...prev,
                    rsi: { ...prev.rsi, enabled }
                  }))}
                />
              </div>

              <Separator />

              {/* Bollinger Bands */}
              <div className="flex items-center justify-between p-3 bg-muted/30 rounded-xl">
                <div>
                  <Label className="text-sm font-medium">{t("bollinger_bands", "Bandas de Bollinger")}</Label>
                  <p className="text-xs text-muted-foreground">{t("period", "Período")}: {indicatorSettings.bollingerBands.period}</p>
                </div>
                <Switch
                  checked={indicatorSettings.bollingerBands.enabled}
                  onCheckedChange={(enabled) => setIndicatorSettings(prev => ({
                    ...prev,
                    bollingerBands: { ...prev.bollingerBands, enabled }
                  }))}
                />
              </div>

              <Separator />

              {/* MACD */}
              <div className="flex items-center justify-between p-3 bg-muted/30 rounded-xl">
                <div>
                  <Label className="text-sm font-medium">MACD</Label>
                  <p className="text-xs text-muted-foreground">
                    {indicatorSettings.macd.fastPeriod}/{indicatorSettings.macd.slowPeriod}/{indicatorSettings.macd.signalPeriod}
                  </p>
                </div>
                <Switch
                  checked={indicatorSettings.macd.enabled}
                  onCheckedChange={(enabled) => setIndicatorSettings(prev => ({
                    ...prev,
                    macd: { ...prev.macd, enabled }
                  }))}
                />
              </div>
            </div>
          </ScrollArea>
        </SheetContent>
      </Sheet>
    </div>
  );
}
