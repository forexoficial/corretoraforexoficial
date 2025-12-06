import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Plus, Pencil, Trash2, Key, Wallet, CheckCircle, XCircle, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { 
  GatewayType,
  PixProvider,
  CryptoProvider,
  WorldwideProvider,
  gatewayFormSchema,
  PIX_PROVIDER_CREDENTIALS,
  CRYPTO_PROVIDER_CREDENTIALS,
  WORLDWIDE_PROVIDER_CREDENTIALS
} from "@/types/payment-gateway";
import type { Gateway, CredentialField, GatewayProvider } from "@/types/payment-gateway";

export default function AdminGateways() {
  const [gateways, setGateways] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [pixDialogOpen, setPixDialogOpen] = useState(false);
  const [cryptoDialogOpen, setCryptoDialogOpen] = useState(false);
  const [worldwideDialogOpen, setWorldwideDialogOpen] = useState(false);
  const [editingGateway, setEditingGateway] = useState<any | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    type: GatewayType.PIX,
    provider: PixProvider.MERCADO_PAGO as string,
    secretName: "MERCADO_PAGO_ACCESS_TOKEN",
    credentials: {} as Record<string, string>,
    webhookUrl: "",
    config: JSON.stringify({ provider: "mercado_pago" }, null, 2),
    isActive: true,
  });

  useEffect(() => {
    fetchGateways();
  }, []);

  const fetchGateways = async () => {
    const { data, error } = await supabase
      .from("payment_gateways")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Erro ao carregar gateways");
      console.error(error);
      return;
    }

    setGateways(data || []);
    setLoading(false);
  };

  const handleSave = async () => {
    try {
      // Validate name first for better UX
      if (!formData.name || formData.name.trim().length < 3) {
        toast.error("Nome do gateway deve ter no mínimo 3 caracteres");
        return;
      }

      // Get credentials based on gateway type
      let providerCredentials: CredentialField[] = [];
      
      if (formData.type === GatewayType.PIX) {
        const pixProvider = formData.provider as PixProvider;
        providerCredentials = PIX_PROVIDER_CREDENTIALS[pixProvider] || [];
      } else if (formData.type === GatewayType.CRYPTO) {
        const cryptoProvider = formData.provider as CryptoProvider;
        providerCredentials = CRYPTO_PROVIDER_CREDENTIALS[cryptoProvider] || [];
      } else if (formData.type === GatewayType.WORLDWIDE) {
        const worldwideProvider = formData.provider as WorldwideProvider;
        providerCredentials = WORLDWIDE_PROVIDER_CREDENTIALS[worldwideProvider] || [];
      }
      
      if (providerCredentials.length === 0) {
        toast.error("Provedor inválido para o tipo selecionado");
        return;
      }

      // Validate required credentials
      const requiredFields = providerCredentials.filter((f: CredentialField) => f.required);
      const missingFields = requiredFields.filter((f: CredentialField) => !formData.credentials[f.name]?.trim());
      
      if (!editingGateway && missingFields.length > 0) {
        toast.error(`Campos obrigatórios faltando: ${missingFields.map(f => f.label).join(", ")}`);
        return;
      }

      // Validate form data with Zod
      const validatedData = gatewayFormSchema.parse({
        name: formData.name.trim(),
        type: formData.type,
        provider: formData.provider,
        secretName: formData.secretName,
        webhookUrl: formData.webhookUrl || undefined,
        config: formData.config,
        isActive: formData.isActive
      });

      // Parse and validate config JSON
      const configJson = JSON.parse(validatedData.config);
      
      // Ensure provider is in config
      if (!configJson.provider) {
        configJson.provider = validatedData.provider;
      }
      if (!configJson.secretName) {
        configJson.secretName = validatedData.secretName;
      }

      // Store credentials in config for now (encrypted at rest by Supabase)
      const hasCredentials = Object.values(formData.credentials).some(v => v?.trim());
      if (hasCredentials) {
        configJson.credentials = formData.credentials;
      }

      toast.loading("Salvando gateway...");

      const gatewayData = {
        name: validatedData.name,
        type: validatedData.type,
        config: configJson,
        webhook_url: validatedData.webhookUrl || null,
        is_active: validatedData.isActive,
        api_key: null,
        api_secret: null,
      };

      if (editingGateway) {
        const { error } = await supabase
          .from("payment_gateways")
          .update(gatewayData)
          .eq("id", editingGateway.id);

        if (error) throw error;
        toast.dismiss();
        toast.success("Gateway atualizado com sucesso!");
      } else {
        const { error } = await supabase
          .from("payment_gateways")
          .insert(gatewayData);

        if (error) throw error;
        toast.dismiss();
        toast.success("Gateway criado com sucesso!");
      }

      setPixDialogOpen(false);
      setCryptoDialogOpen(false);
      setWorldwideDialogOpen(false);
      resetForm();
      fetchGateways();
    } catch (error: any) {
      console.error("Error saving gateway:", error);
      toast.dismiss();
      if (error.name === 'ZodError') {
        toast.error(`Validação: ${error.errors[0].message}`);
      } else {
        toast.error(`Erro ao salvar gateway: ${error.message}`);
      }
    }
  };

  const handleDelete = async (id: string, secretName?: string) => {
    if (!confirm("Tem certeza que deseja excluir este gateway?")) return;

    try {
      toast.loading("Excluindo gateway...");

      const { error } = await supabase
        .from("payment_gateways")
        .delete()
        .eq("id", id);

      if (error) throw error;

      toast.dismiss();
      toast.success("Gateway excluído com sucesso!");
      fetchGateways();
    } catch (error: any) {
      console.error("Error deleting gateway:", error);
      toast.dismiss();
      toast.error("Erro ao excluir gateway");
    }
  };

  const handleEdit = (gateway: any) => {
    setEditingGateway(gateway);
    setFormData({
      name: gateway.name,
      type: gateway.type,
      provider: gateway.config?.provider || PixProvider.MERCADO_PAGO,
      secretName: gateway.config?.secretName || "MERCADO_PAGO_ACCESS_TOKEN",
      credentials: {},
      webhookUrl: gateway.webhook_url || "",
      config: JSON.stringify(gateway.config || {}, null, 2),
      isActive: gateway.is_active,
    });
    if (gateway.type === GatewayType.PIX || gateway.type === "pix") {
      setPixDialogOpen(true);
    } else if (gateway.type === GatewayType.WORLDWIDE || gateway.type === "worldwide") {
      setWorldwideDialogOpen(true);
    } else {
      setCryptoDialogOpen(true);
    }
  };

  const resetForm = () => {
    setEditingGateway(null);
    setFormData({
      name: "",
      type: GatewayType.PIX,
      provider: PixProvider.MERCADO_PAGO,
      secretName: "MERCADO_PAGO_ACCESS_TOKEN",
      credentials: {},
      webhookUrl: "",
      config: JSON.stringify({ provider: "mercado_pago" }, null, 2),
      isActive: true,
    });
  };

  const getProviderIcon = (provider: string) => {
    switch (provider) {
      case PixProvider.MERCADO_PAGO:
        return <Wallet className="h-4 w-4 text-blue-500" />;
      case PixProvider.CUSTOM_PIX:
        return <Key className="h-4 w-4 text-purple-500" />;
      case PixProvider.PIXUP:
        return <Wallet className="h-4 w-4 text-green-500" />;
      case CryptoProvider.CUSTOM_CRYPTO:
        return <Key className="h-4 w-4 text-amber-500" />;
      case CryptoProvider.COINBASE:
        return <Wallet className="h-4 w-4 text-blue-500" />;
      case WorldwideProvider.STRIPE:
        return <Wallet className="h-4 w-4 text-indigo-500" />;
      case WorldwideProvider.PAYPAL:
        return <Wallet className="h-4 w-4 text-blue-600" />;
      case WorldwideProvider.CUSTOM_WORLDWIDE:
        return <Key className="h-4 w-4 text-cyan-500" />;
      default:
        return <Key className="h-4 w-4 text-gray-500" />;
    }
  };

  // Get available providers based on selected type
  const getAvailableProviders = () => {
    if (formData.type === GatewayType.PIX) {
      return Object.values(PixProvider);
    } else if (formData.type === GatewayType.WORLDWIDE) {
      return Object.values(WorldwideProvider);
    } else {
      return Object.values(CryptoProvider);
    }
  };

  // Get current credentials fields
  const getCurrentCredentials = (): CredentialField[] => {
    if (formData.type === GatewayType.PIX) {
      return PIX_PROVIDER_CREDENTIALS[formData.provider as PixProvider] || [];
    } else if (formData.type === GatewayType.WORLDWIDE) {
      return WORLDWIDE_PROVIDER_CREDENTIALS[formData.provider as WorldwideProvider] || [];
    } else {
      return CRYPTO_PROVIDER_CREDENTIALS[formData.provider as CryptoProvider] || [];
    }
  };

  const openPixDialog = () => {
    resetForm();
    setFormData({
      name: "",
      type: GatewayType.PIX,
      provider: PixProvider.MERCADO_PAGO,
      secretName: "MERCADO_PAGO_ACCESS_TOKEN",
      credentials: {},
      webhookUrl: "",
      config: JSON.stringify({ provider: "mercado_pago" }, null, 2),
      isActive: true,
    });
    setPixDialogOpen(true);
  };

  const openCryptoDialog = () => {
    resetForm();
    setFormData({
      name: "",
      type: GatewayType.CRYPTO,
      provider: CryptoProvider.CUSTOM_CRYPTO,
      secretName: "CUSTOM_CRYPTO_WALLET",
      credentials: {},
      webhookUrl: "",
      config: JSON.stringify({ provider: "custom_crypto" }, null, 2),
      isActive: true,
    });
    setCryptoDialogOpen(true);
  };

  const openWorldwideDialog = () => {
    resetForm();
    setFormData({
      name: "",
      type: GatewayType.WORLDWIDE,
      provider: WorldwideProvider.STRIPE,
      secretName: "STRIPE_SECRET_KEY",
      credentials: {},
      webhookUrl: "",
      config: JSON.stringify({ provider: "stripe" }, null, 2),
      isActive: true,
    });
    setWorldwideDialogOpen(true);
  };

  if (loading) {
    return (
      <div className="flex justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold mb-2">Gateways de Pagamento</h1>
          <p className="text-muted-foreground">
            Configure os gateways de pagamento com segurança usando Supabase Secrets
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button onClick={openPixDialog} variant="default">
            <Plus className="h-4 w-4 mr-2" />
            Novo Gateway PIX
          </Button>
          <Button onClick={openCryptoDialog} variant="outline">
            <Plus className="h-4 w-4 mr-2" />
            Novo Gateway USDT
          </Button>
          <Button onClick={openWorldwideDialog} variant="secondary">
            <Plus className="h-4 w-4 mr-2" />
            Novo Gateway Worldwide
          </Button>
        </div>
      </div>

      {/* PIX Dialog */}
      <Dialog open={pixDialogOpen} onOpenChange={setPixDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingGateway && formData.type === GatewayType.PIX ? "Editar Gateway PIX" : "Novo Gateway PIX"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="bg-primary/10 border border-primary/20 rounded-lg p-3 text-sm">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium text-blue-900">🔐 Armazenamento Seguro</p>
                  <p className="text-blue-700 mt-1">
                    As credenciais são criptografadas e armazenadas de forma segura no banco de dados.
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Nome do Gateway <span className="text-destructive">*</span></Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Ex: Mercado Pago - PIX"
                required
              />
            </div>

            <div className="space-y-2">
              <Label>Provedor PIX</Label>
              <Select
                value={formData.provider}
                onValueChange={(value) => {
                  const secretMap: Record<string, string> = {
                    [PixProvider.MERCADO_PAGO]: "MERCADO_PAGO_ACCESS_TOKEN",
                    [PixProvider.CUSTOM_PIX]: "CUSTOM_PIX_API_KEY",
                    [PixProvider.PIXUP]: "PIXUP_CLIENT_ID",
                  };
                  setFormData({ 
                    ...formData, 
                    provider: value,
                    secretName: secretMap[value] || "CUSTOM_API_KEY",
                    config: JSON.stringify({ provider: value }, null, 2),
                    credentials: {}
                  });
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={PixProvider.MERCADO_PAGO}>Mercado Pago</SelectItem>
                  <SelectItem value={PixProvider.CUSTOM_PIX}>PIX Personalizado</SelectItem>
                  <SelectItem value={PixProvider.PIXUP}>PixUP</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-4 border rounded-lg p-4 bg-muted/30">
              <div className="flex items-center gap-2 mb-2">
                <Key className="h-4 w-4" />
                <Label className="text-base font-semibold">
                  {editingGateway ? "Atualizar Credenciais PIX" : "Credenciais PIX"}
                </Label>
              </div>
              {PIX_PROVIDER_CREDENTIALS[formData.provider as PixProvider]?.map((field) => (
                <div key={field.name} className="space-y-2">
                  <Label>
                    {field.label} {field.required && <span className="text-destructive">*</span>}
                  </Label>
                  <Input
                    type={field.type || "text"}
                    value={formData.credentials[field.name] || ""}
                    onChange={(e) =>
                      setFormData({ 
                        ...formData, 
                        credentials: {
                          ...formData.credentials,
                          [field.name]: e.target.value
                        }
                      })
                    }
                    placeholder={field.placeholder}
                  />
                  {field.description && (
                    <p className="text-xs text-muted-foreground">{field.description}</p>
                  )}
                </div>
              ))}
            </div>

            <div className="space-y-2">
              <Label>Webhook URL</Label>
              <Input
                value={formData.webhookUrl}
                onChange={(e) => setFormData({ ...formData, webhookUrl: e.target.value })}
                placeholder="https://xhmisqcngalyjapkdwvh.supabase.co/functions/v1/payment-webhook"
              />
            </div>

            <div className="flex items-center justify-between">
              <Label>Gateway Ativo</Label>
              <Switch
                checked={formData.isActive}
                onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
              />
            </div>

            <Button onClick={handleSave} className="w-full">
              {editingGateway ? "Atualizar" : "Criar"} Gateway PIX
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* USDT/Crypto Dialog */}
      <Dialog open={cryptoDialogOpen} onOpenChange={setCryptoDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingGateway && formData.type === GatewayType.CRYPTO ? "Editar Gateway USDT" : "Novo Gateway USDT"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 text-sm">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-destructive mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium text-amber-900">🔐 Armazenamento Seguro</p>
                  <p className="text-amber-700 mt-1">
                    As credenciais da carteira cripto são criptografadas e armazenadas de forma segura.
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Nome do Gateway <span className="text-destructive">*</span></Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Ex: Carteira USDT TRC20"
                required
              />
            </div>

            <div className="space-y-2">
              <Label>Provedor Cripto</Label>
              <Select
                value={formData.provider}
                onValueChange={(value) => {
                  const secretMap: Record<string, string> = {
                    [CryptoProvider.CUSTOM_CRYPTO]: "CUSTOM_CRYPTO_WALLET",
                    [CryptoProvider.COINBASE]: "COINBASE_API_KEY",
                  };
                  setFormData({ 
                    ...formData, 
                    provider: value,
                    secretName: secretMap[value] || "CUSTOM_API_KEY",
                    config: JSON.stringify({ provider: value }, null, 2),
                    credentials: {}
                  });
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={CryptoProvider.CUSTOM_CRYPTO}>USDT (Carteira Manual)</SelectItem>
                  <SelectItem value={CryptoProvider.COINBASE}>Coinbase Commerce</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-4 border rounded-lg p-4 bg-muted/30">
              <div className="flex items-center gap-2 mb-2">
                <Key className="h-4 w-4" />
                <Label className="text-base font-semibold">
                  {editingGateway ? "Atualizar Credenciais Cripto" : "Credenciais Cripto"}
                </Label>
              </div>
              {CRYPTO_PROVIDER_CREDENTIALS[formData.provider as CryptoProvider]?.map((field) => (
                <div key={field.name} className="space-y-2">
                  <Label>
                    {field.label} {field.required && <span className="text-destructive">*</span>}
                  </Label>
                  <Input
                    type={field.type || "text"}
                    value={formData.credentials[field.name] || ""}
                    onChange={(e) =>
                      setFormData({ 
                        ...formData, 
                        credentials: {
                          ...formData.credentials,
                          [field.name]: e.target.value
                        }
                      })
                    }
                    placeholder={field.placeholder}
                  />
                  {field.description && (
                    <p className="text-xs text-muted-foreground">{field.description}</p>
                  )}
                </div>
              ))}
            </div>

            <div className="space-y-2">
              <Label>Webhook URL (opcional)</Label>
              <Input
                value={formData.webhookUrl}
                onChange={(e) => setFormData({ ...formData, webhookUrl: e.target.value })}
                placeholder="https://xhmisqcngalyjapkdwvh.supabase.co/functions/v1/payment-webhook"
              />
            </div>

            <div className="flex items-center justify-between">
              <Label>Gateway Ativo</Label>
              <Switch
                checked={formData.isActive}
                onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
              />
            </div>

            <Button onClick={handleSave} className="w-full">
              {editingGateway ? "Atualizar" : "Criar"} Gateway USDT
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Worldwide Dialog */}
      <Dialog open={worldwideDialogOpen} onOpenChange={setWorldwideDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingGateway && formData.type === GatewayType.WORLDWIDE ? "Editar Gateway Worldwide" : "Novo Gateway Worldwide"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3 text-sm">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium text-blue-900 dark:text-blue-300">🌍 Gateways Internacionais</p>
                  <p className="text-blue-700 dark:text-blue-400 mt-1">
                    Configure gateways para aceitar pagamentos internacionais via cartão, PayPal, etc.
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Nome do Gateway <span className="text-destructive">*</span></Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Ex: Stripe - Cartão Internacional"
                required
              />
            </div>

            <div className="space-y-2">
              <Label>Provedor</Label>
              <Select
                value={formData.provider}
                onValueChange={(value) => {
                  const secretMap: Record<string, string> = {
                    [WorldwideProvider.STRIPE]: "STRIPE_SECRET_KEY",
                    [WorldwideProvider.PAYPAL]: "PAYPAL_CLIENT_ID",
                    [WorldwideProvider.CUSTOM_WORLDWIDE]: "CUSTOM_WORLDWIDE_API_KEY",
                  };
                  setFormData({ 
                    ...formData, 
                    provider: value,
                    secretName: secretMap[value] || "CUSTOM_API_KEY",
                    config: JSON.stringify({ provider: value }, null, 2),
                    credentials: {}
                  });
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={WorldwideProvider.STRIPE}>Stripe</SelectItem>
                  <SelectItem value={WorldwideProvider.PAYPAL}>PayPal</SelectItem>
                  <SelectItem value={WorldwideProvider.CUSTOM_WORLDWIDE}>Gateway Personalizado</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-4 border rounded-lg p-4 bg-muted/30">
              <div className="flex items-center gap-2 mb-2">
                <Key className="h-4 w-4" />
                <Label className="text-base font-semibold">
                  {editingGateway ? "Atualizar Credenciais" : "Credenciais do Gateway"}
                </Label>
              </div>
              {WORLDWIDE_PROVIDER_CREDENTIALS[formData.provider as WorldwideProvider]?.map((field) => (
                <div key={field.name} className="space-y-2">
                  <Label>
                    {field.label} {field.required && <span className="text-destructive">*</span>}
                  </Label>
                  <Input
                    type={field.type || "text"}
                    value={formData.credentials[field.name] || ""}
                    onChange={(e) =>
                      setFormData({ 
                        ...formData, 
                        credentials: {
                          ...formData.credentials,
                          [field.name]: e.target.value
                        }
                      })
                    }
                    placeholder={field.placeholder}
                  />
                  {field.description && (
                    <p className="text-xs text-muted-foreground">{field.description}</p>
                  )}
                </div>
              ))}
            </div>

            <div className="space-y-2">
              <Label>Webhook URL (opcional)</Label>
              <Input
                value={formData.webhookUrl}
                onChange={(e) => setFormData({ ...formData, webhookUrl: e.target.value })}
                placeholder="https://xhmisqcngalyjapkdwvh.supabase.co/functions/v1/payment-webhook"
              />
            </div>

            <div className="flex items-center justify-between">
              <Label>Gateway Ativo</Label>
              <Switch
                checked={formData.isActive}
                onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
              />
            </div>

            <Button onClick={handleSave} className="w-full">
              {editingGateway ? "Atualizar" : "Criar"} Gateway Worldwide
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <div className="space-y-8">
        {/* PIX Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b pb-3">
            <div>
              <h2 className="text-2xl font-bold">Gateways PIX</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Configure gateways para pagamentos via PIX
              </p>
            </div>
          </div>
          {gateways.filter(g => g.type === GatewayType.PIX || g.type === "pix").length === 0 ? (
            <Card className="p-8 text-center">
              <Wallet className="h-12 w-12 mx-auto mb-3 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-2">
                Nenhum gateway PIX configurado
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                Configure um gateway PIX para receber pagamentos instantâneos
              </p>
              <Button onClick={openPixDialog} size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Adicionar Gateway PIX
              </Button>
            </Card>
          ) : (
            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Gateway</TableHead>
                    <TableHead>Provedor</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Webhook</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {gateways.filter(g => g.type === GatewayType.PIX || g.type === "pix").map((gateway) => (
                    <TableRow key={gateway.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          {getProviderIcon(gateway.config?.provider)}
                          {gateway.name}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm capitalize">
                        {(gateway.config?.provider || "N/A").replace(/_/g, " ")}
                      </TableCell>
                      <TableCell>
                        {gateway.is_active ? (
                          <div className="flex items-center gap-1 text-green-600">
                            <CheckCircle className="h-4 w-4" />
                            <span className="text-xs">Ativo</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1 text-red-600">
                            <XCircle className="h-4 w-4" />
                            <span className="text-xs">Inativo</span>
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate">
                        {gateway.webhook_url || "—"}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEdit(gateway)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(gateway.id, gateway.config?.secretName)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          )}
        </div>

        {/* Crypto Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b pb-3">
            <div>
              <h2 className="text-2xl font-bold">Gateways Cripto (USDT)</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Configure gateways para pagamentos com criptomoedas
              </p>
            </div>
          </div>
          {gateways.filter(g => g.type === GatewayType.CRYPTO || g.type === "crypto" || g.type === "usdt").length === 0 ? (
            <Card className="p-8 text-center">
              <Wallet className="h-12 w-12 mx-auto mb-3 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-2">
                Nenhum gateway cripto configurado
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                Configure um gateway de criptomoedas para aceitar USDT
              </p>
              <Button onClick={openCryptoDialog} size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Adicionar Gateway USDT
              </Button>
            </Card>
          ) : (
            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Gateway</TableHead>
                    <TableHead>Provedor</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Webhook</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {gateways.filter(g => g.type === GatewayType.CRYPTO || g.type === "crypto" || g.type === "usdt").map((gateway) => (
                    <TableRow key={gateway.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          {getProviderIcon(gateway.config?.provider)}
                          {gateway.name}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm capitalize">
                        {(gateway.config?.provider || "N/A").replace(/_/g, " ")}
                      </TableCell>
                      <TableCell>
                        {gateway.is_active ? (
                          <div className="flex items-center gap-1 text-green-600">
                            <CheckCircle className="h-4 w-4" />
                            <span className="text-xs">Ativo</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1 text-red-600">
                            <XCircle className="h-4 w-4" />
                            <span className="text-xs">Inativo</span>
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate">
                        {gateway.webhook_url || "—"}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEdit(gateway)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(gateway.id, gateway.config?.secretName)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          )}
        </div>

        {/* Worldwide Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b pb-3">
            <div>
              <h2 className="text-2xl font-bold">Gateways Worldwide</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Configure gateways para pagamentos internacionais (Stripe, PayPal, etc.)
              </p>
            </div>
          </div>
          {gateways.filter(g => g.type === GatewayType.WORLDWIDE || g.type === "worldwide").length === 0 ? (
            <Card className="p-8 text-center">
              <Wallet className="h-12 w-12 mx-auto mb-3 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-2">
                Nenhum gateway internacional configurado
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                Configure um gateway para aceitar pagamentos internacionais
              </p>
              <Button onClick={openWorldwideDialog} size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Adicionar Gateway Worldwide
              </Button>
            </Card>
          ) : (
            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Gateway</TableHead>
                    <TableHead>Provedor</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Webhook</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {gateways.filter(g => g.type === GatewayType.WORLDWIDE || g.type === "worldwide").map((gateway) => (
                    <TableRow key={gateway.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          {getProviderIcon(gateway.config?.provider)}
                          {gateway.name}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm capitalize">
                        {(gateway.config?.provider || "N/A").replace(/_/g, " ")}
                      </TableCell>
                      <TableCell>
                        {gateway.is_active ? (
                          <div className="flex items-center gap-1 text-green-600">
                            <CheckCircle className="h-4 w-4" />
                            <span className="text-xs">Ativo</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1 text-red-600">
                            <XCircle className="h-4 w-4" />
                            <span className="text-xs">Inativo</span>
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate">
                        {gateway.webhook_url || "—"}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEdit(gateway)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(gateway.id, gateway.config?.secretName)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          )}
        </div>
      </div>

      {gateways.length > 0 && (
        <Card className="p-6 bg-success/10 border-success/20">
          <h3 className="font-semibold mb-3 text-success-foreground">📖 Como Usar</h3>
          <ol className="space-y-2 text-sm text-foreground list-decimal list-inside">
            <li>Clique em "Novo Gateway" e preencha os dados</li>
            <li>Insira suas credenciais da API (Access Token, API Key, etc.)</li>
            <li>As credenciais serão automaticamente armazenadas como Secrets seguros</li>
            <li>Configure o webhook na plataforma do gateway (se aplicável)</li>
            <li>Pronto! O gateway está configurado e funcionando</li>
          </ol>
        </Card>
      )}
    </div>
  );
}
