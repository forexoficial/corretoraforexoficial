import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { RealtimeChannel } from '@supabase/supabase-js';

interface RealtimeContextType {
  subscribeTrades: (userId: string, callback: (payload: any) => void) => () => void;
  subscribeCandles: (assetId: string, callback: (payload: any) => void) => () => void;
  subscribeProfile: (userId: string, callback: (payload: any) => void) => () => void;
}

const RealtimeContext = createContext<RealtimeContextType | undefined>(undefined);

export const useRealtime = () => {
  const context = useContext(RealtimeContext);
  if (!context) {
    throw new Error('useRealtime must be used within RealtimeProvider');
  }
  return context;
};

interface RealtimeProviderProps {
  children: ReactNode;
}

export const RealtimeProvider = ({ children }: RealtimeProviderProps) => {
  const [channels, setChannels] = useState<Map<string, RealtimeChannel>>(new Map());

  useEffect(() => {
    // Cleanup all channels on unmount
    return () => {
      channels.forEach(channel => {
        supabase.removeChannel(channel);
      });
    };
  }, []);

  const subscribeTrades = (userId: string, callback: (payload: any) => void) => {
    const channelKey = `trades-${userId}`;
    
    // Check if channel already exists
    if (channels.has(channelKey)) {
      console.log(`[Realtime] Using existing trades channel for user ${userId}`);
      return () => {}; // Return empty unsubscribe
    }

    console.log(`[Realtime] Creating new trades channel for user ${userId}`);
    
    const channel = supabase
      .channel(channelKey)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'trades',
          filter: `user_id=eq.${userId}`
        },
        (payload) => {
          console.log(`[Realtime] Trade update:`, payload);
          callback(payload);
        }
      )
      .subscribe();

    setChannels(prev => new Map(prev).set(channelKey, channel));

    return () => {
      console.log(`[Realtime] Removing trades channel for user ${userId}`);
      supabase.removeChannel(channel);
      setChannels(prev => {
        const next = new Map(prev);
        next.delete(channelKey);
        return next;
      });
    };
  };

  const subscribeCandles = (assetId: string, callback: (payload: any) => void) => {
    const channelKey = `candles-${assetId}`;
    
    // Check if channel already exists
    if (channels.has(channelKey)) {
      console.log(`[Realtime] Using existing candles channel for asset ${assetId}`);
      return () => {};
    }

    console.log(`[Realtime] Creating new candles channel for asset ${assetId}`);
    
    const channel = supabase
      .channel(channelKey)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'candles',
          filter: `asset_id=eq.${assetId}`
        },
        (payload) => {
          console.log(`[Realtime] Candle update:`, payload);
          callback(payload);
        }
      )
      .subscribe();

    setChannels(prev => new Map(prev).set(channelKey, channel));

    return () => {
      console.log(`[Realtime] Removing candles channel for asset ${assetId}`);
      supabase.removeChannel(channel);
      setChannels(prev => {
        const next = new Map(prev);
        next.delete(channelKey);
        return next;
      });
    };
  };

  const subscribeProfile = (userId: string, callback: (payload: any) => void) => {
    const channelKey = `profile-${userId}`;
    
    // Check if channel already exists
    if (channels.has(channelKey)) {
      console.log(`[Realtime] Using existing profile channel for user ${userId}`);
      return () => {};
    }

    console.log(`[Realtime] Creating new profile channel for user ${userId}`);
    
    const channel = supabase
      .channel(channelKey)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
          filter: `user_id=eq.${userId}`
        },
        (payload) => {
          console.log(`[Realtime] Profile update:`, payload);
          callback(payload);
        }
      )
      .subscribe();

    setChannels(prev => new Map(prev).set(channelKey, channel));

    return () => {
      console.log(`[Realtime] Removing profile channel for user ${userId}`);
      supabase.removeChannel(channel);
      setChannels(prev => {
        const next = new Map(prev);
        next.delete(channelKey);
        return next;
      });
    };
  };

  return (
    <RealtimeContext.Provider value={{ subscribeTrades, subscribeCandles, subscribeProfile }}>
      {children}
    </RealtimeContext.Provider>
  );
};
