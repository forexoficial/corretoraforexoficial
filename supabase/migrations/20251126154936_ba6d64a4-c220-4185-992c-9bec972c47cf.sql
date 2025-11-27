-- Tabela para configurações de provedores OAuth sociais
CREATE TABLE IF NOT EXISTS social_auth_providers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider TEXT NOT NULL UNIQUE CHECK (provider IN ('google', 'facebook', 'apple')),
  is_enabled BOOLEAN NOT NULL DEFAULT false,
  client_id TEXT,
  client_secret TEXT,
  config JSONB DEFAULT '{}'::jsonb,
  instructions TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_by UUID REFERENCES auth.users(id)
);

-- Habilitar RLS
ALTER TABLE social_auth_providers ENABLE ROW LEVEL SECURITY;

-- Políticas RLS - apenas admins podem gerenciar
CREATE POLICY "Admins podem gerenciar provedores OAuth"
  ON social_auth_providers
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Todos podem ver provedores ativos (para exibir os botões)
CREATE POLICY "Todos podem ver provedores OAuth ativos"
  ON social_auth_providers
  FOR SELECT
  USING (is_enabled = true);

-- Trigger para atualizar updated_at
CREATE TRIGGER update_social_auth_providers_updated_at
  BEFORE UPDATE ON social_auth_providers
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Inserir dados iniciais dos provedores
INSERT INTO social_auth_providers (provider, is_enabled, instructions) VALUES
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

Importante: No Supabase, vá em Authentication > Providers > Google e adicione o Client ID e Secret lá também.'),

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

Importante: No Supabase, vá em Authentication > Providers > Facebook e adicione o App ID e Secret lá também.'),

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

Observação: Apple OAuth requer configuração adicional complexa. Consulte a documentação do Supabase para detalhes completos.')
ON CONFLICT (provider) DO NOTHING;

COMMENT ON TABLE social_auth_providers IS 'Gerenciamento de provedores de autenticação social (Google, Facebook, Apple)';
COMMENT ON COLUMN social_auth_providers.provider IS 'Nome do provedor: google, facebook ou apple';
COMMENT ON COLUMN social_auth_providers.is_enabled IS 'Se o provedor está ativo e visível na página de login';
COMMENT ON COLUMN social_auth_providers.client_id IS 'Client ID do provedor OAuth';
COMMENT ON COLUMN social_auth_providers.client_secret IS 'Client Secret do provedor OAuth (armazenado de forma segura)';
COMMENT ON COLUMN social_auth_providers.config IS 'Configurações adicionais específicas do provedor';
COMMENT ON COLUMN social_auth_providers.instructions IS 'Instruções de configuração para o admin';