import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Gift, Calendar, Tag } from "lucide-react";

interface PromotionsMenuProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const PromotionsMenu = ({ open, onOpenChange }: PromotionsMenuProps) => {
  const [activeTab, setActiveTab] = useState("available");

  // Mock data - substituir por dados reais do banco futuramente
  const availablePromotions: any[] = [];
  const promotionHistory: any[] = [];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:w-[350px] p-0 bg-card">
        <SheetHeader className="border-b border-border p-4 pb-3">
          <SheetTitle className="text-base font-semibold">Promoções</SheetTitle>
        </SheetHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="w-full grid grid-cols-2 rounded-none border-b bg-transparent h-12">
            <TabsTrigger 
              value="available" 
              className="rounded-none data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:text-primary font-semibold uppercase text-xs"
            >
              Disponível
            </TabsTrigger>
            <TabsTrigger 
              value="history" 
              className="rounded-none data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:text-primary font-semibold uppercase text-xs"
            >
              Histórico
            </TabsTrigger>
          </TabsList>

          <TabsContent value="available" className="p-4 mt-0">
            {availablePromotions.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
                <Gift className="h-12 w-12 text-muted-foreground/50 mb-4" />
                <p className="text-sm text-muted-foreground">
                  Você não tem promoção<br />disponível por enquanto
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {availablePromotions.map((promo, index) => (
                  <div
                    key={index}
                    className="bg-background rounded-lg p-4 border border-border hover:border-primary transition-colors"
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <Tag className="h-5 w-5 text-primary" />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-semibold text-sm mb-1">{promo.title}</h4>
                        <p className="text-xs text-muted-foreground mb-2">{promo.description}</p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Calendar className="h-3 w-3" />
                          <span>Válido até {promo.expiresAt}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="history" className="p-4 mt-0">
            {promotionHistory.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
                <Gift className="h-12 w-12 text-muted-foreground/50 mb-4" />
                <p className="text-sm text-muted-foreground">
                  Você não tem promoções<br />utilizadas ainda
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {promotionHistory.map((promo, index) => (
                  <div
                    key={index}
                    className="bg-background rounded-lg p-4 border border-border"
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                        <Tag className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-semibold text-sm mb-1">{promo.title}</h4>
                        <p className="text-xs text-muted-foreground mb-2">{promo.description}</p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Calendar className="h-3 w-3" />
                          <span>Utilizado em {promo.usedAt}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
};
