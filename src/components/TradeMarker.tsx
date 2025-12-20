import { useEffect, useState, useRef, useCallback } from "react";
import { Timer, TrendingUp, TrendingDown, DollarSign, TrendingUpDown, Target } from "lucide-react";
import { useTranslation } from "@/hooks/useTranslation";
import { supabase } from "@/integrations/supabase/client";

interface TradeMarkerProps {
  trade: {
    id: string;
    trade_type: 'call' | 'put';
    entry_price: number;
    expires_at: string;
    amount: number;
    payout: number;
    user_id?: string;
    assets?: {
      payout_percentage?: number;
    };
  };
  onExpire: (tradeId: string) => void;
  currentPrice?: number;
}

export function TradeMarker({ trade, onExpire, currentPrice = 0 }: TradeMarkerProps) {
  const { t } = useTranslation();
  const [timeRemaining, setTimeRemaining] = useState<number>(0);
  const [isVisible, setIsVisible] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [frozenPrice, setFrozenPrice] = useState<number | null>(null);
  
  // Ref to track if we already processed this trade
  const processedRef = useRef(false);
  // Ref to track previous P&L state for visual changes only
  const prevPnlStatusRef = useRef<boolean | null>(null);

  // Process trade immediately when timer hits zero
  const processTradeImmediately = useCallback(async (exitPrice: number) => {
    if (processedRef.current || isProcessing) return;
    
    processedRef.current = true;
    setIsProcessing(true);
    setFrozenPrice(exitPrice);
    
    console.log(`[TradeMarker] Timer hit zero! Capturing price ${exitPrice} and processing trade ${trade.id}`);
    
    try {
      // Call edge function immediately with the captured price
      const { error } = await supabase.functions.invoke('process-expired-trades', {
        body: { 
          continuous: false, 
          specificUserId: trade.user_id,
          specificTradeId: trade.id,
          clientExitPrice: exitPrice
        }
      });

      if (error) {
        console.error('[TradeMarker] Error processing trade:', error);
      } else {
        console.log('[TradeMarker] Trade processed successfully with exit price:', exitPrice);
      }
    } catch (error) {
      console.error('[TradeMarker] Error:', error);
    }
    
    // Notify parent after a small delay to show the frozen state
    setTimeout(() => {
      onExpire(trade.id);
    }, 500);
  }, [trade.id, trade.user_id, isProcessing, onExpire]);

  useEffect(() => {
    // Trigger entrance animation
    const timer = setTimeout(() => setIsVisible(true), 50);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const calculateTimeRemaining = () => {
      const now = new Date().getTime();
      const expiresAt = new Date(trade.expires_at).getTime();
      const remaining = Math.max(0, expiresAt - now);
      setTimeRemaining(remaining);

      // CRITICAL: When timer hits zero, immediately capture price and process
      if (remaining <= 0 && !processedRef.current && currentPrice > 0) {
        processTradeImmediately(currentPrice);
      }
    };

    calculateTimeRemaining();
    // Check more frequently (every 100ms) for more precise timing
    const interval = setInterval(calculateTimeRemaining, 100);

    return () => clearInterval(interval);
  }, [trade.expires_at, currentPrice, processTradeImmediately]);

  const formatTime = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const isCall = trade.trade_type === 'call';
  const formattedPrice = trade.entry_price.toFixed(5);
  
  // Critical time threshold - last 30 seconds
  const isCriticalTime = timeRemaining > 0 && timeRemaining <= 30000;
  const isVeryUrgent = timeRemaining > 0 && timeRemaining <= 10000;

  // Use frozen price if available (when trade expired), otherwise use current price
  const displayPrice = frozenPrice !== null ? frozenPrice : currentPrice;

  // Calculate P&L in real-time (or with frozen price when expired)
  const calculatePnL = () => {
    if (!displayPrice || displayPrice === 0) return { value: 0, percentage: 0, isProfit: false };
    
    const priceDiff = displayPrice - trade.entry_price;
    const percentageChange = (priceDiff / trade.entry_price) * 100;
    
    // For CALL: profit if price goes up, loss if price goes down
    // For PUT: profit if price goes down, loss if price goes up
    const isProfit = isCall ? priceDiff > 0 : priceDiff < 0;
    const absolutePercentage = Math.abs(percentageChange);
    
    return {
      value: priceDiff,
      percentage: absolutePercentage,
      isProfit
    };
  };

  const pnl = calculatePnL();

  // Track P&L status changes for visual feedback only (no sounds)
  useEffect(() => {
    if (currentPrice > 0 && pnl.percentage > 0) {
      prevPnlStatusRef.current = pnl.isProfit;
    }
  }, [pnl.isProfit, pnl.percentage, currentPrice]);

  // Calculate potential return based on payout percentage
  const calculatePotentialReturn = () => {
    // Get payout percentage from asset or use the trade's payout field
    const payoutPercentage = trade.assets?.payout_percentage || (trade.payout ? (trade.payout / trade.amount) * 100 : 91);
    
    // Calculate potential profit
    const potentialProfit = (trade.amount * payoutPercentage) / 100;
    const totalReturn = trade.amount + potentialProfit;
    
    return {
      profit: potentialProfit,
      total: totalReturn,
      percentage: payoutPercentage
    };
  };

  const potentialReturn = calculatePotentialReturn();

  return (
    <div 
      className={`absolute left-0 flex items-center gap-1 md:gap-2 px-1.5 md:px-3 py-1 md:py-1.5 rounded-r-lg transition-all duration-500 ease-out max-w-[95vw] md:max-w-none ${
        isVisible ? 'translate-x-0 opacity-100' : '-translate-x-full opacity-0'
      }`}
      style={{ 
        pointerEvents: 'none',
        zIndex: 1000,
        background: isCriticalTime
          ? 'linear-gradient(135deg, rgba(234, 179, 8, 0.15) 0%, rgba(234, 179, 8, 0.25) 100%)'
          : isCall 
            ? 'linear-gradient(135deg, rgba(16, 185, 129, 0.15) 0%, rgba(16, 185, 129, 0.25) 100%)'
            : 'linear-gradient(135deg, rgba(239, 68, 68, 0.15) 0%, rgba(239, 68, 68, 0.25) 100%)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        borderRight: isCriticalTime
          ? `4px solid #eab308`
          : `4px solid ${isCall ? '#10b981' : '#ef4444'}`,
        boxShadow: isCriticalTime
          ? '0 8px 32px -8px rgba(234, 179, 8, 0.5), 0 0 0 1px rgba(234, 179, 8, 0.15), inset 0 0 20px rgba(234, 179, 8, 0.15)'
          : isCall 
            ? '0 8px 32px -8px rgba(16, 185, 129, 0.4), 0 0 0 1px rgba(16, 185, 129, 0.1), inset 0 0 20px rgba(16, 185, 129, 0.1)'
            : '0 8px 32px -8px rgba(239, 68, 68, 0.4), 0 0 0 1px rgba(239, 68, 68, 0.1), inset 0 0 20px rgba(239, 68, 68, 0.1)',
      }}
    >
      {/* Trade Type Indicator with Icon */}
      <div 
        className={`flex items-center gap-0.5 md:gap-1 px-1 md:px-2 py-0.5 md:py-1 rounded-md font-bold text-xs ${
          isCall ? 'text-white' : 'text-white'
        }`}
        style={{
          background: isCall 
            ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
            : 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
          boxShadow: isCall
            ? '0 2px 8px rgba(16, 185, 129, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.2)'
            : '0 2px 8px rgba(239, 68, 68, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.2)',
        }}
      >
        {isCall ? (
          <TrendingUp className="w-2.5 md:w-3 h-2.5 md:h-3" strokeWidth={2.5} />
        ) : (
          <TrendingDown className="w-2.5 md:w-3 h-2.5 md:h-3" strokeWidth={2.5} />
        )}
        <span className="text-[9px] md:text-[10px] tracking-wide hidden md:inline">
          {isCall ? t("trade_marker_buy") : t("trade_marker_sell")}
        </span>
      </div>

      {/* Separator */}
      <div 
        className="h-5 md:h-6 w-px" 
        style={{ 
          background: isCall 
            ? 'linear-gradient(180deg, transparent, rgba(16, 185, 129, 0.3), transparent)'
            : 'linear-gradient(180deg, transparent, rgba(239, 68, 68, 0.3), transparent)'
        }}
      />
      
      {/* Timer Section with Critical Alert Animation */}
      <div className={`flex flex-col items-start gap-0.5 ${isCriticalTime ? 'animate-pulse' : ''}`}>
        <div 
          className={`flex items-center gap-0.5 md:gap-1 px-1 md:px-1.5 py-0.5 rounded-md transition-all duration-300 ${
            isCriticalTime ? 'bg-destructive/20' : ''
          }`}
          style={isCriticalTime ? {
            animation: isVeryUrgent 
              ? 'pulse 0.5s cubic-bezier(0.4, 0, 0.6, 1) infinite' 
              : 'pulse 1s cubic-bezier(0.4, 0, 0.6, 1) infinite',
            boxShadow: '0 0 10px rgba(239, 68, 68, 0.4)'
          } : {}}
        >
          <Timer 
            className={`w-2.5 md:w-3 h-2.5 md:h-3 ${
              isCriticalTime ? 'text-destructive' : 'text-foreground/70'
            }`} 
            strokeWidth={2.5}
          />
          <span 
            className={`text-[10px] md:text-xs font-mono font-bold tracking-wide ${
              isCriticalTime ? 'text-destructive' : 'text-foreground'
            }`}
          >
            {formatTime(timeRemaining)}
          </span>
        </div>
        <span className={`text-[8px] md:text-[9px] font-medium uppercase tracking-wide hidden md:block ${
          isCriticalTime ? 'text-destructive' : 'text-muted-foreground'
        }`}>
          {isCriticalTime ? t("trade_marker_expiring") : t("trade_marker_time_remaining")}
        </span>
      </div>

      {/* Separator */}
      <div 
        className="h-5 md:h-6 w-px hidden md:block" 
        style={{ 
          background: isCall 
            ? 'linear-gradient(180deg, transparent, rgba(16, 185, 129, 0.3), transparent)'
            : 'linear-gradient(180deg, transparent, rgba(239, 68, 68, 0.3), transparent)'
        }}
      />

      {/* Price Entry Section */}
      <div className="hidden md:flex flex-col items-start gap-0.5">
        <span className="text-xs font-mono font-bold text-foreground">
          {formattedPrice}
        </span>
        <span className="text-[8px] text-muted-foreground font-medium uppercase tracking-wide">
          {t("trade_marker_entry_price")}
        </span>
      </div>

      {/* Separator */}
      <div 
        className="h-5 md:h-6 w-px" 
        style={{ 
          background: isCall 
            ? 'linear-gradient(180deg, transparent, rgba(16, 185, 129, 0.3), transparent)'
            : 'linear-gradient(180deg, transparent, rgba(239, 68, 68, 0.3), transparent)'
        }}
      />

      {/* Amount Section */}
      <div className="flex flex-col items-start gap-0.5">
        <div className="flex items-center gap-0.5">
          <DollarSign className="w-2.5 md:w-3 h-2.5 md:h-3 text-foreground/70" strokeWidth={2.5} />
          <span className="text-[10px] md:text-xs font-bold text-foreground">
            R$ {trade.amount.toFixed(2)}
          </span>
        </div>
        <span className="text-[8px] md:text-[9px] text-muted-foreground font-medium uppercase tracking-wide hidden md:block">
          {t("trade_marker_investment")}
        </span>
      </div>

      {/* P&L Section - Real-time Profit/Loss */}
      {currentPrice > 0 && (
        <>
          {/* Separator */}
          <div 
            className="h-5 md:h-6 w-px" 
            style={{ 
              background: isCall 
                ? 'linear-gradient(180deg, transparent, rgba(16, 185, 129, 0.3), transparent)'
                : 'linear-gradient(180deg, transparent, rgba(239, 68, 68, 0.3), transparent)'
            }}
          />

          <div 
            className={`flex flex-col items-start gap-0.5 px-1 md:px-1.5 py-0.5 rounded-md transition-all duration-300 ${
              pnl.isProfit ? 'bg-emerald-500/15' : 'bg-red-500/15'
            }`}
            style={{
              border: `1px solid ${pnl.isProfit ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`
            }}
          >
            <div className="flex items-center gap-0.5">
              <TrendingUpDown 
                className={`w-2.5 md:w-3 h-2.5 md:h-3 ${pnl.isProfit ? 'text-emerald-500' : 'text-red-500'}`} 
                strokeWidth={2.5}
              />
              <span className={`text-[10px] md:text-xs font-bold font-mono ${
                pnl.isProfit ? 'text-emerald-500' : 'text-red-500'
              }`}>
                {pnl.isProfit ? '+' : '-'}{pnl.percentage.toFixed(2)}%
              </span>
            </div>
            <span className={`text-[8px] md:text-[9px] font-medium uppercase tracking-wide hidden md:block ${
              pnl.isProfit ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'
            }`}>
              {pnl.isProfit ? t("trade_marker_profit") : t("trade_marker_loss")}
            </span>
          </div>
        </>
      )}

      {/* Separator */}
      <div 
        className="h-5 md:h-6 w-px" 
        style={{ 
          background: isCall 
            ? 'linear-gradient(180deg, transparent, rgba(16, 185, 129, 0.3), transparent)'
            : 'linear-gradient(180deg, transparent, rgba(239, 68, 68, 0.3), transparent)'
        }}
      />

      {/* Potential Return Section */}
      <div 
        className="flex flex-col items-start gap-0.5 px-1 md:px-1.5 py-0.5 rounded-md bg-primary/10"
        style={{
          border: '1px solid rgba(99, 102, 241, 0.3)'
        }}
      >
        <div className="flex items-center gap-0.5">
          <Target 
            className="w-2.5 md:w-3 h-2.5 md:h-3 text-primary" 
            strokeWidth={2.5}
          />
          <span className="text-[10px] md:text-xs font-bold text-primary font-mono">
            R$ {potentialReturn.total.toFixed(2)}
          </span>
        </div>
        <span className="text-[8px] md:text-[9px] text-primary/80 font-medium uppercase tracking-wide hidden md:block">
          {t("trade_marker_return")} {potentialReturn.percentage.toFixed(0)}%
        </span>
      </div>
    </div>
  );
}