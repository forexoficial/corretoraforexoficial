import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useTheme } from "next-themes";

interface PlatformCustomization {
  logoLight: string | null;  // Logo escura para tema claro
  logoDark: string | null;   // Logo clara para tema escuro
  currentLogo: string | null; // Logo atual baseado no tema
  logoHeight: number; // Altura da logo em pixels
}

interface PlatformCustomizationContextType {
  customization: PlatformCustomization;
  loading: boolean;
  refreshCustomization: () => Promise<void>;
}

const PlatformCustomizationContext = createContext<PlatformCustomizationContextType | undefined>(undefined);

export function PlatformCustomizationProvider({ children }: { children: ReactNode }) {
  const { theme, systemTheme } = useTheme();
  const [customization, setCustomization] = useState<PlatformCustomization>({
    logoLight: null,
    logoDark: null,
    currentLogo: null,
    logoHeight: 48,
  });
  const [loading, setLoading] = useState(true);

  const getCurrentTheme = () => {
    if (theme === "system") {
      return systemTheme || "dark";
    }
    return theme || "dark";
  };

  const fetchCustomization = async () => {
    try {
      const { data, error } = await supabase
        .from("platform_settings")
        .select("key, value")
        .in("key", [
          "logo_light", "logo_dark", "logo_height",
          "light_background", "light_foreground", "light_card", "light_primary", 
          "light_secondary", "light_accent", "light_muted", "light_border",
          "dark_background", "dark_foreground", "dark_card", "dark_primary",
          "dark_secondary", "dark_accent", "dark_muted", "dark_border",
          "success_color"
        ]);

      if (error) throw error;

      const settings = (data || []).reduce((acc, { key, value }) => {
        acc[key] = value;
        return acc;
      }, {} as Record<string, string>);

      const currentTheme = getCurrentTheme();
      const currentLogo = currentTheme === "light" 
        ? (settings.logo_light || settings.logo_dark) 
        : (settings.logo_dark || settings.logo_light);

      setCustomization({
        logoLight: settings.logo_light || null,
        logoDark: settings.logo_dark || null,
        currentLogo: currentLogo || null,
        logoHeight: parseInt(settings.logo_height || "48"),
      });

      // Save colors to localStorage for immediate application on next load
      localStorage.setItem('platform_colors', JSON.stringify(settings));
      
      // Apply theme-specific colors
      applyThemeColors(currentTheme, settings);
    } catch (error) {
      console.error("Error fetching customization:", error);
    } finally {
      setLoading(false);
    }
  };

  // Helper function to convert hex to HSL
  const hexToHSL = (hex: string): string => {
    // Remove # if present
    hex = hex.replace(/^#/, '');
    
    // Convert hex to RGB
    const r = parseInt(hex.substring(0, 2), 16) / 255;
    const g = parseInt(hex.substring(2, 4), 16) / 255;
    const b = parseInt(hex.substring(4, 6), 16) / 255;
    
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h = 0, s = 0, l = (max + min) / 2;
    
    if (max !== min) {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      
      switch (max) {
        case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
        case g: h = ((b - r) / d + 2) / 6; break;
        case b: h = ((r - g) / d + 4) / 6; break;
      }
    }
    
    h = Math.round(h * 360);
    s = Math.round(s * 100);
    l = Math.round(l * 100);
    
    return `${h} ${s}% ${l}%`;
  };

  const applyThemeColors = (currentTheme: string, settings: Record<string, string>) => {
    const prefix = currentTheme === "light" ? "light" : "dark";
    
    const colorMap = {
      [`${prefix}_background`]: "--background",
      [`${prefix}_foreground`]: "--foreground",
      [`${prefix}_card`]: "--card",
      [`${prefix}_primary`]: "--primary",
      [`${prefix}_secondary`]: "--secondary",
      [`${prefix}_accent`]: "--accent",
      [`${prefix}_muted`]: "--muted",
      [`${prefix}_border`]: "--border",
    };

    Object.entries(colorMap).forEach(([key, cssVar]) => {
      if (settings[key]) {
        document.documentElement.style.setProperty(cssVar, settings[key]);
        
        // Update derived colors
        if (cssVar === "--primary") {
          document.documentElement.style.setProperty("--ring", settings[key]);
          document.documentElement.style.setProperty("--sidebar-primary", settings[key]);
          document.documentElement.style.setProperty("--sidebar-ring", settings[key]);
        }
        if (cssVar === "--background") {
          // Apply background color to chart and panel areas
          document.documentElement.style.setProperty("--chart-bg", settings[key]);
          document.documentElement.style.setProperty("--panel-bg", settings[key]);
          document.documentElement.style.setProperty("--sidebar-background", settings[key]);
        }
        if (cssVar === "--card") {
          document.documentElement.style.setProperty("--card-foreground", settings[`${prefix}_foreground`] || settings[key]);
          document.documentElement.style.setProperty("--popover", settings[key]);
        }
        if (cssVar === "--foreground") {
          document.documentElement.style.setProperty("--sidebar-foreground", settings[key]);
        }
        if (cssVar === "--muted") {
          document.documentElement.style.setProperty("--muted-foreground", settings[`${prefix}_foreground`] || "");
        }
        if (cssVar === "--accent") {
          document.documentElement.style.setProperty("--accent-foreground", settings[`${prefix}_foreground`] || "");
          document.documentElement.style.setProperty("--sidebar-accent", settings[key]);
          document.documentElement.style.setProperty("--sidebar-accent-foreground", settings[`${prefix}_foreground`] || "");
        }
        if (cssVar === "--secondary") {
          document.documentElement.style.setProperty("--secondary-foreground", settings[`${prefix}_foreground`] || "");
        }
        if (cssVar === "--border") {
          document.documentElement.style.setProperty("--input", settings[key]);
          document.documentElement.style.setProperty("--sidebar-border", settings[key]);
        }
      }
    });

    // Apply success color from platform settings
    if (settings.success_color) {
      const successHSL = hexToHSL(settings.success_color);
      document.documentElement.style.setProperty("--success", successHSL);
      document.documentElement.style.setProperty("--success-foreground", "0 0% 100%");
    }
  };

  useEffect(() => {
    fetchCustomization();

    // Subscribe to realtime changes
    const channel = supabase
      .channel('platform_customization_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'platform_settings',
        },
        () => {
          fetchCustomization();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Update logo when theme changes
  useEffect(() => {
    const currentTheme = getCurrentTheme();
    const newLogo = currentTheme === "light" 
      ? (customization.logoLight || customization.logoDark)
      : (customization.logoDark || customization.logoLight);
    
    setCustomization(prev => ({
      ...prev,
      currentLogo: newLogo || null
    }));

    // Reapply colors when theme changes
    fetchCustomization();
  }, [theme, systemTheme]);

  const refreshCustomization = async () => {
    await fetchCustomization();
  };

  return (
    <PlatformCustomizationContext.Provider value={{ customization, loading, refreshCustomization }}>
      {children}
    </PlatformCustomizationContext.Provider>
  );
}

export function usePlatformCustomization() {
  const context = useContext(PlatformCustomizationContext);
  if (context === undefined) {
    throw new Error("usePlatformCustomization must be used within PlatformCustomizationProvider");
  }
  return context;
}
