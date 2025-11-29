import { useState, useEffect } from "react";
import { TrendingUp } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useTranslation } from "@/hooks/useTranslation";

export interface PriceLineConfig {
  visible: boolean;
  color: string;
  width: number;
  style: number; // 0=solid, 1=dotted, 2=dashed, 3=large dashed, 4=sparse dotted
}

interface PriceLineSettingsProps {
  config: PriceLineConfig;
  onChange: (config: PriceLineConfig) => void;
}

export function PriceLineSettings({ config, onChange }: PriceLineSettingsProps) {
  const [open, setOpen] = useState(false);
  const [localConfig, setLocalConfig] = useState<PriceLineConfig>(config);
  const { t } = useTranslation();

  const lineStyles = [
    { value: 0, label: t("solid") },
    { value: 1, label: t("dotted") },
    { value: 2, label: t("dashed") },
    { value: 3, label: `${t("dashed")} ${t("thickness")}` },
    { value: 4, label: `${t("dotted")} Sparse` },
  ];

  const presetColors = [
    { value: "#ffffff", label: "Branco" },
    { value: "#22c55e", label: "Verde" },
    { value: "#ef4444", label: "Vermelho" },
    { value: "#3b82f6", label: "Azul" },
    { value: "#eab308", label: "Amarelo" },
    { value: "#a855f7", label: "Roxo" },
    { value: "#ec4899", label: "Rosa" },
    { value: "#14b8a6", label: "Teal" },
  ];

  useEffect(() => {
    setLocalConfig(config);
  }, [config]);

  const handleSave = () => {
    onChange(localConfig);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button className="h-10 w-10 flex items-center justify-center rounded-lg bg-muted/60 hover:bg-muted transition-colors">
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
        </button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{t("price_line_settings")}</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6 py-4">
          {/* Visibilidade */}
          <div className="flex items-center justify-between">
            <Label htmlFor="visible" className="text-sm font-medium">
              {t("visible")}
            </Label>
            <Switch
              id="visible"
              checked={localConfig.visible}
              onCheckedChange={(checked) =>
                setLocalConfig({ ...localConfig, visible: checked })
              }
            />
          </div>

          {/* Cor */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">{t("color")}</Label>
            <div className="grid grid-cols-4 gap-2">
              {presetColors.map((preset) => (
                <button
                  key={preset.value}
                  className={`h-10 rounded-lg border-2 transition-all ${
                    localConfig.color === preset.value
                      ? 'border-primary scale-105'
                      : 'border-border hover:border-primary/50'
                  }`}
                  style={{ backgroundColor: preset.value }}
                  onClick={() => setLocalConfig({ ...localConfig, color: preset.value })}
                  title={preset.label}
                />
              ))}
            </div>
            <div className="flex items-center gap-2">
              <Label htmlFor="custom-color" className="text-xs text-muted-foreground">
                Personalizada:
              </Label>
              <input
                id="custom-color"
                type="color"
                value={localConfig.color}
                onChange={(e) =>
                  setLocalConfig({ ...localConfig, color: e.target.value })
                }
                className="h-8 w-16 rounded border border-border cursor-pointer"
              />
              <span className="text-xs text-muted-foreground font-mono">
                {localConfig.color}
              </span>
            </div>
          </div>

          {/* Espessura */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">{t("thickness")}</Label>
              <span className="text-sm text-muted-foreground">{localConfig.width}px</span>
            </div>
            <Slider
              value={[localConfig.width]}
              onValueChange={([value]) =>
                setLocalConfig({ ...localConfig, width: value })
              }
              min={1}
              max={5}
              step={1}
              className="w-full"
            />
          </div>

          {/* Estilo */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">{t("style")}</Label>
            <Select
              value={localConfig.style.toString()}
              onValueChange={(value) =>
                setLocalConfig({ ...localConfig, style: parseInt(value) })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {lineStyles.map((style) => (
                  <SelectItem key={style.value} value={style.value.toString()}>
                    {style.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Preview */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Visualização</Label>
            <div className="h-16 bg-muted/30 rounded-lg border border-border flex items-center justify-center p-4">
              {localConfig.visible ? (
                <div className="w-full flex items-center">
                  <div
                    className="flex-1 h-px"
                    style={{
                      backgroundColor: localConfig.color,
                      height: `${localConfig.width}px`,
                      borderStyle: [
                        'solid',
                        'dotted',
                        'dashed',
                        'dashed',
                        'dotted',
                      ][localConfig.style],
                    }}
                  />
                </div>
              ) : (
                <span className="text-sm text-muted-foreground">
                  Linha oculta
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSave}>
            Salvar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
