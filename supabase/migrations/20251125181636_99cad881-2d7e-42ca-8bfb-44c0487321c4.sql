-- Tabela para documentos legais/jurídicos
CREATE TABLE IF NOT EXISTS public.legal_documents (
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

-- Tabela para informações da empresa
CREATE TABLE IF NOT EXISTS public.company_info (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  key TEXT NOT NULL UNIQUE,
  value TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.legal_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_info ENABLE ROW LEVEL SECURITY;

-- Policies para legal_documents
CREATE POLICY "Todos podem visualizar documentos legais ativos"
  ON public.legal_documents
  FOR SELECT
  USING (is_active = true);

CREATE POLICY "Admins podem gerenciar documentos legais"
  ON public.legal_documents
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Policies para company_info
CREATE POLICY "Todos podem visualizar informações da empresa"
  ON public.company_info
  FOR SELECT
  USING (true);

CREATE POLICY "Admins podem gerenciar informações da empresa"
  ON public.company_info
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Trigger para updated_at em legal_documents
CREATE TRIGGER update_legal_documents_updated_at
  BEFORE UPDATE ON public.legal_documents
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger para updated_at em company_info
CREATE TRIGGER update_company_info_updated_at
  BEFORE UPDATE ON public.company_info
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Inserir documentos legais padrão
INSERT INTO public.legal_documents (title, slug, description, icon, display_order, content) VALUES
  ('Termos de Uso', 'termos-de-uso', 'Condições gerais de uso da plataforma', 'Scale', 1, '<h1>Termos de Uso</h1><p>Conteúdo a ser definido pelo administrador.</p>'),
  ('Política de Privacidade', 'politica-privacidade', 'Como tratamos seus dados pessoais', 'Shield', 2, '<h1>Política de Privacidade</h1><p>Conteúdo a ser definido pelo administrador.</p>'),
  ('Política de Cookies', 'politica-cookies', 'Como utilizamos cookies no site', 'Cookie', 3, '<h1>Política de Cookies</h1><p>Conteúdo a ser definido pelo administrador.</p>'),
  ('Política de Segurança', 'politica-seguranca', 'Medidas de proteção e segurança', 'Lock', 4, '<h1>Política de Segurança</h1><p>Conteúdo a ser definido pelo administrador.</p>'),
  ('Termos de Serviço', 'termos-servico', 'Acordo de prestação de serviços', 'FileText', 5, '<h1>Termos de Serviço</h1><p>Conteúdo a ser definido pelo administrador.</p>'),
  ('Regulamentação', 'regulamentacao', 'Informações legais e regulatórias', 'BookOpen', 6, '<h1>Regulamentação</h1><p>Conteúdo a ser definido pelo administrador.</p>'),
  ('Sobre Nós', 'sobre-nos', 'Conheça nossa empresa e missão', 'Info', 7, '<h1>Sobre Nós</h1><p>Conteúdo a ser definido pelo administrador.</p>'),
  ('Contato Jurídico', 'contato-juridico', 'Fale com nosso departamento legal', 'Mail', 8, '<h1>Contato Jurídico</h1><p>Email: juridico@suaempresa.com</p>')
ON CONFLICT (slug) DO NOTHING;

-- Inserir informações da empresa padrão
INSERT INTO public.company_info (key, value, description) VALUES
  ('cnpj', '00.000.000/0001-00', 'CNPJ da empresa'),
  ('razao_social', 'Sua Empresa Ltda', 'Razão social da empresa'),
  ('endereco', 'Rua Exemplo, 123 - São Paulo/SP', 'Endereço completo'),
  ('email_juridico', 'juridico@suaempresa.com', 'Email do departamento jurídico'),
  ('versao_termos', '1.0', 'Versão atual dos termos'),
  ('data_atualizacao_termos', 'Janeiro/2025', 'Data da última atualização'),
  ('orgao_regulador_1', 'CVM - Comissão de Valores Mobiliários', 'Órgão regulador 1'),
  ('orgao_regulador_2', 'Banco Central do Brasil', 'Órgão regulador 2'),
  ('orgao_regulador_3', 'ANPD - Autoridade Nacional de Proteção de Dados', 'Órgão regulador 3')
ON CONFLICT (key) DO NOTHING;