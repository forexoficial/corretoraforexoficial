import { useTranslation } from "@/hooks/useTranslation";
import { useState, useEffect } from "react";
import { Volume2, VolumeX, Settings, Maximize2, Minimize2, HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SupportDialog } from "@/components/SupportDialog";
import { Mail, Clock } from "lucide-react";
import { toast } from "sonner";
import { usePlatformSettings } from "@/hooks/usePlatformSettings";

export const TradingFooter = () => {
  const { t } = useTranslation();
  const { settings } = usePlatformSettings();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [showSupportDialog, setShowSupportDialog] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const toggleMute = () => {
    setIsMuted(!isMuted);
    toast.success(isMuted ? t("sound_enabled", "Som ativado") : t("sound_disabled", "Som desativado"));
  };

  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch (err) {
      toast.error(t('fullscreen_error'));
    }
  };

  const openSettings = () => {
    toast.info(t('settings_development'));
  };

  const formatDateTime = (date: Date) => {
    const months = [
      t('january'), t('february'), t('march'), t('april'), t('may'), t('june'),
      t('july'), t('august'), t('september'), t('october'), t('november'), t('december')
    ];
    
    const day = date.getDate();
    const month = months[date.getMonth()];
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    
    return `${day} ${month}, ${hours}:${minutes}:${seconds} (UTC-3)`;
  };

  return (
    <>
      <footer className="fixed bottom-0 left-0 right-0 bg-card border-t border-border h-8 flex items-center justify-between px-4 z-50">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="sm"
            className="h-6 gap-2 text-xs text-foreground border-foreground hover:bg-accent hover:text-accent-foreground"
            onClick={() => setShowSupportDialog(true)}
          >
            <HelpCircle className="h-3 w-3" />
            {t("support", "SUPORTE")}
          </Button>
          
          <a 
            href={`mailto:${settings.support_email}`}
            className="hidden md:flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <Mail className="h-3 w-3" />
            <span>{settings.support_email}</span>
          </a>
          
          <div className="hidden lg:block text-xs text-muted-foreground">
            {t('everyday_allday')}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-6 w-6 p-0"
            onClick={toggleMute}
            title={isMuted ? t('enable_sound') : t('disable_sound')}
          >
            {isMuted ? <VolumeX className="h-3 w-3" /> : <Volume2 className="h-3 w-3" />}
          </Button>
          
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-6 w-6 p-0"
            onClick={openSettings}
            title={t('settings_label')}
          >
            <Settings className="h-3 w-3" />
          </Button>
          
          <div className="hidden md:flex items-center gap-2 text-xs text-muted-foreground">
            <Clock className="h-3 w-3" />
            <span className="font-mono">{t("current_time", "HORA ATUAL")}: {formatDateTime(currentTime)}</span>
          </div>
          
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-6 w-6 p-0"
            onClick={toggleFullscreen}
            title={isFullscreen ? t('exit_fullscreen_label') : t('fullscreen_label')}
          >
            {isFullscreen ? <Minimize2 className="h-3 w-3" /> : <Maximize2 className="h-3 w-3" />}
          </Button>
        </div>
      </footer>

      <SupportDialog open={showSupportDialog} onOpenChange={setShowSupportDialog} />
    </>
  );
};
