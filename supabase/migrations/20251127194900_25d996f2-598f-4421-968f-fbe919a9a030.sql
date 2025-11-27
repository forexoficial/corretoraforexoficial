
-- ============================================
-- CORREÇÃO: ADICIONAR POLÍTICAS RLS PARA ADMINS
-- ============================================

-- 1. TRANSACTIONS: Adicionar políticas para admins
CREATE POLICY "Admins can view all transactions"
ON public.transactions
FOR SELECT
TO public
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update all transactions"
ON public.transactions
FOR UPDATE
TO public
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete transactions"
ON public.transactions
FOR DELETE
TO public
USING (has_role(auth.uid(), 'admin'::app_role));

-- 2. TRADES: Adicionar políticas para admins
CREATE POLICY "Admins can view all trades"
ON public.trades
FOR SELECT
TO public
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update all trades"
ON public.trades
FOR UPDATE
TO public
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete trades"
ON public.trades
FOR DELETE
TO public
USING (has_role(auth.uid(), 'admin'::app_role));

-- 3. USER_BOOSTERS: Adicionar política de visualização para admins
-- (já existe "Admins can view all user boosters" mas vamos garantir update também)
CREATE POLICY "Admins can update all user boosters"
ON public.user_boosters
FOR UPDATE
TO public
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete user boosters"
ON public.user_boosters
FOR DELETE
TO public
USING (has_role(auth.uid(), 'admin'::app_role));
