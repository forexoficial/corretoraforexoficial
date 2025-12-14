import { useState, useEffect } from "react";
import { Users, Copy, Check, AlertCircle, Loader2 } from "lucide-react";
import { useTranslation } from "@/hooks/useTranslation";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";

interface CopyTradeSubscribeProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface CopyTrader {
  id: string;
  user_id: string;
  display_name: string;
  description: string | null;
  win_rate: number | null;
  total_trades: number | null;
  total_followers: number | null;
  avatar_url?: string | null;
}

export function CopyTradeSubscribe({ open, onOpenChange }: CopyTradeSubscribeProps) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [traderId, setTraderId] = useState("");
  const [allocationPercentage, setAllocationPercentage] = useState([50]);
  const [maxTradeAmount, setMaxTradeAmount] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [foundTrader, setFoundTrader] = useState<CopyTrader | null>(null);
  const [searchError, setSearchError] = useState("");
  const [mySubscriptions, setMySubscriptions] = useState<any[]>([]);
  const [loadingSubscriptions, setLoadingSubscriptions] = useState(false);

  const loadMySubscriptions = async () => {
    if (!user?.id) return;
    
    setLoadingSubscriptions(true);
    try {
      // Fetch subscriptions with copy trader info
      const { data, error } = await supabase
        .from("copy_trade_followers")
        .select(`
          *,
          copy_traders (
            display_name,
            win_rate,
            total_trades,
            user_id
          )
        `)
        .eq("follower_user_id", user.id)
        .eq("is_active", true);

      if (error) throw error;
      
      // Fetch avatars for each copy trader
      if (data && data.length > 0) {
        const userIds = data.map(sub => sub.copy_traders?.user_id).filter(Boolean);
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, avatar_url")
          .in("user_id", userIds);
        
        const avatarMap = new Map(profiles?.map(p => [p.user_id, p.avatar_url]) || []);
        const enrichedData = data.map(sub => ({
          ...sub,
          copy_traders: {
            ...sub.copy_traders,
            avatar_url: avatarMap.get(sub.copy_traders?.user_id) || null
          }
        }));
        setMySubscriptions(enrichedData);
      } else {
        setMySubscriptions([]);
      }
    } catch (error: any) {
      console.error("Error loading subscriptions:", error);
    } finally {
      setLoadingSubscriptions(false);
    }
  };

  const searchTrader = async () => {
    if (!traderId.trim()) {
      setSearchError(t("enter_trader_id", "Digite o ID do Copy Trader"));
      return;
    }

    setIsSearching(true);
    setSearchError("");
    setFoundTrader(null);

    try {
      // Search by copy_trader ID or user_id
      const { data, error } = await supabase
        .from("copy_traders")
        .select("*")
        .or(`id.eq.${traderId.trim()},user_id.eq.${traderId.trim()}`)
        .eq("is_active", true)
        .maybeSingle();

      if (error) throw error;

      if (!data) {
        setSearchError(t("trader_not_found", "Copy Trader não encontrado ou não está ativo"));
        return;
      }

      if (data.user_id === user?.id) {
        setSearchError(t("cannot_follow_yourself", "Você não pode seguir a si mesmo"));
        return;
      }

      // Fetch avatar from profile
      const { data: profile } = await supabase
        .from("profiles")
        .select("avatar_url")
        .eq("user_id", data.user_id)
        .maybeSingle();

      setFoundTrader({
        ...data,
        avatar_url: profile?.avatar_url || null
      });
    } catch (error: any) {
      console.error("Error searching trader:", error);
      setSearchError(t("search_error", "Erro ao buscar trader"));
    } finally {
      setIsSearching(false);
    }
  };

  const subscribeToTrader = async () => {
    if (!user?.id || !foundTrader) return;

    setIsLoading(true);
    try {
      // Check if already following
      const { data: existingFollow } = await supabase
        .from("copy_trade_followers")
        .select("id, is_active")
        .eq("copy_trader_id", foundTrader.id)
        .eq("follower_user_id", user.id)
        .maybeSingle();

      if (existingFollow?.is_active) {
        toast({
          title: t("already_following", "Já seguindo"),
          description: t("already_following_desc", "Você já está seguindo este Copy Trader"),
          variant: "destructive",
        });
        setIsLoading(false);
        return;
      }

      // If exists but inactive, reactivate
      if (existingFollow) {
        const { error } = await supabase
          .from("copy_trade_followers")
          .update({
            is_active: true,
            allocation_percentage: allocationPercentage[0],
            max_trade_amount: maxTradeAmount ? parseFloat(maxTradeAmount) : null,
            updated_at: new Date().toISOString(),
          })
          .eq("id", existingFollow.id);

        if (error) throw error;
      } else {
        // Create new subscription
        const { error } = await supabase
          .from("copy_trade_followers")
          .insert({
            copy_trader_id: foundTrader.id,
            follower_user_id: user.id,
            allocation_percentage: allocationPercentage[0],
            max_trade_amount: maxTradeAmount ? parseFloat(maxTradeAmount) : null,
          });

        if (error) throw error;

        // Update trader follower count
        await supabase
          .from("copy_traders")
          .update({
            total_followers: (foundTrader.total_followers || 0) + 1,
          })
          .eq("id", foundTrader.id);
      }

      toast({
        title: t("subscription_success", "Inscrição realizada!"),
        description: t("subscription_success_desc", "Agora você está copiando as operações de") + " " + foundTrader.display_name,
      });

      // Reset form
      setTraderId("");
      setFoundTrader(null);
      setAllocationPercentage([50]);
      setMaxTradeAmount("");
      loadMySubscriptions();
    } catch (error: any) {
      console.error("Error subscribing:", error);
      toast({
        title: t("error", "Erro"),
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const unsubscribe = async (followerId: string) => {
    try {
      const { error } = await supabase
        .from("copy_trade_followers")
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .eq("id", followerId);

      if (error) throw error;

      toast({
        title: t("unsubscribed", "Inscrição cancelada"),
        description: t("unsubscribed_desc", "Você deixou de seguir este Copy Trader"),
      });

      loadMySubscriptions();
    } catch (error: any) {
      console.error("Error unsubscribing:", error);
      toast({
        title: t("error", "Erro"),
        description: error.message,
        variant: "destructive",
      });
    }
  };

  // Load subscriptions when sheet opens
  useEffect(() => {
    if (open) {
      loadMySubscriptions();
    }
  }, [open, user?.id]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md p-0 mobile-header-safe-offset">
        <SheetHeader className="p-6 border-b bg-gradient-to-r from-blue-500/10 to-cyan-500/10">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500/20 rounded-xl">
              <Users className="h-5 w-5 text-blue-500" />
            </div>
            <div>
              <SheetTitle>{t("copy_trade", "Copy Trade")}</SheetTitle>
              <p className="text-xs text-muted-foreground mt-1">
                {t("copy_trade_subtitle", "Copie operações de traders experientes")}
              </p>
            </div>
          </div>
        </SheetHeader>

        <ScrollArea className="h-[calc(100vh-120px)]">
          <div className="p-6 space-y-6">
            {/* Subscribe to a Trader */}
            <div className="space-y-4">
              <h3 className="font-semibold">{t("follow_trader", "Seguir um Copy Trader")}</h3>
              
              <div className="space-y-2">
                <Label htmlFor="traderId">{t("trader_id", "ID do Copy Trader")}</Label>
                <div className="flex gap-2">
                  <Input
                    id="traderId"
                    placeholder={t("enter_trader_id_placeholder", "Cole o ID do trader aqui")}
                    value={traderId}
                    onChange={(e) => {
                      setTraderId(e.target.value);
                      setSearchError("");
                      setFoundTrader(null);
                    }}
                  />
                  <Button 
                    onClick={searchTrader} 
                    disabled={isSearching}
                    variant="secondary"
                  >
                    {isSearching ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      t("search", "Buscar")
                    )}
                  </Button>
                </div>
                {searchError && (
                  <p className="text-xs text-destructive flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {searchError}
                  </p>
                )}
              </div>

              {/* Found Trader Card */}
              {foundTrader && (
                <Card className="border-blue-500/30 bg-blue-500/5">
                  <CardContent className="p-4 space-y-4">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-12 w-12 border-2 border-blue-500/30">
                        <AvatarImage src={foundTrader.avatar_url || undefined} />
                        <AvatarFallback className="bg-blue-500/20 text-blue-500 font-semibold">
                          {foundTrader.display_name.slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <h4 className="font-semibold">{foundTrader.display_name}</h4>
                        <p className="text-xs text-muted-foreground">{foundTrader.description}</p>
                      </div>
                      <Badge variant="secondary" className="bg-green-500/20 text-green-500">
                        {(foundTrader.win_rate || 0).toFixed(1)}% Win
                      </Badge>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div className="p-2 bg-muted/50 rounded">
                        <p className="text-muted-foreground text-xs">{t("total_trades", "Trades")}</p>
                        <p className="font-semibold">{foundTrader.total_trades || 0}</p>
                      </div>
                      <div className="p-2 bg-muted/50 rounded">
                        <p className="text-muted-foreground text-xs">{t("followers", "Seguidores")}</p>
                        <p className="font-semibold">{foundTrader.total_followers || 0}</p>
                      </div>
                    </div>

                    {/* Allocation Settings */}
                    <div className="space-y-3 pt-2 border-t">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Label className="text-sm">{t("allocation_percentage", "% da Carteira")}</Label>
                          <span className="text-sm font-semibold text-primary">{allocationPercentage[0]}%</span>
                        </div>
                        <Slider
                          value={allocationPercentage}
                          onValueChange={setAllocationPercentage}
                          min={1}
                          max={100}
                          step={1}
                        />
                        <p className="text-xs text-muted-foreground">
                          {t("allocation_hint", "Porcentagem do seu saldo usada em cada operação copiada")}
                        </p>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="maxAmount" className="text-sm">{t("max_amount", "Valor Máximo (opcional)")}</Label>
                        <Input
                          id="maxAmount"
                          type="number"
                          placeholder="R$ 0.00"
                          value={maxTradeAmount}
                          onChange={(e) => setMaxTradeAmount(e.target.value)}
                        />
                        <p className="text-xs text-muted-foreground">
                          {t("max_amount_hint", "Limite máximo por operação copiada")}
                        </p>
                      </div>
                    </div>

                    <Button 
                      className="w-full bg-blue-600 hover:bg-blue-700" 
                      onClick={subscribeToTrader}
                      disabled={isLoading}
                    >
                      {isLoading ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : (
                        <Check className="h-4 w-4 mr-2" />
                      )}
                      {t("authorize_copy", "Autorizar Copy Trade")}
                    </Button>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* My Subscriptions */}
            <div className="space-y-4">
              <h3 className="font-semibold">{t("my_subscriptions", "Minhas Inscrições")}</h3>
              
              {loadingSubscriptions ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : mySubscriptions.length === 0 ? (
                <Card className="border-dashed">
                  <CardContent className="p-6 text-center text-muted-foreground">
                    <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">{t("no_subscriptions", "Você ainda não segue nenhum Copy Trader")}</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-3">
                  {mySubscriptions.map((sub) => (
                    <Card key={sub.id}>
                      <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-10 w-10 border border-border">
                            <AvatarImage src={sub.copy_traders?.avatar_url || undefined} />
                            <AvatarFallback className="bg-muted text-muted-foreground text-sm">
                              {sub.copy_traders?.display_name?.slice(0, 2).toUpperCase() || "CT"}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <h4 className="font-semibold">{sub.copy_traders?.display_name}</h4>
                            <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                              <span>{sub.allocation_percentage}% {t("allocation", "alocação")}</span>
                              {sub.max_trade_amount && (
                                <>
                                  <span>•</span>
                                  <span>Max R$ {sub.max_trade_amount}</span>
                                </>
                              )}
                            </div>
                          </div>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => unsubscribe(sub.id)}
                          >
                            {t("unsubscribe", "Cancelar")}
                          </Button>
                        </div>
                        <div className="flex items-center gap-4 mt-3 text-xs">
                          <span className="text-green-500">
                            {(sub.copy_traders?.win_rate || 0).toFixed(1)}% Win
                          </span>
                          <span className="text-muted-foreground">
                            {sub.total_copied_trades || 0} {t("copied_trades", "trades copiados")}
                          </span>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}