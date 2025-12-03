import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useTranslation } from "@/hooks/useTranslation";
import { ArrowLeft, Shield, Wallet, Zap, Info, BadgeCheck, Loader2, CreditCard, Globe } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { TradingHeader } from "@/components/TradingHeader";
import { usePlatformSettings } from "@/hooks/usePlatformSettings";
import { usePayment } from "@/hooks/usePayment";
import PaymentQRCode from "@/components/payment/PaymentQRCode";
import { StripeCheckout } from "@/components/payment/StripeCheckout";
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

type PaymentMethodType = "pix" | "stripe";

export default function Deposit() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { settings } = usePlatformSettings();
  const { loading, paymentData, createPayment, resetPayment } = usePayment();
  
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethodType>("stripe");
  const [amount, setAmount] = useState<string>("");
  const [document, setDocument] = useState<string>("");
  const [documentType, setDocumentType] = useState<DocumentType>("CPF");
  const [payerName, setPayerName] = useState<string>("");
  const [payerEmail, setPayerEmail] = useState<string>("");
  const [paymentCompleted, setPaymentCompleted] = useState(false);
  const [completedAmount, setCompletedAmount] = useState(0);
  const [newBalance, setNewBalance] = useState(0);
  const [showStripeCheckout, setShowStripeCheckout] = useState(false);
  const [stripeAmount, setStripeAmount] = useState(0);
  const [hasStripeGateway, setHasStripeGateway] = useState(false);

  const quickAmounts = [50, 100, 500, 1000];
  const stripeQuickAmounts = [10, 50, 100, 500];

  // Check payment status from URL
  useEffect(() => {
    const status = searchParams.get("payment_status");
    if (status === "success") {
      toast.success(t("payment_success") || "Payment successful!");
      setPaymentCompleted(true);
    }
  }, [searchParams]);

  // Check if Stripe gateway is configured
  useEffect(() => {
    const checkStripeGateway = async () => {
      const { data } = await supabase
        .from("payment_gateways")
        .select("*")
        .eq("type", "worldwide")
        .eq("is_active", true)
        .single();
      
      setHasStripeGateway(!!data);
    };
    checkStripeGateway();
  }, []);

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

  const handlePixSubmit = async (e: React.FormEvent) => {
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

  const handleStripeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const numAmount = parseFloat(amount);
    
    if (!numAmount || numAmount < 1) {
      toast.error("Minimum deposit is $1.00");
      return;
    }

    setStripeAmount(numAmount);
    setShowStripeCheckout(true);
  };

  const handleDocumentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatDocument(e.target.value, documentType);
    setDocument(formatted);
  };

  const handleBackToDeposit = () => {
    setPaymentCompleted(false);
    setShowStripeCheckout(false);
    resetPayment();
  };

  const handleStripeSuccess = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('balance')
        .eq('user_id', user.id)
        .single();
      
      if (profile) {
        setNewBalance(profile.balance);
      }
    }
    setCompletedAmount(stripeAmount);
    setPaymentCompleted(true);
  };

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-background">
      {!paymentData && !showStripeCheckout && <TradingHeader />}
      
      {/* Header Navigation */}
      {!paymentData && !showStripeCheckout && (
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
              transactionId={paymentData?.transactionId || "stripe-payment"}
            />
          </div>
        ) : showStripeCheckout ? (
          <div className="container mx-auto py-6 lg:py-10 max-w-lg">
            <div className="mb-6">
              <Button
                variant="ghost"
                onClick={handleBackToDeposit}
                className="gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                {t("back") || "Back"}
              </Button>
            </div>
            <Card className="p-6">
              <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
                <CreditCard className="w-5 h-5" />
                {t("secure_payment") || "Secure Payment"}
              </h2>
              <StripeCheckout
                amount={stripeAmount}
                onSuccess={handleStripeSuccess}
                onCancel={handleBackToDeposit}
              />
            </Card>
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
                
                {/* Payment Method Tabs */}
                <div className="space-y-3">
                  <button
                    onClick={() => setPaymentMethod("stripe")}
                    className={`w-full rounded-lg p-3 sm:p-4 border-2 transition-all ${
                      paymentMethod === "stripe"
                        ? "border-primary bg-primary/10"
                        : "border-border hover:border-muted-foreground/50"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 sm:w-14 sm:h-14 flex items-center justify-center flex-shrink-0 bg-card rounded-lg border border-border">
                        <CreditCard className="w-6 h-6 text-primary" />
                      </div>
                      <div className="text-left flex-1">
                        <div className="font-semibold text-sm flex items-center gap-2">
                          <Globe className="w-4 h-4" />
                          {t("international_payment") || "International"}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Card, Apple Pay, Google Pay
                        </div>
                      </div>
                    </div>
                  </button>

                  <button
                    onClick={() => setPaymentMethod("pix")}
                    className={`w-full rounded-lg p-3 sm:p-4 border-2 transition-all ${
                      paymentMethod === "pix"
                        ? "border-primary bg-primary/10"
                        : "border-border hover:border-muted-foreground/50"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 sm:w-14 sm:h-14 flex items-center justify-center flex-shrink-0 bg-card rounded-lg border border-border">
                        <img 
                          src={pixIcon} 
                          alt="PIX" 
                          className="w-full h-full object-contain p-1" 
                        />
                      </div>
                      <div className="text-left flex-1">
                        <div className="font-semibold text-sm">PIX (Brasil)</div>
                        <div className="text-xs text-muted-foreground">
                          {t("instant_payment") || "Instant payment"}
                        </div>
                      </div>
                    </div>
                  </button>
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
              {paymentMethod === "stripe" ? (
                <Card className="p-6">
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <CreditCard className="w-5 h-5" />
                    {t("international_deposit") || "International Deposit"}
                  </h3>
                  <form onSubmit={handleStripeSubmit} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="stripe-amount">{t("value", "Valor")} (USD)</Label>
                      <Input
                        id="stripe-amount"
                        type="number"
                        step="0.01"
                        min={1}
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        placeholder="0.00"
                        required
                      />
                    </div>

                    <div className="grid grid-cols-4 gap-2">
                      {stripeQuickAmounts.map((quickAmount) => (
                        <Button
                          key={quickAmount}
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setAmount(quickAmount.toString())}
                        >
                          ${quickAmount}
                        </Button>
                      ))}
                    </div>

                    <div className="bg-muted/30 rounded-lg p-4 space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">{t("payment_methods") || "Payment Methods"}:</span>
                        <span>Card, Apple Pay, Google Pay, etc.</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">{t("currency") || "Currency"}:</span>
                        <span className="font-medium">USD (US Dollar)</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">{t("minimum") || "Minimum"}:</span>
                        <span className="font-medium text-primary">$1.00</span>
                      </div>
                    </div>

                    <Button
                      type="submit"
                      className="w-full"
                      size="lg"
                    >
                      {t("continue_to_payment") || "Continue to Payment"}
                    </Button>
                  </form>
                </Card>
              ) : (
                <Card className="p-6">
                  <h3 className="text-lg font-semibold mb-4">{t("payment_data", "Dados do Pagamento")}</h3>
                  <form onSubmit={handlePixSubmit} className="space-y-4">
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
              )}
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
                  <div className="font-semibold truncate">
                    {paymentMethod === "stripe" ? "$1.00" : `R$ ${settings.min_deposit.toFixed(2)}`}
                  </div>
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
                  <div className="font-semibold text-[10px] sm:text-xs">{t("secure_payment", "Pagamento seguro")}</div>
                  <div className="text-muted-foreground text-[10px] sm:text-xs">{t("encrypted", "Criptografado")}</div>
                </div>
              </div>
            </div>
            
            {/* Security Badges */}
            <div className="flex items-center justify-center gap-2 sm:gap-4 opacity-60">
              <img src={secureIcon1} alt="Secure" className="h-6 sm:h-8" />
              <img src={secureIcon2} alt="Verified" className="h-6 sm:h-8" />
              <img src={secureIcon3} alt="Protected" className="h-6 sm:h-8" />
              <img src={secureIcon4} alt="Safe" className="h-6 sm:h-8" />
              <img src={secureIcon5} alt="Encrypted" className="h-6 sm:h-8" />
            </div>
          </div>
        </div>
        )}
      </div>
    </div>
  );
}
