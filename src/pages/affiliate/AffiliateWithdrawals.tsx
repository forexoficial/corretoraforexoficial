import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { DollarSign, Wallet, AlertCircle, CheckCircle2, Clock, Bitcoin } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const MIN_WITHDRAWAL = 50;

const withdrawalSchema = z.object({
  amount: z.number()
    .min(MIN_WITHDRAWAL, `Valor mínimo de saque é R$ ${MIN_WITHDRAWAL}`)
    .positive("Valor deve ser positivo"),
  payment_method: z.string().refine(
    (val) => val === "pix" || val === "crypto",
    { message: "Selecione um método de pagamento" }
  ),
  pix_key: z.string().optional(),
  pix_key_type: z.string().optional(),
  crypto_wallet: z.string().optional(),
  crypto_network: z.string().optional(),
});

interface WithdrawalRequest {
  id: string;
  amount: number;
  status: string;
  payment_method: string;
  payment_details?: any;
  created_at: string;
  processed_at: string | null;
  rejection_reason?: string | null;
}

interface FakeWithdrawal {
  id: string;
  amount: number;
  status: string;
  payment_method: string;
  created_at: string;
  processed_at: string | null;
}

export default function AffiliateWithdrawals() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [availableBalance, setAvailableBalance] = useState(0);
  const [withdrawals, setWithdrawals] = useState<WithdrawalRequest[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [isMarketingAccount, setIsMarketingAccount] = useState(false);
  const [marketingAffiliateId, setMarketingAffiliateId] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    amount: "",
    payment_method: "pix",
    pix_key: "",
    pix_key_type: "cpf",
    crypto_wallet: "",
    crypto_network: "trc20",
  });

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    try {
      // Get affiliate info and available balance
      const { data: affiliate } = await supabase
        .from("affiliates")
        .select("id, total_commission")
        .eq("user_id", user?.id)
        .single();

      if (!affiliate) {
        toast.error("Você não é um afiliado cadastrado");
        return;
      }

      // Check for marketing metrics (fake data for content creators)
      const { data: marketingMetrics } = await supabase
        .from("affiliate_marketing_metrics")
        .select("fake_pending_commission, fake_withdrawal_history, is_active")
        .eq("affiliate_id", affiliate.id)
        .eq("is_active", true)
        .single();

      // If marketing metrics exist and are active, use fake balance
      if (marketingMetrics) {
        setIsMarketingAccount(true);
        setMarketingAffiliateId(affiliate.id);
        setAvailableBalance(Number(marketingMetrics.fake_pending_commission) || 0);
        
        // Load fake withdrawal history for marketing accounts
        const fakeHistory = (marketingMetrics.fake_withdrawal_history as unknown as FakeWithdrawal[]) || [];
        const formattedHistory: WithdrawalRequest[] = fakeHistory.map(fw => ({
          id: fw.id,
          amount: fw.amount,
          status: fw.status,
          payment_method: fw.payment_method,
          created_at: fw.created_at,
          processed_at: fw.processed_at,
        }));
        setWithdrawals(formattedHistory);
        setLoading(false);
        return;
      }

      setIsMarketingAccount(false);
      setMarketingAffiliateId(null);

      // Get approved withdrawals to calculate available balance
      const { data: approvedWithdrawals } = await supabase
        .from("withdrawal_requests")
        .select("amount")
        .eq("affiliate_id", affiliate.id)
        .eq("status", "approved");

      const withdrawnAmount = approvedWithdrawals?.reduce(
        (sum, w) => sum + Number(w.amount), 0
      ) || 0;

      setAvailableBalance(Number(affiliate.total_commission) - withdrawnAmount);

      // Get all withdrawal requests
      const { data: withdrawalData, error } = await supabase
        .from("withdrawal_requests")
        .select("*")
        .eq("affiliate_id", affiliate.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setWithdrawals(withdrawalData || []);
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Erro ao carregar dados");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      // Get affiliate ID
      const { data: affiliate } = await supabase
        .from("affiliates")
        .select("id")
        .eq("user_id", user?.id)
        .single();

      if (!affiliate) {
        toast.error("Você não é um afiliado cadastrado");
        return;
      }

      // Validate form
      const validatedData = withdrawalSchema.parse({
        amount: parseFloat(formData.amount),
        payment_method: formData.payment_method,
        pix_key: formData.pix_key,
        pix_key_type: formData.pix_key_type,
        crypto_wallet: formData.crypto_wallet,
        crypto_network: formData.crypto_network,
      });

      // Check available balance
      if (validatedData.amount > availableBalance) {
        toast.error("Saldo insuficiente para este saque");
        return;
      }

      // For marketing accounts, just update the fake balance locally
      if (isMarketingAccount && marketingAffiliateId) {
        // Update the fake_pending_commission in the database
        const newBalance = availableBalance - validatedData.amount;
        
        const { error: updateError } = await supabase
          .from("affiliate_marketing_metrics")
          .update({ fake_pending_commission: newBalance })
          .eq("affiliate_id", marketingAffiliateId)
          .eq("is_active", true);

        if (updateError) throw updateError;

        // Update local state immediately
        setAvailableBalance(newBalance);
        toast.success(`Saque de R$ ${formatCurrency(validatedData.amount)} realizado com sucesso!`);
        setDialogOpen(false);
        setFormData({
          amount: "",
          payment_method: "pix",
          pix_key: "",
          pix_key_type: "cpf",
          crypto_wallet: "",
          crypto_network: "trc20",
        });
        return;
      }

      // Prepare payment details
      const payment_details = validatedData.payment_method === "pix"
        ? { pix_key: formData.pix_key, pix_key_type: formData.pix_key_type }
        : { crypto_wallet: formData.crypto_wallet, crypto_network: formData.crypto_network };

      // Create withdrawal request
      const { error } = await supabase
        .from("withdrawal_requests")
        .insert({
          affiliate_id: affiliate.id,
          amount: validatedData.amount,
          payment_method: validatedData.payment_method,
          payment_details,
        });

      if (error) throw error;

      toast.success("Solicitação de saque enviada com sucesso!");
      setDialogOpen(false);
      setFormData({
        amount: "",
        payment_method: "pix",
        pix_key: "",
        pix_key_type: "cpf",
        crypto_wallet: "",
        crypto_network: "trc20",
      });
      fetchData();
    } catch (error: any) {
      console.error("Error creating withdrawal:", error);
      if (error instanceof z.ZodError) {
        toast.error(error.issues[0].message);
      } else {
        toast.error("Erro ao criar solicitação de saque");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { label: "Pendente", variant: "secondary" as const, icon: Clock },
      processing: { label: "Processando", variant: "default" as const, icon: Clock },
      approved: { label: "Aprovado", variant: "default" as const, icon: CheckCircle2 },
      rejected: { label: "Rejeitado", variant: "destructive" as const, icon: AlertCircle },
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className="flex items-center gap-1 w-fit">
        <Icon className="w-3 h-3" />
        {config.label}
      </Badge>
    );
  };

  if (loading) {
    return <LoadingSpinner size="lg" className="min-h-[400px]" />;
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div>
        <h2 className="text-2xl sm:text-3xl font-bold">Saques</h2>
        <p className="text-sm sm:text-base text-muted-foreground mt-1">
          Solicite saques das suas comissões
        </p>
      </div>

      {/* Marketing Account Notice - Removed as requested */}

      {/* Balance Card */}
      <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base sm:text-lg">Saldo Disponível</CardTitle>
              <CardDescription className="text-xs sm:text-sm">
                Valor disponível para saque
              </CardDescription>
            </div>
            <Wallet className="w-8 h-8 sm:w-10 sm:h-10 text-primary" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-3xl sm:text-4xl font-bold text-primary mb-4">
            R$ {formatCurrency(availableBalance)}
          </div>
          
          {(
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button 
                  className="w-full sm:w-auto" 
                  disabled={availableBalance < MIN_WITHDRAWAL}
                >
                  <DollarSign className="w-4 h-4 mr-2" />
                  Solicitar Saque
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-[95vw] sm:max-w-md max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Solicitar Saque</DialogTitle>
                  <DialogDescription>
                    Valor mínimo: R$ {MIN_WITHDRAWAL}
                  </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="amount" className="text-xs sm:text-sm">Valor do Saque (R$)</Label>
                    <Input
                      id="amount"
                      type="number"
                      step="0.01"
                      min={MIN_WITHDRAWAL}
                      max={availableBalance}
                      value={formData.amount}
                      onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                      placeholder={`Mínimo: R$ ${MIN_WITHDRAWAL}`}
                      required
                      className="text-sm"
                    />
                    <p className="text-xs text-muted-foreground">
                      Disponível: R$ {formatCurrency(availableBalance)}
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs sm:text-sm">Método de Pagamento</Label>
                    <Tabs 
                      value={formData.payment_method} 
                      onValueChange={(value) => setFormData({ ...formData, payment_method: value })}
                      className="w-full"
                    >
                      <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="pix" className="flex items-center gap-2">
                          <DollarSign className="w-4 h-4" />
                          PIX
                        </TabsTrigger>
                        <TabsTrigger value="crypto" className="flex items-center gap-2">
                          <Bitcoin className="w-4 h-4" />
                          Cripto (USDT)
                        </TabsTrigger>
                      </TabsList>

                      <TabsContent value="pix" className="space-y-4 mt-4">
                        <div className="space-y-2">
                          <Label htmlFor="pix_key_type" className="text-xs sm:text-sm">Tipo de Chave PIX</Label>
                          <Select
                            value={formData.pix_key_type}
                            onValueChange={(value) => setFormData({ ...formData, pix_key_type: value })}
                          >
                            <SelectTrigger className="text-sm">
                              <SelectValue placeholder="Selecione o tipo" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="cpf">CPF</SelectItem>
                              <SelectItem value="cnpj">CNPJ</SelectItem>
                              <SelectItem value="email">E-mail</SelectItem>
                              <SelectItem value="phone">Telefone</SelectItem>
                              <SelectItem value="random">Chave Aleatória</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="pix_key" className="text-xs sm:text-sm">Chave PIX</Label>
                          <Input
                            id="pix_key"
                            value={formData.pix_key}
                            onChange={(e) => setFormData({ ...formData, pix_key: e.target.value })}
                            placeholder={
                              formData.pix_key_type === 'cpf' ? '000.000.000-00' :
                              formData.pix_key_type === 'cnpj' ? '00.000.000/0000-00' :
                              formData.pix_key_type === 'email' ? 'exemplo@email.com' :
                              formData.pix_key_type === 'phone' ? '+55 11 99999-9999' :
                              'Chave aleatória'
                            }
                            required={formData.payment_method === 'pix'}
                            className="text-sm"
                          />
                          <p className="text-xs text-muted-foreground">
                            Certifique-se de que a chave PIX está vinculada a uma conta em seu nome.
                          </p>
                        </div>
                      </TabsContent>

                      <TabsContent value="crypto" className="space-y-4 mt-4">
                        <div className="space-y-2">
                          <Label htmlFor="crypto_network" className="text-xs sm:text-sm">Rede</Label>
                          <Select
                            value={formData.crypto_network}
                            onValueChange={(value) => setFormData({ ...formData, crypto_network: value })}
                          >
                            <SelectTrigger className="text-sm">
                              <SelectValue placeholder="Selecione a rede" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="trc20">TRC20 (Tron)</SelectItem>
                              <SelectItem value="erc20">ERC20 (Ethereum)</SelectItem>
                              <SelectItem value="bep20">BEP20 (BSC)</SelectItem>
                              <SelectItem value="polygon">Polygon</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="crypto_wallet" className="text-xs sm:text-sm">Endereço da Carteira USDT</Label>
                          <Input
                            id="crypto_wallet"
                            value={formData.crypto_wallet}
                            onChange={(e) => setFormData({ ...formData, crypto_wallet: e.target.value })}
                            placeholder={
                              formData.crypto_network === 'trc20' ? 'T...' :
                              formData.crypto_network === 'erc20' ? '0x...' :
                              formData.crypto_network === 'bep20' ? '0x...' :
                              '0x...'
                            }
                            required={formData.payment_method === 'crypto'}
                            className="text-sm font-mono"
                          />
                          <p className="text-xs text-muted-foreground">
                            Endereço de carteira para receber USDT na rede {
                              formData.crypto_network === 'trc20' ? 'Tron (TRC20)' :
                              formData.crypto_network === 'erc20' ? 'Ethereum (ERC20)' :
                              formData.crypto_network === 'bep20' ? 'Binance Smart Chain (BEP20)' :
                              'Polygon'
                            }
                          </p>
                        </div>

                        <div className="p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                          <p className="text-xs text-yellow-600 dark:text-yellow-400">
                            ⚠️ Atenção: Verifique cuidadosamente o endereço da carteira. Transações em cripto são irreversíveis.
                          </p>
                        </div>
                      </TabsContent>
                    </Tabs>
                  </div>

                  <div className="flex gap-2 pt-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setDialogOpen(false)}
                      className="flex-1"
                      disabled={submitting}
                    >
                      Cancelar
                    </Button>
                    <Button type="submit" className="flex-1" disabled={submitting}>
                      {submitting ? "Enviando..." : "Solicitar"}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          )}

          {availableBalance < MIN_WITHDRAWAL && (
            <p className="text-xs sm:text-sm text-muted-foreground mt-3 flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              Saldo insuficiente. Mínimo para saque: R$ {MIN_WITHDRAWAL}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Withdrawals History */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base sm:text-lg">Histórico de Saques</CardTitle>
          <CardDescription className="text-xs sm:text-sm">
            Acompanhe suas solicitações de saque
          </CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto -mx-4 sm:mx-0">
          <Table className="min-w-[600px]">
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs sm:text-sm">Data</TableHead>
                <TableHead className="text-xs sm:text-sm">Valor</TableHead>
                <TableHead className="text-xs sm:text-sm">Método</TableHead>
                <TableHead className="text-xs sm:text-sm">Status</TableHead>
                <TableHead className="hidden sm:table-cell text-xs sm:text-sm">Processado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {withdrawals.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground text-sm">
                    Nenhuma solicitação de saque encontrada
                  </TableCell>
                </TableRow>
              ) : (
                withdrawals.map((withdrawal) => (
                  <TableRow key={withdrawal.id}>
                    <TableCell className="text-xs sm:text-sm">
                      {new Date(withdrawal.created_at).toLocaleDateString("pt-BR", {
                        day: "2-digit",
                        month: "2-digit",
                        year: "numeric",
                      })}
                    </TableCell>
                    <TableCell className="font-bold text-xs sm:text-sm">
                      R$ {formatCurrency(withdrawal.amount)}
                    </TableCell>
                    <TableCell className="text-xs sm:text-sm">
                      {withdrawal.payment_method === "pix" ? "PIX" : "Transferência"}
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(withdrawal.status)}
                    </TableCell>
                    <TableCell className="hidden sm:table-cell text-xs text-muted-foreground">
                      {withdrawal.processed_at
                        ? new Date(withdrawal.processed_at).toLocaleDateString("pt-BR")
                        : "-"}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Info Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base sm:text-lg flex items-center gap-2">
            <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5" />
            Informações Importantes
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-xs sm:text-sm text-muted-foreground">
            <li className="flex items-start gap-2">
              <span className="text-primary font-bold">•</span>
              <span>O valor mínimo para saque é de R$ {MIN_WITHDRAWAL}</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary font-bold">•</span>
              <span>Os saques são processados em até 3 dias úteis</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary font-bold">•</span>
              <span>Verifique seus dados bancários antes de solicitar</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary font-bold">•</span>
              <span>Para PIX, a chave deve estar em seu nome (CPF do cadastro)</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary font-bold">•</span>
              <span>Em caso de recusa, entre em contato com o suporte</span>
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
