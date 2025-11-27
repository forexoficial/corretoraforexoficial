import { useCallback } from 'react';
import { CandlestickData, Time, LineSeries, HistogramSeries } from 'lightweight-charts';
import { useChartContext } from '@/contexts/ChartContext';
import { 
  calculateSMA, 
  calculateEMA, 
  calculateRSI, 
  calculateBollingerBands, 
  calculateMACD,
  CandleData
} from '@/utils/technicalIndicators';
import type { IndicatorSettings } from '@/components/IndicatorsPanel';

/**
 * Hook personalizado para gerenciar indicadores técnicos
 * - Renderização de SMA, EMA, RSI, Bollinger Bands, MACD
 * - Remoção automática de indicadores desabilitados
 */
export const useChartIndicators = () => {
  const { chartRef, indicatorSeriesRef } = useChartContext();

  const renderIndicators = useCallback((
    data: CandlestickData<Time>[], 
    settings: IndicatorSettings
  ) => {
    if (!chartRef.current) return;

    // Convert CandlestickData to CandleData format
    const candleData: CandleData[] = data.map(d => ({
      time: Number(d.time),
      open: d.open,
      high: d.high,
      low: d.low,
      close: d.close
    }));

    // Remove all existing indicators first
    if (indicatorSeriesRef.current.sma) {
      chartRef.current.removeSeries(indicatorSeriesRef.current.sma);
      indicatorSeriesRef.current.sma = undefined;
    }
    if (indicatorSeriesRef.current.ema) {
      chartRef.current.removeSeries(indicatorSeriesRef.current.ema);
      indicatorSeriesRef.current.ema = undefined;
    }
    if (indicatorSeriesRef.current.rsi) {
      chartRef.current.removeSeries(indicatorSeriesRef.current.rsi);
      indicatorSeriesRef.current.rsi = undefined;
    }
    if (indicatorSeriesRef.current.bbUpper) {
      chartRef.current.removeSeries(indicatorSeriesRef.current.bbUpper);
      indicatorSeriesRef.current.bbUpper = undefined;
    }
    if (indicatorSeriesRef.current.bbMiddle) {
      chartRef.current.removeSeries(indicatorSeriesRef.current.bbMiddle);
      indicatorSeriesRef.current.bbMiddle = undefined;
    }
    if (indicatorSeriesRef.current.bbLower) {
      chartRef.current.removeSeries(indicatorSeriesRef.current.bbLower);
      indicatorSeriesRef.current.bbLower = undefined;
    }
    if (indicatorSeriesRef.current.macdLine) {
      chartRef.current.removeSeries(indicatorSeriesRef.current.macdLine);
      indicatorSeriesRef.current.macdLine = undefined;
    }
    if (indicatorSeriesRef.current.macdSignal) {
      chartRef.current.removeSeries(indicatorSeriesRef.current.macdSignal);
      indicatorSeriesRef.current.macdSignal = undefined;
    }
    if (indicatorSeriesRef.current.macdHistogram) {
      chartRef.current.removeSeries(indicatorSeriesRef.current.macdHistogram);
      indicatorSeriesRef.current.macdHistogram = undefined;
    }

    // Render SMA
    if (settings.sma.enabled) {
      const smaValues = calculateSMA(candleData, settings.sma.period);

      const smaSeries = chartRef.current.addSeries(LineSeries, {
        color: '#2196F3',
        lineWidth: 2,
        title: `SMA(${settings.sma.period})`,
      });
      smaSeries.setData(smaValues as any);
      indicatorSeriesRef.current.sma = smaSeries;
    }

    // Render EMA
    if (settings.ema.enabled) {
      const emaValues = calculateEMA(candleData, settings.ema.period);

      const emaSeries = chartRef.current.addSeries(LineSeries, {
        color: '#FF9800',
        lineWidth: 2,
        title: `EMA(${settings.ema.period})`,
      });
      emaSeries.setData(emaValues as any);
      indicatorSeriesRef.current.ema = emaSeries;
    }

    // Render RSI (in separate pane - future enhancement)
    if (settings.rsi.enabled) {
      const rsiValues = calculateRSI(candleData, settings.rsi.period);
      // RSI would ideally be in a separate pane, but for now we skip it
      // or scale it to fit in the main chart (0-100 range)
    }

    // Render Bollinger Bands
    if (settings.bollingerBands.enabled) {
      const bb = calculateBollingerBands(
        candleData, 
        settings.bollingerBands.period, 
        settings.bollingerBands.stdDev
      );

      const upperSeries = chartRef.current.addSeries(LineSeries, {
        color: '#9C27B0',
        lineWidth: 1,
        title: 'BB Upper',
      });
      upperSeries.setData(bb.upper as any);
      indicatorSeriesRef.current.bbUpper = upperSeries;

      const middleSeries = chartRef.current.addSeries(LineSeries, {
        color: '#9C27B0',
        lineWidth: 1,
        lineStyle: 2,
        title: 'BB Middle',
      });
      middleSeries.setData(bb.middle as any);
      indicatorSeriesRef.current.bbMiddle = middleSeries;

      const lowerSeries = chartRef.current.addSeries(LineSeries, {
        color: '#9C27B0',
        lineWidth: 1,
        title: 'BB Lower',
      });
      lowerSeries.setData(bb.lower as any);
      indicatorSeriesRef.current.bbLower = lowerSeries;
    }

    // Render MACD (in separate pane - future enhancement)
    if (settings.macd.enabled) {
      const macd = calculateMACD(
        candleData,
        settings.macd.fastPeriod,
        settings.macd.slowPeriod,
        settings.macd.signalPeriod
      );
      // MACD would ideally be in a separate pane
    }
  }, [chartRef, indicatorSeriesRef]);

  return { renderIndicators };
};
