import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "@/hooks/useTranslation";
import { usePlatformCustomization } from "@/contexts/PlatformCustomizationContext";
import { Loader2, TrendingUp, Zap, Shield, CheckCircle2 } from "lucide-react";

const loadingSteps = [
  { key: "assets", icon: TrendingUp, labelKey: "loading_assets", duration: 800 },
  { key: "charts", icon: Zap, labelKey: "loading_charts", duration: 600 },
  { key: "security", icon: Shield, labelKey: "loading_security", duration: 500 },
  { key: "ready", icon: CheckCircle2, labelKey: "platform_ready", duration: 400 },
];

export default function Preloader() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { customization } = usePlatformCustomization();
  const [currentStep, setCurrentStep] = useState(0);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    // Simular carregamento progressivo
    const totalDuration = loadingSteps.reduce((acc, step) => acc + step.duration, 0);
    let elapsed = 0;

    const interval = setInterval(() => {
      elapsed += 50;
      const newProgress = Math.min((elapsed / totalDuration) * 100, 100);
      setProgress(newProgress);

      // Atualizar step baseado no progresso
      let cumulativeDuration = 0;
      for (let i = 0; i < loadingSteps.length; i++) {
        cumulativeDuration += loadingSteps[i].duration;
        if (elapsed < cumulativeDuration) {
          setCurrentStep(i);
          break;
        }
      }

      if (elapsed >= totalDuration) {
        clearInterval(interval);
        // Pequeno delay antes de redirecionar para suavizar transição
        setTimeout(() => {
          navigate("/", { replace: true });
        }, 300);
      }
    }, 50);

    // Preload de recursos em background
    preloadResources();

    return () => clearInterval(interval);
  }, [navigate]);

  const preloadResources = async () => {
    // Preload de imagens e recursos críticos
    const imagesToPreload = [
      customization.logoLight,
      customization.logoDark,
    ].filter(Boolean);

    await Promise.all(
      imagesToPreload.map((src) => {
        return new Promise((resolve, reject) => {
          const img = new Image();
          img.onload = resolve;
          img.onerror = resolve; // Não bloquear se falhar
          img.src = src!;
        });
      })
    );
  };

  const CurrentStepIcon = loadingSteps[currentStep]?.icon || Loader2;

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-gradient-to-br from-background via-background to-primary/5 relative overflow-hidden">
      {/* Background animated elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl"
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.3, 0.5, 0.3],
          }}
          transition={{
            duration: 4,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
        <motion.div
          className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-accent/10 rounded-full blur-3xl"
          animate={{
            scale: [1.2, 1, 1.2],
            opacity: [0.5, 0.3, 0.5],
          }}
          transition={{
            duration: 4,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 2,
          }}
        />
      </div>

      {/* Main content */}
      <div className="relative z-10 flex flex-col items-center gap-8 px-4">
        {/* Logo */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-4"
        >
          {customization.logoDark && (
            <img
              src={customization.logoDark}
              alt="Logo"
              className="h-16 object-contain dark:block hidden"
            />
          )}
          {customization.logoLight && (
            <img
              src={customization.logoLight}
              alt="Logo"
              className="h-16 object-contain dark:hidden"
            />
          )}
        </motion.div>

        {/* Animated icon */}
        <motion.div
          key={currentStep}
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.5, opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="relative"
        >
          <motion.div
            className="w-24 h-24 rounded-full bg-primary/20 flex items-center justify-center"
            animate={{
              boxShadow: [
                "0 0 0 0 rgba(var(--primary), 0.4)",
                "0 0 0 20px rgba(var(--primary), 0)",
                "0 0 0 0 rgba(var(--primary), 0)",
              ],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          >
            <CurrentStepIcon className="w-12 h-12 text-primary" />
          </motion.div>
        </motion.div>

        {/* Loading text */}
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
            className="text-center"
          >
            <h2 className="text-2xl font-bold text-foreground mb-2">
              {t(loadingSteps[currentStep]?.labelKey, loadingSteps[currentStep]?.labelKey)}
            </h2>
            <p className="text-sm text-muted-foreground">
              {t("please_wait", "Aguarde um momento...")}
            </p>
          </motion.div>
        </AnimatePresence>

        {/* Progress bar */}
        <div className="w-80 max-w-full">
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-primary to-accent"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.3, ease: "easeOut" }}
            />
          </div>
          <motion.p
            className="text-xs text-center text-muted-foreground mt-2"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            {Math.round(progress)}%
          </motion.p>
        </div>

        {/* Loading dots */}
        <div className="flex gap-2">
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              className="w-2 h-2 rounded-full bg-primary"
              animate={{
                scale: [1, 1.5, 1],
                opacity: [0.3, 1, 0.3],
              }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                delay: i * 0.2,
                ease: "easeInOut",
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
