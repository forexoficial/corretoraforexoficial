import { useEffect, useState } from "react";
import { ChevronUp, ChevronDown, Wrench, SlidersHorizontal, Clock, TrendingUp, CandlestickChart, AreaChart, BarChart3 } from "lucide-react";
import { TradingSidebar } from "@/components/TradingSidebar";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useTradeAlerts } from "@/hooks/useTradeAlerts";
import { useVolatilityAlerts } from "@/hooks/useVolatilityAlerts";
import { useTradeExpiration } from "@/hooks/useTradeExpiration";
import { IndicatorsPanel, IndicatorSettings } from "@/components/IndicatorsPanel";
import { ChartDrawingTools } from "@/components/ChartDrawingTools";
import type { DrawingTool } from "@/hooks/useChartDrawing";
import { TradingViewChart } from "@/components/TradingViewChart";
import { TradingPanel } from "@/components/TradingPanel";
import { usePlatformSettings } from "@/hooks/usePlatformSettings";
import { TradeProvider } from "@/features/trading/context/TradeContext";
import { RecentTradesList } from "@/features/trading/components/RecentTradesList";
import { TradingFooter } from "@/components/TradingFooter";
import { TradingHeader } from "@/components/TradingHeader";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useDemoMode } from "@/hooks/useDemoMode";
import PlatformPopup from "@/components/PlatformPopup";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { useIsMobile } from "@/hooks/use-mobile";
import { MobileTradingView } from "@/components/mobile/MobileTradingView";
import { usePersistentPlatformState } from "@/hooks/usePersistentPlatformState";
import { useFullscreen } from "@/hooks/useFullscreen";
import { PriceLineSettings, PriceLineConfig } from "@/components/PriceLineSettings";
import { useChartAppearance } from "@/hooks/useChartAppearance";
import { useTranslation } from "@/hooks/useTranslation";

interface Asset {
  id: string;
  name: string;
  symbol: string;
  icon_url: string;
  payout_percentage: number;
}

const Index = () => {
  const { t } = useTranslation();
  const { settings, loading: settingsLoading } = usePlatformSettings();
  const { settings: chartAppearanceSettings } = useChartAppearance();
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
  const [selectedAssets, setSelectedAssets] = useState<Asset[]>([]);
  const [isTradesListOpen, setIsTradesListOpen] = useState(false);
  const { isDemoMode, currentBalance, triggerBalanceLoading } = useDemoMode();
  const isMobile = useIsMobile();
  
  // Get dynamic chart height from settings
  const desktopChartHeight = chartAppearanceSettings?.chart_height_desktop || 600;
  const [selectedTimeframe, setSelectedTimeframe] = useState('1m');
  const [isTimeframeDialogOpen, setIsTimeframeDialogOpen] = useState(false);
  const [selectedChartType, setSelectedChartType] = useState('candle');
  const [isChartTypeDialogOpen, setIsChartTypeDialogOpen] = useState(false);
  const persistentState = usePersistentPlatformState();
  const isFullscreen = useFullscreen();
  const [user, setUser] = useState<any>(null);
  const [currentPrice, setCurrentPrice] = useState<number>(100);
  const [currentAssetId, setCurrentAssetId] = useState<string | null>(null);
  
  // Price Line configuration
  const [priceLineConfig, setPriceLineConfig] = useState<PriceLineConfig>(() => {
    const saved = localStorage.getItem('priceLineConfig');
    return saved ? JSON.parse(saved) : {
      visible: true,
      color: '#ffffff',
      width: 1,
      style: 2,
    };
  });

  // Save price line config to localStorage
  const handlePriceLineConfigChange = (config: PriceLineConfig) => {
    setPriceLineConfig(config);
    localStorage.setItem('priceLineConfig', JSON.stringify(config));
  };
  
  // Drawing tool state
  const [drawingTool, setDrawingTool] = useState<DrawingTool>("select");
  const [hasDrawings, setHasDrawings] = useState(false);
  const [drawingStyle, setDrawingStyle] = useState<{ color: string; lineWidth: number; lineStyle: "solid" | "dashed" | "dotted" }>({
    color: "#22c55e",
    lineWidth: 2,
    lineStyle: "solid"
  });
  
  // Indicator settings with default values
  const [indicatorSettings, setIndicatorSettings] = useState<IndicatorSettings>({
    sma: { enabled: false, period: 20, color: '#2563eb' },
    ema: { enabled: false, period: 12, color: '#dc2626' },
    rsi: { enabled: false, period: 14 },
    bollingerBands: { enabled: false, period: 20, stdDev: 2 },
    macd: { enabled: false, fastPeriod: 12, slowPeriod: 26, signalPeriod: 9 }
  });

  // Initialize alert systems
  useTradeAlerts(user?.id, isDemoMode);
  useVolatilityAlerts(currentAssetId);
  
  // Initialize automatic trade expiration processing
  useTradeExpiration(user?.id);
  
  // Load indicator settings from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('indicatorSettings');
    if (saved) {
      try {
        setIndicatorSettings(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to load indicator settings:', e);
      }
    }
  }, []);
  
  // Save indicator settings to localStorage
  const handleIndicatorSettingsChange = (newSettings: IndicatorSettings) => {
    setIndicatorSettings(newSettings);
    localStorage.setItem('indicatorSettings', JSON.stringify(newSettings));
  };

  useEffect(() => {
    // Get current user
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
    });
  }, []);

  // Monitor trade status changes in real-time
  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel('trade-status-changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'trades',
          filter: `user_id=eq.${user.id}`
        },
        async (payload) => {
          const trade = payload.new as any;
          
          console.log('[Index] Trade update recebido:', {
            id: trade.id,
            status: trade.status,
            old_status: payload.old?.status,
            closed_at: trade.closed_at
          });
          
          const isClosed = (trade.status === 'won' || trade.status === 'lost') && !!trade.closed_at;
          if (!isClosed) return;
          
          console.log('[Index] 🎉 Trade FECHADO detectado!', {
            status: trade.status,
            result: trade.result
          });
          
          // Trigger loading indicator immediately for better UX
          triggerBalanceLoading();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  useEffect(() => {
    loadAssets();
  }, [persistentState.isLoaded]);

  const loadAssets = async () => {
    if (!persistentState.isLoaded) return;

    // If user has saved assets, load them
    if (persistentState.selectedAssets.length > 0) {
      const { data: savedAssets, error } = await supabase
        .from('assets')
        .select('*')
        .in('id', persistentState.selectedAssets)
        .eq('is_active', true);

      if (error) {
        console.error('Error loading saved assets:', error);
      } else if (savedAssets && savedAssets.length > 0) {
        setSelectedAssets(savedAssets);
        
        // Set current asset from saved state or first asset
        if (persistentState.currentAssetId) {
          const currentAsset = savedAssets.find(a => a.id === persistentState.currentAssetId);
          setSelectedAsset(currentAsset || savedAssets[0]);
        } else {
          setSelectedAsset(savedAssets[0]);
        }
        return;
      }
    }

    // If no saved assets, load first available asset
    const { data, error } = await supabase
      .from('assets')
      .select('*')
      .eq('is_active', true)
      .limit(1)
      .single();

    if (error) {
      toast.error(t("error_loading_assets", "Error loading assets"));
      console.error(error);
    } else if (data) {
      setSelectedAsset(data);
      setSelectedAssets([data]);
      // Save initial state
      persistentState.saveSelectedAssets([data.id]);
      persistentState.saveCurrentAsset(data.id);
    }
  };

  const handleAssetSelect = (asset: Asset) => {
    // Add to selected assets if not already there
    const newSelectedAssets = selectedAssets.some(a => a.id === asset.id)
      ? selectedAssets
      : [...selectedAssets, asset];
    
    if (!selectedAssets.some(a => a.id === asset.id)) {
      setSelectedAssets(newSelectedAssets);
      persistentState.saveSelectedAssets(newSelectedAssets.map(a => a.id));
    }
    
    // Set as the current active asset
    setSelectedAsset(asset);
    persistentState.saveCurrentAsset(asset.id);
  };

  const handleAssetRemove = (assetId: string) => {
    // Prevent removing the last asset
    if (selectedAssets.length <= 1) {
      toast.error("Você precisa ter pelo menos 1 ativo aberto");
      return;
    }
    
    const newAssets = selectedAssets.filter(a => a.id !== assetId);
    setSelectedAssets(newAssets);
    persistentState.saveSelectedAssets(newAssets.map(a => a.id));
    
    // If we removed the currently selected asset, select the first remaining one
    if (selectedAsset?.id === assetId && newAssets.length > 0) {
      setSelectedAsset(newAssets[0]);
      persistentState.saveCurrentAsset(newAssets[0].id);
    }
  };

  // Apenas timeframes curtos para binary options
  const timeframeOptions = [
    { value: '10s', label: t("timeframe_10s") },
    { value: '30s', label: t("timeframe_30s") },
    { value: '1m', label: t("timeframe_1m") },
    { value: '5m', label: t("timeframe_5m") }
  ];

  const handleTimeframeSelect = (value: string) => {
    setSelectedTimeframe(value);
    setIsTimeframeDialogOpen(false);
  };

  const chartTypeOptions = [
    { value: 'line', label: t("line"), icon: TrendingUp },
    { value: 'candle', label: t("candles"), icon: CandlestickChart },
    { value: 'area', label: t("area"), icon: AreaChart },
    { value: 'bar', label: t("bars"), icon: BarChart3 },
  ];

  const handleChartTypeSelect = (value: string) => {
    setSelectedChartType(value);
    setIsChartTypeDialogOpen(false);
  };

  // Maintenance mode check
  if (!settingsLoading && settings.maintenance_mode) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <div className="max-w-md w-full bg-card border border-border rounded-lg p-8 text-center space-y-4">
          <Wrench className="w-16 h-16 mx-auto text-primary" />
          <h1 className="text-2xl font-bold">{settings.platform_name}</h1>
          <h2 className="text-xl font-semibold text-muted-foreground">Em Manutenção</h2>
          <p className="text-muted-foreground">
            Estamos realizando melhorias na plataforma. Voltaremos em breve!
          </p>
          <div className="pt-4 text-sm text-muted-foreground">
            <p>Contato: {settings.support_email}</p>
            <p>{settings.support_phone}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!selectedAsset || settingsLoading || !persistentState.isLoaded) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  // Render Mobile View
  if (isMobile) {
    return (
      <TradeProvider userId={user?.id}>
        <MobileTradingView
          selectedAsset={selectedAsset}
          isDemoMode={isDemoMode}
          currentBalance={currentBalance}
          onAssetChange={(asset) => {
            setSelectedAsset(asset);
            persistentState.saveCurrentAsset(asset.id);
          }}
        />
      </TradeProvider>
    );
  }

  // Render Desktop View
  return (
    <TradeProvider userId={user?.id}>
    <>
      <PlatformPopup />
      <TradingHeader 
        selectedAssets={selectedAssets}
        currentAssetId={selectedAsset?.id}
        onAssetSelect={handleAssetSelect}
        onAssetRemove={handleAssetRemove}
      />
      <div className="flex flex-col h-[calc(100vh-64px)] bg-background text-foreground">
      <div className="flex flex-1 overflow-hidden">
        <TradingSidebar 
          userId={user?.id}
          isDemoMode={isDemoMode}
        />
        
        <div className="flex-1 flex flex-col overflow-hidden relative">
          <div className={`flex-1 p-4 overflow-hidden relative flex flex-col ${isFullscreen ? 'pb-4' : 'pb-[100px]'}`}>
            <div className="relative w-full flex-1 flex flex-col" style={{ 
              height: isFullscreen ? 'calc(100vh - 96px)' : 'calc(100vh - 280px)',
              minHeight: isFullscreen ? 'calc(100vh - 96px)' : '400px',
              maxHeight: isFullscreen ? 'calc(100vh - 96px)' : 'calc(100vh - 280px)'
            }}>
              {/* Chart Controls - Top Left (sempre visível) */}
              <div className="absolute top-4 left-4 flex items-center gap-2 bg-card/90 backdrop-blur-sm rounded-xl p-2 border border-border/50 z-50 shadow-lg">
                <button 
                  onClick={() => setIsTimeframeDialogOpen(true)}
                  className="h-10 px-3 flex items-center justify-center gap-2 rounded-lg bg-muted/60 hover:bg-muted text-xs font-medium text-foreground transition-colors"
                >
                  <Clock className="h-3.5 w-3.5" />
                  {selectedTimeframe}
                </button>
                <button 
                  onClick={() => setIsChartTypeDialogOpen(true)}
                  className="h-10 w-10 flex items-center justify-center rounded-lg bg-muted/60 hover:bg-muted transition-colors"
                  title="Tipo de Gráfico"
                >
                  <SlidersHorizontal className="h-4 w-4 text-muted-foreground" />
                </button>
                <IndicatorsPanel 
                  settings={indicatorSettings}
                  onChange={handleIndicatorSettingsChange}
                />
                <ChartDrawingTools
                  selectedTool={drawingTool}
                  onToolChange={setDrawingTool}
                  onClearAll={() => {
                    (window as any).__clearChartDrawings?.();
                  }}
                  hasDrawings={hasDrawings}
                  drawingStyle={drawingStyle}
                  onStyleChange={setDrawingStyle}
                />
                <PriceLineSettings
                  config={priceLineConfig}
                  onChange={handlePriceLineConfigChange}
                />
              </div>
              
              <TradingViewChart
                assetId={selectedAsset.id}
                assetName={selectedAsset.name}
                timeframe={selectedTimeframe}
                height={isFullscreen ? window.innerHeight - 96 : desktopChartHeight}
                onAssetChange={setCurrentAssetId}
                onCurrentPriceUpdate={setCurrentPrice}
                indicatorSettings={indicatorSettings}
                drawingTool={drawingTool}
                onDrawingToolChange={setDrawingTool}
                onHasDrawingsChange={setHasDrawings}
                drawingStyle={drawingStyle}
                priceLineConfig={priceLineConfig}
              />
            </div>
          </div>
          
          <div className="fixed bottom-8 left-0 right-0 border-t border-border bg-card z-20">
            <div className="flex items-center justify-between px-4 py-1">
              <h3 className="text-xs font-semibold">{t("recent_trades", "Recent Trades")}</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsTradesListOpen(!isTradesListOpen)}
                className="h-6 w-6 p-0"
              >
                {isTradesListOpen ? (
                  <ChevronDown className="h-3 w-3" />
                ) : (
                  <ChevronUp className="h-3 w-3" />
                )}
              </Button>
            </div>
            
            <div
              className={`transition-all duration-300 ease-in-out overflow-hidden ${
                isTradesListOpen ? "max-h-[200px] opacity-100" : "max-h-0 opacity-0"
              }`}
            >
              <div className="overflow-y-auto max-h-[200px]">
                <RecentTradesList />
              </div>
            </div>
          </div>
        </div>

        <TradingPanel 
          selectedAsset={selectedAsset} 
          isDemoMode={isDemoMode}
          currentBalance={currentBalance}
          currentPrice={currentPrice}
        />
      </div>
      
      <TradingFooter />
    </div>

    {/* Timeframe Selection Dialog */}
    <Dialog open={isTimeframeDialogOpen} onOpenChange={setIsTimeframeDialogOpen}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t("select_timeframe")}</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3 pt-4">
          {timeframeOptions.map((option) => (
            <button
              key={option.value}
              onClick={() => handleTimeframeSelect(option.value)}
              className={`
                py-3 px-4 rounded-lg text-center font-medium transition-all
                ${selectedTimeframe === option.value 
                  ? 'bg-primary text-primary-foreground' 
                  : 'bg-muted text-foreground hover:bg-muted/80'
                }
              `}
            >
              {option.label}
            </button>
          ))}
        </div>
      </DialogContent>
    </Dialog>

    {/* Chart Type Selection Dialog */}
    <Dialog open={isChartTypeDialogOpen} onOpenChange={setIsChartTypeDialogOpen}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t("chart_type")}</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3 pt-4">
          {chartTypeOptions.map((option) => {
            const Icon = option.icon;
            return (
              <button
                key={option.value}
                onClick={() => handleChartTypeSelect(option.value)}
                className={`
                  flex items-center justify-center gap-3 py-4 px-4 rounded-lg font-medium transition-all
                  ${selectedChartType === option.value 
                    ? 'bg-primary text-primary-foreground' 
                    : 'bg-muted text-foreground hover:bg-muted/80'
                  }
                `}
              >
                <Icon className="h-5 w-5" />
                <span>{option.label}</span>
              </button>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
    </>
    </TradeProvider>
  );
};

export default Index;
