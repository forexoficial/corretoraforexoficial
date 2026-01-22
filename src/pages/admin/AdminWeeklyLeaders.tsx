import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  Trophy, 
  Plus, 
  Trash2, 
  Save, 
  GripVertical,
  Pencil,
  X,
  Medal
} from "lucide-react";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

interface WeeklyLeader {
  id: string;
  display_name: string;
  avatar_url: string | null;
  balance: number;
  position: number;
  is_active: boolean;
}

export default function AdminWeeklyLeaders() {
  const [leaders, setLeaders] = useState<WeeklyLeader[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingLeader, setEditingLeader] = useState<WeeklyLeader | null>(null);
  const [formData, setFormData] = useState({
    display_name: "",
    avatar_url: "",
    balance: "",
    position: "",
    is_active: true
  });

  useEffect(() => {
    loadLeaders();
  }, []);

  const loadLeaders = async () => {
    try {
      const { data, error } = await supabase
        .from("weekly_leaders")
        .select("*")
        .order("position", { ascending: true });

      if (error) throw error;
      setLeaders(data || []);
    } catch (error) {
      console.error("Erro ao carregar líderes:", error);
      toast.error("Erro ao carregar líderes da semana");
    } finally {
      setLoading(false);
    }
  };

  const openNewDialog = () => {
    setEditingLeader(null);
    setFormData({
      display_name: "",
      avatar_url: "",
      balance: "",
      position: String(leaders.length + 1),
      is_active: true
    });
    setDialogOpen(true);
  };

  const openEditDialog = (leader: WeeklyLeader) => {
    setEditingLeader(leader);
    setFormData({
      display_name: leader.display_name,
      avatar_url: leader.avatar_url || "",
      balance: String(leader.balance),
      position: String(leader.position),
      is_active: leader.is_active
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.display_name.trim()) {
      toast.error("Nome é obrigatório");
      return;
    }

    setSaving(true);
    try {
      const leaderData = {
        display_name: formData.display_name.trim(),
        avatar_url: formData.avatar_url.trim() || null,
        balance: parseFloat(formData.balance) || 0,
        position: parseInt(formData.position) || 1,
        is_active: formData.is_active
      };

      if (editingLeader) {
        const { error } = await supabase
          .from("weekly_leaders")
          .update(leaderData)
          .eq("id", editingLeader.id);

        if (error) throw error;
        toast.success("Líder atualizado com sucesso!");
      } else {
        const { error } = await supabase
          .from("weekly_leaders")
          .insert([leaderData]);

        if (error) throw error;
        toast.success("Líder adicionado com sucesso!");
      }

      setDialogOpen(false);
      loadLeaders();
    } catch (error) {
      console.error("Erro ao salvar líder:", error);
      toast.error("Erro ao salvar líder");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir este líder?")) return;

    try {
      const { error } = await supabase
        .from("weekly_leaders")
        .delete()
        .eq("id", id);

      if (error) throw error;
      toast.success("Líder excluído com sucesso!");
      loadLeaders();
    } catch (error) {
      console.error("Erro ao excluir líder:", error);
      toast.error("Erro ao excluir líder");
    }
  };

  const toggleActive = async (leader: WeeklyLeader) => {
    try {
      const { error } = await supabase
        .from("weekly_leaders")
        .update({ is_active: !leader.is_active })
        .eq("id", leader.id);

      if (error) throw error;
      loadLeaders();
    } catch (error) {
      console.error("Erro ao atualizar status:", error);
      toast.error("Erro ao atualizar status");
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const getMedalColor = (position: number) => {
    if (position === 1) return "text-yellow-500";
    if (position === 2) return "text-gray-400";
    if (position === 3) return "text-orange-600";
    return "text-muted-foreground";
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Medal className="h-6 w-6 text-primary" />
            Líderes da Semana
          </h1>
          <p className="text-muted-foreground">
            Gerencie o ranking de líderes exibido na plataforma
          </p>
        </div>
        <Button onClick={openNewDialog} className="gap-2">
          <Plus className="h-4 w-4" />
          Novo Líder
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Ranking Atual</CardTitle>
        </CardHeader>
        <CardContent>
          {leaders.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Nenhum líder cadastrado. Clique em "Novo Líder" para adicionar.
            </div>
          ) : (
            <div className="space-y-3">
              {leaders.map((leader) => (
                <div
                  key={leader.id}
                  className={`flex items-center gap-4 p-4 rounded-lg border ${
                    leader.is_active ? "bg-card" : "bg-muted/50 opacity-60"
                  }`}
                >
                  <div className="flex items-center justify-center w-8">
                    {leader.position <= 3 ? (
                      <Trophy className={`h-5 w-5 ${getMedalColor(leader.position)} fill-current`} />
                    ) : (
                      <span className="text-lg font-bold text-muted-foreground">
                        {leader.position}
                      </span>
                    )}
                  </div>

                  <Avatar className="h-10 w-10">
                    <AvatarImage src={leader.avatar_url || undefined} />
                    <AvatarFallback className="text-xs font-semibold">
                      {getInitials(leader.display_name)}
                    </AvatarFallback>
                  </Avatar>

                  <div className="flex-1 min-w-0">
                    <p className="font-semibold truncate">{leader.display_name}</p>
                    <p className={`text-sm font-bold ${getMedalColor(leader.position)}`}>
                      ${leader.balance.toLocaleString("pt-BR", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2
                      })}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <Switch
                      checked={leader.is_active}
                      onCheckedChange={() => toggleActive(leader)}
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => openEditDialog(leader)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive hover:text-destructive"
                      onClick={() => handleDelete(leader.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog para criar/editar líder */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingLeader ? "Editar Líder" : "Novo Líder"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="display_name">Nome de Exibição</Label>
              <Input
                id="display_name"
                value={formData.display_name}
                onChange={(e) =>
                  setFormData({ ...formData, display_name: e.target.value })
                }
                placeholder="João Silva"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="avatar_url">URL do Avatar (opcional)</Label>
              <Input
                id="avatar_url"
                value={formData.avatar_url}
                onChange={(e) =>
                  setFormData({ ...formData, avatar_url: e.target.value })
                }
                placeholder="https://..."
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="balance">Saldo ($)</Label>
                <Input
                  id="balance"
                  type="number"
                  value={formData.balance}
                  onChange={(e) =>
                    setFormData({ ...formData, balance: e.target.value })
                  }
                  placeholder="15000.00"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="position">Posição</Label>
                <Input
                  id="position"
                  type="number"
                  min="1"
                  value={formData.position}
                  onChange={(e) =>
                    setFormData({ ...formData, position: e.target.value })
                  }
                  placeholder="1"
                />
              </div>
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="is_active">Ativo</Label>
              <Switch
                id="is_active"
                checked={formData.is_active}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, is_active: checked })
                }
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? (
                <LoadingSpinner size="sm" className="mr-2" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
