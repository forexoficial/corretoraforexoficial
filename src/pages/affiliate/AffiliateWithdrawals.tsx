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
import { DollarSign, Wallet, AlertCircle, CheckCircle2, Clock } from "lucide-react";
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

const MIN_WITHDRAWAL = 50;

const withdrawalSchema = z.object({
  amount: z.number()
    .min(MIN_WITHDRAWAL, `Valor mínimo de saque é R$ ${MIN_WITHDRAWAL}`)
    .positive("Valor deve ser positivo"),
  payment_method: z.string().refine(
    (val) => val === "pix" || val === "bank_transfer",
    { message: "Selecione um método de pagamento" }
  ),
  pix_key: z.string().optional(),
  bank_name: z.string().optional(),
  bank_account: z.string().optional(),
  bank_agency: z.string().optional(),
  account_holder: z.string().optional(),
});

interface WithdrawalRequest {
  id: string;
  amount: number;
  status: string;
  payment_method: string;
  payment_details: any;
  created_at: string;
  processed_at: string | null;
  rejection_reason: string | null;
}

export default function AffiliateWithdrawals() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [availableBalance, setAvailableBalance] = useState(0);
  const [withdrawals, setWithdrawals] = useState<WithdrawalRequest[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [isMarketingAccount, setIsMarketingAccount] = useState(false);
  
  const [formData, setFormData] = useState({
    amount: "",
    payment_method: "",
    pix_key: "",
    bank_name: "",
    bank_account: "",
    bank_agency: "",
    account_holder: "",
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
        .select("fake_pending_commission, is_active")
        .eq("affiliate_id", affiliate.id)
        .eq("is_active", true)
        .single();

      // If marketing metrics exist and are active, use fake balance
      if (marketingMetrics) {
        setIsMarketingAccount(true);
        setAvailableBalance(Number(marketingMetrics.fake_pending_commission) || 0);
        
        // Don't load real withdrawal history for marketing accounts
        setWithdrawals([]);
        setLoading(false);
        return;
      }

      setIsMarketingAccount(false);

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
        bank_name: formData.bank_name,
        bank_account: formData.bank_account,
        bank_agency: formData.bank_agency,
        account_holder: formData.account_holder,
      });

      // Check available balance
      if (validatedData.amount > availableBalance) {
        toast.error("Saldo insuficiente para este saque");
        return;
      }

      // Prepare payment details
      const payment_details = validatedData.payment_method === "pix"
        ? { pix_key: formData.pix_key }
        : {
            bank_name: formData.bank_name,
            bank_account: formData.bank_account,
            bank_agency: formData.bank_agency,
            account_holder: formData.account_holder,
          };

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
        payment_method: "",
        pix_key: "",
        bank_name: "",
        bank_account: "",
        bank_agency: "",
        account_holder: "",
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

      {/* Marketing Account Notice */}
      {isMarketingAccount && (
        <Card className="border-yellow-500/30 bg-yellow-500/5">
          <CardContent className="pt-4">
            <p className="text-sm text-yellow-600 dark:text-yellow-400 flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              <span>Conta de marketing - saldo fictício para demonstração</span>
            </p>
          </CardContent>
        </Card>
      )}

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
          
          {!isMarketingAccount && (
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
                    <Label htmlFor="payment_method" className="text-xs sm:text-sm">Método de Pagamento</Label>
                    <Select
                      value={formData.payment_method}
                      onValueChange={(value) =>
                        setFormData({ ...formData, payment_method: value })
                      }
                      required
                    >
                      <SelectTrigger className="text-sm">
                        <SelectValue placeholder="Selecione o método" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pix">PIX</SelectItem>
                        <SelectItem value="bank_transfer">Transferência Bancária</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {formData.payment_method === "pix" && (
                    <div className="space-y-2">
                      <Label htmlFor="pix_key" className="text-xs sm:text-sm">Chave PIX</Label>
                      <Input
                        id="pix_key"
                        value={formData.pix_key}
                        onChange={(e) => setFormData({ ...formData, pix_key: e.target.value })}
                        placeholder="CPF, e-mail, telefone ou chave aleatória"
                        required
                        className="text-sm"
                      />
                    </div>
                  )}

                  {formData.payment_method === "bank_transfer" && (
                    <>
                      <div className="space-y-2">
                        <Label htmlFor="account_holder" className="text-xs sm:text-sm">Titular da Conta</Label>
                        <Input
                          id="account_holder"
                          value={formData.account_holder}
                          onChange={(e) =>
                            setFormData({ ...formData, account_holder: e.target.value })
                          }
                          placeholder="Nome completo"
                          required
                          className="text-sm"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="bank_name" className="text-xs sm:text-sm">Banco</Label>
                        <Input
                          id="bank_name"
                          value={formData.bank_name}
                          onChange={(e) => setFormData({ ...formData, bank_name: e.target.value })}
                          placeholder="Nome do banco"
                          required
                          className="text-sm"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-2">
                          <Label htmlFor="bank_agency" className="text-xs sm:text-sm">Agência</Label>
                          <Input
                            id="bank_agency"
                            value={formData.bank_agency}
                            onChange={(e) =>
                              setFormData({ ...formData, bank_agency: e.target.value })
                            }
                            placeholder="0000"
                            required
                            className="text-sm"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="bank_account" className="text-xs sm:text-sm">Conta</Label>
                          <Input
                            id="bank_account"
                            value={formData.bank_account}
                            onChange={(e) =>
                              setFormData({ ...formData, bank_account: e.target.value })
                            }
                            placeholder="00000-0"
                            required
                            className="text-sm"
                          />
                        </div>
                      </div>
                    </>
                  )}

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

          {!isMarketingAccount && availableBalance < MIN_WITHDRAWAL && (
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
