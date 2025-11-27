import { useEffect, useState } from "react";
import { Trophy, TrendingDown, DollarSign } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useSoundEffects } from "@/hooks/useSoundEffects";

interface TradeNotificationProps {
  trade: {
    id: string;
    status: 'won' | 'lost';
    result: number;
    amount: number;
    asset_name?: string;
  } | null;
  onClose: () => void;
}

export function TradeNotification({ trade, onClose }: TradeNotificationProps) {
  const [isVisible, setIsVisible] = useState(false);
  const { playSound } = useSoundEffects();

  useEffect(() => {
    if (trade) {
      console.log(`[TradeNotification] Mostrando notificação: ${trade.status}`);
      setIsVisible(true);
      
      // Play sound using centralized system
      const soundType = trade.status === 'won' ? 'trade-win' : 'trade-loss';
      console.log(`[TradeNotification] Tocando som: ${soundType}`);
      playSound(soundType);

      // Auto hide after 3 seconds
      const timer = setTimeout(() => {
        setIsVisible(false);
        setTimeout(onClose, 300);
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, [trade, onClose, playSound]);

  if (!trade) return null;

  const isWin = trade.status === 'won';
  const percentage = ((Math.abs(trade.result) / trade.amount) * 100).toFixed(0);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: -50, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -50, scale: 0.9 }}
          className="fixed top-20 left-1/2 transform -translate-x-1/2 z-[9999] pointer-events-none"
        >
          <div
            className={`relative overflow-hidden rounded-2xl shadow-2xl border-2 ${
              isWin
                ? 'bg-gradient-to-br from-green-500/20 to-green-600/20 border-green-500'
                : 'bg-gradient-to-br from-red-500/20 to-red-600/20 border-red-500'
            } backdrop-blur-xl p-6 min-w-[320px]`}
          >
            {/* Confetti animation for wins */}
            {isWin && (
              <div className="absolute inset-0 overflow-hidden pointer-events-none">
                {[...Array(20)].map((_, i) => (
                  <motion.div
                    key={i}
                    initial={{ y: -20, x: Math.random() * 300, opacity: 1 }}
                    animate={{ 
                      y: 400, 
                      x: Math.random() * 300,
                      rotate: Math.random() * 360,
                      opacity: 0 
                    }}
                    transition={{ duration: 2, delay: Math.random() * 0.5 }}
                    className={`absolute w-2 h-2 rounded-full ${
                      ['bg-yellow-400', 'bg-green-400', 'bg-blue-400', 'bg-purple-400'][i % 4]
                    }`}
                  />
                ))}
              </div>
            )}

            <div className="flex items-center gap-4">
              {/* Icon */}
              <motion.div
                animate={{ 
                  scale: [1, 1.2, 1],
                  rotate: isWin ? [0, 10, -10, 0] : 0
                }}
                transition={{ duration: 0.5, repeat: 2 }}
                className={`flex-shrink-0 w-16 h-16 rounded-full flex items-center justify-center ${
                  isWin ? 'bg-green-500' : 'bg-red-500'
                }`}
              >
                {isWin ? (
                  <Trophy className="w-8 h-8 text-white" />
                ) : (
                  <TrendingDown className="w-8 h-8 text-white" />
                )}
              </motion.div>

              {/* Content */}
              <div className="flex-1">
                <motion.h3
                  initial={{ x: -20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: 0.1 }}
                  className={`text-2xl font-bold mb-1 ${
                    isWin ? 'text-green-500' : 'text-red-500'
                  }`}
                >
                  {isWin ? 'Você Ganhou! 🎉' : 'Você Perdeu'}
                </motion.h3>

                <motion.div
                  initial={{ x: -20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: 0.2 }}
                  className="flex items-center gap-2 text-foreground"
                >
                  <DollarSign className="w-5 h-5" />
                  <span className="text-xl font-bold">
                    {isWin ? '+' : ''}{trade.result.toFixed(2)}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    ({isWin ? '+' : '-'}{percentage}%)
                  </span>
                </motion.div>

                {trade.asset_name && (
                  <motion.p
                    initial={{ x: -20, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ delay: 0.3 }}
                    className="text-xs text-muted-foreground mt-1"
                  >
                    {trade.asset_name}
                  </motion.p>
                )}
              </div>
            </div>

            {/* Progress bar */}
            <motion.div
              initial={{ scaleX: 1 }}
              animate={{ scaleX: 0 }}
              transition={{ duration: 3, ease: "linear" }}
              className={`absolute bottom-0 left-0 h-1 w-full origin-left ${
                isWin ? 'bg-green-500' : 'bg-red-500'
              }`}
            />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}