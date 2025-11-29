import { supabase } from "@/integrations/supabase/client";
import type { CreateTradeParams, Trade, TradeFilters } from "../types/trade.types";

export class TradeService {
  /**
   * Cria uma nova operação
   */
  static async createTrade(params: CreateTradeParams): Promise<{ data: Trade | null; error: Error | null }> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        return { data: null, error: new Error("Usuário não autenticado") };
      }

      const expiresAt = new Date();
      expiresAt.setMinutes(expiresAt.getMinutes() + params.duration_minutes);

      const { data, error } = await supabase
        .from('trades')
        .insert({
          user_id: user.id,
          asset_id: params.asset_id,
          trade_type: params.trade_type,
          amount: params.amount,
          payout: params.payout,
          duration_minutes: params.duration_minutes,
          expires_at: expiresAt.toISOString(),
          is_demo: params.is_demo,
          entry_price: params.entry_price,
          status: 'open',
        })
        .select()
        .single();

      if (error) throw error;

      // Disparar evento customizado para atualizar a UI
      window.dispatchEvent(new CustomEvent('trade-created', { 
        detail: { assetId: params.asset_id, userId: user.id }
      }));

      return { data: data as Trade, error: null };
    } catch (error) {
      console.error("[TradeService] Erro ao criar trade:", error);
      return { data: null, error: error as Error };
    }
  }

  /**
   * Busca operações do usuário com filtros
   */
  static async getTrades(filters: TradeFilters = {}): Promise<{ data: Trade[]; error: Error | null }> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        return { data: [], error: new Error("Usuário não autenticado") };
      }

      let query = supabase
        .from('trades')
        .select(`
          *,
          assets (
            id,
            name,
            symbol,
            icon_url,
            payout_percentage
          )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      // Aplicar filtros
      if (filters.status && filters.status !== 'all') {
        query = query.eq('status', filters.status);
      }

      // Incluir trades recentes fechados
      if (filters.includeRecent) {
        const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
        query = query.or(`status.eq.open,and(status.in.(won,lost),closed_at.gte.${fiveMinutesAgo})`);
      }

      if (filters.limit) {
        query = query.limit(filters.limit);
      }

      const { data, error } = await query;

      if (error) throw error;

      return { data: (data || []) as Trade[], error: null };
    } catch (error) {
      console.error("[TradeService] Erro ao buscar trades:", error);
      return { data: [], error: error as Error };
    }
  }

  /**
   * Busca operação aberta do usuário
   */
  static async getOpenTrade(): Promise<{ data: Trade | null; error: Error | null }> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        return { data: null, error: null };
      }

      const { data, error } = await supabase
        .from('trades')
        .select(`
          *,
          assets (
            id,
            name,
            symbol,
            icon_url,
            payout_percentage
          )
        `)
        .eq('user_id', user.id)
        .eq('status', 'open')
        .maybeSingle();

      if (error) throw error;

      return { data: data as Trade | null, error: null };
    } catch (error) {
      console.error("[TradeService] Erro ao buscar trade aberto:", error);
      return { data: null, error: error as Error };
    }
  }

  /**
   * Subscreve a mudanças em trades
   */
  static subscribeToTrades(userId: string, callback: (payload: any) => void) {
    const channel = supabase
      .channel('trades-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'trades',
          filter: `user_id=eq.${userId}`
        },
        callback
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }
}
