import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Users, UserPlus, TrendingUp, Copy, Check, ArrowLeft, Crown, Shield, Settings, Activity, AlertCircle } from "lucide-react";
import { useTranslation } from "@/hooks/useTranslation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useIsMobile } from "@/hooks/use-mobile";
import { MobileTradingHeader } from "@/components/mobile/MobileTradingHeader";

interface CopyTrader {
  id: string;
  user_id: string;
  display_name: string;
  description: string;
  total_followers: number;
  total_trades: number;
  win_rate: number;
  is_active: boolean;
}

interface CopyTradeRequest {
  id: string;
  status: string;
  description: string;
  created_at: string;
  rejection_reason?: string;
}

interface Follower {
  id: string;
  follower_user_id: string;
  allocation_percentage: number;
  max_trade_amount: number | null;
  is_active: boolean;
  total_copied_trades: number;
  total_profit: number;
  created_at: string;
}

export default function CopyTrade() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isMobile = useIsMobile();

  const [myRequest, setMyRequest] = useState<CopyTradeRequest | null>(null);
  const [myCopyTrader, setMyCopyTrader] = useState<CopyTrader | null>(null);
  const [followers, setFollowers] = useState<Follower[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Request dialog
  const [showRequestDialog, setShowRequestDialog] = useState(false);
  const [requestDescription, setRequestDescription] = useState("");
  const [displayName, setDisplayName] = useState("");
  
  // Add follower dialog
  const [showAddFollowerDialog, setShowAddFollowerDialog] = useState(false);
  const [followerUserId, setFollowerUserId] = useState("");
  const [allocationPercentage, setAllocationPercentage] = useState([100]);
  const [maxTradeAmount, setMaxTradeAmount] = useState("");

  useEffect(() => {
    if (user) {
      loadCopyTradeData();
    }
  }, [user]);

  const loadCopyTradeData = async () => {
    setIsLoading(true);
    try {
      // Check if user has a pending/approved request
      const { data: request } = await supabase
        .from("copy_trade_requests")
        .select("*")
        .eq("user_id", user?.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      setMyRequest(request);

      // Check if user is an approved copy trader
      const { data: copyTrader } = await supabase
        .from("copy_traders")
        .select("*")
        .eq("user_id", user?.id)
        .maybeSingle();

      setMyCopyTrader(copyTrader);

      // Load followers if copy trader
      if (copyTrader) {
        const { data: followersData } = await supabase
          .from("copy_trade_followers")
          .select("*")
          .eq("copy_trader_id", copyTrader.id)
          .order("created_at", { ascending: false });

        setFollowers(followersData || []);
      }
    } catch (error: any) {
      console.error("Error loading copy trade data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmitRequest = async () => {
    if (!displayName.trim()) {
      toast.error(t("display_name_required", "Nome de exibição é obrigatório"));
      return;
    }

    try {
      const { error } = await supabase
        .from("copy_trade_requests")
        .insert({
          user_id: user?.id,
          description: requestDescription,
        });

      if (error) throw error;

      toast.success(t("request_submitted", "Solicitação enviada com sucesso!"));
      setShowRequestDialog(false);
      setRequestDescription("");
      setDisplayName("");
      loadCopyTradeData();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleAddFollower = async () => {
    if (!followerUserId.trim()) {
      toast.error(t("follower_id_required", "ID do usuário é obrigatório"));
      return;
    }

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(followerUserId.trim())) {
      toast.error(t("invalid_user_id", "ID de usuário inválido"));
      return;
    }

    // Check if trying to add self
    if (followerUserId.trim() === user?.id) {
      toast.error(t("cannot_add_self", "Você não pode se adicionar como seguidor"));
      return;
    }

    try {
      const { error } = await supabase
        .from("copy_trade_followers")
        .insert({
          copy_trader_id: myCopyTrader?.id,
          follower_user_id: followerUserId.trim(),
          allocation_percentage: allocationPercentage[0],
          max_trade_amount: maxTradeAmount ? parseFloat(maxTradeAmount) : null,
        });

      if (error) {
        if (error.code === "23505") {
          toast.error(t("follower_already_added", "Este usuário já está cadastrado"));
        } else {
          throw error;
        }
        return;
      }

      toast.success(t("follower_added", "Seguidor cadastrado com sucesso!"));
      setShowAddFollowerDialog(false);
      setFollowerUserId("");
      setAllocationPercentage([100]);
      setMaxTradeAmount("");
      
      // Update follower count
      await supabase
        .from("copy_traders")
        .update({ total_followers: (myCopyTrader?.total_followers || 0) + 1 })
        .eq("id", myCopyTrader?.id);
      
      loadCopyTradeData();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleToggleFollower = async (followerId: string, isActive: boolean) => {
    try {
      const { error } = await supabase
        .from("copy_trade_followers")
        .update({ is_active: !isActive })
        .eq("id", followerId);

      if (error) throw error;
      loadCopyTradeData();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleRemoveFollower = async (followerId: string) => {
    try {
      const { error } = await supabase
        .from("copy_trade_followers")
        .delete()
        .eq("id", followerId);

      if (error) throw error;

      // Update follower count
      await supabase
        .from("copy_traders")
        .update({ total_followers: Math.max(0, (myCopyTrader?.total_followers || 1) - 1) })
        .eq("id", myCopyTrader?.id);

      toast.success(t("follower_removed", "Seguidor removido"));
      loadCopyTradeData();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const renderRequestStatus = () => {
    if (!myRequest) return null;

    const statusColors = {
      pending: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
      approved: "bg-green-500/20 text-green-400 border-green-500/30",
      rejected: "bg-red-500/20 text-red-400 border-red-500/30"
    };

    const statusLabels = {
      pending: t("status_pending", "Pendente"),
      approved: t("status_approved", "Aprovado"),
      rejected: t("status_rejected", "Rejeitado")
    };

    return (
      <Card className="border-border/50 bg-card/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            {t("your_request", "Sua Solicitação")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">{t("status", "Status")}:</span>
            <Badge className={statusColors[myRequest.status as keyof typeof statusColors]}>
              {statusLabels[myRequest.status as keyof typeof statusLabels]}
            </Badge>
          </div>
          {myRequest.rejection_reason && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
              <p className="text-sm text-red-400">
                <strong>{t("rejection_reason", "Motivo")}:</strong> {myRequest.rejection_reason}
              </p>
            </div>
          )}
          <p className="text-sm text-muted-foreground">
            {t("request_date", "Data da solicitação")}: {new Date(myRequest.created_at).toLocaleDateString("pt-BR")}
          </p>
        </CardContent>
      </Card>
    );
  };

  const renderCopyTraderPanel = () => {
    if (!myCopyTrader) return null;

    return (
      <div className="space-y-6">
        {/* Stats Card */}
        <Card className="border-primary/30 bg-gradient-to-br from-primary/10 via-card to-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Crown className="h-5 w-5 text-primary" />
              {t("your_copy_trade_profile", "Seu Perfil de Copy Trader")}
            </CardTitle>
            <CardDescription>{myCopyTrader.description}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-4 bg-background/50 rounded-lg">
                <Users className="h-6 w-6 mx-auto mb-2 text-primary" />
                <p className="text-2xl font-bold">{myCopyTrader.total_followers}</p>
                <p className="text-xs text-muted-foreground">{t("followers", "Seguidores")}</p>
              </div>
              <div className="text-center p-4 bg-background/50 rounded-lg">
                <Activity className="h-6 w-6 mx-auto mb-2 text-accent" />
                <p className="text-2xl font-bold">{myCopyTrader.total_trades}</p>
                <p className="text-xs text-muted-foreground">{t("total_trades", "Total de Trades")}</p>
              </div>
              <div className="text-center p-4 bg-background/50 rounded-lg">
                <TrendingUp className="h-6 w-6 mx-auto mb-2 text-green-500" />
                <p className="text-2xl font-bold">{myCopyTrader.win_rate.toFixed(1)}%</p>
                <p className="text-xs text-muted-foreground">{t("win_rate", "Taxa de Acerto")}</p>
              </div>
              <div className="text-center p-4 bg-background/50 rounded-lg">
                <Badge className={myCopyTrader.is_active ? "bg-green-500" : "bg-red-500"}>
                  {myCopyTrader.is_active ? t("active", "Ativo") : t("inactive", "Inativo")}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Followers Management */}
        <Card className="border-border/50">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                {t("manage_followers", "Gerenciar Seguidores")}
              </CardTitle>
              <CardDescription>
                {t("add_followers_description", "Adicione traders que irão copiar suas operações")}
              </CardDescription>
            </div>
            <Button onClick={() => setShowAddFollowerDialog(true)} className="gap-2">
              <UserPlus className="h-4 w-4" />
              {t("add_follower", "Adicionar")}
            </Button>
          </CardHeader>
          <CardContent>
            {followers.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>{t("no_followers_yet", "Nenhum seguidor cadastrado ainda")}</p>
                <p className="text-sm">{t("add_first_follower", "Adicione seu primeiro seguidor usando o ID do usuário")}</p>
              </div>
            ) : (
              <div className="space-y-3">
                {followers.map((follower) => (
                  <div
                    key={follower.id}
                    className="flex items-center justify-between p-4 bg-muted/30 rounded-lg border border-border/50"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <code className="text-xs bg-muted px-2 py-1 rounded font-mono">
                          {follower.follower_user_id.slice(0, 8)}...
                        </code>
                        <Badge variant={follower.is_active ? "default" : "secondary"}>
                          {follower.is_active ? t("active", "Ativo") : t("paused", "Pausado")}
                        </Badge>
                      </div>
                      <div className="flex gap-4 text-xs text-muted-foreground">
                        <span>{t("allocation", "Alocação")}: {follower.allocation_percentage}%</span>
                        <span>{t("trades_copied", "Trades")}: {follower.total_copied_trades}</span>
                        <span className={follower.total_profit >= 0 ? "text-green-500" : "text-red-500"}>
                          {t("profit", "Lucro")}: R$ {follower.total_profit.toFixed(2)}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={follower.is_active}
                        onCheckedChange={() => handleToggleFollower(follower.id, follower.is_active)}
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-red-500 hover:text-red-400"
                        onClick={() => handleRemoveFollower(follower.id)}
                      >
                        {t("remove", "Remover")}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-16">
      {isMobile && (
        <MobileTradingHeader 
          selectedAsset={{
            name: "Copy Trade",
            icon_url: ""
          }}
        />
      )}

      {!isMobile && (
        <header className="border-b border-border bg-card">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <Button variant="ghost" onClick={() => navigate("/profile")}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                {t("back", "Voltar")}
              </Button>
            </div>
          </div>
        </header>
      )}

      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold flex items-center gap-3 mb-2">
            <Copy className="h-8 w-8 text-primary" />
            Copy Trade
          </h1>
          <p className="text-muted-foreground">
            {t("copy_trade_description", "Copie automaticamente as operações de traders experientes ou permita que outros copiem as suas.")}
          </p>
        </div>

        {/* Main Content */}
        {myCopyTrader ? (
          // User is an approved Copy Trader
          renderCopyTraderPanel()
        ) : myRequest?.status === "pending" ? (
          // Request is pending
          <div className="space-y-6">
            {renderRequestStatus()}
            <Card className="border-yellow-500/30 bg-yellow-500/5">
              <CardContent className="pt-6">
                <div className="flex items-start gap-4">
                  <AlertCircle className="h-6 w-6 text-yellow-500 flex-shrink-0" />
                  <div>
                    <h3 className="font-semibold mb-1">{t("awaiting_approval", "Aguardando Aprovação")}</h3>
                    <p className="text-sm text-muted-foreground">
                      {t("request_under_review", "Sua solicitação está sendo analisada pela equipe. Você receberá uma notificação quando for aprovada.")}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        ) : myRequest?.status === "rejected" ? (
          // Request was rejected
          <div className="space-y-6">
            {renderRequestStatus()}
            <Button onClick={() => setShowRequestDialog(true)} className="w-full">
              {t("submit_new_request", "Enviar Nova Solicitação")}
            </Button>
          </div>
        ) : (
          // No request yet - show how it works and request button
          <div className="space-y-8">
            {/* How it works */}
            <Card className="border-border/50">
              <CardHeader>
                <CardTitle>{t("how_it_works", "Como Funciona")}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-3 gap-6">
                  <div className="text-center p-4">
                    <div className="w-12 h-12 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-3">
                      <Shield className="h-6 w-6 text-primary" />
                    </div>
                    <h4 className="font-semibold mb-2">{t("step_1_title", "1. Solicite Aprovação")}</h4>
                    <p className="text-sm text-muted-foreground">
                      {t("step_1_desc", "Envie uma solicitação para se tornar um Copy Trader. Nossa equipe irá analisar seu perfil.")}
                    </p>
                  </div>
                  <div className="text-center p-4">
                    <div className="w-12 h-12 bg-accent/20 rounded-full flex items-center justify-center mx-auto mb-3">
                      <UserPlus className="h-6 w-6 text-accent" />
                    </div>
                    <h4 className="font-semibold mb-2">{t("step_2_title", "2. Cadastre Seguidores")}</h4>
                    <p className="text-sm text-muted-foreground">
                      {t("step_2_desc", "Após aprovado, cadastre os traders que desejam copiar suas operações usando o ID deles.")}
                    </p>
                  </div>
                  <div className="text-center p-4">
                    <div className="w-12 h-12 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-3">
                      <TrendingUp className="h-6 w-6 text-green-500" />
                    </div>
                    <h4 className="font-semibold mb-2">{t("step_3_title", "3. Opere Normalmente")}</h4>
                    <p className="text-sm text-muted-foreground">
                      {t("step_3_desc", "Suas operações serão automaticamente copiadas para todos os seus seguidores em tempo real.")}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Request Button */}
            <Card className="border-primary/30 bg-gradient-to-br from-primary/10 via-card to-card">
              <CardContent className="pt-6">
                <div className="text-center">
                  <Crown className="h-12 w-12 mx-auto mb-4 text-primary" />
                  <h3 className="text-xl font-bold mb-2">{t("become_copy_trader", "Torne-se um Copy Trader")}</h3>
                  <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                    {t("become_copy_trader_desc", "Compartilhe suas estratégias e permita que outros traders copiem suas operações automaticamente.")}
                  </p>
                  <Button onClick={() => setShowRequestDialog(true)} size="lg" className="gap-2">
                    <Shield className="h-5 w-5" />
                    {t("request_approval", "Solicitar Aprovação")}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      {/* Request Dialog */}
      <Dialog open={showRequestDialog} onOpenChange={setShowRequestDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("copy_trader_request", "Solicitação de Copy Trader")}</DialogTitle>
            <DialogDescription>
              {t("copy_trader_request_desc", "Preencha os dados abaixo para solicitar aprovação como Copy Trader.")}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>{t("display_name", "Nome de Exibição")} *</Label>
              <Input
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder={t("display_name_placeholder", "Como você quer ser conhecido")}
              />
            </div>
            <div>
              <Label>{t("description", "Descrição")}</Label>
              <Textarea
                value={requestDescription}
                onChange={(e) => setRequestDescription(e.target.value)}
                placeholder={t("request_description_placeholder", "Descreva sua experiência como trader, estratégias utilizadas, etc.")}
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRequestDialog(false)}>
              {t("cancel", "Cancelar")}
            </Button>
            <Button onClick={handleSubmitRequest}>
              {t("submit_request", "Enviar Solicitação")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Follower Dialog */}
      <Dialog open={showAddFollowerDialog} onOpenChange={setShowAddFollowerDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("add_follower", "Adicionar Seguidor")}</DialogTitle>
            <DialogDescription>
              {t("add_follower_desc", "Informe o ID do usuário que deseja cadastrar como seu seguidor.")}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6">
            <div>
              <Label>{t("user_id", "ID do Usuário")} *</Label>
              <Input
                value={followerUserId}
                onChange={(e) => setFollowerUserId(e.target.value)}
                placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                className="font-mono"
              />
              <p className="text-xs text-muted-foreground mt-1">
                {t("user_id_hint", "O usuário pode encontrar seu ID na página de perfil")}
              </p>
            </div>
            <div>
              <Label>{t("allocation_percentage", "Percentual de Alocação")}: {allocationPercentage[0]}%</Label>
              <Slider
                value={allocationPercentage}
                onValueChange={setAllocationPercentage}
                min={10}
                max={100}
                step={5}
                className="mt-2"
              />
              <p className="text-xs text-muted-foreground mt-1">
                {t("allocation_hint", "Quanto do valor das suas operações será copiado")}
              </p>
            </div>
            <div>
              <Label>{t("max_trade_amount", "Valor Máximo por Trade")} ({t("optional", "opcional")})</Label>
              <Input
                type="number"
                value={maxTradeAmount}
                onChange={(e) => setMaxTradeAmount(e.target.value)}
                placeholder="R$ 0.00"
              />
              <p className="text-xs text-muted-foreground mt-1">
                {t("max_trade_hint", "Limite máximo para cada operação copiada")}
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddFollowerDialog(false)}>
              {t("cancel", "Cancelar")}
            </Button>
            <Button onClick={handleAddFollower}>
              {t("add", "Adicionar")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
