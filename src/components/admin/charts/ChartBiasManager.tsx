import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Trash2, Plus } from "lucide-react";

interface ChartBiasManagerProps {
  assetId: string;
}

export function ChartBiasManager({ assetId }: ChartBiasManagerProps) {
  const [biases, setBiases] = useState<any[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    direction: 'up' as 'up' | 'down' | 'neutral',
    strength: 50,
    startTime: '',
    endTime: ''
  });

  useEffect(() => {
    fetchBiases();
  }, [assetId]);

  const fetchBiases = async () => {
    const { data, error } = await supabase
      .from('chart_biases')
      .select('*')
      .eq('asset_id', assetId)
      .order('created_at', { ascending: false });

    if (error) {
      toast.error("Erro ao carregar biases");
      return;
    }

    setBiases(data || []);
  };

  const handleCreate = async () => {
    if (!formData.name || !formData.startTime || !formData.endTime) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast.error("Não autenticado");
      return;
    }

    setIsCreating(true);
    try {
      // Converter datetime-local para ISO string (já considera timezone do navegador)
      const startTimeUTC = new Date(formData.startTime).toISOString();
      const endTimeUTC = new Date(formData.endTime).toISOString();

      const { error } = await supabase
        .from('chart_biases')
        .insert({
          asset_id: assetId,
          name: formData.name,
          direction: formData.direction,
          strength: formData.strength,
          start_time: startTimeUTC,
          end_time: endTimeUTC,
          admin_id: user.id
        });

      if (error) throw error;

      toast.success("Bias criado com sucesso!");
      setFormData({
        name: '',
        direction: 'up',
        strength: 50,
        startTime: '',
        endTime: ''
      });
      fetchBiases();
    } catch (error) {
      console.error(error);
      toast.error("Erro ao criar bias");
    } finally {
      setIsCreating(false);
    }
  };

  const handleToggleActive = async (biasId: string, currentActive: boolean) => {
    const { error } = await supabase
      .from('chart_biases')
      .update({ is_active: !currentActive })
      .eq('id', biasId);

    if (error) {
      toast.error("Erro ao atualizar bias");
      return;
    }

    toast.success(currentActive ? "Bias desativado" : "Bias ativado");
    fetchBiases();
  };

  const handleDelete = async (biasId: string) => {
    if (!confirm("Tem certeza que deseja excluir este bias?")) return;

    const { error } = await supabase
      .from('chart_biases')
      .delete()
      .eq('id', biasId);

    if (error) {
      toast.error("Erro ao excluir bias");
      return;
    }

    toast.success("Bias excluído");
    fetchBiases();
  };

  return (
    <div className="space-y-6">
      {/* Create New Bias */}
      <Card className="p-4">
        <h3 className="text-lg font-semibold mb-4">Criar Novo Bias (Tendência Programada)</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label>Nome do Bias</Label>
            <Input
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Ex: Tendência de Alta Matinal"
            />
          </div>

          <div>
            <Label>Direção</Label>
            <div className="grid grid-cols-3 gap-2 mt-2">
              <Button
                variant={formData.direction === 'up' ? 'default' : 'outline'}
                onClick={() => setFormData({ ...formData, direction: 'up' })}
                size="sm"
              >
                ⬆️ Alta
              </Button>
              <Button
                variant={formData.direction === 'neutral' ? 'default' : 'outline'}
                onClick={() => setFormData({ ...formData, direction: 'neutral' })}
                size="sm"
              >
                ➡️ Neutro
              </Button>
              <Button
                variant={formData.direction === 'down' ? 'default' : 'outline'}
                onClick={() => setFormData({ ...formData, direction: 'down' })}
                size="sm"
              >
                ⬇️ Baixa
              </Button>
            </div>
          </div>

          <div>
            <Label>Força: {formData.strength}%</Label>
            <Input
              type="range"
              min="1"
              max="100"
              value={formData.strength}
              onChange={(e) => setFormData({ ...formData, strength: Number(e.target.value) })}
            />
          </div>

          <div className="md:col-span-2 grid grid-cols-2 gap-4">
            <div>
              <Label>Data/Hora Início (UTC-3 - São Paulo)</Label>
              <Input
                type="datetime-local"
                value={formData.startTime}
                onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
              />
            </div>
            <div>
              <Label>Data/Hora Fim (UTC-3 - São Paulo)</Label>
              <Input
                type="datetime-local"
                value={formData.endTime}
                onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
              />
            </div>
          </div>

          <div className="md:col-span-2">
            <Button onClick={handleCreate} disabled={isCreating} className="w-full">
              <Plus className="w-4 h-4 mr-2" />
              {isCreating ? "Criando..." : "Criar Bias"}
            </Button>
          </div>
        </div>
      </Card>

      {/* Active Biases List */}
      <Card className="p-4">
        <h3 className="text-lg font-semibold mb-4">Biases Configurados</h3>
        <div className="space-y-2">
          {biases.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">
              Nenhum bias configurado ainda
            </p>
          ) : (
            biases.map((bias) => (
              <div
                key={bias.id}
                className={`p-4 border rounded-lg ${
                  bias.is_active ? 'border-primary bg-primary/5' : 'border-border'
                }`}
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <h4 className="font-semibold">{bias.name}</h4>
                    <div className="flex gap-4 text-sm text-muted-foreground mt-1">
                      <span>
                        Direção: {bias.direction === 'up' ? '⬆️ Alta' : bias.direction === 'down' ? '⬇️ Baixa' : '➡️ Neutro'}
                      </span>
                      <span>Força: {bias.strength}%</span>
                    </div>
                    <div className="text-xs text-muted-foreground mt-2">
                      <div>Início: {new Date(bias.start_time).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}</div>
                      <div>Fim: {new Date(bias.end_time).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}</div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant={bias.is_active ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => handleToggleActive(bias.id, bias.is_active)}
                    >
                      {bias.is_active ? 'Ativo' : 'Inativo'}
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDelete(bias.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </Card>
    </div>
  );
}