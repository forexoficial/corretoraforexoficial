import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Loader2, Plus, Pencil, Trash2, Upload, X } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface Asset {
  id: string;
  name: string;
  symbol: string;
  icon_url: string | null;
  payout_percentage: number;
  is_active: boolean;
  created_at: string;
}

export default function AdminAssets() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingAsset, setEditingAsset] = useState<Asset | null>(null);
  const [iconFile, setIconFile] = useState<File | null>(null);
  const [iconPreview, setIconPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [formData, setFormData] = useState({
    name: "",
    symbol: "",
    icon_url: "",
    payout_percentage: 91,
    is_active: true,
  });

  useEffect(() => {
    fetchAssets();
  }, []);

  const fetchAssets = async () => {
    const { data, error } = await supabase
      .from("assets")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Erro ao carregar ativos");
      return;
    }

    setAssets(data || []);
    setLoading(false);
  };

  const handleIconSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Selecione apenas arquivos de imagem");
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      toast.error("Imagem deve ter no máximo 2MB");
      return;
    }

    setIconFile(file);
    setIconPreview(URL.createObjectURL(file));
  };

  const uploadIcon = async (): Promise<string | null> => {
    if (!iconFile) return formData.icon_url || null;

    setUploading(true);
    try {
      const fileExt = iconFile.name.split(".").pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `assets/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("popup-images")
        .upload(filePath, iconFile);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("popup-images")
        .getPublicUrl(filePath);

      return publicUrl;
    } catch (error) {
      console.error("Upload error:", error);
      toast.error("Erro ao fazer upload do ícone");
      return null;
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    if (!formData.name || !formData.symbol) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }

    const iconUrl = await uploadIcon();
    const dataToSave = { ...formData, icon_url: iconUrl };

    if (editingAsset) {
      const { error } = await supabase
        .from("assets")
        .update(dataToSave)
        .eq("id", editingAsset.id);

      if (error) {
        toast.error("Erro ao atualizar ativo");
        return;
      }
      toast.success("Ativo atualizado com sucesso!");
    } else {
      const { error } = await supabase.from("assets").insert(dataToSave);

      if (error) {
        toast.error("Erro ao criar ativo");
        return;
      }
      toast.success("Ativo criado com sucesso!");
    }

    setDialogOpen(false);
    resetForm();
    fetchAssets();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir este ativo?")) return;

    const { error } = await supabase.from("assets").delete().eq("id", id);

    if (error) {
      toast.error("Erro ao excluir ativo");
      return;
    }

    toast.success("Ativo excluído com sucesso!");
    fetchAssets();
  };

  const handleOrganizeAssets = async () => {
    if (!confirm("Isso vai desativar todos os ativos secundários e manter apenas os 20 principais. Continuar?")) return;

    try {
      const { data, error } = await supabase.functions.invoke('organize-assets');
      
      if (error) throw error;
      
      toast.success(data.message);
      fetchAssets();
    } catch (error) {
      console.error(error);
      toast.error("Erro ao organizar ativos");
    }
  };

  const handleEdit = (asset: Asset) => {
    setEditingAsset(asset);
    setFormData({
      name: asset.name,
      symbol: asset.symbol,
      icon_url: asset.icon_url || "",
      payout_percentage: asset.payout_percentage,
      is_active: asset.is_active,
    });
    setIconFile(null);
    setIconPreview(asset.icon_url || null);
    setDialogOpen(true);
  };

  const resetForm = () => {
    setEditingAsset(null);
    setIconFile(null);
    setIconPreview(null);
    setFormData({
      name: "",
      symbol: "",
      icon_url: "",
      payout_percentage: 91,
      is_active: true,
    });
  };

  if (loading) {
    return (
      <div className="flex justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 md:gap-4">
        <div>
          <h1 className="text-xl md:text-4xl font-bold mb-1 md:mb-2">Ativos</h1>
          <p className="text-xs md:text-base text-muted-foreground">
            Gerencie os ativos disponíveis para negociação
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleOrganizeAssets} variant="outline" size="sm" className="h-8 md:h-10 text-xs md:text-sm">
            Organizar
          </Button>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={resetForm} size="sm" className="h-8 md:h-10 text-xs md:text-sm">
                <Plus className="h-3 w-3 md:h-4 md:w-4 mr-1 md:mr-2" />
                Novo
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-[95vw] md:max-w-md">
              <DialogHeader>
                <DialogTitle className="text-base md:text-lg">
                  {editingAsset ? "Editar Ativo" : "Novo Ativo"}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-3 md:space-y-4">
                <div className="space-y-1 md:space-y-2">
                  <Label className="text-xs md:text-sm">Nome</Label>
                  <Input
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    placeholder="Bitcoin"
                    className="h-9 md:h-10 text-sm"
                  />
                </div>
                <div className="space-y-1 md:space-y-2">
                  <Label className="text-xs md:text-sm">Símbolo</Label>
                  <Input
                    value={formData.symbol}
                    onChange={(e) =>
                      setFormData({ ...formData, symbol: e.target.value })
                    }
                    placeholder="BTC"
                    className="h-9 md:h-10 text-sm"
                  />
                </div>
                <div className="space-y-1 md:space-y-2">
                  <Label className="text-xs md:text-sm">Ícone</Label>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleIconSelect}
                    className="hidden"
                  />
                  {iconPreview ? (
                    <div className="flex items-center gap-3">
                      <img
                        src={iconPreview}
                        alt="Preview"
                        className="h-12 w-12 rounded-lg object-contain bg-muted border"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setIconFile(null);
                          setIconPreview(null);
                          setFormData({ ...formData, icon_url: "" });
                        }}
                        className="h-8"
                      >
                        <X className="h-3 w-3 mr-1" />
                        Remover
                      </Button>
                    </div>
                  ) : (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full h-9 md:h-10"
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      Selecionar Ícone
                    </Button>
                  )}
                </div>
                <div className="space-y-1 md:space-y-2">
                  <Label className="text-xs md:text-sm">Payout (%)</Label>
                  <Input
                    type="number"
                    value={formData.payout_percentage}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        payout_percentage: Number(e.target.value),
                      })
                    }
                    className="h-9 md:h-10 text-sm"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label className="text-xs md:text-sm">Ativo</Label>
                  <Switch
                    checked={formData.is_active}
                    onCheckedChange={(checked) =>
                      setFormData({ ...formData, is_active: checked })
                    }
                  />
                </div>
                <Button onClick={handleSave} disabled={uploading} className="w-full h-9 md:h-10 text-sm">
                  {uploading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Enviando...
                    </>
                  ) : editingAsset ? "Atualizar" : "Criar"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Mobile: Card layout */}
      <div className="space-y-2 md:hidden">
        {assets.map((asset) => (
          <Card key={asset.id} className="p-3">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="font-medium text-sm">{asset.name}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs text-muted-foreground">{asset.symbol}</span>
                  <span className="text-xs font-medium">{asset.payout_percentage}%</span>
                  <span
                    className={`px-1.5 py-0.5 rounded-full text-[10px] ${
                      asset.is_active
                        ? "bg-green-500/20 text-green-500"
                        : "bg-red-500/20 text-red-500"
                    }`}
                  >
                    {asset.is_active ? "Ativo" : "Inativo"}
                  </span>
                </div>
              </div>
              <div className="flex gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleEdit(asset)}
                  className="h-7 w-7 p-0"
                >
                  <Pencil className="h-3 w-3" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDelete(asset.id)}
                  className="h-7 w-7 p-0"
                >
                  <Trash2 className="h-3 w-3 text-destructive" />
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Desktop: Table layout */}
      <Card className="hidden md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Símbolo</TableHead>
              <TableHead>Payout</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {assets.map((asset) => (
              <TableRow key={asset.id}>
                <TableCell className="font-medium">{asset.name}</TableCell>
                <TableCell>{asset.symbol}</TableCell>
                <TableCell>{asset.payout_percentage}%</TableCell>
                <TableCell>
                  <span
                    className={`px-2 py-1 rounded-full text-xs ${
                      asset.is_active
                        ? "bg-green-500/20 text-green-500"
                        : "bg-red-500/20 text-red-500"
                    }`}
                  >
                    {asset.is_active ? "Ativo" : "Inativo"}
                  </span>
                </TableCell>
                <TableCell>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleEdit(asset)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(asset.id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
