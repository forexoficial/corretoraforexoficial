import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Zap, Plus, Edit, Trash2, TrendingUp, Clock } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { formatCurrency } from "@/lib/utils";
import { useTranslation } from "@/hooks/useTranslation";

interface Booster {
  id: string;
  name: string;
  name_en?: string;
  name_es?: string;
  description: string;
  description_en?: string;
  description_es?: string;
  payout_increase_percentage: number;
  duration_minutes: number;
  price: number;
  icon: string;
  is_active: boolean;
  display_order: number;
  created_at: string;
}

const iconOptions = [
  { value: "Zap", label: "Raio" },
  { value: "TrendingUp", label: "Crescimento" },
  { value: "Rocket", label: "Foguete" },
  { value: "Flame", label: "Chama" },
  { value: "Star", label: "Estrela" },
];

export default function AdminBoosters() {
  const { t } = useTranslation();
  const [boosters, setBoosters] = useState<Booster[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingBooster, setEditingBooster] = useState<Booster | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    name_en: "",
    name_es: "",
    description: "",
    description_en: "",
    description_es: "",
    payout_increase_percentage: 5,
    duration_minutes: 30,
    price: 25,
    icon: "Zap",
    display_order: 0,
  });

  useEffect(() => {
    fetchBoosters();
  }, []);

  const fetchBoosters = async () => {
    try {
      const { data, error } = await supabase
        .from("boosters")
        .select("*")
        .order("display_order", { ascending: true });

      if (error) throw error;
      setBoosters(data || []);
    } catch (error) {
      console.error("Error fetching boosters:", error);
      toast.error(t("error_loading_boosters"));
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (editingBooster) {
        const { error } = await supabase
          .from("boosters")
          .update(formData)
          .eq("id", editingBooster.id);

        if (error) throw error;
        toast.success(t("admin_booster_updated"));
      } else {
        const { error } = await supabase
          .from("boosters")
          .insert(formData);

        if (error) throw error;
        toast.success(t("admin_booster_created"));
      }

      setDialogOpen(false);
      setEditingBooster(null);
      resetForm();
      fetchBoosters();
    } catch (error) {
      console.error("Error saving booster:", error);
      toast.error(t("admin_error_save_booster"));
    }
  };

  const handleEdit = (booster: Booster) => {
    setEditingBooster(booster);
    setFormData({
      name: booster.name,
      name_en: booster.name_en || "",
      name_es: booster.name_es || "",
      description: booster.description,
      description_en: booster.description_en || "",
      description_es: booster.description_es || "",
      payout_increase_percentage: booster.payout_increase_percentage,
      duration_minutes: booster.duration_minutes,
      price: booster.price,
      icon: booster.icon,
      display_order: booster.display_order,
    });
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm(t("admin_delete_booster_confirm"))) return;

    try {
      const { error } = await supabase
        .from("boosters")
        .delete()
        .eq("id", id);

      if (error) throw error;
      toast.success(t("admin_booster_deleted"));
      fetchBoosters();
    } catch (error) {
      console.error("Error deleting booster:", error);
      toast.error(t("admin_error_delete_booster"));
    }
  };

  const toggleBoosterStatus = async (id: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from("boosters")
        .update({ is_active: !currentStatus })
        .eq("id", id);

      if (error) throw error;
      toast.success(currentStatus ? t("admin_booster_deactivated") : t("admin_booster_activated"));
      fetchBoosters();
    } catch (error) {
      console.error("Error updating booster:", error);
      toast.error(t("admin_error_update_status"));
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      name_en: "",
      name_es: "",
      description: "",
      description_en: "",
      description_es: "",
      payout_increase_percentage: 5,
      duration_minutes: 30,
      price: 25,
      icon: "Zap",
      display_order: 0,
    });
  };

  const openCreateDialog = () => {
    setEditingBooster(null);
    resetForm();
    setDialogOpen(true);
  };

  if (loading) {
    return <LoadingSpinner size="lg" className="min-h-[400px]" />;
  }

  const stats = {
    totalBoosters: boosters.length,
    activeBoosters: boosters.filter(b => b.is_active).length,
    avgPrice: boosters.length > 0 ? boosters.reduce((sum, b) => sum + Number(b.price), 0) / boosters.length : 0,
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{t("admin_boosters_title")}</h1>
          <p className="text-muted-foreground">{t("admin_boosters_desc")}</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={openCreateDialog}>
              <Plus className="mr-2 h-4 w-4" />
              {t("admin_new_booster")}
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>
                {editingBooster ? t("admin_edit_booster") : t("admin_create_booster")}
              </DialogTitle>
              <DialogDescription>
                {t("admin_booster_config")}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <Tabs defaultValue="pt" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="pt">🇧🇷 PT</TabsTrigger>
                  <TabsTrigger value="en">🇺🇸 EN</TabsTrigger>
                  <TabsTrigger value="es">🇪🇸 ES</TabsTrigger>
                </TabsList>

                <TabsContent value="pt" className="space-y-4 mt-4">
                  <div className="space-y-2">
                    <Label>{t("admin_name_pt")}</Label>
                    <Input
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="Ex: Booster Pro"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>{t("admin_description_pt")}</Label>
                    <Textarea
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="Descreva os benefícios do booster"
                      rows={3}
                      required
                    />
                  </div>
                </TabsContent>

                <TabsContent value="en" className="space-y-4 mt-4">
                  <div className="space-y-2">
                    <Label>{t("admin_name_en")}</Label>
                    <Input
                      value={formData.name_en}
                      onChange={(e) => setFormData({ ...formData, name_en: e.target.value })}
                      placeholder="Ex: Pro Booster"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>{t("admin_description_en")}</Label>
                    <Textarea
                      value={formData.description_en}
                      onChange={(e) => setFormData({ ...formData, description_en: e.target.value })}
                      placeholder="Describe the booster benefits"
                      rows={3}
                    />
                  </div>
                </TabsContent>

                <TabsContent value="es" className="space-y-4 mt-4">
                  <div className="space-y-2">
                    <Label>{t("admin_name_es")}</Label>
                    <Input
                      value={formData.name_es}
                      onChange={(e) => setFormData({ ...formData, name_es: e.target.value })}
                      placeholder="Ej: Booster Pro"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>{t("admin_description_es")}</Label>
                    <Textarea
                      value={formData.description_es}
                      onChange={(e) => setFormData({ ...formData, description_es: e.target.value })}
                      placeholder="Describe los beneficios del booster"
                      rows={3}
                    />
                  </div>
                </TabsContent>
              </Tabs>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{t("admin_payout_increase")}</Label>
                  <Input
                    type="number"
                    value={formData.payout_increase_percentage}
                    onChange={(e) => setFormData({ ...formData, payout_increase_percentage: parseInt(e.target.value) })}
                    min="1"
                    max="100"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label>{t("admin_duration_minutes")}</Label>
                  <Input
                    type="number"
                    value={formData.duration_minutes}
                    onChange={(e) => setFormData({ ...formData, duration_minutes: parseInt(e.target.value) })}
                    min="1"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{t("admin_price")}</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) })}
                    min="0"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label>{t("admin_display_order")}</Label>
                  <Input
                    type="number"
                    value={formData.display_order}
                    onChange={(e) => setFormData({ ...formData, display_order: parseInt(e.target.value) })}
                    min="0"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>{t("admin_icon")}</Label>
                <Select
                  value={formData.icon}
                  onValueChange={(value) => setFormData({ ...formData, icon: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {iconOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  {t("cancel")}
                </Button>
                <Button type="submit">
                  {editingBooster ? t("admin_update") : t("admin_create")}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("admin_total_boosters")}</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalBoosters}</div>
            <p className="text-xs text-muted-foreground">
              {stats.activeBoosters} {t("admin_active_boosters")}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("admin_average_price")}</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">R$ {formatCurrency(stats.avgPrice)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("admin_average_duration")}</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {boosters.length > 0
                ? Math.round(boosters.reduce((sum, b) => sum + b.duration_minutes, 0) / boosters.length)
                : 0} min
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Boosters Table */}
      <Card>
        <CardHeader>
          <CardTitle>{t("admin_boosters_list")}</CardTitle>
          <CardDescription>
            {t("admin_all_boosters")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("name")}</TableHead>
                <TableHead>{t("admin_increase")}</TableHead>
                <TableHead>{t("admin_duration")}</TableHead>
                <TableHead>{t("admin_price")}</TableHead>
                <TableHead>{t("status")}</TableHead>
                <TableHead className="text-right">{t("admin_actions_column")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {boosters.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground">
                    {t("admin_no_boosters")}
                  </TableCell>
                </TableRow>
              ) : (
                boosters.map((booster) => (
                  <TableRow key={booster.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{booster.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {booster.description}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/20">
                        +{booster.payout_increase_percentage}%
                      </Badge>
                    </TableCell>
                    <TableCell>{booster.duration_minutes} min</TableCell>
                    <TableCell className="font-bold">
                      R$ {formatCurrency(booster.price)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={booster.is_active}
                          onCheckedChange={() => toggleBoosterStatus(booster.id, booster.is_active)}
                        />
                        <Badge variant={booster.is_active ? "default" : "secondary"}>
                          {booster.is_active ? t("admin_active") : t("admin_inactive")}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(booster)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(booster.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
