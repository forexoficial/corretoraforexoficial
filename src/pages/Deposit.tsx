import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useTranslation } from "@/hooks/useTranslation";
import { ArrowLeft, Shield, Wallet, Zap, Info, BadgeCheck, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { TradingHeader } from "@/components/TradingHeader";
import { usePlatformSettings } from "@/hooks/usePlatformSettings";
import { usePayment } from "@/hooks/usePayment";
import PaymentQRCode from "@/components/payment/PaymentQRCode";
import pixIcon from "@/assets/pix.webp";
import secureIcon1 from "@/assets/secure-verified-1.webp";
import secureIcon2 from "@/assets/secure-verified-2.webp";
import secureIcon3 from "@/assets/secure-verified-3.webp";
import secureIcon4 from "@/assets/secure-verified-4.webp";
import secureIcon5 from "@/assets/secure-verified-5.webp";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { formatDocument, validateDocument, DocumentType } from "@/lib/validators";
import PaymentSuccess from "@/components/payment/PaymentSuccess";

export default function Deposit() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { settings } = usePlatformSettings();
  const { loading, paymentData, createPayment, resetPayment } = usePayment();
  
  const [amount, setAmount] = useState<string>("");
  const [document, setDocument] = useState<string>("");
  const [documentType, setDocumentType] = useState<DocumentType>("CPF");
  const [payerName, setPayerName] = useState<string>("");
  const [payerEmail, setPayerEmail] = useState<string>("");
  const [paymentCompleted, setPaymentCompleted] = useState(false);
  const [completedAmount, setCompletedAmount] = useState(0);
  const [newBalance, setNewBalance] = useState(0);

  const quickAmounts = [50, 100, 500, 1000];

  // Load user profile data
  useEffect(() => {
    loadUserProfile();
  }, []);

  // Monitor transaction status via realtime
  useEffect(() => {
    if (!paymentData?.transactionId) return;

    const setupRealtimeSubscription = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      console.log('[Deposit] Monitorando transação:', paymentData.transactionId);

      const channel = supabase
        .channel('transaction-status-changes')
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'transactions',
            filter: `id=eq.${paymentData.transactionId}`
          },
          async (payload) => {
            const transaction = payload.new as any;
            console.log('[Deposit] Status da transação atualizado:', {
              id: transaction.id,
              status: transaction.status,
              amount: transaction.amount
            });

            if (transaction.status === 'completed') {
              console.log('[Deposit] 💰 PAGAMENTO CONFIRMADO!');
              
              // Get updated balance
              const { data: profile } = await supabase
                .from('profiles')
                .select('balance')
                .eq('user_id', user.id)
                .single();

              if (profile) {
                setCompletedAmount(transaction.amount);
                setNewBalance(profile.balance);
                setPaymentCompleted(true);
                
                toast.success("Pagamento confirmado!", {
                  description: `R$ ${transaction.amount.toFixed(2)} foi creditado na sua conta`,
                });
              }
            }
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    };

    setupRealtimeSubscription();
  }, [paymentData]);

  const loadUserProfile = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (profile) {
      setPayerName(profile.full_name || "");
      setDocument(profile.document || "");
      if (profile.document_type) {
        setDocumentType(profile.document_type.toUpperCase() === 'CNPJ' ? 'CNPJ' : 'CPF');
      }
    }

    // Get email from auth user
    setPayerEmail(user.email || "");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const numAmount = parseFloat(amount);
    
    if (!numAmount || numAmount < settings.min_deposit) {
      toast.error(`Valor mínimo de depósito é R$ ${settings.min_deposit.toFixed(2)}`);
      return;
    }

    if (!document || !validateDocument(document, documentType)) {
      toast.error(`Por favor, insira um ${documentType} válido`);
      return;
    }

    if (!payerName || payerName.trim().length < 3) {
      toast.error("Por favor, insira seu nome completo");
      return;
    }

    await createPayment(
      numAmount,
      payerName.trim(),
      document.replace(/\D/g, ""),
      payerEmail || undefined
    );
  };

  const handleDocumentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatDocument(e.target.value, documentType);
    setDocument(formatted);
  };

  const handleBackToDeposit = () => {
    setPaymentCompleted(false);
    resetPayment();
  };

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-background">
      {!paymentData && <TradingHeader />}
      
      {/* Header Navigation */}
      {!paymentData && (
        <div className="border-b border-border bg-card flex-shrink-0">
          <div className="container mx-auto px-3 sm:px-4">
            <Tabs defaultValue="deposit" className="w-full">
              <TabsList className="w-full justify-start h-auto bg-transparent rounded-none border-none p-0 gap-3 sm:gap-6 overflow-x-auto">
                <TabsTrigger 
                  value="deposit" 
                  className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none bg-transparent px-0 pb-2 text-xs sm:text-sm whitespace-nowrap"
                >
                  {t("deposit", "Depósito")}
                </TabsTrigger>
                <TabsTrigger 
                  value="withdrawal"
                  className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none bg-transparent px-0 pb-2 text-xs sm:text-sm whitespace-nowrap"
                  onClick={() => navigate('/withdrawal')}
                >
                  {t("withdrawal", "Retirada")}
                </TabsTrigger>
                <TabsTrigger 
                  value="transactions"
                  className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none bg-transparent px-0 pb-2 text-xs sm:text-sm whitespace-nowrap"
                  onClick={() => navigate('/transactions')}
                >
                  {t("transactions", "Transações")}
                </TabsTrigger>
                <TabsTrigger 
                  value="profile"
                  className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none bg-transparent px-0 pb-2 text-xs sm:text-sm whitespace-nowrap"
                  onClick={() => navigate('/profile')}
                >
                  {t("profile", "Perfil")}
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto">
        {paymentCompleted ? (
          <div className="container mx-auto py-6 lg:py-10 flex items-center justify-center min-h-full">
            <PaymentSuccess
              amount={completedAmount}
              newBalance={newBalance}
              transactionId={paymentData?.transactionId || ""}
            />
          </div>
        ) : paymentData ? (
          <div className="container mx-auto py-6 lg:py-10 flex items-center justify-center min-h-full">
            <PaymentQRCode
              qrCode={paymentData.qrCode || ""}
              qrCodeBase64={paymentData.qrCodeBase64}
              ticketUrl={paymentData.ticketUrl}
              amount={paymentData.amount}
              expiresAt={paymentData.expiresAt}
              onBack={handleBackToDeposit}
            />
          </div>
        ) : (
        <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-6 max-w-6xl">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
            {/* Payment Method Column */}
            <div className="lg:col-span-1 space-y-3 sm:space-y-4">
              <div className="bg-card rounded-lg p-4 sm:p-5 border border-border">
                <div className="flex items-center gap-2 mb-3">
                  <BadgeCheck className="w-4 h-4 text-primary" />
                  <h3 className="text-xs sm:text-sm font-medium">{t("payment_method_label", "Método de pagamento:")}</h3>
                </div>
                <div className="bg-gradient-to-br from-primary/10 to-primary/5 border-2 border-primary/50 rounded-lg p-3 sm:p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-14 h-14 sm:w-16 sm:h-16 flex items-center justify-center flex-shrink-0 bg-card rounded-lg border border-border">
                      <img 
                        src={pixIcon} 
                        alt="PIX" 
                        className="w-full h-full object-contain p-1" 
                      />
                    </div>
                    <div className="space-y-1 text-xs sm:text-sm flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="text-muted-foreground">{t("minimum", "Mínimo:")} </span>
                        <span className="font-bold text-primary">
                          R$ {settings.min_deposit.toFixed(2)}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-muted-foreground">{t("maximum", "Máximo:")}</span>
                        <span className="font-bold text-primary">R$ 50.000</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Quick Info Cards */}
              <div className="grid grid-cols-2 gap-2 sm:gap-3">
                <div className="bg-card rounded-lg p-3 border border-border">
                  <div className="flex items-center gap-2 mb-1.5">
                    <Shield className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-success" />
                    <span className="text-[10px] sm:text-xs font-medium">{t("secure", "Seguro")}</span>
                  </div>
                  <p className="text-[9px] sm:text-[10px] text-muted-foreground">{t("protected_transactions", "Transações protegidas")}</p>
                </div>
                <div className="bg-card rounded-lg p-3 border border-border">
                  <div className="flex items-center gap-2 mb-1.5">
                    <Zap className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-primary" />
                    <span className="text-[10px] sm:text-xs font-medium">{t("fast", "Rápido")}</span>
                  </div>
                  <p className="text-[9px] sm:text-[10px] text-muted-foreground">{t("instant_credit", "Crédito instantâneo")}</p>
                </div>
              </div>
            </div>

            {/* Payment Form Column */}
            <div className="lg:col-span-2">
              <Card className="p-6">
                <h3 className="text-lg font-semibold mb-4">{t("payment_data", "Dados do Pagamento")}</h3>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="amount">{t("value", "Valor")} (R$)</Label>
                    <Input
                      id="amount"
                      type="number"
                      step="0.01"
                      min={settings.min_deposit}
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder="0.00"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-4 gap-2">
                    {quickAmounts.map((quickAmount) => (
                      <Button
                        key={quickAmount}
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setAmount(quickAmount.toString())}
                      >
                        {quickAmount}
                      </Button>
                    ))}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="name">{t("full_name_label", "Nome Completo")}</Label>
                    <Input
                      id="name"
                      value={payerName}
                      onChange={(e) => setPayerName(e.target.value)}
                      placeholder={t("your_full_name", "Seu nome completo")}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex gap-2 mb-2">
                      <Button
                        type="button"
                        variant={documentType === "CPF" ? "default" : "outline"}
                        size="sm"
                        onClick={() => {
                          setDocumentType("CPF");
                          setDocument("");
                        }}
                      >
                        CPF
                      </Button>
                      <Button
                        type="button"
                        variant={documentType === "CNPJ" ? "default" : "outline"}
                        size="sm"
                        onClick={() => {
                          setDocumentType("CNPJ");
                          setDocument("");
                        }}
                      >
                        CNPJ
                      </Button>
                    </div>
                    <Label htmlFor="document">{documentType}</Label>
                    <Input
                      id="document"
                      type="text"
                      value={document}
                      onChange={handleDocumentChange}
                      placeholder={documentType === "CPF" ? "000.000.000-00" : "00.000.000/0000-00"}
                      maxLength={documentType === "CPF" ? 14 : 18}
                      required
                    />
                  </div>

                  <Button
                    type="submit"
                    className="w-full"
                    size="lg"
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                        {t("processing_payment", "Processando...")}
                      </>
                    ) : (
                      t("generate_qr_code", "Gerar QR Code PIX")
                    )}
                  </Button>
                </form>
              </Card>
            </div>
          </div>

          {/* Footer Information */}
          <div className="mt-4 sm:mt-6 bg-card rounded-lg p-4 sm:p-5 border border-border space-y-4">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              <div className="flex items-start gap-2 sm:gap-3">
                <div className="flex-shrink-0">
                  <Shield className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
                </div>
                <div className="text-xs sm:text-sm min-w-0">
                  <div className="text-muted-foreground text-[10px] sm:text-xs">{t("min_deposit_label", "Depósito mínimo:")}</div>
                  <div className="font-semibold truncate">R$ {settings.min_deposit.toFixed(2)}</div>
                </div>
              </div>
              <div className="flex items-start gap-2 sm:gap-3">
                <div className="flex-shrink-0">
                  <Wallet className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
                </div>
                <div className="text-xs sm:text-sm min-w-0">
                  <div className="text-muted-foreground text-[10px] sm:text-xs">{t("min_withdrawal_label", "Saque mínimo:")}</div>
                  <div className="font-semibold truncate">R$ {settings.min_withdrawal.toFixed(2)}</div>
                </div>
              </div>
              <div className="flex items-start gap-2 sm:gap-3">
                <div className="flex-shrink-0">
                  <Zap className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
                </div>
                <div className="text-xs sm:text-sm min-w-0">
                  <div className="font-semibold text-[10px] sm:text-xs">{t("instant_credit", "Crédito instantâneo")}</div>
                  <div className="text-muted-foreground text-[10px] sm:text-xs">{t("instant_credit_after", "após pagamento")}</div>
                </div>
              </div>
              <div className="flex items-start gap-2 sm:gap-3">
                <div className="flex-shrink-0">
                  <Info className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
                </div>
                <div className="text-xs sm:text-sm min-w-0">
                  <div className="font-semibold text-[10px] sm:text-xs">
                    {settings.deposit_fee > 0 ? `${settings.deposit_fee}% ${t("commission_on_deposits", "de taxa")}` : t("no_commission", "Sem comissão")}
                  </div>
                  <div className="text-muted-foreground text-[10px] sm:text-xs">{t("commission_on_deposits", "em depósitos")}</div>
                </div>
              </div>
            </div>

            {/* Security Badges */}
            <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4 lg:gap-6 pt-3 sm:pt-4 border-t border-border">
              <img src={secureIcon1} alt="Verified by Visa" className="h-6 sm:h-7 lg:h-8 opacity-60" />
              <img src={secureIcon2} alt="3D Secure" className="h-6 sm:h-7 lg:h-8 opacity-60" />
              <img src={secureIcon3} alt="Secure Payment" className="h-6 sm:h-7 lg:h-8 opacity-60" />
              <img src={secureIcon4} alt="MasterCard SecureCode" className="h-6 sm:h-7 lg:h-8 opacity-60" />
              <img src={secureIcon5} alt="SSL Encryption" className="h-6 sm:h-7 lg:h-8 opacity-60" />
            </div>
          </div>

          {/* Back to Trading Button */}
          <div className="mt-4 sm:mt-6 text-center pb-4">
            <Button
              variant="outline"
              onClick={() => navigate('/')}
              className="gap-2 text-xs sm:text-sm"
              size="sm"
            >
              <ArrowLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              Voltar para Trading
            </Button>
          </div>
        </div>
        )}
      </div>
    </div>
  );
}
