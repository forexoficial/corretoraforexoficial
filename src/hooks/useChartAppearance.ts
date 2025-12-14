import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface ChartAppearanceSettings {
  id: string;
  chart_bg_color: string;
  chart_text_color: string;
  grid_vert_color: string;
  grid_horz_color: string;
  candle_up_color: string;
  candle_down_color: string;
  price_scale_border_color: string;
  time_scale_border_color: string;
  crosshair_color: string;
  // Dark mode colors
  chart_bg_color_dark: string;
  chart_text_color_dark: string;
  grid_vert_color_dark: string;
  grid_horz_color_dark: string;
  candle_up_color_dark: string;
  candle_down_color_dark: string;
  price_scale_border_color_dark: string;
  time_scale_border_color_dark: string;
  crosshair_color_dark: string;
  // Light mode colors
  chart_bg_color_light: string;
  chart_text_color_light: string;
  grid_vert_color_light: string;
  grid_horz_color_light: string;
  candle_up_color_light: string;
  candle_down_color_light: string;
  price_scale_border_color_light: string;
  time_scale_border_color_light: string;
  crosshair_color_light: string;
  // Candle borders
  candle_border_visible: boolean;
  candle_border_up_color: string;
  candle_border_down_color: string;
  candle_border_width: number;
  candle_border_up_color_dark: string;
  candle_border_down_color_dark: string;
  candle_border_up_color_light: string;
  candle_border_down_color_light: string;
  // Candle wicks
  wick_up_color: string;
  wick_down_color: string;
  wick_up_color_dark: string;
  wick_down_color_dark: string;
  wick_up_color_light: string;
  wick_down_color_light: string;
  // Map settings
  map_enabled: boolean;
  map_opacity: number;
  map_primary_color: string;
  map_secondary_color: string;
  map_show_grid: boolean;
  map_grid_opacity: number;
  map_image_url: string | null;
  map_image_url_dark: string | null;
  map_image_url_mobile: string | null;
  map_image_url_mobile_dark: string | null;
  watermark_visible: boolean;
  watermark_text: string | null;
  // Trade line settings
  trade_line_call_color: string;
  trade_line_put_color: string;
  trade_line_width: number;
  trade_line_style: number;
  trade_line_show_label: boolean;
  // Chart dimensions
  chart_height_desktop: number;
  chart_height_mobile: number;
  chart_width_percentage_desktop: number;
  chart_width_percentage_mobile: number;
  chart_aspect_ratio_desktop: string;
  chart_aspect_ratio_mobile: string;
  // Fullscreen settings
  chart_height_fullscreen: number;
  chart_width_percentage_fullscreen: number;
  chart_aspect_ratio_fullscreen: string;
  // Responsive modes
  chart_responsive_desktop: boolean;
  chart_responsive_mobile: boolean;
  chart_responsive_fullscreen: boolean;
  // Responsive height offsets
  chart_height_offset_desktop: number;
  chart_height_offset_mobile: number;
  chart_height_offset_fullscreen: number;
  // TradingView attribution
  show_tradingview_logo: boolean;
}

export function useChartAppearance() {
  const [settings, setSettings] = useState<ChartAppearanceSettings | null>(null);
  const [loading, setLoading] = useState(true);

  const loadSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('chart_appearance_settings')
        .select('*')
        .maybeSingle();

      if (error) throw error;
      if (data) {
        setSettings(data);
      }
    } catch (error) {
      console.error('Error loading chart appearance:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();

    // Listen for updates from admin panel
    const handleUpdate = () => {
      loadSettings();
    };

    window.addEventListener('chart-appearance-updated', handleUpdate);

    // Subscribe to realtime changes
    const channel = supabase
      .channel('chart-appearance-changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'chart_appearance_settings',
        },
        () => {
          loadSettings();
        }
      )
      .subscribe();

    return () => {
      window.removeEventListener('chart-appearance-updated', handleUpdate);
      supabase.removeChannel(channel);
    };
  }, []);

  return { settings, loading, refresh: loadSettings };
}
