import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Bell, Send, Users, Trash2, RefreshCw, Smartphone, Monitor, Globe, ShieldCheck, DollarSign, Wallet, UserCheck, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface PushSubscription {
  id: string;
  user_id: string | null;
  endpoint: string;
  created_at: string;
  updated_at: string;
}

interface ProfileInfo {
  full_name: string;
  document: string;
}

export default function AdminPushNotifications() {
  const [subscriptions, setSubscriptions] = useState<PushSubscription[]>([]);
  const [profiles, setProfiles] = useState<Record<string, ProfileInfo>>({});
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [url, setUrl] = useState("");

  const fetchSubscriptions = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("push_subscriptions")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setSubscriptions(data || []);

      // Fetch profile info for users with subscriptions
      const userIds = [...new Set((data || []).filter(s => s.user_id).map(s => s.user_id))] as string[];
      if (userIds.length > 0) {
        const { data: profilesData } = await supabase
          .from("profiles")
          .select("user_id, full_name, document")
          .in("user_id", userIds);

        const profileMap: Record<string, ProfileInfo> = {};
        (profilesData || []).forEach(p => {
          profileMap[p.user_id] = { full_name: p.full_name, document: p.document };
        });
        setProfiles(profileMap);
      }
    } catch (error) {
      console.error("Error fetching subscriptions:", error);
      toast.error("Erro ao carregar inscrições");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubscriptions();
  }, []);

  const handleSendNotification = async (sendToAll: boolean, userId?: string) => {
    if (!title.trim() || !body.trim()) {
      toast.error("Preencha o título e a mensagem");
      return;
    }

    setSending(true);
    try {
      const { data, error } = await supabase.functions.invoke("send-push-notification", {
        body: {
          title: title.trim(),
          body: body.trim(),
          url: url.trim() || undefined,
          sendToAll,
          userId,
        },
      });

      if (error) throw error;

      if (data?.success) {
        toast.success(`Notificação enviada! ${data.sent} enviadas, ${data.failed} falharam`);
        setTitle("");
        setBody("");
        setUrl("");
      } else {
        toast.error(data?.error || "Erro ao enviar notificação");
      }
    } catch (error) {
      console.error("Error sending notification:", error);
      toast.error("Erro ao enviar notificação");
    } finally {
      setSending(false);
    }
  };

  const handleDeleteSubscription = async (id: string) => {
    try {
      const { error } = await supabase
        .from("push_subscriptions")
        .delete()
        .eq("id", id);

      if (error) throw error;
      toast.success("Inscrição removida");
      fetchSubscriptions();
    } catch (error) {
      console.error("Error deleting subscription:", error);
      toast.error("Erro ao remover inscrição");
    }
  };

  const getDeviceIcon = (endpoint: string) => {
    if (endpoint.includes("android") || endpoint.includes("fcm")) {
      return <Smartphone className="h-4 w-4 text-green-500" />;
    }
    if (endpoint.includes("apple") || endpoint.includes("safari")) {
      return <Smartphone className="h-4 w-4 text-blue-500" />;
    }
    if (endpoint.includes("mozilla") || endpoint.includes("firefox")) {
      return <Monitor className="h-4 w-4 text-orange-500" />;
    }
    return <Globe className="h-4 w-4 text-muted-foreground" />;
  };

  const stats = {
    total: subscriptions.length,
    authenticated: subscriptions.filter(s => s.user_id).length,
    anonymous: subscriptions.filter(s => !s.user_id).length,
  };

  // Tipos de notificações automáticas para admin
  const autoNotificationTypes = [
    { type: 'new_deposit', title: '💰 Novo Depósito', description: 'Quando um usuário realiza um depósito', icon: DollarSign, color: 'text-green-500' },
    { type: 'withdrawal_request', title: '🏦 Solicitação de Saque', description: 'Quando um usuário solicita um saque', icon: Wallet, color: 'text-blue-500' },
    { type: 'identity_verification', title: '🪪 Verificação de Identidade', description: 'Quando um usuário envia documentos', icon: UserCheck, color: 'text-amber-500' },
    { type: 'affiliate_withdrawal', title: '👥 Saque de Afiliado', description: 'Quando afiliado solicita saque', icon: Users, color: 'text-purple-500' },
    { type: 'new_user', title: '🎉 Novo Usuário', description: 'Quando um novo usuário se cadastra', icon: UserPlus, color: 'text-cyan-500' },
  ];

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex items-center gap-2 md:gap-3">
        <Bell className="h-6 w-6 md:h-8 md:w-8 text-primary" />
        <div>
          <h1 className="text-xl md:text-3xl font-bold">Notificações Push</h1>
          <p className="text-xs md:text-sm text-muted-foreground">
            Gerencie e envie notificações push para usuários do PWA
          </p>
        </div>
      </div>

      {/* Admin Auto-Notifications Info */}
      <Card className="border-amber-500/30 bg-amber-500/5">
        <CardHeader className="p-3 md:p-6">
          <CardTitle className="flex items-center gap-2 text-base md:text-lg text-amber-600">
            <ShieldCheck className="h-4 w-4 md:h-5 md:w-5" />
            Notificações Automáticas para Admins
          </CardTitle>
          <CardDescription className="text-xs md:text-sm">
            Administradores recebem notificações automáticas para os seguintes eventos
          </CardDescription>
        </CardHeader>
        <CardContent className="p-3 pt-0 md:p-6 md:pt-0">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 md:gap-3">
            {autoNotificationTypes.map((notif) => (
              <div key={notif.type} className="flex items-start gap-2 p-2 md:p-3 rounded-lg bg-background/50 border border-border/50">
                <notif.icon className={`h-4 w-4 md:h-5 md:w-5 mt-0.5 ${notif.color}`} />
                <div>
                  <p className="text-xs md:text-sm font-medium">{notif.title}</p>
                  <p className="text-[10px] md:text-xs text-muted-foreground">{notif.description}</p>
                </div>
              </div>
            ))}
          </div>
          <p className="text-[10px] md:text-xs text-muted-foreground mt-3 p-2 rounded bg-muted/50">
            ⚠️ Para receber notificações, admins devem ter o PWA instalado e notificações ativadas
          </p>
        </CardContent>
      </Card>

      {/* Stats Cards */}
      <div className="grid grid-cols-3 gap-2 md:gap-4">
        <Card>
          <CardHeader className="pb-1 md:pb-2 p-3 md:p-6">
            <CardTitle className="text-[10px] md:text-sm font-medium text-muted-foreground">
              Total
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 pt-0 md:p-6 md:pt-0">
            <div className="flex items-center gap-1 md:gap-2">
              <Users className="h-3 w-3 md:h-5 md:w-5 text-primary" />
              <span className="text-lg md:text-2xl font-bold">{stats.total}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-1 md:pb-2 p-3 md:p-6">
            <CardTitle className="text-[10px] md:text-sm font-medium text-muted-foreground">
              Autenticados
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 pt-0 md:p-6 md:pt-0">
            <div className="flex items-center gap-1 md:gap-2">
              <Smartphone className="h-3 w-3 md:h-5 md:w-5 text-green-500" />
              <span className="text-lg md:text-2xl font-bold">{stats.authenticated}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-1 md:pb-2 p-3 md:p-6">
            <CardTitle className="text-[10px] md:text-sm font-medium text-muted-foreground">
              Anônimos
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 pt-0 md:p-6 md:pt-0">
            <div className="flex items-center gap-1 md:gap-2">
              <Globe className="h-3 w-3 md:h-5 md:w-5 text-muted-foreground" />
              <span className="text-lg md:text-2xl font-bold">{stats.anonymous}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Send Notification Form */}
      <Card>
        <CardHeader className="p-3 md:p-6">
          <CardTitle className="flex items-center gap-2 text-base md:text-lg">
            <Send className="h-4 w-4 md:h-5 md:w-5" />
            Enviar Notificação
          </CardTitle>
          <CardDescription className="text-xs md:text-sm">
            Envie notificações push para todos os usuários inscritos
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 md:space-y-4 p-3 pt-0 md:p-6 md:pt-0">
          <div className="grid grid-cols-1 gap-3 md:gap-4">
            <div className="space-y-1 md:space-y-2">
              <Label htmlFor="title" className="text-xs md:text-sm">Título *</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ex: Nova promoção disponível!"
                maxLength={50}
                className="text-sm h-9 md:h-10"
              />
              <p className="text-[10px] md:text-xs text-muted-foreground">{title.length}/50</p>
            </div>

            <div className="space-y-1 md:space-y-2">
              <Label htmlFor="url" className="text-xs md:text-sm">URL (opcional)</Label>
              <Input
                id="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="Ex: /deposit"
                className="text-sm h-9 md:h-10"
              />
            </div>
          </div>

          <div className="space-y-1 md:space-y-2">
            <Label htmlFor="body" className="text-xs md:text-sm">Mensagem *</Label>
            <Textarea
              id="body"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Digite a mensagem da notificação..."
              rows={2}
              maxLength={200}
              className="text-sm"
            />
            <p className="text-[10px] md:text-xs text-muted-foreground">{body.length}/200</p>
          </div>

          <Button
            onClick={() => handleSendNotification(true)}
            disabled={sending || !title.trim() || !body.trim() || stats.total === 0}
            className="w-full h-9 md:h-10 text-sm"
          >
            {sending ? (
              <>
                <RefreshCw className="h-3 w-3 md:h-4 md:w-4 mr-2 animate-spin" />
                Enviando...
              </>
            ) : (
              <>
                <Send className="h-3 w-3 md:h-4 md:w-4 mr-2" />
                Enviar para Todos ({stats.total})
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Subscriptions List */}
      <Card>
        <CardHeader className="p-3 md:p-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
            <div>
              <CardTitle className="text-base md:text-lg">Inscrições Ativas</CardTitle>
              <CardDescription className="text-xs md:text-sm">
                Dispositivos inscritos para notificações
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={fetchSubscriptions} disabled={loading} className="h-8 text-xs">
              <RefreshCw className={`h-3 w-3 mr-1 ${loading ? "animate-spin" : ""}`} />
              Atualizar
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-3 pt-0 md:p-6 md:pt-0">
          {loading ? (
            <div className="flex items-center justify-center py-6">
              <RefreshCw className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : subscriptions.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground">
              <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Nenhuma inscrição encontrada</p>
            </div>
          ) : (
            <div className="space-y-2 md:hidden">
              {/* Mobile: Card-based layout */}
              {subscriptions.map((sub) => (
                <div key={sub.id} className="p-3 border rounded-lg space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {getDeviceIcon(sub.endpoint)}
                      <span className="text-xs text-muted-foreground truncate max-w-[120px]">
                        {sub.endpoint.split("/").pop()?.slice(0, 15)}...
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      {sub.user_id && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleSendNotification(false, sub.user_id!)}
                          disabled={sending || !title.trim() || !body.trim()}
                          className="h-7 w-7 p-0"
                        >
                          <Send className="h-3 w-3" />
                        </Button>
                      )}
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="sm" className="text-destructive h-7 w-7 p-0">
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent className="max-w-[90vw]">
                          <AlertDialogHeader>
                            <AlertDialogTitle className="text-base">Remover Inscrição</AlertDialogTitle>
                            <AlertDialogDescription className="text-sm">
                              O usuário não receberá mais notificações.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel className="h-9">Cancelar</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDeleteSubscription(sub.id)}
                              className="bg-destructive text-destructive-foreground h-9"
                            >
                              Remover
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    {sub.user_id ? (
                      <span className="font-medium">
                        {profiles[sub.user_id]?.full_name || "Usuário"}
                      </span>
                    ) : (
                      <Badge variant="secondary" className="text-[10px] h-5">Anônimo</Badge>
                    )}
                    <span className="text-muted-foreground">
                      {format(new Date(sub.created_at), "dd/MM/yy", { locale: ptBR })}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
          
          {/* Desktop: Table layout */}
          {subscriptions.length > 0 && (
            <div className="hidden md:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Dispositivo</TableHead>
                    <TableHead>Usuário</TableHead>
                    <TableHead>Inscrito em</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {subscriptions.map((sub) => (
                    <TableRow key={sub.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getDeviceIcon(sub.endpoint)}
                          <span className="text-xs text-muted-foreground truncate max-w-[200px]">
                            {sub.endpoint.split("/").pop()?.slice(0, 20)}...
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {sub.user_id ? (
                          <div>
                            <p className="font-medium text-sm">
                              {profiles[sub.user_id]?.full_name || "Usuário"}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {profiles[sub.user_id]?.document || sub.user_id.slice(0, 8)}
                            </p>
                          </div>
                        ) : (
                          <Badge variant="secondary">Anônimo</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <span className="text-sm">
                          {format(new Date(sub.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {sub.user_id && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleSendNotification(false, sub.user_id!)}
                              disabled={sending || !title.trim() || !body.trim()}
                              title="Enviar notificação para este usuário"
                            >
                              <Send className="h-3 w-3" />
                            </Button>
                          )}
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="sm" className="text-destructive">
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Remover Inscrição</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Esta ação removerá a inscrição de notificações deste dispositivo.
                                  O usuário não receberá mais notificações até se inscrever novamente.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDeleteSubscription(sub.id)}
                                  className="bg-destructive text-destructive-foreground"
                                >
                                  Remover
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
