import { TrendingUp, SlidersHorizontal, Compass, Radio, ChevronLeft, X, TrendingUpIcon, CandlestickChart, AreaChart, BarChart3, Search, Info, ChevronRight } from "lucide-react";
import { useState, useEffect } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { TradingViewChart } from "@/components/TradingViewChart";
import { useClickSound } from "@/hooks/useClickSound";
import { useTranslation } from "@/hooks/useTranslation";

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

const assetTabs = ['FTT', '5ST', 'DRT', 'CFD'];
const assetCategories = [
  { id: 'all', label: 'All' },
  { id: 'crypto', label: 'Crypto' },
  { id: 'currencies', label: 'Currencies' },
  { id: 'commodities', label: 'Commodities' },
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
  const [assets, setAssets] = useState<Asset[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTab, setSelectedTab] = useState('FTT');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const { withClickSound } = useClickSound();
  const { t } = useTranslation();

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
        <button 
          onClick={withClickSound(() => setIsAssetModalOpen(true))}
          className="inline-flex items-center gap-2 bg-card/80 hover:bg-card border border-border rounded-full pl-2 pr-4 py-1.5 transition-colors"
        >
          <div className="flex items-center justify-center h-7 w-7 rounded-full bg-muted/50">
            <ChevronLeft className="h-4 w-4 text-muted-foreground" />
          </div>
          <img src={selectedAsset.icon_url} alt={selectedAsset.name} className="w-6 h-6 rounded-full" />
          <span className="font-medium text-sm text-foreground">{selectedAsset.name}</span>
          <span className="text-sm font-medium text-primary">{selectedAsset.payout_percentage}%</span>
        </button>
      </div>

      {/* Chart Area */}
      <div className="flex-1 relative w-full h-full min-h-[450px]">
        <div className="w-full h-full">
          <TradingViewChart
            assetId={selectedAsset.id}
            assetName={selectedAsset.name}
            timeframe={selectedTimeframe}
            height={500}
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
          <button className="h-11 w-11 flex items-center justify-center rounded-lg bg-muted/60 hover:bg-muted transition-colors active:scale-95">
            <Compass className="h-5 w-5 text-muted-foreground" />
          </button>
          <button className="h-11 w-11 flex items-center justify-center rounded-lg bg-muted/60 hover:bg-muted transition-colors active:scale-95">
            <Radio className="h-5 w-5 text-muted-foreground" />
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
        <SheetContent side="bottom" hideCloseButton className="h-[90vh] rounded-t-2xl bg-background border-border p-0 flex flex-col">
          {/* Header */}
          <div className="px-4 pt-4 pb-2">
            <div className="flex items-center justify-between mb-4">
              <SheetTitle className="text-left text-foreground">Ativos</SheetTitle>
              <button 
                onClick={withClickSound(() => setIsAssetModalOpen(false))}
                className="h-8 w-8 flex items-center justify-center rounded-full hover:bg-muted transition-colors"
              >
                <X className="h-5 w-5 text-muted-foreground" />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-border">
              {assetTabs.map((tab) => (
                <button
                  key={tab}
                  onClick={withClickSound(() => setSelectedTab(tab))}
                  className={`flex-1 py-2 text-sm font-medium transition-colors relative ${
                    selectedTab === tab ? 'text-primary' : 'text-muted-foreground'
                  }`}
                >
                  {tab}
                  {selectedTab === tab && (
                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
                  )}
                </button>
              ))}
            </div>

            {/* Stats */}
            <div className="py-3 text-center text-sm">
              <span className="text-muted-foreground">{assets.length} no total</span>
              <span className="text-muted-foreground mx-2">•</span>
              <span className="text-success">{filteredAssets.length} ativo(s)</span>
            </div>

            {/* Search */}
            <div className="relative mb-3">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-muted/50 border-border rounded-xl"
              />
            </div>

            {/* Category Filters */}
            <div className="flex gap-2 overflow-x-auto pb-3 no-scrollbar">
              {assetCategories.map((category) => (
                <button
                  key={category.id}
                  onClick={withClickSound(() => setSelectedCategory(category.id))}
                  className={`px-3 py-1.5 rounded-full text-sm whitespace-nowrap transition-colors ${
                    selectedCategory === category.id
                      ? 'bg-foreground text-background'
                      : 'bg-muted/50 text-foreground border border-border'
                  }`}
                >
                  {category.label} {category.id === 'all' ? assets.length : ''}
                </button>
              ))}
              <ChevronRight className="h-5 w-5 text-muted-foreground flex-shrink-0 self-center" />
            </div>

            {/* Table Header */}
            <div className="flex items-center py-2 text-xs text-muted-foreground">
              <span className="flex-1">Ativo</span>
              <span className="w-16 text-center flex items-center justify-center gap-1">
                Lucro <Info className="h-3 w-3" />
              </span>
              <span className="w-16 text-center">Para VIP</span>
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
                    <img 
                      src={asset.icon_url} 
                      alt={asset.name} 
                      className="w-8 h-8 rounded-full"
                    />
                    <span className="font-medium text-foreground">{asset.name}</span>
                  </div>
                  <span className="w-16 text-center text-success text-sm">
                    {asset.payout_percentage}%
                  </span>
                  <span className="w-16 text-center text-success text-sm">
                    {Math.round(asset.payout_percentage * 1.025)}%
                  </span>
                </button>
              ))}
            </div>
          </ScrollArea>
        </SheetContent>
      </Sheet>
    </div>
  );
}
