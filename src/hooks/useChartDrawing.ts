import { useState, useCallback, useRef, useEffect } from "react";
import { IChartApi } from "lightweight-charts";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type DrawingTool = 
  | "select" 
  | "trendline" 
  | "horizontal" 
  | "vertical"
  | "rectangle" 
  | "fibonacci";

export interface DrawingObject {
  id: string;
  type: "trendline" | "horizontal" | "vertical" | "rectangle" | "fibonacci";
  points: Array<{ price: number; time: number }>;
  color: string;
  lineWidth: number;
  style: "solid" | "dashed" | "dotted";
}

export interface DrawingStyle {
  color: string;
  lineWidth: number;
  lineStyle: "solid" | "dashed" | "dotted";
}

export function useChartDrawing(
  chartRef: React.RefObject<IChartApi | null>,
  candleSeriesRef: React.RefObject<any>,
  assetId: string,
  timeframe: string
) {
  const [drawings, setDrawings] = useState<DrawingObject[]>([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const isDrawingRef = useRef(false); // Ref for immediate access without closure issues
  const [currentPoints, setCurrentPoints] = useState<Array<{ price: number; time: number }>>([]);
  const currentPointsRef = useRef<Array<{ price: number; time: number }>>([]); // Ref for immediate access
  const [currentStyle, setCurrentStyle] = useState<DrawingStyle>({
    color: "#22c55e",
    lineWidth: 2,
    lineStyle: "solid"
  });
  const svgOverlayRef = useRef<SVGSVGElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  // Sync state with refs
  useEffect(() => {
    isDrawingRef.current = isDrawing;
  }, [isDrawing]);

  useEffect(() => {
    currentPointsRef.current = currentPoints;
  }, [currentPoints]);

  // Get user ID on mount
  useEffect(() => {
    const getUserId = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUserId(user?.id || null);
    };
    getUserId();
  }, []);

  // Load drawings from database
  useEffect(() => {
    if (!userId) return;
    loadDrawings();
  }, [userId, assetId, timeframe]);

  const loadDrawings = async () => {
    if (!userId) return;

    const { data, error } = await supabase
      .from('chart_drawings')
      .select('*')
      .eq('user_id', userId)
      .eq('asset_id', assetId)
      .eq('timeframe', timeframe);

    if (error) {
      console.error('Error loading drawings:', error);
      return;
    }

    if (data) {
      const loadedDrawings: DrawingObject[] = data.map(d => ({
        id: d.id,
        type: d.drawing_type as any,
        points: d.points as any,
        color: d.color,
        lineWidth: d.line_width,
        style: d.line_style as any
      }));
      setDrawings(loadedDrawings);
    }
  };

  const saveDrawing = async (drawing: DrawingObject) => {
    if (!userId) return;

    const { error } = await supabase
      .from('chart_drawings')
      .insert({
        user_id: userId,
        asset_id: assetId,
        timeframe: timeframe,
        drawing_type: drawing.type,
        points: drawing.points,
        color: drawing.color,
        line_width: drawing.lineWidth,
        line_style: drawing.style
      });

    if (error) {
      console.error('Error saving drawing:', error);
      toast.error('Erro ao salvar desenho');
    }
  };

  const deleteDrawing = async (id: string) => {
    if (!userId) return;

    const { error } = await supabase
      .from('chart_drawings')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);

    if (error) {
      console.error('Error deleting drawing:', error);
      toast.error('Erro ao deletar desenho');
    }
  };

  // Initialize SVG overlay
  const initializeOverlay = useCallback((container: HTMLDivElement) => {
    if (!container || svgOverlayRef.current) return;

    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.style.position = "absolute";
    svg.style.top = "0";
    svg.style.left = "0";
    svg.style.width = "100%";
    svg.style.height = "100%";
    svg.style.pointerEvents = "none";
    svg.style.zIndex = "10";
    
    container.appendChild(svg);
    svgOverlayRef.current = svg;
    containerRef.current = container;
  }, []);

  // Convert chart coordinates to screen coordinates using series method
  const priceToScreenY = useCallback((price: number): number | null => {
    if (!candleSeriesRef.current) return null;
    
    try {
      // Use series priceToCoordinate method
      const coordinate = candleSeriesRef.current.priceToCoordinate(price);
      return coordinate ?? null;
    } catch (e) {
      console.error('Price to coordinate error:', e);
      return null;
    }
  }, [candleSeriesRef]);

  const timeToScreenX = useCallback((time: number): number | null => {
    if (!chartRef.current) return null;
    
    try {
      const timeScale = chartRef.current.timeScale();
      const coordinate = timeScale.timeToCoordinate(time as any);
      return coordinate ?? null;
    } catch (e) {
      console.error('Time to coordinate error:', e);
      return null;
    }
  }, [chartRef]);

  // Start drawing
  const startDrawing = useCallback((type: DrawingObject["type"], point: { price: number; time: number }) => {
    console.log('[Drawing] Starting drawing:', { type, point });
    // Update refs immediately for synchronous access
    isDrawingRef.current = true;
    currentPointsRef.current = [point];
    // Also update state for React reactivity
    setIsDrawing(true);
    setCurrentPoints([point]);
  }, []);

  // Add point to current drawing
  const addPoint = useCallback((point: { price: number; time: number }) => {
    console.log('[Drawing] Adding point:', point);
    // Update ref immediately for synchronous access
    const newPoints = [...currentPointsRef.current, point];
    currentPointsRef.current = newPoints;
    console.log('[Drawing] Total points now:', newPoints.length);
    // Also update state for React reactivity
    setCurrentPoints(newPoints);
  }, []);

  // Complete drawing - using refs to avoid stale closure issues with setTimeout
  const completeDrawing = useCallback((type: DrawingObject["type"]) => {
    // Use ref for immediate access (avoids stale closure from setTimeout)
    const points = currentPointsRef.current;
    
    // For horizontal and vertical lines, only 1 point is needed
    const minPoints = (type === 'horizontal' || type === 'vertical') ? 1 : 2;
    
    console.log(`[Drawing] CompleteDrawing called - type: ${type}, points: ${points.length}, minPoints: ${minPoints}`);
    
    if (points.length < minPoints) {
      console.log(`[Drawing] Not enough points: ${points.length} < ${minPoints}`);
      setIsDrawing(false);
      setCurrentPoints([]);
      return;
    }

    const newDrawing: DrawingObject = {
      id: `drawing-${Date.now()}`,
      type,
      points: [...points], // Clone the array
      color: currentStyle.color,
      lineWidth: currentStyle.lineWidth,
      style: currentStyle.lineStyle
    };

    console.log('[Drawing] Creating drawing:', newDrawing);
    setDrawings(prev => [...prev, newDrawing]);
    saveDrawing(newDrawing);
    setIsDrawing(false);
    setCurrentPoints([]);
    toast.success('Desenho adicionado');
  }, [currentStyle]);

  // Cancel drawing
  const cancelDrawing = useCallback(() => {
    setIsDrawing(false);
    setCurrentPoints([]);
  }, []);

  // Remove drawing
  const removeDrawing = useCallback((id: string) => {
    setDrawings(prev => prev.filter(d => d.id !== id));
    deleteDrawing(id);
    toast.success('Desenho removido');
  }, []);

  // Clear all drawings
  const clearAllDrawings = useCallback(async () => {
    if (!userId) return;

    const { error } = await supabase
      .from('chart_drawings')
      .delete()
      .eq('user_id', userId)
      .eq('asset_id', assetId)
      .eq('timeframe', timeframe);

    if (error) {
      console.error('Error clearing drawings:', error);
      toast.error('Erro ao limpar desenhos');
      return;
    }

    setDrawings([]);
    setIsDrawing(false);
    setCurrentPoints([]);
    toast.success('Todos os desenhos foram removidos');
  }, [userId, assetId, timeframe]);

  // Render drawings on SVG
  const renderDrawings = useCallback(() => {
    if (!svgOverlayRef.current || !chartRef.current) return;

    // Clear SVG
    while (svgOverlayRef.current.firstChild) {
      svgOverlayRef.current.removeChild(svgOverlayRef.current.firstChild);
    }

    const allDrawings = isDrawing && currentPoints.length > 0
      ? [...drawings, { 
          id: 'temp', 
          type: 'trendline' as const, 
          points: currentPoints, 
          color: '#ffffff', 
          lineWidth: 2, 
          style: 'dashed' as const 
        }]
      : drawings;

    allDrawings.forEach(drawing => {
      const svg = svgOverlayRef.current;
      if (!svg) return;

      if (drawing.type === "trendline" && drawing.points.length === 2) {
        const x1 = timeToScreenX(drawing.points[0].time);
        const y1 = priceToScreenY(drawing.points[0].price);
        const x2 = timeToScreenX(drawing.points[1].time);
        const y2 = priceToScreenY(drawing.points[1].price);

        if (x1 !== null && y1 !== null && x2 !== null && y2 !== null) {
          const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
          line.setAttribute("x1", x1.toString());
          line.setAttribute("y1", y1.toString());
          line.setAttribute("x2", x2.toString());
          line.setAttribute("y2", y2.toString());
          line.setAttribute("stroke", drawing.color);
          line.setAttribute("stroke-width", drawing.lineWidth.toString());
          line.setAttribute("stroke-dasharray", drawing.style === "dashed" ? "5,5" : "0");
          svg.appendChild(line);
        }
      } else if (drawing.type === "horizontal" && drawing.points.length >= 1) {
        const y = priceToScreenY(drawing.points[0].price);
        if (y !== null && containerRef.current) {
          const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
          line.setAttribute("x1", "0");
          line.setAttribute("y1", y.toString());
          line.setAttribute("x2", containerRef.current.clientWidth.toString());
          line.setAttribute("y2", y.toString());
          line.setAttribute("stroke", drawing.color);
          line.setAttribute("stroke-width", drawing.lineWidth.toString());
          line.setAttribute("stroke-dasharray", "3,3");
          svg.appendChild(line);

          // Add price label
          const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
          text.setAttribute("x", "10");
          text.setAttribute("y", (y - 5).toString());
          text.setAttribute("fill", drawing.color);
          text.setAttribute("font-size", "12");
          text.setAttribute("font-weight", "bold");
          text.textContent = drawing.points[0].price.toFixed(2);
          svg.appendChild(text);
        }
      } else if (drawing.type === "vertical" && drawing.points.length >= 1) {
        const x = timeToScreenX(drawing.points[0].time);
        if (x !== null && containerRef.current) {
          const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
          line.setAttribute("x1", x.toString());
          line.setAttribute("y1", "0");
          line.setAttribute("x2", x.toString());
          line.setAttribute("y2", containerRef.current.clientHeight.toString());
          line.setAttribute("stroke", drawing.color);
          line.setAttribute("stroke-width", drawing.lineWidth.toString());
          line.setAttribute("stroke-dasharray", "3,3");
          svg.appendChild(line);
        }
      } else if (drawing.type === "rectangle" && drawing.points.length === 2) {
        const x1 = timeToScreenX(drawing.points[0].time);
        const y1 = priceToScreenY(drawing.points[0].price);
        const x2 = timeToScreenX(drawing.points[1].time);
        const y2 = priceToScreenY(drawing.points[1].price);

        if (x1 !== null && y1 !== null && x2 !== null && y2 !== null) {
          const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
          rect.setAttribute("x", Math.min(x1, x2).toString());
          rect.setAttribute("y", Math.min(y1, y2).toString());
          rect.setAttribute("width", Math.abs(x2 - x1).toString());
          rect.setAttribute("height", Math.abs(y2 - y1).toString());
          rect.setAttribute("fill", drawing.color);
          rect.setAttribute("fill-opacity", "0.1");
          rect.setAttribute("stroke", drawing.color);
          rect.setAttribute("stroke-width", drawing.lineWidth.toString());
          svg.appendChild(rect);
        }
      } else if (drawing.type === "fibonacci" && drawing.points.length === 2) {
        const x1 = timeToScreenX(drawing.points[0].time);
        const y1 = priceToScreenY(drawing.points[0].price);
        const x2 = timeToScreenX(drawing.points[1].time);
        const y2 = priceToScreenY(drawing.points[1].price);

        if (x1 !== null && y1 !== null && x2 !== null && y2 !== null) {
          const fibLevels = [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1];
          const priceDiff = drawing.points[1].price - drawing.points[0].price;

          fibLevels.forEach((level) => {
            const price = drawing.points[0].price + (priceDiff * level);
            const y = priceToScreenY(price);
            
            if (y !== null && containerRef.current) {
              const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
              line.setAttribute("x1", "0");
              line.setAttribute("y1", y.toString());
              line.setAttribute("x2", containerRef.current.clientWidth.toString());
              line.setAttribute("y2", y.toString());
              line.setAttribute("stroke", drawing.color);
              line.setAttribute("stroke-width", "1");
              line.setAttribute("stroke-dasharray", "2,2");
              line.setAttribute("opacity", "0.6");
              svg.appendChild(line);

              // Label
              const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
              text.setAttribute("x", "10");
              text.setAttribute("y", (y - 5).toString());
              text.setAttribute("fill", drawing.color);
              text.setAttribute("font-size", "11");
              text.textContent = `${(level * 100).toFixed(1)}% (${price.toFixed(2)})`;
              svg.appendChild(text);
            }
          });
        }
      }
    });
  }, [drawings, isDrawing, currentPoints, chartRef, priceToScreenY, timeToScreenX]);

  // Re-render when drawings or chart change
  useEffect(() => {
    renderDrawings();
  }, [drawings, isDrawing, currentPoints, renderDrawings]);

  // Re-render on chart visible range changes (zoom/pan)
  useEffect(() => {
    if (!chartRef.current) return;

    const handleUpdate = () => {
      requestAnimationFrame(renderDrawings);
    };

    renderDrawings();

    const timeScale = chartRef.current.timeScale();
    timeScale.subscribeVisibleLogicalRangeChange(handleUpdate);

    return () => {
      timeScale.unsubscribeVisibleLogicalRangeChange(handleUpdate);
    };
  }, [renderDrawings, chartRef]);

  return {
    drawings,
    isDrawing,
    isDrawingRef, // Export ref for checking without closure issues
    currentPoints,
    currentPointsRef, // Export ref for checking without closure issues
    currentStyle,
    setCurrentStyle,
    initializeOverlay,
    startDrawing,
    addPoint,
    completeDrawing,
    cancelDrawing,
    removeDrawing,
    clearAllDrawings,
  };
}
