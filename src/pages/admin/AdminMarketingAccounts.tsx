import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { 
  Users, 
  DollarSign, 
  TrendingUp, 
  Plus, 
  Trash2, 
  Edit2,
  Save,
  X,
  Sparkles,
  Eye
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { formatCurrency } from "@/lib/utils";

interface Affiliate {
  id: string;
  user_id: string;
  affiliate_code: string;
  is_active: boolean;
  profiles?: {
    full_name: string;
    email: string;
  };
}

interface MarketingMetrics {
  id: string;
  affiliate_id: string;
  fake_total_referrals: number;
  fake_total_deposits: number;
  fake_total_commission: number;
  fake_pending_commission: number;
  fake_paid_commission: number;
  fake_conversion_rate: number;
  fake_active_users: number;
  is_active: boolean;
  notes: string | null;
  created_at: string;
  affiliate?: Affiliate;
}

interface FormData {
  affiliate_id: string;
  fake_total_referrals: number;
  fake_total_deposits: number;
  fake_total_commission: number;
  fake_pending_commission: number;
  fake_paid_commission: number;
  fake_conversion_rate: number;
  fake_active_users: number;
  is_active: boolean;
  notes: string;
}

const initialFormData: FormData = {
  affiliate_id: "",
  fake_total_referrals: 0,
  fake_total_deposits: 0,
  fake_total_commission: 0,
  fake_pending_commission: 0,
  fake_paid_commission: 0,
  fake_conversion_rate: 0,
  fake_active_users: 0,
  is_active: true,
  notes: "",
};

export default function AdminMarketingAccounts() {
  const [metrics, setMetrics] = useState<MarketingMetrics[]>([]);
  const [affiliates, setAffiliates] = useState<Affiliate[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      // Fetch marketing metrics
      const { data: metricsData, error: metricsError } = await supabase
        .from("affiliate_marketing_metrics")
        .select("*")
        .order("created_at", { ascending: false });

      if (metricsError) throw metricsError;

      // Fetch all affiliates with profile info
      const { data: affiliatesData, error: affiliatesError } = await supabase
        .from("affiliates")
        .select(`
          id,
          user_id,
          affiliate_code,
          is_active
        `)
        .eq("is_active", true);

      if (affiliatesError) throw affiliatesError;

      // Fetch profiles for affiliates
      const userIds = affiliatesData?.map(a => a.user_id) || [];
      const { data: profilesData } = await supabase
        .from("profiles")
        .select("user_id, full_name, email")
        .in("user_id", userIds);

      // Merge profiles into affiliates
      const affiliatesWithProfiles = affiliatesData?.map(affiliate => ({
        ...affiliate,
        profiles: profilesData?.find(p => p.user_id === affiliate.user_id)
      })) || [];

      // Merge affiliate info into metrics
      const metricsWithAffiliates = metricsData?.map(metric => ({
        ...metric,
        affiliate: affiliatesWithProfiles.find(a => a.id === metric.affiliate_id)
      })) || [];

      setMetrics(metricsWithAffiliates);
      setAffiliates(affiliatesWithProfiles);
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Erro ao carregar dados");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!formData.affiliate_id) {
      toast.error("Selecione um afiliado");
      return;
    }

    setSaving(true);
    try {
      if (editingId) {
        // Update existing
        const { error } = await supabase
          .from("affiliate_marketing_metrics")
          .update({
            fake_total_referrals: formData.fake_total_referrals,
            fake_total_deposits: formData.fake_total_deposits,
            fake_total_commission: formData.fake_total_commission,
            fake_pending_commission: formData.fake_pending_commission,
            fake_paid_commission: formData.fake_paid_commission,
            fake_conversion_rate: formData.fake_conversion_rate,
            fake_active_users: formData.fake_active_users,
            is_active: formData.is_active,
            notes: formData.notes || null,
          })
          .eq("id", editingId);

        if (error) throw error;
        toast.success("Métricas atualizadas com sucesso!");
      } else {
        // Check if affiliate already has metrics
        const existing = metrics.find(m => m.affiliate_id === formData.affiliate_id);
        if (existing) {
          toast.error("Este afiliado já possui métricas de marketing configuradas");
          setSaving(false);
          return;
        }

        // Create new
        const { error } = await supabase
          .from("affiliate_marketing_metrics")
          .insert({
            affiliate_id: formData.affiliate_id,
            fake_total_referrals: formData.fake_total_referrals,
            fake_total_deposits: formData.fake_total_deposits,
            fake_total_commission: formData.fake_total_commission,
            fake_pending_commission: formData.fake_pending_commission,
            fake_paid_commission: formData.fake_paid_commission,
            fake_conversion_rate: formData.fake_conversion_rate,
            fake_active_users: formData.fake_active_users,
            is_active: formData.is_active,
            notes: formData.notes || null,
          });

        if (error) throw error;
        toast.success("Métricas criadas com sucesso!");
      }

      setDialogOpen(false);
      setEditingId(null);
      setFormData(initialFormData);
      fetchData();
    } catch (error) {
      console.error("Error saving metrics:", error);
      toast.error("Erro ao salvar métricas");
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (metric: MarketingMetrics) => {
    setEditingId(metric.id);
    setFormData({
      affiliate_id: metric.affiliate_id,
      fake_total_referrals: metric.fake_total_referrals,
      fake_total_deposits: Number(metric.fake_total_deposits),
      fake_total_commission: Number(metric.fake_total_commission),
      fake_pending_commission: Number(metric.fake_pending_commission),
      fake_paid_commission: Number(metric.fake_paid_commission),
      fake_conversion_rate: Number(metric.fake_conversion_rate),
      fake_active_users: metric.fake_active_users,
      is_active: metric.is_active,
      notes: metric.notes || "",
    });
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir estas métricas?")) return;

    try {
      const { error } = await supabase
        .from("affiliate_marketing_metrics")
        .delete()
        .eq("id", id);

      if (error) throw error;
      toast.success("Métricas excluídas com sucesso!");
      fetchData();
    } catch (error) {
      console.error("Error deleting metrics:", error);
      toast.error("Erro ao excluir métricas");
    }
  };

  const toggleActive = async (id: string, currentState: boolean) => {
    try {
      const { error } = await supabase
        .from("affiliate_marketing_metrics")
        .update({ is_active: !currentState })
        .eq("id", id);

      if (error) throw error;
      toast.success(currentState ? "Métricas desativadas" : "Métricas ativadas");
      fetchData();
    } catch (error) {
      console.error("Error toggling active state:", error);
      toast.error("Erro ao alterar status");
    }
  };

  const openCreateDialog = () => {
    setEditingId(null);
    setFormData(initialFormData);
    setDialogOpen(true);
  };

  // Filter affiliates that don't have metrics yet (for create)
  const availableAffiliates = affiliates.filter(
    a => !metrics.some(m => m.affiliate_id === a.id) || editingId
  );

  if (loading) {
    return <LoadingSpinner size="lg" className="min-h-[400px]" />;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-primary" />
            Contas de Marketing
          </h1>
          <p className="text-muted-foreground mt-1">
            Configure métricas fictícias para afiliados criarem conteúdo
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={openCreateDialog} className="gap-2">
              <Plus className="h-4 w-4" />
              Nova Conta Marketing
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingId ? "Editar Métricas de Marketing" : "Nova Conta de Marketing"}
              </DialogTitle>
              <DialogDescription>
                Defina métricas fictícias que serão exibidas no painel do afiliado
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-4">
              {/* Affiliate Selection */}
              <div className="space-y-2">
                <Label>Afiliado</Label>
                <Select
                  value={formData.affiliate_id}
                  onValueChange={(value) => setFormData({ ...formData, affiliate_id: value })}
                  disabled={!!editingId}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um afiliado" />
                  </SelectTrigger>
                  <SelectContent>
                    {(editingId ? affiliates : availableAffiliates).map((affiliate) => (
                      <SelectItem key={affiliate.id} value={affiliate.id}>
                        {affiliate.profiles?.full_name || "Sem nome"} ({affiliate.affiliate_code})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Metrics Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-primary" />
                    Total de Referidos
                  </Label>
                  <Input
                    type="number"
                    min="0"
                    value={formData.fake_total_referrals}
                    onChange={(e) => setFormData({ ...formData, fake_total_referrals: parseInt(e.target.value) || 0 })}
                  />
                </div>

                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-success" />
                    Usuários Ativos
                  </Label>
                  <Input
                    type="number"
                    min="0"
                    value={formData.fake_active_users}
                    onChange={(e) => setFormData({ ...formData, fake_active_users: parseInt(e.target.value) || 0 })}
                  />
                </div>

                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-chart-1" />
                    Total de Depósitos (R$)
                  </Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.fake_total_deposits}
                    onChange={(e) => setFormData({ ...formData, fake_total_deposits: parseFloat(e.target.value) || 0 })}
                  />
                </div>

                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-success" />
                    Comissão Total (R$)
                  </Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.fake_total_commission}
                    onChange={(e) => setFormData({ ...formData, fake_total_commission: parseFloat(e.target.value) || 0 })}
                  />
                </div>

                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-warning" />
                    Comissão Pendente (R$)
                  </Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.fake_pending_commission}
                    onChange={(e) => setFormData({ ...formData, fake_pending_commission: parseFloat(e.target.value) || 0 })}
                  />
                </div>

                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                    Comissão Paga (R$)
                  </Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.fake_paid_commission}
                    onChange={(e) => setFormData({ ...formData, fake_paid_commission: parseFloat(e.target.value) || 0 })}
                  />
                </div>

                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-chart-2" />
                    Taxa de Conversão (%)
                  </Label>
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    value={formData.fake_conversion_rate}
                    onChange={(e) => setFormData({ ...formData, fake_conversion_rate: parseFloat(e.target.value) || 0 })}
                  />
                </div>

                <div className="space-y-2 flex items-end">
                  <div className="flex items-center space-x-2">
                    <Switch
                      checked={formData.is_active}
                      onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                    />
                    <Label>Ativo</Label>
                  </div>
                </div>
              </div>

              {/* Notes */}
              <div className="space-y-2">
                <Label>Observações (interno)</Label>
                <Textarea
                  placeholder="Notas internas sobre esta conta de marketing..."
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={3}
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                <X className="h-4 w-4 mr-2" />
                Cancelar
              </Button>
              <Button onClick={handleSubmit} disabled={saving}>
                {saving ? (
                  <LoadingSpinner size="sm" className="mr-2" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                {editingId ? "Atualizar" : "Criar"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Info Card */}
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="pt-4">
          <div className="flex gap-3">
            <Eye className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium">Como funciona?</p>
              <p className="text-sm text-muted-foreground mt-1">
                As métricas configuradas aqui serão exibidas no painel do afiliado selecionado, 
                sobrepondo os dados reais. Isso permite que afiliados gravem conteúdo mostrando 
                um painel ativo sem interferir nos dados reais da plataforma.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Metrics Table */}
      <Card>
        <CardHeader>
          <CardTitle>Contas de Marketing Ativas</CardTitle>
          <CardDescription>
            {metrics.length} conta(s) configurada(s)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {metrics.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Sparkles className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Nenhuma conta de marketing configurada</p>
              <p className="text-sm mt-1">Clique em "Nova Conta Marketing" para começar</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Afiliado</TableHead>
                    <TableHead className="text-right">Referidos</TableHead>
                    <TableHead className="text-right">Depósitos</TableHead>
                    <TableHead className="text-right">Comissão</TableHead>
                    <TableHead className="text-right">Conversão</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {metrics.map((metric) => (
                    <TableRow key={metric.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">
                            {metric.affiliate?.profiles?.full_name || "Sem nome"}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {metric.affiliate?.affiliate_code || "N/A"}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <span className="font-medium">{metric.fake_total_referrals}</span>
                        <span className="text-xs text-muted-foreground ml-1">
                          ({metric.fake_active_users} ativos)
                        </span>
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        R$ {formatCurrency(Number(metric.fake_total_deposits))}
                      </TableCell>
                      <TableCell className="text-right">
                        <div>
                          <p className="font-medium text-success">
                            R$ {formatCurrency(Number(metric.fake_total_commission))}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            R$ {formatCurrency(Number(metric.fake_pending_commission))} pendente
                          </p>
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {Number(metric.fake_conversion_rate).toFixed(1)}%
                      </TableCell>
                      <TableCell className="text-center">
                        <Switch
                          checked={metric.is_active}
                          onCheckedChange={() => toggleActive(metric.id, metric.is_active)}
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEdit(metric)}
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive hover:text-destructive"
                            onClick={() => handleDelete(metric.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
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
