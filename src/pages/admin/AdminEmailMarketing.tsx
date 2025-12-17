import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Mail, Send, Users, FileText, Loader2 } from "lucide-react";

const emailTemplates = [
  {
    id: "promo",
    name: "Promoção",
    subject: "🔥 Oferta Especial - Apenas Hoje!",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #f59e0b, #d97706); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
          <h1 style="color: white; margin: 0;">🔥 Oferta Especial!</h1>
        </div>
        <div style="background: #1a1a2e; padding: 30px; color: #fff;">
          <h2 style="color: #f59e0b;">Não perca esta oportunidade!</h2>
          <p>Deposite hoje e ganhe bônus exclusivos na sua conta.</p>
          <a href="https://trade.forexoficial.com/deposit" style="display: inline-block; background: #f59e0b; color: #000; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; margin: 20px 0;">Depositar Agora</a>
        </div>
        <div style="background: #0f0f1a; padding: 20px; text-align: center; color: #888; font-size: 12px; border-radius: 0 0 10px 10px;">
          <p>© ${new Date().getFullYear()} Forex Oficial</p>
        </div>
      </div>
    `,
  },
  {
    id: "news",
    name: "Novidades",
    subject: "📢 Novidades na Forex Oficial!",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #f59e0b, #d97706); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
          <h1 style="color: white; margin: 0;">📢 Novidades!</h1>
        </div>
        <div style="background: #1a1a2e; padding: 30px; color: #fff;">
          <h2 style="color: #f59e0b;">Confira as últimas atualizações</h2>
          <p>Temos novidades incríveis para você! Novos ativos, ferramentas e muito mais.</p>
          <a href="https://trade.forexoficial.com" style="display: inline-block; background: #f59e0b; color: #000; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; margin: 20px 0;">Ver Novidades</a>
        </div>
        <div style="background: #0f0f1a; padding: 20px; text-align: center; color: #888; font-size: 12px; border-radius: 0 0 10px 10px;">
          <p>© ${new Date().getFullYear()} Forex Oficial</p>
        </div>
      </div>
    `,
  },
  {
    id: "reminder",
    name: "Lembrete",
    subject: "⏰ Sentimos sua falta!",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #f59e0b, #d97706); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
          <h1 style="color: white; margin: 0;">⏰ Volte a Operar!</h1>
        </div>
        <div style="background: #1a1a2e; padding: 30px; color: #fff;">
          <h2 style="color: #f59e0b;">Sentimos sua falta!</h2>
          <p>Faz um tempo que você não acessa sua conta. O mercado está cheio de oportunidades!</p>
          <a href="https://trade.forexoficial.com" style="display: inline-block; background: #f59e0b; color: #000; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; margin: 20px 0;">Voltar a Operar</a>
        </div>
        <div style="background: #0f0f1a; padding: 20px; text-align: center; color: #888; font-size: 12px; border-radius: 0 0 10px 10px;">
          <p>© ${new Date().getFullYear()} Forex Oficial</p>
        </div>
      </div>
    `,
  },
];

export default function AdminEmailMarketing() {
  const [activeTab, setActiveTab] = useState("campaign");
  const [isLoading, setIsLoading] = useState(false);
  const [totalUsers, setTotalUsers] = useState<number | null>(null);

  // Campaign state
  const [campaignSubject, setCampaignSubject] = useState("");
  const [campaignHtml, setCampaignHtml] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);

  // Single email state
  const [singleEmail, setSingleEmail] = useState("");
  const [singleSubject, setSingleSubject] = useState("");
  const [singleHtml, setSingleHtml] = useState("");

  // Load user count
  useState(() => {
    supabase
      .from("profiles")
      .select("email", { count: "exact" })
      .not("email", "is", null)
      .then(({ count }) => setTotalUsers(count));
  });

  const handleSelectTemplate = (templateId: string) => {
    const template = emailTemplates.find(t => t.id === templateId);
    if (template) {
      setCampaignSubject(template.subject);
      setCampaignHtml(template.html);
      setSelectedTemplate(templateId);
    }
  };

  const handleSendCampaign = async () => {
    if (!campaignSubject || !campaignHtml) {
      toast.error("Preencha o assunto e conteúdo do email");
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("sendpulse-send-email", {
        body: {
          action: "campaign",
          subject: campaignSubject,
          html: campaignHtml,
        },
      });

      if (error) throw error;

      toast.success(`Campanha enviada para ${data.sent} usuários!`);
      setCampaignSubject("");
      setCampaignHtml("");
      setSelectedTemplate(null);
    } catch (error: any) {
      console.error("Campaign error:", error);
      toast.error(error.message || "Erro ao enviar campanha");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendSingle = async () => {
    if (!singleEmail || !singleSubject || !singleHtml) {
      toast.error("Preencha todos os campos");
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await supabase.functions.invoke("sendpulse-send-email", {
        body: {
          action: "send",
          to: singleEmail,
          subject: singleSubject,
          html: singleHtml,
        },
      });

      if (error) throw error;

      toast.success("Email enviado com sucesso!");
      setSingleEmail("");
      setSingleSubject("");
      setSingleHtml("");
    } catch (error: any) {
      console.error("Send error:", error);
      toast.error(error.message || "Erro ao enviar email");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Email Marketing</h1>
          <p className="text-muted-foreground">Envie emails e campanhas para seus usuários</p>
        </div>
        <Card className="bg-primary/10 border-primary/20">
          <CardContent className="p-4 flex items-center gap-3">
            <Users className="h-8 w-8 text-primary" />
            <div>
              <p className="text-sm text-muted-foreground">Total de Usuários</p>
              <p className="text-2xl font-bold text-primary">{totalUsers ?? "..."}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="campaign" className="flex items-center gap-2">
            <Send className="h-4 w-4" />
            Campanha
          </TabsTrigger>
          <TabsTrigger value="single" className="flex items-center gap-2">
            <Mail className="h-4 w-4" />
            Email Individual
          </TabsTrigger>
        </TabsList>

        <TabsContent value="campaign" className="space-y-6">
          {/* Templates */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Templates Prontos
              </CardTitle>
              <CardDescription>Selecione um template ou crie seu próprio email</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {emailTemplates.map((template) => (
                  <Button
                    key={template.id}
                    variant={selectedTemplate === template.id ? "default" : "outline"}
                    className="h-auto p-4 flex flex-col items-start gap-2"
                    onClick={() => handleSelectTemplate(template.id)}
                  >
                    <span className="font-semibold">{template.name}</span>
                    <span className="text-xs text-muted-foreground truncate w-full text-left">
                      {template.subject}
                    </span>
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Campaign Form */}
          <Card>
            <CardHeader>
              <CardTitle>Criar Campanha</CardTitle>
              <CardDescription>
                Envie um email para todos os {totalUsers ?? "..."} usuários cadastrados
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Assunto do Email</Label>
                <Input
                  placeholder="Ex: 🔥 Novidades incríveis para você!"
                  value={campaignSubject}
                  onChange={(e) => setCampaignSubject(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>Conteúdo HTML</Label>
                <Textarea
                  placeholder="Cole o HTML do seu email aqui..."
                  value={campaignHtml}
                  onChange={(e) => setCampaignHtml(e.target.value)}
                  className="min-h-[300px] font-mono text-sm"
                />
              </div>

              {campaignHtml && (
                <div className="space-y-2">
                  <Label>Preview</Label>
                  <div 
                    className="border rounded-lg p-4 bg-white"
                    dangerouslySetInnerHTML={{ __html: campaignHtml }}
                  />
                </div>
              )}

              <Button
                onClick={handleSendCampaign}
                disabled={isLoading || !campaignSubject || !campaignHtml}
                className="w-full"
                size="lg"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Enviando...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    Enviar para {totalUsers ?? "..."} usuários
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="single">
          <Card>
            <CardHeader>
              <CardTitle>Enviar Email Individual</CardTitle>
              <CardDescription>Envie um email para um usuário específico</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Email do Destinatário</Label>
                <Input
                  type="email"
                  placeholder="usuario@email.com"
                  value={singleEmail}
                  onChange={(e) => setSingleEmail(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>Assunto</Label>
                <Input
                  placeholder="Assunto do email"
                  value={singleSubject}
                  onChange={(e) => setSingleSubject(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>Conteúdo HTML</Label>
                <Textarea
                  placeholder="Cole o HTML do seu email aqui..."
                  value={singleHtml}
                  onChange={(e) => setSingleHtml(e.target.value)}
                  className="min-h-[200px] font-mono text-sm"
                />
              </div>

              {singleHtml && (
                <div className="space-y-2">
                  <Label>Preview</Label>
                  <div 
                    className="border rounded-lg p-4 bg-white"
                    dangerouslySetInnerHTML={{ __html: singleHtml }}
                  />
                </div>
              )}

              <Button
                onClick={handleSendSingle}
                disabled={isLoading || !singleEmail || !singleSubject || !singleHtml}
                className="w-full"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Enviando...
                  </>
                ) : (
                  <>
                    <Mail className="h-4 w-4 mr-2" />
                    Enviar Email
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
