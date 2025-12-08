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
import { RefreshCw, Zap } from "lucide-react";
import { Progress } from "@/components/ui/progress";
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
  const [isGeneratingAll, setIsGeneratingAll] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [currentGeneratingAsset, setCurrentGeneratingAsset] = useState("");
  const [showGenerateAllDialog, setShowGenerateAllDialog] = useState(false);

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
          count: 300
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

  const handleGenerateAllCandles = async () => {
    setShowGenerateAllDialog(false);
    setIsGeneratingAll(true);
    setGenerationProgress(0);
    
    const timeframes = ['10s', '30s', '1m', '5m'];
    const totalOperations = assets.length * timeframes.length;
    let completedOperations = 0;
    let successCount = 0;
    let errorCount = 0;
    
    try {
      for (const asset of assets) {
        for (const tf of timeframes) {
          setCurrentGeneratingAsset(`${asset.name} (${tf})`);
          
          try {
            const { error } = await supabase.functions.invoke('generate-candles', {
              body: {
                assetId: asset.id,
                timeframe: tf,
                count: 300
              }
            });
            
            if (error) {
              console.error(`Erro em ${asset.name} ${tf}:`, error);
              errorCount++;
            } else {
              successCount++;
            }
          } catch (err) {
            console.error(`Erro em ${asset.name} ${tf}:`, err);
            errorCount++;
          }
          
          completedOperations++;
          setGenerationProgress(Math.round((completedOperations / totalOperations) * 100));
          
          // Pequena pausa para não sobrecarregar
          await new Promise(resolve => setTimeout(resolve, 200));
        }
      }
      
      if (errorCount === 0) {
        toast.success(`Todos os candles gerados! ${successCount} operações concluídas.`);
      } else {
        toast.warning(`Geração concluída: ${successCount} sucesso, ${errorCount} erros.`);
      }
    } catch (error) {
      console.error('Erro geral:', error);
      toast.error('Erro durante a geração de candles');
    } finally {
      setIsGeneratingAll(false);
      setGenerationProgress(0);
      setCurrentGeneratingAsset("");
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
        <div className="flex gap-2">
          <Button 
            onClick={() => setShowGenerateAllDialog(true)}
            disabled={isGeneratingAll || assets.length === 0}
            variant="default"
            className="bg-amber-600 hover:bg-amber-700"
          >
            <Zap className={`w-4 h-4 mr-2 ${isGeneratingAll ? 'animate-pulse' : ''}`} />
            Gerar Todos os Candles
          </Button>
          <Button variant="outline" onClick={() => navigate('/admin')}>
            Voltar ao Admin
          </Button>
        </div>
      </div>

      {/* Progress Bar for Generate All */}
      {isGeneratingAll && (
        <Card className="p-4 border-amber-500/50 bg-amber-500/10">
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Gerando candles para todos os ativos...</span>
              <span className="text-sm text-muted-foreground">{generationProgress}%</span>
            </div>
            <Progress value={generationProgress} className="h-2" />
            <p className="text-xs text-muted-foreground">
              Processando: {currentGeneratingAsset}
            </p>
          </div>
        </Card>
      )}

      {/* Generate All Confirmation Dialog */}
      <AlertDialog open={showGenerateAllDialog} onOpenChange={setShowGenerateAllDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Gerar Candles para Todos os Ativos</AlertDialogTitle>
            <AlertDialogDescription>
              Você tem certeza que deseja gerar 300 candles para <strong>todos os {assets.length} ativos</strong> em todos os 4 timeframes (10s, 30s, 1m, 5m)?
              <br /><br />
              <span className="text-muted-foreground">
                Total de operações: {assets.length * 4} gerações
              </span>
              <br /><br />
              <span className="text-amber-500 font-medium">
                Esta operação pode levar alguns minutos.
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleGenerateAllCandles} className="bg-amber-600 hover:bg-amber-700">
              Confirmar e Gerar Todos
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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