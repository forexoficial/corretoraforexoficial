-- Create platform settings table
CREATE TABLE IF NOT EXISTS public.platform_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text UNIQUE NOT NULL,
  value text NOT NULL,
  description text,
  updated_at timestamp with time zone DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;

-- Admin can manage settings
CREATE POLICY "Admins can manage platform settings"
ON public.platform_settings
FOR ALL
USING (has_role(auth.uid(), 'admin'));

-- Insert default settings
INSERT INTO public.platform_settings (key, value, description) VALUES
('platform_name', 'Trading Platform', 'Nome da plataforma'),
('support_email', 'suporte@plataforma.com', 'Email de suporte'),
('support_phone', '+55 11 99999-9999', 'Telefone de suporte'),
('min_deposit', '10', 'Depósito mínimo em reais'),
('min_withdrawal', '60', 'Saque mínimo em reais'),
('max_withdrawal', '10000', 'Saque máximo em reais'),
('min_trade', '5', 'Trade mínimo em reais'),
('withdrawal_fee', '0', 'Taxa de saque em percentual'),
('deposit_fee', '0', 'Taxa de depósito em percentual'),
('default_payout', '91', 'Payout padrão em percentual'),
('require_verification', 'true', 'Exigir verificação antes de saques'),
('allow_registration', 'true', 'Permitir novos cadastros'),
('maintenance_mode', 'false', 'Modo de manutenção')
ON CONFLICT (key) DO NOTHING;

-- Add blocked column to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_blocked boolean DEFAULT false;

-- Create trigger to update platform_settings updated_at
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