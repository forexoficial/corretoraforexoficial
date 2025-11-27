import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { TrendingUp, TrendingDown, Calendar, Zap } from "lucide-react";

interface ChartManipulationProps {
  assetId: string;
  timeframe: string;
}

export function ChartManipulation({ assetId, timeframe }: ChartManipulationProps) {
  const [assets, setAssets] = useState<any[]>([]);
  
  // Scheduled manipulation state
  const [selectedAssetId, setSelectedAssetId] = useState(assetId);
  const [selectedTimeframe, setSelectedTimeframe] = useState(timeframe);
  const [selectedDateTime, setSelectedDateTime] = useState('');
  const [targetCandle, setTargetCandle] = useState<any>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [isManipulating, setIsManipulating] = useState(false);
  
  // Real-time manipulation state
  const [realtimeAssetId, setRealtimeAssetId] = useState(assetId);
  const [realtimeTimeframe, setRealtimeTimeframe] = useState(timeframe);
  const [currentCandle, setCurrentCandle] = useState<any>(null);
  const [isLoadingCurrent, setIsLoadingCurrent] = useState(false);
  const [isManipulatingRealtime, setIsManipulatingRealtime] = useState(false);

  useEffect(() => {
    fetchAssets();
  }, []);

  useEffect(() => {
    setSelectedAssetId(assetId);
    setSelectedTimeframe(timeframe);
    setRealtimeAssetId(assetId);
    setRealtimeTimeframe(timeframe);
  }, [assetId, timeframe]);

  useEffect(() => {
    if (realtimeAssetId && realtimeTimeframe) {
      fetchCurrentCandle();
    }
  }, [realtimeAssetId, realtimeTimeframe]);

  useEffect(() => {
    // Realtime subscription for current candle updates
    const channel = supabase
      .channel('realtime-candle-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'candles',
          filter: `asset_id=eq.${realtimeAssetId}`
        },
        () => {
          fetchCurrentCandle();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [realtimeAssetId, realtimeTimeframe]);

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
  };

  const handleSearchCandle = async () => {
    if (!selectedDateTime) {
      toast.error("Selecione data e hora");
      return;
    }

    setIsSearching(true);
    setTargetCandle(null);

    try {
      // Converter datetime-local para UTC
      const selectedDate = new Date(selectedDateTime);
      const utcTimestamp = selectedDate.toISOString();

      // Buscar candle exato ou mais próximo
      const { data, error } = await supabase
        .from('candles')
        .select('*')
        .eq('asset_id', selectedAssetId)
        .eq('timeframe', selectedTimeframe)
        .gte('timestamp', utcTimestamp)
        .order('timestamp', { ascending: true })
        .limit(1)
        .maybeSingle();

      if (error) throw error;

      if (!data) {
        toast.error("Nenhum candle encontrado para este horário");
        return;
      }

      setTargetCandle(data);
      toast.success("Candle encontrado!");
    } catch (error) {
      console.error(error);
      toast.error("Erro ao buscar candle");
    } finally {
      setIsSearching(false);
    }
  };

  const fetchCurrentCandle = async () => {
    setIsLoadingCurrent(true);
    try {
      const { data, error } = await supabase
        .from('candles')
        .select('*')
        .eq('asset_id', realtimeAssetId)
        .eq('timeframe', realtimeTimeframe)
        .order('timestamp', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setCurrentCandle(data);
      } else {
        toast.error("Nenhum candle encontrado para este ativo");
        setCurrentCandle(null);
      }
    } catch (error) {
      console.error(error);
      toast.error("Erro ao buscar candle atual");
    } finally {
      setIsLoadingCurrent(false);
    }
  };

  const handleManipulate = async (direction: 'up' | 'down') => {
    if (!targetCandle) {
      toast.error("Busque um candle primeiro");
      return;
    }

    setIsManipulating(true);

    try {
      const open = Number(targetCandle.open);
      const currentClose = Number(targetCandle.close);
      
      // Calcular novo close baseado na direção
      let newClose: number;
      const priceRange = Math.abs(Number(targetCandle.high) - Number(targetCandle.low));
      const adjustment = priceRange * 0.3; // 30% do range

      if (direction === 'up') {
        // Forçar fechamento ACIMA da abertura (verde)
        newClose = open + Math.abs(adjustment);
      } else {
        // Forçar fechamento ABAIXO da abertura (vermelho)
        newClose = open - Math.abs(adjustment);
      }

      // Ajustar high e low se necessário
      const newHigh = Math.max(Number(targetCandle.high), open, newClose);
      const newLow = Math.min(Number(targetCandle.low), open, newClose);

      const manipulatedValues = {
        open: open.toFixed(8),
        high: newHigh.toFixed(8),
        low: newLow.toFixed(8),
        close: newClose.toFixed(8)
      };

      const { error } = await supabase.functions.invoke('manipulate-candle', {
        body: {
          candleId: targetCandle.id,
          manipulationType: 'directional',
          manipulatedValues,
          notes: `Forçado para fechar em ${direction === 'up' ? 'ALTA (verde)' : 'BAIXA (vermelho)'}`
        }
      });

      if (error) throw error;

      toast.success(
        direction === 'up' 
          ? "Candle manipulado para ALTA (verde) ⬆️" 
          : "Candle manipulado para BAIXA (vermelho) ⬇️"
      );
      
      // Atualizar candle local
      setTargetCandle({
        ...targetCandle,
        ...manipulatedValues,
        is_manipulated: true
      });
    } catch (error) {
      console.error(error);
      toast.error("Erro ao manipular candle");
    } finally {
      setIsManipulating(false);
    }
  };

  const handleRealtimeManipulate = async (direction: 'up' | 'down') => {
    if (!currentCandle) {
      toast.error("Nenhum candle carregado");
      return;
    }

    setIsManipulatingRealtime(true);

    try {
      const open = Number(currentCandle.open);
      const priceRange = Math.abs(Number(currentCandle.high) - Number(currentCandle.low));
      const adjustment = priceRange * 0.3;

      let newClose: number;
      if (direction === 'up') {
        newClose = open + Math.abs(adjustment);
      } else {
        newClose = open - Math.abs(adjustment);
      }

      const newHigh = Math.max(Number(currentCandle.high), open, newClose);
      const newLow = Math.min(Number(currentCandle.low), open, newClose);

      const manipulatedValues = {
        open: open.toFixed(8),
        high: newHigh.toFixed(8),
        low: newLow.toFixed(8),
        close: newClose.toFixed(8)
      };

      const { error } = await supabase.functions.invoke('manipulate-candle', {
        body: {
          candleId: currentCandle.id,
          manipulationType: 'realtime',
          manipulatedValues,
          notes: `Manipulação em tempo real: ${direction === 'up' ? 'ALTA' : 'BAIXA'}`
        }
      });

      if (error) throw error;

      toast.success(
        direction === 'up' 
          ? "Candle manipulado em tempo real para ALTA ⬆️" 
          : "Candle manipulado em tempo real para BAIXA ⬇️"
      );

      // Refetch current candle
      await fetchCurrentCandle();
    } catch (error) {
      console.error(error);
      toast.error("Erro ao manipular candle");
    } finally {
      setIsManipulatingRealtime(false);
    }
  };

  return (
    <Card className="p-6">
      <Tabs defaultValue="scheduled" className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-6">
          <TabsTrigger value="scheduled" className="flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            Programada
          </TabsTrigger>
          <TabsTrigger value="realtime" className="flex items-center gap-2">
            <Zap className="w-4 h-4" />
            Tempo Real
          </TabsTrigger>
        </TabsList>

        {/* Scheduled Manipulation Tab */}
        <TabsContent value="scheduled" className="space-y-6">
          <div>
            <h3 className="text-xl font-bold flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Manipulação Programada
            </h3>
            <p className="text-sm text-muted-foreground mt-1">
              Escolha data/hora específica e force o candle a fechar em alta (verde) ou baixa (vermelho)
            </p>
          </div>

        {/* Selection Controls */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label>Ativo</Label>
            <Select value={selectedAssetId} onValueChange={setSelectedAssetId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o ativo" />
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

          <div>
            <Label>Timeframe</Label>
            <Select value={selectedTimeframe} onValueChange={setSelectedTimeframe}>
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

          <div className="md:col-span-2">
            <Label>Data e Hora do Candle (UTC-3 - São Paulo)</Label>
            <div className="flex gap-2 mt-2">
              <Input
                type="datetime-local"
                value={selectedDateTime}
                onChange={(e) => setSelectedDateTime(e.target.value)}
                className="flex-1"
              />
              <Button
                onClick={handleSearchCandle}
                disabled={isSearching || !selectedDateTime}
                variant="outline"
              >
                {isSearching ? "Buscando..." : "Buscar Candle"}
              </Button>
            </div>
          </div>
        </div>

        {/* Target Candle Display */}
        {targetCandle && (
          <Card className="p-4 bg-muted/30">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-semibold">Candle Encontrado</h4>
                {targetCandle.is_manipulated && (
                  <Badge variant="outline" className="text-warning">
                    ⚠️ Já Manipulado
                  </Badge>
                )}
              </div>
              
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-muted-foreground">Timestamp:</span>
                  <div className="font-mono text-xs mt-1">
                    {new Date(targetCandle.timestamp).toLocaleString('pt-BR', {
                      timeZone: 'America/Sao_Paulo',
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                      second: '2-digit'
                    })}
                  </div>
                </div>
                <div>
                  <span className="text-muted-foreground">Status Atual:</span>
                  <div className="mt-1">
                    {Number(targetCandle.close) >= Number(targetCandle.open) ? (
                      <Badge className="bg-success text-white">
                        ⬆️ Alta (Verde)
                      </Badge>
                    ) : (
                      <Badge className="bg-destructive text-white">
                        ⬇️ Baixa (Vermelho)
                      </Badge>
                    )}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-4 gap-2 text-xs font-mono">
                <div>
                  <span className="text-muted-foreground">Open:</span>
                  <div>{Number(targetCandle.open).toFixed(2)}</div>
                </div>
                <div>
                  <span className="text-muted-foreground">High:</span>
                  <div>{Number(targetCandle.high).toFixed(2)}</div>
                </div>
                <div>
                  <span className="text-muted-foreground">Low:</span>
                  <div>{Number(targetCandle.low).toFixed(2)}</div>
                </div>
                <div>
                  <span className="text-muted-foreground">Close:</span>
                  <div>{Number(targetCandle.close).toFixed(2)}</div>
                </div>
              </div>
            </div>
          </Card>
        )}

        {/* Action Buttons */}
        {targetCandle && (
          <div className="grid grid-cols-2 gap-4">
            <Button
              onClick={() => handleManipulate('up')}
              disabled={isManipulating}
              size="lg"
              className="h-20 bg-success hover:bg-success/90 text-white"
            >
              <div className="flex flex-col items-center gap-1">
                <TrendingUp className="w-6 h-6" />
                <span className="font-bold">Forçar ALTA</span>
                <span className="text-xs opacity-90">Candle Verde ⬆️</span>
              </div>
            </Button>

            <Button
              onClick={() => handleManipulate('down')}
              disabled={isManipulating}
              size="lg"
              className="h-20 bg-destructive hover:bg-destructive/90 text-white"
            >
              <div className="flex flex-col items-center gap-1">
                <TrendingDown className="w-6 h-6" />
                <span className="font-bold">Forçar BAIXA</span>
                <span className="text-xs opacity-90">Candle Vermelho ⬇️</span>
              </div>
            </Button>
          </div>
        )}

          {/* Instructions */}
          {!targetCandle && (
            <Card className="p-4 bg-primary/5 border-primary/20">
              <p className="text-sm text-muted-foreground">
                <strong>Como usar:</strong><br />
                1. Selecione o ativo e timeframe desejado<br />
                2. Escolha a data e hora específica do candle<br />
                3. Clique em "Buscar Candle" para localizar<br />
                4. Escolha se quer forçar o candle a fechar em ALTA (verde) ou BAIXA (vermelho)
              </p>
            </Card>
          )}
        </TabsContent>

        {/* Real-time Manipulation Tab */}
        <TabsContent value="realtime" className="space-y-6">
          <div>
            <h3 className="text-xl font-bold flex items-center gap-2">
              <Zap className="w-5 h-5" />
              Manipulação em Tempo Real
            </h3>
            <p className="text-sm text-muted-foreground mt-1">
              Visualize e manipule o candle atual em movimento
            </p>
          </div>

          {/* Real-time Controls */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Ativo</Label>
              <Select value={realtimeAssetId} onValueChange={setRealtimeAssetId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o ativo" />
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

            <div>
              <Label>Timeframe</Label>
              <Select value={realtimeTimeframe} onValueChange={setRealtimeTimeframe}>
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
          </div>

          {/* Current Candle Display */}
          {isLoadingCurrent ? (
            <Card className="p-8 text-center">
              <p className="text-muted-foreground">Carregando candle atual...</p>
            </Card>
          ) : currentCandle ? (
            <Card className="p-4 bg-muted/30">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold">Candle Atual em Movimento</h4>
                  {currentCandle.is_manipulated && (
                    <Badge variant="outline" className="text-warning">
                      ⚠️ Já Manipulado
                    </Badge>
                  )}
                </div>
                
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-muted-foreground">Timestamp:</span>
                    <div className="font-mono text-xs mt-1">
                      {new Date(currentCandle.timestamp).toLocaleString('pt-BR', {
                        timeZone: 'America/Sao_Paulo',
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit'
                      })}
                    </div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Status Atual:</span>
                    <div className="mt-1">
                      {Number(currentCandle.close) >= Number(currentCandle.open) ? (
                        <Badge className="bg-success text-white">
                          ⬆️ Alta (Verde)
                        </Badge>
                      ) : (
                        <Badge className="bg-destructive text-white">
                          ⬇️ Baixa (Vermelho)
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-4 gap-2 text-xs font-mono">
                  <div>
                    <span className="text-muted-foreground">Open:</span>
                    <div>{Number(currentCandle.open).toFixed(2)}</div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">High:</span>
                    <div>{Number(currentCandle.high).toFixed(2)}</div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Low:</span>
                    <div>{Number(currentCandle.low).toFixed(2)}</div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Close:</span>
                    <div>{Number(currentCandle.close).toFixed(2)}</div>
                  </div>
                </div>
              </div>
            </Card>
          ) : (
            <Card className="p-8 text-center">
              <p className="text-muted-foreground">Selecione um ativo para visualizar o candle atual</p>
            </Card>
          )}

          {/* Real-time Action Buttons */}
          {currentCandle && (
            <div className="grid grid-cols-2 gap-4">
              <Button
                onClick={() => handleRealtimeManipulate('up')}
                disabled={isManipulatingRealtime}
                size="lg"
                className="h-20 bg-success hover:bg-success/90 text-white"
              >
                <div className="flex flex-col items-center gap-1">
                  <TrendingUp className="w-6 h-6" />
                  <span className="font-bold">Forçar ALTA</span>
                  <span className="text-xs opacity-90">Agora ⬆️</span>
                </div>
              </Button>

              <Button
                onClick={() => handleRealtimeManipulate('down')}
                disabled={isManipulatingRealtime}
                size="lg"
                className="h-20 bg-destructive hover:bg-destructive/90 text-white"
              >
                <div className="flex flex-col items-center gap-1">
                  <TrendingDown className="w-6 h-6" />
                  <span className="font-bold">Forçar BAIXA</span>
                  <span className="text-xs opacity-90">Agora ⬇️</span>
                </div>
              </Button>
            </div>
          )}

          {/* Real-time Instructions */}
          {!currentCandle && !isLoadingCurrent && (
            <Card className="p-4 bg-primary/5 border-primary/20">
              <p className="text-sm text-muted-foreground">
                <strong>Como usar:</strong><br />
                1. Selecione o ativo e timeframe desejado<br />
                2. O sistema mostrará automaticamente o candle atual em movimento<br />
                3. Escolha se quer forçar o candle a subir ou descer AGORA<br />
                4. A manipulação será aplicada instantaneamente e você verá o resultado em tempo real
              </p>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </Card>
  );
}
