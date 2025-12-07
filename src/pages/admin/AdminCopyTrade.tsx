import { useState, useEffect } from "react";
import { Users, UserCheck, UserX, Clock, TrendingUp, Shield, Search, Eye, CheckCircle, XCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

interface CopyTradeRequest {
  id: string;
  user_id: string;
  status: string;
  description: string | null;
  rejection_reason: string | null;
  created_at: string;
  profile_name?: string;
}

interface CopyTrader {
  id: string;
  user_id: string;
  display_name: string;
  description: string | null;
  total_followers: number;
  total_trades: number;
  win_rate: number;
  is_active: boolean;
  created_at: string;
  profile_name?: string;
}

export default function AdminCopyTrade() {
  const { user } = useAuth();
  const [requests, setRequests] = useState<CopyTradeRequest[]>([]);
  const [copyTraders, setCopyTraders] = useState<CopyTrader[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  
  // Review dialog
  const [selectedRequest, setSelectedRequest] = useState<CopyTradeRequest | null>(null);
  const [showReviewDialog, setShowReviewDialog] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [displayName, setDisplayName] = useState("");

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      // Load pending requests
      const { data: requestsData, error: requestsError } = await supabase
        .from("copy_trade_requests")
        .select("*")
        .order("created_at", { ascending: false });

      if (requestsError) throw requestsError;

      // Load profiles for requests
      const userIds = requestsData?.map(r => r.user_id) || [];
      let profilesMap = new Map<string, string>();
      
      if (userIds.length > 0) {
        const { data: profilesData } = await supabase
          .from("profiles")
          .select("user_id, full_name")
          .in("user_id", userIds);

        profilesMap = new Map(profilesData?.map(p => [p.user_id, p.full_name]) || []);
      }
      
      const enrichedRequests: CopyTradeRequest[] = requestsData?.map(r => ({
        ...r,
        profile_name: profilesMap.get(r.user_id) || "N/A"
      })) || [];

      setRequests(enrichedRequests);

      // Load copy traders
      const { data: tradersData, error: tradersError } = await supabase
        .from("copy_traders")
        .select("*")
        .order("created_at", { ascending: false });

      if (tradersError) throw tradersError;

      // Load profiles for traders
      const traderUserIds = tradersData?.map(t => t.user_id) || [];
      let traderProfilesMap = new Map<string, string>();
      
      if (traderUserIds.length > 0) {
        const { data: traderProfilesData } = await supabase
          .from("profiles")
          .select("user_id, full_name")
          .in("user_id", traderUserIds);

        traderProfilesMap = new Map(traderProfilesData?.map(p => [p.user_id, p.full_name]) || []);
      }
      
      const enrichedTraders: CopyTrader[] = tradersData?.map(t => ({
        ...t,
        profile_name: traderProfilesMap.get(t.user_id) || "N/A"
      })) || [];

      setCopyTraders(enrichedTraders);
    } catch (error: any) {
      console.error("Error loading data:", error);
      toast.error("Erro ao carregar dados");
    } finally {
      setIsLoading(false);
    }
  };

  const handleApproveRequest = async () => {
    if (!selectedRequest || !displayName.trim()) {
      toast.error("Nome de exibição é obrigatório");
      return;
    }

    try {
      // Update request status
      const { error: updateError } = await supabase
        .from("copy_trade_requests")
        .update({
          status: "approved",
          reviewed_by: user?.id,
          reviewed_at: new Date().toISOString()
        })
        .eq("id", selectedRequest.id);

      if (updateError) throw updateError;

      // Create copy trader profile
      const { error: createError } = await supabase
        .from("copy_traders")
        .insert({
          user_id: selectedRequest.user_id,
          display_name: displayName,
          description: selectedRequest.description || ""
        });

      if (createError) throw createError;

      toast.success("Solicitação aprovada com sucesso!");
      setShowReviewDialog(false);
      setSelectedRequest(null);
      setDisplayName("");
      loadData();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleRejectRequest = async () => {
    if (!selectedRequest) return;

    try {
      const { error } = await supabase
        .from("copy_trade_requests")
        .update({
          status: "rejected",
          rejection_reason: rejectionReason,
          reviewed_by: user?.id,
          reviewed_at: new Date().toISOString()
        })
        .eq("id", selectedRequest.id);

      if (error) throw error;

      toast.success("Solicitação rejeitada");
      setShowReviewDialog(false);
      setSelectedRequest(null);
      setRejectionReason("");
      loadData();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleToggleCopyTrader = async (traderId: string, isActive: boolean) => {
    try {
      const { error } = await supabase
        .from("copy_traders")
        .update({ is_active: !isActive })
        .eq("id", traderId);

      if (error) throw error;
      loadData();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const openReviewDialog = (request: CopyTradeRequest) => {
    setSelectedRequest(request);
    setDisplayName("");
    setRejectionReason("");
    setShowReviewDialog(true);
  };

  const pendingRequests = requests.filter(r => r.status === "pending");
  const processedRequests = requests.filter(r => r.status !== "pending");

  const filteredTraders = copyTraders.filter(trader =>
    trader.display_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (trader.profile_name?.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <Users className="h-8 w-8" />
          Copy Trade
        </h1>
        <p className="text-muted-foreground">
          Gerencie solicitações de Copy Traders e monitore atividades
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-yellow-500/20 rounded-lg">
                <Clock className="h-6 w-6 text-yellow-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{pendingRequests.length}</p>
                <p className="text-sm text-muted-foreground">Pendentes</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-green-500/20 rounded-lg">
                <UserCheck className="h-6 w-6 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{copyTraders.filter(t => t.is_active).length}</p>
                <p className="text-sm text-muted-foreground">Copy Traders Ativos</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-primary/20 rounded-lg">
                <Users className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {copyTraders.reduce((sum, t) => sum + t.total_followers, 0)}
                </p>
                <p className="text-sm text-muted-foreground">Total de Seguidores</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-accent/20 rounded-lg">
                <TrendingUp className="h-6 w-6 text-accent" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {copyTraders.reduce((sum, t) => sum + t.total_trades, 0)}
                </p>
                <p className="text-sm text-muted-foreground">Trades Copiados</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="requests">
        <TabsList>
          <TabsTrigger value="requests" className="gap-2">
            <Clock className="h-4 w-4" />
            Solicitações
            {pendingRequests.length > 0 && (
              <Badge variant="destructive" className="ml-1">{pendingRequests.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="traders" className="gap-2">
            <Shield className="h-4 w-4" />
            Copy Traders
          </TabsTrigger>
        </TabsList>

        <TabsContent value="requests" className="space-y-4">
          {/* Pending Requests */}
          {pendingRequests.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-yellow-500" />
                  Solicitações Pendentes
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Usuário</TableHead>
                      <TableHead>Descrição</TableHead>
                      <TableHead>Data</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pendingRequests.map((request) => (
                      <TableRow key={request.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{request.profile_name}</p>
                            <p className="text-xs text-muted-foreground font-mono">
                              {request.user_id.slice(0, 8)}...
                            </p>
                          </div>
                        </TableCell>
                        <TableCell className="max-w-xs truncate">
                          {request.description || "-"}
                        </TableCell>
                        <TableCell>
                          {new Date(request.created_at).toLocaleDateString("pt-BR")}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            size="sm"
                            onClick={() => openReviewDialog(request)}
                            className="gap-2"
                          >
                            <Eye className="h-4 w-4" />
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

          {/* Processed Requests */}
          <Card>
            <CardHeader>
              <CardTitle>Histórico de Solicitações</CardTitle>
            </CardHeader>
            <CardContent>
              {processedRequests.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  Nenhuma solicitação processada ainda
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Usuário</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Motivo</TableHead>
                      <TableHead>Data</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {processedRequests.map((request) => (
                      <TableRow key={request.id}>
                        <TableCell>{request.profile_name}</TableCell>
                        <TableCell>
                          <Badge
                            variant={request.status === "approved" ? "default" : "destructive"}
                          >
                            {request.status === "approved" ? "Aprovado" : "Rejeitado"}
                          </Badge>
                        </TableCell>
                        <TableCell className="max-w-xs truncate">
                          {request.rejection_reason || "-"}
                        </TableCell>
                        <TableCell>
                          {new Date(request.created_at).toLocaleDateString("pt-BR")}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="traders" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Copy Traders</CardTitle>
                <div className="relative w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar trader..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {filteredTraders.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  Nenhum Copy Trader encontrado
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Trader</TableHead>
                      <TableHead>Seguidores</TableHead>
                      <TableHead>Trades</TableHead>
                      <TableHead>Win Rate</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Ativo</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredTraders.map((trader) => (
                      <TableRow key={trader.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{trader.display_name}</p>
                            <p className="text-xs text-muted-foreground">
                              {trader.profile_name}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>{trader.total_followers}</TableCell>
                        <TableCell>{trader.total_trades}</TableCell>
                        <TableCell>
                          <span className={trader.win_rate >= 50 ? "text-green-500" : "text-red-500"}>
                            {trader.win_rate.toFixed(1)}%
                          </span>
                        </TableCell>
                        <TableCell>
                          <Badge variant={trader.is_active ? "default" : "secondary"}>
                            {trader.is_active ? "Ativo" : "Inativo"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Switch
                            checked={trader.is_active}
                            onCheckedChange={() => handleToggleCopyTrader(trader.id, trader.is_active)}
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Review Dialog */}
      <Dialog open={showReviewDialog} onOpenChange={setShowReviewDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Revisar Solicitação</DialogTitle>
            <DialogDescription>
              Analise a solicitação e aprove ou rejeite o pedido de Copy Trader.
            </DialogDescription>
          </DialogHeader>
          
          {selectedRequest && (
            <div className="space-y-4">
              <div className="p-4 bg-muted/50 rounded-lg space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Usuário:</span>
                  <span className="font-medium">{selectedRequest.profile_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">ID:</span>
                  <code className="text-xs">{selectedRequest.user_id}</code>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Data:</span>
                  <span>{new Date(selectedRequest.created_at).toLocaleDateString("pt-BR")}</span>
                </div>
              </div>

              {selectedRequest.description && (
                <div>
                  <Label>Descrição do Candidato</Label>
                  <p className="p-3 bg-muted/30 rounded-lg text-sm mt-1">
                    {selectedRequest.description}
                  </p>
                </div>
              )}

              <div>
                <Label>Nome de Exibição (para aprovar)</Label>
                <Input
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Como o trader será exibido na plataforma"
                />
              </div>

              <div>
                <Label>Motivo da Rejeição (para rejeitar)</Label>
                <Textarea
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="Explique o motivo da rejeição..."
                  rows={3}
                />
              </div>
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setShowReviewDialog(false)}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleRejectRequest}
              disabled={!rejectionReason.trim()}
              className="gap-2"
            >
              <XCircle className="h-4 w-4" />
              Rejeitar
            </Button>
            <Button
              onClick={handleApproveRequest}
              disabled={!displayName.trim()}
              className="gap-2"
            >
              <CheckCircle className="h-4 w-4" />
              Aprovar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
