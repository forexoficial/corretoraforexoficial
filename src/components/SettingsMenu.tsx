import { Settings, ChevronRight, Check } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useTheme } from "next-themes";
import { useTranslation } from "@/hooks/useTranslation";
import { useLanguageContext } from "@/contexts/LanguageContext";
import flagEN from "@/assets/flag-en.webp";
import flagBR from "@/assets/flag-br.webp";
import flagES from "@/assets/flag-es.webp";

interface SettingsMenuProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const languages = [
  { code: "en", name: "English", flag: flagEN },
  { code: "pt", name: "Português", flag: flagBR },
  { code: "es", name: "Español", flag: flagES },
];

export const SettingsMenu = ({ open, onOpenChange }: SettingsMenuProps) => {
  const { theme, setTheme } = useTheme();
  const { t } = useTranslation();
  const { language, setLanguage } = useLanguageContext();

  const themes = [
    { id: "dark", label: t("default_theme"), color: "hsl(0 0% 10%)" },
    { id: "light", label: t("light_theme"), color: "hsl(0 0% 100%)" },
  ];
  
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:w-[400px] mobile-header-safe-offset">
        <SheetHeader>
          <SheetTitle className="text-left">{t("settings_menu_title")}</SheetTitle>
        </SheetHeader>
        
        <div className="mt-6 space-y-6">
          {/* Idioma */}
          <div className="space-y-2">
            <label className="text-sm font-semibold text-foreground">
              {t("language", "Language")}
            </label>
            <div className="space-y-2">
              {languages.map((lang) => {
                const isActive = language === lang.code;
                
                return (
                  <button
                    key={lang.code}
                    className={`w-full flex items-center justify-between p-3 rounded-lg transition-colors ${
                      isActive ? 'bg-primary/10 border-primary/20' : 'hover:bg-muted'
                    }`}
                    onClick={() => setLanguage(lang.code as 'pt' | 'en' | 'es')}
                  >
                    <div className="flex items-center gap-3">
                      <img
                        src={lang.flag}
                        alt={lang.name}
                        className="w-6 h-6 rounded-full object-cover"
                      />
                      <span className={`text-sm font-medium ${isActive ? 'text-primary' : ''}`}>
                        {lang.name}
                      </span>
                    </div>
                    {isActive ? (
                      <Check className="w-5 h-5 text-primary" />
                    ) : (
                      <ChevronRight className="w-5 h-5 text-muted-foreground" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Fuso horário */}
          <div className="space-y-2">
            <label className="text-sm font-semibold text-foreground">
              {t("timezone")}
            </label>
            <Select value="utc-3" disabled>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="(UTC-3) São Paulo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="utc-3">(UTC-3) São Paulo</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Tema */}
          <div className="space-y-2">
            <label className="text-sm font-semibold text-foreground">
              {t("theme")}
            </label>
            <div className="space-y-2">
              {themes.map((themeOption) => {
                const isActive = theme === themeOption.id;
                const activeColor = themeOption.id === 'light' ? 'text-foreground' : 'text-primary';
                const activeBg = themeOption.id === 'light' ? 'bg-foreground/10 border-foreground/20' : 'bg-primary/10 border-primary/20';
                
                return (
                  <button
                    key={themeOption.id}
                    className={`w-full flex items-center justify-between p-3 rounded-lg transition-colors ${
                      isActive ? activeBg : 'hover:bg-muted'
                    }`}
                    onClick={() => {
                      setTheme(themeOption.id);
                    }}
                  >
                    <div className="flex items-center gap-3">
                      <div 
                        className="w-6 h-6 rounded-full border-2 border-border"
                        style={{ backgroundColor: themeOption.color }}
                      />
                      <span className={`text-sm font-medium ${isActive ? activeColor : ''}`}>
                        {themeOption.label}
                      </span>
                    </div>
                    {isActive ? (
                      <Check className={`w-5 h-5 ${activeColor}`} />
                    ) : (
                      <ChevronRight className="w-5 h-5 text-muted-foreground" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};
