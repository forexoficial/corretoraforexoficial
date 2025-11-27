import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { RefreshCw, CheckCircle, XCircle, AlertCircle } from "lucide-react";
import { toast } from "sonner";

interface RecoveryResult {
  transaction_id: string;
  status: string;
  new_status?: string;
  pixup_id?: string;
  balance_updated?: boolean;
  message?: string;
  error?: string;
}

interface RecoveryResponse {
  success: boolean;
  message: string;
  total_pending: number;
  updated: number;
  recovered_and_credited: number;
  results: RecoveryResult[];
}

export default function AdminTransactionRecovery() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<RecoveryResponse | null>(null);

  const handleRecovery = async () => {
    setLoading(true);
    setResult(null);

    try {
      const { data, error } = await supabase.functions.invoke('recover-pending-transactions', {
        body: {}
      });

      if (error) {
        console.error('Recovery error:', error);
        toast.error('Erro ao executar recuperação: ' + error.message);
        return;
      }

      console.log('Recovery result:', data);
      setResult(data);

      if (data.success) {
        toast.success(`Recuperação concluída: ${data.recovered_and_credited} transações creditadas`);
      } else {
        toast.error(data.message || 'Erro na recuperação');
      }
    } catch (error: any) {
      console.error('Recovery error:', error);
      toast.error('Erro ao executar recuperação');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-6">
      <Card>
        <CardHeader>
          <CardTitle>Recuperação de Transações Pendentes</CardTitle>
          <CardDescription>
            Esta ferramenta busca transações de depósito pendentes e verifica o status no gateway de pagamento.
            Se algum pagamento foi aprovado mas não processado, o saldo será creditado automaticamente.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Esta operação verifica todas as transações pendentes sem referência de gateway e tenta
              buscar o status atual no PixUP. Pode levar alguns segundos para processar.
            </AlertDescription>
          </Alert>

          <Button 
            onClick={handleRecovery} 
            disabled={loading}
            size="lg"
            className="w-full"
          >
            {loading ? (
              <>
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                Processando...
              </>
            ) : (
              <>
                <RefreshCw className="mr-2 h-4 w-4" />
                Executar Recuperação
              </>
            )}
          </Button>

          {result && (
            <div className="mt-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-2xl font-bold">{result.total_pending}</div>
                    <p className="text-sm text-muted-foreground">Transações Pendentes</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-2xl font-bold">{result.updated}</div>
                    <p className="text-sm text-muted-foreground">Atualizadas</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-2xl font-bold text-green-600">{result.recovered_and_credited}</div>
                    <p className="text-sm text-muted-foreground">Creditadas</p>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Detalhes</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {result.results.map((item, index) => (
                      <div 
                        key={index}
                        className="flex items-start justify-between p-3 border rounded-lg"
                      >
                        <div className="flex-1">
                          <div className="font-mono text-sm text-muted-foreground">
                            {item.transaction_id}
                          </div>
                          {item.pixup_id && (
                            <div className="text-sm text-muted-foreground mt-1">
                              PixUP ID: {item.pixup_id}
                            </div>
                          )}
                          {item.message && (
                            <div className="text-sm mt-1">{item.message}</div>
                          )}
                          {item.error && (
                            <div className="text-sm text-destructive mt-1">{item.error}</div>
                          )}
                        </div>
                        <div className="ml-4">
                          {item.status === 'updated' && item.balance_updated ? (
                            <CheckCircle className="h-5 w-5 text-green-600" />
                          ) : item.status === 'updated' ? (
                            <CheckCircle className="h-5 w-5 text-blue-600" />
                          ) : item.status === 'not_found' ? (
                            <AlertCircle className="h-5 w-5 text-yellow-600" />
                          ) : (
                            <XCircle className="h-5 w-5 text-destructive" />
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
