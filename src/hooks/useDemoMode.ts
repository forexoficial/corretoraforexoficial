import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useTranslation } from "@/hooks/useTranslation";

export const useDemoMode = () => {
  const { t } = useTranslation();
  const [isDemoMode, setIsDemoMode] = useState(true);
  const [demoBalance, setDemoBalance] = useState(10000);
  const [realBalance, setRealBalance] = useState(0);
  const [loading, setLoading] = useState(true);
  const [balanceUpdating, setBalanceUpdating] = useState(false);
  const [showFirstDepositDialog, setShowFirstDepositDialog] = useState(false);

  const fetchBalances = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('balance, demo_balance, is_demo_mode')
        .eq('user_id', user.id)
        .single();

      if (profile) {
        setRealBalance(profile.balance || 0);
        setDemoBalance(profile.demo_balance || 10000);
        setIsDemoMode(profile.is_demo_mode ?? true);
      }
    } catch (error) {
      console.error('[useDemoMode] Error fetching balances:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel> | null = null;
    let isMounted = true;
    let reconnectTimeout: NodeJS.Timeout | null = null;
    let pollingInterval: NodeJS.Timeout | null = null;

    const init = async () => {
      // First fetch balances
      await fetchBalances();

      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !isMounted) return;

      const setupChannel = () => {
        // Remove existing channel if any
        if (channel) {
          supabase.removeChannel(channel);
        }

        // Setup realtime subscription
        channel = supabase
          .channel(`balance-updates-${user.id}-${Date.now()}`)
          .on(
            'postgres_changes',
            {
              event: 'UPDATE',
              schema: 'public',
              table: 'profiles',
              filter: `user_id=eq.${user.id}`
            },
            (payload) => {
              if (!isMounted) return;
              
              console.log('[useDemoMode] Balance update received:', payload.new);
              
              const newProfile = payload.new as {
                balance?: number;
                demo_balance?: number;
                is_demo_mode?: boolean;
              };
              
              // Show loading animation
              setBalanceUpdating(true);
              
              // Update state
              if (newProfile.balance !== undefined) {
                setRealBalance(newProfile.balance);
              }
              if (newProfile.demo_balance !== undefined) {
                setDemoBalance(newProfile.demo_balance);
              }
              if (newProfile.is_demo_mode !== undefined) {
                setIsDemoMode(newProfile.is_demo_mode);
              }
              
              // Hide loading after animation
              setTimeout(() => {
                if (isMounted) setBalanceUpdating(false);
              }, 500);
            }
          )
          .subscribe((status, err) => {
            console.log('[useDemoMode] Subscription status:', status, err);
            
            // If subscription fails or closes, try to reconnect
            if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
              console.warn('[useDemoMode] Channel error, will reconnect...');
              if (reconnectTimeout) clearTimeout(reconnectTimeout);
              reconnectTimeout = setTimeout(() => {
                if (isMounted) setupChannel();
              }, 2000);
            }
          });
      };

      setupChannel();

      // Fallback polling every 5 seconds as safety net
      // This ensures balance updates even if Realtime has issues
      pollingInterval = setInterval(async () => {
        if (!isMounted) return;
        
        const { data: profile } = await supabase
          .from('profiles')
          .select('balance, demo_balance, is_demo_mode')
          .eq('user_id', user.id)
          .single();

        if (profile && isMounted) {
          // Only update if values changed
          setRealBalance(prev => {
            if (prev !== profile.balance) {
              console.log('[useDemoMode] Polling detected balance change:', prev, '->', profile.balance);
              setBalanceUpdating(true);
              setTimeout(() => setBalanceUpdating(false), 500);
              return profile.balance || 0;
            }
            return prev;
          });
          setDemoBalance(prev => {
            if (prev !== profile.demo_balance) {
              console.log('[useDemoMode] Polling detected demo_balance change:', prev, '->', profile.demo_balance);
              setBalanceUpdating(true);
              setTimeout(() => setBalanceUpdating(false), 500);
              return profile.demo_balance || 10000;
            }
            return prev;
          });
          setIsDemoMode(prev => {
            if (prev !== profile.is_demo_mode) {
              return profile.is_demo_mode ?? true;
            }
            return prev;
          });
        }
      }, 5000);
    };

    init();

    return () => {
      isMounted = false;
      if (channel) {
        supabase.removeChannel(channel);
      }
      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
      }
      if (pollingInterval) {
        clearInterval(pollingInterval);
      }
    };
  }, [fetchBalances]);

  const checkIfFirstDeposit = async (): Promise<boolean> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return false;

      const { data: deposits } = await supabase
        .from('transactions')
        .select('id')
        .eq('user_id', user.id)
        .eq('type', 'deposit')
        .eq('status', 'completed')
        .limit(1);

      return !deposits || deposits.length === 0;
    } catch {
      return false;
    }
  };

  const toggleDemoMode = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const newMode = !isDemoMode;
      
      const { error } = await supabase
        .from('profiles')
        .update({ is_demo_mode: newMode })
        .eq('user_id', user.id);

      if (error) throw error;

      setIsDemoMode(newMode);
      
      if (newMode) {
        toast.success(t("toast_demo_mode_activated"));
      } else {
        toast.success(t("toast_real_mode_activated"));
        
        const isFirstDeposit = await checkIfFirstDeposit();
        if (isFirstDeposit) {
          setTimeout(() => setShowFirstDepositDialog(true), 800);
        }
      }
    } catch (error) {
      console.error('[useDemoMode] Error toggling mode:', error);
      toast.error(t("toast_mode_switch_error"));
    }
  };

  const resetDemoBalance = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('profiles')
        .update({ demo_balance: 10000 })
        .eq('user_id', user.id);

      if (error) throw error;

      setDemoBalance(10000);
      toast.success(t("toast_demo_balance_reset"));
    } catch (error) {
      console.error('[useDemoMode] Error resetting demo:', error);
      toast.error(t("toast_demo_reset_error"));
    }
  };

  const currentBalance = isDemoMode ? demoBalance : realBalance;

  // Trigger balance loading indicator immediately (call when trade closes)
  const triggerBalanceLoading = useCallback(() => {
    setBalanceUpdating(true);
    // Auto-reset after longer time in case realtime doesn't fire
    setTimeout(() => setBalanceUpdating(false), 3000);
  }, []);

  return {
    isDemoMode,
    demoBalance,
    realBalance,
    currentBalance,
    loading,
    balanceUpdating,
    toggleDemoMode,
    resetDemoBalance,
    refreshBalances: fetchBalances,
    showFirstDepositDialog,
    setShowFirstDepositDialog,
    triggerBalanceLoading,
  };
};
