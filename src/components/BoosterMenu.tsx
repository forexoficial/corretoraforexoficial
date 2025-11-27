import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Zap, TrendingUp, Shield, Clock, Info, Rocket, Flame, Star } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { formatCurrency } from "@/lib/utils";

interface BoosterMenuProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface Booster {
  id: string;
  name: string;
  description: string;
  payout_increase_percentage: number;
  duration_minutes: number;
  price: number;
  icon: string;
  is_active: boolean;
}

interface ActiveBooster {
  payout_increase_percentage: number;
  expires_at: string;
}

const iconMap: { [key: string]: any } = {
  Zap,
  TrendingUp,
  Shield,
  Clock,
  Rocket,
  Flame,
  Star,
};

export function BoosterMenu({ open, onOpenChange }: BoosterMenuProps) {
  const { user } = useAuth();
  const [boosters, setBoosters] = useState<Booster[]>([]);
  const [activeBooster, setActiveBooster] = useState<ActiveBooster | null>(null);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(false);
  const [balance, setBalance] = useState(0);

  useEffect(() => {
    if (open && user) {
      fetchData();
    }
  }, [open, user]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch available boosters
      const { data: boostersData, error: boostersError } = await supabase
        .from("boosters")
        .select("*")
        .eq("is_active", true)
        .order("display_order", { ascending: true });

      if (boostersError) throw boostersError;
      setBoosters(boostersData || []);

      // Fetch user balance
      const { data: profile } = await supabase
        .from("profiles")
        .select("balance")
        .eq("user_id", user?.id)
        .single();

      setBalance(profile?.balance || 0);

      // Check for active booster
      const { data: activeBoosterData, error: activeError } = await supabase
        .rpc("get_user_active_booster", { p_user_id: user?.id });

      if (!activeError && activeBoosterData && activeBoosterData.length > 0) {
        setActiveBooster(activeBoosterData[0]);
      } else {
        setActiveBooster(null);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Erro ao carregar boosters");
    } finally {
      setLoading(false);
    }
  };

  const handlePurchase = async (booster: Booster) => {
    if (activeBooster) {
      toast.error("Você já tem um booster ativo!");
      return;
    }

    if (balance < booster.price) {
      toast.error("Saldo insuficiente!");
      return;
    }

    setPurchasing(true);

    try {
      // Calculate expiration time
      const expiresAt = new Date();
      expiresAt.setMinutes(expiresAt.getMinutes() + booster.duration_minutes);

      // Create user booster record
      const { error: boosterError } = await supabase
        .from("user_boosters")
        .insert({
          user_id: user?.id,
          booster_id: booster.id,
          expires_at: expiresAt.toISOString(),
          payout_increase_percentage: booster.payout_increase_percentage,
        });

      if (boosterError) throw boosterError;

      // Deduct balance
      const { error: balanceError } = await supabase
        .from("profiles")
        .update({
          balance: balance - booster.price,
        })
        .eq("user_id", user?.id);

      if (balanceError) throw balanceError;

      toast.success(`Booster ${booster.name} ativado com sucesso!`);
      fetchData();
    } catch (error) {
      console.error("Error purchasing booster:", error);
      toast.error("Erro ao ativar booster");
    } finally {
      setPurchasing(false);
    }
  };

  const getTimeRemaining = () => {
    if (!activeBooster) return null;
    
    const now = new Date();
    const expires = new Date(activeBooster.expires_at);
    const diff = expires.getTime() - now.getTime();
    
    if (diff <= 0) return "Expirado";
    
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    
    if (hours > 0) {
      return `${hours}h ${remainingMinutes}min restantes`;
    }
    return `${remainingMinutes} minutos restantes`;
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent 
        side="right" 
        className="w-full sm:max-w-md overflow-y-auto"
      >
        <SheetHeader>
          <div className="flex items-center gap-2">
            <Zap className="h-6 w-6 text-primary" />
            <SheetTitle>Booster</SheetTitle>
          </div>
          <SheetDescription>
            Potencialize suas operações com boosters especiais
          </SheetDescription>
        </SheetHeader>

        {loading ? (
          <LoadingSpinner size="lg" className="mt-8" />
        ) : (
          <>
            {/* Active Booster Alert */}
            {activeBooster && (
              <div className="mt-6 p-4 bg-primary/10 border border-primary/20 rounded-lg">
                <div className="flex items-start gap-3">
                  <Zap className="h-5 w-5 text-primary mt-0.5" />
                  <div className="flex-1">
                    <h4 className="font-semibold text-sm mb-1">Booster Ativo!</h4>
                    <p className="text-xs text-muted-foreground mb-2">
                      +{activeBooster.payout_increase_percentage}% de payout em todos os ativos
                    </p>
                    <Badge variant="secondary" className="text-xs">
                      <Clock className="h-3 w-3 mr-1" />
                      {getTimeRemaining()}
                    </Badge>
                  </div>
                </div>
              </div>
            )}

            {/* Balance Display */}
            <div className="mt-4 p-4 bg-muted/30 rounded-lg">
              <p className="text-sm text-muted-foreground mb-1">Saldo Disponível</p>
              <p className="text-2xl font-bold">R$ {formatCurrency(balance)}</p>
            </div>

            {/* Boosters List */}
            <div className="mt-6 space-y-4">
              {boosters.map((booster) => {
                const Icon = iconMap[booster.icon] || Zap;
                return (
                  <Card key={booster.id} className="border-primary/20 hover:border-primary/40 transition-colors">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className="p-3 rounded-lg bg-primary/10">
                            <Icon className="h-6 w-6 text-primary" />
                          </div>
                          <div>
                            <CardTitle className="text-lg">{booster.name}</CardTitle>
                            <CardDescription className="text-xs mt-1 flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {booster.duration_minutes} minutos
                            </CardDescription>
                          </div>
                        </div>
                        <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/20">
                          +{booster.payout_increase_percentage}%
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground mb-4">
                        {booster.description}
                      </p>
                      <div className="flex items-center justify-between">
                        <span className="text-2xl font-bold text-primary">
                          R$ {formatCurrency(booster.price)}
                        </span>
                        <Button
                          onClick={() => handlePurchase(booster)}
                          disabled={purchasing || !!activeBooster || balance < booster.price}
                        >
                          <Zap className="h-4 w-4 mr-2" />
                          {purchasing ? "Ativando..." : "Ativar"}
                        </Button>
                      </div>
                      {balance < booster.price && !activeBooster && (
                        <p className="text-xs text-destructive mt-2">Saldo insuficiente</p>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {/* Info Card */}
            <div className="mt-6 p-4 bg-muted/50 rounded-lg">
              <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                <Info className="h-4 w-4 text-primary" />
                Como funcionam os Boosters?
              </h4>
              <ul className="text-xs text-muted-foreground space-y-1">
                <li>• Os boosters aumentam o payout de todos os ativos durante o período</li>
                <li>• Apenas um booster pode estar ativo por vez</li>
                <li>• Os efeitos são aplicados automaticamente após ativação</li>
                <li>• O valor é debitado do seu saldo no momento da compra</li>
              </ul>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
