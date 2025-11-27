import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Loader2, Plus, Pencil, Trash2 } from "lucide-react";
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

  const handleSave = async () => {
    if (!formData.name || !formData.symbol) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }

    if (editingAsset) {
      const { error } = await supabase
        .from("assets")
        .update(formData)
        .eq("id", editingAsset.id);

      if (error) {
        toast.error("Erro ao atualizar ativo");
        return;
      }
      toast.success("Ativo atualizado com sucesso!");
    } else {
      const { error } = await supabase.from("assets").insert(formData);

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
    setDialogOpen(true);
  };

  const resetForm = () => {
    setEditingAsset(null);
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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold mb-2">Ativos</h1>
          <p className="text-muted-foreground">
            Gerencie os ativos disponíveis para negociação
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleOrganizeAssets} variant="outline">
            Organizar Ativos
          </Button>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={resetForm}>
                <Plus className="h-4 w-4 mr-2" />
                Novo Ativo
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {editingAsset ? "Editar Ativo" : "Novo Ativo"}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Nome</Label>
                  <Input
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    placeholder="Bitcoin"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Símbolo</Label>
                  <Input
                    value={formData.symbol}
                    onChange={(e) =>
                      setFormData({ ...formData, symbol: e.target.value })
                    }
                    placeholder="BTC"
                  />
                </div>
                <div className="space-y-2">
                  <Label>URL do Ícone</Label>
                  <Input
                    value={formData.icon_url}
                    onChange={(e) =>
                      setFormData({ ...formData, icon_url: e.target.value })
                    }
                    placeholder="https://..."
                  />
                </div>
                <div className="space-y-2">
                  <Label>Payout (%)</Label>
                  <Input
                    type="number"
                    value={formData.payout_percentage}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        payout_percentage: Number(e.target.value),
                      })
                    }
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label>Ativo</Label>
                  <Switch
                    checked={formData.is_active}
                    onCheckedChange={(checked) =>
                      setFormData({ ...formData, is_active: checked })
                    }
                  />
                </div>
                <Button onClick={handleSave} className="w-full">
                  {editingAsset ? "Atualizar" : "Criar"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card>
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
