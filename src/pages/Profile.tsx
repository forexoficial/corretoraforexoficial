import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Camera, Mail, Phone, MapPin, Calendar, TrendingUp, DollarSign, Award, Settings, LogOut, Edit2, Save, X, Copy, Check, Shield, Crown, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { AvatarUploadDialog } from "@/components/AvatarUploadDialog";
import { UserTierProgress } from "@/components/UserTierProgress";
import { toast as sonnerToast } from "sonner";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useIsMobile } from "@/hooks/use-mobile";
import { MobileTradingHeader } from "@/components/mobile/MobileTradingHeader";

export default function Profile() {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const [isEditing, setIsEditing] = useState(false);
  const [profile, setProfile] = useState<any>(null);
  const [avatarDialogOpen, setAvatarDialogOpen] = useState(false);
  const [copiedId, setCopiedId] = useState(false);
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);
  const [isAffiliate, setIsAffiliate] = useState(false);
  const [stats, setStats] = useState({
    totalTrades: 0,
    successRate: 0,
    totalProfit: 0,
    monthProfit: 0
  });
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [profileData, setProfileData] = useState({
    name: "",
    email: "",
    phone: "",
    location: "",
    bio: "",
    joinDate: "",
    avatar: ""
  });

  useEffect(() => {
    if (user) {
      loadProfile();
      loadRealStats();
      loadRecentActivity();
      checkAffiliateStatus();
    }
  }, [user]);

  const loadProfile = async () => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", user?.id)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setProfile(data);
        setProfileData({
          name: data.full_name || user?.user_metadata?.full_name || "",
          email: user?.email || "",
          phone: "",
          location: "",
          bio: "",
          joinDate: new Date(data.created_at).toLocaleDateString("pt-BR", { month: "long", year: "numeric" }),
          avatar: data.avatar_url || ""
        });
      }
    } catch (error: any) {
      toast({
        title: "Erro ao carregar perfil",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const loadRealStats = async () => {
    try {
      // Buscar apenas trades reais (is_demo = false)
      const { data: trades, error } = await supabase
        .from("trades")
        .select("*")
        .eq("user_id", user?.id)
        .eq("is_demo", false);

      if (error) throw error;

      if (trades && trades.length > 0) {
        const totalTrades = trades.length;
        const wonTrades = trades.filter(t => t.status === 'won').length;
        const successRate = totalTrades > 0 ? (wonTrades / totalTrades) * 100 : 0;
        
        const totalProfit = trades.reduce((sum, trade) => {
          return sum + (trade.result || 0);
        }, 0);

        // Calcular lucro do mês atual
        const now = new Date();
        const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const monthTrades = trades.filter(t => new Date(t.created_at) >= firstDayOfMonth);
        const monthProfit = monthTrades.reduce((sum, trade) => {
          return sum + (trade.result || 0);
        }, 0);

        setStats({
          totalTrades,
          successRate: parseFloat(successRate.toFixed(1)),
          totalProfit,
          monthProfit
        });
      }
    } catch (error: any) {
      console.error("Erro ao carregar estatísticas:", error);
    }
  };

  const loadRecentActivity = async () => {
    try {
      // Buscar últimos 5 trades reais
      const { data: trades, error: tradesError } = await supabase
        .from("trades")
        .select(`
          *,
          assets (name, symbol)
        `)
        .eq("user_id", user?.id)
        .eq("is_demo", false)
        .order("created_at", { ascending: false })
        .limit(5);

      if (tradesError) throw tradesError;

      const activities = trades?.map(trade => ({
        type: "trade",
        asset: trade.assets?.symbol || trade.assets?.name || "N/A",
        result: trade.status === 'won' ? 'Ganho' : trade.status === 'lost' ? 'Perda' : 'Aberto',
        amount: trade.result 
          ? (trade.result >= 0 
              ? `+R$ ${Math.abs(trade.result).toFixed(2)}` 
              : `-R$ ${Math.abs(trade.result).toFixed(2)}`)
          : 'R$ 0.00',
        time: formatTimeAgo(trade.created_at)
      })) || [];

      setRecentActivity(activities);
    } catch (error: any) {
      console.error("Erro ao carregar atividade recente:", error);
    }
  };

  const checkAffiliateStatus = async () => {
    try {
      const { data, error } = await supabase
        .from("affiliates")
        .select("id")
        .eq("user_id", user?.id)
        .maybeSingle();

      if (error) throw error;
      setIsAffiliate(!!data);
    } catch (error: any) {
      console.error("Erro ao verificar status de afiliado:", error);
    }
  };

  const formatTimeAgo = (date: string) => {
    const now = new Date();
    const past = new Date(date);
    const diffMs = now.getTime() - past.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffHours < 1) return "Agora mesmo";
    if (diffHours < 24) return `${diffHours} hora${diffHours > 1 ? 's' : ''} atrás`;
    return `${diffDays} dia${diffDays > 1 ? 's' : ''} atrás`;
  };

  const statsCards = [
    { label: "Total de Trades (Real)", value: stats.totalTrades.toLocaleString('pt-BR'), icon: TrendingUp, color: "text-primary" },
    { label: "Taxa de Sucesso (Real)", value: `${stats.successRate}%`, icon: Award, color: "text-green-500" },
    { label: "Lucro Total (Real)", value: `R$ ${stats.totalProfit.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, icon: DollarSign, color: "text-accent" },
    { label: "Mês Atual (Real)", value: `R$ ${stats.monthProfit.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, icon: TrendingUp, color: "text-blue-500" }
  ];

  const achievements = [
    { title: "Primeiro Trade", description: "Complete seu primeiro trade", unlocked: true },
    { title: "Semana Lucrativa", description: "7 dias consecutivos com lucro", unlocked: true },
    { title: "Master Trader", description: "100 trades com sucesso", unlocked: false },
    { title: "Alto Volume", description: "R$ 10,000 em volume", unlocked: true }
  ];

  const handleSave = async () => {
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: profileData.name,
        })
        .eq("user_id", user?.id);

      if (error) throw error;

      toast({
        title: "Perfil atualizado",
        description: "Suas alterações foram salvas com sucesso!",
      });
      setIsEditing(false);
      loadProfile();
    } catch (error: any) {
      toast({
        title: "Erro ao atualizar perfil",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
  };

  const copyUserId = () => {
    if (user?.id) {
      navigator.clipboard.writeText(user.id);
      setCopiedId(true);
      sonnerToast.success("ID copiado para a área de transferência!");
      setTimeout(() => setCopiedId(false), 2000);
    }
  };

  const handleLogoutClick = () => {
    setShowLogoutDialog(true);
  };

  const confirmLogout = async () => {
    await signOut();
    setShowLogoutDialog(false);
  };

  return (
    <div className="min-h-screen bg-background pb-16">
      {/* Mobile Header */}
      {isMobile && profile?.current_asset_id && (
        <MobileTradingHeader 
          selectedAsset={{
            name: "Profile",
            icon_url: ""
          }}
        />
      )}

      {/* Desktop Header Navigation */}
      {!isMobile && (
        <header className="border-b border-border bg-card">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <Button variant="ghost" onClick={() => navigate("/")}>
                ← Voltar
              </Button>
              <div className="flex gap-2">
                <Button variant="outline" size="icon">
                  <Settings className="h-5 w-5" />
                </Button>
                <Button variant="outline" size="icon" onClick={handleLogoutClick}>
                  <LogOut className="h-5 w-5" />
                </Button>
              </div>
            </div>
          </div>
        </header>
      )}

      {/* Logout Confirmation Dialog */}
      <AlertDialog open={showLogoutDialog} onOpenChange={setShowLogoutDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Tem certeza que deseja sair?</AlertDialogTitle>
            <AlertDialogDescription>
              Você será desconectado da sua conta e precisará fazer login novamente para acessar.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmLogout}>Sair</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Profile Header */}
      <div className="bg-gradient-to-br from-primary/20 via-accent/10 to-background border-b border-border">
        <div className="container mx-auto px-4 py-8">
          <div className="flex flex-col md:flex-row gap-6 items-start md:items-center">
            <div className="relative group">
              <Avatar className="h-32 w-32 border-4 border-background shadow-xl">
                <AvatarImage src={profileData.avatar} alt={profileData.name} />
                <AvatarFallback className="text-3xl">
                  {profileData.name?.split(" ").map(n => n[0]).join("").toUpperCase() || "U"}
                </AvatarFallback>
              </Avatar>
              
              {/* Tier badge - left side */}
              {profile?.user_tier === "pro" && (
                <div className="absolute bottom-1 left-1 px-2 py-0.5 bg-blue-500 rounded-full flex items-center gap-1 border-2 border-background shadow-lg">
                  <Zap className="h-3 w-3 text-white" />
                  <span className="text-[10px] font-bold text-white">PRO</span>
                </div>
              )}
              {profile?.user_tier === "vip" && (
                <div className="absolute bottom-1 left-1 px-2 py-0.5 bg-amber-400 rounded-full flex items-center gap-1 border-2 border-background shadow-lg">
                  <Crown className="h-3 w-3 text-amber-900" />
                  <span className="text-[10px] font-bold text-amber-900">VIP</span>
                </div>
              )}
              
              {/* Verified badge - right side */}
              {profile?.verification_status === "approved" && (
                <div className="absolute bottom-1 right-1 w-8 h-8 bg-emerald-500 rounded-full flex items-center justify-center border-2 border-background shadow-lg">
                  <Check className="h-5 w-5 text-white" />
                </div>
              )}
              
              <button 
                onClick={() => setAvatarDialogOpen(true)}
                className="absolute inset-0 flex items-center justify-center bg-background/80 rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
              >
                <Camera className="h-8 w-8 text-foreground" />
              </button>
            </div>

            <div className="flex-1">
              {!isEditing ? (
                <>
                  <div className="flex items-center gap-3 mb-2">
                    <h1 className="text-3xl font-bold">{profileData.name}</h1>
                    <Badge variant="secondary" className="bg-accent/20 text-accent">
                      Verificado
                    </Badge>
                  </div>
                  
                  {/* User ID Display */}
                  <div className="flex items-center gap-2 mb-4 p-2 bg-muted/50 rounded-lg w-fit">
                    <span className="text-sm text-muted-foreground">ID:</span>
                    <code className="text-sm font-mono">{user?.id}</code>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={copyUserId}
                    >
                      {copiedId ? (
                        <Check className="h-3 w-3 text-green-500" />
                      ) : (
                        <Copy className="h-3 w-3" />
                      )}
                    </Button>
                  </div>

                  <p className="text-muted-foreground mb-4 max-w-2xl">{profileData.bio}</p>
                  <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4" />
                      {profileData.email}
                    </div>
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4" />
                      {profileData.phone}
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4" />
                      {profileData.location}
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      Membro desde {profileData.joinDate}
                    </div>
                  </div>
                </>
              ) : (
                <div className="space-y-4">
                  <div>
                    <Label>Nome</Label>
                    <Input
                      value={profileData.name}
                      onChange={(e) => setProfileData({ ...profileData, name: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Bio</Label>
                    <Textarea
                      value={profileData.bio}
                      onChange={(e) => setProfileData({ ...profileData, bio: e.target.value })}
                      rows={3}
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-2">
              {!isEditing ? (
                <>
                  <Button onClick={() => navigate("/")} variant="outline" className="gap-2">
                    <TrendingUp className="h-4 w-4" />
                    Voltar a Negociar
                  </Button>
                  <Button onClick={() => setIsEditing(true)} className="gap-2">
                    <Edit2 className="h-4 w-4" />
                    Editar Perfil
                  </Button>
                  {isMobile && (
                    <Button onClick={handleLogoutClick} variant="destructive" size="icon">
                      <LogOut className="h-4 w-4" />
                    </Button>
                  )}
                </>
              ) : (
                <>
                  <Button onClick={handleSave} className="gap-2">
                    <Save className="h-4 w-4" />
                    Salvar
                  </Button>
                  <Button onClick={handleCancel} variant="outline" className="gap-2">
                    <X className="h-4 w-4" />
                    Cancelar
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* User Tier Progress */}
      <div className="container mx-auto px-4 -mt-6 mb-6">
        <UserTierProgress 
          totalDeposited={profile?.total_deposited || 0}
          currentTier={profile?.user_tier || 'standard'}
        />
      </div>

      {/* Stats Cards */}
      <div className="container mx-auto px-4 mb-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {statsCards.map((stat, index) => (
            <Card key={index} className="bg-card/80 backdrop-blur">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-2">
                  <stat.icon className={`h-8 w-8 ${stat.color}`} />
                  <span className="text-2xl font-bold">{stat.value}</span>
                </div>
                <p className="text-sm text-muted-foreground">{stat.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Main Content Tabs */}
      <div className="container mx-auto px-4 pb-8">
        <Tabs defaultValue="activity" className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-6">
            <TabsTrigger value="activity">Atividades</TabsTrigger>
            <TabsTrigger value="achievements">Conquistas</TabsTrigger>
            <TabsTrigger value="settings">Configurações</TabsTrigger>
          </TabsList>

          <TabsContent value="activity">
            <Card>
              <CardHeader>
                <CardTitle>Atividade Recente</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {recentActivity.map((activity, index) => (
                    <div key={index}>
                      <div className="flex items-center justify-between py-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-1">
                            <Badge
                              variant={
                                activity.type === "trade"
                                  ? "default"
                                  : activity.type === "deposit"
                                  ? "secondary"
                                  : "outline"
                              }
                            >
                              {activity.type === "trade"
                                ? "Trade"
                                : activity.type === "deposit"
                                ? "Depósito"
                                : "Saque"}
                            </Badge>
                            <span className="font-medium">{activity.asset}</span>
                          </div>
                          <p className="text-sm text-muted-foreground">{activity.time}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-medium">{activity.result}</p>
                          <p
                            className={`text-sm font-bold ${
                              activity.amount.startsWith("+") ? "text-green-500" : "text-red-500"
                            }`}
                          >
                            {activity.amount}
                          </p>
                        </div>
                      </div>
                      {index < recentActivity.length - 1 && <Separator />}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="achievements">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {achievements.map((achievement, index) => (
                <Card
                  key={index}
                  className={achievement.unlocked ? "border-accent" : "opacity-50"}
                >
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                      <div
                        className={`p-3 rounded-full ${
                          achievement.unlocked ? "bg-accent/20" : "bg-muted"
                        }`}
                      >
                        <Award
                          className={`h-6 w-6 ${
                            achievement.unlocked ? "text-accent" : "text-muted-foreground"
                          }`}
                        />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold mb-1">{achievement.title}</h3>
                        <p className="text-sm text-muted-foreground">{achievement.description}</p>
                        {achievement.unlocked && (
                          <Badge className="mt-2" variant="secondary">
                            Desbloqueado
                          </Badge>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="settings">
            <Card>
              <CardHeader>
                <CardTitle>Configurações da Conta</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={profileData.email}
                      onChange={(e) => setProfileData({ ...profileData, email: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="phone">Telefone</Label>
                    <Input
                      id="phone"
                      type="tel"
                      value={profileData.phone}
                      onChange={(e) => setProfileData({ ...profileData, phone: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="location">Localização</Label>
                    <Input
                      id="location"
                      value={profileData.location}
                      onChange={(e) => setProfileData({ ...profileData, location: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Status de Verificação</Label>
                    <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                      <Shield className="h-5 w-5 text-primary" />
                      <div className="flex-1">
                        <p className="font-medium capitalize">
                          {profile?.verification_status === "approved" && "✅ Verificado"}
                          {profile?.verification_status === "under_review" && "⏳ Em análise"}
                          {profile?.verification_status === "rejected" && "❌ Rejeitado"}
                          {profile?.verification_status === "pending" && "⚠️ Pendente"}
                        </p>
                      </div>
                      {profile?.verification_status === "pending" && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => navigate("/verify-identity")}
                        >
                          Verificar Identidade
                        </Button>
                      )}
                    </div>
                  </div>
                </div>

                <Separator />

                <div className="space-y-4">
                  <h3 className="font-semibold">Segurança</h3>
                  <Button variant="outline" className="w-full justify-start">
                    Alterar Senha
                  </Button>
                  <Button variant="outline" className="w-full justify-start">
                    Autenticação de Dois Fatores
                  </Button>
                </div>

                <Separator />

                <div className="space-y-4">
                  <h3 className="font-semibold">Preferências</h3>
                  <Button variant="outline" className="w-full justify-start">
                    Notificações
                  </Button>
                  <Button variant="outline" className="w-full justify-start">
                    Privacidade
                  </Button>
                </div>

                <Button className="w-full mt-6">Salvar Alterações</Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Affiliate Panel Button */}
      {isAffiliate && (
        <div className="container mx-auto px-4 pb-8">
          <Card className="bg-gradient-to-br from-primary/10 via-accent/5 to-background border-primary/20">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold mb-1">Painel de Afiliado</h3>
                  <p className="text-sm text-muted-foreground">
                    Gerencie suas comissões, referidos e estatísticas de afiliado
                  </p>
                </div>
                <Button 
                  onClick={() => navigate('/affiliate/dashboard')}
                  className="gap-2"
                >
                  <Award className="h-4 w-4" />
                  Acessar Painel
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Avatar Upload Dialog */}
      <AvatarUploadDialog
        open={avatarDialogOpen}
        onOpenChange={setAvatarDialogOpen}
        userId={user?.id || ""}
        onUploadComplete={loadProfile}
      />
    </div>
  );
}
