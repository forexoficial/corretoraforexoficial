import { Settings, ChevronRight, Check } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useTheme } from "next-themes";

interface SettingsMenuProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const themes = [
  { id: "dark", label: "Default", color: "hsl(0 0% 10%)" },
  { id: "light", label: "Light", color: "hsl(0 0% 100%)" },
];

export const SettingsMenu = ({ open, onOpenChange }: SettingsMenuProps) => {
  const { theme, setTheme } = useTheme();
  
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:w-[400px]">
        <SheetHeader>
          <SheetTitle className="text-left">Configurações</SheetTitle>
        </SheetHeader>
        
        <div className="mt-6 space-y-6">
          {/* Fuso horário */}
          <div className="space-y-2">
            <label className="text-sm font-semibold text-foreground">
              Fuso horário
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
              Tema
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
