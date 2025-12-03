import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Download, Smartphone, Chrome, Apple, Share2, MoreVertical, CheckCircle2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useIsMobile } from "@/hooks/use-mobile";
import { useTranslation } from "@/hooks/useTranslation";

export default function Install() {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const { t } = useTranslation();
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
        title: t("install_on_ios", "Install on iPhone/iPad"),
        steps: [
          { icon: <Safari className="h-5 w-5" />, text: t("install_ios_step1", "Open this site in Safari") },
          { icon: <Share2 className="h-5 w-5" />, text: t("install_ios_step2", "Tap the \"Share\" icon at the bottom") },
          { icon: <Download className="h-5 w-5" />, text: t("install_ios_step3", "Select \"Add to Home Screen\"") },
          { icon: <CheckCircle2 className="h-5 w-5" />, text: t("install_ios_step4", "Tap Add") }
        ]
      };
    } else if (isAndroid) {
      return {
        title: t("install_on_android", "Install on Android"),
        steps: [
          { icon: <Chrome className="h-5 w-5" />, text: t("install_android_step1", "Open this site in Chrome") },
          { icon: <MoreVertical className="h-5 w-5" />, text: t("install_android_step2", "Tap the menu (⋮) at the top") },
          { icon: <Download className="h-5 w-5" />, text: t("install_android_step3", "Select \"Install app\" or \"Add to home screen\"") },
          { icon: <CheckCircle2 className="h-5 w-5" />, text: t("install_android_step4", "Confirm installation") }
        ]
      };
    } else {
      return {
        title: t("install_on_desktop", "Install on Desktop"),
        steps: [
          { icon: <Chrome className="h-5 w-5" />, text: t("install_desktop_step1", "Open this site in Chrome, Edge or another compatible browser") },
          { icon: <Download className="h-5 w-5" />, text: t("install_desktop_step2", "Click the install icon in the address bar") },
          { icon: <CheckCircle2 className="h-5 w-5" />, text: t("install_desktop_step3", "Confirm installation") }
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
            <CardTitle>{t("app_installed", "App Installed!")}</CardTitle>
            <CardDescription>
              {t("app_installed_desc", "The app is now installed on your device.")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => navigate("/")} className="w-full">
              {t("open_app", "Open App")}
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
            <img src="/pwa-512x512.png" alt="Logo" className="w-full h-full rounded-2xl shadow-lg" />
          </div>
          <h1 className="text-3xl font-bold mb-2">{t("install_app_page_title", "Install the App")}</h1>
          <p className="text-muted-foreground">
            {t("install_app_page_desc", "Access faster and trade like a native app")}
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
                {t("install_now", "Install Now")}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Benefits */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>{t("why_install", "Why install?")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Smartphone className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold mb-1">{t("quick_access", "Quick Access")}</h3>
                <p className="text-sm text-muted-foreground">
                  {t("quick_access_desc", "Open directly from home screen, no browser needed")}
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <div className="h-10 w-10 rounded-lg bg-accent/10 flex items-center justify-center flex-shrink-0">
                <CheckCircle2 className="h-5 w-5 text-accent" />
              </div>
              <div>
                <h3 className="font-semibold mb-1">{t("works_offline", "Works Offline")}</h3>
                <p className="text-sm text-muted-foreground">
                  {t("works_offline_desc", "Continue browsing even without internet connection")}
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <div className="h-10 w-10 rounded-lg bg-green-500/10 flex items-center justify-center flex-shrink-0">
                <Download className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <h3 className="font-semibold mb-1">{t("less_space", "Less Space")}</h3>
                <p className="text-sm text-muted-foreground">
                  {t("less_space_desc", "Takes up much less space than a traditional app")}
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
              {t("follow_steps", "Follow the steps below to install the app on your device")}
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
            {t("skip_for_now", "Skip for now")}
          </Button>
        </div>
      </div>
    </div>
  );
}
