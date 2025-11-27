import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TradingViewChart } from "@/components/TradingViewChart";
import { ChartManipulation } from "@/components/admin/charts/ChartManipulation";
import { ChartBiasManager } from "@/components/admin/charts/ChartBiasManager";
import { ActiveTradesMonitor } from "@/components/admin/charts/ActiveTradesMonitor";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { RefreshCw } from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function AdminCharts() {
  const navigate = useNavigate();
  const [assets, setAssets] = useState<any[]>([]);
  const [selectedAsset, setSelectedAsset] = useState<any>(null);
  const [timeframe, setTimeframe] = useState("1m");
  const [isGenerating, setIsGenerating] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  useEffect(() => {
    fetchAssets();
  }, []);

  const fetchAssets = async () => {
    const { data, error } = await supabase
      .from('assets')
      .select('*')
      .eq('is_active', true)
      .order('name');

    if (error) {
      toast.error("Erro ao carregar ativos");
      return;
    }

    setAssets(data || []);
    if (data && data.length > 0 && !selectedAsset) {
      setSelectedAsset(data[0]);
    }
  };

  const handleGenerateCandles = async () => {
    if (!selectedAsset) {
      toast.error("Selecione um ativo");
      return;
    }

    setShowConfirmDialog(false);
    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-candles', {
        body: {
          assetId: selectedAsset.id,
          timeframe,
          count: 200
        }
      });

      if (error) throw error;

      toast.success(`${data.count} candles gerados com sucesso!`);
    } catch (error) {
      console.error(error);
      toast.error("Erro ao gerar candles");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleToggleAutoGenerate = async (checked: boolean) => {
    if (!selectedAsset) return;

    try {
      const { error } = await supabase
        .from('assets')
        .update({ auto_generate_candles: checked })
        .eq('id', selectedAsset.id);

      if (error) throw error;

      setSelectedAsset({ ...selectedAsset, auto_generate_candles: checked });
      toast.success(
        checked 
          ? "Geração automática de candles ativada" 
          : "Geração automática de candles desativada"
      );
    } catch (error) {
      console.error(error);
      toast.error("Erro ao atualizar configuração");
    }
  };

  return (
    <div className="flex-1 p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Controle de Gráficos</h1>
          <p className="text-muted-foreground">Gerencie e manipule os gráficos OTC</p>
        </div>
        <Button onClick={() => navigate('/admin')}>
          Voltar ao Admin
        </Button>
      </div>

      {/* Asset and Timeframe Selector */}
      <Card className="p-4">
        <div className="flex gap-4 items-end">
          <div className="flex-1">
            <label className="text-sm font-medium mb-2 block">Ativo</label>
            <Select 
              value={selectedAsset?.id} 
              onValueChange={(value) => {
                const asset = assets.find(a => a.id === value);
                setSelectedAsset(asset);
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione um ativo" />
              </SelectTrigger>
              <SelectContent>
                {assets.map((asset) => (
                  <SelectItem key={asset.id} value={asset.id}>
                    {asset.name} ({asset.symbol})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="w-32">
            <label className="text-sm font-medium mb-2 block">Timeframe</label>
            <Select value={timeframe} onValueChange={setTimeframe}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10s">10 Segundos</SelectItem>
                <SelectItem value="30s">30 Segundos</SelectItem>
                <SelectItem value="1m">1 Minuto</SelectItem>
                <SelectItem value="5m">5 Minutos</SelectItem>
                <SelectItem value="15m">15 Minutos</SelectItem>
                <SelectItem value="1h">1 Hora</SelectItem>
                <SelectItem value="4h">4 Horas</SelectItem>
                <SelectItem value="1d">1 Dia</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button 
            onClick={() => setShowConfirmDialog(true)}
            disabled={!selectedAsset || isGenerating}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isGenerating ? 'animate-spin' : ''}`} />
            Gerar Candles
          </Button>
        </div>

        {/* Confirmation Dialog */}
        <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirmar Geração de Candles</AlertDialogTitle>
              <AlertDialogDescription>
                Você tem certeza que deseja gerar novos candles para <strong>{selectedAsset?.name}</strong>?
                <br /><br />
                <span className="text-destructive font-medium">
                  Atenção: Esta ação irá alterar toda a estrutura do gráfico deste ativo.
                </span>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={handleGenerateCandles}>
                Confirmar e Gerar
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Auto-Generate Toggle */}
        {selectedAsset && (
          <div className="flex items-center gap-3 mt-4 pt-4 border-t border-border">
            <Switch
              id="auto-generate"
              checked={selectedAsset.auto_generate_candles ?? true}
              onCheckedChange={handleToggleAutoGenerate}
            />
            <Label htmlFor="auto-generate" className="cursor-pointer">
              <div className="font-medium">Gerar candles automaticamente</div>
              <div className="text-xs text-muted-foreground">
                Mantém o gráfico atualizando continuamente sem manipulações
              </div>
            </Label>
          </div>
        )}
      </Card>

      {/* Main Chart and Controls */}
      {selectedAsset && (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* Chart */}
          <Card className="xl:col-span-2 p-4">
            <h2 className="text-lg font-semibold mb-4">
              Gráfico: {selectedAsset.name}
            </h2>
            <TradingViewChart
              assetId={selectedAsset.id}
              assetName={selectedAsset.name}
              timeframe={timeframe}
              height={500}
            />
          </Card>

          {/* Active Trades Monitor */}
          <Card className="p-4">
            <ActiveTradesMonitor assetId={selectedAsset.id} />
          </Card>
        </div>
      )}

      {/* Manipulation Controls */}
      {selectedAsset && (
        <Tabs defaultValue="manipulation" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="manipulation">Manipulação Manual</TabsTrigger>
            <TabsTrigger value="bias">Sistema de Bias (Tendência)</TabsTrigger>
          </TabsList>

          <TabsContent value="manipulation" className="space-y-4">
            <ChartManipulation 
              assetId={selectedAsset.id}
              timeframe={timeframe}
            />
          </TabsContent>

          <TabsContent value="bias" className="space-y-4">
            <ChartBiasManager assetId={selectedAsset.id} />
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}