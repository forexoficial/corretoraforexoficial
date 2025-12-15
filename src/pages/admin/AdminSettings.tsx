import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Loader2, Upload, Palette, Sun, Moon } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useTranslation } from "@/hooks/useTranslation";

interface Settings {
  [key: string]: string;
}

export default function AdminSettings() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [settings, setSettings] = useState<Settings>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Logo states
  const [uploadingLogoLight, setUploadingLogoLight] = useState(false);
  const [uploadingLogoDark, setUploadingLogoDark] = useState(false);
  const [uploadingSignupBanner, setUploadingSignupBanner] = useState(false);
  const [logoLightFile, setLogoLightFile] = useState<File | null>(null);
  const [logoDarkFile, setLogoDarkFile] = useState<File | null>(null);
  const [signupBannerFile, setSignupBannerFile] = useState<File | null>(null);
  const [logoLightPreview, setLogoLightPreview] = useState<string | null>(null);
  const [logoDarkPreview, setLogoDarkPreview] = useState<string | null>(null);
  const [signupBannerPreview, setSignupBannerPreview] = useState<string | null>(null);

  useEffect(() => {
    fetchSettings();
    initializeDefaultSettings();
  }, []);

  const initializeDefaultSettings = async () => {
    const defaultSettings = [
      { key: 'allow_registration', value: 'true', description: 'Permitir novos cadastros' },
      { key: 'require_verification', value: 'true', description: 'Exigir verificação de identidade' },
      { key: 'maintenance_mode', value: 'false', description: 'Modo de manutenção' },
      { key: 'usdt_enabled', value: 'false', description: 'Habilitar USDT' },
      { key: 'logo_height', value: '48', description: 'Altura da logo em pixels' },
      // Light theme defaults
      { key: 'light_background', value: '0 0% 100%', description: 'Cor de fundo tema claro' },
      { key: 'light_foreground', value: '240 10% 3.9%', description: 'Cor de texto tema claro' },
      { key: 'light_card', value: '0 0% 100%', description: 'Cor de card tema claro' },
      { key: 'light_primary', value: '142.1 76.2% 36.3%', description: 'Cor primária tema claro' },
      { key: 'light_secondary', value: '240 4.8% 95.9%', description: 'Cor secundária tema claro' },
      { key: 'light_accent', value: '240 4.8% 95.9%', description: 'Cor de destaque tema claro' },
      { key: 'light_muted', value: '240 4.8% 95.9%', description: 'Cor muted tema claro' },
      { key: 'light_border', value: '240 5.9% 90%', description: 'Cor de borda tema claro' },
      // Dark theme defaults
      { key: 'dark_background', value: '240 10% 3.9%', description: 'Cor de fundo tema escuro' },
      { key: 'dark_foreground', value: '0 0% 98%', description: 'Cor de texto tema escuro' },
      { key: 'dark_card', value: '240 10% 3.9%', description: 'Cor de card tema escuro' },
      { key: 'dark_primary', value: '142.1 70.6% 45.3%', description: 'Cor primária tema escuro' },
      { key: 'dark_secondary', value: '240 3.7% 15.9%', description: 'Cor secundária tema escuro' },
      { key: 'dark_accent', value: '240 3.7% 15.9%', description: 'Cor de destaque tema escuro' },
      { key: 'dark_muted', value: '240 3.7% 15.9%', description: 'Cor muted tema escuro' },
      { key: 'dark_border', value: '220 13% 23%', description: 'Cor de borda tema escuro' },
    ];

    for (const setting of defaultSettings) {
      const { data } = await supabase
        .from('platform_settings')
        .select('key')
        .eq('key', setting.key)
        .single();

      if (!data) {
        await supabase
          .from('platform_settings')
          .insert(setting);
      }
    }
  };

  const fetchSettings = async () => {
    const { data, error } = await supabase
      .from("platform_settings")
      .select("key, value");

    if (error) {
      toast.error(t("admin_error_load_settings"));
      return;
    }

    const settingsObj = (data || []).reduce((acc, { key, value }) => {
      acc[key] = value;
      return acc;
    }, {} as Settings);

    setSettings(settingsObj);
    if (settingsObj.logo_light) {
      setLogoLightPreview(settingsObj.logo_light);
    }
    if (settingsObj.logo_dark) {
      setLogoDarkPreview(settingsObj.logo_dark);
    }
    if (settingsObj.signup_banner_url) {
      setSignupBannerPreview(settingsObj.signup_banner_url);
    }
    setLoading(false);
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>, type: 'light' | 'dark' | 'signup_banner') => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error(t("admin_select_image"));
      return;
    }

    const maxSize = type === 'signup_banner' ? 5 * 1024 * 1024 : 2 * 1024 * 1024;
    if (file.size > maxSize) {
      toast.error(t("admin_image_max_size"));
      return;
    }

    if (type === 'light') {
      setLogoLightFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoLightPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    } else if (type === 'dark') {
      setLogoDarkFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoDarkPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    } else if (type === 'signup_banner') {
      setSignupBannerFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setSignupBannerPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveLogo = async (type: 'light' | 'dark') => {
    const file = type === 'light' ? logoLightFile : logoDarkFile;
    if (!file) {
      toast.error(t("admin_select_logo_first"));
      return;
    }

    const setUploading = type === 'light' ? setUploadingLogoLight : setUploadingLogoDark;
    setUploading(true);

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `platform-logos/logo-${type}-${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("avatars")
        .getPublicUrl(fileName);

      const { error: upsertError } = await supabase
        .from("platform_settings")
        .upsert({
          key: `logo_${type}`,
          value: publicUrl,
          description: `Logo para tema ${type === 'light' ? 'claro' : 'escuro'}`
        }, { onConflict: "key" });

      if (upsertError) throw upsertError;

      setSettings(prev => ({ ...prev, [`logo_${type}`]: publicUrl }));
      if (type === 'light') {
        setLogoLightFile(null);
      } else {
        setLogoDarkFile(null);
      }
      toast.success(`${t("admin_logo_updated")} (${type === 'light' ? t("admin_light_theme") : t("admin_dark_theme")})`);
    } catch (error: any) {
      console.error("Upload error:", error);
      toast.error(t("admin_error_upload_logo"));
    } finally {
      setUploading(false);
    }
  };

  const handleSaveSignupBanner = async () => {
    if (!signupBannerFile) {
      toast.error("Selecione uma imagem primeiro");
      return;
    }

    setUploadingSignupBanner(true);

    try {
      const fileExt = signupBannerFile.name.split('.').pop();
      const fileName = `signup-banners/banner-${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("popup-images")
        .upload(fileName, signupBannerFile, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("popup-images")
        .getPublicUrl(fileName);

      const { error: upsertError } = await supabase
        .from("platform_settings")
        .upsert({
          key: 'signup_banner_url',
          value: publicUrl,
          description: 'URL da imagem do banner de cadastro'
        }, { onConflict: "key" });

      if (upsertError) throw upsertError;

      setSettings(prev => ({ ...prev, signup_banner_url: publicUrl }));
      setSignupBannerFile(null);
      toast.success("Banner de cadastro atualizado com sucesso!");
    } catch (error: any) {
      console.error("Upload error:", error);
      toast.error("Erro ao fazer upload do banner");
    } finally {
      setUploadingSignupBanner(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);

    try {
      const updates = Object.entries(settings)
        .filter(([key]) => key !== 'logo_light' && key !== 'logo_dark') // Logo URLs handled separately, but allow logo_height
        .map(([key, value]) =>
          supabase
            .from("platform_settings")
            .upsert({ key, value, description: `Setting for ${key}` }, { onConflict: "key" })
        );

      const results = await Promise.all(updates);
      const hasError = results.some((result) => result.error);

      if (hasError) {
        toast.error(t("admin_error_save_settings"));
      } else {
        toast.success(t("admin_settings_saved"));
        await fetchSettings();
      }
    } catch (error) {
      console.error("Save error:", error);
      toast.error(t("admin_error_save_settings"));
    } finally {
      setSaving(false);
    }
  };

  const updateSetting = (key: string, value: string) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  const hslToHex = (hsl: string): string => {
    const parts = hsl.split(' ');
    if (parts.length !== 3) return '#000000';
    
    const h = parseFloat(parts[0]);
    const s = parseFloat(parts[1]) / 100;
    const l = parseFloat(parts[2]) / 100;

    const c = (1 - Math.abs(2 * l - 1)) * s;
    const x = c * (1 - Math.abs((h / 60) % 2 - 1));
    const m = l - c / 2;

    let r = 0, g = 0, b = 0;
    if (h >= 0 && h < 60) { r = c; g = x; b = 0; }
    else if (h >= 60 && h < 120) { r = x; g = c; b = 0; }
    else if (h >= 120 && h < 180) { r = 0; g = c; b = x; }
    else if (h >= 180 && h < 240) { r = 0; g = x; b = c; }
    else if (h >= 240 && h < 300) { r = x; g = 0; b = c; }
    else if (h >= 300 && h < 360) { r = c; g = 0; b = x; }

    const toHex = (n: number) => {
      const hex = Math.round((n + m) * 255).toString(16);
      return hex.length === 1 ? '0' + hex : hex;
    };

    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
  };

  const hexToHsl = (hex: string): string => {
    hex = hex.replace(/^#/, '');
    const r = parseInt(hex.slice(0, 2), 16) / 255;
    const g = parseInt(hex.slice(2, 4), 16) / 255;
    const b = parseInt(hex.slice(4, 6), 16) / 255;

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h = 0, s = 0, l = (max + min) / 2;

    if (max !== min) {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      
      switch (max) {
        case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
        case g: h = ((b - r) / d + 2) / 6; break;
        case b: h = ((r - g) / d + 4) / 6; break;
      }
    }

    return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
  };

  const ColorInput = ({ label, settingKey }: { label: string, settingKey: string }) => {
    const hslValue = settings[settingKey] || '0 0% 0%';
    const hexValue = hslToHex(hslValue);

    return (
      <div className="space-y-2">
        <Label>{label}</Label>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Input
              type="color"
              value={hexValue}
              onChange={(e) => updateSetting(settingKey, hexToHsl(e.target.value))}
              className="w-16 h-16 cursor-pointer border-2 rounded-lg p-1"
              style={{ colorScheme: 'light' }}
            />
          </div>
          <div className="flex-1">
            <Input
              type="text"
              value={hexValue.toUpperCase()}
              onChange={(e) => {
                const hex = e.target.value;
                if (/^#[0-9A-Fa-f]{0,6}$/.test(hex)) {
                  if (hex.length === 7) {
                    updateSetting(settingKey, hexToHsl(hex));
                  }
                }
              }}
              placeholder="#000000"
              className="font-mono text-sm uppercase"
              maxLength={7}
            />
            <p className="text-xs text-muted-foreground mt-1">
              Formato HEX (ex: #FF5733)
            </p>
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4 md:space-y-6">
      <div>
        <h1 className="text-xl md:text-4xl font-bold mb-1 md:mb-2">{t("admin_settings_title")}</h1>
        <p className="text-xs md:text-base text-muted-foreground">{t("admin_settings_desc")}</p>
      </div>

      <div className="grid gap-4 md:gap-6">
        <Card>
          <CardHeader className="p-3 md:p-6">
            <CardTitle className="flex items-center gap-2 text-base md:text-lg">
              <Palette className="h-4 w-4 md:h-5 md:w-5" />
              {t("admin_platform_customization")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 md:space-y-6 p-3 pt-0 md:p-6 md:pt-0">
            <Tabs defaultValue="logos" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="logos">{t("admin_logos_tab")}</TabsTrigger>
                <TabsTrigger value="light">
                  <Sun className="h-4 w-4 mr-2" />
                  {t("admin_light_theme")}
                </TabsTrigger>
                <TabsTrigger value="dark">
                  <Moon className="h-4 w-4 mr-2" />
                  {t("admin_dark_theme")}
                </TabsTrigger>
              </TabsList>

              <TabsContent value="logos" className="space-y-6 mt-6">
                <div className="space-y-6">
                  {/* Logo Size Control */}
                  <div className="p-4 border rounded-lg bg-muted/20">
                    <Label className="text-base font-semibold">{t("admin_logo_size")}</Label>
                    <p className="text-xs text-muted-foreground mb-4">
                      {t("admin_logo_size_desc")}
                    </p>
                    <div className="space-y-4">
                      <div className="flex items-center gap-4">
                        <Input
                          type="range"
                          min="16"
                          max="128"
                          step="2"
                          value={settings.logo_height || "48"}
                          onChange={(e) => updateSetting('logo_height', e.target.value)}
                          className="flex-1 cursor-pointer"
                        />
                        <div className="flex items-center gap-2 min-w-[80px]">
                          <Input
                            type="number"
                            min="16"
                            max="128"
                            value={settings.logo_height || "48"}
                            onChange={(e) => {
                              const val = Math.max(16, Math.min(128, parseInt(e.target.value) || 48));
                              updateSetting('logo_height', val.toString());
                            }}
                            className="w-20 text-center"
                          />
                          <span className="text-sm text-muted-foreground">px</span>
                        </div>
                      </div>
                      {logoLightPreview && (
                        <div className="p-4 border rounded-lg bg-background flex items-center justify-center">
                          <img
                            src={logoLightPreview || logoDarkPreview || ""} 
                            alt="Preview do tamanho" 
                            style={{ height: `${settings.logo_height || 48}px` }}
                            className="object-contain"
                          />
                        </div>
                      )}
                    </div>
                  </div>

                  <Separator />

                  <div>
                    <Label>{t("admin_logo_light")}</Label>
                    <p className="text-xs text-muted-foreground mb-3">
                      {t("admin_logo_light_desc")}
                    </p>
                    <div className="flex items-center gap-4">
                      {logoLightPreview && (
                        <div className="flex items-center gap-3 p-3 border rounded-lg bg-card">
                          <img
                            src={logoLightPreview} 
                            alt="Logo preview" 
                            className="h-12 object-contain"
                          />
                        </div>
                      )}
                      <div className="flex-1">
                        <Input
                          type="file"
                          accept="image/*"
                          onChange={(e) => handleLogoUpload(e, 'light')}
                          className="cursor-pointer"
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                          {t("admin_file_format")}
                        </p>
                      </div>
                    </div>
                    {logoLightFile && (
                      <Button 
                        onClick={() => handleSaveLogo('light')} 
                        disabled={uploadingLogoLight}
                        className="w-full mt-3"
                      >
                        {uploadingLogoLight ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            {t("admin_uploading")}
                          </>
                        ) : (
                          <>
                            <Upload className="h-4 w-4 mr-2" />
                            {t("admin_save_logo_light")}
                          </>
                        )}
                      </Button>
                    )}
                  </div>

                  <Separator />

                  <div>
                    <Label>{t("admin_logo_dark")}</Label>
                    <p className="text-xs text-muted-foreground mb-3">
                      {t("admin_logo_dark_desc")}
                    </p>
                    <div className="flex items-center gap-4">
                      {logoDarkPreview && (
                        <div className="flex items-center gap-3 p-3 border rounded-lg bg-background">
                          <img 
                            src={logoDarkPreview}
                            alt="Logo preview" 
                            className="h-12 object-contain"
                          />
                        </div>
                      )}
                      <div className="flex-1">
                        <Input
                          type="file"
                          accept="image/*"
                          onChange={(e) => handleLogoUpload(e, 'dark')}
                          className="cursor-pointer"
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                          {t("admin_file_format")}
                        </p>
                      </div>
                    </div>
                    {logoDarkFile && (
                      <Button 
                        onClick={() => handleSaveLogo('dark')} 
                        disabled={uploadingLogoDark}
                        className="w-full mt-3"
                      >
                        {uploadingLogoDark ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            {t("admin_uploading")}
                          </>
                        ) : (
                          <>
                            <Upload className="h-4 w-4 mr-2" />
                            {t("admin_save_logo_dark")}
                          </>
                        )}
                      </Button>
                    )}
                  </div>

                  <Separator />

                  {/* Signup Banner */}
                  <div>
                    <Label>Banner de Cadastro</Label>
                    <p className="text-xs text-muted-foreground mb-3">
                      Imagem exibida na página de cadastro (/signup). Recomendado: 1920x1080px
                    </p>
                    <div className="flex flex-col gap-4">
                      {signupBannerPreview && (
                        <div className="flex items-center justify-center p-3 border rounded-lg bg-card">
                          <img
                            src={signupBannerPreview} 
                            alt="Banner preview" 
                            className="max-h-48 object-contain rounded"
                          />
                        </div>
                      )}
                      <div className="flex-1">
                        <Input
                          type="file"
                          accept="image/*"
                          onChange={(e) => handleLogoUpload(e, 'signup_banner')}
                          className="cursor-pointer"
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                          PNG, JPG ou WebP. Máximo 5MB.
                        </p>
                      </div>
                    </div>
                    {signupBannerFile && (
                      <Button 
                        onClick={handleSaveSignupBanner} 
                        disabled={uploadingSignupBanner}
                        className="w-full mt-3"
                      >
                        {uploadingSignupBanner ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Enviando...
                          </>
                        ) : (
                          <>
                            <Upload className="h-4 w-4 mr-2" />
                            Salvar Banner de Cadastro
                          </>
                        )}
                      </Button>
                    )}
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="light" className="space-y-4 mt-6">
                <p className="text-sm text-muted-foreground mb-4">
                  {t("admin_light_theme_desc")}
                </p>
                <ColorInput label={t("admin_background")} settingKey="light_background" />
                <ColorInput label={t("admin_text")} settingKey="light_foreground" />
                <ColorInput label={t("admin_card")} settingKey="light_card" />
                <ColorInput label={t("admin_primary")} settingKey="light_primary" />
                <ColorInput label={t("admin_secondary")} settingKey="light_secondary" />
                <ColorInput label={t("admin_accent")} settingKey="light_accent" />
                <ColorInput label={t("admin_muted")} settingKey="light_muted" />
                <ColorInput label={t("admin_border")} settingKey="light_border" />
              </TabsContent>

              <TabsContent value="dark" className="space-y-4 mt-6">
                <p className="text-sm text-muted-foreground mb-4">
                  {t("admin_dark_theme_desc")}
                </p>
                <ColorInput label={t("admin_background")} settingKey="dark_background" />
                <ColorInput label={t("admin_text")} settingKey="dark_foreground" />
                <ColorInput label={t("admin_card")} settingKey="dark_card" />
                <ColorInput label={t("admin_primary")} settingKey="dark_primary" />
                <ColorInput label={t("admin_secondary")} settingKey="dark_secondary" />
                <ColorInput label={t("admin_accent")} settingKey="dark_accent" />
                <ColorInput label={t("admin_muted")} settingKey="dark_muted" />
                <ColorInput label={t("admin_border")} settingKey="dark_border" />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        
        <Card>
          <CardHeader>
            <CardTitle>{t("admin_platform_settings")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>{t("admin_allow_registration")}</Label>
                <p className="text-sm text-muted-foreground">
                  {t("admin_allow_registration_desc")}
                </p>
              </div>
              <Switch
                checked={settings.allow_registration === "true"}
                onCheckedChange={(checked) =>
                  updateSetting("allow_registration", checked.toString())
                }
              />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>{t("admin_require_verification")}</Label>
                <p className="text-sm text-muted-foreground">
                  {t("admin_require_verification_desc")}
                </p>
              </div>
              <Switch
                checked={settings.require_verification === "true"}
                onCheckedChange={(checked) =>
                  updateSetting("require_verification", checked.toString())
                }
              />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>{t("admin_maintenance_mode")}</Label>
                <p className="text-sm text-muted-foreground">
                  {t("admin_maintenance_mode_desc")}
                </p>
              </div>
              <Switch
                checked={settings.maintenance_mode === "true"}
                onCheckedChange={(checked) =>
                  updateSetting("maintenance_mode", checked.toString())
                }
              />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>{t("admin_usdt_enabled")}</Label>
                <p className="text-sm text-muted-foreground">
                  {t("admin_usdt_enabled_desc")}
                </p>
              </div>
              <Switch
                checked={settings.usdt_enabled === "true"}
                onCheckedChange={(checked) =>
                  updateSetting("usdt_enabled", checked.toString())
                }
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("admin_financial_limits")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4">
              <div>
                <Label htmlFor="min_deposit">{t("admin_min_deposit")}</Label>
                <Input
                  id="min_deposit"
                  type="number"
                  value={settings.min_deposit || "50"}
                  onChange={(e) => updateSetting("min_deposit", e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="min_withdrawal">{t("admin_min_withdrawal")}</Label>
                <Input
                  id="min_withdrawal"
                  type="number"
                  value={settings.min_withdrawal || "100"}
                  onChange={(e) => updateSetting("min_withdrawal", e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="withdrawal_fee">{t("admin_withdrawal_fee")}</Label>
                <Input
                  id="withdrawal_fee"
                  type="number"
                  step="0.1"
                  value={settings.withdrawal_fee || "0"}
                  onChange={(e) => updateSetting("withdrawal_fee", e.target.value)}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("admin_contact_support")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="support_email">{t("admin_support_email")}</Label>
              <Input
                id="support_email"
                type="email"
                value={settings.support_email || ""}
                onChange={(e) => updateSetting("support_email", e.target.value)}
                placeholder="suporte@plataforma.com"
              />
            </div>
            <div>
              <Label htmlFor="support_whatsapp">{t("admin_support_whatsapp")}</Label>
              <Input
                id="support_whatsapp"
                type="tel"
                value={settings.support_whatsapp || ""}
                onChange={(e) => updateSetting("support_whatsapp", e.target.value)}
                placeholder="+55 11 99999-9999"
              />
            </div>

            <Separator />

            <div className="space-y-4">
              <Label className="text-base font-semibold">{t("admin_contact_visibility")}</Label>
              <p className="text-sm text-muted-foreground mb-2">
                {t("admin_contact_visibility_desc")}
              </p>
              
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>WhatsApp</Label>
                  <p className="text-sm text-muted-foreground">
                    {t("admin_whatsapp_visible_desc")}
                  </p>
                </div>
                <Switch
                  checked={settings.support_whatsapp_enabled !== "false"}
                  onCheckedChange={(checked) =>
                    updateSetting("support_whatsapp_enabled", checked.toString())
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>{t("phone")}</Label>
                  <p className="text-sm text-muted-foreground">
                    {t("admin_phone_visible_desc")}
                  </p>
                </div>
                <Switch
                  checked={settings.support_phone_enabled !== "false"}
                  onCheckedChange={(checked) =>
                    updateSetting("support_phone_enabled", checked.toString())
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>{t("email")}</Label>
                  <p className="text-sm text-muted-foreground">
                    {t("admin_email_visible_desc")}
                  </p>
                </div>
                <Switch
                  checked={settings.support_email_enabled !== "false"}
                  onCheckedChange={(checked) =>
                    updateSetting("support_email_enabled", checked.toString())
                  }
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Button onClick={handleSave} disabled={saving} className="w-full" size="lg">
          {saving ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              {t("admin_saving")}
            </>
          ) : (
            t("admin_save_settings")
          )}
        </Button>
      </div>
    </div>
  );
}
