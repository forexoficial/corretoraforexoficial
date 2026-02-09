import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Users, TrendingUp, DollarSign, UserPlus, Search, Copy, CheckCircle, Clock, AlertCircle, Check, X } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { Textarea } from "@/components/ui/textarea";
import { formatCurrency } from "@/lib/utils";

interface Affiliate {
  id: string;
  user_id: string;
  affiliate_code: string;
  commission_percentage: number;
  commission_model: string;
  cpa_value: number | null;
  cpa_min_deposit: number | null;
  total_referrals: number;
  total_commission: number;
  is_active: boolean;
  created_at: string;
  profiles?: {
    full_name: string;
    document: string;
  };
}

interface WithdrawalRequest {
  id: string;
  affiliate_id: string;
  amount: number;
  status: string;
  payment_method: string;
  payment_details: any;
  created_at: string;
  processed_at: string | null;
  rejection_reason: string | null;
  affiliate?: {
    affiliate_code: string;
    profiles?: {
      full_name: string;
    };
  };
}

export default function AdminAffiliates() {
  const [affiliates, setAffiliates] = useState<Affiliate[]>([]);
  const [withdrawals, setWithdrawals] = useState<WithdrawalRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
  const [selectedWithdrawal, setSelectedWithdrawal] = useState<WithdrawalRequest | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [processing, setProcessing] = useState(false);
  const [newAffiliate, setNewAffiliate] = useState({
    userId: "",
    commissionPercentage: 10,
    commissionModel: "rev" as "rev" | "cpa",
    cpaValue: 50,
    cpaMinDeposit: 100,
  });
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const stats = {
    totalAffiliates: affiliates.length,
    activeAffiliates: affiliates.filter(a => a.is_active).length,
    totalReferrals: affiliates.reduce((sum, a) => sum + a.total_referrals, 0),
    totalCommissions: affiliates.reduce((sum, a) => sum + a.total_commission, 0),
  };

  useEffect(() => {
    fetchAffiliates();
    fetchWithdrawals();
  }, []);

  const fetchAffiliates = async () => {
    try {
      const { data: affiliatesData, error: affiliatesError } = await supabase
        .from("affiliates")
        .select("*")
        .order("created_at", { ascending: false });

      if (affiliatesError) throw affiliatesError;

      // Fetch profiles separately
      const affiliatesWithProfiles = await Promise.all(
        (affiliatesData || []).map(async (affiliate) => {
          const { data: profile } = await supabase
            .from("profiles")
            .select("full_name, document")
            .eq("user_id", affiliate.user_id)
            .single();

          return {
            ...affiliate,
            commission_model: (affiliate as any).commission_model || "rev",
            cpa_value: (affiliate as any).cpa_value || null,
            cpa_min_deposit: (affiliate as any).cpa_min_deposit || null,
            profiles: profile || undefined,
          } as Affiliate;
        })
      );

      setAffiliates(affiliatesWithProfiles);
    } catch (error) {
      console.error("Error fetching affiliates:", error);
      toast.error("Erro ao carregar afiliados");
    } finally {
      setLoading(false);
    }
  };

  const fetchWithdrawals = async () => {
    try {
      const { data: withdrawalsData, error } = await supabase
        .from("withdrawal_requests")
        .select("*")
        .in("status", ["pending", "processing"])
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Fetch affiliate info for each withdrawal
      const withdrawalsWithAffiliates = await Promise.all(
        (withdrawalsData || []).map(async (withdrawal) => {
          const { data: affiliate } = await supabase
            .from("affiliates")
            .select("affiliate_code, user_id")
            .eq("id", withdrawal.affiliate_id)
            .single();

          if (affiliate) {
            const { data: profile } = await supabase
              .from("profiles")
              .select("full_name")
              .eq("user_id", affiliate.user_id)
              .single();

            return {
              ...withdrawal,
              affiliate: {
                affiliate_code: affiliate.affiliate_code,
                profiles: profile || undefined,
              },
            };
          }

          return withdrawal;
        })
      );

      setWithdrawals(withdrawalsWithAffiliates);
    } catch (error) {
      console.error("Error fetching withdrawals:", error);
      toast.error("Erro ao carregar solicitações de saque");
    }
  };

  const handleCreateAffiliate = async () => {
    if (!newAffiliate.userId) {
      toast.error("Selecione um usuário");
      return;
    }

    try {
      const affiliateCode = `AFF${Date.now().toString(36).toUpperCase()}`;
      
      const insertData: any = {
        user_id: newAffiliate.userId,
        affiliate_code: affiliateCode,
        commission_model: newAffiliate.commissionModel,
        commission_percentage: newAffiliate.commissionModel === "rev" ? newAffiliate.commissionPercentage : 0,
        cpa_value: newAffiliate.commissionModel === "cpa" ? newAffiliate.cpaValue : null,
        cpa_min_deposit: newAffiliate.commissionModel === "cpa" ? newAffiliate.cpaMinDeposit : null,
      };

      const { error } = await supabase
        .from("affiliates")
        .insert(insertData);

      if (error) throw error;

      toast.success("Afiliado criado com sucesso!");
      setDialogOpen(false);
      fetchAffiliates();
      setNewAffiliate({ userId: "", commissionPercentage: 10, commissionModel: "rev", cpaValue: 50, cpaMinDeposit: 100 });
    } catch (error) {
      console.error("Error creating affiliate:", error);
      toast.error("Erro ao criar afiliado");
    }
  };

  const toggleAffiliateStatus = async (id: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from("affiliates")
        .update({ is_active: !currentStatus })
        .eq("id", id);

      if (error) throw error;

      toast.success(currentStatus ? "Afiliado desativado" : "Afiliado ativado");
      fetchAffiliates();
    } catch (error) {
      console.error("Error updating affiliate:", error);
      toast.error("Erro ao atualizar status");
    }
  };

  const copyAffiliateLink = (code: string) => {
    const link = `${window.location.origin}?ref=${code}`;
    navigator.clipboard.writeText(link);
    setCopiedCode(code);
    toast.success("Link copiado!");
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const handleApproveWithdrawal = async (withdrawalId: string) => {
    setProcessing(true);
    try {
      const { error } = await supabase
        .from("withdrawal_requests")
        .update({
          status: "approved",
          processed_at: new Date().toISOString(),
        })
        .eq("id", withdrawalId);

      if (error) throw error;

      toast.success("Saque aprovado com sucesso!");
      setReviewDialogOpen(false);
      setSelectedWithdrawal(null);
      fetchWithdrawals();
    } catch (error) {
      console.error("Error approving withdrawal:", error);
      toast.error("Erro ao aprovar saque");
    } finally {
      setProcessing(false);
    }
  };

  const handleRejectWithdrawal = async (withdrawalId: string) => {
    if (!rejectionReason.trim()) {
      toast.error("Digite o motivo da rejeição");
      return;
    }

    setProcessing(true);
    try {
      const { error } = await supabase
        .from("withdrawal_requests")
        .update({
          status: "rejected",
          processed_at: new Date().toISOString(),
          rejection_reason: rejectionReason,
        })
        .eq("id", withdrawalId);

      if (error) throw error;

      toast.success("Saque rejeitado");
      setReviewDialogOpen(false);
      setSelectedWithdrawal(null);
      setRejectionReason("");
      fetchWithdrawals();
    } catch (error) {
      console.error("Error rejecting withdrawal:", error);
      toast.error("Erro ao rejeitar saque");
    } finally {
      setProcessing(false);
    }
  };

  const openReviewDialog = (withdrawal: WithdrawalRequest) => {
    setSelectedWithdrawal(withdrawal);
    setReviewDialogOpen(true);
  };

  const filteredAffiliates = affiliates.filter(
    (affiliate) =>
      affiliate.affiliate_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      affiliate.profiles?.full_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return <LoadingSpinner size="lg" className="min-h-[400px]" />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Afiliados</h1>
          <p className="text-muted-foreground">Gerencie o programa de afiliados</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <UserPlus className="mr-2 h-4 w-4" />
              Novo Afiliado
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Criar Novo Afiliado</DialogTitle>
              <DialogDescription>
                Configure um novo afiliado no sistema
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>ID do Usuário</Label>
                <Input
                  value={newAffiliate.userId}
                  onChange={(e) => setNewAffiliate({ ...newAffiliate, userId: e.target.value })}
                  placeholder="UUID do usuário"
                />
              </div>
              <div className="space-y-2">
                <Label>Modelo de Comissão</Label>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant={newAffiliate.commissionModel === "rev" ? "default" : "outline"}
                    size="sm"
                    className="flex-1"
                    onClick={() => setNewAffiliate({ ...newAffiliate, commissionModel: "rev" })}
                  >
                    REV (%)
                  </Button>
                  <Button
                    type="button"
                    variant={newAffiliate.commissionModel === "cpa" ? "default" : "outline"}
                    size="sm"
                    className="flex-1"
                    onClick={() => setNewAffiliate({ ...newAffiliate, commissionModel: "cpa" })}
                  >
                    CPA (Fixo)
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  {newAffiliate.commissionModel === "rev"
                    ? "REV: O afiliado recebe uma porcentagem sobre cada trade dos indicados."
                    : "CPA: O afiliado recebe um valor fixo por indicação que atingir o depósito mínimo."}
                </p>
              </div>
              {newAffiliate.commissionModel === "rev" ? (
                <div className="space-y-2">
                  <Label>Percentual de Comissão (%)</Label>
                  <Input
                    type="number"
                    value={newAffiliate.commissionPercentage}
                    onChange={(e) => setNewAffiliate({ ...newAffiliate, commissionPercentage: parseFloat(e.target.value) })}
                    min="0"
                    max="100"
                    step="0.1"
                  />
                </div>
              ) : (
                <>
                  <div className="space-y-2">
                    <Label>Valor CPA (R$)</Label>
                    <Input
                      type="number"
                      value={newAffiliate.cpaValue}
                      onChange={(e) => setNewAffiliate({ ...newAffiliate, cpaValue: parseFloat(e.target.value) })}
                      min="1"
                      step="1"
                      placeholder="Ex: 50"
                    />
                    <p className="text-xs text-muted-foreground">Valor fixo pago por cada indicação qualificada</p>
                  </div>
                  <div className="space-y-2">
                    <Label>Depósito Mínimo para Qualificar (R$)</Label>
                    <Input
                      type="number"
                      value={newAffiliate.cpaMinDeposit}
                      onChange={(e) => setNewAffiliate({ ...newAffiliate, cpaMinDeposit: parseFloat(e.target.value) })}
                      min="1"
                      step="1"
                      placeholder="Ex: 100"
                    />
                    <p className="text-xs text-muted-foreground">O indicado precisa depositar pelo menos esse valor para gerar a comissão</p>
                  </div>
                </>
              )}
              <Button onClick={handleCreateAffiliate} className="w-full">
                Criar Afiliado
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Pending Withdrawals */}
      {withdrawals.length > 0 && (
        <Card className="border-orange-500/50 bg-orange-500/5">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-orange-500" />
                  Solicitações de Saque Pendentes
                </CardTitle>
                <CardDescription>
                  {withdrawals.length} {withdrawals.length === 1 ? "solicitação pendente" : "solicitações pendentes"}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Afiliado</TableHead>
                  <TableHead>Código</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Método</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {withdrawals.map((withdrawal) => (
                  <TableRow key={withdrawal.id}>
                    <TableCell className="font-medium">
                      {withdrawal.affiliate?.profiles?.full_name || "Sem nome"}
                    </TableCell>
                    <TableCell>
                      <code className="px-2 py-1 bg-muted rounded text-xs">
                        {withdrawal.affiliate?.affiliate_code || "-"}
                      </code>
                    </TableCell>
                    <TableCell className="font-bold text-green-600">
                      R$ {formatCurrency(withdrawal.amount)}
                    </TableCell>
                    <TableCell>
                      {withdrawal.payment_method === "pix" ? "PIX" : "Transferência"}
                    </TableCell>
                    <TableCell className="text-sm">
                      {new Date(withdrawal.created_at).toLocaleDateString("pt-BR")}
                    </TableCell>
                    <TableCell>
                      <Badge variant={withdrawal.status === "pending" ? "secondary" : "default"}>
                        {withdrawal.status === "pending" ? "Pendente" : "Processando"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        onClick={() => openReviewDialog(withdrawal)}
                      >
                        Revisar
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Review Withdrawal Dialog */}
      <Dialog open={reviewDialogOpen} onOpenChange={setReviewDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Revisar Solicitação de Saque</DialogTitle>
            <DialogDescription>
              Analise os detalhes e aprove ou rejeite a solicitação
            </DialogDescription>
          </DialogHeader>

          {selectedWithdrawal && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">Afiliado</Label>
                  <p className="font-medium">
                    {selectedWithdrawal.affiliate?.profiles?.full_name || "Sem nome"}
                  </p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Código</Label>
                  <p className="font-mono">
                    {selectedWithdrawal.affiliate?.affiliate_code || "-"}
                  </p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Valor</Label>
                  <p className="text-lg font-bold text-green-600">
                    R$ {formatCurrency(selectedWithdrawal.amount)}
                  </p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Método</Label>
                  <p>{selectedWithdrawal.payment_method === "pix" ? "PIX" : "Transferência Bancária"}</p>
                </div>
              </div>

              <div className="border rounded-lg p-4 bg-muted/30">
                <Label className="text-sm font-semibold mb-2 block">Detalhes de Pagamento</Label>
                {selectedWithdrawal.payment_method === "pix" ? (
                  <div>
                    <p className="text-sm text-muted-foreground">Chave PIX</p>
                    <p className="font-mono font-medium">
                      {selectedWithdrawal.payment_details?.pix_key || "-"}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div>
                      <p className="text-sm text-muted-foreground">Titular</p>
                      <p className="font-medium">
                        {selectedWithdrawal.payment_details?.account_holder || "-"}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Banco</p>
                      <p>{selectedWithdrawal.payment_details?.bank_name || "-"}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground">Agência</p>
                        <p>{selectedWithdrawal.payment_details?.bank_agency || "-"}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Conta</p>
                        <p>{selectedWithdrawal.payment_details?.bank_account || "-"}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="rejection-reason">Motivo da Rejeição (opcional)</Label>
                <Textarea
                  id="rejection-reason"
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="Digite o motivo caso vá rejeitar..."
                  rows={3}
                />
              </div>
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setReviewDialogOpen(false);
                setRejectionReason("");
              }}
              disabled={processing}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={() => selectedWithdrawal && handleRejectWithdrawal(selectedWithdrawal.id)}
              disabled={processing}
            >
              <X className="h-4 w-4 mr-2" />
              Rejeitar
            </Button>
            <Button
              onClick={() => selectedWithdrawal && handleApproveWithdrawal(selectedWithdrawal.id)}
              disabled={processing}
            >
              <Check className="h-4 w-4 mr-2" />
              Aprovar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Afiliados</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalAffiliates}</div>
            <p className="text-xs text-muted-foreground">
              {stats.activeAffiliates} ativos
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Indicações</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalReferrals}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Comissões Totais</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {new Intl.NumberFormat('pt-BR', {
                style: 'currency',
                currency: 'BRL'
              }).format(stats.totalCommissions)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Taxa Média</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.totalAffiliates > 0
                ? (affiliates.reduce((sum, a) => sum + a.commission_percentage, 0) / stats.totalAffiliates).toFixed(1)
                : 0}%
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por código ou nome..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Affiliates Table */}
      <Card>
        <CardHeader>
          <CardTitle>Lista de Afiliados</CardTitle>
          <CardDescription>
            Todos os afiliados cadastrados no sistema
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Código</TableHead>
                <TableHead>Modelo / Comissão</TableHead>
                <TableHead>Indicações</TableHead>
                <TableHead>Total Ganho</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAffiliates.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground">
                    Nenhum afiliado encontrado
                  </TableCell>
                </TableRow>
              ) : (
                filteredAffiliates.map((affiliate) => (
                  <TableRow key={affiliate.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{affiliate.profiles?.full_name || "Sem nome"}</div>
                        <div className="text-xs text-muted-foreground">{affiliate.profiles?.document}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <code className="px-2 py-1 bg-muted rounded text-xs">
                          {affiliate.affiliate_code}
                        </code>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => copyAffiliateLink(affiliate.affiliate_code)}
                        >
                          {copiedCode === affiliate.affiliate_code ? (
                            <CheckCircle className="h-3 w-3 text-green-500" />
                          ) : (
                            <Copy className="h-3 w-3" />
                          )}
                        </Button>
                      </div>
                    </TableCell>
                    <TableCell>
                      {affiliate.commission_model === "cpa" ? (
                        <div>
                          <Badge variant="outline" className="bg-blue-500/10 text-blue-500 border-blue-500/30">CPA</Badge>
                          <div className="text-xs text-muted-foreground mt-1">
                            R$ {affiliate.cpa_value?.toFixed(2)} / min R$ {affiliate.cpa_min_deposit?.toFixed(2)}
                          </div>
                        </div>
                      ) : (
                        <div>
                          <Badge variant="outline">REV</Badge>
                          <div className="text-xs text-muted-foreground mt-1">{affiliate.commission_percentage}%</div>
                        </div>
                      )}
                    </TableCell>
                    <TableCell>{affiliate.total_referrals}</TableCell>
                    <TableCell>
                      {new Intl.NumberFormat('pt-BR', {
                        style: 'currency',
                        currency: 'BRL'
                      }).format(affiliate.total_commission)}
                    </TableCell>
                    <TableCell>
                      <Badge variant={affiliate.is_active ? "default" : "secondary"}>
                        {affiliate.is_active ? "Ativo" : "Inativo"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Switch
                        checked={affiliate.is_active}
                        onCheckedChange={() => toggleAffiliateStatus(affiliate.id, affiliate.is_active)}
                      />
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}