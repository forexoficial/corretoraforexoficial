import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Slider } from "@/components/ui/slider";
import { Palette } from "lucide-react";
import { cn } from "@/lib/utils";

export interface DrawingStyle {
  color: string;
  lineWidth: number;
  lineStyle: "solid" | "dashed" | "dotted";
}

interface DrawingCustomizerProps {
  style: DrawingStyle;
  onChange: (style: DrawingStyle) => void;
}

const PRESET_COLORS = [
  { name: "Verde", value: "#22c55e" },
  { name: "Vermelho", value: "#ef4444" },
  { name: "Azul", value: "#3b82f6" },
  { name: "Amarelo", value: "#fbbf24" },
  { name: "Roxo", value: "#8b5cf6" },
  { name: "Branco", value: "#ffffff" },
  { name: "Cinza", value: "#6b7280" },
  { name: "Laranja", value: "#f97316" },
];

const LINE_STYLES = [
  { name: "Sólido", value: "solid" as const },
  { name: "Tracejado", value: "dashed" as const },
  { name: "Pontilhado", value: "dotted" as const },
];

export function DrawingCustomizer({ style, onChange }: DrawingCustomizerProps) {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          className="h-10 w-10 rounded-lg bg-card border border-border hover:bg-accent transition-colors"
          title="Personalizar Desenhos"
        >
          <Palette className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="start">
        <div className="p-4 border-b">
          <h4 className="font-semibold">Personalizar Desenho</h4>
          <p className="text-xs text-muted-foreground mt-1">
            Configure cor, espessura e estilo das linhas
          </p>
        </div>

        <div className="p-4 space-y-6">
          {/* Color Selection */}
          <div className="space-y-3">
            <label className="text-sm font-medium">Cor</label>
            <div className="grid grid-cols-4 gap-2">
              {PRESET_COLORS.map((color) => (
                <button
                  key={color.value}
                  onClick={() => onChange({ ...style, color: color.value })}
                  className={cn(
                    "h-10 rounded-lg border-2 transition-all hover:scale-105",
                    style.color === color.value
                      ? "border-primary ring-2 ring-primary/20"
                      : "border-border"
                  )}
                  style={{ backgroundColor: color.value }}
                  title={color.name}
                />
              ))}
            </div>
            
            {/* Custom Color Picker */}
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={style.color}
                onChange={(e) => onChange({ ...style, color: e.target.value })}
                className="h-10 w-full rounded-lg border-2 border-border cursor-pointer"
              />
              <span className="text-xs text-muted-foreground font-mono">
                {style.color}
              </span>
            </div>
          </div>

          {/* Line Width */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">Espessura</label>
              <span className="text-sm text-muted-foreground">{style.lineWidth}px</span>
            </div>
            <Slider
              value={[style.lineWidth]}
              onValueChange={([value]) => onChange({ ...style, lineWidth: value })}
              min={1}
              max={10}
              step={1}
              className="w-full"
            />
            {/* Visual preview of line width */}
            <div className="h-6 flex items-center">
              <div
                style={{
                  height: `${style.lineWidth}px`,
                  backgroundColor: style.color,
                }}
                className="w-full rounded-full"
              />
            </div>
          </div>

          {/* Line Style */}
          <div className="space-y-3">
            <label className="text-sm font-medium">Estilo da Linha</label>
            <div className="grid grid-cols-3 gap-2">
              {LINE_STYLES.map((lineStyle) => (
                <button
                  key={lineStyle.value}
                  onClick={() => onChange({ ...style, lineStyle: lineStyle.value })}
                  className={cn(
                    "px-3 py-2 rounded-lg border-2 text-xs font-medium transition-all bg-card",
                    style.lineStyle === lineStyle.value
                      ? "border-primary bg-primary/10 dark:bg-primary/20 text-primary"
                      : "border-border hover:border-primary/50 hover:bg-accent"
                  )}
                >
                  <div className="space-y-1">
                    <div className="text-center mb-1">{lineStyle.name}</div>
                    <div
                      className="h-0.5 mx-auto"
                      style={{
                        width: "100%",
                        backgroundColor: style.color,
                        borderTop:
                          lineStyle.value === "solid"
                            ? `2px solid ${style.color}`
                            : lineStyle.value === "dashed"
                            ? `2px dashed ${style.color}`
                            : `2px dotted ${style.color}`,
                      }}
                    />
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="p-3 bg-accent/50 border-t">
          <p className="text-xs text-muted-foreground">
            💡 As configurações serão aplicadas aos novos desenhos
          </p>
        </div>
      </PopoverContent>
    </Popover>
  );
}
