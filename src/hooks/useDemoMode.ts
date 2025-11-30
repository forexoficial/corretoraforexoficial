import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useTranslation } from "@/hooks/useTranslation";

export const useDemoMode = () => {
  const { t } = useTranslation();
  const [isDemoMode, setIsDemoMode] = useState(true);
  const [demoBalance, setDemoBalance] = useState(10000);
  const [realBalance, setRealBalance] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showFirstDepositDialog, setShowFirstDepositDialog] = useState(false);

  useEffect(() => {
    fetchBalances();

    // Subscribe to real-time balance updates from Supabase
    const setupRealtimeSubscription = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      console.log('[useDemoMode] 🎯 Configurando subscription para profile:', user.id);

      const channel = supabase
        .channel('profile-balance-realtime')
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'profiles',
            filter: `user_id=eq.${user.id}`
          },
          (payload) => {
            console.log('[useDemoMode] 📡 Profile UPDATE detectado:', payload);
            
            if (payload.new) {
              const realBal = parseFloat(payload.new.balance || 0);
              const demoBal = parseFloat(payload.new.demo_balance || 10000);
              const demoMode = payload.new.is_demo_mode ?? true;
              
              console.log('[useDemoMode] 💰 Atualizando saldos:', {
                real: realBal,
                demo: demoBal,
                mode: demoMode ? 'DEMO' : 'REAL',
                currentBalance: demoMode ? demoBal : realBal
              });
              
              setRealBalance(realBal);
              setDemoBalance(demoBal);
              setIsDemoMode(demoMode);
            }
          }
        )
        .subscribe((status) => {
          console.log('[useDemoMode] 📊 Subscription status:', status);
          if (status === 'SUBSCRIBED') {
            console.log('[useDemoMode] ✅ Subscription ativa!');
          } else if (status === 'CHANNEL_ERROR') {
            console.error('[useDemoMode] ❌ Erro na subscription!');
          }
        });

      return () => {
        console.log('[useDemoMode] 🔌 Removendo subscription');
        supabase.removeChannel(channel);
      };
    };

    const unsubscribePromise = setupRealtimeSubscription();

    return () => {
      unsubscribePromise.then(cleanup => cleanup?.());
    };
  }, []);

  const checkIfFirstDeposit = async (): Promise<boolean> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return false;

      // Check if user has any completed deposits
      const { data: deposits, error } = await supabase
        .from('transactions')
        .select('id')
        .eq('user_id', user.id)
        .eq('type', 'deposit')
        .eq('status', 'completed')
        .limit(1);

      if (error) {
        console.error('Error checking deposits:', error);
        return false;
      }

      // If no completed deposits found, it's a first time user
      return !deposits || deposits.length === 0;
    } catch (error) {
      console.error('Error in checkIfFirstDeposit:', error);
      return false;
    }
  };

  const fetchBalances = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('balance, demo_balance, is_demo_mode')
        .eq('user_id', user.id)
        .single();

      if (profile) {
        const realBal = profile.balance || 0;
        const demoBal = profile.demo_balance || 10000;
        const demoMode = profile.is_demo_mode ?? true;
        
        console.log('[useDemoMode] Saldos carregados:', {
          real: realBal,
          demo: demoBal,
          mode: demoMode ? 'DEMO' : 'REAL'
        });
        
        setRealBalance(realBal);
        setDemoBalance(demoBal);
        setIsDemoMode(demoMode);
      }
    } catch (error) {
      console.error('Error fetching balances:', error);
    } finally {
      setLoading(false);
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
        // Switching to Real Mode
        toast.success(t("toast_real_mode_activated"));
        
        // Check if this is the first time switching to real mode and no deposits made
        const isFirstDeposit = await checkIfFirstDeposit();
        if (isFirstDeposit) {
          // Show dialog after a short delay to let the toast appear first
          setTimeout(() => {
            setShowFirstDepositDialog(true);
          }, 800);
        }
      }
    } catch (error) {
      console.error('Error toggling demo mode:', error);
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
      console.error('Error resetting demo balance:', error);
      toast.error(t("toast_demo_reset_error"));
    }
  };

  const getCurrentBalance = () => {
    return isDemoMode ? demoBalance : realBalance;
  };

  return {
    isDemoMode,
    demoBalance,
    realBalance,
    currentBalance: getCurrentBalance(),
    loading,
    toggleDemoMode,
    resetDemoBalance,
    refreshBalances: fetchBalances,
    showFirstDepositDialog,
    setShowFirstDepositDialog,
  };
};
