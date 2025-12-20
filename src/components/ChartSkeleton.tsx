import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

interface ChartSkeletonProps {
  className?: string;
}

export function ChartSkeleton({ className }: ChartSkeletonProps) {
  return (
    <div className={cn("absolute inset-0 z-10 bg-background/80 backdrop-blur-sm", className)}>
      <div className="w-full h-full flex flex-col p-4">
        {/* Price scale skeleton on right */}
        <div className="flex flex-1 gap-2">
          {/* Chart area */}
          <div className="flex-1 relative">
            {/* Fake candles skeleton */}
            <div className="absolute inset-0 flex items-end justify-around px-2 pb-8">
              {Array.from({ length: 40 }).map((_, i) => {
                const height = 20 + Math.random() * 60;
                const isUp = Math.random() > 0.5;
                return (
                  <div
                    key={i}
                    className="flex flex-col items-center gap-0.5"
                    style={{ 
                      opacity: 0.3 + (i / 40) * 0.4,
                      animationDelay: `${i * 25}ms`
                    }}
                  >
                    {/* Wick */}
                    <Skeleton 
                      className={cn(
                        "w-[1px] animate-pulse",
                        isUp ? "bg-chart-up/30" : "bg-chart-down/30"
                      )}
                      style={{ height: `${height * 0.3}px` }}
                    />
                    {/* Body */}
                    <Skeleton 
                      className={cn(
                        "w-[6px] md:w-[8px] rounded-sm animate-pulse",
                        isUp ? "bg-chart-up/40" : "bg-chart-down/40"
                      )}
                      style={{ height: `${height}%` }}
                    />
                    {/* Wick */}
                    <Skeleton 
                      className={cn(
                        "w-[1px] animate-pulse",
                        isUp ? "bg-chart-up/30" : "bg-chart-down/30"
                      )}
                      style={{ height: `${height * 0.2}px` }}
                    />
                  </div>
                );
              })}
            </div>
            
            {/* Grid lines */}
            <div className="absolute inset-0 flex flex-col justify-between py-4 pointer-events-none">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton 
                  key={i} 
                  className="w-full h-[1px] bg-muted/20" 
                />
              ))}
            </div>
          </div>
          
          {/* Price scale */}
          <div className="w-12 md:w-16 flex flex-col justify-between py-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton 
                key={i} 
                className="w-full h-3 bg-muted/30" 
              />
            ))}
          </div>
        </div>
        
        {/* Time scale skeleton at bottom */}
        <div className="h-6 mt-2 flex justify-around items-center">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton 
              key={i} 
              className="w-10 md:w-12 h-3 bg-muted/30" 
            />
          ))}
        </div>
        
        {/* Loading text */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <div className="flex gap-1">
              {Array.from({ length: 3 }).map((_, i) => (
                <div
                  key={i}
                  className="w-2 h-2 rounded-full bg-primary animate-bounce"
                  style={{ animationDelay: `${i * 150}ms` }}
                />
              ))}
            </div>
            <span className="text-sm text-muted-foreground animate-pulse">
              Carregando gráfico...
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
