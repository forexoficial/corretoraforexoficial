-- Adicionar política para permitir que todos vejam gateways ativos (apenas campos públicos)
CREATE POLICY "Anyone can view active payment gateways" 
ON public.payment_gateways 
FOR SELECT 
USING (is_active = true);