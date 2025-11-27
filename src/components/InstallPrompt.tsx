import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Download, X } from "lucide-react";
import { useNavigate } from "react-router-dom";

export function InstallPrompt() {
  const [showPrompt, setShowPrompt] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const navigate = useNavigate();

  useEffect(() => {
    // Verificar se já foi instalado
    if (window.matchMedia('(display-mode: standalone)').matches) {
      return;
    }

    // Verificar se o usuário já dispensou o prompt
    const dismissed = localStorage.getItem('install_prompt_dismissed');
    if (dismissed) {
      return;
    }

    // Capturar o evento de instalação
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      
      // Mostrar o prompt após 3 segundos
      setTimeout(() => {
        setShowPrompt(true);
      }, 3000);
    };

    window.addEventListener('beforeinstallprompt', handler);

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) {
      // Se não tiver o prompt automático, redirecionar para página de instalação
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
              <Download className="h-6 w-6 text-primary" />
            </div>
            
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold mb-1">Instale o App</h3>
              <p className="text-sm text-muted-foreground mb-3">
                Acesse mais rápido e opere offline!
              </p>
              
              <div className="flex gap-2">
                <Button 
                  onClick={handleInstall}
                  size="sm"
                  className="flex-1"
                >
                  Instalar
                </Button>
                <Button 
                  onClick={handleLearnMore}
                  variant="outline"
                  size="sm"
                  className="flex-1"
                >
                  Saiba mais
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
