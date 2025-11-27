import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Shield, Save, Eye, EyeOff, ExternalLink, Info } from "lucide-react";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface SocialProvider {
  id: string;
  provider: 'google' | 'facebook' | 'apple';
  is_enabled: boolean;
  client_id: string | null;
  client_secret: string | null;
  config: any;
  instructions: string | null;
}

const providerInfo = {
  google: {
    name: 'Google',
    icon: '🔍',
    docsUrl: 'https://supabase.com/docs/guides/auth/social-login/auth-google'
  },
  facebook: {
    name: 'Facebook',
    icon: '📘',
    docsUrl: 'https://supabase.com/docs/guides/auth/social-login/auth-facebook'
  },
  apple: {
    name: 'Apple',
    icon: '🍎',
    docsUrl: 'https://supabase.com/docs/guides/auth/social-login/auth-apple'
  }
};

export default function AdminSocialAuth() {
  const [providers, setProviders] = useState<SocialProvider[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({});
  const [expandedInstructions, setExpandedInstructions] = useState<Record<string, boolean>>({});

  useEffect(() => {
    loadProviders();
  }, []);

  const loadProviders = async () => {
    try {
      const { data, error } = await supabase
        .from('social_auth_providers')
        .select('*')
        .order('provider');

      if (error) throw error;
      setProviders((data as SocialProvider[]) || []);
    } catch (error) {
      console.error('Error loading providers:', error);
      toast.error('Erro ao carregar provedores');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (provider: SocialProvider) => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('social_auth_providers')
        .update({
          is_enabled: provider.is_enabled,
          client_id: provider.client_id,
          client_secret: provider.client_secret,
          config: provider.config,
          updated_at: new Date().toISOString()
        })
        .eq('id', provider.id);

      if (error) throw error;

      toast.success(`Provedor ${providerInfo[provider.provider].name} atualizado com sucesso!`);
      loadProviders();
    } catch (error) {
      console.error('Error saving provider:', error);
      toast.error('Erro ao salvar configurações');
    } finally {
      setSaving(false);
    }
  };

  const updateProvider = (id: string, field: string, value: any) => {
    setProviders(prev => prev.map(p => 
      p.id === id ? { ...p, [field]: value } : p
    ));
  };

  const toggleSecret = (providerId: string) => {
    setShowSecrets(prev => ({ ...prev, [providerId]: !prev[providerId] }));
  };

  const toggleInstructions = (providerId: string) => {
    setExpandedInstructions(prev => ({ ...prev, [providerId]: !prev[providerId] }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20">
      <div>
        <h1 className="text-3xl font-bold">Autenticação Social</h1>
        <p className="text-muted-foreground mt-2">
          Configure os provedores de login social (Google, Facebook, Apple)
        </p>
      </div>

      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          <strong>Importante:</strong> Após configurar aqui, você TAMBÉM precisa configurar cada provedor no painel do Supabase em 
          {' '}<a 
            href="https://supabase.com/dashboard/project/xhmisqcngalyjapkdwvh/auth/providers"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline inline-flex items-center gap-1"
          >
            Authentication → Providers
            <ExternalLink className="h-3 w-3" />
          </a>
        </AlertDescription>
      </Alert>

      {providers.map((provider) => {
        const info = providerInfo[provider.provider];
        return (
          <Card key={provider.id}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-4xl">{info.icon}</span>
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      {info.name}
                      <a
                        href={info.docsUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline text-sm font-normal inline-flex items-center gap-1"
                      >
                        Documentação
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </CardTitle>
                    <CardDescription>
                      Configure o login com {info.name}
                    </CardDescription>
                  </div>
                </div>
                <Switch
                  checked={provider.is_enabled}
                  onCheckedChange={(checked) => updateProvider(provider.id, 'is_enabled', checked)}
                />
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              {provider.instructions && (
                <div className="space-y-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => toggleInstructions(provider.id)}
                    className="w-full"
                  >
                    <Info className="h-4 w-4 mr-2" />
                    {expandedInstructions[provider.id] ? 'Ocultar' : 'Ver'} Instruções de Configuração
                  </Button>
                  
                  {expandedInstructions[provider.id] && (
                    <Alert className="bg-muted/50">
                      <AlertDescription>
                        <pre className="text-xs whitespace-pre-wrap font-mono">
                          {provider.instructions}
                        </pre>
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              )}

              <Separator />

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor={`${provider.provider}_client_id`}>
                    Client ID / App ID
                  </Label>
                  <Input
                    id={`${provider.provider}_client_id`}
                    type="text"
                    value={provider.client_id || ''}
                    onChange={(e) => updateProvider(provider.id, 'client_id', e.target.value)}
                    placeholder="Cole o Client ID aqui"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor={`${provider.provider}_client_secret`}>
                    Client Secret / App Secret
                  </Label>
                  <div className="relative">
                    <Input
                      id={`${provider.provider}_client_secret`}
                      type={showSecrets[provider.id] ? 'text' : 'password'}
                      value={provider.client_secret || ''}
                      onChange={(e) => updateProvider(provider.id, 'client_secret', e.target.value)}
                      placeholder="Cole o Client Secret aqui"
                      className="pr-10"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleSecret(provider.id)}
                      className="absolute right-0 top-0 h-full px-3"
                    >
                      {showSecrets[provider.id] ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    ⚠️ Mantenha este valor seguro. Nunca compartilhe publicamente.
                  </p>
                </div>
              </div>

              <div className="flex justify-end pt-4">
                <Button
                  onClick={() => handleSave(provider)}
                  disabled={saving || !provider.client_id || !provider.client_secret}
                >
                  <Save className="h-4 w-4 mr-2" />
                  Salvar Configurações
                </Button>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}