import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CheckCircle2, Sparkles, TrendingUp } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import confetti from "canvas-confetti";
import { useEffect } from "react";

interface PaymentSuccessProps {
  amount: number;
  newBalance: number;
  transactionId: string;
}

export default function PaymentSuccess({ 
  amount, 
  newBalance,
  transactionId 
}: PaymentSuccessProps) {
  const navigate = useNavigate();

  useEffect(() => {
    // Trigger confetti animation
    const duration = 3000;
    const animationEnd = Date.now() + duration;
    const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 999 };

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
      
      confetti({
        ...defaults,
        particleCount,
        origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 }
      });
      confetti({
        ...defaults,
        particleCount,
        origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 }
      });
    }, 250);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="w-full max-w-3xl mx-auto px-3 sm:px-4 py-6">
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.5, type: "spring" }}
      >
        <Card className="overflow-hidden border-2 border-success/20 shadow-2xl">
          {/* Success Header with Gradient */}
          <div className="bg-gradient-to-br from-success/20 via-success/10 to-background p-6 sm:p-8 lg:p-12 text-center relative overflow-hidden">
            {/* Background Effects */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_120%,rgba(34,197,94,0.1),transparent)]" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,rgba(34,197,94,0.05),transparent)]" />
            
            <div className="relative z-10">
              {/* Success Icon with Animation */}
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                className="inline-flex items-center justify-center w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-success/20 border-4 border-success/30 mb-4 sm:mb-6"
              >
                <CheckCircle2 className="w-10 h-10 sm:w-12 sm:h-12 text-success" />
              </motion.div>

              {/* Success Title */}
              <motion.h2
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-2 sm:mb-3"
              >
                Pagamento Confirmado!
              </motion.h2>

              <motion.p
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="text-sm sm:text-base text-muted-foreground mb-6 sm:mb-8"
              >
                Seu depósito foi processado com sucesso ✨
              </motion.p>

              {/* Amount Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 max-w-2xl mx-auto">
                <motion.div
                  initial={{ x: -50, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: 0.5 }}
                  className="bg-card/80 backdrop-blur-sm rounded-xl p-4 sm:p-6 border border-success/20"
                >
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-success" />
                    <div className="text-xs sm:text-sm text-muted-foreground">Valor Depositado</div>
                  </div>
                  <div className="text-2xl sm:text-3xl lg:text-4xl font-bold text-success">
                    R$ {amount.toFixed(2)}
                  </div>
                </motion.div>

                <motion.div
                  initial={{ x: 50, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: 0.6 }}
                  className="bg-card/80 backdrop-blur-sm rounded-xl p-4 sm:p-6 border border-primary/20"
                >
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
                    <div className="text-xs sm:text-sm text-muted-foreground">Novo Saldo</div>
                  </div>
                  <div className="text-2xl sm:text-3xl lg:text-4xl font-bold text-primary">
                    R$ {newBalance.toFixed(2)}
                  </div>
                </motion.div>
              </div>
            </div>
          </div>

          {/* Transaction Details */}
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.7 }}
            className="p-6 sm:p-8 space-y-4 sm:space-y-6"
          >
            {/* Transaction ID */}
            <div className="bg-muted/30 rounded-lg p-4 text-center">
              <div className="text-xs sm:text-sm text-muted-foreground mb-1">ID da Transação</div>
              <div className="text-xs sm:text-sm font-mono text-foreground break-all">
                {transactionId}
              </div>
            </div>

            {/* Info Box */}
            <div className="bg-primary/10 dark:bg-primary/20 rounded-lg p-4 border border-primary/20 dark:border-primary/30">
              <p className="text-xs sm:text-sm text-center">
                Seu saldo foi atualizado automaticamente e já está disponível para negociar! 🚀
              </p>
            </div>

            {/* Action Buttons */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Button
                onClick={() => navigate('/transactions')}
                variant="outline"
                className="w-full h-11 sm:h-12"
              >
                Ver Transações
              </Button>
              
              <Button
                onClick={() => navigate('/')}
                className="w-full h-11 sm:h-12 bg-success hover:bg-success/90"
              >
                <TrendingUp className="w-4 h-4 mr-2" />
                Começar a Negociar
              </Button>
            </div>
          </motion.div>
        </Card>
      </motion.div>
    </div>
  );
}