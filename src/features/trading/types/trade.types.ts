export interface Asset {
  id: string;
  name: string;
  symbol: string;
  icon_url: string;
  payout_percentage: number;
}

export interface Trade {
  id: string;
  user_id: string;
  asset_id: string;
  trade_type: 'call' | 'put';
  amount: number;
  payout: number;
  duration_minutes: number;
  entry_price: number | null;
  exit_price: number | null;
  result: number | null;
  status: 'open' | 'won' | 'lost';
  is_demo: boolean;
  created_at: string;
  expires_at: string;
  closed_at: string | null;
  assets?: Asset;
}

export interface CreateTradeParams {
  asset_id: string;
  trade_type: 'call' | 'put';
  amount: number;
  payout: number;
  duration_minutes: number;
  entry_price: number;
  is_demo: boolean;
}

export interface TradeFilters {
  status?: 'all' | 'open' | 'won' | 'lost';
  limit?: number;
  includeRecent?: boolean;
}
