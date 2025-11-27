import { useState } from "react";
import { Minus, TrendingUp, Square, Ruler, MousePointer, Trash2, Percent } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { DrawingCustomizer, DrawingStyle } from "./DrawingCustomizer";

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

  const tools = [
    { 
      id: "select" as DrawingTool, 
      icon: MousePointer, 
      label: "Selecionar",
      description: "Mover e editar desenhos"
    },
    { 
      id: "trendline" as DrawingTool, 
      icon: TrendingUp, 
      label: "Linha de Tendência",
      description: "Desenhar linha entre dois pontos"
    },
    { 
      id: "horizontal" as DrawingTool, 
      icon: Minus, 
      label: "Linha Horizontal",
      description: "Suporte e Resistência"
    },
    { 
      id: "vertical" as DrawingTool, 
      icon: Ruler, 
      label: "Linha Vertical",
      description: "Marcar eventos temporais"
    },
    { 
      id: "rectangle" as DrawingTool, 
      icon: Square, 
      label: "Retângulo",
      description: "Destacar áreas do gráfico"
    },
    { 
      id: "fibonacci" as DrawingTool, 
      icon: Percent, 
      label: "Fibonacci Retracement",
      description: "Níveis de retração"
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
            "h-10 w-10 rounded-lg bg-muted/60 hover:bg-muted transition-colors",
            selectedTool !== "select" && "bg-primary/20 hover:bg-primary/30"
          )}
          title="Ferramentas de Desenho"
        >
          {currentTool && <currentTool.icon className="h-4 w-4" />}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="start">
        <div className="p-4 border-b">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold">Ferramentas de Desenho</h4>
            {hasDrawings && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  onClearAll();
                  setOpen(false);
                }}
                className="h-8 text-destructive hover:text-destructive hover:bg-destructive/10"
              >
                <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                Limpar Tudo
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
                  ? "bg-primary/10 text-primary"
                  : "hover:bg-muted"
              )}
            >
              <div className={cn(
                "mt-0.5 p-2 rounded-md",
                selectedTool === tool.id ? "bg-primary/20" : "bg-muted"
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

        <div className="p-3 bg-muted/50">
          <p className="text-xs text-muted-foreground">
            💡 <strong>Dica:</strong> Clique duas vezes para começar a desenhar. 
            Use ESC para cancelar ou voltar ao modo de seleção.
          </p>
        </div>
      </PopoverContent>
    </Popover>
    </>
  );
}
