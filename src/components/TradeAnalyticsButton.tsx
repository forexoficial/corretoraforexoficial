import { useState } from "react";
import { BarChart3, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { TradeAnalyticsDashboard } from "./TradeAnalyticsDashboard";
import { History } from "lucide-react";

interface TradeAnalyticsButtonProps {
  userId: string | undefined;
  isDemoMode: boolean;
}

export function TradeAnalyticsButton({ userId, isDemoMode }: TradeAnalyticsButtonProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Floating Analytics Button */}
      <Button
        onClick={() => setOpen(true)}
        size="icon"
        className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-2xl z-[100] bg-gradient-to-br from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 transition-all hover:scale-110"
      >
        <BarChart3 className="h-6 w-6" />
      </Button>

      {/* Analytics Sheet */}
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="right" className="w-full sm:max-w-[500px] md:max-w-[600px] lg:max-w-[700px] xl:max-w-[800px] p-0 overflow-hidden">
          <div className="flex flex-col h-full">
            {/* Header */}
            <div className="flex items-center justify-between p-3 sm:p-4 md:p-6 border-b bg-gradient-to-r from-primary/5 to-primary/10">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="p-1.5 sm:p-2 bg-primary/10 rounded-lg sm:rounded-xl">
                  <BarChart3 className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                </div>
                <div>
                  <h2 className="text-base sm:text-lg font-bold">Analytics Dashboard</h2>
                  <p className="text-[10px] sm:text-xs text-muted-foreground hidden sm:block">
                    Monitore sua performance em tempo real
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setOpen(false)}
                className="h-7 w-7 sm:h-8 sm:w-8 hover:bg-destructive/10"
              >
                <X className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              </Button>
            </div>

            {/* Content */}
            <ScrollArea className="flex-1">
              <div className="p-3 sm:p-4 md:p-6">
                {open && <TradeAnalyticsDashboard userId={userId} isDemoMode={isDemoMode} />}
              </div>
            </ScrollArea>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}