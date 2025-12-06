import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { createChart, IChartApi, CandlestickData, Time, CandlestickSeries, IPriceLine, LineSeries, HistogramSeries } from "lightweight-charts";
import { supabase } from "@/integrations/supabase/client";
import { TradeMarker } from "./TradeMarker";
import { TradeResultPopup } from "./TradeResultPopup";
import { WorldMapBackground } from "./WorldMapBackground";
import { CandleTimeIndicator } from "./CandleTimeIndicator";
import { ChartZoomControls } from "./ChartZoomControls";
import { useChartAppearance } from "@/hooks/useChartAppearance";
import { useTheme } from "next-themes";
import { calculateSMA, calculateEMA, calculateRSI, calculateBollingerBands, calculateMACD } from "@/utils/technicalIndicators";
import type { IndicatorSettings } from "./IndicatorsPanel";
import { useChartDrawing, DrawingTool } from "@/hooks/useChartDrawing";
import type { PriceLineConfig } from "./PriceLineSettings";
import { useIsMobile } from "@/hooks/use-mobile";
import { useTranslation } from "@/hooks/useTranslation";
import { candleCache, deduplicateRequest } from "@/utils/requestOptimization";
import { useFullscreen } from "@/hooks/useFullscreen";

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

export function TradingViewChart({ 
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
}: TradingViewChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candleSeriesRef = useRef<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const autoGenerateIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const smoothAnimationIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const currentCandleRef = useRef<any>(null);
  const [currentCandleTime, setCurrentCandleTime] = useState<number>(0);
  const candleCheckIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const [activeTrades, setActiveTrades] = useState<any[]>([]);
  const tradeLinesRef = useRef<Map<string, IPriceLine>>(new Map());
  const notifiedTradesRef = useRef<Set<string>>(new Set());
  const [userId, setUserId] = useState<string | null>(null);
  const [completedTradeNotification, setCompletedTradeNotification] = useState<any>(null);
  const [currentPrice, setCurrentPrice] = useState<number>(0);
  const { settings: appearanceSettings } = useChartAppearance();
  const { theme } = useTheme();
  const isMobile = useIsMobile();
  const isFullscreen = useFullscreen();
  const { t } = useTranslation();
  
  // Drawing tools
  const drawing = useChartDrawing(chartRef, candleSeriesRef, assetId, timeframe);
  
  // Indicator series refs
  const indicatorSeriesRef = useRef<{
    sma?: any;
    ema?: any;
    rsi?: any;
    bbUpper?: any;
    bbMiddle?: any;
    bbLower?: any;
    macdLine?: any;
    macdSignal?: any;
    macdHistogram?: any;
  }>({});
  
  // Determine which color set to use based on theme
  const isDarkMode = theme === 'dark' || theme === 'system';
  
  // Check if responsive mode is enabled
  const isResponsiveMode = useMemo(() => {
    if (!appearanceSettings) return { desktop: false, mobile: true, fullscreen: true };
    return {
      desktop: appearanceSettings.chart_responsive_desktop ?? false,
      mobile: appearanceSettings.chart_responsive_mobile ?? true,
      fullscreen: appearanceSettings.chart_responsive_fullscreen ?? true,
    };
  }, [appearanceSettings]);

  // Calculate effective chart height based on settings (mobile, desktop, or fullscreen)
  const effectiveHeight = useMemo(() => {
    if (!appearanceSettings) return height;
    
    // If responsive mode is enabled, return null to let CSS handle it
    if (isMobile && isResponsiveMode.mobile) {
      return null; // Will use flex-grow
    }
    if (isFullscreen && isResponsiveMode.fullscreen) {
      return null; // Will use flex-grow
    }
    if (!isMobile && !isFullscreen && isResponsiveMode.desktop) {
      return null; // Will use flex-grow
    }
    
    // Fixed height mode
    if (isMobile) {
      return appearanceSettings.chart_height_mobile || 350;
    }
    if (isFullscreen) {
      return appearanceSettings.chart_height_fullscreen || 800;
    }
    return appearanceSettings.chart_height_desktop || height;
  }, [isMobile, isFullscreen, appearanceSettings, height, isResponsiveMode]);

  // Calculate width percentage
  const widthPercentage = useMemo(() => {
    if (!appearanceSettings) return 100;
    
    // Responsive mode always uses 100%
    if (isMobile && isResponsiveMode.mobile) return 100;
    if (isFullscreen && isResponsiveMode.fullscreen) return 100;
    if (!isMobile && !isFullscreen && isResponsiveMode.desktop) return 100;
    
    if (isMobile) {
      return appearanceSettings.chart_width_percentage_mobile || 100;
    }
    if (isFullscreen) {
      return appearanceSettings.chart_width_percentage_fullscreen || 100;
    }
    return appearanceSettings.chart_width_percentage_desktop || 100;
  }, [isMobile, isFullscreen, appearanceSettings, isResponsiveMode]);

  // Calculate aspect ratio
  const aspectRatio = useMemo(() => {
    if (!appearanceSettings) return null;
    
    // Responsive mode doesn't use fixed aspect ratio
    if (isMobile && isResponsiveMode.mobile) return null;
    if (isFullscreen && isResponsiveMode.fullscreen) return null;
    if (!isMobile && !isFullscreen && isResponsiveMode.desktop) return null;
    
    let ratio: string | null = null;
    if (isMobile) {
      ratio = appearanceSettings.chart_aspect_ratio_mobile;
    } else if (isFullscreen) {
      ratio = appearanceSettings.chart_aspect_ratio_fullscreen;
    } else {
      ratio = appearanceSettings.chart_aspect_ratio_desktop;
    }
    if (!ratio || ratio === 'auto') return null;
    const [w, h] = ratio.split(':').map(Number);
    return w / h;
  }, [isMobile, isFullscreen, appearanceSettings, isResponsiveMode]);

  // Check if current mode uses responsive
  const useResponsive = useMemo(() => {
    if (isMobile) return isResponsiveMode.mobile;
    if (isFullscreen) return isResponsiveMode.fullscreen;
    return isResponsiveMode.desktop;
  }, [isMobile, isFullscreen, isResponsiveMode]);
  
  // Get theme-specific colors
  const getThemeColor = (lightColor: string, darkColor: string) => {
    return isDarkMode ? darkColor : lightColor;
  };
  
  const chartBgColor = appearanceSettings 
    ? getThemeColor(appearanceSettings.chart_bg_color_light, appearanceSettings.chart_bg_color_dark)
    : (isDarkMode ? '#0a0a0a' : '#ffffff');
    
  const chartTextColor = appearanceSettings
    ? getThemeColor(appearanceSettings.chart_text_color_light, appearanceSettings.chart_text_color_dark)
    : (isDarkMode ? '#d1d4dc' : '#1a1a1a');
    
  const gridVertColor = appearanceSettings
    ? getThemeColor(appearanceSettings.grid_vert_color_light, appearanceSettings.grid_vert_color_dark)
    : (isDarkMode ? '#1e1e1e' : '#e5e5e5');
    
  const gridHorzColor = appearanceSettings
    ? getThemeColor(appearanceSettings.grid_horz_color_light, appearanceSettings.grid_horz_color_dark)
    : (isDarkMode ? '#1e1e1e' : '#e5e5e5');
    
  const candleUpColor = appearanceSettings
    ? getThemeColor(appearanceSettings.candle_up_color_light, appearanceSettings.candle_up_color_dark)
    : '#22c55e';
    
  const candleDownColor = appearanceSettings
    ? getThemeColor(appearanceSettings.candle_down_color_light, appearanceSettings.candle_down_color_dark)
    : '#ef4444';
    
  const priceScaleBorderColor = appearanceSettings
    ? getThemeColor(appearanceSettings.price_scale_border_color_light, appearanceSettings.price_scale_border_color_dark)
    : (isDarkMode ? '#2B2B43' : '#d1d5db');
    
  const timeScaleBorderColor = appearanceSettings
    ? getThemeColor(appearanceSettings.time_scale_border_color_light, appearanceSettings.time_scale_border_color_dark)
    : (isDarkMode ? '#2B2B43' : '#d1d5db');
    
  const crosshairColor = appearanceSettings
    ? getThemeColor(appearanceSettings.crosshair_color_light, appearanceSettings.crosshair_color_dark)
    : (isDarkMode ? '#758696' : '#6b7280');

  // Control TradingView logo visibility based on settings
  useEffect(() => {
    const tvLogo = document.getElementById('tv-attr-logo');
    if (tvLogo) {
      tvLogo.style.display = appearanceSettings?.show_tradingview_logo ? 'block' : 'none';
    }
  }, [appearanceSettings?.show_tradingview_logo]);

  // Get user ID on mount
  useEffect(() => {
    const getUserId = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUserId(user?.id || null);
    };
    getUserId();
  }, []);

  // Notify parent of asset change
  useEffect(() => {
    onAssetChange?.(assetId);
  }, [assetId, onAssetChange]);

  // Sync drawing tool to window ref without recreating chart
  useEffect(() => {
    console.log('[TradingViewChart] Setting drawingTool to window:', drawingTool);
    (window as any).__currentDrawingTool = drawingTool;
  }, [drawingTool]);

  // Debug: Log indicatorSettings changes
  useEffect(() => {
    console.log('[TradingViewChart] indicatorSettings changed:', indicatorSettings);
  }, [indicatorSettings]);

  // Load active trades whenever userId, assetId, or timeframe changes
  useEffect(() => {
    if (userId && candleSeriesRef.current) {
      console.log('[LoadActiveTrades] Recarregando trades ativos:', { userId, assetId, timeframe });
      loadActiveTrades();
    }
  }, [userId, assetId, timeframe]);

  // Re-render indicators when settings change
  useEffect(() => {
    if (!chartRef.current || !candleSeriesRef.current || !indicatorSettings) return;
    
    // Get current candle data from the series
    const currentData = candleSeriesRef.current.data();
    if (currentData && currentData.length > 0) {
      renderIndicators(currentData);
    }
  }, [indicatorSettings]);

  // Update hasDrawings when drawings change
  useEffect(() => {
    onHasDrawingsChange?.(drawing.drawings.length > 0);
  }, [drawing.drawings, onHasDrawingsChange]);

  // Update drawing style when prop changes
  useEffect(() => {
    if (drawingStyle) {
      drawing.setCurrentStyle(drawingStyle);
    }
  }, [drawingStyle, drawing]);

  // Handle clear drawings command - always set up the handler
  useEffect(() => {
    const clearHandler = () => {
      drawing.clearAllDrawings();
    };
    // Store the handler so it can be called from parent
    (window as any).__clearChartDrawings = clearHandler;
  }, [drawing]);

  useEffect(() => {
    if (!chartContainerRef.current || !appearanceSettings) return;

    // Determine chart height - use container height for responsive mode
    const chartHeight = effectiveHeight ?? (chartContainerRef.current.clientHeight || 400);

    // Create chart with dynamic settings based on theme
    const chart = createChart(chartContainerRef.current, {
      width: chartContainerRef.current.clientWidth * (widthPercentage / 100),
      height: chartHeight,
      layout: {
        background: { color: 'transparent' },
        textColor: chartTextColor,
      },
      grid: {
        vertLines: { color: gridVertColor },
        horzLines: { color: gridHorzColor },
      },
      crosshair: {
        mode: 1,
      },
      rightPriceScale: {
        borderColor: priceScaleBorderColor,
      },
      timeScale: {
        borderColor: timeScaleBorderColor,
        timeVisible: true,
        secondsVisible: false,
        rightOffset: 12,
        barSpacing: 12,        // Espaçamento maior para candles mais visíveis
        minBarSpacing: 6,      // Espaçamento mínimo maior para evitar candles minúsculos
        fixLeftEdge: false,
        fixRightEdge: false,
        lockVisibleTimeRangeOnResize: true,
        rightBarStaysOnScroll: true,
      },
      localization: {
        locale: 'pt-BR',
        timeFormatter: (timestamp: number) => {
          // Converter Unix timestamp para horário de São Paulo (UTC-3)
          const date = new Date(timestamp * 1000);
          return date.toLocaleString('pt-BR', { 
            timeZone: 'America/Sao_Paulo',
            hour: '2-digit',
            minute: '2-digit',
            day: '2-digit',
            month: '2-digit'
          });
        }
      }
    });

    // Use the v5 API for adding candlestick series with theme-specific colors
    const candleBorderUpColor = appearanceSettings 
      ? getThemeColor(appearanceSettings.candle_border_up_color_light, appearanceSettings.candle_border_up_color_dark)
      : candleUpColor;
      
    const candleBorderDownColor = appearanceSettings 
      ? getThemeColor(appearanceSettings.candle_border_down_color_light, appearanceSettings.candle_border_down_color_dark)
      : candleDownColor;
    
    const wickUpColor = appearanceSettings 
      ? getThemeColor(appearanceSettings.wick_up_color_light, appearanceSettings.wick_up_color_dark)
      : candleUpColor;
      
    const wickDownColor = appearanceSettings 
      ? getThemeColor(appearanceSettings.wick_down_color_light, appearanceSettings.wick_down_color_dark)
      : candleDownColor;
    
    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor: candleUpColor,
      downColor: candleDownColor,
      borderVisible: appearanceSettings?.candle_border_visible ?? false,
      borderUpColor: candleBorderUpColor,
      borderDownColor: candleBorderDownColor,
      wickUpColor: wickUpColor,
      wickDownColor: wickDownColor,
      priceLineVisible: priceLineConfig?.visible ?? true,
      priceLineColor: priceLineConfig?.color ?? '#ffffff',
      priceLineWidth: (priceLineConfig?.width ?? 1) as any,
      priceLineStyle: priceLineConfig?.style ?? 2,
    });

    chartRef.current = chart;
    candleSeriesRef.current = candleSeries;
    
    // Initialize drawing overlay
    if (chartContainerRef.current) {
      drawing.initializeOverlay(chartContainerRef.current);
    }

    // Helper function to get point from coordinates
    const getPointFromCoordinates = (x: number, y: number) => {
      const price = candleSeries.coordinateToPrice(y);
      const time = chart.timeScale().coordinateToTime(x);
      if (!price || !time) return null;
      return { price, time: time as number };
    };

    // Handle drawing tool clicks (for horizontal/vertical lines only)
    const handleChartClick = (param: any) => {
      const currentDrawingTool = (window as any).__currentDrawingTool || 'select';
      const isDragging = drawing.isDraggingRef.current;
      
      // Skip click handling for drag-based tools or if dragging
      if (currentDrawingTool === 'select' || !param || !param.point || isDragging) {
        return;
      }
      
      // Only handle click for horizontal and vertical lines
      if (currentDrawingTool !== 'horizontal' && currentDrawingTool !== 'vertical') {
        return;
      }
      
      const point = getPointFromCoordinates(param.point.x, param.point.y);
      if (!point) return;
      
      console.log('[Chart Click] Creating line:', currentDrawingTool, point);
      drawing.startDrawing(currentDrawingTool, point);
      setTimeout(() => drawing.completeDrawing(currentDrawingTool), 50);
    };

    // Handle mouse/touch events for drag-based drawing (trendline, rectangle, fibonacci)
    const handleMouseDown = (e: MouseEvent) => {
      const currentDrawingTool = (window as any).__currentDrawingTool || 'select';
      
      // Only handle drag for trendline, rectangle, fibonacci
      if (!['trendline', 'rectangle', 'fibonacci'].includes(currentDrawingTool)) {
        return;
      }
      
      const rect = chartContainerRef.current?.getBoundingClientRect();
      if (!rect) return;
      
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const point = getPointFromCoordinates(x, y);
      
      if (!point) return;
      
      console.log('[Mouse Down] Starting drag drawing:', currentDrawingTool, point);
      
      // Disable chart scrolling/panning while drawing
      chart.applyOptions({
        handleScroll: false,
        handleScale: false,
      });
      
      drawing.startDragDrawing(currentDrawingTool, point);
      
      // Prevent chart from panning while drawing
      e.preventDefault();
      e.stopPropagation();
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!drawing.isDraggingRef.current) return;
      
      const rect = chartContainerRef.current?.getBoundingClientRect();
      if (!rect) return;
      
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const point = getPointFromCoordinates(x, y);
      
      if (point) {
        drawing.updateDragPoint(point);
      }
      
      e.preventDefault();
      e.stopPropagation();
    };

    const handleMouseUp = () => {
      if (drawing.isDraggingRef.current) {
        console.log('[Mouse Up] Ending drag drawing');
        drawing.endDragDrawing();
      }
      
      // Always re-enable chart scrolling/panning on mouse up
      chart.applyOptions({
        handleScroll: true,
        handleScale: true,
      });
    };

    // Touch event handlers for mobile
    const handleTouchStart = (e: TouchEvent) => {
      const currentDrawingTool = (window as any).__currentDrawingTool || 'select';
      
      if (!['trendline', 'rectangle', 'fibonacci'].includes(currentDrawingTool)) {
        return;
      }
      
      const touch = e.touches[0];
      const rect = chartContainerRef.current?.getBoundingClientRect();
      if (!rect || !touch) return;
      
      const x = touch.clientX - rect.left;
      const y = touch.clientY - rect.top;
      const point = getPointFromCoordinates(x, y);
      
      if (!point) return;
      
      console.log('[Touch Start] Starting drag drawing:', currentDrawingTool, point);
      
      // Disable chart scrolling/panning while drawing
      chart.applyOptions({
        handleScroll: false,
        handleScale: false,
      });
      
      drawing.startDragDrawing(currentDrawingTool, point);
      
      e.preventDefault();
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!drawing.isDraggingRef.current) return;
      
      const touch = e.touches[0];
      const rect = chartContainerRef.current?.getBoundingClientRect();
      if (!rect || !touch) return;
      
      const x = touch.clientX - rect.left;
      const y = touch.clientY - rect.top;
      const point = getPointFromCoordinates(x, y);
      
      if (point) {
        drawing.updateDragPoint(point);
      }
      
      e.preventDefault();
    };

    const handleTouchEnd = () => {
      if (drawing.isDraggingRef.current) {
        console.log('[Touch End] Ending drag drawing');
        drawing.endDragDrawing();
      }
      
      // Always re-enable chart scrolling/panning on touch end
      chart.applyOptions({
        handleScroll: true,
        handleScale: true,
      });
    };

    // Subscribe to click events (for horizontal/vertical lines)
    chart.subscribeClick(handleChartClick);

    // Add mouse/touch event listeners for drag-based drawing
    const container = chartContainerRef.current;
    if (container) {
      container.addEventListener('mousedown', handleMouseDown);
      container.addEventListener('mousemove', handleMouseMove);
      container.addEventListener('mouseup', handleMouseUp);
      container.addEventListener('mouseleave', handleMouseUp);
      container.addEventListener('touchstart', handleTouchStart, { passive: false });
      container.addEventListener('touchmove', handleTouchMove, { passive: false });
      container.addEventListener('touchend', handleTouchEnd);
    }
    
    // Global listeners to catch mouse/touch release outside chart
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('touchend', handleTouchEnd);

    // Handle ESC key to cancel drawing
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        drawing.cancelDrawing();
        onDrawingToolChange?.('select');
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    // Handle resize with ResizeObserver for responsive mode
    let resizeObserver: ResizeObserver | null = null;
    
    const handleResize = () => {
      if (chartContainerRef.current && chartRef.current) {
        const newWidth = chartContainerRef.current.clientWidth;
        const newHeight = useResponsive 
          ? chartContainerRef.current.clientHeight || chartHeight
          : chartHeight;
        
        chartRef.current.applyOptions({
          width: newWidth,
          height: newHeight,
        });
      }
    };

    // Use ResizeObserver for responsive mode
    if (useResponsive && chartContainerRef.current) {
      resizeObserver = new ResizeObserver((entries) => {
        for (const entry of entries) {
          if (entry.target === chartContainerRef.current) {
            handleResize();
          }
        }
      });
      resizeObserver.observe(chartContainerRef.current);
    }

    window.addEventListener('resize', handleResize);

    // Load initial data
    loadCandles();

    // Setup auto-generation
    setupAutoGeneration();

    // Load active trades is now handled by separate useEffect

    // Subscribe to realtime updates
    const channel = supabase
      .channel('candles-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'candles',
          filter: `asset_id=eq.${assetId}`
        },
        (payload) => {
          console.log('Candle update:', payload);
          handleCandleUpdate(payload);
        }
      )
      .subscribe();

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('keydown', handleKeyDown);
      
      // Remove mouse/touch event listeners
      if (container) {
        container.removeEventListener('mousedown', handleMouseDown);
        container.removeEventListener('mousemove', handleMouseMove);
        container.removeEventListener('mouseup', handleMouseUp);
        container.removeEventListener('mouseleave', handleMouseUp);
        container.removeEventListener('touchstart', handleTouchStart);
        container.removeEventListener('touchmove', handleTouchMove);
        container.removeEventListener('touchend', handleTouchEnd);
      }
      
      // Remove global listeners
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('touchend', handleTouchEnd);
      
      if (resizeObserver) {
        resizeObserver.disconnect();
      }
      chart.remove();
      chartRef.current = null;
      candleSeriesRef.current = null;
      supabase.removeChannel(channel);
      if (autoGenerateIntervalRef.current) {
        clearInterval(autoGenerateIntervalRef.current);
      }
      if (smoothAnimationIntervalRef.current) {
        clearInterval(smoothAnimationIntervalRef.current);
      }
      if (candleCheckIntervalRef.current) {
        clearInterval(candleCheckIntervalRef.current);
      }
      // Clear trade lines
      tradeLinesRef.current.clear();
    };
  }, [assetId, timeframe, effectiveHeight, widthPercentage, userId, appearanceSettings, theme, chartTextColor, gridVertColor, gridHorzColor, candleUpColor, candleDownColor, priceScaleBorderColor, timeScaleBorderColor, priceLineConfig, useResponsive]);

  // Função para processar candles carregados (do cache ou DB)
  const processLoadedCandles = useCallback((candles: any[]) => {
    if (!candles || candles.length === 0 || !candleSeriesRef.current) return;

    // Garantir que os candles estejam em ordem cronológica crescente
    const sortedCandles = [...candles].sort((a, b) =>
      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );

    const chartData: CandlestickData<Time>[] = sortedCandles.map((c) => {
      const timestamp = new Date(c.timestamp).getTime() / 1000;
      return {
        time: timestamp as Time,
        open: Number(c.open),
        high: Number(c.high),
        low: Number(c.low),
        close: Number(c.close),
      };
    });

    candleSeriesRef.current.setData(chartData);
    
    // Notify parent of current price and update internal state
    if (chartData.length > 0) {
      const lastCandle = chartData[chartData.length - 1];
      setCurrentPrice(lastCandle.close);
      if (onCurrentPriceUpdate) {
        onCurrentPriceUpdate(lastCandle.close);
      }
    }
    
    // Render technical indicators if enabled
    if (indicatorSettings && chartRef.current) {
      renderIndicators(chartData);
    }
    
    // Set initial zoom to focus on recent candles with right padding
    if (chartRef.current && chartData.length > 0) {
      const visibleCandles = getVisibleCandlesForTimeframe(timeframe);
      const from = Math.max(0, chartData.length - visibleCandles);
      const to = chartData.length - 1;
      
      setTimeout(() => {
        chartRef.current?.timeScale().setVisibleLogicalRange({ from, to });
        chartRef.current?.timeScale().scrollToPosition(3, false);
      }, 100);
    }
    
    // Start animation for the most recent candle
    const lastCandle = sortedCandles[sortedCandles.length - 1];
    startSmoothAnimation(lastCandle, timeframe);
    
    // Load active trades after candles are loaded
    if (userId) {
      setTimeout(() => loadActiveTrades(), 200);
    }
  }, [timeframe, userId, indicatorSettings, onCurrentPriceUpdate]);

  const loadCandles = async () => {
    setIsLoading(true);
    const cacheKey = `candles-${assetId}-${timeframe}`;
    
    try {
      // Verificar cache primeiro
      const cachedCandles = candleCache.get(cacheKey);
      if (cachedCandles && cachedCandles.length > 0) {
        console.log('[LoadCandles] Usando cache:', cacheKey);
        processLoadedCandles(cachedCandles);
        setIsLoading(false);
        return;
      }

      // Carregar quantidade padrão de 300 candles para todos os timeframes
      const candleLimitMap: Record<string, number> = {
        '10s': 300,
        '30s': 300,
        '1m': 300,
        '5m': 300
      };
      const candleLimit = candleLimitMap[timeframe] || 300;

      // Deduplicate concurrent requests
      const result = await deduplicateRequest(
        cacheKey,
        async () => {
          const response = await supabase
            .from('candles')
            .select('*')
            .eq('asset_id', assetId)
            .eq('timeframe', timeframe)
            .order('timestamp', { ascending: false })
            .limit(candleLimit);
          return response;
        }
      );
      
      const { data: candles, error } = result as any;

      if (error) {
        console.error('Error loading candles:', error);
        await generateInitialCandles();
        return;
      }

      if (candles && candles.length > 0) {
        // Salvar no cache
        candleCache.set(cacheKey, candles);
        processLoadedCandles(candles);
      } else {
        await generateInitialCandles();
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const generateInitialCandles = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('generate-candles', {
        body: { assetId, timeframe, count: 200 }
      });

      if (error) throw error;

      // Reload candles after generation
      setTimeout(() => loadCandles(), 1000);
    } catch (error) {
      console.error('Error generating candles:', error);
    }
  };

  const startSmoothAnimation = (candle: any, tf: string) => {
    // Clear existing animation
    if (smoothAnimationIntervalRef.current) {
      clearInterval(smoothAnimationIntervalRef.current);
    }

    currentCandleRef.current = candle;
    
    // Start a new countdown period from now for the time indicator
    const periodStart = Date.now();
    setCurrentCandleTime(periodStart);

    // Professional smooth animation system
    const ANIMATION_FPS = 60; // 60 FPS for ultra-smooth movement
    const FRAME_INTERVAL = 1000 / ANIMATION_FPS; // ~16ms per frame
    
    // Calculate volatility intervals for target price changes
    const getTargetChangeInterval = (timeframe: string): number => {
      const intervals: Record<string, number> = {
        '10s': 800,   // New target every 0.8s
        '30s': 1500,  // New target every 1.5s
        '1m': 2000,   // New target every 2s
        '5m': 3000    // New target every 3s
      };
      return intervals[timeframe] || 2000;
    };

    let targetPrice = Number(candle.close);
    let currentPrice = Number(candle.close);
    let lastTargetUpdate = Date.now();
    const targetInterval = getTargetChangeInterval(tf);

    // Smooth interpolation animation at 60 FPS
    smoothAnimationIntervalRef.current = setInterval(() => {
      if (!candleSeriesRef.current || !currentCandleRef.current) return;

      const current = currentCandleRef.current;
      const now = Date.now();
      
      // Update target price at regular intervals for realistic volatility
      if (now - lastTargetUpdate >= targetInterval) {
        const open = Number(current.open);
        const high = Number(current.high);
        const low = Number(current.low);
        const range = high - low;
        const volatility = range * 0.3; // 30% of the range
        
        // Generate new random target within boundaries
        const randomChange = (Math.random() - 0.5) * volatility;
        targetPrice = currentPrice + randomChange;
        targetPrice = Math.max(low, Math.min(high, targetPrice));
        
        lastTargetUpdate = now;
      }
      
      // Smooth interpolation towards target (easing function)
      // Use exponential smoothing for natural deceleration
      const smoothingFactor = 0.15; // Higher = faster movement, lower = smoother
      const priceDiff = targetPrice - currentPrice;
      currentPrice += priceDiff * smoothingFactor;
      
      // Update candle boundaries if needed
      const newHigh = Math.max(Number(current.high), currentPrice);
      const newLow = Math.min(Number(current.low), currentPrice);
      
      const timestamp = new Date(current.timestamp).getTime() / 1000;
      
      const updatedCandle: CandlestickData<Time> = {
        time: timestamp as Time,
        open: Number(current.open),
        high: newHigh,
        low: newLow,
        close: currentPrice,
      };

      // Update local reference
      currentCandleRef.current.close = currentPrice;
      currentCandleRef.current.high = newHigh;
      currentCandleRef.current.low = newLow;
      
      try {
        candleSeriesRef.current.update(updatedCandle);
      } catch (error) {
        // Silently ignore update errors during animation
      }
      
      // CRITICAL: Notify parent with smooth price updates for accurate P&L
      setCurrentPrice(currentPrice);
      if (onCurrentPriceUpdate) {
        onCurrentPriceUpdate(currentPrice);
      }
    }, FRAME_INTERVAL);
  };

  const handleCandleUpdate = (payload: any) => {
    if (!candleSeriesRef.current) return;

    // Security check: only process candles for the current timeframe
    const candle = payload.new;
    if (candle.timeframe !== timeframe) {
      return;
    }

    const newTimestamp = new Date(candle.timestamp).getTime() / 1000;
    
    // CRITICAL: Check if this candle is newer than current to prevent "Cannot update oldest data" error
    if (currentCandleRef.current) {
      const currentTimestamp = new Date(currentCandleRef.current.timestamp).getTime() / 1000;
      if (newTimestamp < currentTimestamp) {
        console.log('[CandleUpdate] Ignorando candle antigo:', newTimestamp, 'atual:', currentTimestamp);
        return;
      }
    }

    const candleData: CandlestickData<Time> = {
      time: newTimestamp as Time,
      open: Number(candle.open),
      high: Number(candle.high),
      low: Number(candle.low),
      close: Number(candle.close),
    };

    try {
      candleSeriesRef.current.update(candleData);
      
      // Notify parent of price update
      if (onCurrentPriceUpdate) {
        onCurrentPriceUpdate(Number(candle.close));
      }
      
      startSmoothAnimation(candle, timeframe);
    } catch (error) {
      console.warn('[CandleUpdate] Erro ao atualizar candle (provavelmente ordem temporal):', error);
    }
  };

  const setupAutoGeneration = async () => {
    try {
      // Check if auto-generation is enabled for this asset
      const { data: asset } = await supabase
        .from('assets')
        .select('auto_generate_candles')
        .eq('id', assetId)
        .single();

      if (!asset?.auto_generate_candles) {
        console.log('Auto-generation disabled for this asset');
        return;
      }

      // Get timeframe in milliseconds
      const timeframeMs = getTimeframeMs(timeframe);

      // Generate new candles at the appropriate interval
      autoGenerateIntervalRef.current = setInterval(async () => {
        console.log('Auto-generating candle...');
        try {
          await supabase.functions.invoke('generate-candles', {
            body: { assetId, timeframe, count: 1 }
          });
        } catch (error) {
          console.error('Error auto-generating candle:', error);
        }
      }, timeframeMs);

      // Setup active candle checking - verifica a cada 5 segundos (otimizado de 3s)
      let lastCandleCheckTime = 0;
      candleCheckIntervalRef.current = setInterval(async () => {
        if (!currentCandleRef.current) return;
        
        // Rate limiting: não verificar mais de uma vez a cada 5 segundos
        const now = Date.now();
        if (now - lastCandleCheckTime < 5000) return;
        lastCandleCheckTime = now;
        
        const currentCandleTimestamp = currentCandleRef.current.timestamp;
        const candleEndTime = new Date(currentCandleTimestamp).getTime() + timeframeMs;
        
        // Se o candle expirou (passou o tempo), busca o próximo
        if (now >= candleEndTime) {
          const cacheKey = `candle-check-${assetId}-${timeframe}`;
          try {
            const result = await deduplicateRequest(
              cacheKey,
              async () => {
                const response = await supabase
                  .from('candles')
                  .select('*')
                  .eq('asset_id', assetId)
                  .eq('timeframe', timeframe)
                  .gt('timestamp', currentCandleTimestamp)
                  .order('timestamp', { ascending: false })
                  .limit(1);
                return response;
              }
            );
            
            const { data: newCandles, error } = result as any;

            if (error) {
              console.error('[Candle Check] Erro:', error);
              return;
            }

            if (newCandles && newCandles.length > 0) {
              const newCandle = newCandles[0];
              const timestamp = new Date(newCandle.timestamp).getTime() / 1000;
              const candleData: CandlestickData<Time> = {
                time: timestamp as Time,
                open: Number(newCandle.open),
                high: Number(newCandle.high),
                low: Number(newCandle.low),
                close: Number(newCandle.close),
              };

              if (candleSeriesRef.current) {
                try {
                  candleSeriesRef.current.update(candleData);
                  if (onCurrentPriceUpdate) {
                    onCurrentPriceUpdate(Number(newCandle.close));
                  }
                  startSmoothAnimation(newCandle, timeframe);
                } catch (error) {
                  // Silently ignore update errors
                }
              }
            }
          } catch (error) {
            console.error('[Candle Check] Erro:', error);
          }
        }
      }, 5000); // Verifica a cada 5 segundos (otimizado de 3s)

      console.log(`Auto-generation enabled: generating every ${timeframeMs}ms`);
    } catch (error) {
      console.error('Error setting up auto-generation:', error);
    }
  };

  const getTimeframeMs = (tf: string): number => {
    const map: Record<string, number> = {
      '10s': 10 * 1000,
      '30s': 30 * 1000,
      '1m': 60 * 1000,
      '5m': 5 * 60 * 1000
    };
    return map[tf] || 60 * 1000;
  };

  const getVisibleCandlesForTimeframe = (tf: string): number => {
    // Quantidade de candles visíveis inicialmente para cada timeframe
    const map: Record<string, number> = {
      '10s': 80,  // Show last 80 candles (~13 minutes)
      '30s': 70,  // Show last 70 candles (~35 minutes)
      '1m': 60,   // Show last 60 candles (~1 hour)
      '5m': 50    // Show last 50 candles (~4 hours)
    };
    return map[tf] || 60;
  };

  const renderIndicators = (chartData: CandlestickData<Time>[]) => {
    if (!chartRef.current || !indicatorSettings) return;

    // Clear existing indicator series
    Object.values(indicatorSeriesRef.current).forEach(series => {
      if (series) {
        try {
          chartRef.current?.removeSeries(series);
        } catch (e) {
          console.log('Series already removed');
        }
      }
    });
    indicatorSeriesRef.current = {};

    // Prepare data for indicators
    const candleData = chartData.map(c => ({
      time: typeof c.time === 'number' ? c.time : Number(c.time),
      open: c.open,
      high: c.high,
      low: c.low,
      close: c.close
    }));

    // SMA
    if (indicatorSettings.sma.enabled) {
      const smaData = calculateSMA(candleData, indicatorSettings.sma.period);
      const smaSeries = chartRef.current.addSeries(LineSeries, {
        color: indicatorSettings.sma.color,
        lineWidth: 2,
        title: `SMA(${indicatorSettings.sma.period})`
      });
      smaSeries.setData(smaData as any);
      indicatorSeriesRef.current.sma = smaSeries;
    }

    // EMA
    if (indicatorSettings.ema.enabled) {
      const emaData = calculateEMA(candleData, indicatorSettings.ema.period);
      const emaSeries = chartRef.current.addSeries(LineSeries, {
        color: indicatorSettings.ema.color,
        lineWidth: 2,
        title: `EMA(${indicatorSettings.ema.period})`
      });
      emaSeries.setData(emaData as any);
      indicatorSeriesRef.current.ema = emaSeries;
    }

    // Bollinger Bands
    if (indicatorSettings.bollingerBands.enabled) {
      const bbData = calculateBollingerBands(
        candleData,
        indicatorSettings.bollingerBands.period,
        indicatorSettings.bollingerBands.stdDev
      );
      
      const bbUpperSeries = chartRef.current.addSeries(LineSeries, {
        color: '#f97316',
        lineWidth: 1,
        title: 'BB Upper'
      });
      bbUpperSeries.setData(bbData.upper as any);
      indicatorSeriesRef.current.bbUpper = bbUpperSeries;

      const bbMiddleSeries = chartRef.current.addSeries(LineSeries, {
        color: '#fb923c',
        lineWidth: 1,
        lineStyle: 2,
        title: 'BB Middle'
      });
      bbMiddleSeries.setData(bbData.middle as any);
      indicatorSeriesRef.current.bbMiddle = bbMiddleSeries;

      const bbLowerSeries = chartRef.current.addSeries(LineSeries, {
        color: '#f97316',
        lineWidth: 1,
        title: 'BB Lower'
      });
      bbLowerSeries.setData(bbData.lower as any);
      indicatorSeriesRef.current.bbLower = bbLowerSeries;
    }

    // RSI (requires separate pane - skipping for now, will need advanced implementation)
    // MACD (requires separate pane - skipping for now, will need advanced implementation)
  };

  const loadActiveTrades = useCallback(async () => {
    if (!userId) {
      console.log('[LoadActiveTrades] Sem userId, abortando');
      return;
    }

    console.log('[LoadActiveTrades] Carregando trades para:', { userId, assetId });

    try {
      const { data: trades, error } = await supabase
        .from('trades')
        .select(`
          *,
          assets (
            payout_percentage
          )
        `)
        .eq('user_id', userId)
        .eq('asset_id', assetId)
        .eq('status', 'open')
        .gt('expires_at', new Date().toISOString());

      if (error) {
        console.error('[LoadActiveTrades] Erro ao carregar:', error);
        return;
      }

      console.log('[LoadActiveTrades] Trades encontrados:', trades?.length || 0);

      if (trades && trades.length > 0) {
        console.log('[LoadActiveTrades] Definindo activeTrades:', trades.map(t => ({ id: t.id, price: t.entry_price })));
        setActiveTrades(trades);
      } else {
        // Clear active trades if none found
        setActiveTrades([]);
      }
    } catch (error) {
      console.error('[LoadActiveTrades] Exceção:', error);
    }
  }, [userId, assetId]);

  const drawTradeLine = (trade: any) => {
    console.log('[DrawTradeLine] Tentando desenhar linha para trade:', {
      id: trade.id,
      type: trade.trade_type,
      entry_price: trade.entry_price,
      hasCandles: !!candleSeriesRef.current
    });

    if (!candleSeriesRef.current) {
      console.warn('[DrawTradeLine] Série de candles não está pronta');
      return;
    }

    // Remove existing line if any
    const existingLine = tradeLinesRef.current.get(trade.id);
    if (existingLine) {
      console.log('[DrawTradeLine] Removendo linha existente:', trade.id);
      candleSeriesRef.current.removePriceLine(existingLine);
    }

    // Create professional trade entry line with enhanced visual appearance
    const isCall = trade.trade_type === 'call';
    
    // Professional colors - more vibrant and eye-catching
    const lineColor = isCall 
      ? (appearanceSettings?.trade_line_call_color || '#10b981') // Emerald green for CALL
      : (appearanceSettings?.trade_line_put_color || '#ef4444'); // Vibrant red for PUT
    
    // Professional styling - controlled by admin settings
    const lineWidth = appearanceSettings?.trade_line_width || 12;
    const lineStyle = appearanceSettings?.trade_line_style ?? 2; // Dashed line for better visibility
    const showLabel = appearanceSettings?.trade_line_show_label ?? true;
    
    console.log('[DrawTradeLine] Configuração da linha:', {
      configured_width: appearanceSettings?.trade_line_width,
      final_width: lineWidth,
      style: lineStyle
    });
    
    // Format entry price for display
    const formattedPrice = trade.entry_price.toFixed(5);
    
    // Professional label with icon and formatted price
    const tradeLabel = showLabel 
      ? `${isCall ? '▲' : '▼'} ${isCall ? t("entry_line_buy") : t("entry_line_sell")} @ ${formattedPrice}`
      : '';
    
    const line = candleSeriesRef.current.createPriceLine({
      price: trade.entry_price,
      color: lineColor,
      lineWidth: lineWidth,
      lineStyle: lineStyle,
      axisLabelVisible: true,
      title: tradeLabel,
      // Enhanced axis label styling
      axisLabelColor: lineColor,
      axisLabelTextColor: '#ffffff',
    });

    tradeLinesRef.current.set(trade.id, line);
    console.log('[DrawTradeLine] Linha profissional desenhada:', {
      id: trade.id,
      price: trade.entry_price,
      color: lineColor,
      width: lineWidth,
      label: tradeLabel
    });
  };

  const fetchAndShowCompletedTrade = useCallback(async (tradeId: string) => {
    try {
      console.log('[CompletedTrade] 🔍 Buscando trade concluído para notificação:', tradeId);

      const { data: completedTrade, error } = await supabase
        .from('trades')
        .select(`
          *,
          assets (
            name
          )
        `)
        .eq('id', tradeId)
        .single();

      if (error) {
        console.error('[CompletedTrade] ❌ Erro ao buscar trade concluído:', error);
        return;
      }

      if (!completedTrade) {
        console.error('[CompletedTrade] ❌ Trade não encontrado no banco:', tradeId);
        return;
      }

      console.log('[CompletedTrade] 📊 Trade encontrado:', {
        id: completedTrade.id,
        status: completedTrade.status,
        result: completedTrade.result,
        amount: completedTrade.amount,
        closed_at: completedTrade.closed_at,
        asset_name: completedTrade.assets?.name,
      });

      if (completedTrade.status !== 'open') {
        console.log('[CompletedTrade] ✅ Definindo notificação no estado para exibir popup');

        setCompletedTradeNotification({
          id: completedTrade.id,
          status: completedTrade.status,
          result: completedTrade.result,
          amount: completedTrade.amount,
          payout: completedTrade.payout,
          asset_name: completedTrade.assets?.name,
        });
        
        console.log('[CompletedTrade] 🎬 Notificação definida, TradeResultPopup deve aparecer agora');
      } else {
        console.warn('[CompletedTrade] ⚠️ Trade ainda está com status "open":', completedTrade.status);
      }
    } catch (error) {
      console.error('[CompletedTrade] 💥 Exceção ao buscar trade concluído:', error);
    }
  }, []);

  const handleTradeExpire = async (tradeId: string) => {
    console.log('[HandleTradeExpire] Trade expirado no client, limpando UI:', tradeId);
    // Get trade details before removing
    const trade = activeTrades.find(t => t.id === tradeId);
    
    // Remove trade from active trades
    setActiveTrades(prev => prev.filter(t => t.id !== tradeId));
    
    // Remove line from chart
    const line = tradeLinesRef.current.get(tradeId);
    if (line && candleSeriesRef.current) {
      candleSeriesRef.current.removePriceLine(line);
      tradeLinesRef.current.delete(tradeId);
    }

    // A notificação visual agora é disparada pelo evento de UPDATE em tempo real,
    // garantindo que o backend já processou o resultado e atualizou saldos.
    // Como fallback, se o trade ainda estiver "open" após alguns segundos,
    // poderíamos opcionalmente chamar fetchAndShowCompletedTrade aqui.
  };

  // Subscribe to new trades
  useEffect(() => {
    if (!userId || !assetId) {
      console.log('[Realtime Setup] Aguardando userId e assetId:', { userId, assetId });
      return;
    }

    console.log('[Realtime Setup] Iniciando subscription para trades, userId:', userId, 'assetId:', assetId);

    const channel = supabase
      .channel('trades-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'trades',
          filter: `user_id=eq.${userId}`
        },
        (payload) => {
          const newTrade = payload.new;
          console.log('[Realtime INSERT] Novo trade recebido:', {
            id: newTrade.id,
            asset_id: newTrade.asset_id,
            current_asset: assetId,
            status: newTrade.status,
            entry_price: newTrade.entry_price,
            type: newTrade.trade_type
          });
          
          // Only add if it's for current asset and status is open
          if (newTrade.asset_id === assetId && newTrade.status === 'open') {
            console.log('[Realtime INSERT] Adicionando trade ao estado');
            
            // Fetch complete trade data with asset info
            supabase
              .from('trades')
              .select(`
                *,
                assets (
                  payout_percentage
                )
              `)
              .eq('id', newTrade.id)
              .single()
              .then(({ data: completeTradeData }) => {
                if (completeTradeData) {
                  setActiveTrades(prev => {
                    const exists = prev.some(t => t.id === completeTradeData.id);
                    if (exists) {
                      console.log('[Realtime INSERT] Trade já existe, ignorando');
                      return prev;
                    }
                    return [...prev, completeTradeData];
                  });
                }
              });
          } else {
            console.log('[Realtime INSERT] Trade ignorado (asset diferente ou status não é open)');
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'trades',
          filter: `user_id=eq.${userId}`
        },
        async (payload) => {
          const updatedTrade = payload.new as any;
          const oldTrade = payload.old as any;

          console.log('[Realtime UPDATE] 📥 Payload completo recebido:', {
            trade_id: updatedTrade.id,
            asset_id: updatedTrade.asset_id,
            status: updatedTrade.status,
            old_status: oldTrade?.status,
            closed_at: updatedTrade.closed_at,
            result: updatedTrade.result,
            amount: updatedTrade.amount,
            payload_old_keys: oldTrade ? Object.keys(oldTrade) : 'null'
          });
          
          // Check if status changed from 'open' to 'won' or 'lost'
          const statusChanged = oldTrade?.status === 'open' && 
                               (updatedTrade.status === 'won' || updatedTrade.status === 'lost');
          
          const isClosed = (updatedTrade.status === 'won' || updatedTrade.status === 'lost') && !!updatedTrade.closed_at;

          console.log('[Realtime UPDATE] 🔍 Verificação de fechamento:', {
            trade_id: updatedTrade.id,
            isClosed,
            statusChanged,
            status: updatedTrade.status,
            closed_at: updatedTrade.closed_at,
            already_notified: notifiedTradesRef.current.has(updatedTrade.id)
          });

          if (isClosed && statusChanged) {
            if (!notifiedTradesRef.current.has(updatedTrade.id)) {
              console.log('[Realtime UPDATE] 🎉 Trade FECHADO detectado via realtime!');
              console.log('[Realtime UPDATE] 📢 Disparando notificação para trade:', updatedTrade.id);
              notifiedTradesRef.current.add(updatedTrade.id);
              
              // Force wait a bit to ensure DB transaction is committed
              await new Promise(resolve => setTimeout(resolve, 300));
              
              fetchAndShowCompletedTrade(updatedTrade.id);
            } else {
              console.log('[Realtime UPDATE] ⚠️ Trade já notificado, ignorando:', updatedTrade.id);
            }
          } else {
            console.log('[Realtime UPDATE] ℹ️ Condições não atendidas para notificação:', {
              isClosed,
              statusChanged,
              reason: !isClosed ? 'Trade não está fechado' : 'Status não mudou de open para won/lost'
            });
          }
          
          if (updatedTrade.asset_id === assetId) {
            setActiveTrades(prev => 
              prev
                .map(t => (t.id === updatedTrade.id ? updatedTrade : t))
                .filter(t => t.status === 'open')
            );
          }
        }
      )
      .subscribe((status) => {
        console.log('[Realtime Subscribe] Status da subscription:', status);
      });

    return () => {
      console.log('[Realtime Cleanup] Removendo subscription de trades');
      supabase.removeChannel(channel);
    };
  }, [userId, assetId]);

  // Listen for trade creation events (fallback mechanism)
  useEffect(() => {
    const handleTradeCreated = (event: CustomEvent) => {
      console.log('[CustomEvent] Trade criado detectado:', event.detail);
      if (event.detail.assetId === assetId && event.detail.userId === userId) {
        console.log('[CustomEvent] Forçando reload de trades');
        // Wait a bit for DB to commit
        setTimeout(() => {
          loadActiveTrades();
        }, 500);
      }
    };

    window.addEventListener('trade-created', handleTradeCreated as EventListener);

    return () => {
      window.removeEventListener('trade-created', handleTradeCreated as EventListener);
    };
  }, [assetId, userId, loadActiveTrades]);

  // Draw lines whenever activeTrades changes OR timeframe/chart changes
  useEffect(() => {
    console.log('[UseEffect activeTrades] Trades ativos mudaram:', {
      count: activeTrades.length,
      hasCandleSeries: !!candleSeriesRef.current,
      timeframe,
      trades: activeTrades.map(t => ({ id: t.id, price: t.entry_price, type: t.trade_type }))
    });

    if (!candleSeriesRef.current) {
      console.warn('[UseEffect activeTrades] Série de candles não está pronta ainda');
      return;
    }

    // Clear existing lines
    console.log('[UseEffect activeTrades] Limpando linhas existentes:', tradeLinesRef.current.size);
    tradeLinesRef.current.forEach(line => {
      candleSeriesRef.current?.removePriceLine(line);
    });
    tradeLinesRef.current.clear();

    // Draw lines for all active trades
    console.log('[UseEffect activeTrades] Desenhando linhas para', activeTrades.length, 'trades');
    activeTrades.forEach(trade => {
      if (trade.entry_price) {
        drawTradeLine(trade);
      } else {
        console.warn('[UseEffect activeTrades] Trade sem entry_price:', trade.id);
      }
    });
  }, [activeTrades, timeframe]);

  // Zoom control functions - fixed on current (rightmost) candle
  const handleZoomIn = useCallback(() => {
    if (!chartRef.current || !candleSeriesRef.current) return;
    const timeScale = chartRef.current.timeScale();
    const logicalRange = timeScale.getVisibleLogicalRange();
    if (!logicalRange) return;
    
    const data = candleSeriesRef.current.data();
    if (!data || data.length === 0) return;
    
    // Calculate zoom delta (20% of visible range)
    const visibleRange = logicalRange.to - logicalRange.from;
    const delta = visibleRange * 0.3;
    
    // Minimum visible candles
    const minCandles = 10;
    const newFrom = logicalRange.from + delta;
    
    // Ensure we don't zoom in too much
    if (logicalRange.to - newFrom >= minCandles) {
      timeScale.setVisibleLogicalRange({
        from: newFrom,
        to: logicalRange.to // Keep right edge fixed
      });
    }
  }, []);

  const handleZoomOut = useCallback(() => {
    if (!chartRef.current || !candleSeriesRef.current) return;
    const timeScale = chartRef.current.timeScale();
    const logicalRange = timeScale.getVisibleLogicalRange();
    if (!logicalRange) return;
    
    const data = candleSeriesRef.current.data();
    if (!data || data.length === 0) return;
    
    // Calculate zoom delta (30% of visible range)
    const visibleRange = logicalRange.to - logicalRange.from;
    const delta = visibleRange * 0.3;
    
    // Don't go beyond available data
    const newFrom = Math.max(0, logicalRange.from - delta);
    
    timeScale.setVisibleLogicalRange({
      from: newFrom,
      to: logicalRange.to // Keep right edge fixed
    });
  }, []);

  const handleResetZoom = useCallback(() => {
    if (!chartRef.current || !candleSeriesRef.current) return;
    const data = candleSeriesRef.current.data();
    if (!data || data.length === 0) return;
    
    const visibleCandles = getVisibleCandlesForTimeframe(timeframe);
    const from = Math.max(0, data.length - visibleCandles);
    const to = data.length - 1;
    
    chartRef.current.timeScale().setVisibleLogicalRange({ from, to });
    setTimeout(() => {
      chartRef.current?.timeScale().scrollToPosition(3, false);
    }, 50);
  }, [timeframe]);

  // Calculate container style based on settings
  const containerStyle = useMemo(() => {
    const style: React.CSSProperties = {
      backgroundColor: chartBgColor,
      width: `${widthPercentage}%`,
      margin: widthPercentage < 100 ? '0 auto' : undefined,
    };
    
    // Responsive mode: use flex-grow to fill all available space with proper constraints
    if (useResponsive) {
      style.flex = '1 1 0';
      style.minHeight = isMobile ? '200px' : '400px';
      style.maxHeight = isMobile ? 'calc(100vh - 280px)' : isFullscreen ? 'calc(100vh - 160px)' : 'calc(100vh - 280px)';
      style.overflow = 'hidden';
    } else if (aspectRatio) {
      style.aspectRatio = `${aspectRatio}`;
    } else if (effectiveHeight) {
      style.height = `${effectiveHeight}px`;
    } else {
      style.height = `${height}px`;
    }
    
    return style;
  }, [chartBgColor, widthPercentage, aspectRatio, effectiveHeight, useResponsive, isMobile, height]);

  return (
    <div className="relative" style={containerStyle}>
      {/* World Map Background */}
      {appearanceSettings?.map_enabled && (
        <WorldMapBackground 
          opacity={appearanceSettings.map_opacity}
          primaryColor={appearanceSettings.map_primary_color}
          secondaryColor={appearanceSettings.map_secondary_color}
          showGrid={appearanceSettings.map_show_grid}
          gridOpacity={appearanceSettings.map_grid_opacity}
          imageUrl={appearanceSettings.map_image_url}
          imageUrlDark={appearanceSettings.map_image_url_dark}
          bgColor={chartBgColor}
        />
      )}
      
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/50 z-10">
          <div className="text-muted-foreground">{t("loading_chart", "Loading chart...")}</div>
        </div>
      )}
      <div ref={chartContainerRef} className="w-full h-full relative z-[1]" style={{ backgroundColor: 'transparent' }} />
      
      {/* Candle Time Indicator */}
      <CandleTimeIndicator 
        chartRef={chartRef}
        candleSeriesRef={candleSeriesRef}
        containerRef={chartContainerRef}
        timeframe={timeframe}
        currentCandleTime={currentCandleTime}
      />
      
      {/* Watermark */}
      {appearanceSettings?.watermark_visible && appearanceSettings.watermark_text && (
        <div className="absolute top-4 left-4 text-6xl font-bold opacity-5 pointer-events-none select-none z-[1]">
          {appearanceSettings.watermark_text}
        </div>
      )}
      
      {/* Trade Markers */}
      {activeTrades.length > 0 && (
        <div className="absolute top-0 right-0 w-full pointer-events-none">
          {activeTrades.map((trade, index) => (
            <div 
              key={trade.id}
              style={{ 
                position: 'absolute',
                top: `${isMobile ? 20 + (index * 60) : 120 + (index * 60)}px`,
                left: 0,
                pointerEvents: 'auto'
              }}
            >
              <TradeMarker 
                trade={trade} 
                onExpire={handleTradeExpire}
                currentPrice={currentPrice}
              />
            </div>
          ))}
        </div>
      )}

      {/* Trade Result Popup - desktop only */}
      {!isMobile && (
        <TradeResultPopup 
          trade={completedTradeNotification}
          onClose={() => setCompletedTradeNotification(null)}
        />
      )}

      {/* Zoom Controls */}
      <ChartZoomControls
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        onResetZoom={handleResetZoom}
      />
    </div>
  );
}