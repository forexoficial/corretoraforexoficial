import { useEffect } from 'react';
import { useChartContext } from '@/contexts/ChartContext';
import { useChartIndicators } from '@/hooks/useChartIndicators';
import type { IndicatorSettings } from '../IndicatorsPanel';

interface ChartIndicatorsProps {
  settings?: IndicatorSettings;
}

/**
 * ChartIndicators - Gerencia a renderização de indicadores técnicos
 */
export const ChartIndicators = ({ settings }: ChartIndicatorsProps) => {
  const { candleSeriesRef } = useChartContext();
  const { renderIndicators } = useChartIndicators();

  useEffect(() => {
    if (!settings || !candleSeriesRef.current) return;

    const currentData = candleSeriesRef.current.data();
    if (currentData && currentData.length > 0) {
      renderIndicators(currentData, settings);
    }
  }, [settings, candleSeriesRef, renderIndicators]);

  return null;
};
