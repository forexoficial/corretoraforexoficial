import { useEffect, useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Trophy, Medal } from "lucide-react";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { useTranslation } from "@/hooks/useTranslation";

interface RankingUser {
  id: string;
  user_id: string;
  full_name: string;
  avatar_url: string | null;
  balance: number;
}

interface RankingLeaderboardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const RankingLeaderboard = ({ open, onOpenChange }: RankingLeaderboardProps) => {
  const [topUsers, setTopUsers] = useState<RankingUser[]>([]);
  const [loading, setLoading] = useState(false);
  const { t } = useTranslation();

  useEffect(() => {
    if (open) {
      loadRanking();
    }
  }, [open]);

  const loadRanking = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, user_id, full_name, avatar_url, balance')
        .order('balance', { ascending: false })
        .limit(10);

      if (error) throw error;
      setTopUsers(data || []);
    } catch (error) {
      console.error("Erro ao carregar ranking:", error);
      toast.error(t("toast_error_loading_ranking"));
    } finally {
      setLoading(false);
    }
  };

  const getMedalColor = (position: number) => {
    if (position === 1) return "text-yellow-500"; // Ouro
    if (position === 2) return "text-gray-400"; // Prata
    if (position === 3) return "text-orange-600"; // Bronze
    return "text-muted-foreground";
  };

  const getMedalBgColor = (position: number) => {
    if (position === 1) return "bg-yellow-500/10 border-yellow-500/20";
    if (position === 2) return "bg-muted/50 border-border";
    if (position === 3) return "bg-orange-600/10 border-orange-600/20";
    return "bg-background";
  };

  const getPositionIcon = (position: number) => {
    if (position <= 3) {
      return <Trophy className={`h-5 w-5 ${getMedalColor(position)} fill-current`} />;
    }
    return <span className="text-lg font-bold text-muted-foreground">{position}</span>;
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:w-[350px] p-0 bg-card">
        <SheetHeader className="border-b border-border p-4 pb-3">
          <div className="flex items-center gap-2">
            <Medal className="h-5 w-5 text-primary" />
            <SheetTitle className="text-base font-semibold">{t("week_leaders")}</SheetTitle>
          </div>
        </SheetHeader>

        <div className="p-4 space-y-2">
          {loading ? (
            <LoadingSpinner size="sm" className="py-8" />
          ) : topUsers.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm">
              {t("no_traders_ranking")}
            </div>
          ) : (
            <div className="space-y-2 max-h-[calc(100vh-140px)] overflow-y-auto">
              {topUsers.map((user, index) => {
                const position = index + 1;
                const isTopThree = position <= 3;
                
                return (
                  <div
                    key={user.id}
                    className={`flex items-center gap-3 p-3 rounded-lg border transition-all hover:shadow-md ${
                      getMedalBgColor(position)
                    } ${isTopThree ? 'border' : 'border-transparent bg-background'}`}
                  >
                    <div className="flex items-center justify-center w-8 h-8">
                      {getPositionIcon(position)}
                    </div>

                    <Avatar className={`h-10 w-10 ${isTopThree ? 'ring-2 ring-offset-2' : ''} ${
                      position === 1 ? 'ring-yellow-500' : 
                      position === 2 ? 'ring-gray-400' : 
                      position === 3 ? 'ring-orange-600' : ''
                    }`}>
                      <AvatarImage src={user.avatar_url || undefined} />
                      <AvatarFallback className="text-xs font-semibold">
                        {getInitials(user.full_name)}
                      </AvatarFallback>
                    </Avatar>

                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-semibold truncate ${
                        isTopThree ? 'text-foreground' : 'text-foreground'
                      }`}>
                        {user.full_name}
                      </p>
                      <div className="flex items-center gap-1 mt-0.5">
                        <div className="w-2 h-2 rounded-full bg-success"></div>
                        <span className="text-xs text-muted-foreground">{t("online")}</span>
                      </div>
                    </div>

                    <div className="text-right">
                      <p className={`text-sm font-bold ${
                        isTopThree ? getMedalColor(position) : 'text-green-500'
                      }`}>
                        ${user.balance?.toLocaleString('pt-BR', { 
                          minimumFractionDigits: 0,
                          maximumFractionDigits: 0 
                        })}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
};
