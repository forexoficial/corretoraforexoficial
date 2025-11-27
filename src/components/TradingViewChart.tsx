import { useRef, useEffect } from "react";
import { ChartProvider, useChartContext } from "@/contexts/ChartContext";
import { ChartCore } from "./chart/ChartCore";
import { ChartIndicators } from "./chart/ChartIndicators";
import { ChartControls } from "./chart/ChartControls";
import { ChartDataManager } from "./chart/ChartDataManager";
import { TradeMarker } from "./TradeMarker";
import { TradeNotification } from "./TradeNotification";
import { WorldMapBackground } from "./WorldMapBackground";
import { CandleTimeIndicator } from "./CandleTimeIndicator";
import { LoadingSpinner } from "./LoadingSpinner";
import { useChartAppearance } from "@/hooks/useChartAppearance";
import { useIsMobile } from "@/hooks/use-mobile";
import type { IndicatorSettings } from "./IndicatorsPanel";
import type { DrawingTool } from "@/hooks/useChartDrawing";
import type { PriceLineConfig } from "./PriceLineSettings";

interface TradingViewChartProps {
  assetId: string;
  assetName: string;
  timeframe?: string;
  height?: number;
  onAssetChange?: (assetId: string) => void;
  onCurrentPriceUpdate?: (price: number) => void;
  indicatorSettings?: IndicatorSettings;
  drawingTool?: DrawingTool;
  onDrawingToolChange?: (tool: DrawingTool) => void;
  onClearDrawings?: () => void;
  onHasDrawingsChange?: (hasDrawings: boolean) => void;
  drawingStyle?: { color: string; lineWidth: number; lineStyle: "solid" | "dashed" | "dotted" };
  priceLineConfig?: PriceLineConfig;
}

const TradingViewChartInner = ({
  assetId,
  assetName,
  timeframe = "1m",
  height = 600,
  onAssetChange,
  onCurrentPriceUpdate,
  indicatorSettings,
  drawingTool = "select",
  onDrawingToolChange,
  onClearDrawings,
  onHasDrawingsChange,
  drawingStyle,
  priceLineConfig
}: TradingViewChartProps) => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const {
    chartRef,
    candleSeriesRef,
    isLoading,
    currentPrice,
    currentCandleTime,
    activeTrades,
    completedTradeNotification,
    setCompletedTradeNotification,
    tradeLinesRef
  } = useChartContext();
  
  const { settings: appearanceSettings } = useChartAppearance();
  const isMobile = useIsMobile();

  // Handle trade expiration
  const handleTradeExpire = (tradeId: string) => {
    console.log('[TradingViewChart] Trade expired:', tradeId);
    const line = tradeLinesRef.current.get(tradeId);
    if (line && candleSeriesRef.current) {
      candleSeriesRef.current.removePriceLine(line);
    }
    tradeLinesRef.current.delete(tradeId);
  };

  // Notify parent of asset change
  useEffect(() => {
    onAssetChange?.(assetId);
  }, [assetId, onAssetChange]);

  // Handle clear drawings command
  useEffect(() => {
    if (onClearDrawings) {
      const clearHandler = () => {
        (window as any).__clearChartDrawings?.();
      };
      (window as any).__triggerClearDrawings = clearHandler;
    }
  }, [onClearDrawings]);

  return (
    <div className="relative w-full h-full" style={{ height: `${height}px` }}>
      {/* Background */}
      {appearanceSettings?.map_enabled && (
        <WorldMapBackground
          imageUrl={appearanceSettings.map_image_url}
          opacity={appearanceSettings.map_opacity}
          primaryColor={appearanceSettings.map_primary_color}
          secondaryColor={appearanceSettings.map_secondary_color}
          showGrid={appearanceSettings.map_show_grid}
          gridOpacity={appearanceSettings.map_grid_opacity}
        />
      )}

      {/* Chart Container */}
      <div
        ref={chartContainerRef}
        className="relative w-full h-full"
        style={{
          background: 'transparent',
        }}
      />

      {/* Chart Core - Initialize and manage chart lifecycle */}
      <ChartCore
        assetId={assetId}
        timeframe={timeframe}
        height={height}
        containerRef={chartContainerRef}
        drawingTool={drawingTool}
        onDrawingToolChange={onDrawingToolChange}
        priceLineConfig={priceLineConfig}
        drawingStyle={drawingStyle}
      />

      {/* Chart Data Manager - Load candles, trades, subscriptions */}
      <ChartDataManager
        assetId={assetId}
        timeframe={timeframe}
        onCurrentPriceUpdate={onCurrentPriceUpdate}
      />

      {/* Chart Indicators - Render technical indicators */}
      <ChartIndicators settings={indicatorSettings} />

      {/* Loading State */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/50 backdrop-blur-sm z-50">
          <LoadingSpinner />
        </div>
      )}

      {/* Candle Time Indicator */}
      <CandleTimeIndicator
        chartRef={chartRef}
        candleSeriesRef={candleSeriesRef}
        containerRef={chartContainerRef}
        currentCandleTime={currentCandleTime}
        timeframe={timeframe}
      />

      {/* Trade Markers */}
      {activeTrades.map((trade) => (
        <TradeMarker
          key={trade.id}
          trade={trade}
          currentPrice={currentPrice}
          onExpire={handleTradeExpire}
        />
      ))}

      {/* Trade Notification */}
      {completedTradeNotification && (
        <TradeNotification
          trade={{
            id: completedTradeNotification.tradeId || '',
            status: completedTradeNotification.status,
            result: completedTradeNotification.result,
            amount: completedTradeNotification.amount,
          }}
          onClose={() => setCompletedTradeNotification(null)}
        />
      )}

      {/* Chart Controls */}
      <ChartControls />

      {/* Watermark */}
      {appearanceSettings?.watermark_visible && appearanceSettings?.watermark_text && (
        <div className="absolute bottom-4 left-4 text-muted-foreground/30 text-sm font-medium pointer-events-none select-none">
          {appearanceSettings.watermark_text}
        </div>
      )}
    </div>
  );
};

export function TradingViewChart(props: TradingViewChartProps) {
  return (
    <ChartProvider>
      <TradingViewChartInner {...props} />
    </ChartProvider>
  );
}
