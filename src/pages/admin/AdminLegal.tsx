import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Plus, Pencil, Trash2, FileText, Save, X } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface LegalDocument {
  id: string;
  title: string;
  slug: string;
  description: string;
  content: string | null;
  icon: string;
  display_order: number;
  is_active: boolean;
}

interface CompanyInfo {
  id: string;
  key: string;
  value: string;
  description: string | null;
}

export default function AdminLegal() {
  const [documents, setDocuments] = useState<LegalDocument[]>([]);
  const [companyInfo, setCompanyInfo] = useState<CompanyInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingDoc, setEditingDoc] = useState<LegalDocument | null>(null);
  const [formData, setFormData] = useState({
    title: "",
    slug: "",
    description: "",
    content: "",
    icon: "FileText",
    display_order: 0,
    is_active: true,
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [docsResult, infoResult] = await Promise.all([
        supabase.from("legal_documents").select("*").order("display_order"),
        supabase.from("company_info").select("*").order("key"),
      ]);

      if (docsResult.error) throw docsResult.error;
      if (infoResult.error) throw infoResult.error;

      setDocuments(docsResult.data || []);
      setCompanyInfo(infoResult.data || []);
    } catch (error: any) {
      toast.error("Erro ao carregar dados: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveDocument = async () => {
    try {
      if (!formData.title || !formData.slug || !formData.description) {
        toast.error("Preencha todos os campos obrigatórios");
        return;
      }

      toast.loading("Salvando documento...");

      if (editingDoc) {
        const { error } = await supabase
          .from("legal_documents")
          .update({
            title: formData.title,
            description: formData.description,
            content: formData.content,
            icon: formData.icon,
            display_order: formData.display_order,
            is_active: formData.is_active,
          })
          .eq("id", editingDoc.id);

        if (error) throw error;
      } else {
        const { error } = await supabase.from("legal_documents").insert({
          title: formData.title,
          slug: formData.slug,
          description: formData.description,
          content: formData.content,
          icon: formData.icon,
          display_order: formData.display_order,
          is_active: formData.is_active,
        });

        if (error) throw error;
      }

      toast.dismiss();
      toast.success(
        editingDoc ? "Documento atualizado!" : "Documento criado!"
      );
      setDialogOpen(false);
      resetForm();
      fetchData();
    } catch (error: any) {
      toast.dismiss();
      toast.error("Erro ao salvar: " + error.message);
    }
  };

  const handleDeleteDocument = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir este documento?")) return;

    try {
      const { error } = await supabase
        .from("legal_documents")
        .delete()
        .eq("id", id);

      if (error) throw error;
      toast.success("Documento excluído!");
      fetchData();
    } catch (error: any) {
      toast.error("Erro ao excluir: " + error.message);
    }
  };

  const handleEditDocument = (doc: LegalDocument) => {
    setEditingDoc(doc);
    setFormData({
      title: doc.title,
      slug: doc.slug,
      description: doc.description,
      content: doc.content || "",
      icon: doc.icon,
      display_order: doc.display_order,
      is_active: doc.is_active,
    });
    setDialogOpen(true);
  };

  const resetForm = () => {
    setEditingDoc(null);
    setFormData({
      title: "",
      slug: "",
      description: "",
      content: "",
      icon: "FileText",
      display_order: 0,
      is_active: true,
    });
  };

  const handleUpdateCompanyInfo = async (key: string, value: string) => {
    try {
      const { error } = await supabase
        .from("company_info")
        .update({ value })
        .eq("key", key);

      if (error) throw error;
      toast.success("Informação atualizada!");
      fetchData();
    } catch (error: any) {
      toast.error("Erro ao atualizar: " + error.message);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold mb-2">Gerenciar Documentos Legais</h1>
          <p className="text-muted-foreground">
            Controle total sobre documentos jurídicos e informações da empresa
          </p>
        </div>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Novo Documento
        </Button>
      </div>

      <Tabs defaultValue="documents" className="w-full">
        <TabsList>
          <TabsTrigger value="documents">Documentos Legais</TabsTrigger>
          <TabsTrigger value="company">Informações da Empresa</TabsTrigger>
        </TabsList>

        <TabsContent value="documents" className="space-y-4">
          <Card className="p-6">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Ordem</TableHead>
                  <TableHead>Título</TableHead>
                  <TableHead>Slug</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {documents.map((doc) => (
                  <TableRow key={doc.id}>
                    <TableCell>{doc.display_order}</TableCell>
                    <TableCell className="font-medium">{doc.title}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {doc.slug}
                    </TableCell>
                    <TableCell className="max-w-xs truncate">
                      {doc.description}
                    </TableCell>
                    <TableCell>
                      {doc.is_active ? (
                        <span className="text-success text-sm">Ativo</span>
                      ) : (
                        <span className="text-muted-foreground text-sm">
                          Inativo
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => handleEditDocument(doc)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="destructive"
                          size="icon"
                          onClick={() => handleDeleteDocument(doc.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        <TabsContent value="company" className="space-y-4">
          <Card className="p-6">
            <div className="space-y-4">
              {companyInfo.map((info) => (
                <div key={info.id} className="flex items-center gap-4 p-4 border border-border rounded-lg">
                  <div className="flex-1">
                    <Label className="text-sm font-semibold mb-1">
                      {info.key}
                    </Label>
                    {info.description && (
                      <p className="text-xs text-muted-foreground mb-2">
                        {info.description}
                      </p>
                    )}
                    <Input
                      defaultValue={info.value}
                      onBlur={(e) =>
                        handleUpdateCompanyInfo(info.key, e.target.value)
                      }
                    />
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Dialog para criar/editar documento */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingDoc ? "Editar Documento" : "Novo Documento"}
            </DialogTitle>
            <DialogDescription>
              {editingDoc
                ? "Atualize as informações do documento legal"
                : "Crie um novo documento legal para a plataforma"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>
                Título <span className="text-destructive">*</span>
              </Label>
              <Input
                value={formData.title}
                onChange={(e) =>
                  setFormData({ ...formData, title: e.target.value })
                }
                placeholder="Ex: Termos de Uso"
              />
            </div>

            <div className="space-y-2">
              <Label>
                Slug (URL) <span className="text-destructive">*</span>
              </Label>
              <Input
                value={formData.slug}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    slug: e.target.value.toLowerCase().replace(/\s+/g, "-"),
                  })
                }
                placeholder="termos-de-uso"
                disabled={!!editingDoc}
              />
            </div>

            <div className="space-y-2">
              <Label>
                Descrição <span className="text-destructive">*</span>
              </Label>
              <Input
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                placeholder="Breve descrição do documento"
              />
            </div>

            <div className="space-y-2">
              <Label>Conteúdo (HTML)</Label>
              <Textarea
                value={formData.content}
                onChange={(e) =>
                  setFormData({ ...formData, content: e.target.value })
                }
                placeholder="<h1>Título</h1><p>Conteúdo...</p>"
                rows={10}
                className="font-mono text-sm"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Ícone</Label>
                <Input
                  value={formData.icon}
                  onChange={(e) =>
                    setFormData({ ...formData, icon: e.target.value })
                  }
                  placeholder="FileText"
                />
              </div>

              <div className="space-y-2">
                <Label>Ordem de Exibição</Label>
                <Input
                  type="number"
                  value={formData.display_order}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      display_order: parseInt(e.target.value) || 0,
                    })
                  }
                />
              </div>
            </div>

            <div className="flex items-center justify-between">
              <Label>Documento Ativo</Label>
              <Switch
                checked={formData.is_active}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, is_active: checked })
                }
              />
            </div>

            <div className="flex gap-2 pt-4">
              <Button onClick={handleSaveDocument} className="flex-1">
                <Save className="h-4 w-4 mr-2" />
                {editingDoc ? "Atualizar" : "Criar"}
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setDialogOpen(false);
                  resetForm();
                }}
              >
                <X className="h-4 w-4 mr-2" />
                Cancelar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}