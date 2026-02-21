# 🗄️ Guia Completo: Clone do Banco de Dados Supabase

Este documento contém TUDO que você precisa para clonar o banco de dados para um novo projeto Supabase.
**Atualizado em: 21/02/2026 - Versão 4.1 (Resale Edition)**

---

## 📋 PASSOS RESUMIDOS

1. **Criar novo projeto Supabase** em [supabase.com](https://supabase.com)
2. **Executar PASSO 1** - Estrutura do banco de dados (SQL)
3. **Executar PASSO 2** - Dados seed (configurações, assets, etc.)
4. **Executar PASSO 3** - Configurar Storage Buckets
5. **Executar PASSO 4** - Configurar Realtime
6. **Executar PASSO 5** - Configurar Cron Jobs
7. **Executar PASSO 6** - Configurar Secrets do Supabase
8. **Executar PASSO 7** - Deploy das Edge Functions (CRÍTICO!)
9. **Executar PASSO 8** - Variáveis de ambiente (Vercel/Hosting)
10. **Executar PASSO 9** - Criar primeiro Admin
11. **Executar PASSO 10** - Configurar Webhooks externos

---

> ⚠️ **AVISO IMPORTANTE SOBRE URLs NOS DADOS SEED:**
> Os dados seed (PASSO 2) contém URLs de ícones de assets e imagens de fundo do gráfico que apontam para o projeto Supabase ORIGINAL. Após executar o PASSO 2, você deve:
> 1. Fazer upload das suas próprias imagens nos buckets do seu projeto
> 2. Atualizar as URLs na tabela `assets` (coluna `icon_url`) e `chart_appearance_settings` (colunas `map_image_url*`)
> 3. Ou simplesmente usar URLs públicas de ícones (ex: cryptologos.cc)

## 🔧 PASSO 1: ESTRUTURA DO BANCO DE DADOS

Cole TODO o SQL abaixo no **SQL Editor do seu NOVO projeto Supabase**:

```sql
-- ============================================
-- PARTE 1: CRIAR ENUMS E TIPOS
-- ============================================

CREATE TYPE public.verification_status AS ENUM ('pending', 'under_review', 'approved', 'rejected');
CREATE TYPE public.document_type AS ENUM ('rg', 'cnh');
CREATE TYPE public.entity_type AS ENUM ('individual', 'business');
CREATE TYPE public.app_role AS ENUM ('admin', 'user');


-- ============================================
-- PARTE 2: TABELA USER_ROLES (DEVE SER CRIADA PRIMEIRO)
-- ============================================
-- IMPORTANTE: Esta tabela precisa existir ANTES da função has_role()

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;


-- ============================================
-- PARTE 3: FUNÇÕES AUXILIARES
-- ============================================

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger AS $$
BEGIN
  new.updated_at = now();
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

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

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Policies para user_roles (após has_role estar definida)
CREATE POLICY "Users can view their own roles" ON public.user_roles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all roles" ON public.user_roles FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can manage roles" ON public.user_roles FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));


-- ============================================
-- PARTE 4: TABELAS PRINCIPAIS
-- ============================================

-- Tabela: assets
CREATE TABLE public.assets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  symbol TEXT NOT NULL,
  icon_url TEXT,
  payout_percentage INTEGER NOT NULL DEFAULT 91,
  is_active BOOLEAN NOT NULL DEFAULT true,
  auto_generate_candles BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.assets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Assets are viewable by everyone" ON public.assets FOR SELECT USING (true);
CREATE POLICY "Admins can insert assets" ON public.assets FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can update assets" ON public.assets FOR UPDATE USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can delete assets" ON public.assets FOR DELETE USING (has_role(auth.uid(), 'admin'::app_role));

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
  phone TEXT,
  email TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own profile" ON public.profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all profiles" ON public.profiles FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can update all profiles" ON public.profiles FOR UPDATE USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Affiliates can view referred profiles" ON public.profiles FOR SELECT USING (user_id IN (SELECT r.referred_user_id FROM referrals r JOIN affiliates a ON a.id = r.affiliate_id WHERE a.user_id = auth.uid()));

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();


-- Tabela: trades
CREATE TABLE public.trades (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  asset_id UUID NOT NULL REFERENCES public.assets(id),
  trade_type TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  payout NUMERIC NOT NULL,
  duration_minutes INTEGER NOT NULL,
  entry_price NUMERIC,
  exit_price NUMERIC,
  status TEXT NOT NULL DEFAULT 'open',
  result NUMERIC,
  is_demo BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  closed_at TIMESTAMP WITH TIME ZONE
);

ALTER TABLE public.trades ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own trades" ON public.trades FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own trades" ON public.trades FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own trades" ON public.trades FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all trades" ON public.trades FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can update all trades" ON public.trades FOR UPDATE USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can delete trades" ON public.trades FOR DELETE USING (has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX idx_trades_user_id ON public.trades(user_id);
CREATE INDEX idx_trades_status ON public.trades(status);
CREATE INDEX idx_trades_created_at ON public.trades(created_at DESC);
CREATE INDEX idx_trades_user_status ON public.trades(user_id, status);
CREATE INDEX idx_trades_user_status_expires ON public.trades(user_id, status, expires_at);
CREATE INDEX idx_trades_expired_open ON public.trades(status, expires_at) WHERE status = 'open';

-- Tabela: transactions
CREATE TABLE public.transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  type TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  payment_method TEXT,
  payment_currency TEXT DEFAULT 'USD',
  transaction_reference TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own transactions" ON public.transactions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own transactions" ON public.transactions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins can view all transactions" ON public.transactions FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can update all transactions" ON public.transactions FOR UPDATE USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can delete transactions" ON public.transactions FOR DELETE USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Affiliates can view referred deposits" ON public.transactions FOR SELECT USING ((type = 'deposit') AND (user_id IN (SELECT r.referred_user_id FROM referrals r JOIN affiliates a ON a.id = r.affiliate_id WHERE a.user_id = auth.uid())));

CREATE TRIGGER update_transactions_updated_at
BEFORE UPDATE ON public.transactions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_transactions_user_id ON public.transactions(user_id);
CREATE INDEX idx_transactions_status ON public.transactions(status);

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

CREATE POLICY "Users can view their own verification requests" ON public.verification_requests FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own verification requests" ON public.verification_requests FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins can view all verification requests" ON public.verification_requests FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can update verification requests" ON public.verification_requests FOR UPDATE USING (has_role(auth.uid(), 'admin'::app_role));

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

CREATE POLICY "Allow public read access to platform settings" ON public.platform_settings FOR SELECT USING (true);
CREATE POLICY "Admins can manage platform settings" ON public.platform_settings FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Allow admin to insert platform settings" ON public.platform_settings FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND is_admin = true));
CREATE POLICY "Allow admin to update platform settings" ON public.platform_settings FOR UPDATE USING (EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND is_admin = true));

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

CREATE TRIGGER update_platform_settings_trigger
  BEFORE UPDATE ON public.platform_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_platform_settings_updated_at();

-- Tabela: payment_gateways
CREATE TABLE public.payment_gateways (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  api_key TEXT,
  api_secret TEXT,
  webhook_url TEXT,
  config JSONB DEFAULT '{}'::jsonb,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.payment_gateways ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage payment gateways" ON public.payment_gateways FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Anyone can view active payment gateways" ON public.payment_gateways FOR SELECT USING (is_active = true);

-- Tabela: platform_popups
CREATE TABLE public.platform_popups (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  image_url TEXT,
  video_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  show_once_per_day BOOLEAN DEFAULT false,
  start_date TIMESTAMP WITH TIME ZONE,
  end_date TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.platform_popups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view active popups" ON public.platform_popups FOR SELECT USING ((is_active = true) AND ((start_date IS NULL) OR (start_date <= now())) AND ((end_date IS NULL) OR (end_date >= now())));
CREATE POLICY "Admins can manage popups" ON public.platform_popups FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- Tabela: affiliates
CREATE TABLE public.affiliates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  affiliate_code TEXT NOT NULL UNIQUE,
  commission_percentage NUMERIC NOT NULL DEFAULT 10,
  commission_model TEXT NOT NULL DEFAULT 'rev',
  cpa_value NUMERIC,
  cpa_min_deposit NUMERIC,
  total_referrals INTEGER DEFAULT 0,
  total_commission NUMERIC DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.affiliates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own affiliate data" ON public.affiliates FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can manage all affiliates" ON public.affiliates FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_affiliates_updated_at
BEFORE UPDATE ON public.affiliates
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Tabela: referrals
CREATE TABLE public.referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_id UUID NOT NULL REFERENCES public.affiliates(id) ON DELETE CASCADE,
  referred_user_id UUID NOT NULL,
  cpa_paid BOOLEAN NOT NULL DEFAULT false,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage all referrals" ON public.referrals FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Affiliates can view their own referrals" ON public.referrals FOR SELECT USING (affiliate_id IN (SELECT id FROM affiliates WHERE user_id = auth.uid()));

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

CREATE POLICY "Admins can manage all commissions" ON public.commissions FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Affiliates can view their own commissions" ON public.commissions FOR SELECT USING (affiliate_id IN (SELECT id FROM affiliates WHERE user_id = auth.uid()));

-- Tabela: withdrawal_requests
CREATE TABLE public.withdrawal_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  affiliate_id UUID NOT NULL REFERENCES public.affiliates(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  payment_method TEXT NOT NULL,
  payment_details JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  processed_at TIMESTAMP WITH TIME ZONE,
  processed_by UUID,
  rejection_reason TEXT,
  notes TEXT,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.withdrawal_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Affiliates can view their own withdrawal requests" ON public.withdrawal_requests FOR SELECT USING (affiliate_id IN (SELECT id FROM affiliates WHERE user_id = auth.uid()));
CREATE POLICY "Affiliates can create their own withdrawal requests" ON public.withdrawal_requests FOR INSERT WITH CHECK (affiliate_id IN (SELECT id FROM affiliates WHERE user_id = auth.uid()));
CREATE POLICY "Admins can manage all withdrawal requests" ON public.withdrawal_requests FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_withdrawal_requests_updated_at
  BEFORE UPDATE ON public.withdrawal_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

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

CREATE POLICY "Affiliates can view their own custom links" ON public.affiliate_custom_links FOR SELECT USING (affiliate_id IN (SELECT id FROM affiliates WHERE user_id = auth.uid()));
CREATE POLICY "Affiliates can create their own custom links" ON public.affiliate_custom_links FOR INSERT WITH CHECK (affiliate_id IN (SELECT id FROM affiliates WHERE user_id = auth.uid()));
CREATE POLICY "Affiliates can update their own custom links" ON public.affiliate_custom_links FOR UPDATE USING (affiliate_id IN (SELECT id FROM affiliates WHERE user_id = auth.uid()));
CREATE POLICY "Affiliates can delete their own custom links" ON public.affiliate_custom_links FOR DELETE USING (affiliate_id IN (SELECT id FROM affiliates WHERE user_id = auth.uid()));
CREATE POLICY "Admins can manage all custom links" ON public.affiliate_custom_links FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_affiliate_custom_links_updated_at
BEFORE UPDATE ON public.affiliate_custom_links
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

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

CREATE POLICY "Todos podem visualizar documentos legais ativos" ON public.legal_documents FOR SELECT USING (is_active = true);
CREATE POLICY "Admins podem gerenciar documentos legais" ON public.legal_documents FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

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

CREATE POLICY "Todos podem visualizar informações da empresa" ON public.company_info FOR SELECT USING (true);
CREATE POLICY "Admins podem gerenciar informações da empresa" ON public.company_info FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

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
  payout_increase_percentage INTEGER NOT NULL,
  duration_minutes INTEGER NOT NULL,
  price NUMERIC NOT NULL,
  icon TEXT DEFAULT 'Zap',
  is_active BOOLEAN NOT NULL DEFAULT true,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.boosters ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Boosters are viewable by everyone" ON public.boosters FOR SELECT USING (is_active = true);
CREATE POLICY "Admins can manage boosters" ON public.boosters FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

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

CREATE POLICY "Users can view their own active boosters" ON public.user_boosters FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own boosters" ON public.user_boosters FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins can view all user boosters" ON public.user_boosters FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can update all user boosters" ON public.user_boosters FOR UPDATE USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can delete user boosters" ON public.user_boosters FOR DELETE USING (has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX idx_user_boosters_user_id ON public.user_boosters(user_id);

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

CREATE POLICY "Candles are viewable by everyone" ON public.candles FOR SELECT USING (true);
CREATE POLICY "Admins can manage candles" ON public.candles FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX idx_candles_asset_timeframe ON public.candles(asset_id, timeframe, timestamp DESC);
CREATE INDEX idx_candles_asset_timeframe_timestamp ON public.candles(asset_id, timeframe, timestamp);
CREATE INDEX idx_candles_recent ON public.candles(asset_id, timeframe, timestamp DESC);

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

CREATE POLICY "Admins can view all manipulations" ON public.chart_manipulations FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can create manipulations" ON public.chart_manipulations FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can update manipulations" ON public.chart_manipulations FOR UPDATE USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can delete manipulations" ON public.chart_manipulations FOR DELETE USING (has_role(auth.uid(), 'admin'::app_role));

-- Tabela: chart_biases
CREATE TABLE public.chart_biases (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  asset_id UUID NOT NULL REFERENCES public.assets(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  direction TEXT NOT NULL,
  strength NUMERIC NOT NULL DEFAULT 50,
  start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  end_time TIMESTAMP WITH TIME ZONE NOT NULL,
  admin_id UUID NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.chart_biases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all biases" ON public.chart_biases FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can create biases" ON public.chart_biases FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can update biases" ON public.chart_biases FOR UPDATE USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can delete biases" ON public.chart_biases FOR DELETE USING (has_role(auth.uid(), 'admin'::app_role));

CREATE OR REPLACE FUNCTION public.update_chart_biases_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_chart_biases_updated_at_trigger
  BEFORE UPDATE ON public.chart_biases
  FOR EACH ROW
  EXECUTE FUNCTION public.update_chart_biases_updated_at();

-- Tabela: chart_drawings
CREATE TABLE public.chart_drawings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  asset_id UUID NOT NULL REFERENCES public.assets(id) ON DELETE CASCADE,
  drawing_type TEXT NOT NULL,
  points JSONB NOT NULL,
  color TEXT NOT NULL DEFAULT '#22c55e',
  line_width INTEGER NOT NULL DEFAULT 2,
  line_style TEXT NOT NULL DEFAULT 'solid',
  timeframe TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.chart_drawings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own drawings" ON public.chart_drawings FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own drawings" ON public.chart_drawings FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own drawings" ON public.chart_drawings FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own drawings" ON public.chart_drawings FOR DELETE USING (auth.uid() = user_id);

-- Tabela: chart_appearance_settings
CREATE TABLE public.chart_appearance_settings (
  id UUID PRIMARY KEY DEFAULT '00000000-0000-0000-0000-000000000001',
  candle_up_color TEXT NOT NULL DEFAULT '#22c55e',
  candle_down_color TEXT NOT NULL DEFAULT '#ef4444',
  candle_up_color_dark TEXT DEFAULT '#22c55e',
  candle_down_color_dark TEXT DEFAULT '#ef4444',
  candle_up_color_light TEXT DEFAULT '#22c55e',
  candle_down_color_light TEXT DEFAULT '#ef4444',
  wick_up_color TEXT DEFAULT '#22c55e',
  wick_down_color TEXT DEFAULT '#ef4444',
  wick_up_color_dark TEXT DEFAULT '#22c55e',
  wick_down_color_dark TEXT DEFAULT '#ef4444',
  wick_up_color_light TEXT DEFAULT '#22c55e',
  wick_down_color_light TEXT DEFAULT '#ef4444',
  candle_border_up_color TEXT DEFAULT '#22c55e',
  candle_border_down_color TEXT DEFAULT '#ef4444',
  candle_border_up_color_dark TEXT DEFAULT '#22c55e',
  candle_border_down_color_dark TEXT DEFAULT '#ef4444',
  candle_border_up_color_light TEXT DEFAULT '#22c55e',
  candle_border_down_color_light TEXT DEFAULT '#ef4444',
  candle_border_visible BOOLEAN DEFAULT false,
  candle_border_width INTEGER DEFAULT 1,
  chart_bg_color TEXT NOT NULL DEFAULT '#0a0a0a',
  chart_bg_color_dark TEXT DEFAULT '#0a0a0a',
  chart_bg_color_light TEXT DEFAULT '#ffffff',
  chart_text_color TEXT NOT NULL DEFAULT '#d1d4dc',
  chart_text_color_dark TEXT DEFAULT '#d1d4dc',
  chart_text_color_light TEXT DEFAULT '#1a1a1a',
  grid_horz_color TEXT NOT NULL DEFAULT '#1e1e1e',
  grid_vert_color TEXT NOT NULL DEFAULT '#1e1e1e',
  grid_horz_color_dark TEXT DEFAULT '#1e1e1e',
  grid_vert_color_dark TEXT DEFAULT '#1e1e1e',
  grid_horz_color_light TEXT DEFAULT '#e5e5e5',
  grid_vert_color_light TEXT DEFAULT '#e5e5e5',
  crosshair_color TEXT NOT NULL DEFAULT '#758696',
  crosshair_color_dark TEXT DEFAULT '#758696',
  crosshair_color_light TEXT DEFAULT '#6b7280',
  price_scale_border_color TEXT NOT NULL DEFAULT '#2B2B43',
  price_scale_border_color_dark TEXT DEFAULT '#2B2B43',
  price_scale_border_color_light TEXT DEFAULT '#d1d5db',
  time_scale_border_color TEXT NOT NULL DEFAULT '#2B2B43',
  time_scale_border_color_dark TEXT DEFAULT '#2B2B43',
  time_scale_border_color_light TEXT DEFAULT '#d1d5db',
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
  trade_line_width INTEGER DEFAULT 2,
  trade_line_style INTEGER DEFAULT 2,
  trade_line_show_label BOOLEAN DEFAULT true,
  trade_line_call_color TEXT DEFAULT '#22c55e',
  trade_line_put_color TEXT DEFAULT '#ef4444',
  show_tradingview_logo BOOLEAN DEFAULT false,
  chart_height_desktop INTEGER DEFAULT 600,
  chart_height_mobile INTEGER DEFAULT 350,
  chart_height_fullscreen INTEGER DEFAULT 800,
  chart_width_percentage_desktop INTEGER DEFAULT 100,
  chart_width_percentage_mobile INTEGER DEFAULT 100,
  chart_width_percentage_fullscreen INTEGER DEFAULT 100,
  chart_responsive_desktop BOOLEAN DEFAULT false,
  chart_responsive_mobile BOOLEAN DEFAULT true,
  chart_responsive_fullscreen BOOLEAN DEFAULT true,
  chart_height_offset_desktop INTEGER DEFAULT 180,
  chart_height_offset_mobile INTEGER DEFAULT 160,
  chart_height_offset_fullscreen INTEGER DEFAULT 96,
  chart_aspect_ratio_desktop TEXT DEFAULT '16:9',
  chart_aspect_ratio_mobile TEXT DEFAULT '4:3',
  chart_aspect_ratio_fullscreen TEXT DEFAULT '21:9',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_by UUID
);

ALTER TABLE public.chart_appearance_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Everyone can view chart appearance" ON public.chart_appearance_settings FOR SELECT USING (true);
CREATE POLICY "Admins can manage chart appearance" ON public.chart_appearance_settings FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- Tabela: copy_trade_requests
CREATE TABLE public.copy_trade_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  description TEXT,
  rejection_reason TEXT,
  reviewed_by UUID,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.copy_trade_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own requests" ON public.copy_trade_requests FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own requests" ON public.copy_trade_requests FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins can manage all requests" ON public.copy_trade_requests FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- Tabela: copy_traders
CREATE TABLE public.copy_traders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
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

CREATE POLICY "Everyone can view active copy traders" ON public.copy_traders FOR SELECT USING (is_active = true);
CREATE POLICY "Users can view their own copy trader profile" ON public.copy_traders FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update their own copy trader profile" ON public.copy_traders FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Admins can manage all copy traders" ON public.copy_traders FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- Tabela: copy_trade_followers
CREATE TABLE public.copy_trade_followers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  copy_trader_id UUID NOT NULL REFERENCES public.copy_traders(id) ON DELETE CASCADE,
  follower_user_id UUID NOT NULL,
  allocation_percentage NUMERIC NOT NULL DEFAULT 100,
  max_trade_amount NUMERIC,
  is_active BOOLEAN DEFAULT true,
  total_copied_trades INTEGER DEFAULT 0,
  total_profit NUMERIC DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.copy_trade_followers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Followers can view their own subscriptions" ON public.copy_trade_followers FOR SELECT USING (auth.uid() = follower_user_id);
CREATE POLICY "Followers can subscribe to copy traders" ON public.copy_trade_followers FOR INSERT WITH CHECK (auth.uid() = follower_user_id);
CREATE POLICY "Followers can update their own subscriptions" ON public.copy_trade_followers FOR UPDATE USING (auth.uid() = follower_user_id);
CREATE POLICY "Followers can unsubscribe" ON public.copy_trade_followers FOR DELETE USING (auth.uid() = follower_user_id);
CREATE POLICY "Copy traders can manage their followers" ON public.copy_trade_followers FOR ALL USING (copy_trader_id IN (SELECT id FROM copy_traders WHERE user_id = auth.uid()));
CREATE POLICY "Admins can manage all followers" ON public.copy_trade_followers FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- Tabela: copied_trades
CREATE TABLE public.copied_trades (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  original_trade_id UUID NOT NULL REFERENCES public.trades(id) ON DELETE CASCADE,
  copy_trader_id UUID NOT NULL REFERENCES public.copy_traders(id) ON DELETE CASCADE,
  follower_user_id UUID NOT NULL,
  copied_trade_id UUID REFERENCES public.trades(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  failure_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.copied_trades ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own copied trades" ON public.copied_trades FOR SELECT USING (auth.uid() = follower_user_id);
CREATE POLICY "Copy traders can view copies of their trades" ON public.copied_trades FOR SELECT USING (copy_trader_id IN (SELECT id FROM copy_traders WHERE user_id = auth.uid()));
CREATE POLICY "Admins can manage all copied trades" ON public.copied_trades FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- Tabela: push_subscriptions
CREATE TABLE public.push_subscriptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID,
  endpoint TEXT NOT NULL,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own push subscriptions" ON public.push_subscriptions FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Allow anonymous push subscriptions" ON public.push_subscriptions FOR INSERT WITH CHECK (user_id IS NULL);
CREATE POLICY "Admins can read all push subscriptions" ON public.push_subscriptions FOR SELECT USING (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin'));
CREATE POLICY "Admins can delete push subscriptions" ON public.push_subscriptions FOR DELETE USING (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin'));

-- Tabela: admin_notification_queue
CREATE TABLE public.admin_notification_queue (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  notification_type TEXT NOT NULL,
  user_id UUID,
  user_name TEXT,
  amount NUMERIC,
  processed BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.admin_notification_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage notification queue" ON public.admin_notification_queue FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- Tabela: social_auth_providers
CREATE TABLE public.social_auth_providers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  provider TEXT NOT NULL,
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

CREATE POLICY "Todos podem ver provedores OAuth ativos" ON public.social_auth_providers FOR SELECT USING (is_enabled = true);
CREATE POLICY "Admins podem gerenciar provedores OAuth" ON public.social_auth_providers FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- Tabela: weekly_leaders
CREATE TABLE public.weekly_leaders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  display_name TEXT NOT NULL,
  balance NUMERIC NOT NULL DEFAULT 0,
  avatar_url TEXT,
  position INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.weekly_leaders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Everyone can view active leaders" ON public.weekly_leaders FOR SELECT USING (is_active = true);
CREATE POLICY "Admins can manage weekly leaders" ON public.weekly_leaders FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- Tabela: affiliate_marketing_metrics
CREATE TABLE public.affiliate_marketing_metrics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  affiliate_id UUID NOT NULL REFERENCES public.affiliates(id) ON DELETE CASCADE,
  fake_total_referrals INTEGER DEFAULT 0,
  fake_total_commission NUMERIC DEFAULT 0,
  fake_total_deposits NUMERIC DEFAULT 0,
  fake_paid_commission NUMERIC DEFAULT 0,
  fake_pending_commission NUMERIC DEFAULT 0,
  fake_active_users INTEGER DEFAULT 0,
  fake_conversion_rate NUMERIC DEFAULT 0,
  fake_chart_data JSONB,
  fake_withdrawal_history JSONB,
  is_active BOOLEAN DEFAULT true,
  notes TEXT,
  period_start TIMESTAMP WITH TIME ZONE,
  period_end TIMESTAMP WITH TIME ZONE,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.affiliate_marketing_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage marketing metrics" ON public.affiliate_marketing_metrics FOR ALL USING (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin'));
CREATE POLICY "Affiliates can view their own marketing metrics" ON public.affiliate_marketing_metrics FOR SELECT USING (EXISTS (SELECT 1 FROM affiliates WHERE id = affiliate_marketing_metrics.affiliate_id AND user_id = auth.uid()));


-- ============================================
-- PARTE 4: FUNÇÕES DE NEGÓCIO
-- ============================================

-- Função para criar perfil ao registrar usuário
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_document TEXT;
  v_document_type TEXT;
  v_country_code TEXT;
  v_country_name TEXT;
  v_preferred_currency TEXT;
  v_phone TEXT;
BEGIN
  v_document := new.raw_user_meta_data->>'document';
  v_document_type := COALESCE(NULLIF(new.raw_user_meta_data->>'document_type', ''), 'international');
  v_country_code := COALESCE(NULLIF(new.raw_user_meta_data->>'country_code', ''), 'XX');
  v_country_name := COALESCE(NULLIF(new.raw_user_meta_data->>'country_name', ''), 'Unknown');
  v_preferred_currency := COALESCE(NULLIF(new.raw_user_meta_data->>'preferred_currency', ''), 'USD');
  v_phone := new.raw_user_meta_data->>'phone';
  
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
    preferred_currency,
    phone,
    email
  )
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'full_name', 'User'),
    v_document,
    v_document_type,
    v_country_code,
    v_country_name,
    v_preferred_currency,
    v_phone,
    new.email
  );
  RETURN new;
END;
$$;

-- Trigger para criar perfil automaticamente
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Função para atualizar saldo ao fechar trade
CREATE OR REPLACE FUNCTION public.handle_trade_balance_on_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
$$;

CREATE TRIGGER trigger_trade_balance_update
  AFTER UPDATE ON public.trades
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_trade_balance_on_update();

-- Função para processar trade expirado
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
    v_result := v_trade.payout;
  ELSE
    v_result := -v_trade.amount;
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

CREATE TRIGGER trigger_update_total_deposited
  AFTER UPDATE ON public.transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_total_deposited();

-- Função para processar comissões de afiliado
CREATE OR REPLACE FUNCTION public.process_affiliate_commission()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_referral_id uuid;
  v_affiliate_id uuid;
  v_commission_percentage numeric;
  v_commission_model text;
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
      
      SELECT commission_percentage, commission_model INTO v_commission_percentage, v_commission_model
      FROM public.affiliates
      WHERE id = v_affiliate_id
        AND is_active = true;
      
      -- Only process REV model affiliates
      IF v_commission_percentage IS NOT NULL AND COALESCE(v_commission_model, 'rev') = 'rev' THEN
        
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

-- Função para processar comissão CPA
CREATE OR REPLACE FUNCTION public.process_cpa_commission()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_referral RECORD;
  v_affiliate RECORD;
  v_total_deposited numeric;
  v_commission_amount numeric;
BEGIN
  IF NEW.type = 'deposit' AND NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
    
    SELECT r.id, r.affiliate_id, r.cpa_paid
    INTO v_referral
    FROM public.referrals r
    WHERE r.referred_user_id = NEW.user_id
      AND r.status = 'active'
    LIMIT 1;
    
    IF v_referral.id IS NOT NULL AND v_referral.cpa_paid = false THEN
      
      SELECT a.id, a.commission_model, a.cpa_value, a.cpa_min_deposit, a.is_active
      INTO v_affiliate
      FROM public.affiliates a
      WHERE a.id = v_referral.affiliate_id;
      
      IF v_affiliate.commission_model = 'cpa' AND v_affiliate.is_active = true THEN
        
        SELECT COALESCE(SUM(amount), 0) INTO v_total_deposited
        FROM public.transactions
        WHERE user_id = NEW.user_id
          AND type = 'deposit'
          AND status = 'completed';
        
        IF v_total_deposited >= COALESCE(v_affiliate.cpa_min_deposit, 0) THEN
          
          v_commission_amount := v_affiliate.cpa_value;
          
          INSERT INTO public.commissions (
            affiliate_id,
            referral_id,
            amount
          ) VALUES (
            v_affiliate.id,
            v_referral.id,
            v_commission_amount
          );
          
          UPDATE public.affiliates
          SET 
            total_commission = COALESCE(total_commission, 0) + v_commission_amount,
            updated_at = now()
          WHERE id = v_affiliate.id;
          
          UPDATE public.referrals
          SET cpa_paid = true
          WHERE id = v_referral.id;
          
        END IF;
      END IF;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_process_cpa_commission
  AFTER UPDATE ON public.transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.process_cpa_commission();

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
        SELECT a.user_id INTO user_id_value FROM affiliates a WHERE a.id = NEW.affiliate_id;
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
    SELECT full_name INTO user_name FROM profiles WHERE user_id = user_id_value;
  END IF;
  
  INSERT INTO public.admin_notification_queue (notification_type, user_id, user_name, amount, created_at)
  VALUES (notification_type, user_id_value, user_name, amount_value, now());
  
  RETURN NEW;
END;
$$;

-- Triggers para notify_admins_on_event
CREATE TRIGGER trigger_notify_admins_transactions
  AFTER INSERT OR UPDATE ON public.transactions
  FOR EACH ROW EXECUTE FUNCTION public.notify_admins_on_event();

CREATE TRIGGER trigger_notify_admins_verification
  AFTER INSERT OR UPDATE ON public.verification_requests
  FOR EACH ROW EXECUTE FUNCTION public.notify_admins_on_event();

CREATE TRIGGER trigger_notify_admins_withdrawal
  AFTER INSERT OR UPDATE ON public.withdrawal_requests
  FOR EACH ROW EXECUTE FUNCTION public.notify_admins_on_event();

CREATE TRIGGER trigger_notify_admins_new_user
  AFTER INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.notify_admins_on_event();

-- Função para copy trade
CREATE OR REPLACE FUNCTION public.process_copy_trade()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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

CREATE TRIGGER trigger_process_copy_trade
  AFTER INSERT ON public.trades
  FOR EACH ROW
  EXECUTE FUNCTION public.process_copy_trade();

-- Função para sincronizar role de admin
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

CREATE TRIGGER trigger_sync_admin_role
  AFTER UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_admin_role();

-- Função para booster ativo
CREATE OR REPLACE FUNCTION public.get_user_active_booster(p_user_id uuid)
RETURNS TABLE(payout_increase_percentage integer, expires_at timestamp with time zone)
LANGUAGE sql
STABLE SECURITY DEFINER
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
RETURNS integer
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
```

---

## 🔧 PASSO 2: DADOS SEED (CONFIGURAÇÕES REAIS)

Cole o SQL abaixo para inserir TODOS os dados do projeto atual:

```sql
-- ============================================
-- ASSETS (Ativos para trading)
-- ============================================

INSERT INTO public.assets (id, name, symbol, icon_url, payout_percentage, is_active, auto_generate_candles) VALUES
('367aa3b1-e579-4952-884f-e00b2151bd15', 'Bitcoin', 'BTC-OTC', 'https://cryptologos.cc/logos/bitcoin-btc-logo.png', 89, true, true),
('3766e901-9d98-4f63-bbb8-ed45aa9db1ca', 'Ethereum', 'ETH-OTC', 'https://cryptologos.cc/logos/ethereum-eth-logo.png', 89, true, true),
('8dd9b8e6-8095-4e23-96cf-25807a9316a2', 'Solana', 'SOL-OTC', 'https://cryptologos.cc/logos/solana-sol-logo.png', 89, true, true),
('c0473610-4a53-4dd3-acdd-247782b6b0d6', 'BNB', 'BNB-OTC', 'https://cryptologos.cc/logos/bnb-bnb-logo.png', 89, true, true),
('e7b5de2d-aa21-4d82-8f85-f11269438e3a', 'Cardano', 'ADA-OTC', 'https://cryptologos.cc/logos/cardano-ada-logo.png', 89, true, true),
('a8541b37-cf21-430f-ab9e-8456f0315c62', 'Dogecoin', 'DOGE-OTC', 'https://cryptologos.cc/logos/dogecoin-doge-logo.png', 89, true, true),
('b10a6897-604d-42a5-b16b-c0d504d92506', 'Apple Inc.', 'AAPL-OTC', 'https://xhmisqcngalyjapkdwvh.supabase.co/storage/v1/object/public/popup-images/assets/1765326595808-jcgz2.webp', 89, true, true),
('cfe7f8a2-fe12-45ec-843e-1f87593c1fcf', 'Alphabet Inc.', 'GOOGL-OTC', 'https://xhmisqcngalyjapkdwvh.supabase.co/storage/v1/object/public/popup-images/assets/1765326928310-4sgvsc.webp', 89, true, true),
('da869e78-8dba-40d9-8f36-3ffced23f731', 'Microsoft Corp.', 'MSFT-OTC', 'https://xhmisqcngalyjapkdwvh.supabase.co/storage/v1/object/public/popup-images/assets/1765327147533-oe3h1.webp', 89, true, true),
('c2c202ef-c8d2-445f-ac94-d079379ae15d', 'Ripple (OTC)', 'XRP-OTC', 'https://cryptologos.cc/logos/xrp-xrp-logo.png', 87, false, true),
('9b9412a9-064a-4177-b520-eac42dc5e4a8', 'Polkadot (OTC)', 'DOT-OTC', 'https://cryptologos.cc/logos/polkadot-new-dot-logo.png', 87, false, true),
('3c86059c-c5a5-493c-b748-6daa8d7b9066', 'Avalanche (OTC)', 'AVAX-OTC', 'https://cryptologos.cc/logos/avalanche-avax-logo.png', 88, false, true),
('dcf8d1c9-cad8-4633-a9ec-1a2ca8f13eb1', 'Polygon (OTC)', 'MATIC-OTC', 'https://cryptologos.cc/logos/polygon-matic-logo.png', 86, false, true),
('d8b735b1-3904-4830-a558-3ed1f24b23a2', 'EUR/CHF (OTC)', 'EUR-CHF-OTC', 'https://flowsysob.nyc3.cdn.digitaloceanspaces.com/allbuckets-1750773114361/01K862PM08XKKRHDN3Y5X4SK9C.png', 88, false, true),
('175bc59f-5b33-45ca-bf6d-be5a62f865e4', 'USD/CHF (OTC)', 'USD-CHF-OTC', 'https://flowsysob.nyc3.cdn.digitaloceanspaces.com/allbuckets-1750773114361/01K862PM08XKKRHDN3Y5X4SK9C.png', 91, false, true);


-- ============================================
-- PLATFORM_SETTINGS (Configurações da Plataforma)
-- ============================================

INSERT INTO public.platform_settings (key, value, description) VALUES
('accent_color', '#ffdd00', 'Setting for accent_color'),
('admin_panel_password_hash', '', 'Hash da senha do painel admin'),
('allow_registration', 'true', 'Setting for allow_registration'),
('dark_accent', '240 3.7% 15.9%', 'Setting for dark_accent'),
('dark_background', '0 0% 0%', 'Setting for dark_background'),
('dark_border', '220 13% 23%', 'Setting for dark_border'),
('dark_card', '240 10% 3.9%', 'Setting for dark_card'),
('dark_foreground', '0 0% 98%', 'Setting for dark_foreground'),
('dark_muted', '240 3.7% 15.9%', 'Setting for dark_muted'),
('dark_primary', '48 97% 60%', 'Setting for dark_primary'),
('dark_secondary', '240 3.7% 15.9%', 'Setting for dark_secondary'),
('default_payout', '89', 'Setting for default_payout'),
('deposit_fee', '0', 'Setting for deposit_fee'),
('light_accent', '240 4.8% 95.9%', 'Setting for light_accent'),
('light_background', '0 0% 100%', 'Setting for light_background'),
('light_border', '240 5.9% 90%', 'Setting for light_border'),
('light_card', '0 0% 100%', 'Setting for light_card'),
('light_foreground', '240 10% 3.9%', 'Setting for light_foreground'),
('light_muted', '240 4.8% 95.9%', 'Setting for light_muted'),
('light_primary', '48 97% 60%', 'Setting for light_primary'),
('light_secondary', '240 4.8% 95.9%', 'Setting for light_secondary'),
('logo_dark', '', 'Logo para tema escuro'),
('logo_height', '40', 'Setting for logo_height'),
('logo_light', '', 'Logo para tema claro'),
('logo_mobile', '', 'Logo para mobile'),
('logo_mobile_height', '32', 'Altura do logo mobile'),
('maintenance_mode', 'false', 'Setting for maintenance_mode'),
('max_trade', '10000', 'Setting for max_trade'),
('min_deposit', '10', 'Setting for min_deposit'),
('min_trade', '1', 'Setting for min_trade'),
('platform_name', 'Trading Platform', 'Setting for platform_name'),
('support_email', 'suporte@suaplataforma.com', 'Setting for support_email'),
('withdrawal_fee', '0', 'Setting for withdrawal_fee');


-- ============================================
-- CHART_APPEARANCE_SETTINGS (Aparência do Gráfico)
-- ============================================

INSERT INTO public.chart_appearance_settings (
  id,
  candle_up_color, candle_down_color,
  candle_up_color_dark, candle_down_color_dark,
  candle_up_color_light, candle_down_color_light,
  wick_up_color, wick_down_color,
  wick_up_color_dark, wick_down_color_dark,
  wick_up_color_light, wick_down_color_light,
  candle_border_up_color, candle_border_down_color,
  candle_border_up_color_dark, candle_border_down_color_dark,
  candle_border_up_color_light, candle_border_down_color_light,
  candle_border_visible, candle_border_width,
  chart_bg_color, chart_bg_color_dark, chart_bg_color_light,
  chart_text_color, chart_text_color_dark, chart_text_color_light,
  grid_horz_color, grid_vert_color,
  grid_horz_color_dark, grid_vert_color_dark,
  grid_horz_color_light, grid_vert_color_light,
  crosshair_color, crosshair_color_dark, crosshair_color_light,
  price_scale_border_color, price_scale_border_color_dark, price_scale_border_color_light,
  time_scale_border_color, time_scale_border_color_dark, time_scale_border_color_light,
  map_enabled, map_opacity, map_primary_color, map_secondary_color,
  map_show_grid, map_grid_opacity,
  map_image_url, map_image_url_dark, map_image_url_mobile, map_image_url_mobile_dark,
  watermark_visible, watermark_text,
  trade_line_width, trade_line_style, trade_line_show_label,
  trade_line_call_color, trade_line_put_color,
  show_tradingview_logo,
  chart_height_desktop, chart_height_mobile, chart_height_fullscreen,
  chart_width_percentage_desktop, chart_width_percentage_mobile, chart_width_percentage_fullscreen,
  chart_responsive_desktop, chart_responsive_mobile, chart_responsive_fullscreen,
  chart_height_offset_desktop, chart_height_offset_mobile, chart_height_offset_fullscreen,
  chart_aspect_ratio_desktop, chart_aspect_ratio_mobile, chart_aspect_ratio_fullscreen
) VALUES (
  '00000000-0000-0000-0000-000000000001',
  '#ffffff', '#000000',
  '#ffffff', '#000000',
  '#ffffff', '#000000',
  '#22c55e', '#ef4444',
  '#ffffff', '#ffffff',
  '#000000', '#000000',
  '#22c55e', '#ef4444',
  '#000000', '#ffffff',
  '#000000', '#ffffff',
  true, 2,
  '#0a0a0a', '#000000', '#ffffff',
  '#d1d4dc', '#d1d4dc', '#1a1a1a',
  '#1e1e1e', '#1e1e1e',
  '#1e1e1e', '#1e1e1e',
  '#e5e5e5', '#e5e5e5',
  '#758696', '#758696', '#6b7280',
  '#2B2B43', '#2B2B43', '#d1d5db',
  '#2B2B43', '#2B2B43', '#d1d5db',
  true, 0.07, '#f5f5ff', '#8f8f8f',
  true, 0.1,
  'https://xhmisqcngalyjapkdwvh.supabase.co/storage/v1/object/public/chart-backgrounds/map-light-1765469767431.webp',
  'https://xhmisqcngalyjapkdwvh.supabase.co/storage/v1/object/public/chart-backgrounds/map-dark-1765469774766.webp',
  'https://xhmisqcngalyjapkdwvh.supabase.co/storage/v1/object/public/chart-backgrounds/map-mobile-light-1765469063292.webp',
  'https://xhmisqcngalyjapkdwvh.supabase.co/storage/v1/object/public/chart-backgrounds/map-mobile-dark-1765469071756.webp',
  false, NULL,
  5, 0, true,
  '#22c55e', '#ef4444',
  false,
  650, 500, 750,
  100, 100, 100,
  true, false, true,
  150, 160, 150,
  '16:9', '16:9', '16:9'
);


-- ============================================
-- BOOSTERS
-- ============================================

INSERT INTO public.boosters (id, name, description, name_en, name_es, description_en, description_es, payout_increase_percentage, duration_minutes, price, icon, is_active, display_order) VALUES
('f233977f-4481-4401-945a-be23d4733030', 'Booster Básico', 'Aumente seu payout em 5% por 30 minutos', 'Booster Básico', 'Booster Básico', 'Aumente seu payout em 5% por 30 minutos', 'Aumente seu payout em 5% por 30 minutos', 1, 30, 20, 'Zap', true, 1),
('92f596e9-a065-4814-98bc-92fce2f13238', 'Booster Pro', 'Aumente seu payout em 10% por 1 hora', 'Booster Pro', 'Booster Pro', 'Aumente seu payout em 10% por 1 hora', 'Aumente seu payout em 10% por 1 hora', 5, 60, 50, 'TrendingUp', true, 2),
('dc45316a-4469-477e-bbc6-2c82e44c5aa7', 'Booster Premium', 'Aumente seu payout em 15% por 2 horas', 'Booster Premium', 'Booster Premium', 'Aumente seu payout em 15% por 2 horas', 'Aumente seu payout em 15% por 2 horas', 10, 120, 80, 'Rocket', true, 3);


-- ============================================
-- LEGAL_DOCUMENTS (Documentos Legais)
-- ============================================

INSERT INTO public.legal_documents (id, title, slug, description, content, icon, display_order, is_active) VALUES
('49389f57-7e39-4898-a693-c5c05d468f06', 'Termos de Uso', 'termos-de-uso', 'Condições gerais de uso da plataforma', '<h1>Termos de Uso</h1><p>Conteúdo a ser definido pelo administrador.</p>', 'Scale', 1, true),
('760a3b19-b068-4edc-94e3-2c4508a592b5', 'Política de Privacidade', 'politica-privacidade', 'Como tratamos seus dados pessoais', '<h1>Política de Privacidade</h1><p>Conteúdo a ser definido pelo administrador.</p>', 'Shield', 2, true),
('620cfd32-6dad-4c3e-b025-b15f062989df', 'Política de Cookies', 'politica-cookies', 'Como utilizamos cookies no site', '<h1>Política de Cookies</h1><p>Conteúdo a ser definido pelo administrador.</p>', 'Cookie', 3, true),
('cd380c4f-8880-45d3-afab-5335fca027f0', 'Política de Segurança', 'politica-seguranca', 'Medidas de proteção e segurança', '<h1>Política de Segurança</h1><p>Conteúdo a ser definido pelo administrador.</p>', 'Lock', 4, true),
('68caff2b-8fe2-4109-9d01-6eb8363de531', 'Termos de Serviço', 'termos-servico', 'Acordo de prestação de serviços', '<h1>Termos de Serviço</h1><p>Conteúdo a ser definido pelo administrador.</p>', 'FileText', 5, true),
('e6e7268b-f2c9-48e6-a639-42961cec1818', 'Regulamentação', 'regulamentacao', 'Informações legais e regulatórias', '<h1>Regulamentação</h1><p>Conteúdo a ser definido pelo administrador.</p>', 'BookOpen', 6, true),
('fa4a0c2e-bd97-40de-986d-10480f2724c9', 'Sobre Nós', 'sobre-nos', 'Conheça nossa empresa e missão', '<h1>Sobre Nós</h1><p>Conteúdo a ser definido pelo administrador.</p>', 'Info', 7, true),
('cf78679d-575c-4ea2-a3ef-0ecfaad769f1', 'Contato Jurídico', 'contato-juridico', 'Fale com nosso departamento legal', '<h1>Contato Jurídico</h1><p>Email: juridico@suaempresa.com</p>', 'Mail', 8, true);


-- ============================================
-- COMPANY_INFO (Informações da Empresa)
-- ============================================

INSERT INTO public.company_info (key, value, description) VALUES
('cnpj', '00.000.000/0001-00', 'CNPJ da empresa'),
('data_atualizacao_termos', 'Janeiro/2025', 'Data da última atualização'),
('email_juridico', 'juridico@suaempresa.com', 'Email do departamento jurídico'),
('endereco', 'Rua Exemplo, 123 - São Paulo/SP', 'Endereço completo'),
('orgao_regulador_1', 'CVM - Comissão de Valores Mobiliários', 'Órgão regulador 1'),
('orgao_regulador_2', 'Banco Central do Brasil', 'Órgão regulador 2'),
('orgao_regulador_3', 'ANPD - Autoridade Nacional de Proteção de Dados', 'Órgão regulador 3'),
('razao_social', 'Sua Empresa Ltda', 'Razão social da empresa'),
('versao_termos', '1.0', 'Versão atual dos termos');


-- ============================================
-- PAYMENT_GATEWAYS (Gateways de Pagamento)
-- ============================================

INSERT INTO public.payment_gateways (name, type, is_active, config) VALUES
('Stripe', 'worldwide', true, '{"provider": "stripe"}'),
('CoinBase', 'crypto', true, '{"provider": "coinbase", "credentials": {"API_KEY": "", "WEBHOOK_SECRET": ""}, "secretName": "COINBASE_API_KEY"}'),
('PIX Gateway', 'pix', false, '{"provider": "pixup", "credentials": {"CLIENT_ID": "", "CLIENT_SECRET": ""}, "secretName": "PIXUP_CLIENT_ID"}');


-- ============================================
-- SOCIAL_AUTH_PROVIDERS (Provedores OAuth)
-- ============================================

INSERT INTO public.social_auth_providers (provider, is_enabled, instructions, config) VALUES
('google', false, 'Para configurar o Google OAuth:

1. Acesse o Google Cloud Console (console.cloud.google.com)
2. Crie um novo projeto ou selecione um existente
3. Vá em "APIs e Serviços" > "Credenciais"
4. Clique em "Criar credenciais" > "ID do cliente OAuth 2.0"
5. Configure a tela de consentimento se necessário
6. Escolha "Aplicativo da Web" como tipo de aplicativo
7. Adicione as URLs autorizadas:
   - JavaScript origins: sua URL do app
   - Redirect URIs: https://<SEU_PROJETO>.supabase.co/auth/v1/callback
8. Copie o Client ID e Client Secret
9. Cole aqui e ative o provedor

Importante: No Supabase, vá em Authentication > Providers > Google e adicione o Client ID e Secret lá também.', '{}'),
('facebook', false, 'Para configurar o Facebook Login:

1. Acesse Facebook Developers (developers.facebook.com)
2. Crie um novo app ou selecione um existente
3. Adicione o produto "Facebook Login"
4. Configure as URLs de redirecionamento:
   - Valid OAuth Redirect URIs: https://<SEU_PROJETO>.supabase.co/auth/v1/callback
5. Em Configurações > Básico, copie:
   - ID do aplicativo (App ID)
   - Chave secreta do app (App Secret)
6. Cole aqui e ative o provedor

Importante: No Supabase, vá em Authentication > Providers > Facebook e adicione o App ID e Secret lá também.', '{}'),
('apple', false, 'Para configurar o Sign in with Apple:

1. Acesse Apple Developer (developer.apple.com)
2. Vá em Certificates, Identifiers & Profiles
3. Crie um novo Service ID
4. Configure:
   - Return URLs: https://<SEU_PROJETO>.supabase.co/auth/v1/callback
5. Gere uma chave privada (.p8) para Sign in with Apple
6. Anote o Team ID, Service ID (Client ID) e Key ID
7. Cole as informações aqui e ative o provedor

Importante: No Supabase, vá em Authentication > Providers > Apple e configure todos os campos necessários.

Observação: Apple OAuth requer configuração adicional complexa. Consulte a documentação do Supabase para detalhes completos.', '{}');
```

---

## 🔧 PASSO 3: STORAGE BUCKETS

Cole o SQL abaixo para criar os buckets de storage:

```sql
-- Criar buckets de storage
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
  ('avatars', 'avatars', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']),
  ('verification-documents', 'verification-documents', false, 10485760, ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf']),
  ('popup-images', 'popup-images', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']),
  ('chart-backgrounds', 'chart-backgrounds', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp']),
  ('weekly-leaders-avatars', 'weekly-leaders-avatars', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']);

-- Políticas para avatars (público)
CREATE POLICY "Avatar images are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'avatars');

CREATE POLICY "Users can upload their own avatar"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their own avatar"
ON storage.objects FOR UPDATE
USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own avatar"
ON storage.objects FOR DELETE
USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Políticas para verification-documents (privado)
CREATE POLICY "Users can view their own documents"
ON storage.objects FOR SELECT
USING (bucket_id = 'verification-documents' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can upload their own documents"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'verification-documents' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Admins can view all documents"
ON storage.objects FOR SELECT
USING (bucket_id = 'verification-documents' AND EXISTS (
  SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin'
));

-- Políticas para popup-images (público)
CREATE POLICY "Popup images are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'popup-images');

CREATE POLICY "Admins can manage popup images"
ON storage.objects FOR ALL
USING (bucket_id = 'popup-images' AND EXISTS (
  SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin'
));

-- Políticas para chart-backgrounds (público)
CREATE POLICY "Chart backgrounds are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'chart-backgrounds');

CREATE POLICY "Admins can manage chart backgrounds"
ON storage.objects FOR ALL
USING (bucket_id = 'chart-backgrounds' AND EXISTS (
  SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin'
));

-- Políticas para weekly-leaders-avatars (público)
CREATE POLICY "Weekly leaders avatars are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'weekly-leaders-avatars');

CREATE POLICY "Admins can manage weekly leaders avatars"
ON storage.objects FOR ALL
USING (bucket_id = 'weekly-leaders-avatars' AND EXISTS (
  SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin'
));
```

---

## 🔧 PASSO 4: CONFIGURAR REALTIME

```sql
-- Habilitar Realtime nas tabelas necessárias
ALTER TABLE public.profiles REPLICA IDENTITY FULL;
ALTER TABLE public.trades REPLICA IDENTITY FULL;
ALTER TABLE public.candles REPLICA IDENTITY FULL;
ALTER TABLE public.transactions REPLICA IDENTITY FULL;

-- Adicionar tabelas à publicação do Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;
ALTER PUBLICATION supabase_realtime ADD TABLE public.trades;
ALTER PUBLICATION supabase_realtime ADD TABLE public.candles;
ALTER PUBLICATION supabase_realtime ADD TABLE public.transactions;
```

---

## 🔧 PASSO 5: CRON JOBS

Acesse **Database > Extensions** e ative as extensões `pg_cron` e `pg_net`.

> ⚠️ **IMPORTANTE:** O `pg_cron` suporta no mínimo intervalos de **1 minuto**. Não é possível agendar em segundos. Para trades em tempo real, o sistema já possui polling no frontend.

Depois execute:

```sql
-- Processar trades expirados (a cada minuto)
SELECT cron.schedule(
  'process-expired-trades',
  '* * * * *',
  $$
  SELECT net.http_post(
    url := 'https://<SEU_PROJETO>.supabase.co/functions/v1/process-expired-trades',
    headers := jsonb_build_object('Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true), 'Content-Type', 'application/json'),
    body := '{"continuous": true, "interval": 2}'::jsonb
  );
  $$
);

-- Atualizar candles (a cada minuto)
SELECT cron.schedule(
  'update-current-candles',
  '* * * * *',
  $$
  SELECT net.http_post(
    url := 'https://<SEU_PROJETO>.supabase.co/functions/v1/update-current-candles',
    headers := jsonb_build_object('Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true), 'Content-Type', 'application/json'),
    body := '{}'::jsonb
  );
  $$
);

-- Limpar demo trades (diário às 03:00 UTC)
SELECT cron.schedule(
  'cleanup-demo-trades',
  '0 3 * * *',
  $$
  SELECT net.http_post(
    url := 'https://<SEU_PROJETO>.supabase.co/functions/v1/cleanup-demo-trades',
    headers := jsonb_build_object('Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true), 'Content-Type', 'application/json'),
    body := '{}'::jsonb
  );
  $$
);

-- Limpar candles antigos (diário às 04:00 UTC)
SELECT cron.schedule(
  'cleanup-old-candles',
  '0 4 * * *',
  $$
  SELECT net.http_post(
    url := 'https://<SEU_PROJETO>.supabase.co/functions/v1/cleanup-old-candles',
    headers := jsonb_build_object('Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true), 'Content-Type', 'application/json'),
    body := '{}'::jsonb
  );
  $$
);

-- Verificar pagamentos pendentes (a cada 5 minutos)
SELECT cron.schedule(
  'check-pending-payments',
  '*/5 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://<SEU_PROJETO>.supabase.co/functions/v1/check-pending-payments',
    headers := jsonb_build_object('Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true), 'Content-Type', 'application/json'),
    body := '{}'::jsonb
  );
  $$
);

-- Processar notificações de admin (a cada minuto)
SELECT cron.schedule(
  'process-admin-notifications',
  '* * * * *',
  $$
  SELECT net.http_post(
    url := 'https://<SEU_PROJETO>.supabase.co/functions/v1/process-admin-notifications',
    headers := jsonb_build_object('Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true), 'Content-Type', 'application/json'),
    body := '{}'::jsonb
  );
  $$
);
```

**IMPORTANTE:** Substitua `<SEU_PROJETO>` pelo ID do seu projeto Supabase.

> 💡 **Dica:** Se preferir usar a service_role_key diretamente (em vez de `current_setting`), substitua o `headers` por:
> ```sql
> headers := '{"Authorization": "Bearer SUA_SERVICE_ROLE_KEY_AQUI", "Content-Type": "application/json"}'::jsonb
> ```

---

## 🔐 PASSO 6: SECRETS DO SUPABASE

Vá em **Settings > Edge Functions > Secrets** e adicione:

| Nome do Secret | Descrição | Onde Obter |
|----------------|-----------|------------|
| `SUPABASE_URL` | URL do projeto (ex: https://xxx.supabase.co) | Dashboard > Settings > API |
| `SUPABASE_ANON_KEY` | Chave anon do projeto | Dashboard > Settings > API |
| `SUPABASE_SERVICE_ROLE_KEY` | Chave service role | Dashboard > Settings > API |
| `STRIPE_SECRET_KEY` | Chave secreta do Stripe | [Stripe Dashboard](https://dashboard.stripe.com/apikeys) |
| `STRIPE_PUBLISHABLE_KEY` | Chave pública do Stripe | [Stripe Dashboard](https://dashboard.stripe.com/apikeys) |
| `STRIPE_WEBHOOK_SECRET` | Secret do webhook Stripe | Stripe > Webhooks > Signing secret |
| `VAPID_PUBLIC_KEY` | Chave pública VAPID (push notifications) | Gerar com edge function `generate-vapid-keys` |
| `VAPID_PRIVATE_KEY` | Chave privada VAPID | Gerar com edge function `generate-vapid-keys` |
| `ADMIN_PANEL_PASSWORD` | Senha do painel admin | Defina uma senha forte |

> 💡 **Para gerar as chaves VAPID:** Após deployar a edge function `generate-vapid-keys`, chame-a uma vez e copie as chaves retornadas para os secrets.

---

## 📦 PASSO 7: DEPLOY DAS EDGE FUNCTIONS (CRÍTICO!)

**ATENÇÃO:** As Edge Functions NÃO são copiadas automaticamente quando você clona o banco de dados ou o repositório. Você DEVE deployar cada função manualmente no Dashboard do Supabase.

### 📋 Como Deployar Edge Functions (Sem Terminal)

1. Acesse **Supabase Dashboard** → **Edge Functions**
2. Clique em **New Function** 
3. Digite o nome da função (exatamente como mostrado abaixo)
4. Cole o código correspondente
5. Clique em **Create** ou **Deploy**
6. Repita para TODAS as 25 funções

### ⚠️ IMPORTANTE: Ordem de Deploy

Algumas funções dependem de outras. Siga esta ordem:
1. Primeiro as funções base (candles, trades)
2. Depois as de pagamento
3. Por último as de notificação

---

### 🔴 FUNÇÕES CRÍTICAS - TRADING (Prioridade Máxima)

Estas funções são ESSENCIAIS para o sistema de trading funcionar:

#### 1. `generate-candles`
Gera histórico de candles para os ativos.

```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { assetId, timeframe = '1m', count = 300 } = await req.json()

    if (!assetId) {
      throw new Error('Asset ID is required')
    }

    const { data: asset } = await supabase
      .from('assets')
      .select('*')
      .eq('id', assetId)
      .single()

    if (!asset) {
      throw new Error('Asset not found')
    }

    const now = new Date()
    const { data: activeBiases } = await supabase
      .from('chart_biases')
      .select('*')
      .eq('asset_id', assetId)
      .eq('is_active', true)
      .lte('start_time', now.toISOString())
      .gte('end_time', now.toISOString())

    const bias = activeBiases && activeBiases.length > 0 ? activeBiases[0] : null

    let basePrice = getInitialPrice(asset.symbol)
    
    const { data: referenceCandle } = await supabase
      .from('candles')
      .select('close')
      .eq('asset_id', assetId)
      .eq('timeframe', '1m')
      .order('timestamp', { ascending: false })
      .limit(1)
      .single()

    if (referenceCandle) {
      basePrice = parseFloat(referenceCandle.close)
    } else {
      const { data: anyCandle } = await supabase
        .from('candles')
        .select('close, timeframe')
        .eq('asset_id', assetId)
        .order('timestamp', { ascending: false })
        .limit(1)
        .single()

      if (anyCandle) {
        basePrice = parseFloat(anyCandle.close)
      }
    }

    const timeframeMs = getTimeframeMs(timeframe)
    const getBrazilTime = () => {
      const brazilOffset = -3 * 60 * 60 * 1000
      return Date.now() + brazilOffset
    }
    const alignToTimeframe = (timestamp: number, tfMs: number) => {
      return Math.floor(timestamp / tfMs) * tfMs
    }

    const nowBrazil = getBrazilTime()
    const alignedNow = alignToTimeframe(nowBrazil, timeframeMs)
    
    const { data: lastCandle } = await supabase
      .from('candles')
      .select('*')
      .eq('asset_id', assetId)
      .eq('timeframe', timeframe)
      .order('timestamp', { ascending: false })
      .limit(1)
      .single()

    if (lastCandle) {
      basePrice = parseFloat(lastCandle.close)
    }

    let startTimestamp: number
    if (lastCandle) {
      startTimestamp = new Date(lastCandle.timestamp).getTime() + timeframeMs
    } else {
      startTimestamp = alignedNow - (count * timeframeMs)
    }
    startTimestamp = alignToTimeframe(startTimestamp, timeframeMs)

    const candles = []

    for (let i = 0; i < count; i++) {
      const candleTimestamp = startTimestamp + (i * timeframeMs)
      const timestamp = new Date(candleTimestamp)
      
      const volatility = 0.0015
      const trend = bias ? getBiasTrend(bias) : getRandomTrend()
      
      const open = basePrice
      const priceChange = basePrice * volatility * (Math.random() * 2 - 1) + trend
      const close = Math.max(0, open + priceChange)
      
      const high = Math.max(open, close) * (1 + Math.random() * volatility * 0.5)
      const low = Math.min(open, close) * (1 - Math.random() * volatility * 0.5)
      
      const volume = Math.random() * 1000000 + 100000

      candles.push({
        asset_id: assetId,
        timeframe,
        timestamp: timestamp.toISOString(),
        open: open.toFixed(8),
        high: high.toFixed(8),
        low: low.toFixed(8),
        close: close.toFixed(8),
        volume: volume.toFixed(2),
        is_manipulated: false
      })

      basePrice = close
    }

    const { data: insertedCandles, error: insertError } = await supabase
      .from('candles')
      .upsert(candles, { onConflict: 'asset_id,timeframe,timestamp' })
      .select()

    if (insertError) {
      throw insertError
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        candles: insertedCandles,
        count: insertedCandles.length 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error:', error)
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

function getInitialPrice(symbol: string): number {
  const prices: Record<string, number> = {
    'BTC': 45000, 'ETH': 2500, 'EUR/USD': 1.08, 'GBP/USD': 1.25,
    'USD/JPY': 150, 'GOLD': 2050, 'OIL': 85, 'AAPL': 185, 'GOOGL': 140
  }
  return prices[symbol] || 100
}

function getTimeframeMs(timeframe: string): number {
  const map: Record<string, number> = {
    '10s': 10 * 1000, '30s': 30 * 1000, '1m': 60 * 1000, '5m': 5 * 60 * 1000
  }
  return map[timeframe] || 60 * 1000
}

function getRandomTrend(): number {
  return (Math.random() - 0.48) * 0.0005
}

function getBiasTrend(bias: any): number {
  const strength = parseFloat(bias.strength) / 100
  const direction = bias.direction === 'up' ? 1 : bias.direction === 'down' ? -1 : 0
  return direction * strength * 0.001
}
```

#### 2. `update-current-candles`
Atualiza candles em tempo real.

```typescript
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.84.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Asset { id: string; symbol: string; auto_generate_candles: boolean; }
interface Candle { id: string; asset_id: string; timeframe: string; timestamp: string; open: number; high: number; low: number; close: number; volume: number; }

const assetCurrentPrices: Map<string, number> = new Map();

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { data: assets, error: assetsError } = await supabaseClient
      .from('assets')
      .select('id, symbol, auto_generate_candles')
      .eq('is_active', true)
      .eq('auto_generate_candles', true);

    if (assetsError) throw assetsError;
    if (!assets || assets.length === 0) {
      return new Response(JSON.stringify({ message: 'No active assets to update' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 });
    }

    const timeframes = ['10s', '30s', '1m', '5m'];
    const updatedCandles: any[] = [];
    
    const getBrazilTime = () => Date.now() + (-3 * 60 * 60 * 1000);
    const alignToTimeframe = (timestamp: number, timeframeMs: number) => Math.floor(timestamp / timeframeMs) * timeframeMs;
    const getTimeframeMs = (timeframe: string): number => {
      const map: Record<string, number> = { '10s': 10000, '30s': 30000, '1m': 60000, '5m': 300000 };
      return map[timeframe] || 60000;
    };

    for (const asset of assets) {
      const { data: baseCandle } = await supabaseClient
        .from('candles').select('close').eq('asset_id', asset.id).eq('timeframe', '1m')
        .order('timestamp', { ascending: false }).limit(1).single();

      if (baseCandle) {
        const currentPrice = Number(baseCandle.close);
        const volatility = 0.0015;
        const randomChange = (Math.random() - 0.5) * volatility;
        assetCurrentPrices.set(asset.id, currentPrice * (1 + randomChange));
      } else {
        assetCurrentPrices.set(asset.id, 100);
      }
    }

    for (const asset of assets) {
      const currentPrice = assetCurrentPrices.get(asset.id) || 100;
      
      for (const timeframe of timeframes) {
        try {
          const timeframeMs = getTimeframeMs(timeframe);
          const nowBrazil = getBrazilTime();
          
          const { data: candles } = await supabaseClient
            .from('candles').select('*').eq('asset_id', asset.id).eq('timeframe', timeframe)
            .order('timestamp', { ascending: false }).limit(1);

          if (!candles || candles.length === 0) {
            const newCandleTimestamp = alignToTimeframe(nowBrazil, timeframeMs);
            await supabaseClient.from('candles').insert({
              asset_id: asset.id, timeframe,
              timestamp: new Date(newCandleTimestamp).toISOString(),
              open: currentPrice.toFixed(8), high: (currentPrice * 1.001).toFixed(8),
              low: (currentPrice * 0.999).toFixed(8), close: currentPrice.toFixed(8),
              volume: (Math.random() * 1000000 + 100000).toFixed(2), is_manipulated: false
            });
            updatedCandles.push({ asset: asset.symbol, timeframe, action: 'created_initial' });
            continue;
          }

          const currentCandle = candles[0] as Candle;
          const candleTimestamp = new Date(currentCandle.timestamp).getTime();
          const candleExpiry = candleTimestamp + timeframeMs;
          
          if (nowBrazil >= candleExpiry) {
            const newCandleTimestamp = alignToTimeframe(nowBrazil, timeframeMs);
            const lastClose = Number(currentCandle.close);
            await supabaseClient.from('candles').insert({
              asset_id: asset.id, timeframe,
              timestamp: new Date(newCandleTimestamp).toISOString(),
              open: lastClose.toFixed(8),
              high: Math.max(lastClose, currentPrice).toFixed(8),
              low: Math.min(lastClose, currentPrice).toFixed(8),
              close: currentPrice.toFixed(8),
              volume: (Math.random() * 1000000 + 100000).toFixed(2), is_manipulated: false
            });
            updatedCandles.push({ asset: asset.symbol, timeframe, action: 'created' });
          } else {
            const newHigh = Math.max(Number(currentCandle.high), currentPrice);
            const newLow = Math.min(Number(currentCandle.low), currentPrice);
            await supabaseClient.from('candles').update({
              close: currentPrice.toFixed(8), high: newHigh.toFixed(8), low: newLow.toFixed(8),
              updated_at: new Date(nowBrazil).toISOString()
            }).eq('id', currentCandle.id);
            updatedCandles.push({ asset: asset.symbol, timeframe, action: 'updated' });
          }
        } catch (error) { continue; }
      }
    }

    return new Response(JSON.stringify({ success: true, updated_count: updatedCandles.length }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 });
  } catch (error) {
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 });
  }
});
```

#### 3. `process-expired-trades`
Processa trades expirados e atualiza saldos.

```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    let body: any = {}
    try { body = await req.json() } catch {}

    const isContinuous = body.continuous === true
    const intervalSeconds = body.interval || 2

    if (isContinuous) {
      const startTime = Date.now()
      const maxDuration = 55 * 1000
      let totalProcessed = 0

      while (Date.now() - startTime < maxDuration) {
        const result = await processExpiredTrades(supabase, null)
        totalProcessed += result.processed
        const remainingTime = maxDuration - (Date.now() - startTime)
        if (remainingTime > intervalSeconds * 1000) {
          await new Promise(resolve => setTimeout(resolve, intervalSeconds * 1000))
        } else break
      }

      return new Response(JSON.stringify({ success: true, mode: 'continuous', processed: totalProcessed }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const result = await processExpiredTrades(supabase, null)
    return new Response(JSON.stringify({ success: true, ...result }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  } catch (error) {
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
})

async function processExpiredTrades(supabase: any, specificUserId: string | null) {
  const now = new Date().toISOString()
  
  let query = supabase.from('trades').select('*').eq('status', 'open').lt('expires_at', now)
  if (specificUserId) query = query.eq('user_id', specificUserId)
  
  const { data: expiredTrades, error } = await query
  if (error) throw error
  if (!expiredTrades || expiredTrades.length === 0) return { processed: 0, errors: 0, total: 0 }

  let processedCount = 0, errorCount = 0

  for (const trade of expiredTrades) {
    try {
      const entryPrice = parseFloat(trade.entry_price)
      if (!entryPrice || entryPrice <= 0) { errorCount++; continue }

      const { data: closeCandle } = await supabase
        .from('candles').select('close').eq('asset_id', trade.asset_id).eq('timeframe', '1m')
        .order('timestamp', { ascending: false }).limit(1).single()

      if (!closeCandle) { errorCount++; continue }

      const exitPrice = parseFloat(closeCandle.close)
      let won = trade.trade_type === 'call' ? exitPrice > entryPrice : exitPrice < entryPrice
      const status = won ? 'won' : 'lost'
      const result = won ? trade.payout : -trade.amount

      await supabase.from('trades').update({ status, result, exit_price: exitPrice, closed_at: now }).eq('id', trade.id)
      processedCount++
    } catch { errorCount++ }
  }

  return { processed: processedCount, errors: errorCount, total: expiredTrades.length }
}
```

#### 4. `manipulate-candle`
Manipulação manual de candles (admin).

```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  try {
    const supabaseClient = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '')
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) throw new Error('No authorization header')

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token)
    if (authError || !user) throw new Error('Unauthorized')

    const { candleId, manipulationType, manipulatedValues, biasDirection, biasStrength, expiresAt, notes } = await req.json()
    if (!candleId || !manipulationType || !manipulatedValues) throw new Error('Missing required fields')

    const { data: candle, error: candleError } = await supabaseClient.from('candles').select('*').eq('id', candleId).single()
    if (candleError || !candle) throw new Error('Candle not found')

    const originalValues = { open: candle.open, high: candle.high, low: candle.low, close: candle.close, volume: candle.volume }

    await supabaseClient.from('candles').update({ ...manipulatedValues, is_manipulated: true, manipulation_type: manipulationType }).eq('id', candleId)

    const { data: manipulation } = await supabaseClient.from('chart_manipulations').insert({
      asset_id: candle.asset_id, candle_id: candleId, manipulation_type: manipulationType,
      original_values: originalValues, manipulated_values: manipulatedValues,
      bias_direction: biasDirection, bias_strength: biasStrength, admin_id: user.id, expires_at: expiresAt, notes
    }).select().single()

    return new Response(JSON.stringify({ success: true, manipulation }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  } catch (error) {
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
})
```

#### 5. `cleanup-old-candles`
Limpa candles antigos.

```typescript
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
const corsHeaders = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type' };

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    const { data: assets } = await supabase.from('assets').select('id, symbol').eq('is_active', true);
    if (!assets) return new Response(JSON.stringify({ success: true, message: 'No assets' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    const timeframes = ['10s', '30s', '1m', '5m'];
    const KEEP_LAST_N = 200;
    let totalDeleted = 0;

    for (const asset of assets) {
      for (const tf of timeframes) {
        const { count } = await supabase.from('candles').select('id', { count: 'exact', head: true }).eq('asset_id', asset.id).eq('timeframe', tf);
        if (!count || count <= KEEP_LAST_N) continue;
        const toDelete = count - KEEP_LAST_N;
        const { data: oldest } = await supabase.from('candles').select('id').eq('asset_id', asset.id).eq('timeframe', tf).order('timestamp', { ascending: true }).limit(toDelete);
        if (oldest) {
          await supabase.from('candles').delete().in('id', oldest.map(c => c.id));
          totalDeleted += oldest.length;
        }
      }
    }

    return new Response(JSON.stringify({ success: true, totalDeleted }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 });
  }
});
```

#### 6. `cleanup-demo-trades`
Limpa trades demo antigos.

```typescript
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
const corsHeaders = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type' };

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    const twentyFourHoursAgo = new Date();
    twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);

    const { data: oldTrades } = await supabase.from('trades').select('id').eq('is_demo', true).lt('created_at', twentyFourHoursAgo.toISOString());
    if (!oldTrades || oldTrades.length === 0) return new Response(JSON.stringify({ success: true, deleted: 0 }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    await supabase.from('trades').delete().eq('is_demo', true).lt('created_at', twentyFourHoursAgo.toISOString());

    return new Response(JSON.stringify({ success: true, deleted: oldTrades.length }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (error) {
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
```

---

### 🟠 FUNÇÕES DE PAGAMENTO

#### 7. `create-stripe-payment-intent`
Cria intenção de pagamento Stripe.

```typescript
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type" };

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not configured");

    const supabaseClient = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_ANON_KEY") ?? "");
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");

    const { data: userData, error: userError } = await supabaseClient.auth.getUser(authHeader.replace("Bearer ", ""));
    if (userError || !userData.user) throw new Error("User not authenticated");

    const { amount, currency = "usd" } = await req.json();
    if (!amount || amount < 1) throw new Error("Invalid amount");

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    let customerId: string | undefined;
    if (userData.user.email) {
      const customers = await stripe.customers.list({ email: userData.user.email, limit: 1 });
      customerId = customers.data.length > 0 ? customers.data[0].id : (await stripe.customers.create({ email: userData.user.email, metadata: { supabase_user_id: userData.user.id } })).id;
    }

    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100), currency: currency.toLowerCase(), customer: customerId,
      automatic_payment_methods: { enabled: true },
      metadata: { supabase_user_id: userData.user.id, user_email: userData.user.email || "" },
    });

    const supabaseAdmin = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "");
    const { data: transaction } = await supabaseAdmin.from("transactions").insert({
      user_id: userData.user.id, type: "deposit", amount, status: "pending", payment_method: "stripe", transaction_reference: paymentIntent.id
    }).select().single();

    return new Response(JSON.stringify({ clientSecret: paymentIntent.client_secret, paymentIntentId: paymentIntent.id, transactionId: transaction?.id }), { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 });
  } catch (error) {
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : String(error) }), { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 });
  }
});
```

#### 8. `stripe-webhook`
Webhook do Stripe.

```typescript
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, stripe-signature" };

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY not configured");

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    const body = await req.text();
    const signature = req.headers.get("stripe-signature");

    let event: Stripe.Event;
    if (webhookSecret && signature) {
      try { event = stripe.webhooks.constructEvent(body, signature, webhookSecret); }
      catch { return new Response(JSON.stringify({ error: "Invalid signature" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }); }
    } else { event = JSON.parse(body); }

    const supabase = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "");

    if (event.type === "payment_intent.succeeded") {
      const pi = event.data.object as Stripe.PaymentIntent;
      await supabase.from("transactions").update({ status: "completed" }).eq("transaction_reference", pi.id);
      const userId = pi.metadata.supabase_user_id;
      const amount = pi.amount / 100;
      if (userId) {
        const { data: profile } = await supabase.from("profiles").select("balance, total_deposited").eq("user_id", userId).single();
        if (profile) {
          const newBalance = (Number(profile.balance) || 0) + amount;
          const newTotal = (Number(profile.total_deposited) || 0) + amount;
          const tier = newTotal >= 1000000 ? 'vip' : newTotal >= 100000 ? 'pro' : 'standard';
          await supabase.from("profiles").update({ balance: newBalance, total_deposited: newTotal, user_tier: tier }).eq("user_id", userId);
        }
      }
    } else if (event.type === "payment_intent.payment_failed") {
      const pi = event.data.object as Stripe.PaymentIntent;
      await supabase.from("transactions").update({ status: "failed" }).eq("transaction_reference", pi.id);
    }

    return new Response(JSON.stringify({ received: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error) {
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : String(error) }), { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 });
  }
});
```

#### 9-15. Outras funções de pagamento

As seguintes funções devem ser copiadas do repositório original (`supabase/functions/`):

- **`create-coinbase-charge`** - Cria cobrança Coinbase
- **`coinbase-webhook`** - Webhook do Coinbase  
- **`process-payment`** - Processa pagamentos PIX
- **`payment-webhook`** - Webhook de pagamentos PIX
- **`check-pending-payments`** - Verifica pagamentos pendentes
- **`cleanup-expired-transactions`** - Limpa transações expiradas
- **`recover-pending-transactions`** - Recupera transações pendentes
- **`pushin-pay-webhook`** - Webhook do Pushin Pay (PIX)
- **`woovi-webhook`** - Webhook do Woovi/OpenPix (PIX)

---

### 🟡 FUNÇÕES DE NOTIFICAÇÕES PUSH

#### 16. `get-vapid-key`
Retorna chave pública VAPID.

```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
const corsHeaders = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type' };

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  try {
    const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY');
    if (!vapidPublicKey) return new Response(JSON.stringify({ error: 'VAPID key not configured' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    return new Response(JSON.stringify({ publicKey: vapidPublicKey }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Internal server error' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
```

#### 17-22. Outras funções de notificação

Copie do repositório original (`supabase/functions/`):
- **`generate-vapid-keys`** - Gera chaves VAPID
- **`push-subscribe`** - Inscrição push
- **`push-unsubscribe`** - Cancelar inscrição
- **`send-push-notification`** - Envia notificações
- **`notify-admins`** - Notifica admins
- **`process-admin-notifications`** - Processa fila de notificações

---

### 🟢 FUNÇÕES AUXILIARES

#### 23-27. Funções auxiliares

Copie do repositório original (`supabase/functions/`):
- **`create-referral`** - Cria referência de afiliado
- **`organize-assets`** - Organiza ativos
- **`verify-admin-password`** - Verifica senha admin

---

### ⚙️ Configurar config.toml

Após criar as funções, configure o arquivo `supabase/config.toml` para desabilitar JWT onde necessário:

```toml
project_id = "SEU_PROJECT_ID"

[functions.verify-admin-password]
verify_jwt = false

[functions.payment-webhook]
verify_jwt = false

[functions.recover-pending-transactions]
verify_jwt = false

[functions.check-pending-payments]
verify_jwt = false

[functions.cleanup-expired-transactions]
verify_jwt = false

[functions.cleanup-old-candles]
verify_jwt = false

[functions.organize-assets]
verify_jwt = false

[functions.process-expired-trades]
verify_jwt = false

[functions.stripe-webhook]
verify_jwt = false

[functions.coinbase-webhook]
verify_jwt = false

[functions.get-vapid-key]
verify_jwt = false

[functions.push-subscribe]
verify_jwt = false

[functions.push-unsubscribe]
verify_jwt = false

[functions.send-push-notification]
verify_jwt = false

[functions.notify-admins]
verify_jwt = false

[functions.cleanup-demo-trades]
verify_jwt = false

[functions.process-admin-notifications]
verify_jwt = false

[functions.generate-vapid-keys]
verify_jwt = false

[functions.create-referral]
verify_jwt = false

[functions.pushin-pay-webhook]
verify_jwt = false

[functions.woovi-webhook]
verify_jwt = false
```

---

## 🌐 PASSO 8: VARIÁVEIS DE AMBIENTE (Vercel/Hosting)

No painel do Vercel (ou outro hosting), adicione as seguintes variáveis de ambiente:

```
VITE_SUPABASE_URL=https://<SEU_PROJETO>.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=<SUA_ANON_KEY>
VITE_SUPABASE_PROJECT_ID=<SEU_PROJECT_ID>
VITE_STRIPE_PUBLISHABLE_KEY=<SUA_STRIPE_PUBLISHABLE_KEY>
```

> 💡 Encontre esses valores em: **Supabase Dashboard > Settings > API**

---

## 👤 PASSO 9: CRIAR PRIMEIRO ADMIN

Após registrar o primeiro usuário na plataforma, promova-o a admin executando no **SQL Editor** do Supabase:

```sql
-- Substitua 'email@admin.com' pelo email do usuário que será admin
DO $$
DECLARE
  v_user_id UUID;
BEGIN
  -- Buscar o user_id pelo email
  SELECT user_id INTO v_user_id 
  FROM public.profiles 
  WHERE email = 'email@admin.com';
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuário não encontrado com esse email';
  END IF;
  
  -- Marcar como admin no profiles
  UPDATE public.profiles 
  SET is_admin = true 
  WHERE user_id = v_user_id;
  
  -- Adicionar role de admin
  INSERT INTO public.user_roles (user_id, role) 
  VALUES (v_user_id, 'admin') 
  ON CONFLICT (user_id, role) DO NOTHING;
  
  RAISE NOTICE 'Admin criado com sucesso para user_id: %', v_user_id;
END;
$$;
```

---

## 🔗 PASSO 10: CONFIGURAR WEBHOOKS EXTERNOS

### Stripe Webhook
1. Acesse [Stripe Dashboard > Webhooks](https://dashboard.stripe.com/webhooks)
2. Clique em **Add endpoint**
3. URL: `https://<SEU_PROJETO>.supabase.co/functions/v1/stripe-webhook`
4. Eventos a escutar:
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
   - `payment_intent.canceled`
5. Copie o **Signing secret** e adicione como secret `STRIPE_WEBHOOK_SECRET` no Supabase

### Coinbase Webhook (se usar)
1. Acesse [Coinbase Commerce Dashboard](https://commerce.coinbase.com/dashboard/settings)
2. Em **Webhook subscriptions**, adicione:
3. URL: `https://<SEU_PROJETO>.supabase.co/functions/v1/coinbase-webhook`

### Pushin Pay Webhook (se usar PIX via Pushin Pay)
1. Configure no painel do Pushin Pay
2. URL: `https://<SEU_PROJETO>.supabase.co/functions/v1/pushin-pay-webhook`
3. Adicione o secret `PUSHIN_PAY_TOKEN` no Supabase

### Woovi/OpenPix Webhook (se usar PIX via Woovi)
1. Configure no painel da Woovi/OpenPix
2. URL: `https://<SEU_PROJETO>.supabase.co/functions/v1/woovi-webhook`
3. Adicione os secrets `WOOVI_APP_ID` e `WOOVI_WEBHOOK_SECRET` no Supabase

---

## ✅ CHECKLIST FINAL

- [ ] Projeto Supabase criado
- [ ] PASSO 1 executado (estrutura do banco)
- [ ] PASSO 2 executado (dados seed)
- [ ] PASSO 3 executado (storage buckets)
- [ ] PASSO 4 executado (realtime)
- [ ] PASSO 5 executado (cron jobs com pg_cron + pg_net)
- [ ] PASSO 6 executado (secrets configurados)
- [ ] **PASSO 7 executado (TODAS as edge functions deployadas)**
- [ ] PASSO 8 executado (variáveis de ambiente no hosting)
- [ ] PASSO 9 executado (primeiro admin criado)
- [ ] PASSO 10 executado (webhooks configurados)
- [ ] URLs de ícones dos assets atualizadas para o novo projeto
- [ ] URLs de imagens do gráfico atualizadas para o novo projeto
- [ ] Plataforma testada: registro, login, trading, depósito

---

## 🆘 TROUBLESHOOTING

### Erro "relation does not exist"
Execute os passos na ordem correta: PASSO 1 antes do PASSO 2.

### Erro ao gerar candles / "Function not found"
A edge function `generate-candles` não foi deployada. Execute o PASSO 7.

### Trades não expirando
Verifique se o cron job `process-expired-trades` está ativo e se a edge function está deployada.

### Candles não atualizando
Verifique se o cron job `update-current-candles` está ativo e se a edge function está deployada.

### Balance não atualizando em tempo real
Verifique se o PASSO 4 (Realtime) foi executado corretamente.

### Pagamentos não processando
Verifique se os webhooks estão configurados corretamente (PASSO 10).

### Erro "SUPABASE_URL not found" em edge functions
Configure os secrets no Supabase Dashboard → Settings → Edge Functions (PASSO 6).

### Ícones dos assets não aparecem
As URLs apontam para o projeto original. Faça upload das imagens no seu bucket `popup-images` e atualize a coluna `icon_url` na tabela `assets`.

### Admin não consegue acessar o painel
Verifique se o PASSO 9 foi executado e se o usuário tem a role `admin` na tabela `user_roles`.

---

**Documento atualizado em: 21/02/2026**
**Versão: 4.1 - Corrigido: numeração dos passos, cron jobs (pg_cron mínimo 1 min), URLs hardcoded, criação de admin, webhooks PIX, edge functions completas**
