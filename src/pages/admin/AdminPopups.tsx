import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Loader2, Plus, Edit, Trash2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { format } from "date-fns";

interface Popup {
  id: string;
  title: string;
  content: string;
  is_active: boolean;
  start_date: string | null;
  end_date: string | null;
  image_url: string | null;
  video_url: string | null;
  created_at: string;
  updated_at: string;
}

export default function AdminPopups() {
  const [popups, setPopups] = useState<Popup[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPopup, setEditingPopup] = useState<Popup | null>(null);
  const [formData, setFormData] = useState({
    title: "",
    content: "",
    is_active: true,
    start_date: "",
    end_date: "",
    video_url: "",
  });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  useEffect(() => {
    fetchPopups();
  }, []);

  const fetchPopups = async () => {
    try {
      const { data, error } = await supabase
        .from("platform_popups")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setPopups(data || []);
    } catch (error: any) {
      toast.error("Erro ao carregar pop-ups: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      let imageUrl = editingPopup?.image_url || null;

      // Upload image if new file selected
      if (imageFile) {
        const fileExt = imageFile.name.split('.').pop();
        const fileName = `${Math.random()}.${fileExt}`;
        const filePath = `${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('popup-images')
          .upload(filePath, imageFile);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('popup-images')
          .getPublicUrl(filePath);

        imageUrl = publicUrl;
      }

      const popupData = {
        title: formData.title,
        content: formData.content,
        is_active: formData.is_active,
        start_date: formData.start_date || null,
        end_date: formData.end_date || null,
        image_url: imageUrl,
        video_url: formData.video_url || null,
      };

      if (editingPopup) {
        const { error } = await supabase
          .from("platform_popups")
          .update(popupData)
          .eq("id", editingPopup.id);

        if (error) throw error;
        toast.success("Pop-up atualizado com sucesso!");
      } else {
        const { error } = await supabase
          .from("platform_popups")
          .insert(popupData);

        if (error) throw error;
        toast.success("Pop-up criado com sucesso!");
      }

      setDialogOpen(false);
      resetForm();
      fetchPopups();
    } catch (error: any) {
      toast.error("Erro ao salvar pop-up: " + error.message);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir este pop-up?")) return;

    try {
      const { error } = await supabase
        .from("platform_popups")
        .delete()
        .eq("id", id);

      if (error) throw error;
      toast.success("Pop-up excluído com sucesso!");
      fetchPopups();
    } catch (error: any) {
      toast.error("Erro ao excluir pop-up: " + error.message);
    }
  };

  const handleEdit = (popup: Popup) => {
    setEditingPopup(popup);
    setFormData({
      title: popup.title,
      content: popup.content,
      is_active: popup.is_active,
      start_date: popup.start_date ? format(new Date(popup.start_date), "yyyy-MM-dd'T'HH:mm") : "",
      end_date: popup.end_date ? format(new Date(popup.end_date), "yyyy-MM-dd'T'HH:mm") : "",
      video_url: popup.video_url || "",
    });
    setImagePreview(popup.image_url);
    setImageFile(null);
    setDialogOpen(true);
  };

  const resetForm = () => {
    setFormData({
      title: "",
      content: "",
      is_active: true,
      start_date: "",
      end_date: "",
      video_url: "",
    });
    setImageFile(null);
    setImagePreview(null);
    setEditingPopup(null);
  };

  const handleDialogClose = (open: boolean) => {
    setDialogOpen(open);
    if (!open) resetForm();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Pop-ups</h1>
          <p className="text-muted-foreground">Gerencie os pop-ups da plataforma</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={handleDialogClose}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Novo Pop-up
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-lg">
                {editingPopup ? "Editar Pop-up" : "Novo Pop-up"}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="title" className="text-sm">Título</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  required
                  className="h-9"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="content" className="text-sm">Conteúdo</Label>
                <Textarea
                  id="content"
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  rows={4}
                  required
                  className="text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="image" className="text-sm">Imagem</Label>
                  <Input
                    id="image"
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="h-9 text-xs"
                  />
                  {imagePreview && (
                    <img src={imagePreview} alt="Preview" className="max-h-20 rounded-md mt-1" />
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="video_url" className="text-sm">Link do Vídeo</Label>
                  <Input
                    id="video_url"
                    type="url"
                    placeholder="https://..."
                    value={formData.video_url}
                    onChange={(e) => setFormData({ ...formData, video_url: e.target.value })}
                    className="h-9 text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="start_date" className="text-sm">Início</Label>
                  <Input
                    id="start_date"
                    type="datetime-local"
                    value={formData.start_date}
                    onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                    className="h-9 text-xs"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="end_date" className="text-sm">Término</Label>
                  <Input
                    id="end_date"
                    type="datetime-local"
                    value={formData.end_date}
                    onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                    className="h-9 text-xs"
                  />
                </div>
              </div>

              <div className="flex items-center space-x-2 pt-1">
                <Switch
                  id="is_active"
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                />
                <Label htmlFor="is_active" className="text-sm">Ativo</Label>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => handleDialogClose(false)} size="sm">
                  Cancelar
                </Button>
                <Button type="submit" size="sm">
                  {editingPopup ? "Atualizar" : "Criar"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4">
        {popups.length === 0 ? (
          <Card className="p-8 text-center">
            <p className="text-muted-foreground">Nenhum pop-up criado ainda.</p>
          </Card>
        ) : (
          popups.map((popup) => (
            <Card key={popup.id} className="p-6">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-xl font-semibold">{popup.title}</h3>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      popup.is_active ? "bg-success/10 text-success border border-success/20" : "bg-muted text-muted-foreground border border-border"
                    }`}>
                      {popup.is_active ? "Ativo" : "Inativo"}
                    </span>
                  </div>
                  <p className="text-muted-foreground mb-3 whitespace-pre-wrap">{popup.content}</p>
                  {popup.image_url && (
                    <img src={popup.image_url} alt="Popup" className="max-h-40 rounded-md mb-3" />
                  )}
                  {popup.video_url && (
                    <div className="mb-3 text-sm text-muted-foreground">
                      <span>Vídeo: {popup.video_url}</span>
                    </div>
                  )}
                  <div className="flex gap-4 text-sm text-muted-foreground">
                    {popup.start_date && (
                      <span>Início: {format(new Date(popup.start_date), "dd/MM/yyyy HH:mm")}</span>
                    )}
                    {popup.end_date && (
                      <span>Término: {format(new Date(popup.end_date), "dd/MM/yyyy HH:mm")}</span>
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => handleEdit(popup)}
                  >
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => handleDelete(popup.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}