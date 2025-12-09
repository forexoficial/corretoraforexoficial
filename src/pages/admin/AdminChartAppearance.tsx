import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Palette, MapPin, Grid3x3, Sparkles, Eye, Save, RotateCcw, Upload, X } from "lucide-react";
import { LoadingSpinner } from "@/components/LoadingSpinner";

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
  map_enabled: boolean;
  map_opacity: number;
  map_primary_color: string;
  map_secondary_color: string;
  map_show_grid: boolean;
  map_grid_opacity: number;
  map_image_url: string | null;
  map_image_url_dark: string | null;
  watermark_visible: boolean;
  watermark_text: string | null;
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

const defaultSettings: Omit<ChartAppearanceSettings, 'id'> = {
  chart_bg_color: '#0a0a0a',
  chart_text_color: '#d1d4dc',
  grid_vert_color: '#1e1e1e',
  grid_horz_color: '#1e1e1e',
  candle_up_color: '#22c55e',
  candle_down_color: '#ef4444',
  price_scale_border_color: '#2B2B43',
  time_scale_border_color: '#2B2B43',
  crosshair_color: '#758696',
  // Dark mode defaults
  chart_bg_color_dark: '#0a0a0a',
  chart_text_color_dark: '#d1d4dc',
  grid_vert_color_dark: '#1e1e1e',
  grid_horz_color_dark: '#1e1e1e',
  candle_up_color_dark: '#22c55e',
  candle_down_color_dark: '#ef4444',
  price_scale_border_color_dark: '#2B2B43',
  time_scale_border_color_dark: '#2B2B43',
  crosshair_color_dark: '#758696',
  // Light mode defaults
  chart_bg_color_light: '#ffffff',
  chart_text_color_light: '#1a1a1a',
  grid_vert_color_light: '#e5e5e5',
  grid_horz_color_light: '#e5e5e5',
  candle_up_color_light: '#22c55e',
  candle_down_color_light: '#ef4444',
  price_scale_border_color_light: '#d1d5db',
  time_scale_border_color_light: '#d1d5db',
  crosshair_color_light: '#6b7280',
  // Candle borders defaults
  candle_border_visible: false,
  candle_border_up_color: '#22c55e',
  candle_border_down_color: '#ef4444',
  candle_border_width: 1,
  candle_border_up_color_dark: '#22c55e',
  candle_border_down_color_dark: '#ef4444',
  candle_border_up_color_light: '#22c55e',
  candle_border_down_color_light: '#ef4444',
  // Candle wicks defaults
  wick_up_color: '#22c55e',
  wick_down_color: '#ef4444',
  wick_up_color_dark: '#22c55e',
  wick_down_color_dark: '#ef4444',
  wick_up_color_light: '#22c55e',
  wick_down_color_light: '#ef4444',
  map_enabled: true,
  map_opacity: 0.08,
  map_primary_color: '#6366f1',
  map_secondary_color: '#8b5cf6',
  map_show_grid: true,
  map_grid_opacity: 0.4,
  map_image_url: null,
  map_image_url_dark: null,
  watermark_visible: false,
  watermark_text: null,
  trade_line_call_color: '#22c55e',
  trade_line_put_color: '#ef4444',
  trade_line_width: 12,
  trade_line_style: 2,
  trade_line_show_label: true,
  // Chart dimensions defaults
  chart_height_desktop: 600,
  chart_height_mobile: 350,
  chart_width_percentage_desktop: 100,
  chart_width_percentage_mobile: 100,
  chart_aspect_ratio_desktop: '16:9',
  chart_aspect_ratio_mobile: '4:3',
  // Fullscreen defaults
  chart_height_fullscreen: 800,
  chart_width_percentage_fullscreen: 100,
  chart_aspect_ratio_fullscreen: '21:9',
  // Responsive modes defaults
  chart_responsive_desktop: false,
  chart_responsive_mobile: true,
  chart_responsive_fullscreen: true,
  // Responsive height offsets defaults
  chart_height_offset_desktop: 180,
  chart_height_offset_mobile: 160,
  chart_height_offset_fullscreen: 96,
  // TradingView attribution
  show_tradingview_logo: false,
};

export default function AdminChartAppearance() {
  const [settings, setSettings] = useState<ChartAppearanceSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingImageLight, setUploadingImageLight] = useState(false);
  const [uploadingImageDark, setUploadingImageDark] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('chart_appearance_settings')
        .select('*')
        .single();

      if (error) throw error;
      setSettings(data);
    } catch (error) {
      console.error('Error loading settings:', error);
      toast.error('Erro ao carregar configurações');
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, version: 'light' | 'dark') => {
    const file = e.target.files?.[0];
    if (!file || !settings) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Por favor, selecione uma imagem válida');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Imagem muito grande. Tamanho máximo: 5MB');
      return;
    }

    const setUploading = version === 'light' ? setUploadingImageLight : setUploadingImageDark;
    const urlField = version === 'light' ? 'map_image_url' : 'map_image_url_dark';
    
    setUploading(true);
    try {
      if (settings[urlField]) {
        const oldPath = settings[urlField]!.split('/').pop();
        if (oldPath) {
          await supabase.storage.from('chart-backgrounds').remove([oldPath]);
        }
      }

      const fileExt = file.name.split('.').pop();
      const fileName = `map-${version}-${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('chart-backgrounds')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('chart-backgrounds')
        .getPublicUrl(fileName);

      setSettings({ ...settings, [urlField]: publicUrl });
      toast.success(`Imagem ${version === 'light' ? 'clara' : 'escura'} enviada com sucesso!`);
    } catch (error) {
      console.error('Error uploading image:', error);
      toast.error('Erro ao enviar imagem');
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveImage = async (version: 'light' | 'dark') => {
    if (!settings) return;
    
    const urlField = version === 'light' ? 'map_image_url' : 'map_image_url_dark';
    const imageUrl = settings[urlField];
    
    if (!imageUrl) return;

    try {
      const path = imageUrl.split('/').pop();
      if (path) {
        await supabase.storage.from('chart-backgrounds').remove([path]);
      }

      setSettings({ ...settings, [urlField]: null });
      toast.success(`Imagem ${version === 'light' ? 'clara' : 'escura'} removida com sucesso!`);
    } catch (error) {
      console.error('Error removing image:', error);
      toast.error('Erro ao remover imagem');
    }
  };

  const handleSave = async () => {
    if (!settings) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('chart_appearance_settings')
        .update({
          ...settings,
          updated_at: new Date().toISOString(),
        })
        .eq('id', settings.id);

      if (error) throw error;
      
      toast.success('Configurações salvas com sucesso!');
      window.dispatchEvent(new CustomEvent('chart-appearance-updated'));
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error('Erro ao salvar configurações');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    if (!settings) return;

    if (!confirm('Tem certeza que deseja restaurar as configurações padrão?')) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('chart_appearance_settings')
        .update({
          ...defaultSettings,
          updated_at: new Date().toISOString(),
        })
        .eq('id', settings.id);

      if (error) throw error;
      
      setSettings({ ...settings, ...defaultSettings });
      toast.success('Configurações restauradas!');
      window.dispatchEvent(new CustomEvent('chart-appearance-updated'));
    } catch (error) {
      console.error('Error resetting settings:', error);
      toast.error('Erro ao restaurar configurações');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!settings) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-muted-foreground">Erro ao carregar configurações</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-16">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Aparência do Gráfico</h1>
          <p className="text-muted-foreground mt-1">
            Personalize todas as cores e estilos do gráfico de trading
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleReset} disabled={saving}>
            <RotateCcw className="h-4 w-4 mr-2" />
            Restaurar Padrão
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            <Save className="h-4 w-4 mr-2" />
            {saving ? 'Salvando...' : 'Salvar Alterações'}
          </Button>
        </div>
      </div>

      {/* Dark Mode Colors */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <span className="text-2xl">🌙</span>
            Modo Escuro
          </CardTitle>
          <CardDescription>
            Cores do gráfico quando o tema escuro está ativado
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Dark Mode Background */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <Palette className="h-4 w-4" />
              Cores Base (Escuro)
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="chart_bg_color_dark">Cor de Fundo</Label>
                <div className="flex gap-2">
                  <Input
                    id="chart_bg_color_dark"
                    type="color"
                    value={settings.chart_bg_color_dark}
                    onChange={(e) => setSettings({ ...settings, chart_bg_color_dark: e.target.value })}
                    className="w-20 h-10"
                  />
                  <Input
                    type="text"
                    value={settings.chart_bg_color_dark}
                    onChange={(e) => setSettings({ ...settings, chart_bg_color_dark: e.target.value })}
                    className="flex-1"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="chart_text_color_dark">Cor do Texto</Label>
                <div className="flex gap-2">
                  <Input
                    id="chart_text_color_dark"
                    type="color"
                    value={settings.chart_text_color_dark}
                    onChange={(e) => setSettings({ ...settings, chart_text_color_dark: e.target.value })}
                    className="w-20 h-10"
                  />
                  <Input
                    type="text"
                    value={settings.chart_text_color_dark}
                    onChange={(e) => setSettings({ ...settings, chart_text_color_dark: e.target.value })}
                    className="flex-1"
                  />
                </div>
              </div>
            </div>
          </div>

          <Separator />

          {/* Dark Mode Candles */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <Sparkles className="h-4 w-4" />
              Velas (Escuro)
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="candle_up_color_dark">Vela de Alta</Label>
                <div className="flex gap-2">
                  <Input
                    id="candle_up_color_dark"
                    type="color"
                    value={settings.candle_up_color_dark}
                    onChange={(e) => setSettings({ ...settings, candle_up_color_dark: e.target.value })}
                    className="w-20 h-10"
                  />
                  <Input
                    type="text"
                    value={settings.candle_up_color_dark}
                    onChange={(e) => setSettings({ ...settings, candle_up_color_dark: e.target.value })}
                    className="flex-1"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="candle_down_color_dark">Vela de Baixa</Label>
                <div className="flex gap-2">
                  <Input
                    id="candle_down_color_dark"
                    type="color"
                    value={settings.candle_down_color_dark}
                    onChange={(e) => setSettings({ ...settings, candle_down_color_dark: e.target.value })}
                    className="w-20 h-10"
                  />
                  <Input
                    type="text"
                    value={settings.candle_down_color_dark}
                    onChange={(e) => setSettings({ ...settings, candle_down_color_dark: e.target.value })}
                    className="flex-1"
                  />
                </div>
              </div>
            </div>
          </div>

          <Separator />

          {/* Dark Mode Grid */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <Grid3x3 className="h-4 w-4" />
              Grade e Bordas (Escuro)
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="grid_vert_color_dark">Linhas Verticais</Label>
                <div className="flex gap-2">
                  <Input
                    id="grid_vert_color_dark"
                    type="color"
                    value={settings.grid_vert_color_dark}
                    onChange={(e) => setSettings({ ...settings, grid_vert_color_dark: e.target.value })}
                    className="w-20 h-10"
                  />
                  <Input
                    type="text"
                    value={settings.grid_vert_color_dark}
                    onChange={(e) => setSettings({ ...settings, grid_vert_color_dark: e.target.value })}
                    className="flex-1"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="grid_horz_color_dark">Linhas Horizontais</Label>
                <div className="flex gap-2">
                  <Input
                    id="grid_horz_color_dark"
                    type="color"
                    value={settings.grid_horz_color_dark}
                    onChange={(e) => setSettings({ ...settings, grid_horz_color_dark: e.target.value })}
                    className="w-20 h-10"
                  />
                  <Input
                    type="text"
                    value={settings.grid_horz_color_dark}
                    onChange={(e) => setSettings({ ...settings, grid_horz_color_dark: e.target.value })}
                    className="flex-1"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="price_scale_border_color_dark">Borda Escala Preço</Label>
                <div className="flex gap-2">
                  <Input
                    id="price_scale_border_color_dark"
                    type="color"
                    value={settings.price_scale_border_color_dark}
                    onChange={(e) => setSettings({ ...settings, price_scale_border_color_dark: e.target.value })}
                    className="w-20 h-10"
                  />
                  <Input
                    type="text"
                    value={settings.price_scale_border_color_dark}
                    onChange={(e) => setSettings({ ...settings, price_scale_border_color_dark: e.target.value })}
                    className="flex-1"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="time_scale_border_color_dark">Borda Escala Tempo</Label>
                <div className="flex gap-2">
                  <Input
                    id="time_scale_border_color_dark"
                    type="color"
                    value={settings.time_scale_border_color_dark}
                    onChange={(e) => setSettings({ ...settings, time_scale_border_color_dark: e.target.value })}
                    className="w-20 h-10"
                  />
                  <Input
                    type="text"
                    value={settings.time_scale_border_color_dark}
                    onChange={(e) => setSettings({ ...settings, time_scale_border_color_dark: e.target.value })}
                    className="flex-1"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="crosshair_color_dark">Cor da Mira</Label>
                <div className="flex gap-2">
                  <Input
                    id="crosshair_color_dark"
                    type="color"
                    value={settings.crosshair_color_dark}
                    onChange={(e) => setSettings({ ...settings, crosshair_color_dark: e.target.value })}
                    className="w-20 h-10"
                  />
                  <Input
                    type="text"
                    value={settings.crosshair_color_dark}
                    onChange={(e) => setSettings({ ...settings, crosshair_color_dark: e.target.value })}
                    className="flex-1"
                  />
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Light Mode Colors */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <span className="text-2xl">☀️</span>
            Modo Claro
          </CardTitle>
          <CardDescription>
            Cores do gráfico quando o tema claro está ativado
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Light Mode Background */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <Palette className="h-4 w-4" />
              Cores Base (Claro)
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="chart_bg_color_light">Cor de Fundo</Label>
                <div className="flex gap-2">
                  <Input
                    id="chart_bg_color_light"
                    type="color"
                    value={settings.chart_bg_color_light}
                    onChange={(e) => setSettings({ ...settings, chart_bg_color_light: e.target.value })}
                    className="w-20 h-10"
                  />
                  <Input
                    type="text"
                    value={settings.chart_bg_color_light}
                    onChange={(e) => setSettings({ ...settings, chart_bg_color_light: e.target.value })}
                    className="flex-1"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="chart_text_color_light">Cor do Texto</Label>
                <div className="flex gap-2">
                  <Input
                    id="chart_text_color_light"
                    type="color"
                    value={settings.chart_text_color_light}
                    onChange={(e) => setSettings({ ...settings, chart_text_color_light: e.target.value })}
                    className="w-20 h-10"
                  />
                  <Input
                    type="text"
                    value={settings.chart_text_color_light}
                    onChange={(e) => setSettings({ ...settings, chart_text_color_light: e.target.value })}
                    className="flex-1"
                  />
                </div>
              </div>
            </div>
          </div>

          <Separator />

          {/* Light Mode Candles */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <Sparkles className="h-4 w-4" />
              Velas (Claro)
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="candle_up_color_light">Vela de Alta</Label>
                <div className="flex gap-2">
                  <Input
                    id="candle_up_color_light"
                    type="color"
                    value={settings.candle_up_color_light}
                    onChange={(e) => setSettings({ ...settings, candle_up_color_light: e.target.value })}
                    className="w-20 h-10"
                  />
                  <Input
                    type="text"
                    value={settings.candle_up_color_light}
                    onChange={(e) => setSettings({ ...settings, candle_up_color_light: e.target.value })}
                    className="flex-1"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="candle_down_color_light">Vela de Baixa</Label>
                <div className="flex gap-2">
                  <Input
                    id="candle_down_color_light"
                    type="color"
                    value={settings.candle_down_color_light}
                    onChange={(e) => setSettings({ ...settings, candle_down_color_light: e.target.value })}
                    className="w-20 h-10"
                  />
                  <Input
                    type="text"
                    value={settings.candle_down_color_light}
                    onChange={(e) => setSettings({ ...settings, candle_down_color_light: e.target.value })}
                    className="flex-1"
                  />
                </div>
              </div>
            </div>
          </div>

          <Separator />

          {/* Light Mode Grid */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <Grid3x3 className="h-4 w-4" />
              Grade e Bordas (Claro)
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="grid_vert_color_light">Linhas Verticais</Label>
                <div className="flex gap-2">
                  <Input
                    id="grid_vert_color_light"
                    type="color"
                    value={settings.grid_vert_color_light}
                    onChange={(e) => setSettings({ ...settings, grid_vert_color_light: e.target.value })}
                    className="w-20 h-10"
                  />
                  <Input
                    type="text"
                    value={settings.grid_vert_color_light}
                    onChange={(e) => setSettings({ ...settings, grid_vert_color_light: e.target.value })}
                    className="flex-1"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="grid_horz_color_light">Linhas Horizontais</Label>
                <div className="flex gap-2">
                  <Input
                    id="grid_horz_color_light"
                    type="color"
                    value={settings.grid_horz_color_light}
                    onChange={(e) => setSettings({ ...settings, grid_horz_color_light: e.target.value })}
                    className="w-20 h-10"
                  />
                  <Input
                    type="text"
                    value={settings.grid_horz_color_light}
                    onChange={(e) => setSettings({ ...settings, grid_horz_color_light: e.target.value })}
                    className="flex-1"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="price_scale_border_color_light">Borda Escala Preço</Label>
                <div className="flex gap-2">
                  <Input
                    id="price_scale_border_color_light"
                    type="color"
                    value={settings.price_scale_border_color_light}
                    onChange={(e) => setSettings({ ...settings, price_scale_border_color_light: e.target.value })}
                    className="w-20 h-10"
                  />
                  <Input
                    type="text"
                    value={settings.price_scale_border_color_light}
                    onChange={(e) => setSettings({ ...settings, price_scale_border_color_light: e.target.value })}
                    className="flex-1"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="time_scale_border_color_light">Borda Escala Tempo</Label>
                <div className="flex gap-2">
                  <Input
                    id="time_scale_border_color_light"
                    type="color"
                    value={settings.time_scale_border_color_light}
                    onChange={(e) => setSettings({ ...settings, time_scale_border_color_light: e.target.value })}
                    className="w-20 h-10"
                  />
                  <Input
                    type="text"
                    value={settings.time_scale_border_color_light}
                    onChange={(e) => setSettings({ ...settings, time_scale_border_color_light: e.target.value })}
                    className="flex-1"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="crosshair_color_light">Cor da Mira</Label>
                <div className="flex gap-2">
                  <Input
                    id="crosshair_color_light"
                    type="color"
                    value={settings.crosshair_color_light}
                    onChange={(e) => setSettings({ ...settings, crosshair_color_light: e.target.value })}
                    className="w-20 h-10"
                  />
                  <Input
                    type="text"
                    value={settings.crosshair_color_light}
                    onChange={(e) => setSettings({ ...settings, crosshair_color_light: e.target.value })}
                    className="flex-1"
                  />
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Background & Base Colors */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Palette className="h-5 w-5" />
            Cores Base do Gráfico (Legado)
          </CardTitle>
          <CardDescription>
            Configure as cores de fundo e texto do gráfico (será removido em breve)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="chart_bg_color">Cor de Fundo</Label>
              <div className="flex gap-2">
                <Input
                  id="chart_bg_color"
                  type="color"
                  value={settings.chart_bg_color}
                  onChange={(e) => setSettings({ ...settings, chart_bg_color: e.target.value })}
                  className="w-20 h-10"
                />
                <Input
                  type="text"
                  value={settings.chart_bg_color}
                  onChange={(e) => setSettings({ ...settings, chart_bg_color: e.target.value })}
                  className="flex-1"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="chart_text_color">Cor do Texto</Label>
              <div className="flex gap-2">
                <Input
                  id="chart_text_color"
                  type="color"
                  value={settings.chart_text_color}
                  onChange={(e) => setSettings({ ...settings, chart_text_color: e.target.value })}
                  className="w-20 h-10"
                />
                <Input
                  type="text"
                  value={settings.chart_text_color}
                  onChange={(e) => setSettings({ ...settings, chart_text_color: e.target.value })}
                  className="flex-1"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Candle Colors */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            Cores das Velas (Legado)
          </CardTitle>
          <CardDescription>
            Configure as cores das velas de alta e baixa (será removido em breve)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="candle_up_color">Vela de Alta (Verde)</Label>
              <div className="flex gap-2">
                <Input
                  id="candle_up_color"
                  type="color"
                  value={settings.candle_up_color}
                  onChange={(e) => setSettings({ ...settings, candle_up_color: e.target.value })}
                  className="w-20 h-10"
                />
                <Input
                  type="text"
                  value={settings.candle_up_color}
                  onChange={(e) => setSettings({ ...settings, candle_up_color: e.target.value })}
                  className="flex-1"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="candle_down_color">Vela de Baixa (Vermelha)</Label>
              <div className="flex gap-2">
                <Input
                  id="candle_down_color"
                  type="color"
                  value={settings.candle_down_color}
                  onChange={(e) => setSettings({ ...settings, candle_down_color: e.target.value })}
                  className="w-20 h-10"
                />
                <Input
                  type="text"
                  value={settings.candle_down_color}
                  onChange={(e) => setSettings({ ...settings, candle_down_color: e.target.value })}
                  className="flex-1"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Candle Borders */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            Contorno das Velas
          </CardTitle>
          <CardDescription>
            Configure o contorno (bordas) das velas do gráfico
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Toggle para ativar/desativar contorno */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="candle_border_visible">Ativar Contorno das Velas</Label>
              <p className="text-xs text-muted-foreground">
                Exibe uma borda ao redor dos candles para melhor visualização
              </p>
            </div>
            <Switch
              id="candle_border_visible"
              checked={settings.candle_border_visible}
              onCheckedChange={(checked) => setSettings({ ...settings, candle_border_visible: checked })}
            />
          </div>

          <Separator />

          {/* Espessura do contorno */}
          <div className="space-y-2">
            <Label htmlFor="candle_border_width">Espessura do Contorno (1-5 pixels)</Label>
            <div className="flex items-center gap-4">
              <input
                id="candle_border_width"
                type="range"
                min="1"
                max="5"
                value={settings.candle_border_width}
                onChange={(e) => setSettings({ ...settings, candle_border_width: parseInt(e.target.value) })}
                className="flex-1"
              />
              <span className="text-sm font-mono w-12 text-center">{settings.candle_border_width}px</span>
            </div>
          </div>

          <Separator />

          {/* Cores do contorno - Modo Escuro */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <Sparkles className="h-4 w-4" />
              Cores do Contorno (Modo Escuro)
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="candle_border_up_color_dark">Contorno Vela de Alta</Label>
                <div className="flex gap-2">
                  <Input
                    id="candle_border_up_color_dark"
                    type="color"
                    value={settings.candle_border_up_color_dark}
                    onChange={(e) => setSettings({ ...settings, candle_border_up_color_dark: e.target.value })}
                    className="w-20 h-10"
                  />
                  <Input
                    type="text"
                    value={settings.candle_border_up_color_dark}
                    onChange={(e) => setSettings({ ...settings, candle_border_up_color_dark: e.target.value })}
                    className="flex-1"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="candle_border_down_color_dark">Contorno Vela de Baixa</Label>
                <div className="flex gap-2">
                  <Input
                    id="candle_border_down_color_dark"
                    type="color"
                    value={settings.candle_border_down_color_dark}
                    onChange={(e) => setSettings({ ...settings, candle_border_down_color_dark: e.target.value })}
                    className="w-20 h-10"
                  />
                  <Input
                    type="text"
                    value={settings.candle_border_down_color_dark}
                    onChange={(e) => setSettings({ ...settings, candle_border_down_color_dark: e.target.value })}
                    className="flex-1"
                  />
                </div>
              </div>
            </div>
          </div>

          <Separator />

          {/* Cores do contorno - Modo Claro */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <Sparkles className="h-4 w-4" />
              Cores do Contorno (Modo Claro)
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="candle_border_up_color_light">Contorno Vela de Alta</Label>
                <div className="flex gap-2">
                  <Input
                    id="candle_border_up_color_light"
                    type="color"
                    value={settings.candle_border_up_color_light}
                    onChange={(e) => setSettings({ ...settings, candle_border_up_color_light: e.target.value })}
                    className="w-20 h-10"
                  />
                  <Input
                    type="text"
                    value={settings.candle_border_up_color_light}
                    onChange={(e) => setSettings({ ...settings, candle_border_up_color_light: e.target.value })}
                    className="flex-1"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="candle_border_down_color_light">Contorno Vela de Baixa</Label>
                <div className="flex gap-2">
                  <Input
                    id="candle_border_down_color_light"
                    type="color"
                    value={settings.candle_border_down_color_light}
                    onChange={(e) => setSettings({ ...settings, candle_border_down_color_light: e.target.value })}
                    className="w-20 h-10"
                  />
                  <Input
                    type="text"
                    value={settings.candle_border_down_color_light}
                    onChange={(e) => setSettings({ ...settings, candle_border_down_color_light: e.target.value })}
                    className="flex-1"
                  />
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Candle Wicks */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            Cores dos Pavios das Velas
          </CardTitle>
          <CardDescription>
            Configure as cores dos pavios (linhas superiores e inferiores) das velas
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Cores dos pavios - Modo Escuro */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <Sparkles className="h-4 w-4" />
              Cores dos Pavios (Modo Escuro)
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="wick_up_color_dark">Pavio Vela de Alta</Label>
                <div className="flex gap-2">
                  <Input
                    id="wick_up_color_dark"
                    type="color"
                    value={settings.wick_up_color_dark}
                    onChange={(e) => setSettings({ ...settings, wick_up_color_dark: e.target.value })}
                    className="w-20 h-10"
                  />
                  <Input
                    type="text"
                    value={settings.wick_up_color_dark}
                    onChange={(e) => setSettings({ ...settings, wick_up_color_dark: e.target.value })}
                    className="flex-1"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="wick_down_color_dark">Pavio Vela de Baixa</Label>
                <div className="flex gap-2">
                  <Input
                    id="wick_down_color_dark"
                    type="color"
                    value={settings.wick_down_color_dark}
                    onChange={(e) => setSettings({ ...settings, wick_down_color_dark: e.target.value })}
                    className="w-20 h-10"
                  />
                  <Input
                    type="text"
                    value={settings.wick_down_color_dark}
                    onChange={(e) => setSettings({ ...settings, wick_down_color_dark: e.target.value })}
                    className="flex-1"
                  />
                </div>
              </div>
            </div>
          </div>

          <Separator />

          {/* Cores dos pavios - Modo Claro */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <Sparkles className="h-4 w-4" />
              Cores dos Pavios (Modo Claro)
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="wick_up_color_light">Pavio Vela de Alta</Label>
                <div className="flex gap-2">
                  <Input
                    id="wick_up_color_light"
                    type="color"
                    value={settings.wick_up_color_light}
                    onChange={(e) => setSettings({ ...settings, wick_up_color_light: e.target.value })}
                    className="w-20 h-10"
                  />
                  <Input
                    type="text"
                    value={settings.wick_up_color_light}
                    onChange={(e) => setSettings({ ...settings, wick_up_color_light: e.target.value })}
                    className="flex-1"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="wick_down_color_light">Pavio Vela de Baixa</Label>
                <div className="flex gap-2">
                  <Input
                    id="wick_down_color_light"
                    type="color"
                    value={settings.wick_down_color_light}
                    onChange={(e) => setSettings({ ...settings, wick_down_color_light: e.target.value })}
                    className="w-20 h-10"
                  />
                  <Input
                    type="text"
                    value={settings.wick_down_color_light}
                    onChange={(e) => setSettings({ ...settings, wick_down_color_light: e.target.value })}
                    className="flex-1"
                  />
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Grid Colors */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Grid3x3 className="h-5 w-5" />
            Grade do Gráfico (Legado)
          </CardTitle>
          <CardDescription>
            Configure as cores das linhas da grade (será removido em breve)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="grid_vert_color">Linhas Verticais</Label>
              <div className="flex gap-2">
                <Input
                  id="grid_vert_color"
                  type="color"
                  value={settings.grid_vert_color}
                  onChange={(e) => setSettings({ ...settings, grid_vert_color: e.target.value })}
                  className="w-20 h-10"
                />
                <Input
                  type="text"
                  value={settings.grid_vert_color}
                  onChange={(e) => setSettings({ ...settings, grid_vert_color: e.target.value })}
                  className="flex-1"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="grid_horz_color">Linhas Horizontais</Label>
              <div className="flex gap-2">
                <Input
                  id="grid_horz_color"
                  type="color"
                  value={settings.grid_horz_color}
                  onChange={(e) => setSettings({ ...settings, grid_horz_color: e.target.value })}
                  className="w-20 h-10"
                />
                <Input
                  type="text"
                  value={settings.grid_horz_color}
                  onChange={(e) => setSettings({ ...settings, grid_horz_color: e.target.value })}
                  className="flex-1"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="price_scale_border_color">Borda Escala de Preço</Label>
              <div className="flex gap-2">
                <Input
                  id="price_scale_border_color"
                  type="color"
                  value={settings.price_scale_border_color}
                  onChange={(e) => setSettings({ ...settings, price_scale_border_color: e.target.value })}
                  className="w-20 h-10"
                />
                <Input
                  type="text"
                  value={settings.price_scale_border_color}
                  onChange={(e) => setSettings({ ...settings, price_scale_border_color: e.target.value })}
                  className="flex-1"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="time_scale_border_color">Borda Escala de Tempo</Label>
              <div className="flex gap-2">
                <Input
                  id="time_scale_border_color"
                  type="color"
                  value={settings.time_scale_border_color}
                  onChange={(e) => setSettings({ ...settings, time_scale_border_color: e.target.value })}
                  className="w-20 h-10"
                />
                <Input
                  type="text"
                  value={settings.time_scale_border_color}
                  onChange={(e) => setSettings({ ...settings, time_scale_border_color: e.target.value })}
                  className="flex-1"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* World Map Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Mapa Mundi de Fundo
          </CardTitle>
          <CardDescription>
            Configure o mapa mundial exibido no fundo do gráfico
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="map_enabled">Exibir Mapa de Fundo</Label>
              <p className="text-sm text-muted-foreground">
                Ativa ou desativa o mapa mundial no fundo do gráfico
              </p>
            </div>
            <Switch
              id="map_enabled"
              checked={settings.map_enabled}
              onCheckedChange={(checked) => setSettings({ ...settings, map_enabled: checked })}
            />
          </div>

          {settings.map_enabled && (
            <>
              <Separator />
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Versão Clara */}
                <div className="space-y-3">
                  <Label className="flex items-center gap-2">
                    <span className="text-lg">☀️</span>
                    Versão Clara
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Para fundos escuros
                  </p>
                  
                  {settings.map_image_url ? (
                    <div className="space-y-3">
                      <div className="relative w-full h-40 border rounded-lg overflow-hidden bg-muted">
                        <img 
                          src={settings.map_image_url} 
                          alt="Mapa versão clara" 
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleRemoveImage('light')}
                          className="flex-1"
                        >
                          <X className="w-4 h-4 mr-2" />
                          Remover
                        </Button>
                        <Label htmlFor="map-image-light-upload" className="flex-1">
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={uploadingImageLight}
                            className="w-full"
                            asChild
                          >
                            <div>
                              <Upload className="w-4 h-4 mr-2" />
                              {uploadingImageLight ? 'Enviando...' : 'Trocar'}
                            </div>
                          </Button>
                        </Label>
                      </div>
                    </div>
                  ) : (
                    <Label htmlFor="map-image-light-upload">
                      <div className="flex items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer hover:bg-muted/50 transition-colors">
                        <div className="text-center">
                          <Upload className="w-6 h-6 mx-auto mb-2 text-muted-foreground" />
                          <p className="text-sm text-muted-foreground">
                            {uploadingImageLight ? 'Enviando...' : 'Clique para upload'}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            PNG, JPG, WEBP (max 5MB)
                          </p>
                        </div>
                      </div>
                    </Label>
                  )}
                  
                  <input
                    id="map-image-light-upload"
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleImageUpload(e, 'light')}
                    className="hidden"
                    disabled={uploadingImageLight}
                  />
                </div>

                {/* Versão Escura */}
                <div className="space-y-3">
                  <Label className="flex items-center gap-2">
                    <span className="text-lg">🌙</span>
                    Versão Escura
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Para fundos claros
                  </p>
                  
                  {settings.map_image_url_dark ? (
                    <div className="space-y-3">
                      <div className="relative w-full h-40 border rounded-lg overflow-hidden bg-muted">
                        <img 
                          src={settings.map_image_url_dark} 
                          alt="Mapa versão escura" 
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleRemoveImage('dark')}
                          className="flex-1"
                        >
                          <X className="w-4 h-4 mr-2" />
                          Remover
                        </Button>
                        <Label htmlFor="map-image-dark-upload" className="flex-1">
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={uploadingImageDark}
                            className="w-full"
                            asChild
                          >
                            <div>
                              <Upload className="w-4 h-4 mr-2" />
                              {uploadingImageDark ? 'Enviando...' : 'Trocar'}
                            </div>
                          </Button>
                        </Label>
                      </div>
                    </div>
                  ) : (
                    <Label htmlFor="map-image-dark-upload">
                      <div className="flex items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer hover:bg-muted/50 transition-colors">
                        <div className="text-center">
                          <Upload className="w-6 h-6 mx-auto mb-2 text-muted-foreground" />
                          <p className="text-sm text-muted-foreground">
                            {uploadingImageDark ? 'Enviando...' : 'Clique para upload'}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            PNG, JPG, WEBP (max 5MB)
                          </p>
                        </div>
                      </div>
                    </Label>
                  )}
                  
                  <input
                    id="map-image-dark-upload"
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleImageUpload(e, 'dark')}
                    className="hidden"
                    disabled={uploadingImageDark}
                  />
                </div>
              </div>
              
              <Separator />
              
              <div className="space-y-2">
                <Label htmlFor="map_opacity">
                  Opacidade do Mapa: {(settings.map_opacity * 100).toFixed(0)}%
                </Label>
                <Input
                  id="map_opacity"
                  type="range"
                  min="0"
                  max="0.3"
                  step="0.01"
                  value={settings.map_opacity}
                  onChange={(e) => setSettings({ ...settings, map_opacity: parseFloat(e.target.value) })}
                  className="w-full"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="map_primary_color">Cor Primária do Mapa</Label>
                  <div className="flex gap-2">
                    <Input
                      id="map_primary_color"
                      type="color"
                      value={settings.map_primary_color}
                      onChange={(e) => setSettings({ ...settings, map_primary_color: e.target.value })}
                      className="w-20 h-10"
                    />
                    <Input
                      type="text"
                      value={settings.map_primary_color}
                      onChange={(e) => setSettings({ ...settings, map_primary_color: e.target.value })}
                      className="flex-1"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="map_secondary_color">Cor Secundária do Mapa</Label>
                  <div className="flex gap-2">
                    <Input
                      id="map_secondary_color"
                      type="color"
                      value={settings.map_secondary_color}
                      onChange={(e) => setSettings({ ...settings, map_secondary_color: e.target.value })}
                      className="w-20 h-10"
                    />
                    <Input
                      type="text"
                      value={settings.map_secondary_color}
                      onChange={(e) => setSettings({ ...settings, map_secondary_color: e.target.value })}
                      className="flex-1"
                    />
                  </div>
                </div>
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="map_show_grid">Exibir Grade no Mapa</Label>
                  <p className="text-sm text-muted-foreground">
                    Mostra linhas de latitude e longitude
                  </p>
                </div>
                <Switch
                  id="map_show_grid"
                  checked={settings.map_show_grid}
                  onCheckedChange={(checked) => setSettings({ ...settings, map_show_grid: checked })}
                />
              </div>

              {settings.map_show_grid && (
                <div className="space-y-2">
                  <Label htmlFor="map_grid_opacity">
                    Opacidade da Grade: {(settings.map_grid_opacity * 100).toFixed(0)}%
                  </Label>
                  <Input
                    id="map_grid_opacity"
                    type="range"
                    min="0"
                    max="1"
                    step="0.1"
                    value={settings.map_grid_opacity}
                    onChange={(e) => setSettings({ ...settings, map_grid_opacity: parseFloat(e.target.value) })}
                    className="w-full"
                  />
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Additional Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            Configurações Adicionais
          </CardTitle>
          <CardDescription>
            Outras opções de personalização do gráfico
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="crosshair_color">Cor do Crosshair</Label>
            <div className="flex gap-2">
              <Input
                id="crosshair_color"
                type="color"
                value={settings.crosshair_color}
                onChange={(e) => setSettings({ ...settings, crosshair_color: e.target.value })}
                className="w-20 h-10"
              />
              <Input
                type="text"
                value={settings.crosshair_color}
                onChange={(e) => setSettings({ ...settings, crosshair_color: e.target.value })}
                className="flex-1"
              />
            </div>
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="watermark_visible">Marca d'água</Label>
              <p className="text-sm text-muted-foreground">
                Exibe uma marca d'água no gráfico
              </p>
            </div>
            <Switch
              id="watermark_visible"
              checked={settings.watermark_visible}
              onCheckedChange={(checked) => setSettings({ ...settings, watermark_visible: checked })}
            />
          </div>

          {settings.watermark_visible && (
            <div className="space-y-2">
              <Label htmlFor="watermark_text">Texto da Marca d'água</Label>
              <Input
                id="watermark_text"
                type="text"
                value={settings.watermark_text || ''}
                onChange={(e) => setSettings({ ...settings, watermark_text: e.target.value })}
                placeholder="Ex: Sua Plataforma"
              />
            </div>
          )}

          <Separator />

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="show_tradingview_logo">Logo TradingView</Label>
              <p className="text-sm text-muted-foreground">
                Exibe o logo de atribuição do TradingView no gráfico
              </p>
            </div>
            <Switch
              id="show_tradingview_logo"
              checked={settings.show_tradingview_logo || false}
              onCheckedChange={(checked) => setSettings({ ...settings, show_tradingview_logo: checked })}
            />
          </div>
        </CardContent>
      </Card>

      {/* Chart Dimensions Configuration */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Grid3x3 className="h-5 w-5 text-primary" />
            <CardTitle>Dimensões do Gráfico</CardTitle>
          </div>
          <CardDescription>
            Configure as proporções e tamanhos do gráfico para desktop e mobile
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Desktop Settings */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold flex items-center gap-2">
                🖥️ Desktop
              </h3>
              <div className="flex items-center gap-2">
                <Label htmlFor="chart_responsive_desktop" className="text-xs text-muted-foreground">
                  Modo Responsivo
                </Label>
                <Switch
                  id="chart_responsive_desktop"
                  checked={settings.chart_responsive_desktop || false}
                  onCheckedChange={(checked) => setSettings({ ...settings, chart_responsive_desktop: checked })}
                />
              </div>
            </div>
            
            {settings.chart_responsive_desktop ? (
              <div className="space-y-4">
                <div className="p-4 bg-muted/50 rounded-lg">
                  <p className="text-sm text-muted-foreground">
                    ✨ <strong>Modo Responsivo Ativo:</strong> O gráfico ocupará automaticamente todo o espaço disponível no container, adaptando-se ao tamanho da tela do usuário.
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="chart_height_offset_desktop">Offset de Altura (px)</Label>
                  <div className="flex items-center gap-4">
                    <input
                      id="chart_height_offset_desktop"
                      type="range"
                      min="50"
                      max="400"
                      step="10"
                      value={settings.chart_height_offset_desktop ?? 180}
                      onChange={(e) => setSettings({ ...settings, chart_height_offset_desktop: parseInt(e.target.value) })}
                      className="flex-1"
                    />
                    <Input
                      type="number"
                      value={settings.chart_height_offset_desktop ?? 180}
                      onChange={(e) => setSettings({ ...settings, chart_height_offset_desktop: parseInt(e.target.value) || 180 })}
                      className="w-20"
                      min="50"
                      max="400"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Pixels subtraídos da altura do viewport para calcular a altura do gráfico. Valores menores = gráfico maior.
                  </p>
                </div>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="chart_height_desktop">Altura do Gráfico (px)</Label>
                    <div className="flex items-center gap-4">
                      <input
                        id="chart_height_desktop"
                        type="range"
                        min="300"
                        max="1000"
                        step="10"
                        value={settings.chart_height_desktop}
                        onChange={(e) => setSettings({ ...settings, chart_height_desktop: parseInt(e.target.value) })}
                        className="flex-1"
                      />
                      <Input
                        type="number"
                        value={settings.chart_height_desktop}
                        onChange={(e) => setSettings({ ...settings, chart_height_desktop: parseInt(e.target.value) || 600 })}
                        className="w-20"
                        min="300"
                        max="1000"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="chart_width_percentage_desktop">Largura (%)</Label>
                    <div className="flex items-center gap-4">
                      <input
                        id="chart_width_percentage_desktop"
                        type="range"
                        min="50"
                        max="100"
                        value={settings.chart_width_percentage_desktop}
                        onChange={(e) => setSettings({ ...settings, chart_width_percentage_desktop: parseInt(e.target.value) })}
                        className="flex-1"
                      />
                      <span className="text-sm font-mono w-12 text-center">{settings.chart_width_percentage_desktop}%</span>
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="chart_aspect_ratio_desktop">Proporção</Label>
                  <select
                    id="chart_aspect_ratio_desktop"
                    value={settings.chart_aspect_ratio_desktop}
                    onChange={(e) => setSettings({ ...settings, chart_aspect_ratio_desktop: e.target.value })}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  >
                    <option value="auto">Automático (usa altura fixa)</option>
                    <option value="21:9">21:9 (Ultra-wide)</option>
                    <option value="16:9">16:9 (Widescreen)</option>
                    <option value="16:10">16:10</option>
                    <option value="4:3">4:3</option>
                    <option value="1:1">1:1 (Quadrado)</option>
                  </select>
                </div>
              </>
            )}
          </div>

          <Separator />

          {/* Mobile Settings */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold flex items-center gap-2">
                📱 Mobile
              </h3>
              <div className="flex items-center gap-2">
                <Label htmlFor="chart_responsive_mobile" className="text-xs text-muted-foreground">
                  Modo Responsivo
                </Label>
                <Switch
                  id="chart_responsive_mobile"
                  checked={settings.chart_responsive_mobile ?? true}
                  onCheckedChange={(checked) => setSettings({ ...settings, chart_responsive_mobile: checked })}
                />
              </div>
            </div>
            
            {(settings.chart_responsive_mobile ?? true) ? (
              <div className="space-y-4">
                <div className="p-4 bg-muted/50 rounded-lg">
                  <p className="text-sm text-muted-foreground">
                    ✨ <strong>Modo Responsivo Ativo:</strong> O gráfico ocupará automaticamente todo o espaço disponível, adaptando-se a diferentes tamanhos de tela de dispositivos móveis.
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="chart_height_offset_mobile">Offset de Altura (px)</Label>
                  <div className="flex items-center gap-4">
                    <input
                      id="chart_height_offset_mobile"
                      type="range"
                      min="100"
                      max="400"
                      step="10"
                      value={settings.chart_height_offset_mobile ?? 160}
                      onChange={(e) => setSettings({ ...settings, chart_height_offset_mobile: parseInt(e.target.value) })}
                      className="flex-1"
                    />
                    <Input
                      type="number"
                      value={settings.chart_height_offset_mobile ?? 160}
                      onChange={(e) => setSettings({ ...settings, chart_height_offset_mobile: parseInt(e.target.value) || 160 })}
                      className="w-20"
                      min="100"
                      max="400"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Pixels subtraídos da altura do viewport para calcular a altura do gráfico mobile.
                  </p>
                </div>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="chart_height_mobile">Altura do Gráfico (px)</Label>
                    <div className="flex items-center gap-4">
                      <input
                        id="chart_height_mobile"
                        type="range"
                        min="200"
                        max="600"
                        step="10"
                        value={settings.chart_height_mobile}
                        onChange={(e) => setSettings({ ...settings, chart_height_mobile: parseInt(e.target.value) })}
                        className="flex-1"
                      />
                      <Input
                        type="number"
                        value={settings.chart_height_mobile}
                        onChange={(e) => setSettings({ ...settings, chart_height_mobile: parseInt(e.target.value) || 350 })}
                        className="w-20"
                        min="200"
                        max="600"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="chart_width_percentage_mobile">Largura (%)</Label>
                    <div className="flex items-center gap-4">
                      <input
                        id="chart_width_percentage_mobile"
                        type="range"
                        min="50"
                        max="100"
                        value={settings.chart_width_percentage_mobile}
                        onChange={(e) => setSettings({ ...settings, chart_width_percentage_mobile: parseInt(e.target.value) })}
                        className="flex-1"
                      />
                      <span className="text-sm font-mono w-12 text-center">{settings.chart_width_percentage_mobile}%</span>
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="chart_aspect_ratio_mobile">Proporção</Label>
                  <select
                    id="chart_aspect_ratio_mobile"
                    value={settings.chart_aspect_ratio_mobile}
                    onChange={(e) => setSettings({ ...settings, chart_aspect_ratio_mobile: e.target.value })}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  >
                    <option value="auto">Automático (usa altura fixa)</option>
                    <option value="16:9">16:9 (Widescreen)</option>
                    <option value="4:3">4:3</option>
                    <option value="3:2">3:2</option>
                    <option value="1:1">1:1 (Quadrado)</option>
                  </select>
                </div>
              </>
            )}
          </div>

          <Separator />

          {/* Fullscreen Settings */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold flex items-center gap-2">
                  🖥️ Desktop Tela Cheia
                </h3>
                <p className="text-xs text-muted-foreground">
                  Configurações aplicadas quando o usuário está em modo tela cheia no desktop
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Label htmlFor="chart_responsive_fullscreen" className="text-xs text-muted-foreground">
                  Modo Responsivo
                </Label>
                <Switch
                  id="chart_responsive_fullscreen"
                  checked={settings.chart_responsive_fullscreen ?? true}
                  onCheckedChange={(checked) => setSettings({ ...settings, chart_responsive_fullscreen: checked })}
                />
              </div>
            </div>
            
            {(settings.chart_responsive_fullscreen ?? true) ? (
              <div className="space-y-4">
                <div className="p-4 bg-muted/50 rounded-lg">
                  <p className="text-sm text-muted-foreground">
                    ✨ <strong>Modo Responsivo Ativo:</strong> O gráfico ocupará automaticamente toda a área disponível da tela cheia.
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="chart_height_offset_fullscreen">Offset de Altura (px)</Label>
                  <div className="flex items-center gap-4">
                    <input
                      id="chart_height_offset_fullscreen"
                      type="range"
                      min="50"
                      max="300"
                      step="10"
                      value={settings.chart_height_offset_fullscreen ?? 96}
                      onChange={(e) => setSettings({ ...settings, chart_height_offset_fullscreen: parseInt(e.target.value) })}
                      className="flex-1"
                    />
                    <Input
                      type="number"
                      value={settings.chart_height_offset_fullscreen ?? 96}
                      onChange={(e) => setSettings({ ...settings, chart_height_offset_fullscreen: parseInt(e.target.value) || 96 })}
                      className="w-20"
                      min="50"
                      max="300"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Pixels subtraídos da altura do viewport em tela cheia.
                  </p>
                </div>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="chart_height_fullscreen">Altura do Gráfico (px)</Label>
                    <div className="flex items-center gap-4">
                      <input
                        id="chart_height_fullscreen"
                        type="range"
                        min="400"
                        max="1200"
                        step="10"
                        value={settings.chart_height_fullscreen || 800}
                        onChange={(e) => setSettings({ ...settings, chart_height_fullscreen: parseInt(e.target.value) })}
                        className="flex-1"
                      />
                      <Input
                        type="number"
                        value={settings.chart_height_fullscreen || 800}
                        onChange={(e) => setSettings({ ...settings, chart_height_fullscreen: parseInt(e.target.value) || 800 })}
                        className="w-20"
                        min="400"
                        max="1200"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="chart_width_percentage_fullscreen">Largura (%)</Label>
                    <div className="flex items-center gap-4">
                      <input
                        id="chart_width_percentage_fullscreen"
                        type="range"
                        min="50"
                        max="100"
                        value={settings.chart_width_percentage_fullscreen || 100}
                        onChange={(e) => setSettings({ ...settings, chart_width_percentage_fullscreen: parseInt(e.target.value) })}
                        className="flex-1"
                      />
                      <span className="text-sm font-mono w-12 text-center">{settings.chart_width_percentage_fullscreen || 100}%</span>
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="chart_aspect_ratio_fullscreen">Proporção</Label>
                  <select
                    id="chart_aspect_ratio_fullscreen"
                    value={settings.chart_aspect_ratio_fullscreen || '21:9'}
                    onChange={(e) => setSettings({ ...settings, chart_aspect_ratio_fullscreen: e.target.value })}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  >
                    <option value="auto">Automático (usa altura fixa)</option>
                    <option value="21:9">21:9 (Ultra-wide)</option>
                    <option value="16:9">16:9 (Widescreen)</option>
                    <option value="16:10">16:10</option>
                    <option value="4:3">4:3</option>
                    <option value="1:1">1:1 (Quadrado)</option>
                  </select>
                </div>
              </>
            )}
          </div>

          <p className="text-xs text-muted-foreground">
            💡 Dica: Ative o "Modo Responsivo" para que o gráfico se adapte automaticamente ao espaço disponível em cada dispositivo. Desative para usar valores fixos personalizados.
          </p>
        </CardContent>
      </Card>

      {/* Trade Entry Lines Configuration */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <CardTitle>Linhas de Entrada de Operações</CardTitle>
          </div>
          <CardDescription>
            Personalize a aparência das linhas que marcam o preço de entrada no gráfico
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="trade_line_call_color">Cor da Linha de COMPRA</Label>
            <div className="flex gap-2">
              <Input
                id="trade_line_call_color"
                type="color"
                value={settings.trade_line_call_color}
                onChange={(e) => setSettings({ ...settings, trade_line_call_color: e.target.value })}
                className="w-20 h-10"
              />
              <Input
                type="text"
                value={settings.trade_line_call_color}
                onChange={(e) => setSettings({ ...settings, trade_line_call_color: e.target.value })}
                className="flex-1"
                placeholder="#22c55e"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="trade_line_put_color">Cor da Linha de VENDA</Label>
            <div className="flex gap-2">
              <Input
                id="trade_line_put_color"
                type="color"
                value={settings.trade_line_put_color}
                onChange={(e) => setSettings({ ...settings, trade_line_put_color: e.target.value })}
                className="w-20 h-10"
              />
              <Input
                type="text"
                value={settings.trade_line_put_color}
                onChange={(e) => setSettings({ ...settings, trade_line_put_color: e.target.value })}
                className="flex-1"
                placeholder="#ef4444"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="trade_line_width">Espessura da Linha (1-20 pixels)</Label>
            <div className="flex items-center gap-4">
              <input
                id="trade_line_width"
                type="range"
                min="1"
                max="20"
                value={settings.trade_line_width}
                onChange={(e) => setSettings({ ...settings, trade_line_width: parseInt(e.target.value) })}
                className="flex-1"
              />
              <span className="text-sm font-mono w-12 text-center">{settings.trade_line_width}px</span>
            </div>
            <p className="text-xs text-muted-foreground">
              Ajuste a espessura da linha de entrada do trade no gráfico. Valores maiores tornam a linha mais visível.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="trade_line_style">Estilo da Linha</Label>
            <select
              id="trade_line_style"
              value={settings.trade_line_style}
              onChange={(e) => setSettings({ ...settings, trade_line_style: parseInt(e.target.value) })}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              <option value="0">Sólida</option>
              <option value="1">Pontilhada</option>
              <option value="2">Tracejada</option>
              <option value="3">Traço Grande</option>
            </select>
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="trade_line_show_label">Mostrar Label (COMPRA/VENDA)</Label>
              <p className="text-sm text-muted-foreground">
                Exibe o texto do tipo de operação na linha
              </p>
            </div>
            <Switch
              id="trade_line_show_label"
              checked={settings.trade_line_show_label}
              onCheckedChange={(checked) => setSettings({ ...settings, trade_line_show_label: checked })}
            />
          </div>
        </CardContent>
      </Card>

      {/* Save Button (sticky footer) */}
      <div className="fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur-sm border-t border-border p-4 md:pl-72 z-40">
        <div className="max-w-7xl mx-auto flex justify-end gap-2">
          <Button variant="outline" onClick={handleReset} disabled={saving}>
            <RotateCcw className="h-4 w-4 mr-2" />
            Restaurar Padrão
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            <Save className="h-4 w-4 mr-2" />
            {saving ? 'Salvando...' : 'Salvar Alterações'}
          </Button>
        </div>
      </div>
    </div>
  );
}
