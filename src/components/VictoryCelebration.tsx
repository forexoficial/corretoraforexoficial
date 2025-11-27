import { useEffect } from "react";
import { createPortal } from "react-dom";
import confetti from "canvas-confetti";
import { motion, AnimatePresence } from "framer-motion";
import { Trophy, TrendingUp, Sparkles } from "lucide-react";

interface VictoryCelebrationProps {
  show: boolean;
  amount: number;
  profit: number;
  onComplete?: () => void;
}

export function VictoryCelebration({ show, amount, profit, onComplete }: VictoryCelebrationProps) {
  useEffect(() => {
    if (!show) return;

    // Confetti animation
    const duration = 3000;
    const animationEnd = Date.now() + duration;
    const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 9999 };

    const randomInRange = (min: number, max: number) => {
      return Math.random() * (max - min) + min;
    };

    const interval = setInterval(() => {
      const timeLeft = animationEnd - Date.now();

      if (timeLeft <= 0) {
        clearInterval(interval);
        return;
      }

      const particleCount = 50 * (timeLeft / duration);

      // Launch confetti from different positions
      confetti({
        ...defaults,
        particleCount,
        origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 },
        colors: ['#22c55e', '#16a34a', '#15803d', '#fbbf24', '#f59e0b']
      });
      confetti({
        ...defaults,
        particleCount,
        origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 },
        colors: ['#22c55e', '#16a34a', '#15803d', '#fbbf24', '#f59e0b']
      });
    }, 250);

    // Auto complete after animation
    const timeout = setTimeout(() => {
      onComplete?.();
    }, duration + 500);

    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, [show, onComplete]);

  const content = (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.5 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          className="fixed inset-0 z-[9998] flex items-center justify-center pointer-events-none"
        >
          <motion.div
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -50, opacity: 0 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="bg-gradient-to-br from-success/95 via-success to-success/90 backdrop-blur-xl rounded-3xl p-8 shadow-2xl border-2 border-success/50 max-w-md mx-4"
          >
            {/* Trophy Icon with pulse animation */}
            <motion.div
              animate={{
                scale: [1, 1.2, 1],
                rotate: [0, 5, -5, 0],
              }}
              transition={{
                duration: 1,
                repeat: 2,
                ease: "easeInOut"
              }}
              className="flex justify-center mb-4"
            >
              <div className="relative">
                <Trophy className="w-24 h-24 text-yellow-300 drop-shadow-lg" />
                <motion.div
                  animate={{ 
                    scale: [1, 1.5, 1],
                    opacity: [0.5, 0, 0.5]
                  }}
                  transition={{
                    duration: 1.5,
                    repeat: Infinity,
                    ease: "easeInOut"
                  }}
                  className="absolute inset-0 bg-yellow-300 rounded-full blur-2xl"
                />
              </div>
            </motion.div>

            {/* Victory Text */}
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
              className="text-center space-y-3"
            >
              <h2 className="text-4xl font-bold text-white drop-shadow-lg flex items-center justify-center gap-2">
                <Sparkles className="w-8 h-8 text-yellow-300" />
                VITÓRIA!
                <Sparkles className="w-8 h-8 text-yellow-300" />
              </h2>
              
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="space-y-2"
              >
                <div className="flex items-center justify-center gap-2 text-yellow-100 text-lg">
                  <TrendingUp className="w-5 h-5" />
                  <span>Lucro</span>
                </div>
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.6, type: "spring", stiffness: 150 }}
                  className="text-5xl font-bold text-yellow-300 drop-shadow-xl"
                >
                  +R$ {profit.toFixed(2)}
                </motion.div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.8 }}
                className="text-white/90 text-sm pt-2"
              >
                Investimento: R$ {amount.toFixed(2)}
              </motion.div>
            </motion.div>

            {/* Animated sparkles around */}
            {[...Array(6)].map((_, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, scale: 0 }}
                animate={{
                  opacity: [0, 1, 0],
                  scale: [0, 1.5, 0],
                  x: [0, Math.cos((i * Math.PI * 2) / 6) * 100],
                  y: [0, Math.sin((i * Math.PI * 2) / 6) * 100],
                }}
                transition={{
                  duration: 1.5,
                  delay: i * 0.1,
                  repeat: Infinity,
                  repeatDelay: 1,
                }}
                className="absolute top-1/2 left-1/2 w-2 h-2 bg-yellow-300 rounded-full"
              />
            ))}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  return createPortal(content, document.body);
}
