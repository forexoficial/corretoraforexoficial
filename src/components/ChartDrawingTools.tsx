import { useState } from "react";
import { Minus, TrendingUp, Square, Ruler, MousePointer, Trash2, Percent } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { DrawingCustomizer, DrawingStyle } from "./DrawingCustomizer";
import { useTranslation } from "@/hooks/useTranslation";

export type DrawingTool = 
  | "select" 
  | "trendline" 
  | "horizontal" 
  | "vertical"
  | "rectangle" 
  | "fibonacci";

interface ChartDrawingToolsProps {
  selectedTool: DrawingTool;
  onToolChange: (tool: DrawingTool) => void;
  onClearAll: () => void;
  hasDrawings: boolean;
  drawingStyle: DrawingStyle;
  onStyleChange: (style: DrawingStyle) => void;
}

export function ChartDrawingTools({ 
  selectedTool, 
  onToolChange,
  onClearAll,
  hasDrawings,
  drawingStyle,
  onStyleChange
}: ChartDrawingToolsProps) {
  const [open, setOpen] = useState(false);
  const { t } = useTranslation();

  const tools = [
    { 
      id: "select" as DrawingTool, 
      icon: MousePointer, 
      label: t("select_tool"),
      description: t("move_edit")
    },
    { 
      id: "trendline" as DrawingTool, 
      icon: TrendingUp, 
      label: t("trendline"),
      description: t("draw_line_points")
    },
    { 
      id: "horizontal" as DrawingTool, 
      icon: Minus, 
      label: t("horizontal_line"),
      description: t("support_resistance")
    },
    { 
      id: "vertical" as DrawingTool, 
      icon: Ruler, 
      label: t("vertical_line"),
      description: t("mark_events")
    },
    { 
      id: "rectangle" as DrawingTool, 
      icon: Square, 
      label: t("rectangle"),
      description: t("highlight_areas")
    },
    { 
      id: "fibonacci" as DrawingTool, 
      icon: Percent, 
      label: t("fibonacci"),
      description: t("retracement_levels")
    },
  ];

  const currentTool = tools.find(t => t.id === selectedTool);

  return (
    <>
      <DrawingCustomizer style={drawingStyle} onChange={onStyleChange} />
      <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          className={cn(
            "h-10 w-10 rounded-lg bg-card border border-border hover:bg-accent transition-colors",
            selectedTool !== "select" && "bg-primary/10 dark:bg-primary/20 border-primary/50 hover:bg-primary/20 dark:hover:bg-primary/30 text-primary"
          )}
          title={t("drawing_tools")}
        >
          {currentTool && <currentTool.icon className="h-4 w-4" />}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0 bg-popover border-border" align="start">
        <div className="p-4 border-b">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold">{t("drawing_tools")}</h4>
            {hasDrawings && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  onClearAll();
                  setOpen(false);
                }}
                className="h-8 text-destructive hover:text-destructive hover:bg-destructive/20 dark:hover:bg-destructive/10 border border-transparent hover:border-destructive/20"
              >
                <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                {t("clear_all")}
              </Button>
            )}
          </div>
        </div>
        
        <div className="p-2 space-y-1">
          {tools.map((tool) => (
            <button
              key={tool.id}
              onClick={() => {
                onToolChange(tool.id);
                setOpen(false);
              }}
              className={cn(
                "w-full flex items-start gap-3 px-3 py-2.5 rounded-lg transition-colors text-left",
                selectedTool === tool.id
                  ? "bg-primary/10 dark:bg-primary/20 text-primary border border-primary/20"
                  : "hover:bg-accent border border-transparent"
              )}
            >
              <div className={cn(
                "mt-0.5 p-2 rounded-md",
                selectedTool === tool.id ? "bg-primary/20 dark:bg-primary/30" : "bg-accent"
              )}>
                <tool.icon className="h-4 w-4" />
              </div>
              <div className="flex-1">
                <div className="font-medium text-sm">{tool.label}</div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  {tool.description}
                </div>
              </div>
            </button>
          ))}
        </div>

        <Separator />

        <div className="p-3 bg-accent/50 border-t">
          <p className="text-xs text-muted-foreground">
            💡 <strong className="text-foreground">{t("tip")}:</strong> {t("drawing_tip")}
          </p>
        </div>
      </PopoverContent>
    </Popover>
    </>
  );
}
