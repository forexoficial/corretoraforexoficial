import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Trophy, TrendingDown, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useSoundEffects } from "@/hooks/useSoundEffects";
import { cn } from "@/lib/utils";

interface TradeResultPopupProps {
  trade: {
    id: string;
    status: 'won' | 'lost';
    result: number;
    amount: number;
    payout: number;
    asset_name?: string;
  } | null;
  onClose: () => void;
}

export function TradeResultPopup({ trade, onClose }: TradeResultPopupProps) {
  const [isVisible, setIsVisible] = useState(false);
  const { playSound } = useSoundEffects();

  useEffect(() => {
    console.log('[TradeResultPopup] 🎯 Props recebidas:', {
      has_trade: !!trade,
      trade_id: trade?.id,
      status: trade?.status,
      result: trade?.result,
      amount: trade?.amount
    });

    if (!trade) {
      console.log('[TradeResultPopup] ℹ️ Nenhum trade para exibir, escondendo popup');
      setIsVisible(false);
      return;
    }

    console.log('[TradeResultPopup] ✅ Trade recebido, exibindo popup:', {
      id: trade.id,
      status: trade.status,
      result: trade.result,
      amount: trade.amount,
      asset_name: trade.asset_name
    });
    
    setIsVisible(true);
    
    const soundType = trade.status === 'won' ? 'trade-win' : 'trade-loss';
    console.log(`[TradeResultPopup] 🔊 Tocando som: ${soundType}`);
    
    // Tocar o som uma única vez por operação
    playSound(soundType);

    // Fechar automaticamente após 5 segundos
    const timer = setTimeout(() => {
      console.log('[TradeResultPopup] ⏰ Auto-fechando após 5 segundos');
      handleClose();
    }, 5000);

    return () => {
      console.log('[TradeResultPopup] 🧹 Limpando timer');
      clearTimeout(timer);
    };
  }, [trade, playSound]);

  const handleClose = () => {
    console.log('[TradeResultPopup] 🚪 Fechando popup manualmente');
    setIsVisible(false);
    setTimeout(() => {
      console.log('[TradeResultPopup] 🔄 Chamando onClose callback');
      onClose();
    }, 300);
  };

  if (!trade) {
    console.log('[TradeResultPopup] 🚫 Sem trade para renderizar, retornando null');
    return null;
  }

  console.log('[TradeResultPopup] 🎬 Renderizando popup com isVisible:', isVisible);

  const isWin = trade.status === 'won';
  // Mostrar apenas o payout fixo (não calcular porcentagem dinamicamente)
  const displayAmount = isWin ? trade.payout : trade.amount;
  const percentage = ((trade.payout / trade.amount) * 100).toFixed(1);

  const content = (
    <AnimatePresence>
      {isVisible && (
        <>
          {/* Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9998]"
            onClick={handleClose}
          />

          {/* Popup */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 20 }}
            transition={{ type: "spring", duration: 0.5 }}
            className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
          >
            <div
              className={cn(
                "relative overflow-hidden rounded-3xl shadow-2xl border-4 p-8 w-[90vw] max-w-md",
                isWin
                  ? "bg-gradient-to-br from-green-500/20 via-green-600/30 to-green-700/20 border-green-500"
                  : "bg-gradient-to-br from-red-500/20 via-red-600/30 to-red-700/20 border-red-500",
                "backdrop-blur-xl"
              )}
            >
              {/* Close Button */}
              <button
                onClick={handleClose}
                className="absolute top-4 right-4 p-3 rounded-full bg-background/80 hover:bg-background transition-all z-10 shadow-lg hover:scale-110"
                aria-label="Fechar"
              >
                <X className="h-6 w-6 text-foreground" />
              </button>

              {/* Confetti for wins */}
              {isWin && (
                <div className="absolute inset-0 overflow-hidden pointer-events-none">
                  {[...Array(30)].map((_, i) => (
                    <motion.div
                      key={i}
                      initial={{ 
                        y: -20, 
                        x: Math.random() * 100 + '%', 
                        opacity: 1,
                        rotate: 0
                      }}
                      animate={{ 
                        y: '120%',
                        rotate: Math.random() * 720 - 360,
                        opacity: 0 
                      }}
                      transition={{ 
                        duration: 2 + Math.random(), 
                        delay: Math.random() * 0.5,
                        ease: "easeOut"
                      }}
                      className={cn(
                        "absolute w-3 h-3 rounded-full",
                        ['bg-yellow-400', 'bg-green-400', 'bg-blue-400', 'bg-purple-400', 'bg-pink-400'][i % 5]
                      )}
                    />
                  ))}
                </div>
              )}

              {/* Icon */}
              <motion.div
                animate={{ 
                  scale: [1, 1.3, 1],
                  rotate: isWin ? [0, 15, -15, 0] : [0, -5, 5, 0]
                }}
                transition={{ duration: 0.6, repeat: 3 }}
                className={cn(
                  "mx-auto w-24 h-24 rounded-full flex items-center justify-center mb-6 shadow-2xl",
                  isWin ? "bg-green-500" : "bg-red-500"
                )}
              >
                {isWin ? (
                  <Trophy className="w-12 h-12 text-white" />
                ) : (
                  <TrendingDown className="w-12 h-12 text-white" />
                )}
              </motion.div>

              {/* Title */}
              <motion.h2
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className={cn(
                  "text-4xl font-bold text-center mb-4",
                  isWin ? "text-green-400" : "text-red-400"
                )}
              >
                {isWin ? "🎉 VITÓRIA!" : "❌ DERROTA"}
              </motion.h2>

              {/* Result Amount */}
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.3 }}
                className="text-center mb-6"
              >
                <div className={cn(
                  "text-5xl font-black mb-2",
                  isWin ? "text-green-500" : "text-red-500"
                )}>
                  {isWin ? '+' : '-'} R$ {displayAmount.toFixed(2)}
                </div>
                <div className={cn(
                  "text-2xl font-semibold",
                  isWin ? "text-green-400/80" : "text-red-400/80"
                )}>
                  {isWin ? '+' : '-'}{percentage}%
                </div>
              </motion.div>

              {/* Details */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="space-y-2 bg-background/30 rounded-2xl p-4 backdrop-blur-sm"
              >
                {trade.asset_name && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Ativo:</span>
                    <span className="font-semibold text-foreground">{trade.asset_name}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Investimento:</span>
                  <span className="font-semibold text-foreground">R$ {trade.amount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Resultado:</span>
                  <span className={cn(
                    "font-bold",
                    isWin ? "text-green-500" : "text-red-500"
                  )}>
                    {isWin ? 'GANHOU' : 'PERDEU'}
                  </span>
                </div>
              </motion.div>

              {/* Progress Bar */}
              <motion.div
                initial={{ scaleX: 1 }}
                animate={{ scaleX: 0 }}
                transition={{ duration: 5, ease: "linear" }}
                className={cn(
                  "absolute bottom-0 left-0 h-1.5 w-full origin-left",
                  isWin ? "bg-green-500" : "bg-red-500"
                )}
              />
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );

  return createPortal(content, document.body);
}
