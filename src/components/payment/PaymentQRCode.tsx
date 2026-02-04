import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { ArrowLeft, Copy, Clock, CheckCircle2, Check } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";
import { useTranslation } from "@/hooks/useTranslation";

interface PaymentQRCodeProps {
  qrCode: string;
  qrCodeBase64?: string;
  qrCodeImageUrl?: string;
  ticketUrl?: string;
  amount: number;
  expiresAt?: string;
  onBack: () => void;
}

export default function PaymentQRCode({ 
  qrCode, 
  qrCodeBase64,
  qrCodeImageUrl,
  ticketUrl,
  amount, 
  expiresAt,
  onBack 
}: PaymentQRCodeProps) {
  const { t } = useTranslation();
  const [isCopying, setIsCopying] = useState(false);
  const [copied, setCopied] = useState(false);

  const copyToClipboard = (text: string) => {
    setIsCopying(true);
    navigator.clipboard.writeText(text);
    
    // Simula animação de progresso
    setTimeout(() => {
      setIsCopying(false);
      setCopied(true);
      toast.success(t("toast_copied_success"), {
        description: "O código PIX foi copiado para sua área de transferência",
        duration: 3000,
      });
      
      // Reset do estado após 3 segundos
      setTimeout(() => {
        setCopied(false);
      }, 3000);
    }, 400);
  };

  const getExpirationTime = () => {
    if (!expiresAt) return null;
    const now = new Date();
    const expiration = new Date(expiresAt);
    const diff = expiration.getTime() - now.getTime();
    const minutes = Math.floor(diff / 60000);
    return minutes > 0 ? minutes : 0;
  };

  const expirationMinutes = getExpirationTime();

  return (
    <div className="w-full max-w-5xl mx-auto px-3 sm:px-4">
      <Card className="overflow-hidden border-2 border-primary/20 shadow-lg">
        <div className="flex flex-col-reverse lg:grid lg:grid-cols-[1fr,400px] gap-0">
          {/* Left Column - Information (Mobile: Below, Desktop: Left) */}
          <div className="p-4 sm:p-5 lg:p-8 space-y-3 sm:space-y-4 lg:space-y-6 bg-gradient-to-br from-muted/30 to-background">
            {/* Success Header */}
            <div className="space-y-1.5 sm:space-y-2">
              <div className="flex items-center gap-3">
                <div className="inline-flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-success/10 flex-shrink-0">
                  <CheckCircle2 className="w-5 h-5 sm:w-6 sm:h-6 text-success" />
                </div>
                <div>
                  <h2 className="text-lg sm:text-xl lg:text-2xl font-bold">Pagamento Criado</h2>
                  <p className="text-xs sm:text-sm text-muted-foreground">
                    Escaneie o QR Code ou use o PIX Copia e Cola
                  </p>
                </div>
              </div>
            </div>

            {/* Amount Display */}
            <div className="bg-card rounded-lg sm:rounded-xl p-3 sm:p-4 lg:p-5 border-2 border-primary/20">
              <div className="text-xs text-muted-foreground mb-1">Valor a pagar</div>
              <div className="text-2xl sm:text-3xl lg:text-4xl font-bold text-primary">
                R$ {amount.toFixed(2)}
              </div>
              {expirationMinutes !== null && expirationMinutes > 0 && (
                <div className="flex items-center gap-1.5 sm:gap-2 mt-2 sm:mt-3 text-xs sm:text-sm text-muted-foreground">
                  <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  Expira em {expirationMinutes} minutos
                </div>
              )}
            </div>

            {/* PIX Code Copy */}
            <div className="space-y-2">
              <Label className="text-xs sm:text-sm font-semibold">PIX Copia e Cola</Label>
              <div className="relative flex gap-2">
                <div className="relative flex-1">
                  <Input 
                    value={qrCode}
                    readOnly
                    className="font-mono text-[10px] sm:text-xs bg-background border-border h-9 sm:h-10 pr-10"
                  />
                  {/* Barra de Progresso de Cópia */}
                  {isCopying && (
                    <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-md">
                      <div className="h-full bg-gradient-to-r from-success/30 to-success/10 animate-slideRight" />
                    </div>
                  )}
                  {/* Indicador de Copiado */}
                  {copied && (
                    <div className="absolute right-2 top-1/2 -translate-y-1/2 bg-success text-success-foreground rounded-full p-1 animate-scale-in">
                      <Check className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                    </div>
                  )}
                </div>
                <Button
                  onClick={() => copyToClipboard(qrCode)}
                  size="sm"
                  className="shrink-0 h-9 sm:h-10 px-3 transition-all duration-200"
                  disabled={isCopying || copied}
                >
                  {copied ? (
                    <>
                      <Check className="h-3.5 w-3.5 sm:h-4 sm:w-4 sm:mr-1.5" />
                      <span className="hidden sm:inline">Copiado!</span>
                    </>
                  ) : isCopying ? (
                    <>
                      <Copy className="h-3.5 w-3.5 sm:h-4 sm:w-4 sm:mr-1.5 animate-pulse" />
                      <span className="hidden sm:inline">Copiando...</span>
                    </>
                  ) : (
                    <>
                      <Copy className="h-3.5 w-3.5 sm:h-4 sm:w-4 sm:mr-1.5" />
                      <span className="hidden sm:inline">Copiar</span>
                    </>
                  )}
                </Button>
              </div>
            </div>

            {/* Instructions */}
            <div className="bg-primary/10 dark:bg-primary/20 rounded-lg p-3 sm:p-4 border border-primary/20 dark:border-primary/30 space-y-2 sm:space-y-3">
              <h3 className="font-semibold text-xs sm:text-sm flex items-center gap-1.5 sm:gap-2">
                <span className="text-base sm:text-lg">📱</span> Como pagar
              </h3>
              <ol className="space-y-1.5 sm:space-y-2 text-xs sm:text-sm text-muted-foreground">
                <li className="flex items-start gap-2">
                  <span className="font-semibold text-primary shrink-0">1.</span>
                  <span>Abra o app do seu banco</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-semibold text-primary shrink-0">2.</span>
                  <span>Escolha <strong>PIX Copia e Cola</strong> ou <strong>Ler QR Code</strong></span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-semibold text-primary shrink-0">3.</span>
                  <span>Confirme o pagamento de <strong className="text-primary">R$ {amount.toFixed(2)}</strong></span>
                </li>
              </ol>
              <div className="pt-2 sm:pt-3 border-t border-blue-200/50 dark:border-blue-800/50">
                <p className="text-xs sm:text-sm text-success font-medium flex items-center gap-1.5 sm:gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  Crédito automático após confirmação
                </p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-2 pt-1 sm:pt-2">
              {ticketUrl && (
                <Button
                  onClick={() => window.open(ticketUrl, '_blank')}
                  variant="outline"
                  className="w-full h-9 sm:h-10 text-xs sm:text-sm"
                >
                  Abrir no Mercado Pago
                </Button>
              )}
              
              <Button
                variant="ghost"
                onClick={onBack}
                className="w-full h-9 sm:h-10 text-xs sm:text-sm"
              >
                <ArrowLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1.5 sm:mr-2" />
                Fazer outro depósito
              </Button>
            </div>
          </div>

          {/* Right Column - QR Code (Mobile: Above, Desktop: Right) */}
          <div className="bg-gradient-to-br from-primary/5 to-primary/10 p-4 sm:p-5 lg:p-8 flex flex-col items-center justify-center border-b lg:border-b-0 lg:border-l border-border">
            <div className="space-y-2.5 sm:space-y-3 lg:space-y-4 text-center">
              <div className="text-xs sm:text-sm font-medium text-muted-foreground">
                Escaneie para pagar
              </div>
              
              {/* QR Code Container */}
              <div className="bg-card p-3 sm:p-4 lg:p-5 rounded-xl sm:rounded-2xl shadow-xl inline-block border border-border">
                {qrCodeBase64 ? (
                  <img 
                    src={qrCodeBase64.startsWith('data:') ? qrCodeBase64 : `data:image/png;base64,${qrCodeBase64}`}
                    alt="QR Code PIX" 
                    className="w-44 h-44 sm:w-52 sm:h-52 lg:w-64 lg:h-64"
                  />
                ) : qrCodeImageUrl ? (
                  <img 
                    src={qrCodeImageUrl}
                    alt="QR Code PIX" 
                    className="w-44 h-44 sm:w-52 sm:h-52 lg:w-64 lg:h-64"
                  />
                ) : qrCode && qrCode.length > 0 ? (
                  <img 
                    src={`https://quickchart.io/qr?text=${encodeURIComponent(qrCode)}&size=300&margin=2`}
                    alt="QR Code PIX" 
                    className="w-44 h-44 sm:w-52 sm:h-52 lg:w-64 lg:h-64"
                    onError={(e) => {
                      // Fallback to another QR generator if first one fails
                      const target = e.target as HTMLImageElement;
                      if (!target.src.includes('qrserver')) {
                        target.src = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(qrCode)}`;
                      }
                    }}
                  />
                ) : (
                  <div className="w-44 h-44 sm:w-52 sm:h-52 lg:w-64 lg:h-64 flex items-center justify-center text-muted-foreground">
                    QR Code não disponível
                  </div>
                )}
              </div>

              <p className="text-[10px] sm:text-xs text-muted-foreground max-w-[240px] sm:max-w-[280px]">
                Use o app do seu banco para escanear este código
              </p>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
