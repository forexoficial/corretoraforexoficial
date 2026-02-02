import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { DollarSign, CheckCircle, XCircle, Clock, Search } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { useAuth } from "@/contexts/AuthContext";

interface WithdrawalRequest {
  id: string;
  amount: number;
  status: string;
  payment_method: string;
  payment_details: any;
  created_at: string;
  processed_at: string | null;
  rejection_reason: string | null;
  notes: string | null;
  affiliate_code?: string;
  affiliate_name?: string;
  affiliate_document?: string;
}

interface Stats {
  pending: number;
  processing: number;
  approved: number;
  rejected: number;
  totalAmount: number;
}

export default function AdminWithdrawals() {
  const { user } = useAuth();
  const [withdrawals, setWithdrawals] = useState<WithdrawalRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedWithdrawal, setSelectedWithdrawal] = useState<WithdrawalRequest | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [stats, setStats] = useState<Stats>({
    pending: 0,
    processing: 0,
    approved: 0,
    rejected: 0,
    totalAmount: 0,
  });

  useEffect(() => {
    fetchWithdrawals();
  }, []);

  const fetchWithdrawals = async () => {
    try {
      const { data, error } = await supabase
        .from("withdrawal_requests")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Fetch affiliate and profile data for each withdrawal
      const withdrawalsWithDetails = await Promise.all(
        (data || []).map(async (withdrawal) => {
          const { data: affiliate } = await supabase
            .from("affiliates")
            .select("affiliate_code, user_id")
            .eq("id", withdrawal.affiliate_id)
            .single();

          if (!affiliate) {
            return {
              ...withdrawal,
              affiliate_code: "N/A",
              affiliate_name: "N/A",
              affiliate_document: "N/A",
            };
          }

          const { data: profile } = await supabase
            .from("profiles")
            .select("full_name, document")
            .eq("user_id", affiliate.user_id)
            .single();

          return {
            ...withdrawal,
            affiliate_code: affiliate.affiliate_code,
            affiliate_name: profile?.full_name || "N/A",
            affiliate_document: profile?.document || "N/A",
          };
        })
      );

      setWithdrawals(withdrawalsWithDetails);

      // Calculate stats
      const stats = withdrawalsWithDetails.reduce(
        (acc, w) => ({
          pending: acc.pending + (w.status === "pending" ? 1 : 0),
          processing: acc.processing + (w.status === "processing" ? 1 : 0),
          approved: acc.approved + (w.status === "approved" ? 1 : 0),
          rejected: acc.rejected + (w.status === "rejected" ? 1 : 0),
          totalAmount: acc.totalAmount + (w.status === "approved" ? Number(w.amount) : 0),
        }),
        { pending: 0, processing: 0, approved: 0, rejected: 0, totalAmount: 0 }
      );

      setStats(stats);
    } catch (error) {
      console.error("Error fetching withdrawals:", error);
      toast.error("Erro ao carregar solicitações");
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (withdrawalId: string) => {
    setProcessing(true);
    try {
      const { error } = await supabase
        .from("withdrawal_requests")
        .update({
          status: "approved",
          processed_at: new Date().toISOString(),
          processed_by: user?.id,
        })
        .eq("id", withdrawalId);

      if (error) throw error;

      toast.success("Saque aprovado com sucesso!");
      setDialogOpen(false);
      setSelectedWithdrawal(null);
      fetchWithdrawals();
    } catch (error) {
      console.error("Error approving withdrawal:", error);
      toast.error("Erro ao aprovar saque");
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async (withdrawalId: string) => {
    if (!rejectionReason.trim()) {
      toast.error("Por favor, informe o motivo da rejeição");
      return;
    }

    setProcessing(true);
    try {
      const { error } = await supabase
        .from("withdrawal_requests")
        .update({
          status: "rejected",
          processed_at: new Date().toISOString(),
          processed_by: user?.id,
          rejection_reason: rejectionReason,
        })
        .eq("id", withdrawalId);

      if (error) throw error;

      toast.success("Saque rejeitado");
      setDialogOpen(false);
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

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { label: "Pendente", variant: "secondary" as const, icon: Clock },
      processing: { label: "Processando", variant: "default" as const, icon: Clock },
      approved: { label: "Aprovado", variant: "default" as const, icon: CheckCircle },
      rejected: { label: "Rejeitado", variant: "destructive" as const, icon: XCircle },
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

  const filteredWithdrawals = withdrawals.filter(
    (w) =>
      w.affiliate_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      w.affiliate_code?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return <LoadingSpinner size="lg" className="min-h-[400px]" />;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold">Saques de Afiliados</h2>
        <p className="text-muted-foreground">
          Gerencie as solicitações de saque das comissões dos afiliados
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pendentes</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pending}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Em Processo</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.processing}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Aprovados</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.approved}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Rejeitados</CardTitle>
            <XCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.rejected}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Pago</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success">
              R$ {formatCurrency(stats.totalAmount)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Withdrawals Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Solicitações ({withdrawals.length})</CardTitle>
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="Buscar por nome ou código..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
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
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredWithdrawals.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground">
                    Nenhuma solicitação encontrada
                  </TableCell>
                </TableRow>
              ) : (
                filteredWithdrawals.map((withdrawal) => (
                  <TableRow key={withdrawal.id}>
                    <TableCell className="font-medium">
                      {withdrawal.affiliate_name}
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {withdrawal.affiliate_code}
                    </TableCell>
                    <TableCell className="font-bold">
                      R$ {formatCurrency(withdrawal.amount)}
                    </TableCell>
                    <TableCell>
                      {withdrawal.payment_method === "pix" ? "PIX" : "Transferência"}
                    </TableCell>
                    <TableCell>
                      {new Date(withdrawal.created_at).toLocaleDateString("pt-BR")}
                    </TableCell>
                    <TableCell>{getStatusBadge(withdrawal.status)}</TableCell>
                    <TableCell>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedWithdrawal(withdrawal);
                          setDialogOpen(true);
                        }}
                      >
                        Detalhes
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Details Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Detalhes da Solicitação</DialogTitle>
            <DialogDescription>
              Informações completas da solicitação de saque
            </DialogDescription>
          </DialogHeader>

          {selectedWithdrawal && (
            <div className="space-y-6">
              {/* Affiliate Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium">Afiliado</Label>
                  <p className="text-sm">
                    {selectedWithdrawal.affiliate_name}
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Código</Label>
                  <p className="text-sm font-mono">
                    {selectedWithdrawal.affiliate_code}
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Documento</Label>
                  <p className="text-sm">
                    {selectedWithdrawal.affiliate_document}
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Status</Label>
                  <div className="mt-1">
                    {getStatusBadge(selectedWithdrawal.status)}
                  </div>
                </div>
              </div>

              {/* Withdrawal Info */}
              <div className="border-t pt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium">Valor</Label>
                    <p className="text-2xl font-bold text-primary">
                      R$ {formatCurrency(selectedWithdrawal.amount)}
                    </p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Data da Solicitação</Label>
                    <p className="text-sm">
                      {new Date(selectedWithdrawal.created_at).toLocaleString("pt-BR")}
                    </p>
                  </div>
                </div>
              </div>

              {/* Payment Details */}
              <div className="border-t pt-4">
                <Label className="text-sm font-medium mb-2 block">
                  Dados de Pagamento ({selectedWithdrawal.payment_method === "pix" ? "PIX" : "Transferência Bancária"})
                </Label>
                <div className="bg-muted p-4 rounded-lg space-y-2">
                  {selectedWithdrawal.payment_method === "pix" ? (
                    <div>
                      <Label className="text-xs">Chave PIX</Label>
                      <p className="font-mono text-sm">{selectedWithdrawal.payment_details.pix_key}</p>
                    </div>
                  ) : (
                    <>
                      <div>
                        <Label className="text-xs">Titular</Label>
                        <p className="text-sm">{selectedWithdrawal.payment_details.account_holder}</p>
                      </div>
                      <div>
                        <Label className="text-xs">Banco</Label>
                        <p className="text-sm">{selectedWithdrawal.payment_details.bank_name}</p>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <Label className="text-xs">Agência</Label>
                          <p className="text-sm">{selectedWithdrawal.payment_details.bank_agency}</p>
                        </div>
                        <div>
                          <Label className="text-xs">Conta</Label>
                          <p className="text-sm">{selectedWithdrawal.payment_details.bank_account}</p>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Actions */}
              {selectedWithdrawal.status === "pending" && (
                <div className="border-t pt-4 space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="rejection_reason">Motivo da Rejeição (opcional para rejeitar)</Label>
                    <Textarea
                      id="rejection_reason"
                      value={rejectionReason}
                      onChange={(e) => setRejectionReason(e.target.value)}
                      placeholder="Digite o motivo da rejeição..."
                      rows={3}
                    />
                  </div>

                  <div className="flex gap-2">
                    <Button
                      onClick={() => handleReject(selectedWithdrawal.id)}
                      variant="destructive"
                      className="flex-1"
                      disabled={processing}
                    >
                      <XCircle className="w-4 h-4 mr-2" />
                      Rejeitar
                    </Button>
                    <Button
                      onClick={() => handleApprove(selectedWithdrawal.id)}
                      className="flex-1"
                      disabled={processing}
                    >
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Aprovar
                    </Button>
                  </div>
                </div>
              )}

              {selectedWithdrawal.rejection_reason && (
                <div className="border-t pt-4">
                  <Label className="text-sm font-medium text-destructive">Motivo da Rejeição</Label>
                  <p className="text-sm mt-1">{selectedWithdrawal.rejection_reason}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
