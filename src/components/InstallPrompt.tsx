import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Download, X, Share } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "@/hooks/useTranslation";

// Detect iOS Safari
const isIOS = () => {
  const userAgent = window.navigator.userAgent.toLowerCase();
  return /iphone|ipad|ipod/.test(userAgent);
};

const isInStandaloneMode = () => {
  return window.matchMedia('(display-mode: standalone)').matches || 
         (window.navigator as any).standalone === true;
};

const isSafari = () => {
  const userAgent = window.navigator.userAgent.toLowerCase();
  return /safari/.test(userAgent) && !/chrome/.test(userAgent) && !/crios/.test(userAgent);
};

export function InstallPrompt() {
  const [showPrompt, setShowPrompt] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isIOSDevice, setIsIOSDevice] = useState(false);
  const navigate = useNavigate();
  const { t } = useTranslation();

  useEffect(() => {
    // Already installed as PWA
    if (isInStandaloneMode()) {
      return;
    }

    // Check if dismissed
    const dismissed = localStorage.getItem('install_prompt_dismissed');
    if (dismissed) {
      return;
    }

    // Check if iOS Safari
    if (isIOS() && isSafari()) {
      setIsIOSDevice(true);
      // Show prompt after 3 seconds for iOS
      setTimeout(() => {
        setShowPrompt(true);
      }, 3000);
      return;
    }

    // For non-iOS browsers, use beforeinstallprompt
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      
      setTimeout(() => {
        setShowPrompt(true);
      }, 3000);
    };

    window.addEventListener('beforeinstallprompt', handler);

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (isIOSDevice) {
      // For iOS, navigate to install page with instructions
      navigate('/install');
      setShowPrompt(false);
      return;
    }

    if (!deferredPrompt) {
      navigate('/install');
      return;
    }

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === 'accepted') {
      setShowPrompt(false);
    }

    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    localStorage.setItem('install_prompt_dismissed', 'true');
  };

  const handleLearnMore = () => {
    setShowPrompt(false);
    navigate('/install');
  };

  if (!showPrompt) {
    return null;
  }

  return (
    <div className="fixed bottom-20 left-4 right-4 z-50 md:left-auto md:right-4 md:max-w-sm">
      <Card className="bg-card/95 backdrop-blur-lg border-2 border-primary/20 shadow-2xl">
        <CardContent className="p-4">
          <div className="flex gap-3">
            <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
              {isIOSDevice ? (
                <Share className="h-6 w-6 text-primary" />
              ) : (
                <Download className="h-6 w-6 text-primary" />
              )}
            </div>
            
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold mb-1">{t("install_app_title", "Install the App")}</h3>
              <p className="text-sm text-muted-foreground mb-3">
                {isIOSDevice 
                  ? t("install_ios_desc", "Tap Share then 'Add to Home Screen'")
                  : t("install_app_desc", "Access faster and trade offline!")
                }
              </p>
              
              <div className="flex gap-2">
                <Button 
                  onClick={handleInstall}
                  size="sm"
                  className="flex-1"
                >
                  {isIOSDevice ? t("see_how", "See how") : t("install", "Install")}
                </Button>
                <Button 
                  onClick={handleLearnMore}
                  variant="outline"
                  size="sm"
                  className="flex-1"
                >
                  {t("learn_more", "Learn more")}
                </Button>
              </div>
            </div>

            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 flex-shrink-0"
              onClick={handleDismiss}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}