import { useEffect, useRef, useState } from "react";
import type { IChartApi } from "lightweight-charts";
import { useTranslation } from "@/hooks/useTranslation";

interface CandleTimeIndicatorProps {
  chartRef: React.RefObject<IChartApi | null>;
  candleSeriesRef: React.RefObject<any>;
  containerRef: React.RefObject<HTMLDivElement | null>;
  timeframe: string;
  currentCandleTime: number;
}

// Apenas timeframes curtos para binary options
const TIMEFRAME_MS: Record<string, number> = {
  '10s': 10 * 1000,
  '30s': 30 * 1000,
  '1m': 60 * 1000,
  '5m': 5 * 60 * 1000
};

export function CandleTimeIndicator({
  chartRef,
  candleSeriesRef,
  containerRef,
  timeframe,
  currentCandleTime
}: CandleTimeIndicatorProps) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const { t } = useTranslation();

  // Create and attach SVG overlay once
  useEffect(() => {
    const container = containerRef.current;
    if (!container || svgRef.current) return;

    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.style.position = "absolute";
    svg.style.top = "0";
    svg.style.left = "0";
    svg.style.width = "100%";
    svg.style.height = "100%";
    svg.style.pointerEvents = "none";
    svg.style.zIndex = "15";

    container.appendChild(svg);
    svgRef.current = svg;

    return () => {
      if (svg.parentNode) {
        svg.parentNode.removeChild(svg);
      }
      if (svgRef.current === svg) {
        svgRef.current = null;
      }
    };
  }, [containerRef]);

  // Imperatively render and keep indicator glued to the last candle
  useEffect(() => {
    const chart = chartRef.current;
    const series = candleSeriesRef.current;
    const container = containerRef.current;

    if (!chart || !series || !container || !svgRef.current) return;

    const getTimeframeMs = () => TIMEFRAME_MS[timeframe] ?? 60 * 1000;

    const getTimeRemaining = () => {
      if (!currentCandleTime) return 0;
      const now = Date.now();
      const endTime = currentCandleTime + getTimeframeMs();
      return Math.max(0, Math.floor((endTime - now) / 1000));
    };

    const render = () => {
      const chartApi = chartRef.current;
      const seriesApi = candleSeriesRef.current as any;
      const containerEl = containerRef.current;
      const svgEl = svgRef.current;

      if (!chartApi || !seriesApi || !containerEl || !svgEl) return;

      const data = typeof seriesApi.data === "function" ? seriesApi.data() : seriesApi.data;
      if (!data || !data.length) return;

      const lastCandle = data[data.length - 1];
      const timeScale = chartApi.timeScale();

      const x = timeScale.timeToCoordinate(lastCandle.time);
      const y = seriesApi.priceToCoordinate(lastCandle.close);

      if (x == null || y == null) return;

      const chartHeight = containerEl.clientHeight;

      // Clear previous drawing
      while (svgEl.firstChild) {
        svgEl.removeChild(svgEl.firstChild);
      }

      // Vertical line
      const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
      line.setAttribute("x1", x.toString());
      line.setAttribute("y1", "50");
      line.setAttribute("x2", x.toString());
      line.setAttribute("y2", chartHeight.toString());
      line.setAttribute("stroke", "hsl(var(--primary))");
      line.setAttribute("stroke-width", "1.5");
      line.setAttribute("stroke-dasharray", "4,3");
      line.setAttribute("opacity", "0.6");
      line.style.transition = "x1 0.3s ease-out, x2 0.3s ease-out";
      svgEl.appendChild(line);

      // Circle with countdown
      const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
      circle.setAttribute("cx", x.toString());
      circle.setAttribute("cy", "25");
      circle.setAttribute("r", "18");
      circle.setAttribute("fill", "hsl(var(--background))");
      circle.setAttribute("stroke", "hsl(var(--primary))");
      circle.setAttribute("stroke-width", "2");
      circle.style.transition = "cx 0.3s ease-out";
      svgEl.appendChild(circle);

      const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
      text.setAttribute("x", x.toString());
      text.setAttribute("y", "30");
      text.setAttribute("text-anchor", "middle");
      text.setAttribute("fill", "hsl(var(--primary))");
      text.setAttribute("font-size", "11");
      text.setAttribute("font-weight", "bold");
      text.setAttribute("font-family", "monospace");
      text.style.transition = "x 0.3s ease-out";
      text.textContent = `-${getTimeRemaining()}`;
      svgEl.appendChild(text);

      // Label
      const label = document.createElementNS("http://www.w3.org/2000/svg", "text");
      label.setAttribute("x", (x + 12).toString());
      label.setAttribute("y", "150");
      label.setAttribute("fill", "hsl(var(--muted-foreground))");
      label.setAttribute("font-size", "9");
      label.setAttribute("transform", `rotate(-90 ${x + 12} 150)`);
      label.style.transition = "x 0.3s ease-out, transform 0.3s ease-out";
      label.textContent = t("trade_marker_time_remaining", "time remaining");
      svgEl.appendChild(label);

      // Price marker on candle - NO DELAY, must be glued to price
      const marker = document.createElementNS("http://www.w3.org/2000/svg", "circle");
      marker.setAttribute("cx", x.toString());
      marker.setAttribute("cy", y.toString());
      marker.setAttribute("r", "3");
      marker.setAttribute("fill", "hsl(var(--primary))");
      marker.setAttribute("opacity", "0.7");
      // NO transition - instant position update
      svgEl.appendChild(marker);
    };

    // Initial render
    render();

    // Keep synced at high frequency for instant price marker updates (60 FPS)
    const intervalId = window.setInterval(render, 16);

    const timeScale = chart.timeScale();
    const handleVisibleRange = () => render();
    const handleSizeChange = () => render();

    timeScale.subscribeVisibleLogicalRangeChange(handleVisibleRange);
    timeScale.subscribeSizeChange(handleSizeChange);

    return () => {
      window.clearInterval(intervalId);
      timeScale.unsubscribeVisibleLogicalRangeChange(handleVisibleRange);
      timeScale.unsubscribeSizeChange(handleSizeChange);
    };
  }, [chartRef, candleSeriesRef, containerRef, timeframe, currentCandleTime]);

  return null;
}
