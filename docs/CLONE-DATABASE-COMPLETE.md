# 🗄️ Guia Completo: Clone do Banco de Dados Supabase

Este documento contém TUDO que você precisa para clonar o banco de dados para um novo projeto Supabase.

---

## 📋 PASSOS RESUMIDOS

1. **Criar novo projeto Supabase** em [supabase.com](https://supabase.com)
2. **Copiar o SQL do PASSO 1** (este documento) e rodar no SQL Editor do NOVO projeto
3. **Rodar o script de exportação** no projeto ORIGINAL
4. **Colar os dados exportados** no projeto NOVO

---

## 🔧 PASSO 1: SQL COMPLETO PARA CRIAR ESTRUTURA

Cole TODO o SQL abaixo no **SQL Editor do seu NOVO projeto Supabase**:

```sql
-- ============================================
-- PARTE 1: CRIAR ENUMS E TIPOS
-- ============================================

-- Enum para status de verificação
CREATE TYPE public.verification_status AS ENUM ('pending', 'under_review', 'approved', 'rejected');

-- Enum para tipos de documento
CREATE TYPE public.document_type AS ENUM ('rg', 'cnh');

-- Enum para tipos de entidade
CREATE TYPE public.entity_type AS ENUM ('individual', 'business');

-- Enum para roles da aplicação
CREATE TYPE public.app_role AS ENUM ('admin', 'user');


-- ============================================
-- PARTE 2: CRIAR FUNÇÃO AUXILIAR DE TIMESTAMP
-- ============================================

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger AS $$
BEGIN
  new.updated_at = now();
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;


-- ============================================
-- PARTE 3: TABELAS PRINCIPAIS
-- ============================================

-- Tabela: assets
CREATE TABLE public.assets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  symbol TEXT NOT NULL UNIQUE,
  icon_url TEXT,
  payout_percentage INTEGER NOT NULL DEFAULT 91,
  is_active BOOLEAN NOT NULL DEFAULT true,
  auto_generate_candles BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.assets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Assets are viewable by everyone"
ON public.assets FOR SELECT
USING (true);

-- Tabela: profiles
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  document TEXT NOT NULL,
  document_type TEXT NOT NULL,
  avatar_url TEXT,
  balance NUMERIC DEFAULT 0,
  demo_balance NUMERIC DEFAULT 10000.00,
  is_demo_mode BOOLEAN DEFAULT true,
  is_admin BOOLEAN DEFAULT false,
  is_blocked BOOLEAN DEFAULT false,
  total_deposited NUMERIC DEFAULT 0,
  user_tier TEXT DEFAULT 'standard',
  verification_status verification_status DEFAULT 'pending',
  verification_submitted_at TIMESTAMP WITH TIME ZONE,
  selected_assets JSONB DEFAULT '[]'::jsonb,
  current_asset_id UUID REFERENCES public.assets(id) ON DELETE SET NULL,
  country_code TEXT,
  country_name TEXT,
  preferred_currency TEXT DEFAULT 'USD',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Constraint para document_type aceitar internacional
ALTER TABLE public.profiles ADD CONSTRAINT profiles_document_type_check 
  CHECK (document_type IN ('cpf', 'cnpj', 'CPF', 'CNPJ', 'international', 'N/A', 'na', ''));

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Tabela: trades
CREATE TABLE public.trades (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  asset_id UUID NOT NULL REFERENCES public.assets(id),
  trade_type TEXT NOT NULL CHECK (trade_type IN ('call', 'put')),
  amount NUMERIC NOT NULL,
  payout NUMERIC NOT NULL,
  duration_minutes INTEGER NOT NULL,
  entry_price NUMERIC,
  exit_price NUMERIC,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'won', 'lost')),
  result NUMERIC,
  is_demo BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  closed_at TIMESTAMP WITH TIME ZONE
);

ALTER TABLE public.trades ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_trades_user_id ON public.trades(user_id);
CREATE INDEX idx_trades_status ON public.trades(status);
CREATE INDEX idx_trades_created_at ON public.trades(created_at DESC);
CREATE INDEX idx_trades_user_status ON public.trades(user_id, status);

-- Tabela: transactions
CREATE TABLE public.transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('deposit', 'withdrawal', 'commission')),
  amount NUMERIC NOT NULL CHECK (amount > 0),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'cancelled')),
  payment_method TEXT,
  payment_currency TEXT DEFAULT 'USD',
  transaction_reference TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER update_transactions_updated_at
BEFORE UPDATE ON public.transactions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_transactions_user_id ON public.transactions(user_id);
CREATE INDEX idx_transactions_status ON public.transactions(status);
CREATE INDEX idx_transactions_payment_currency ON public.transactions(payment_currency);

-- Tabela: user_roles
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Tabela: verification_requests
CREATE TABLE public.verification_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  entity_type entity_type NOT NULL,
  document_type document_type NOT NULL,
  document_front_url TEXT NOT NULL,
  document_back_url TEXT NOT NULL,
  selfie_url TEXT NOT NULL,
  business_document_url TEXT,
  status verification_status DEFAULT 'under_review',
  rejection_reason TEXT,
  reviewed_by UUID,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.verification_requests ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER update_verification_requests_updated_at
  BEFORE UPDATE ON public.verification_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Tabela: platform_settings
CREATE TABLE public.platform_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT UNIQUE NOT NULL,
  value TEXT NOT NULL,
  description TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_by UUID
);

ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;

-- Tabela: payment_gateways
CREATE TABLE public.payment_gateways (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('pix', 'crypto', 'worldwide', 'coinbase')),
  api_key TEXT,
  api_secret TEXT,
  webhook_url TEXT,
  config JSONB DEFAULT '{}'::jsonb,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.payment_gateways ENABLE ROW LEVEL SECURITY;

-- Tabela: platform_popups
CREATE TABLE public.platform_popups (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  image_url TEXT,
  video_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  start_date TIMESTAMP WITH TIME ZONE,
  end_date TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.platform_popups ENABLE ROW LEVEL SECURITY;

-- Tabela: affiliates
CREATE TABLE public.affiliates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  affiliate_code TEXT NOT NULL UNIQUE,
  commission_percentage NUMERIC NOT NULL DEFAULT 10,
  total_referrals INTEGER DEFAULT 0,
  total_commission NUMERIC DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.affiliates ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER update_affiliates_updated_at
BEFORE UPDATE ON public.affiliates
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_affiliates_user_id ON public.affiliates(user_id);
CREATE INDEX idx_affiliates_code ON public.affiliates(affiliate_code);

-- Tabela: referrals
CREATE TABLE public.referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_id UUID NOT NULL REFERENCES public.affiliates(id) ON DELETE CASCADE,
  referred_user_id UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_referrals_affiliate_id ON public.referrals(affiliate_id);
CREATE INDEX idx_referrals_referred_user_id ON public.referrals(referred_user_id);

-- Tabela: commissions
CREATE TABLE public.commissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_id UUID NOT NULL REFERENCES public.affiliates(id) ON DELETE CASCADE,
  referral_id UUID NOT NULL REFERENCES public.referrals(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL,
  transaction_id UUID REFERENCES public.transactions(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.commissions ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_commissions_affiliate_id ON public.commissions(affiliate_id);

-- Tabela: withdrawal_requests (affiliate)
CREATE TABLE public.withdrawal_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  affiliate_id UUID NOT NULL REFERENCES public.affiliates(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL CHECK (amount > 0),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'processing')),
  payment_method TEXT NOT NULL CHECK (payment_method IN ('pix', 'bank_transfer')),
  payment_details JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  processed_at TIMESTAMP WITH TIME ZONE,
  processed_by UUID,
  rejection_reason TEXT,
  notes TEXT,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.withdrawal_requests ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER update_withdrawal_requests_updated_at
  BEFORE UPDATE ON public.withdrawal_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_withdrawal_requests_affiliate_id ON public.withdrawal_requests(affiliate_id);
CREATE INDEX idx_withdrawal_requests_status ON public.withdrawal_requests(status);

-- Tabela: affiliate_custom_links
CREATE TABLE public.affiliate_custom_links (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  affiliate_id UUID NOT NULL REFERENCES public.affiliates(id) ON DELETE CASCADE,
  custom_slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  clicks INTEGER NOT NULL DEFAULT 0,
  conversions INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.affiliate_custom_links ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER update_affiliate_custom_links_updated_at
BEFORE UPDATE ON public.affiliate_custom_links
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_affiliate_custom_links_affiliate_id ON public.affiliate_custom_links(affiliate_id);
CREATE INDEX idx_affiliate_custom_links_slug ON public.affiliate_custom_links(custom_slug);

-- Tabela: legal_documents
CREATE TABLE public.legal_documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT NOT NULL,
  content TEXT,
  icon TEXT NOT NULL DEFAULT 'FileText',
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.legal_documents ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER update_legal_documents_updated_at
  BEFORE UPDATE ON public.legal_documents
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Tabela: company_info
CREATE TABLE public.company_info (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  key TEXT NOT NULL UNIQUE,
  value TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.company_info ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER update_company_info_updated_at
  BEFORE UPDATE ON public.company_info
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Tabela: boosters
CREATE TABLE public.boosters (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  name_en TEXT,
  name_es TEXT,
  description_en TEXT,
  description_es TEXT,
  payout_increase_percentage INTEGER NOT NULL CHECK (payout_increase_percentage > 0 AND payout_increase_percentage <= 100),
  duration_minutes INTEGER NOT NULL CHECK (duration_minutes > 0),
  price NUMERIC NOT NULL CHECK (price >= 0),
  icon TEXT DEFAULT 'Zap',
  is_active BOOLEAN NOT NULL DEFAULT true,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.boosters ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_boosters_active ON public.boosters(is_active) WHERE is_active = true;

CREATE TRIGGER update_boosters_updated_at
BEFORE UPDATE ON public.boosters
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Tabela: user_boosters
CREATE TABLE public.user_boosters (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  booster_id UUID NOT NULL REFERENCES public.boosters(id) ON DELETE CASCADE,
  activated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  payout_increase_percentage INTEGER NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.user_boosters ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_user_boosters_user_id ON public.user_boosters(user_id);
CREATE INDEX idx_user_boosters_expires_at ON public.user_boosters(expires_at);
CREATE INDEX idx_user_boosters_active ON public.user_boosters(is_active) WHERE is_active = true;

-- Tabela: candles
CREATE TABLE public.candles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  asset_id UUID NOT NULL REFERENCES public.assets(id) ON DELETE CASCADE,
  timeframe TEXT NOT NULL,
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
  open NUMERIC NOT NULL,
  high NUMERIC NOT NULL,
  low NUMERIC NOT NULL,
  close NUMERIC NOT NULL,
  volume NUMERIC NOT NULL DEFAULT 0,
  is_manipulated BOOLEAN NOT NULL DEFAULT false,
  manipulation_type TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(asset_id, timeframe, timestamp)
);

ALTER TABLE public.candles ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_candles_asset_timeframe ON public.candles(asset_id, timeframe, timestamp DESC);
CREATE INDEX idx_candles_timestamp ON public.candles(timestamp DESC);

CREATE OR REPLACE FUNCTION update_candles_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trigger_update_candles_updated_at
  BEFORE UPDATE ON public.candles
  FOR EACH ROW
  EXECUTE FUNCTION update_candles_updated_at();

-- Tabela: chart_manipulations
CREATE TABLE public.chart_manipulations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  asset_id UUID NOT NULL REFERENCES public.assets(id) ON DELETE CASCADE,
  candle_id UUID REFERENCES public.candles(id) ON DELETE CASCADE,
  manipulation_type TEXT NOT NULL,
  original_values JSONB NOT NULL,
  manipulated_values JSONB NOT NULL,
  bias_direction TEXT,
  bias_strength NUMERIC,
  admin_id UUID NOT NULL,
  applied_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.chart_manipulations ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_chart_manipulations_asset ON public.chart_manipulations(asset_id, applied_at DESC);
CREATE INDEX idx_chart_manipulations_candle ON public.chart_manipulations(candle_id);

-- Tabela: chart_biases
CREATE TABLE public.chart_biases (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  asset_id UUID NOT NULL REFERENCES public.assets(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  direction TEXT NOT NULL,
  strength NUMERIC NOT NULL DEFAULT 50,
  start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  end_time TIMESTAMP WITH TIME ZONE NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  admin_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.chart_biases ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_chart_biases_asset ON public.chart_biases(asset_id, start_time, end_time);
CREATE INDEX idx_chart_biases_active ON public.chart_biases(is_active, start_time, end_time);

CREATE OR REPLACE FUNCTION update_chart_biases_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trigger_update_chart_biases_updated_at
  BEFORE UPDATE ON public.chart_biases
  FOR EACH ROW
  EXECUTE FUNCTION update_chart_biases_updated_at();

-- Tabela: chart_appearance_settings
CREATE TABLE public.chart_appearance_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chart_bg_color TEXT NOT NULL DEFAULT '#0a0a0a',
  chart_bg_color_dark TEXT DEFAULT '#0a0a0a',
  chart_bg_color_light TEXT DEFAULT '#ffffff',
  chart_text_color TEXT NOT NULL DEFAULT '#d1d4dc',
  chart_text_color_dark TEXT DEFAULT '#d1d4dc',
  chart_text_color_light TEXT DEFAULT '#1a1a1a',
  grid_vert_color TEXT NOT NULL DEFAULT '#1e1e1e',
  grid_vert_color_dark TEXT DEFAULT '#1e1e1e',
  grid_vert_color_light TEXT DEFAULT '#e5e5e5',
  grid_horz_color TEXT NOT NULL DEFAULT '#1e1e1e',
  grid_horz_color_dark TEXT DEFAULT '#1e1e1e',
  grid_horz_color_light TEXT DEFAULT '#e5e5e5',
  candle_up_color TEXT NOT NULL DEFAULT '#22c55e',
  candle_up_color_dark TEXT DEFAULT '#22c55e',
  candle_up_color_light TEXT DEFAULT '#22c55e',
  candle_down_color TEXT NOT NULL DEFAULT '#ef4444',
  candle_down_color_dark TEXT DEFAULT '#ef4444',
  candle_down_color_light TEXT DEFAULT '#ef4444',
  candle_border_visible BOOLEAN DEFAULT false,
  candle_border_up_color TEXT DEFAULT '#22c55e',
  candle_border_down_color TEXT DEFAULT '#ef4444',
  candle_border_width INTEGER DEFAULT 1,
  candle_border_up_color_dark TEXT DEFAULT '#22c55e',
  candle_border_down_color_dark TEXT DEFAULT '#ef4444',
  candle_border_up_color_light TEXT DEFAULT '#22c55e',
  candle_border_down_color_light TEXT DEFAULT '#ef4444',
  wick_up_color TEXT DEFAULT '#22c55e',
  wick_down_color TEXT DEFAULT '#ef4444',
  wick_up_color_dark TEXT DEFAULT '#22c55e',
  wick_down_color_dark TEXT DEFAULT '#ef4444',
  wick_up_color_light TEXT DEFAULT '#22c55e',
  wick_down_color_light TEXT DEFAULT '#ef4444',
  price_scale_border_color TEXT NOT NULL DEFAULT '#2B2B43',
  price_scale_border_color_dark TEXT DEFAULT '#2B2B43',
  price_scale_border_color_light TEXT DEFAULT '#d1d5db',
  time_scale_border_color TEXT NOT NULL DEFAULT '#2B2B43',
  time_scale_border_color_dark TEXT DEFAULT '#2B2B43',
  time_scale_border_color_light TEXT DEFAULT '#d1d5db',
  crosshair_color TEXT NOT NULL DEFAULT '#758696',
  crosshair_color_dark TEXT DEFAULT '#758696',
  crosshair_color_light TEXT DEFAULT '#6b7280',
  map_enabled BOOLEAN NOT NULL DEFAULT true,
  map_opacity NUMERIC NOT NULL DEFAULT 0.08,
  map_primary_color TEXT NOT NULL DEFAULT '#6366f1',
  map_secondary_color TEXT NOT NULL DEFAULT '#8b5cf6',
  map_show_grid BOOLEAN NOT NULL DEFAULT true,
  map_grid_opacity NUMERIC NOT NULL DEFAULT 0.4,
  map_image_url TEXT,
  map_image_url_dark TEXT,
  map_image_url_mobile TEXT,
  map_image_url_mobile_dark TEXT,
  watermark_visible BOOLEAN NOT NULL DEFAULT false,
  watermark_text TEXT,
  trade_line_call_color TEXT DEFAULT '#22c55e',
  trade_line_put_color TEXT DEFAULT '#ef4444',
  trade_line_width INTEGER DEFAULT 2,
  trade_line_style INTEGER DEFAULT 2,
  trade_line_show_label BOOLEAN DEFAULT true,
  show_tradingview_logo BOOLEAN DEFAULT false,
  chart_height_desktop INTEGER DEFAULT 600,
  chart_height_mobile INTEGER DEFAULT 350,
  chart_height_fullscreen INTEGER DEFAULT 800,
  chart_width_percentage_desktop INTEGER DEFAULT 100,
  chart_width_percentage_mobile INTEGER DEFAULT 100,
  chart_width_percentage_fullscreen INTEGER DEFAULT 100,
  chart_aspect_ratio_desktop TEXT DEFAULT '16:9',
  chart_aspect_ratio_mobile TEXT DEFAULT '4:3',
  chart_aspect_ratio_fullscreen TEXT DEFAULT '21:9',
  chart_responsive_desktop BOOLEAN DEFAULT false,
  chart_responsive_mobile BOOLEAN DEFAULT true,
  chart_responsive_fullscreen BOOLEAN DEFAULT true,
  chart_height_offset_desktop INTEGER DEFAULT 180,
  chart_height_offset_mobile INTEGER DEFAULT 160,
  chart_height_offset_fullscreen INTEGER DEFAULT 96,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_by UUID
);

ALTER TABLE public.chart_appearance_settings ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER update_chart_appearance_updated_at
  BEFORE UPDATE ON public.chart_appearance_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Inserir configuração padrão
INSERT INTO public.chart_appearance_settings (id)
VALUES ('00000000-0000-0000-0000-000000000001')
ON CONFLICT (id) DO NOTHING;

-- Tabela: chart_drawings
CREATE TABLE public.chart_drawings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  asset_id UUID NOT NULL REFERENCES public.assets(id) ON DELETE CASCADE,
  timeframe TEXT NOT NULL,
  drawing_type TEXT NOT NULL CHECK (drawing_type IN ('trendline', 'horizontal', 'vertical', 'rectangle', 'fibonacci')),
  points JSONB NOT NULL,
  color TEXT NOT NULL DEFAULT '#22c55e',
  line_width INTEGER NOT NULL DEFAULT 2 CHECK (line_width >= 1 AND line_width <= 10),
  line_style TEXT NOT NULL DEFAULT 'solid' CHECK (line_style IN ('solid', 'dashed', 'dotted')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.chart_drawings ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_chart_drawings_user_asset ON public.chart_drawings(user_id, asset_id, timeframe);

CREATE TRIGGER update_chart_drawings_updated_at
BEFORE UPDATE ON public.chart_drawings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Tabela: social_auth_providers
CREATE TABLE public.social_auth_providers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider TEXT NOT NULL UNIQUE CHECK (provider IN ('google', 'facebook', 'apple')),
  is_enabled BOOLEAN NOT NULL DEFAULT false,
  client_id TEXT,
  client_secret TEXT,
  config JSONB DEFAULT '{}'::jsonb,
  instructions TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_by UUID
);

ALTER TABLE public.social_auth_providers ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER update_social_auth_providers_updated_at
  BEFORE UPDATE ON public.social_auth_providers
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Tabela: copy_trade_requests
CREATE TABLE public.copy_trade_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  description TEXT,
  rejection_reason TEXT,
  reviewed_by UUID,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.copy_trade_requests ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER update_copy_trade_requests_updated_at
  BEFORE UPDATE ON public.copy_trade_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Tabela: copy_traders
CREATE TABLE public.copy_traders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  description TEXT,
  total_followers INTEGER DEFAULT 0,
  total_trades INTEGER DEFAULT 0,
  win_rate NUMERIC DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.copy_traders ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER update_copy_traders_updated_at
  BEFORE UPDATE ON public.copy_traders
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Tabela: copy_trade_followers
CREATE TABLE public.copy_trade_followers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  copy_trader_id UUID NOT NULL REFERENCES public.copy_traders(id) ON DELETE CASCADE,
  follower_user_id UUID NOT NULL,
  allocation_percentage NUMERIC NOT NULL DEFAULT 100 CHECK (allocation_percentage > 0 AND allocation_percentage <= 100),
  max_trade_amount NUMERIC,
  is_active BOOLEAN DEFAULT true,
  total_copied_trades INTEGER DEFAULT 0,
  total_profit NUMERIC DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(copy_trader_id, follower_user_id)
);

ALTER TABLE public.copy_trade_followers ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER update_copy_trade_followers_updated_at
  BEFORE UPDATE ON public.copy_trade_followers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Tabela: copied_trades
CREATE TABLE public.copied_trades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  original_trade_id UUID NOT NULL REFERENCES public.trades(id) ON DELETE CASCADE,
  copy_trader_id UUID NOT NULL REFERENCES public.copy_traders(id) ON DELETE CASCADE,
  follower_user_id UUID NOT NULL,
  copied_trade_id UUID REFERENCES public.trades(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'executed', 'failed', 'skipped')),
  failure_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.copied_trades ENABLE ROW LEVEL SECURITY;

-- Tabela: push_subscriptions
CREATE TABLE public.push_subscriptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID,
  endpoint TEXT NOT NULL UNIQUE,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_push_subscriptions_user_id ON public.push_subscriptions(user_id);

CREATE TRIGGER update_push_subscriptions_updated_at
BEFORE UPDATE ON public.push_subscriptions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Tabela: admin_notification_queue
CREATE TABLE public.admin_notification_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_type TEXT NOT NULL,
  user_id UUID,
  user_name TEXT,
  amount NUMERIC,
  processed BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.admin_notification_queue ENABLE ROW LEVEL SECURITY;


-- ============================================
-- PARTE 4: FUNÇÕES DE NEGÓCIO
-- ============================================

-- Função para verificar roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Função para calcular tier do usuário
CREATE OR REPLACE FUNCTION public.calculate_user_tier(deposited numeric)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  IF deposited >= 1000000 THEN
    RETURN 'vip';
  ELSIF deposited >= 100000 THEN
    RETURN 'pro';
  ELSE
    RETURN 'standard';
  END IF;
END;
$$;

-- Função para atualizar total depositado
CREATE OR REPLACE FUNCTION public.update_total_deposited()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.type = 'deposit' AND NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
    UPDATE public.profiles
    SET 
      total_deposited = COALESCE(total_deposited, 0) + NEW.amount,
      user_tier = calculate_user_tier(COALESCE(total_deposited, 0) + NEW.amount)
    WHERE user_id = NEW.user_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_transaction_completed ON public.transactions;
CREATE TRIGGER on_transaction_completed
  AFTER INSERT OR UPDATE ON public.transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_total_deposited();

-- Função para sincronizar admin role
CREATE OR REPLACE FUNCTION public.sync_admin_role()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.is_admin = true AND OLD.is_admin = false THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.user_id, 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;
  ELSIF NEW.is_admin = false AND OLD.is_admin = true THEN
    DELETE FROM public.user_roles
    WHERE user_id = NEW.user_id AND role = 'admin';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER sync_admin_role_trigger
AFTER UPDATE OF is_admin ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.sync_admin_role();

-- Função para atualizar platform_settings updated_at
CREATE OR REPLACE FUNCTION public.update_platform_settings_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  NEW.updated_by = auth.uid();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_platform_settings_updated_at
BEFORE UPDATE ON public.platform_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_platform_settings_updated_at();

-- Função para criar novo usuário
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_document TEXT;
  v_document_type TEXT;
  v_country_code TEXT;
  v_country_name TEXT;
  v_preferred_currency TEXT;
BEGIN
  v_document := new.raw_user_meta_data->>'document';
  v_document_type := COALESCE(NULLIF(new.raw_user_meta_data->>'document_type', ''), 'international');
  v_country_code := COALESCE(NULLIF(new.raw_user_meta_data->>'country_code', ''), 'XX');
  v_country_name := COALESCE(NULLIF(new.raw_user_meta_data->>'country_name', ''), 'Unknown');
  v_preferred_currency := COALESCE(NULLIF(new.raw_user_meta_data->>'preferred_currency', ''), 'USD');
  
  IF v_document IS NULL OR v_document = '' OR v_document = 'N/A' THEN
    v_document := 'INT-' || extract(epoch from now())::bigint || '-' || substr(md5(random()::text), 1, 8);
  END IF;
  
  INSERT INTO public.profiles (
    user_id, 
    full_name, 
    document, 
    document_type,
    country_code,
    country_name,
    preferred_currency
  )
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'full_name', 'User'),
    v_document,
    v_document_type,
    v_country_code,
    v_country_name,
    v_preferred_currency
  );
  RETURN new;
END;
$$;

-- Trigger para criar perfil automaticamente (execute apenas uma vez manualmente)
-- Você precisa rodar isso manualmente no SQL Editor depois:
-- CREATE TRIGGER on_auth_user_created
--   AFTER INSERT ON auth.users
--   FOR EACH ROW
--   EXECUTE FUNCTION public.handle_new_user();

-- Função para balance update on trade close
CREATE OR REPLACE FUNCTION public.handle_trade_balance_on_insert()
RETURNS TRIGGER AS $$
BEGIN
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public';

CREATE OR REPLACE FUNCTION public.handle_trade_balance_on_update()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status IN ('won', 'lost') AND OLD.status = 'open' THEN
    IF NEW.is_demo THEN
      UPDATE public.profiles 
      SET demo_balance = demo_balance + COALESCE(NEW.result, 0),
          updated_at = now()
      WHERE user_id = NEW.user_id;
    ELSE
      UPDATE public.profiles 
      SET balance = balance + COALESCE(NEW.result, 0),
          updated_at = now()
      WHERE user_id = NEW.user_id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public';

CREATE TRIGGER trigger_trade_balance_insert
  AFTER INSERT ON public.trades
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_trade_balance_on_insert();

CREATE TRIGGER trigger_trade_balance_update
  AFTER UPDATE ON public.trades
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_trade_balance_on_update();

-- Função para processar comissão de afiliados
CREATE OR REPLACE FUNCTION public.process_affiliate_commission()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_referral_id uuid;
  v_affiliate_id uuid;
  v_commission_percentage numeric;
  v_trade_result numeric;
  v_commission_amount numeric;
  v_transaction_id uuid;
BEGIN
  IF NEW.status IN ('won', 'lost') AND NEW.result IS NOT NULL AND OLD.status = 'open' THEN
    
    SELECT id, affiliate_id INTO v_referral_id, v_affiliate_id
    FROM public.referrals
    WHERE referred_user_id = NEW.user_id
      AND status = 'active'
    LIMIT 1;
    
    IF v_referral_id IS NOT NULL THEN
      
      SELECT commission_percentage INTO v_commission_percentage
      FROM public.affiliates
      WHERE id = v_affiliate_id
        AND is_active = true;
      
      IF v_commission_percentage IS NOT NULL THEN
        
        v_trade_result := NEW.result;
        v_commission_amount := (v_trade_result * -1) * (v_commission_percentage / 100);
        
        INSERT INTO public.transactions (user_id, type, amount, status, notes)
        VALUES (
          NEW.user_id,
          'commission',
          ABS(v_commission_amount),
          'completed',
          CASE 
            WHEN v_commission_amount > 0 THEN 'Comissão de afiliado gerada'
            ELSE 'Dedução de comissão de afiliado'
          END
        )
        RETURNING id INTO v_transaction_id;
        
        INSERT INTO public.commissions (
          affiliate_id,
          referral_id,
          amount,
          transaction_id
        ) VALUES (
          v_affiliate_id,
          v_referral_id,
          v_commission_amount,
          v_transaction_id
        );
        
        UPDATE public.affiliates
        SET 
          total_commission = COALESCE(total_commission, 0) + v_commission_amount,
          updated_at = now()
        WHERE id = v_affiliate_id;
      END IF;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_process_affiliate_commission
  AFTER UPDATE ON public.trades
  FOR EACH ROW
  EXECUTE FUNCTION public.process_affiliate_commission();

-- Função para processar single trade expirado
CREATE OR REPLACE FUNCTION public.process_single_expired_trade(p_trade_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_trade record;
  v_exit_price numeric;
  v_result numeric;
  v_status text;
BEGIN
  SELECT * INTO v_trade
  FROM trades
  WHERE id = p_trade_id
    AND status = 'open'
  FOR UPDATE;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Trade not found or already processed'
    );
  END IF;
  
  SELECT close INTO v_exit_price
  FROM candles
  WHERE asset_id = v_trade.asset_id
    AND timestamp <= v_trade.expires_at
    AND timeframe = '1m'
  ORDER BY timestamp DESC
  LIMIT 1;
  
  IF v_exit_price IS NULL THEN
    v_exit_price := v_trade.entry_price;
  END IF;
  
  IF v_trade.trade_type = 'call' THEN
    v_status := CASE WHEN v_exit_price > v_trade.entry_price THEN 'won' ELSE 'lost' END;
  ELSE
    v_status := CASE WHEN v_exit_price < v_trade.entry_price THEN 'won' ELSE 'lost' END;
  END IF;
  
  IF v_status = 'won' THEN
    v_result := v_trade.amount + v_trade.payout;
  ELSE
    v_result := 0;
  END IF;
  
  UPDATE trades
  SET 
    status = v_status,
    exit_price = v_exit_price,
    result = v_result,
    closed_at = NOW()
  WHERE id = v_trade.id;
  
  RETURN jsonb_build_object(
    'success', true,
    'trade_id', v_trade.id,
    'status', v_status,
    'result', v_result
  );
END;
$$;

-- Função para obter booster ativo
CREATE OR REPLACE FUNCTION public.get_user_active_booster(p_user_id UUID)
RETURNS TABLE (
  payout_increase_percentage INTEGER,
  expires_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    payout_increase_percentage,
    expires_at
  FROM user_boosters
  WHERE user_id = p_user_id
    AND is_active = true
    AND expires_at > now()
  ORDER BY expires_at DESC
  LIMIT 1;
$$;

-- Função para desativar boosters expirados
CREATE OR REPLACE FUNCTION public.deactivate_expired_boosters()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  UPDATE user_boosters
  SET is_active = false
  WHERE is_active = true
    AND expires_at <= now();
  
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

-- Função para Copy Trade
CREATE OR REPLACE FUNCTION public.process_copy_trade()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_copy_trader RECORD;
  v_follower RECORD;
  v_follower_balance NUMERIC;
  v_copy_amount NUMERIC;
  v_new_trade_id UUID;
BEGIN
  IF TG_OP = 'INSERT' AND NEW.status = 'open' THEN
    
    SELECT * INTO v_copy_trader
    FROM copy_traders
    WHERE user_id = NEW.user_id AND is_active = true;
    
    IF FOUND THEN
      FOR v_follower IN
        SELECT 
          ctf.*, 
          CASE 
            WHEN NEW.is_demo THEN p.demo_balance 
            ELSE p.balance 
          END as available_balance,
          p.user_id as profile_user_id
        FROM copy_trade_followers ctf
        JOIN profiles p ON p.user_id = ctf.follower_user_id
        WHERE ctf.copy_trader_id = v_copy_trader.id
          AND ctf.is_active = true
      LOOP
        v_copy_amount := NEW.amount * (v_follower.allocation_percentage / 100);
        
        IF v_follower.max_trade_amount IS NOT NULL AND v_copy_amount > v_follower.max_trade_amount THEN
          v_copy_amount := v_follower.max_trade_amount;
        END IF;
        
        IF v_follower.available_balance >= v_copy_amount THEN
          INSERT INTO trades (
            user_id, asset_id, trade_type, amount, payout, 
            duration_minutes, entry_price, expires_at, is_demo, status
          )
          VALUES (
            v_follower.follower_user_id,
            NEW.asset_id,
            NEW.trade_type,
            v_copy_amount,
            v_copy_amount * (NEW.payout / NEW.amount),
            NEW.duration_minutes,
            NEW.entry_price,
            NEW.expires_at,
            NEW.is_demo,
            'open'
          )
          RETURNING id INTO v_new_trade_id;
          
          INSERT INTO copied_trades (
            original_trade_id, copy_trader_id, follower_user_id, 
            copied_trade_id, status
          )
          VALUES (
            NEW.id, v_copy_trader.id, v_follower.follower_user_id,
            v_new_trade_id, 'executed'
          );
          
          UPDATE copy_trade_followers
          SET total_copied_trades = COALESCE(total_copied_trades, 0) + 1
          WHERE id = v_follower.id;
          
        ELSE
          INSERT INTO copied_trades (
            original_trade_id, copy_trader_id, follower_user_id,
            status, failure_reason
          )
          VALUES (
            NEW.id, v_copy_trader.id, v_follower.follower_user_id,
            'skipped', 'Insufficient balance'
          );
        END IF;
      END LOOP;
      
      UPDATE copy_traders
      SET total_trades = COALESCE(total_trades, 0) + 1
      WHERE id = v_copy_trader.id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_trade_created_copy
  AFTER INSERT ON public.trades
  FOR EACH ROW EXECUTE FUNCTION public.process_copy_trade();

-- Função para notificar admins
CREATE OR REPLACE FUNCTION public.notify_admins_on_event()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  notification_type text;
  user_name text;
  amount_value numeric;
  user_id_value uuid;
BEGIN
  CASE TG_TABLE_NAME
    WHEN 'transactions' THEN
      IF NEW.type = 'deposit' AND NEW.status = 'completed' AND (OLD IS NULL OR OLD.status != 'completed') THEN
        notification_type := 'new_deposit';
        amount_value := NEW.amount;
        user_id_value := NEW.user_id;
      ELSIF NEW.type = 'withdrawal' AND NEW.status = 'pending' AND (OLD IS NULL OR OLD.status != 'pending') THEN
        notification_type := 'withdrawal_request';
        amount_value := NEW.amount;
        user_id_value := NEW.user_id;
      ELSE
        RETURN NEW;
      END IF;
      
    WHEN 'verification_requests' THEN
      IF NEW.status = 'under_review' AND (OLD IS NULL OR OLD.status != 'under_review') THEN
        notification_type := 'identity_verification';
        user_id_value := NEW.user_id;
      ELSE
        RETURN NEW;
      END IF;
      
    WHEN 'withdrawal_requests' THEN
      IF NEW.status = 'pending' AND (OLD IS NULL OR OLD.status != 'pending') THEN
        notification_type := 'affiliate_withdrawal';
        amount_value := NEW.amount;
        SELECT a.user_id INTO user_id_value
        FROM affiliates a
        WHERE a.id = NEW.affiliate_id;
      ELSE
        RETURN NEW;
      END IF;
      
    WHEN 'profiles' THEN
      IF TG_OP = 'INSERT' THEN
        notification_type := 'new_user';
        user_id_value := NEW.user_id;
        user_name := NEW.full_name;
      ELSE
        RETURN NEW;
      END IF;
      
    ELSE
      RETURN NEW;
  END CASE;
  
  IF user_name IS NULL AND user_id_value IS NOT NULL THEN
    SELECT full_name INTO user_name
    FROM profiles
    WHERE user_id = user_id_value;
  END IF;
  
  INSERT INTO public.admin_notification_queue (
    notification_type,
    user_id,
    user_name,
    amount,
    created_at
  ) VALUES (
    notification_type,
    user_id_value,
    user_name,
    amount_value,
    now()
  );
  
  RETURN NEW;
END;
$$;

-- Triggers para notificações
CREATE TRIGGER notify_admins_on_transaction
  AFTER INSERT OR UPDATE ON public.transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_admins_on_event();

CREATE TRIGGER notify_admins_on_verification
  AFTER INSERT OR UPDATE ON public.verification_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_admins_on_event();

CREATE TRIGGER notify_admins_on_affiliate_withdrawal
  AFTER INSERT OR UPDATE ON public.withdrawal_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_admins_on_event();

CREATE TRIGGER notify_admins_on_new_user
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_admins_on_event();


-- ============================================
-- PARTE 5: POLÍTICAS RLS COMPLETAS
-- ============================================

-- profiles
CREATE POLICY "Users can view their own profile" ON public.profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins can view all profiles" ON public.profiles FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can update all profiles" ON public.profiles FOR UPDATE USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- trades
CREATE POLICY "Users can view their own trades" ON public.trades FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own trades" ON public.trades FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own trades" ON public.trades FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all trades" ON public.trades FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can update all trades" ON public.trades FOR UPDATE USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can delete trades" ON public.trades FOR DELETE USING (has_role(auth.uid(), 'admin'::app_role));

-- transactions
CREATE POLICY "Users can view their own transactions" ON public.transactions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own transactions" ON public.transactions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins can view all transactions" ON public.transactions FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can update all transactions" ON public.transactions FOR UPDATE USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can delete transactions" ON public.transactions FOR DELETE USING (has_role(auth.uid(), 'admin'::app_role));

-- user_roles
CREATE POLICY "Users can view their own roles" ON public.user_roles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all roles" ON public.user_roles FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can manage roles" ON public.user_roles FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- verification_requests
CREATE POLICY "Users can view their own verification requests" ON public.verification_requests FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own verification requests" ON public.verification_requests FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins can view all verification requests" ON public.verification_requests FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can update verification requests" ON public.verification_requests FOR UPDATE USING (has_role(auth.uid(), 'admin'::app_role));

-- platform_settings
CREATE POLICY "Admins can manage platform settings" ON public.platform_settings FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Allow public read access to platform settings" ON public.platform_settings FOR SELECT USING (true);
CREATE POLICY "Allow admin to update platform settings" ON public.platform_settings FOR UPDATE USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.user_id = auth.uid() AND profiles.is_admin = true));
CREATE POLICY "Allow admin to insert platform settings" ON public.platform_settings FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.user_id = auth.uid() AND profiles.is_admin = true));

-- payment_gateways
CREATE POLICY "Admins can manage payment gateways" ON public.payment_gateways FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- platform_popups
CREATE POLICY "Admins can manage popups" ON public.platform_popups FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Users can view active popups" ON public.platform_popups FOR SELECT USING (is_active = true AND (start_date IS NULL OR start_date <= now()) AND (end_date IS NULL OR end_date >= now()));

-- affiliates
CREATE POLICY "Admins can manage all affiliates" ON public.affiliates FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Users can view their own affiliate data" ON public.affiliates FOR SELECT USING (auth.uid() = user_id);

-- referrals
CREATE POLICY "Admins can manage all referrals" ON public.referrals FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- commissions
CREATE POLICY "Admins can manage all commissions" ON public.commissions FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- withdrawal_requests
CREATE POLICY "Affiliates can view their own withdrawal requests" ON public.withdrawal_requests FOR SELECT USING (affiliate_id IN (SELECT id FROM public.affiliates WHERE user_id = auth.uid()));
CREATE POLICY "Affiliates can create their own withdrawal requests" ON public.withdrawal_requests FOR INSERT WITH CHECK (affiliate_id IN (SELECT id FROM public.affiliates WHERE user_id = auth.uid()));
CREATE POLICY "Admins can manage all withdrawal requests" ON public.withdrawal_requests FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- affiliate_custom_links
CREATE POLICY "Affiliates can view their own custom links" ON public.affiliate_custom_links FOR SELECT USING (affiliate_id IN (SELECT id FROM public.affiliates WHERE user_id = auth.uid()));
CREATE POLICY "Affiliates can create their own custom links" ON public.affiliate_custom_links FOR INSERT WITH CHECK (affiliate_id IN (SELECT id FROM public.affiliates WHERE user_id = auth.uid()));
CREATE POLICY "Affiliates can update their own custom links" ON public.affiliate_custom_links FOR UPDATE USING (affiliate_id IN (SELECT id FROM public.affiliates WHERE user_id = auth.uid()));
CREATE POLICY "Affiliates can delete their own custom links" ON public.affiliate_custom_links FOR DELETE USING (affiliate_id IN (SELECT id FROM public.affiliates WHERE user_id = auth.uid()));
CREATE POLICY "Admins can manage all custom links" ON public.affiliate_custom_links FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- legal_documents
CREATE POLICY "Todos podem visualizar documentos legais ativos" ON public.legal_documents FOR SELECT USING (is_active = true);
CREATE POLICY "Admins podem gerenciar documentos legais" ON public.legal_documents FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- company_info
CREATE POLICY "Todos podem visualizar informações da empresa" ON public.company_info FOR SELECT USING (true);
CREATE POLICY "Admins podem gerenciar informações da empresa" ON public.company_info FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- boosters
CREATE POLICY "Boosters are viewable by everyone" ON public.boosters FOR SELECT USING (is_active = true);
CREATE POLICY "Admins can manage boosters" ON public.boosters FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- user_boosters
CREATE POLICY "Users can view their own active boosters" ON public.user_boosters FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own boosters" ON public.user_boosters FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins can view all user boosters" ON public.user_boosters FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can update all user boosters" ON public.user_boosters FOR UPDATE USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can delete user boosters" ON public.user_boosters FOR DELETE USING (has_role(auth.uid(), 'admin'::app_role));

-- candles
CREATE POLICY "Candles are viewable by everyone" ON public.candles FOR SELECT USING (true);
CREATE POLICY "Admins can manage candles" ON public.candles FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- chart_manipulations
CREATE POLICY "Admins can view all manipulations" ON public.chart_manipulations FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can create manipulations" ON public.chart_manipulations FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can update manipulations" ON public.chart_manipulations FOR UPDATE USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can delete manipulations" ON public.chart_manipulations FOR DELETE USING (has_role(auth.uid(), 'admin'::app_role));

-- chart_biases
CREATE POLICY "Admins can view all biases" ON public.chart_biases FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can create biases" ON public.chart_biases FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can update biases" ON public.chart_biases FOR UPDATE USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can delete biases" ON public.chart_biases FOR DELETE USING (has_role(auth.uid(), 'admin'::app_role));

-- chart_appearance_settings
CREATE POLICY "Admins can manage chart appearance" ON public.chart_appearance_settings FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Everyone can view chart appearance" ON public.chart_appearance_settings FOR SELECT USING (true);

-- chart_drawings
CREATE POLICY "Users can view their own drawings" ON public.chart_drawings FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own drawings" ON public.chart_drawings FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own drawings" ON public.chart_drawings FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own drawings" ON public.chart_drawings FOR DELETE USING (auth.uid() = user_id);

-- social_auth_providers
CREATE POLICY "Admins podem gerenciar provedores OAuth" ON public.social_auth_providers FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Todos podem ver provedores OAuth ativos" ON public.social_auth_providers FOR SELECT USING (is_enabled = true);

-- copy_trade_requests
CREATE POLICY "Users can create their own requests" ON public.copy_trade_requests FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can view their own requests" ON public.copy_trade_requests FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can manage all requests" ON public.copy_trade_requests FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- copy_traders
CREATE POLICY "Everyone can view active copy traders" ON public.copy_traders FOR SELECT USING (is_active = true);
CREATE POLICY "Users can view their own copy trader profile" ON public.copy_traders FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update their own copy trader profile" ON public.copy_traders FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Admins can manage all copy traders" ON public.copy_traders FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- copy_trade_followers
CREATE POLICY "Copy traders can manage their followers" ON public.copy_trade_followers FOR ALL USING (copy_trader_id IN (SELECT id FROM public.copy_traders WHERE user_id = auth.uid()));
CREATE POLICY "Followers can view their own subscriptions" ON public.copy_trade_followers FOR SELECT USING (auth.uid() = follower_user_id);
CREATE POLICY "Followers can subscribe to copy traders" ON public.copy_trade_followers FOR INSERT WITH CHECK (auth.uid() = follower_user_id);
CREATE POLICY "Followers can update their own subscriptions" ON public.copy_trade_followers FOR UPDATE USING (auth.uid() = follower_user_id);
CREATE POLICY "Followers can unsubscribe" ON public.copy_trade_followers FOR DELETE USING (auth.uid() = follower_user_id);
CREATE POLICY "Admins can manage all followers" ON public.copy_trade_followers FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- copied_trades
CREATE POLICY "Users can view their own copied trades" ON public.copied_trades FOR SELECT USING (auth.uid() = follower_user_id);
CREATE POLICY "Copy traders can view copies of their trades" ON public.copied_trades FOR SELECT USING (copy_trader_id IN (SELECT id FROM public.copy_traders WHERE user_id = auth.uid()));
CREATE POLICY "Admins can manage all copied trades" ON public.copied_trades FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- push_subscriptions
CREATE POLICY "Users can manage their own push subscriptions" ON public.push_subscriptions FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Allow anonymous push subscriptions" ON public.push_subscriptions FOR INSERT WITH CHECK (user_id IS NULL);
CREATE POLICY "Admins can read all push subscriptions" ON public.push_subscriptions FOR SELECT USING (EXISTS (SELECT 1 FROM user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'admin'));
CREATE POLICY "Admins can delete push subscriptions" ON public.push_subscriptions FOR DELETE USING (EXISTS (SELECT 1 FROM public.user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'admin'::app_role));

-- admin_notification_queue
CREATE POLICY "Admins can manage notification queue" ON public.admin_notification_queue FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- assets (admin policies)
CREATE POLICY "Admins can insert assets" ON public.assets FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can update assets" ON public.assets FOR UPDATE USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can delete assets" ON public.assets FOR DELETE USING (has_role(auth.uid(), 'admin'::app_role));


-- ============================================
-- PARTE 6: STORAGE BUCKETS
-- ============================================

INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true);
INSERT INTO storage.buckets (id, name, public) VALUES ('verification-documents', 'verification-documents', false);
INSERT INTO storage.buckets (id, name, public) VALUES ('popup-images', 'popup-images', true);
INSERT INTO storage.buckets (id, name, public) VALUES ('chart-backgrounds', 'chart-backgrounds', true);

-- Storage policies for avatars
CREATE POLICY "Avatar images are publicly accessible" ON storage.objects FOR SELECT USING (bucket_id = 'avatars');
CREATE POLICY "Users can upload their own avatar" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users can update their own avatar" ON storage.objects FOR UPDATE USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users can delete their own avatar" ON storage.objects FOR DELETE USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Storage policies for verification-documents
CREATE POLICY "Users can upload their own verification documents" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'verification-documents' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users can view their own verification documents" ON storage.objects FOR SELECT USING (bucket_id = 'verification-documents' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Admins can view all verification documents" ON storage.objects FOR SELECT USING (bucket_id = 'verification-documents' AND has_role(auth.uid(), 'admin'::app_role));

-- Storage policies for popup-images
CREATE POLICY "Anyone can view popup images" ON storage.objects FOR SELECT USING (bucket_id = 'popup-images');
CREATE POLICY "Admins can upload popup images" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'popup-images' AND has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can update popup images" ON storage.objects FOR UPDATE USING (bucket_id = 'popup-images' AND has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can delete popup images" ON storage.objects FOR DELETE USING (bucket_id = 'popup-images' AND has_role(auth.uid(), 'admin'::app_role));

-- Storage policies for chart-backgrounds
CREATE POLICY "Admins can upload chart backgrounds" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'chart-backgrounds' AND has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can update chart backgrounds" ON storage.objects FOR UPDATE USING (bucket_id = 'chart-backgrounds' AND has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can delete chart backgrounds" ON storage.objects FOR DELETE USING (bucket_id = 'chart-backgrounds' AND has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Everyone can view chart backgrounds" ON storage.objects FOR SELECT USING (bucket_id = 'chart-backgrounds');


-- ============================================
-- PARTE 7: REALTIME
-- ============================================

ALTER TABLE public.profiles REPLICA IDENTITY FULL;
ALTER TABLE public.trades REPLICA IDENTITY FULL;

-- Adicionar tabelas à publicação do realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.candles;
ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;
ALTER PUBLICATION supabase_realtime ADD TABLE public.trades;
ALTER PUBLICATION supabase_realtime ADD TABLE public.copy_trade_requests;
ALTER PUBLICATION supabase_realtime ADD TABLE public.copy_traders;
ALTER PUBLICATION supabase_realtime ADD TABLE public.copy_trade_followers;
```

---

## 🔧 PASSO 2: CRIAR TRIGGER DE AUTH (Execute manualmente)

Após rodar o PASSO 1, execute este SQL separadamente no SQL Editor:

```sql
-- Trigger para criar perfil automaticamente quando usuário se registra
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
```

---

## 📊 PASSO 3: EXPORTAR DADOS DO PROJETO ORIGINAL

Rode este script no **SQL Editor do projeto ORIGINAL** para exportar os dados:

```sql
-- EXPORTAR TODOS OS DADOS DE CONFIGURAÇÃO

-- 1. ASSETS
SELECT 'INSERT INTO assets (id, symbol, name, payout_percentage, is_active, icon_url, auto_generate_candles, created_at) VALUES (' ||
  quote_literal(id) || ',' ||
  quote_literal(symbol) || ',' ||
  quote_literal(name) || ',' ||
  payout_percentage || ',' ||
  is_active || ',' ||
  COALESCE(quote_literal(icon_url), 'NULL') || ',' ||
  COALESCE(auto_generate_candles::text, 'true') || ',' ||
  quote_literal(created_at) || ');'
FROM assets;

-- 2. BOOSTERS
SELECT 'INSERT INTO boosters (id, name, description, payout_increase_percentage, duration_minutes, price, is_active, display_order, icon, name_en, name_es, description_en, description_es) VALUES (' ||
  quote_literal(id) || ',' ||
  quote_literal(name) || ',' ||
  quote_literal(description) || ',' ||
  payout_increase_percentage || ',' ||
  duration_minutes || ',' ||
  price || ',' ||
  is_active || ',' ||
  display_order || ',' ||
  COALESCE(quote_literal(icon), 'NULL') || ',' ||
  COALESCE(quote_literal(name_en), 'NULL') || ',' ||
  COALESCE(quote_literal(name_es), 'NULL') || ',' ||
  COALESCE(quote_literal(description_en), 'NULL') || ',' ||
  COALESCE(quote_literal(description_es), 'NULL') || ');'
FROM boosters;

-- 3. PLATFORM_SETTINGS
SELECT 'INSERT INTO platform_settings (id, key, value, description) VALUES (' ||
  quote_literal(id) || ',' ||
  quote_literal(key) || ',' ||
  quote_literal(value) || ',' ||
  COALESCE(quote_literal(description), 'NULL') || ') ON CONFLICT (key) DO NOTHING;'
FROM platform_settings;

-- 4. LEGAL_DOCUMENTS
SELECT 'INSERT INTO legal_documents (id, title, slug, description, content, icon, is_active, display_order) VALUES (' ||
  quote_literal(id) || ',' ||
  quote_literal(title) || ',' ||
  quote_literal(slug) || ',' ||
  quote_literal(description) || ',' ||
  COALESCE(quote_literal(content), 'NULL') || ',' ||
  quote_literal(icon) || ',' ||
  is_active || ',' ||
  display_order || ') ON CONFLICT (slug) DO NOTHING;'
FROM legal_documents;

-- 5. COMPANY_INFO
SELECT 'INSERT INTO company_info (id, key, value, description) VALUES (' ||
  quote_literal(id) || ',' ||
  quote_literal(key) || ',' ||
  quote_literal(value) || ',' ||
  COALESCE(quote_literal(description), 'NULL') || ') ON CONFLICT (key) DO NOTHING;'
FROM company_info;

-- 6. SOCIAL_AUTH_PROVIDERS
SELECT 'INSERT INTO social_auth_providers (id, provider, is_enabled, client_id, client_secret, instructions, config) VALUES (' ||
  quote_literal(id) || ',' ||
  quote_literal(provider) || ',' ||
  is_enabled || ',' ||
  COALESCE(quote_literal(client_id), 'NULL') || ',' ||
  COALESCE(quote_literal(client_secret), 'NULL') || ',' ||
  COALESCE(quote_literal(instructions), 'NULL') || ',' ||
  COALESCE(quote_literal(config::text), '''{}''') || ') ON CONFLICT (provider) DO NOTHING;'
FROM social_auth_providers;

-- 7. PAYMENT_GATEWAYS
SELECT 'INSERT INTO payment_gateways (id, name, type, is_active, api_key, api_secret, webhook_url, config) VALUES (' ||
  quote_literal(id) || ',' ||
  quote_literal(name) || ',' ||
  quote_literal(type) || ',' ||
  COALESCE(is_active::text, 'true') || ',' ||
  COALESCE(quote_literal(api_key), 'NULL') || ',' ||
  COALESCE(quote_literal(api_secret), 'NULL') || ',' ||
  COALESCE(quote_literal(webhook_url), 'NULL') || ',' ||
  COALESCE(quote_literal(config::text), '''{}''') || ');'
FROM payment_gateways;
```

Copie todos os resultados (INSERTs) e cole no SQL Editor do projeto NOVO.

---

## ⚙️ PASSO 4: CONFIGURAR SECRETS

No projeto NOVO, vá em **Settings > Edge Functions > Secrets** e adicione:

### ⚠️ IMPORTANTE: Secrets Automáticos vs Manuais

Os seguintes secrets são **AUTOMÁTICOS** e já existem internamente no Supabase (NÃO adicione manualmente):
- ❌ `SUPABASE_URL` - Já existe automaticamente
- ❌ `SUPABASE_ANON_KEY` - Já existe automaticamente  
- ❌ `SUPABASE_SERVICE_ROLE_KEY` - Já existe automaticamente
- ❌ `SUPABASE_DB_URL` - Já existe automaticamente

### ✅ Secrets que você DEVE adicionar manualmente:

| Secret | Descrição | Quando usar |
|--------|-----------|-------------|
| `STRIPE_SECRET_KEY` | Chave secreta do Stripe | Se usar pagamentos Stripe |
| `STRIPE_PUBLISHABLE_KEY` | Chave pública do Stripe | Se usar pagamentos Stripe |
| `STRIPE_WEBHOOK_SECRET` | Secret do webhook Stripe | Se usar pagamentos Stripe |
| `VAPID_PUBLIC_KEY` | Chave pública VAPID | Se usar notificações push |
| `VAPID_PRIVATE_KEY` | Chave privada VAPID | Se usar notificações push |
| `ADMIN_PANEL_PASSWORD` | Senha do painel admin | Sempre necessário |
| `COINBASE_API_KEY` | API key Coinbase Commerce | Se usar pagamentos Coinbase |
| `COINBASE_WEBHOOK_SECRET` | Secret webhook Coinbase | Se usar pagamentos Coinbase |

> **Nota:** A tela de Secrets pode parecer "em branco" mesmo após a criação do projeto. Isso é normal! Os secrets do Supabase existem internamente mas não aparecem na lista.

---

## 🔗 PASSO 5: ATUALIZAR .env DO FRONTEND

No repositório clonado, atualize o arquivo `.env`:

```env
VITE_SUPABASE_URL=https://SEU_NOVO_PROJETO.supabase.co
VITE_SUPABASE_ANON_KEY=sua_nova_anon_key
VITE_STRIPE_PUBLISHABLE_KEY=sua_stripe_publishable_key
```

---

## ✅ CHECKLIST FINAL

- [ ] SQL do PASSO 1 executado no projeto NOVO
- [ ] Trigger de auth (PASSO 2) criado
- [ ] Dados exportados do projeto ORIGINAL
- [ ] Dados importados no projeto NOVO
- [ ] Secrets configurados
- [ ] .env atualizado no repositório
- [ ] Deploy no Vercel configurado

---

**Pronto!** Seu banco de dados está clonado e pronto para uso.
