import { useEffect, useCallback } from 'react';
import { createChart, CandlestickSeries } from 'lightweight-charts';
import { useChartContext } from '@/contexts/ChartContext';
import { useChartAppearance } from '@/hooks/useChartAppearance';
import { useTheme } from 'next-themes';
import { useChartDrawing, DrawingTool } from '@/hooks/useChartDrawing';
import type { PriceLineConfig } from '../PriceLineSettings';

interface ChartCoreProps {
  assetId: string;
  timeframe: string;
  height: number;
  containerRef: React.RefObject<HTMLDivElement>;
  drawingTool?: DrawingTool;
  onDrawingToolChange?: (tool: DrawingTool) => void;
  priceLineConfig?: PriceLineConfig;
  drawingStyle?: { color: string; lineWidth: number; lineStyle: "solid" | "dashed" | "dotted" };
}

/**
 * ChartCore - Responsável pela inicialização e ciclo de vida do gráfico
 */
export const ChartCore = ({
  assetId,
  timeframe,
  height,
  containerRef,
  drawingTool = 'select',
  onDrawingToolChange,
  priceLineConfig,
  drawingStyle
}: ChartCoreProps) => {
  const { chartRef, candleSeriesRef, setIsLoading } = useChartContext();
  const { settings: appearanceSettings } = useChartAppearance();
  const { theme } = useTheme();
  const drawing = useChartDrawing(chartRef, candleSeriesRef, assetId, timeframe);

  const isDarkMode = theme === 'dark' || theme === 'system';

  const getThemeColor = useCallback((lightColor: string, darkColor: string) => {
    return isDarkMode ? darkColor : lightColor;
  }, [isDarkMode]);

  // Sync drawing tool to window ref
  useEffect(() => {
    (window as any).__currentDrawingTool = drawingTool;
  }, [drawingTool]);

  // Update drawing style
  useEffect(() => {
    if (drawingStyle) {
      drawing.setCurrentStyle(drawingStyle);
    }
  }, [drawingStyle, drawing]);

  // Store clear drawings handler
  useEffect(() => {
    (window as any).__clearChartDrawings = () => drawing.clearAllDrawings();
  }, [drawing]);

  useEffect(() => {
    if (!containerRef.current || !appearanceSettings) return;

    const chartBgColor = getThemeColor(
      appearanceSettings.chart_bg_color_light,
      appearanceSettings.chart_bg_color_dark
    );
    const chartTextColor = getThemeColor(
      appearanceSettings.chart_text_color_light,
      appearanceSettings.chart_text_color_dark
    );
    const gridVertColor = getThemeColor(
      appearanceSettings.grid_vert_color_light,
      appearanceSettings.grid_vert_color_dark
    );
    const gridHorzColor = getThemeColor(
      appearanceSettings.grid_horz_color_light,
      appearanceSettings.grid_horz_color_dark
    );
    const candleUpColor = getThemeColor(
      appearanceSettings.candle_up_color_light,
      appearanceSettings.candle_up_color_dark
    );
    const candleDownColor = getThemeColor(
      appearanceSettings.candle_down_color_light,
      appearanceSettings.candle_down_color_dark
    );
    const priceScaleBorderColor = getThemeColor(
      appearanceSettings.price_scale_border_color_light,
      appearanceSettings.price_scale_border_color_dark
    );
    const timeScaleBorderColor = getThemeColor(
      appearanceSettings.time_scale_border_color_light,
      appearanceSettings.time_scale_border_color_dark
    );

    const chart = createChart(containerRef.current, {
      width: containerRef.current.clientWidth,
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
        barSpacing: 8,
        minBarSpacing: 3,
        fixLeftEdge: false,
        fixRightEdge: false,
        lockVisibleTimeRangeOnResize: true,
        rightBarStaysOnScroll: true,
      },
      localization: {
        locale: 'pt-BR',
        timeFormatter: (timestamp: number) => {
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

    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor: candleUpColor,
      downColor: candleDownColor,
      borderVisible: false,
      wickUpColor: candleUpColor,
      wickDownColor: candleDownColor,
      priceLineVisible: priceLineConfig?.visible ?? true,
      priceLineColor: priceLineConfig?.color ?? '#ffffff',
      priceLineWidth: (priceLineConfig?.width ?? 1) as any,
      priceLineStyle: priceLineConfig?.style ?? 2,
    });

    chartRef.current = chart;
    candleSeriesRef.current = candleSeries;

    // Initialize drawing overlay
    if (containerRef.current) {
      drawing.initializeOverlay(containerRef.current);
    }

    // Handle chart clicks for drawing tools
    const handleChartClick = (param: any) => {
      const currentDrawingTool = (window as any).__currentDrawingTool || 'select';
      const currentlyDrawing = drawing.isDrawingRef.current;

      if (currentDrawingTool === 'select' || !param || !param.point) {
        return;
      }

      const price = candleSeries.coordinateToPrice(param.point.y);
      const time = chart.timeScale().coordinateToTime(param.point.x);

      if (!price || !time) return;

      const point = { price, time: time as number };

      if (!currentlyDrawing) {
        drawing.startDrawing(currentDrawingTool, point);
        if (currentDrawingTool === 'horizontal' || currentDrawingTool === 'vertical') {
          setTimeout(() => drawing.completeDrawing(currentDrawingTool), 50);
        }
      } else {
        drawing.addPoint(point);
        setTimeout(() => drawing.completeDrawing(currentDrawingTool), 50);
      }
    };

    chart.subscribeClick(handleChartClick);

    // ESC to cancel drawing
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        drawing.cancelDrawing();
        onDrawingToolChange?.('select');
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    // Handle resize
    const handleResize = () => {
      if (containerRef.current && chartRef.current) {
        chartRef.current.applyOptions({
          width: containerRef.current.clientWidth,
        });
      }
    };

    window.addEventListener('resize', handleResize);

    setIsLoading(false);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('keydown', handleKeyDown);
      chart.remove();
      chartRef.current = null;
      candleSeriesRef.current = null;
    };
  }, [
    assetId,
    timeframe,
    height,
    appearanceSettings,
    theme,
    priceLineConfig,
    containerRef,
    chartRef,
    candleSeriesRef,
    setIsLoading,
    drawing,
    onDrawingToolChange,
    getThemeColor
  ]);

  return null;
};
