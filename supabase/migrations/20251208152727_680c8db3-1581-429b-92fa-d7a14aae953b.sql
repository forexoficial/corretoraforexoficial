-- Função para notificar admins via edge function
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
  -- Determinar o tipo de notificação baseado na tabela e operação
  CASE TG_TABLE_NAME
    WHEN 'transactions' THEN
      -- Novo depósito aprovado
      IF NEW.type = 'deposit' AND NEW.status = 'completed' AND (OLD IS NULL OR OLD.status != 'completed') THEN
        notification_type := 'new_deposit';
        amount_value := NEW.amount;
        user_id_value := NEW.user_id;
      -- Solicitação de saque
      ELSIF NEW.type = 'withdrawal' AND NEW.status = 'pending' AND (OLD IS NULL OR OLD.status != 'pending') THEN
        notification_type := 'withdrawal_request';
        amount_value := NEW.amount;
        user_id_value := NEW.user_id;
      ELSE
        RETURN NEW;
      END IF;
      
    WHEN 'verification_requests' THEN
      -- Nova solicitação de verificação
      IF NEW.status = 'under_review' AND (OLD IS NULL OR OLD.status != 'under_review') THEN
        notification_type := 'identity_verification';
        user_id_value := NEW.user_id;
      ELSE
        RETURN NEW;
      END IF;
      
    WHEN 'withdrawal_requests' THEN
      -- Solicitação de saque de afiliado
      IF NEW.status = 'pending' AND (OLD IS NULL OR OLD.status != 'pending') THEN
        notification_type := 'affiliate_withdrawal';
        amount_value := NEW.amount;
        -- Buscar user_id do afiliado
        SELECT a.user_id INTO user_id_value
        FROM affiliates a
        WHERE a.id = NEW.affiliate_id;
      ELSE
        RETURN NEW;
      END IF;
      
    WHEN 'profiles' THEN
      -- Novo usuário cadastrado
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
  
  -- Se não temos user_name, buscar do profile
  IF user_name IS NULL AND user_id_value IS NOT NULL THEN
    SELECT full_name INTO user_name
    FROM profiles
    WHERE user_id = user_id_value;
  END IF;
  
  -- Chamar a edge function notify-admins via pg_net (se disponível) ou http extension
  -- Como pg_net pode não estar disponível, vamos usar uma abordagem alternativa
  -- Inserir em uma tabela de fila que pode ser processada pelo cron
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

-- Criar tabela de fila de notificações para admins
CREATE TABLE IF NOT EXISTS public.admin_notification_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_type text NOT NULL,
  user_id uuid,
  user_name text,
  amount numeric,
  processed boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.admin_notification_queue ENABLE ROW LEVEL SECURITY;

-- Política para admins
CREATE POLICY "Admins can manage notification queue"
ON public.admin_notification_queue
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Criar triggers para cada tabela relevante

-- Trigger para transactions (depósitos e saques)
DROP TRIGGER IF EXISTS notify_admins_on_transaction ON public.transactions;
CREATE TRIGGER notify_admins_on_transaction
  AFTER INSERT OR UPDATE ON public.transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_admins_on_event();

-- Trigger para verification_requests (verificação de identidade)
DROP TRIGGER IF EXISTS notify_admins_on_verification ON public.verification_requests;
CREATE TRIGGER notify_admins_on_verification
  AFTER INSERT OR UPDATE ON public.verification_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_admins_on_event();

-- Trigger para withdrawal_requests (saques de afiliados)
DROP TRIGGER IF EXISTS notify_admins_on_affiliate_withdrawal ON public.withdrawal_requests;
CREATE TRIGGER notify_admins_on_affiliate_withdrawal
  AFTER INSERT OR UPDATE ON public.withdrawal_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_admins_on_event();

-- Trigger para profiles (novos usuários)
DROP TRIGGER IF EXISTS notify_admins_on_new_user ON public.profiles;
CREATE TRIGGER notify_admins_on_new_user
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_admins_on_event();