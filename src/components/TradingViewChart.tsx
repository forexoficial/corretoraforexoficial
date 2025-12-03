import { useEffect, useRef, useState, useCallback } from "react";
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
    (window as any).__currentDrawingTool = drawingTool;
  }, [drawingTool]);

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

  // Handle clear drawings command
  useEffect(() => {
    if (onClearDrawings) {
      const clearHandler = () => {
        drawing.clearAllDrawings();
      };
      // Store the handler so it can be called from parent
      (window as any).__clearChartDrawings = clearHandler;
    }
  }, [onClearDrawings, drawing]);

  useEffect(() => {
    if (!chartContainerRef.current || !appearanceSettings) return;

    // Create chart with dynamic settings based on theme
    const chart = createChart(chartContainerRef.current, {
      width: chartContainerRef.current.clientWidth,
      height: height,
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

    // Handle drawing tool clicks
    const handleChartClick = (param: any) => {
      // Get current drawing tool from ref to avoid recreating chart on tool change
      const currentDrawingTool = (window as any).__currentDrawingTool || 'select';
      // Use ref to get current drawing state without closure issues
      const currentlyDrawing = drawing.isDrawingRef.current;
      
      console.log('[Chart Click] Tool:', currentDrawingTool, 'isDrawing:', currentlyDrawing, 'Param:', param);
      
      if (currentDrawingTool === 'select' || !param || !param.point) {
        console.log('[Chart Click] Skipped - tool is select or no point');
        return;
      }
      
      // Get price and time from click coordinates
      const price = candleSeries.coordinateToPrice(param.point.y);
      const time = chart.timeScale().coordinateToTime(param.point.x);
      
      console.log('[Chart Click] Price:', price, 'Time:', time);
      
      if (!price || !time) {
        console.log('[Chart Click] Invalid price or time');
        return;
      }
      
      const point = { price, time: time as number };
      
      // If not currently drawing, start a new drawing
      if (!currentlyDrawing) {
        console.log('[Chart Click] Starting new drawing');
        drawing.startDrawing(currentDrawingTool, point);
        
        // For horizontal and vertical lines, complete immediately after first point
        if (currentDrawingTool === 'horizontal' || currentDrawingTool === 'vertical') {
          console.log('[Chart Click] Auto-completing horizontal/vertical line');
          setTimeout(() => drawing.completeDrawing(currentDrawingTool), 50);
        }
      } else {
        // Add second point and complete the drawing
        console.log('[Chart Click] Adding second point and completing');
        drawing.addPoint(point);
        setTimeout(() => drawing.completeDrawing(currentDrawingTool), 50);
      }
    };

    // Subscribe to click events
    chart.subscribeClick(handleChartClick);

    // Handle ESC key to cancel drawing
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        drawing.cancelDrawing();
        onDrawingToolChange?.('select');
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    // Handle resize
    const handleResize = () => {
      if (chartContainerRef.current && chartRef.current) {
        chartRef.current.applyOptions({
          width: chartContainerRef.current.clientWidth,
        });
      }
    };

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
  }, [assetId, timeframe, height, userId, appearanceSettings, theme, chartTextColor, gridVertColor, gridHorzColor, candleUpColor, candleDownColor, priceScaleBorderColor, timeScaleBorderColor, priceLineConfig]);

  const loadCandles = async () => {
    setIsLoading(true);
    try {
      // Carregar quantidade otimizada de candles para cada timeframe
      // Foco em histórico recente relevante para binary options
      const candleLimitMap: Record<string, number> = {
        '10s': 60,   // ~10 minutos de histórico
        '30s': 60,   // ~30 minutos de histórico
        '1m': 60,    // ~1 hora de histórico
        '5m': 36     // ~3 horas de histórico (reduzido para melhor visualização)
      };
      const candleLimit = candleLimitMap[timeframe] || 60;

      const { data: candles, error } = await supabase
        .from('candles')
        .select('*')
        .eq('asset_id', assetId)
        .eq('timeframe', timeframe)
        .order('timestamp', { ascending: false })
        .limit(candleLimit);

      if (error) {
        console.error('Error loading candles:', error);
        // If no data exists, generate initial candles
        await generateInitialCandles();
        return;
      }

      if (candles && candles.length > 0 && candleSeriesRef.current) {
        // Garantir que os candles estejam em ordem cronológica crescente
        const sortedCandles = [...candles].sort((a, b) =>
          new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
        );

        const chartData: CandlestickData<Time>[] = sortedCandles.map((c) => {
          // Timestamps já estão em UTC no banco, converter para Unix timestamp (segundos)
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
          // Calculate how many candles to show based on timeframe
          const visibleCandles = getVisibleCandlesForTimeframe(timeframe);
          
          // Position the last candle in the center-right area
          const from = Math.max(0, chartData.length - visibleCandles);
          const to = chartData.length - 1;
          
          // Set visible range with a small delay to ensure chart is ready
          setTimeout(() => {
            chartRef.current?.timeScale().setVisibleLogicalRange({
              from,
              to
            });
            // Scroll slightly to position last candle more centered
            chartRef.current?.timeScale().scrollToPosition(3, false);
          }, 100);
        }
        
        // Start animation for the most recent candle
        const lastCandle = candles[candles.length - 1];
        startSmoothAnimation(lastCandle, timeframe);
        
        // CRITICAL: Load active trades after candles are loaded
        // This ensures trade lines are drawn after page refresh
        console.log('[LoadCandles] Velas carregadas, carregando trades ativos...');
        if (userId) {
          // Small delay to ensure chart is fully ready
          setTimeout(() => {
            loadActiveTrades();
          }, 200);
        }
      } else {
        // No candles exist, generate initial data
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
      
      candleSeriesRef.current.update(updatedCandle);
      
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
      console.warn('[CandleUpdate] Ignorando candle de timeframe diferente:', candle.timeframe, 'esperado:', timeframe);
      return;
    }

    if (payload.eventType === 'INSERT') {
      // New candle - start animation
      const timestamp = new Date(candle.timestamp).getTime() / 1000;
      const candleData: CandlestickData<Time> = {
        time: timestamp as Time,
        open: Number(candle.open),
        high: Number(candle.high),
        low: Number(candle.low),
        close: Number(candle.close),
      };

      candleSeriesRef.current.update(candleData);
      
      // Notify parent of price update
      if (onCurrentPriceUpdate) {
        onCurrentPriceUpdate(Number(candle.close));
      }
      
      startSmoothAnimation(candle, timeframe);
    } else if (payload.eventType === 'UPDATE') {
      // Update from backend - reset animation with new data
      const timestamp = new Date(candle.timestamp).getTime() / 1000;
      const candleData: CandlestickData<Time> = {
        time: timestamp as Time,
        open: Number(candle.open),
        high: Number(candle.high),
        low: Number(candle.low),
        close: Number(candle.close),
      };

      candleSeriesRef.current.update(candleData);
      
      // Notify parent of price update  
      if (onCurrentPriceUpdate) {
        onCurrentPriceUpdate(Number(candle.close));
      }
      
      startSmoothAnimation(candle, timeframe);
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

      // Setup active candle checking - verifica a cada 3 segundos se há um novo candle
      candleCheckIntervalRef.current = setInterval(async () => {
        if (!currentCandleRef.current) return;
        
        const currentCandleTimestamp = currentCandleRef.current.timestamp;
        const now = Date.now();
        const candleEndTime = new Date(currentCandleTimestamp).getTime() + timeframeMs;
        
        // Se o candle expirou (passou o tempo), busca o próximo
        if (now >= candleEndTime) {
          console.log('[Candle Check] Candle expirado, buscando próximo...');
          try {
            const { data: newCandles, error } = await supabase
              .from('candles')
              .select('*')
              .eq('asset_id', assetId)
              .eq('timeframe', timeframe)
              .gt('timestamp', currentCandleTimestamp)
              .order('timestamp', { ascending: false })
              .limit(1);

            if (error) {
              console.error('[Candle Check] Erro ao buscar novo candle:', error);
              return;
            }

            if (newCandles && newCandles.length > 0) {
              console.log('[Candle Check] Novo candle encontrado, atualizando gráfico');
              const newCandle = newCandles[0];
              
              // Adiciona o novo candle ao gráfico
              const timestamp = new Date(newCandle.timestamp).getTime() / 1000;
              const candleData: CandlestickData<Time> = {
                time: timestamp as Time,
                open: Number(newCandle.open),
                high: Number(newCandle.high),
                low: Number(newCandle.low),
                close: Number(newCandle.close),
              };

              if (candleSeriesRef.current) {
                candleSeriesRef.current.update(candleData);
                
                // Notifica o parent sobre a atualização de preço
                if (onCurrentPriceUpdate) {
                  onCurrentPriceUpdate(Number(newCandle.close));
                }
                
                startSmoothAnimation(newCandle, timeframe);
              }
            } else {
              console.log('[Candle Check] Nenhum candle novo encontrado ainda');
            }
          } catch (error) {
            console.error('[Candle Check] Erro na verificação:', error);
          }
        }
      }, 3000); // Verifica a cada 3 segundos

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
    // Quantidade otimizada de candles visíveis para cada timeframe
    const map: Record<string, number> = {
      '10s': 40,  // Show last 40 candles (~6-7 minutes) - melhor visualização
      '30s': 35,  // Show last 35 candles (~17 minutes)
      '1m': 30,   // Show last 30 candles (~30 minutes)
      '5m': 20    // Show last 20 candles (~1h 40min) - otimizado para visibilidade
    };
    return map[tf] || 30;
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

  // Zoom control functions
  const handleZoomIn = useCallback(() => {
    if (!chartRef.current) return;
    const timeScale = chartRef.current.timeScale();
    const logicalRange = timeScale.getVisibleLogicalRange();
    if (!logicalRange) return;
    
    const delta = (logicalRange.to - logicalRange.from) * 0.2;
    timeScale.setVisibleLogicalRange({
      from: logicalRange.from + delta,
      to: logicalRange.to - delta
    });
  }, []);

  const handleZoomOut = useCallback(() => {
    if (!chartRef.current) return;
    const timeScale = chartRef.current.timeScale();
    const logicalRange = timeScale.getVisibleLogicalRange();
    if (!logicalRange) return;
    
    const delta = (logicalRange.to - logicalRange.from) * 0.2;
    timeScale.setVisibleLogicalRange({
      from: logicalRange.from - delta,
      to: logicalRange.to + delta
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

  return (
    <div className="relative w-full h-full" style={{ backgroundColor: chartBgColor }}>
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
      <div ref={chartContainerRef} className="w-full relative z-[1]" style={{ backgroundColor: 'transparent' }} />
      
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