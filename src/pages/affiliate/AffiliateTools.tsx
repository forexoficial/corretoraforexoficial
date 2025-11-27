import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Copy, Download, Share2, Link2, CheckCircle2, Plus, Trash2, Eye, Edit2, BarChart3 } from "lucide-react";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { z } from "zod";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

const customLinkSchema = z.object({
  name: z.string().trim().min(1, "Nome é obrigatório").max(100, "Nome deve ter no máximo 100 caracteres"),
  custom_slug: z.string()
    .trim()
    .min(3, "Slug deve ter pelo menos 3 caracteres")
    .max(50, "Slug deve ter no máximo 50 caracteres")
    .regex(/^[a-z0-9-]+$/, "Slug deve conter apenas letras minúsculas, números e hífens"),
  description: z.string().trim().max(500, "Descrição deve ter no máximo 500 caracteres").optional(),
});

type CustomLink = {
  id: string;
  name: string;
  custom_slug: string;
  description: string | null;
  clicks: number;
  conversions: number;
  is_active: boolean;
  created_at: string;
};

export default function AffiliateTools() {
  const { user } = useAuth();
  const [affiliateCode, setAffiliateCode] = useState("");
  const [affiliateLink, setAffiliateLink] = useState("");
  const [affiliateId, setAffiliateId] = useState("");
  const [copied, setCopied] = useState<string | null>(null);
  const [customLinks, setCustomLinks] = useState<CustomLink[]>([]);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    custom_slug: "",
    description: "",
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (user) {
      fetchAffiliateInfo();
      fetchCustomLinks();
    }
  }, [user]);

  const fetchAffiliateInfo = async () => {
    try {
      const { data: affiliate } = await supabase
        .from("affiliates")
        .select("id, affiliate_code")
        .eq("user_id", user?.id)
        .maybeSingle();

      if (affiliate) {
        setAffiliateId(affiliate.id);
        setAffiliateCode(affiliate.affiliate_code);
        setAffiliateLink(`${window.location.origin}/auth?ref=${affiliate.affiliate_code}`);
      }
    } catch (error) {
      console.error("Error fetching affiliate info:", error);
    }
  };

  const fetchCustomLinks = async () => {
    try {
      const { data: affiliate } = await supabase
        .from("affiliates")
        .select("id")
        .eq("user_id", user?.id)
        .maybeSingle();

      if (!affiliate) return;

      const { data, error } = await supabase
        .from("affiliate_custom_links")
        .select("*")
        .eq("affiliate_id", affiliate.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setCustomLinks(data || []);
    } catch (error) {
      console.error("Error fetching custom links:", error);
      toast.error("Erro ao carregar links personalizados");
    }
  };

  const handleCreateLink = async () => {
    try {
      setFormErrors({});
      const validatedData = customLinkSchema.parse(formData);

      if (!affiliateId) {
        toast.error("Informações do afiliado não encontradas");
        return;
      }

      const { error } = await supabase
        .from("affiliate_custom_links")
        .insert({
          affiliate_id: affiliateId,
          name: validatedData.name,
          custom_slug: validatedData.custom_slug,
          description: validatedData.description || null,
        });

      if (error) {
        if (error.code === "23505") {
          toast.error("Este slug já está em uso. Escolha outro.");
        } else {
          throw error;
        }
        return;
      }

      toast.success("Link personalizado criado!");
      setIsCreateDialogOpen(false);
      setFormData({ name: "", custom_slug: "", description: "" });
      fetchCustomLinks();
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errors: Record<string, string> = {};
        error.issues.forEach((err) => {
          if (err.path[0]) {
            errors[err.path[0].toString()] = err.message;
          }
        });
        setFormErrors(errors);
      } else {
        console.error("Error creating custom link:", error);
        toast.error("Erro ao criar link personalizado");
      }
    }
  };

  const handleDeleteLink = async (id: string) => {
    try {
      const { error } = await supabase
        .from("affiliate_custom_links")
        .delete()
        .eq("id", id);

      if (error) throw error;

      toast.success("Link removido!");
      fetchCustomLinks();
    } catch (error) {
      console.error("Error deleting custom link:", error);
      toast.error("Erro ao remover link");
    }
  };

  const getCustomLink = (slug: string) => {
    return `${window.location.origin}/auth?ref=${affiliateCode}&campaign=${slug}`;
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopied(label);
    toast.success(`${label} copiado!`);
    setTimeout(() => setCopied(null), 2000);
  };

  const bannerHtml = `<a href="${affiliateLink}" target="_blank">
  <img src="${window.location.origin}/placeholder.svg" alt="Junte-se a nós" style="max-width: 728px; width: 100%;" />
</a>`;

  const textLink = `Cadastre-se agora e comece a lucrar: ${affiliateLink}`;

  const emailTemplate = `Olá!

Gostaria de te apresentar uma plataforma incrível de trading que estou usando.

Com ela, você pode:
✅ Negociar diversos ativos
✅ Depositar e sacar de forma rápida
✅ Acompanhar seus resultados em tempo real

Use meu link de indicação para se cadastrar:
${affiliateLink}

Te vejo por lá!`;

  const socialPost = `🚀 Descubra a melhor plataforma de trading!

Cadastre-se usando meu link exclusivo: ${affiliateLink}

#Trading #Investimentos #OportunidadeDeOuro`;

  return (
    <div className="space-y-6 lg:space-y-8">
      <div>
        <h2 className="text-2xl lg:text-3xl font-bold">Ferramentas de Marketing</h2>
        <p className="text-sm lg:text-base text-muted-foreground mt-1">
          Crie e gerencie seus links personalizados para rastrear campanhas
        </p>
      </div>

      {/* Custom Links Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg lg:text-xl">Links Personalizados</CardTitle>
              <CardDescription className="mt-1">
                Crie links únicos para diferentes campanhas e rastreie o desempenho de cada um
              </CardDescription>
            </div>
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  Criar Link
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-card backdrop-blur-xl border-border">
                <DialogHeader>
                  <DialogTitle>Criar Link Personalizado</DialogTitle>
                  <DialogDescription>
                    Crie um link único para rastrear uma campanha específica
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Nome da Campanha *</Label>
                    <Input
                      id="name"
                      placeholder="Ex: Instagram Bio, YouTube Video"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className={formErrors.name ? "border-destructive" : ""}
                    />
                    {formErrors.name && (
                      <p className="text-sm text-destructive">{formErrors.name}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="slug">Slug Personalizado *</Label>
                    <Input
                      id="slug"
                      placeholder="Ex: instagram-bio"
                      value={formData.custom_slug}
                      onChange={(e) => setFormData({ ...formData, custom_slug: e.target.value.toLowerCase() })}
                      className={formErrors.custom_slug ? "border-destructive" : ""}
                    />
                    {formErrors.custom_slug && (
                      <p className="text-sm text-destructive">{formErrors.custom_slug}</p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      Apenas letras minúsculas, números e hífens
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description">Descrição (opcional)</Label>
                    <Textarea
                      id="description"
                      placeholder="Descreva onde e como você usará este link..."
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      rows={3}
                    />
                  </div>

                  {formData.custom_slug && (
                    <div className="p-3 bg-muted rounded-md">
                      <p className="text-xs text-muted-foreground mb-1">Preview do link:</p>
                      <p className="text-sm font-mono break-all">
                        {getCustomLink(formData.custom_slug)}
                      </p>
                    </div>
                  )}
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                    Cancelar
                  </Button>
                  <Button onClick={handleCreateLink}>
                    Criar Link
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {customLinks.length === 0 ? (
            <div className="text-center py-12">
              <Link2 className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">Nenhum link personalizado</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Crie seu primeiro link personalizado para começar a rastrear campanhas
              </p>
              <Button onClick={() => setIsCreateDialogOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Criar Primeiro Link
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead className="hidden lg:table-cell">Descrição</TableHead>
                    <TableHead>Link</TableHead>
                    <TableHead className="text-center">
                      <BarChart3 className="w-4 h-4 mx-auto" />
                    </TableHead>
                    <TableHead className="text-center">Conversões</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {customLinks.map((link) => (
                    <TableRow key={link.id}>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium">{link.name}</span>
                          <span className="text-xs text-muted-foreground lg:hidden">
                            {link.description}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="hidden lg:table-cell max-w-[200px]">
                        <span className="text-sm text-muted-foreground line-clamp-2">
                          {link.description || "—"}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <code className="text-xs bg-muted px-2 py-1 rounded">
                            .../{link.custom_slug}
                          </code>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => copyToClipboard(getCustomLink(link.custom_slug), link.name)}
                          >
                            {copied === link.name ? (
                              <CheckCircle2 className="w-4 h-4 text-success" />
                            ) : (
                              <Copy className="w-4 h-4" />
                            )}
                          </Button>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="secondary">{link.clicks}</Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="default">{link.conversions}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDeleteLink(link.id)}
                        >
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Original Materials Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
            <Link2 className="w-4 h-4 sm:w-5 sm:h-5" />
            Seu Link de Afiliado
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <label className="text-xs sm:text-sm font-medium mb-2 block">Link Completo</label>
              <div className="flex flex-col sm:flex-row gap-2">
                <div className="flex-1 p-2 sm:p-3 bg-muted rounded-md font-mono text-xs sm:text-sm break-all">
                  {affiliateLink}
                </div>
                <Button
                  onClick={() => copyToClipboard(affiliateLink, "Link")}
                  variant="outline"
                  size="sm"
                  className="w-full sm:w-auto"
                >
                  {copied === "Link" ? (
                    <>
                      <CheckCircle2 className="w-4 h-4 sm:mr-2" />
                      <span className="hidden sm:inline">Copiado</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4 sm:mr-2" />
                      <span className="hidden sm:inline">Copiar</span>
                    </>
                  )}
                </Button>
              </div>
            </div>

            <div>
              <label className="text-xs sm:text-sm font-medium mb-2 block">Código de Afiliado</label>
              <div className="flex flex-col sm:flex-row gap-2">
                <div className="flex-1 p-2 sm:p-3 bg-muted rounded-md font-mono text-base sm:text-lg font-bold">
                  {affiliateCode}
                </div>
                <Button
                  onClick={() => copyToClipboard(affiliateCode, "Código")}
                  variant="outline"
                  size="sm"
                  className="w-full sm:w-auto"
                >
                  {copied === "Código" ? (
                    <>
                      <CheckCircle2 className="w-4 h-4 sm:mr-2" />
                      <span className="hidden sm:inline">Copiado</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4 sm:mr-2" />
                      <span className="hidden sm:inline">Copiar</span>
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base sm:text-lg">Materiais Promocionais</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="text">
            <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4 text-xs sm:text-sm">
              <TabsTrigger value="text">Texto</TabsTrigger>
              <TabsTrigger value="banner">Banner</TabsTrigger>
              <TabsTrigger value="email">Email</TabsTrigger>
              <TabsTrigger value="social">Redes Sociais</TabsTrigger>
            </TabsList>

            <TabsContent value="text" className="space-y-4">
              <div>
                <h4 className="font-medium mb-2">Link com Texto</h4>
                <div className="p-4 bg-muted rounded-md">
                  <p className="text-sm mb-3">{textLink}</p>
                  <Button
                    onClick={() => copyToClipboard(textLink, "Texto")}
                    size="sm"
                  >
                    <Copy className="w-4 h-4 mr-2" />
                    Copiar Texto
                  </Button>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="banner" className="space-y-4">
              <div>
                <h4 className="font-medium mb-2">Código HTML do Banner</h4>
                <div className="p-4 bg-muted rounded-md">
                  <pre className="text-xs mb-3 overflow-x-auto">{bannerHtml}</pre>
                  <Button
                    onClick={() => copyToClipboard(bannerHtml, "HTML do Banner")}
                    size="sm"
                  >
                    <Copy className="w-4 h-4 mr-2" />
                    Copiar HTML
                  </Button>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="email" className="space-y-4">
              <div>
                <h4 className="font-medium mb-2">Template de Email</h4>
                <div className="p-4 bg-muted rounded-md">
                  <pre className="text-sm mb-3 whitespace-pre-wrap">{emailTemplate}</pre>
                  <Button
                    onClick={() => copyToClipboard(emailTemplate, "Template de Email")}
                    size="sm"
                  >
                    <Copy className="w-4 h-4 mr-2" />
                    Copiar Template
                  </Button>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="social" className="space-y-4">
              <div>
                <h4 className="font-medium mb-2">Post para Redes Sociais</h4>
                <div className="p-4 bg-muted rounded-md">
                  <pre className="text-sm mb-3 whitespace-pre-wrap">{socialPost}</pre>
                  <div className="flex gap-2">
                    <Button
                      onClick={() => copyToClipboard(socialPost, "Post para Redes Sociais")}
                      size="sm"
                    >
                      <Copy className="w-4 h-4 mr-2" />
                      Copiar Post
                    </Button>
                    <Button
                      onClick={() => {
                        const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(socialPost)}`;
                        window.open(twitterUrl, '_blank');
                      }}
                      size="sm"
                      variant="outline"
                    >
                      <Share2 className="w-4 h-4 mr-2" />
                      Compartilhar no X
                    </Button>
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base sm:text-lg">Dicas para Promover</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 sm:space-y-3 text-xs sm:text-sm">
            <li className="flex items-start gap-2">
              <span className="text-primary font-bold">•</span>
              <span>Compartilhe seu link em suas redes sociais (Instagram, Facebook, Twitter)</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary font-bold">•</span>
              <span>Crie conteúdo educativo sobre trading e inclua seu link</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary font-bold">•</span>
              <span>Envie para amigos e familiares interessados em investimentos</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary font-bold">•</span>
              <span>Participe de fóruns e comunidades relacionadas a finanças</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary font-bold">•</span>
              <span>Use os banners em seu site ou blog pessoal</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary font-bold">•</span>
              <span>Compartilhe resultados reais para gerar confiança</span>
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
