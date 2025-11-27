import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Download, Smartphone, Chrome, Apple, Share2, MoreVertical, CheckCircle2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useIsMobile } from "@/hooks/use-mobile";

export default function Install() {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Verificar se já está instalado
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
    }

    // Capturar o evento de instalação
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handler);

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) {
      return;
    }

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === 'accepted') {
      setIsInstalled(true);
    }

    setDeferredPrompt(null);
  };

  const getDeviceInstructions = () => {
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const isAndroid = /Android/.test(navigator.userAgent);

    if (isIOS) {
      return {
        title: "Instalar no iPhone/iPad",
        steps: [
          { icon: <Safari className="h-5 w-5" />, text: "Abra este site no Safari" },
          { icon: <Share2 className="h-5 w-5" />, text: 'Toque no ícone "Compartilhar" na parte inferior' },
          { icon: <Download className="h-5 w-5" />, text: 'Selecione "Adicionar à Tela de Início"' },
          { icon: <CheckCircle2 className="h-5 w-5" />, text: "Toque em Adicionar" }
        ]
      };
    } else if (isAndroid) {
      return {
        title: "Instalar no Android",
        steps: [
          { icon: <Chrome className="h-5 w-5" />, text: "Abra este site no Chrome" },
          { icon: <MoreVertical className="h-5 w-5" />, text: 'Toque no menu (⋮) no canto superior' },
          { icon: <Download className="h-5 w-5" />, text: 'Selecione "Instalar app" ou "Adicionar à tela inicial"' },
          { icon: <CheckCircle2 className="h-5 w-5" />, text: "Confirme a instalação" }
        ]
      };
    } else {
      return {
        title: "Instalar no Desktop",
        steps: [
          { icon: <Chrome className="h-5 w-5" />, text: "Abra este site no Chrome, Edge ou outro navegador compatível" },
          { icon: <Download className="h-5 w-5" />, text: 'Clique no ícone de instalação na barra de endereço' },
          { icon: <CheckCircle2 className="h-5 w-5" />, text: "Confirme a instalação" }
        ]
      };
    }
  };

  const instructions = getDeviceInstructions();

  const Safari = ({ className }: { className?: string }) => (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm0 18c-4.411 0-8-3.589-8-8s3.589-8 8-8 8 3.589 8 8-3.589 8-8 8zm-1-13h2v6h-2zm0 8h2v2h-2z"/>
    </svg>
  );

  if (isInstalled) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 h-20 w-20 rounded-full bg-green-500/20 flex items-center justify-center">
              <CheckCircle2 className="h-10 w-10 text-green-500" />
            </div>
            <CardTitle>App Instalado!</CardTitle>
            <CardDescription>
              O BlackRock Broker já está instalado no seu dispositivo.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => navigate("/")} className="w-full">
              Abrir App
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 pb-20">
      <div className="container max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8 pt-8">
          <div className="mx-auto mb-4 h-24 w-24">
            <img src="/pwa-512x512.png" alt="BlackRock Logo" className="w-full h-full rounded-2xl shadow-lg" />
          </div>
          <h1 className="text-3xl font-bold mb-2">Instale o BlackRock Broker</h1>
          <p className="text-muted-foreground">
            Acesse mais rápido e opere como um app nativo
          </p>
        </div>

        {/* Install Button for PWA */}
        {deferredPrompt && (
          <Card className="mb-6">
            <CardContent className="pt-6">
              <Button 
                onClick={handleInstallClick}
                className="w-full h-14 text-lg gap-2"
                size="lg"
              >
                <Download className="h-5 w-5" />
                Instalar Agora
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Benefits */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Por que instalar?</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Smartphone className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold mb-1">Acesso Rápido</h3>
                <p className="text-sm text-muted-foreground">
                  Abra diretamente da tela inicial, sem precisar do navegador
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <div className="h-10 w-10 rounded-lg bg-accent/10 flex items-center justify-center flex-shrink-0">
                <CheckCircle2 className="h-5 w-5 text-accent" />
              </div>
              <div>
                <h3 className="font-semibold mb-1">Funciona Offline</h3>
                <p className="text-sm text-muted-foreground">
                  Continue navegando mesmo sem conexão com a internet
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <div className="h-10 w-10 rounded-lg bg-green-500/10 flex items-center justify-center flex-shrink-0">
                <Download className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <h3 className="font-semibold mb-1">Menos Espaço</h3>
                <p className="text-sm text-muted-foreground">
                  Ocupa muito menos espaço que um app tradicional
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Instructions */}
        <Card>
          <CardHeader>
            <CardTitle>{instructions.title}</CardTitle>
            <CardDescription>
              Siga os passos abaixo para instalar o app no seu dispositivo
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {instructions.steps.map((step, index) => (
                <div key={index} className="flex gap-3 items-start">
                  <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 text-primary font-semibold">
                    {index + 1}
                  </div>
                  <div className="flex-1 pt-1">
                    <div className="flex items-center gap-2 mb-1">
                      {step.icon}
                      <p className="font-medium">{step.text}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Skip button */}
        <div className="text-center mt-6">
          <Button variant="ghost" onClick={() => navigate("/")}>
            Pular por agora
          </Button>
        </div>
      </div>
    </div>
  );
}
