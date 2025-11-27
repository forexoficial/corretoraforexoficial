import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface PlatformSettings {
  platform_name: string;
  support_email: string;
  support_phone: string;
  min_deposit: number;
  min_withdrawal: number;
  max_withdrawal: number;
  min_trade: number;
  withdrawal_fee: number;
  deposit_fee: number;
  default_payout: number;
  require_verification: boolean;
  allow_registration: boolean;
  maintenance_mode: boolean;
  usdt_enabled: boolean;
}

const DEFAULT_SETTINGS: PlatformSettings = {
  platform_name: "Trading Platform",
  support_email: "suporte@plataforma.com",
  support_phone: "+55 11 99999-9999",
  min_deposit: 10,
  min_withdrawal: 60,
  max_withdrawal: 10000,
  min_trade: 5,
  withdrawal_fee: 0,
  deposit_fee: 0,
  default_payout: 91,
  require_verification: true,
  allow_registration: true,
  maintenance_mode: false,
  usdt_enabled: false,
};

export function usePlatformSettings() {
  const [settings, setSettings] = useState<PlatformSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase
        .from("platform_settings")
        .select("key, value");

      if (error) throw error;

      const settingsMap = (data || []).reduce((acc, { key, value }) => {
        acc[key] = value;
        return acc;
      }, {} as Record<string, string>);

      setSettings({
        platform_name: settingsMap.platform_name || DEFAULT_SETTINGS.platform_name,
        support_email: settingsMap.support_email || DEFAULT_SETTINGS.support_email,
        support_phone: settingsMap.support_phone || DEFAULT_SETTINGS.support_phone,
        min_deposit: parseFloat(settingsMap.min_deposit || String(DEFAULT_SETTINGS.min_deposit)),
        min_withdrawal: parseFloat(settingsMap.min_withdrawal || String(DEFAULT_SETTINGS.min_withdrawal)),
        max_withdrawal: parseFloat(settingsMap.max_withdrawal || String(DEFAULT_SETTINGS.max_withdrawal)),
        min_trade: parseFloat(settingsMap.min_trade || String(DEFAULT_SETTINGS.min_trade)),
        withdrawal_fee: parseFloat(settingsMap.withdrawal_fee || String(DEFAULT_SETTINGS.withdrawal_fee)),
        deposit_fee: parseFloat(settingsMap.deposit_fee || String(DEFAULT_SETTINGS.deposit_fee)),
        default_payout: parseFloat(settingsMap.default_payout || String(DEFAULT_SETTINGS.default_payout)),
        require_verification: settingsMap.require_verification === "true",
        allow_registration: settingsMap.allow_registration === "true",
        maintenance_mode: settingsMap.maintenance_mode === "true",
        usdt_enabled: settingsMap.usdt_enabled === "true",
      });
    } catch (error) {
      console.error("Error fetching platform settings:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();

    // Subscribe to realtime changes in platform_settings
    const channel = supabase
      .channel('platform_settings_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'platform_settings'
        },
        () => {
          fetchSettings();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return { settings, loading, refetch: fetchSettings };
}
