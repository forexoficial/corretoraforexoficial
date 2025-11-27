import { ZoomIn, ZoomOut, Maximize2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface ChartZoomControlsProps {
  onZoomIn: () => void;
  onZoomOut: () => void;
  onResetZoom: () => void;
}

export function ChartZoomControls({ onZoomIn, onZoomOut, onResetZoom }: ChartZoomControlsProps) {
  return (
    <TooltipProvider>
      <div className="absolute bottom-4 right-4 z-10 flex flex-col gap-2">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="secondary"
              size="icon"
              className="h-10 w-10 rounded-full shadow-lg hover:scale-110 transition-transform"
              onClick={onZoomIn}
            >
              <ZoomIn className="h-5 w-5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="left">
            <p>Aumentar zoom</p>
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="secondary"
              size="icon"
              className="h-10 w-10 rounded-full shadow-lg hover:scale-110 transition-transform"
              onClick={onZoomOut}
            >
              <ZoomOut className="h-5 w-5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="left">
            <p>Diminuir zoom</p>
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="secondary"
              size="icon"
              className="h-10 w-10 rounded-full shadow-lg hover:scale-110 transition-transform"
              onClick={onResetZoom}
            >
              <Maximize2 className="h-5 w-5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="left">
            <p>Resetar visualização</p>
          </TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  );
}
