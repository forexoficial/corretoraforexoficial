-- Permitir leitura pública das configurações da plataforma
-- Isso é seguro porque são configurações públicas que todos precisam ver

DROP POLICY IF EXISTS "Allow public read access to platform settings" ON platform_settings;

CREATE POLICY "Allow public read access to platform settings"
ON platform_settings
FOR SELECT
TO public
USING (true);

-- Garantir que apenas admins possam modificar
DROP POLICY IF EXISTS "Allow admin to update platform settings" ON platform_settings;

CREATE POLICY "Allow admin to update platform settings"
ON platform_settings
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.user_id = auth.uid()
    AND profiles.is_admin = true
  )
);

DROP POLICY IF EXISTS "Allow admin to insert platform settings" ON platform_settings;

CREATE POLICY "Allow admin to insert platform settings"
ON platform_settings
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.user_id = auth.uid()
    AND profiles.is_admin = true
  )
);