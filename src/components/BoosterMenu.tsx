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
import { useTranslation } from "@/hooks/useTranslation";
import { useCurrency } from "@/hooks/useCurrency";

interface BoosterMenuProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface Booster {
  id: string;
  name: string;
  name_en?: string;
  name_es?: string;
  description: string;
  description_en?: string;
  description_es?: string;
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
  const { t, language } = useTranslation();
  const { formatBalance } = useCurrency();
  const [boosters, setBoosters] = useState<Booster[]>([]);
  const [activeBooster, setActiveBooster] = useState<ActiveBooster | null>(null);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(false);
  const [balance, setBalance] = useState(0);

  // Helper function to get translated name
  const getBoosterName = (booster: Booster) => {
    if (language === 'en' && booster.name_en) return booster.name_en;
    if (language === 'es' && booster.name_es) return booster.name_es;
    return booster.name; // Default to Portuguese
  };

  // Helper function to get translated description
  const getBoosterDescription = (booster: Booster) => {
    if (language === 'en' && booster.description_en) return booster.description_en;
    if (language === 'es' && booster.description_es) return booster.description_es;
    return booster.description; // Default to Portuguese
  };

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
      toast.error(t('error_loading_boosters'));
    } finally {
      setLoading(false);
    }
  };

  const handlePurchase = async (booster: Booster) => {
    if (activeBooster) {
      toast.error(t('already_active_booster'));
      return;
    }

    if (balance < booster.price) {
      toast.error(t('insufficient_balance_error'));
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

      toast.success(`${t('booster_menu_title')} ${getBoosterName(booster)} ${t('booster_activated_success')}`);
      fetchData();
    } catch (error) {
      console.error("Error purchasing booster:", error);
      toast.error(t('error_activating_booster'));
    } finally {
      setPurchasing(false);
    }
  };

  const getTimeRemaining = () => {
    if (!activeBooster) return null;
    
    const now = new Date();
    const expires = new Date(activeBooster.expires_at);
    const diff = expires.getTime() - now.getTime();
    
    if (diff <= 0) return t('expired');
    
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    
    if (hours > 0) {
      return `${hours}${t('hours_short')} ${remainingMinutes}${t('min_remaining')}`;
    }
    return `${remainingMinutes} ${t('minutes_remaining')}`;
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent 
        side="right" 
        className="w-full sm:max-w-md overflow-y-auto mobile-header-safe-offset"
      >
        <SheetHeader>
          <div className="flex items-center gap-2">
            <Zap className="h-6 w-6 text-primary" />
            <SheetTitle>{t('booster_menu_title')}</SheetTitle>
          </div>
          <SheetDescription>
            {t('booster_description')}
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
                    <h4 className="font-semibold text-sm mb-1">{t('active_booster')}</h4>
                    <p className="text-xs text-muted-foreground mb-2">
                      +{activeBooster.payout_increase_percentage}% {t('payout_increase_all')}
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
              <p className="text-sm text-muted-foreground mb-1">{t('available_balance')}</p>
              <p className="text-2xl font-bold">{formatBalance(balance)}</p>
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
                            <CardTitle className="text-lg">{getBoosterName(booster)}</CardTitle>
                            <CardDescription className="text-xs mt-1 flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {booster.duration_minutes} {t('minutes')}
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
                        {getBoosterDescription(booster)}
                      </p>
                      <div className="flex items-center justify-between">
                        <span className="text-2xl font-bold text-primary">
                          {formatBalance(booster.price)}
                        </span>
                        <Button
                          onClick={() => handlePurchase(booster)}
                          disabled={purchasing || !!activeBooster || balance < booster.price}
                        >
                          <Zap className="h-4 w-4 mr-2" />
                          {purchasing ? t('activating') : t('activate')}
                        </Button>
                      </div>
                      {balance < booster.price && !activeBooster && (
                        <p className="text-xs text-destructive mt-2">{t('insufficient_balance')}</p>
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
                {t('how_boosters_work')}
              </h4>
              <ul className="text-xs text-muted-foreground space-y-1">
                <li>• {t('boosters_increase_payout')}</li>
                <li>• {t('one_booster_active')}</li>
                <li>• {t('effects_applied_auto')}</li>
                <li>• {t('debited_on_purchase')}</li>
              </ul>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
