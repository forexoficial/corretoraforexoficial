import { Crown, Star, Zap, TrendingUp } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useTranslation } from "@/hooks/useTranslation";

interface UserTierProgressProps {
  totalDeposited: number;
  currentTier: string;
}

const TIERS = [
  { 
    name: "standard", 
    label: "Standard", 
    min: 0, 
    max: 10000, 
    icon: Star,
    color: "text-muted-foreground",
    bgColor: "bg-muted",
    borderColor: "border-muted-foreground/30",
    gradient: "from-slate-500/20 to-slate-600/20"
  },
  { 
    name: "pro", 
    label: "Pro", 
    min: 10000, 
    max: 100000, 
    icon: Zap,
    color: "text-blue-500",
    bgColor: "bg-blue-500/20",
    borderColor: "border-blue-500/50",
    gradient: "from-blue-500/20 to-cyan-500/20"
  },
  { 
    name: "vip", 
    label: "VIP", 
    min: 100000, 
    max: 1000000, 
    icon: Crown,
    color: "text-amber-500",
    bgColor: "bg-amber-500/20",
    borderColor: "border-amber-500/50",
    gradient: "from-amber-500/20 to-yellow-500/20"
  }
];

export const UserTierProgress = ({ totalDeposited, currentTier }: UserTierProgressProps) => {
  const { t } = useTranslation();
  const currentTierIndex = TIERS.findIndex(t => t.name === currentTier);
  const currentTierData = TIERS[currentTierIndex] || TIERS[0];
  const nextTierData = TIERS[currentTierIndex + 1];
  
  // Calculate progress to next tier
  const progressMin = currentTierData.min;
  const progressMax = nextTierData ? nextTierData.min : currentTierData.max;
  const progressValue = Math.min(
    ((totalDeposited - progressMin) / (progressMax - progressMin)) * 100,
    100
  );
  
  const amountToNextTier = nextTierData ? progressMax - totalDeposited : 0;
  const TierIcon = currentTierData.icon;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  return (
    <Card className={`bg-gradient-to-br ${currentTierData.gradient} border ${currentTierData.borderColor} overflow-hidden relative`}>
      {/* Decorative elements */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-white/5 to-transparent rounded-full -translate-y-1/2 translate-x-1/2" />
      <div className="absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-tr from-white/5 to-transparent rounded-full translate-y-1/2 -translate-x-1/2" />
      
      <CardHeader className="pb-2 relative">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            {t('your_level')}
          </CardTitle>
          <Badge className={`${currentTierData.bgColor} ${currentTierData.color} border ${currentTierData.borderColor} font-bold text-sm px-3 py-1`}>
            <TierIcon className="h-4 w-4 mr-1" />
            {currentTierData.label}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="relative">
        {/* Total deposited display */}
        <div className="mb-4">
          <p className="text-sm text-muted-foreground mb-1">{t('total_deposited')}</p>
          <p className="text-3xl font-bold">{formatCurrency(totalDeposited)}</p>
        </div>

        {/* Progress bar */}
        {nextTierData && (
          <div className="space-y-3">
            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground">{t('progress_to')} {nextTierData.label}</span>
              <span className={`font-semibold ${nextTierData.color}`}>
                {progressValue.toFixed(1)}%
              </span>
            </div>
            
            <div className="relative">
              <Progress 
                value={progressValue} 
                className="h-3 bg-background/50"
              />
              <div 
                className={`absolute inset-0 h-3 rounded-full bg-gradient-to-r ${
                  nextTierData.name === 'pro' 
                    ? 'from-blue-500 to-cyan-400' 
                    : 'from-amber-500 to-yellow-400'
                } transition-all duration-500`}
                style={{ width: `${progressValue}%` }}
              />
            </div>

            <div className="flex justify-between items-center text-xs text-muted-foreground">
              <span>{formatCurrency(progressMin)}</span>
              <span>{formatCurrency(progressMax)}</span>
            </div>

            {/* Amount needed */}
            <div className="p-3 bg-background/50 rounded-lg border border-border/50 mt-4">
              <p className="text-sm text-center">
                {t('deposit_more')} <span className={`font-bold ${nextTierData.color}`}>{formatCurrency(amountToNextTier)}</span> {t('to_reach_level')}{" "}
                <span className={`font-bold ${nextTierData.color}`}>{nextTierData.label}</span>!
              </p>
            </div>
          </div>
        )}

        {/* Max tier reached */}
        {!nextTierData && (
          <div className="p-4 bg-amber-500/10 rounded-lg border border-amber-500/30 text-center">
            <Crown className="h-8 w-8 text-amber-500 mx-auto mb-2" />
            <p className="font-semibold text-amber-500">{t('congratulations_max_level')}</p>
            <p className="text-sm text-muted-foreground mt-1">
              {t('enjoy_vip_benefits')}
            </p>
          </div>
        )}

        {/* Tier benefits preview */}
        <div className="mt-6 pt-4 border-t border-border/50">
          <p className="text-sm font-medium mb-3">{t('all_levels')}</p>
          <div className="flex justify-between gap-2">
            {TIERS.map((tier, index) => {
              const Icon = tier.icon;
              const isActive = tier.name === currentTier;
              const isUnlocked = index <= currentTierIndex;
              
              return (
                <div 
                  key={tier.name}
                  className={`flex-1 p-2 rounded-lg text-center transition-all ${
                    isActive 
                      ? `${tier.bgColor} ${tier.borderColor} border-2` 
                      : isUnlocked 
                        ? 'bg-background/50 border border-border/50' 
                        : 'bg-muted/30 opacity-50'
                  }`}
                >
                  <Icon className={`h-5 w-5 mx-auto mb-1 ${isUnlocked ? tier.color : 'text-muted-foreground'}`} />
                  <p className={`text-xs font-medium ${isUnlocked ? tier.color : 'text-muted-foreground'}`}>
                    {tier.label}
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    {formatCurrency(tier.min)}+
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};