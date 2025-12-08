import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Bell, Send, Users, Trash2, RefreshCw, Smartphone, Monitor, Globe } from "lucide-react";
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

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Bell className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-3xl font-bold">Notificações Push</h1>
          <p className="text-muted-foreground">
            Gerencie e envie notificações push para usuários do PWA
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total de Inscrições
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              <span className="text-2xl font-bold">{stats.total}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Usuários Autenticados
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Smartphone className="h-5 w-5 text-green-500" />
              <span className="text-2xl font-bold">{stats.authenticated}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Visitantes Anônimos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Globe className="h-5 w-5 text-muted-foreground" />
              <span className="text-2xl font-bold">{stats.anonymous}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Send Notification Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Send className="h-5 w-5" />
            Enviar Notificação
          </CardTitle>
          <CardDescription>
            Envie notificações push para todos os usuários inscritos
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="title">Título *</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ex: Nova promoção disponível!"
                maxLength={50}
              />
              <p className="text-xs text-muted-foreground">{title.length}/50 caracteres</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="url">URL (opcional)</Label>
              <Input
                id="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="Ex: /deposit"
              />
              <p className="text-xs text-muted-foreground">
                Abre ao clicar na notificação
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="body">Mensagem *</Label>
            <Textarea
              id="body"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Digite a mensagem da notificação..."
              rows={3}
              maxLength={200}
            />
            <p className="text-xs text-muted-foreground">{body.length}/200 caracteres</p>
          </div>

          <div className="flex gap-3">
            <Button
              onClick={() => handleSendNotification(true)}
              disabled={sending || !title.trim() || !body.trim() || stats.total === 0}
              className="flex-1"
            >
              {sending ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Enviando...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Enviar para Todos ({stats.total})
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Subscriptions Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Inscrições Ativas</CardTitle>
              <CardDescription>
                Lista de dispositivos inscritos para receber notificações
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={fetchSubscriptions} disabled={loading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
              Atualizar
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : subscriptions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Bell className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Nenhuma inscrição encontrada</p>
              <p className="text-sm">Usuários precisam ativar as notificações no PWA</p>
            </div>
          ) : (
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
          )}
        </CardContent>
      </Card>
    </div>
  );
}
