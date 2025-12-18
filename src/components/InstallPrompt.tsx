import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Download, X, Share } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { useTranslation } from "@/hooks/useTranslation";
import { useAuth } from "@/contexts/AuthContext";

// Declare wistia-player custom element for TypeScript
declare global {
  namespace JSX {
    interface IntrinsicElements {
      'wistia-player': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement> & {
        'media-id'?: string;
        aspect?: string;
      }, HTMLElement>;
    }
  }
}

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
  const [showIOSDialog, setShowIOSDialog] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isIOSDevice, setIsIOSDevice] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();
  const { user } = useAuth();

  // Don't show on auth/signup pages or when not logged in
  const isAuthPage = location.pathname === '/auth' || location.pathname === '/signup';
  const shouldShowPrompt = showPrompt && user && !isAuthPage;

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

  // Load Wistia scripts when iOS dialog opens
  useEffect(() => {
    if (showIOSDialog) {
      // Load Wistia player script
      const playerScript = document.createElement('script');
      playerScript.src = 'https://fast.wistia.com/player.js';
      playerScript.async = true;
      document.body.appendChild(playerScript);

      // Load Wistia embed script
      const embedScript = document.createElement('script');
      embedScript.src = 'https://fast.wistia.com/embed/flc394s418.js';
      embedScript.async = true;
      embedScript.type = 'module';
      document.body.appendChild(embedScript);

      return () => {
        // Cleanup scripts when dialog closes
        document.body.removeChild(playerScript);
        document.body.removeChild(embedScript);
      };
    }
  }, [showIOSDialog]);

  const handleInstall = async () => {
    if (isIOSDevice) {
      // For iOS, show the dialog with video instructions
      setShowPrompt(false);
      setShowIOSDialog(true);
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

  return (
    <>
      {shouldShowPrompt && (
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
      )}

      {/* iOS Installation Instructions Dialog */}
      <Dialog open={showIOSDialog} onOpenChange={setShowIOSDialog}>
        <DialogContent className="max-w-[280px] mx-auto max-h-[85vh] overflow-y-auto p-4">
          <DialogHeader className="pb-1">
            <DialogTitle className="text-center text-sm">
              {t("ios_install_title", "Como instalar no iPhone")}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground text-center">
              {t("ios_install_desc", "Siga o vídeo abaixo para instalar o app no seu iPhone")}
            </p>
            
            {/* Wistia Video Player */}
            <div className="w-full rounded-md overflow-hidden bg-muted">
              <style>
                {`
                  wistia-player[media-id='flc394s418']:not(:defined) { 
                    background: center / contain no-repeat url('https://fast.wistia.com/embed/medias/flc394s418/swatch'); 
                    display: block; 
                    filter: blur(5px); 
                    padding-top: 216.11%; 
                  }
                `}
              </style>
              <wistia-player media-id="flc394s418" aspect="0.46272493573264784"></wistia-player>
            </div>

            <div className="space-y-1 text-xs">
              <p className="font-medium">{t("ios_steps_title", "Passos:")}</p>
              <ol className="list-decimal list-inside space-y-0.5 text-muted-foreground">
                <li>{t("ios_step_1", "Toque no ícone de Compartilhar")}</li>
                <li>{t("ios_step_2", "Role e toque em 'Adicionar à Tela de Início'")}</li>
                <li>{t("ios_step_3", "Toque em 'Adicionar' no canto superior direito")}</li>
              </ol>
            </div>

            <Button 
              onClick={() => setShowIOSDialog(false)} 
              className="w-full h-8 text-xs"
              size="sm"
            >
              {t("understood", "Entendi")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}