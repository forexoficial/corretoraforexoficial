import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { usePlatformSettings } from "@/hooks/usePlatformSettings";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import pixIcon from "@/assets/pix.webp";
import usdtIcon from "@/assets/usdt.webp";
import secureIcon1 from "@/assets/secure-verified-1.webp";
import secureIcon2 from "@/assets/secure-verified-2.webp";
import secureIcon3 from "@/assets/secure-verified-3.webp";
import secureIcon4 from "@/assets/secure-verified-4.webp";
import secureIcon5 from "@/assets/secure-verified-5.webp";

export default function Withdrawal() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { settings } = usePlatformSettings();
  const [accountType, setAccountType] = useState<"real" | "crypto" | "bonus">("real");
  const [withdrawalType, setWithdrawalType] = useState<"BRL" | "USDT">("BRL");
  const [keyType, setKeyType] = useState<"cpf" | "cnpj" | "phone" | "email" | "random">("cpf");
  const [pixKey, setPixKey] = useState<string>("");
  const [amount, setAmount] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [balances, setBalances] = useState<Record<"real" | "crypto" | "bonus", number>>({
    real: 0,
    crypto: 0,
    bonus: 0,
  });
  const [balanceLoading, setBalanceLoading] = useState(true);

  const quickAmounts = [150, 200, 300, 500];

  useEffect(() => {
    const loadBalance = async () => {
      try {
        const { data: { user: currentUser }, error: userError } = await supabase.auth.getUser();
        if (userError) {
          console.error("[Withdrawal] Error getting auth user:", userError);
          setBalanceLoading(false);
          return;
        }
        if (!currentUser) {
          console.warn("[Withdrawal] No authenticated user found.");
          setBalanceLoading(false);
          return;
        }

        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("balance")
          .eq("user_id", currentUser.id)
          .maybeSingle();

        if (profileError) {
          console.error("[Withdrawal] Error fetching profile balance:", profileError);
          setBalanceLoading(false);
          return;
        }

        if (profile?.balance != null) {
          const realBalance = Number(profile.balance) || 0;
          console.log("[Withdrawal] Loaded real balance:", realBalance, "for user", currentUser.id);
          setBalances(prev => ({
            ...prev,
            real: realBalance,
          }));
        } else {
          console.warn("[Withdrawal] Profile found but balance is null or undefined for user", currentUser.id);
        }
      } catch (err) {
        console.error("[Withdrawal] Unexpected error loading balance:", err);
      } finally {
        setBalanceLoading(false);
      }
    };

    loadBalance();
  }, []);

  const handleWithdrawal = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Check verification status
      const { data: profile } = await supabase
        .from("profiles")
        .select("verification_status, balance")
        .eq("user_id", user!.id)
        .single();

      if (profile?.verification_status !== "approved") {
        toast.error("Você precisa verificar sua identidade antes de fazer saques");
        navigate("/verify-identity");
        return;
      }

      if (!pixKey.trim()) {
        toast.error("Digite a chave PIX");
        return;
      }
      
      const withdrawalAmount = parseFloat(amount);
      
      if (!amount || withdrawalAmount < settings.min_withdrawal) {
        toast.error(`Valor mínimo de retirada é R$ ${settings.min_withdrawal.toFixed(2)}`);
        return;
      }
      if (withdrawalAmount > settings.max_withdrawal) {
        toast.error(`Valor máximo de retirada é R$ ${settings.max_withdrawal.toFixed(2)}`);
        return;
      }
      if (withdrawalAmount > balances[accountType]) {
        toast.error("Saldo insuficiente");
        return;
      }

      // Create withdrawal transaction
      const { error: transactionError } = await supabase
        .from("transactions")
        .insert({
          user_id: user!.id,
          type: "withdrawal",
          amount: withdrawalAmount,
          status: "pending",
          payment_method: withdrawalType === "BRL" ? "PIX" : "USDT",
          notes: `Chave ${keyTypeLabels[keyType]}: ${pixKey}`,
        });

      if (transactionError) {
        console.error("Error creating withdrawal transaction:", transactionError);
        toast.error("Erro ao processar saque. Tente novamente.");
        return;
      }

      // Deduct balance
      const newBalance = (profile?.balance || 0) - withdrawalAmount;
      const { error: updateError } = await supabase
        .from("profiles")
        .update({ balance: newBalance })
        .eq("user_id", user!.id);

      if (updateError) {
        console.error("Error updating balance:", updateError);
        toast.error("Erro ao atualizar saldo. Entre em contato com o suporte.");
        return;
      }

      toast.success("Solicitação de saque enviada com sucesso!");
      setAmount("");
      setPixKey("");
      
      // Navigate to transactions page
      setTimeout(() => {
        navigate("/transactions");
      }, 1500);
    } catch (error) {
      console.error("Error processing withdrawal:", error);
      toast.error("Erro ao processar saque. Tente novamente.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const keyTypeLabels = {
    cpf: "CPF",
    cnpj: "CNPJ",
    phone: "TELEFONE",
    email: "EMAIL",
    random: "Aleatória",
  };

  return (
    <div className="min-h-screen bg-background pb-16">
      {/* Header Navigation */}
      <div className="border-b border-border bg-card">
        <div className="container mx-auto px-4">
          <Tabs defaultValue="withdrawal" className="w-full">
            <TabsList className="w-full justify-start h-auto bg-transparent rounded-none border-none p-0 gap-6 overflow-x-auto">
              <TabsTrigger 
                value="deposit"
                className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none bg-transparent px-0 pb-3"
                onClick={() => navigate('/deposit')}
              >
                Depósito
              </TabsTrigger>
              <TabsTrigger 
                value="withdrawal" 
                className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none bg-transparent px-0 pb-3"
              >
                Retirada
              </TabsTrigger>
              <TabsTrigger 
                value="transactions"
                className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none bg-transparent px-0 pb-3"
                onClick={() => navigate('/transactions')}
              >
                Transações
              </TabsTrigger>
              <TabsTrigger 
                value="profile"
                className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none bg-transparent px-0 pb-3"
                onClick={() => navigate('/profile')}
              >
                Perfil
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Account Info Column */}
          <div className="lg:col-span-1 space-y-4">
            <div className="bg-card rounded-lg p-6 border border-border space-y-4">
              <h3 className="text-sm font-medium mb-4">Conta:</h3>
              
              <div className="space-y-2">
                <Label>Tipo de saldo</Label>
                <Select value={accountType} onValueChange={(value: any) => setAccountType(value)}>
                  <SelectTrigger className="bg-background">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-card border-border z-50">
                    <SelectItem value="real">Saldo Real</SelectItem>
                    <SelectItem value="crypto">Saldo Cripto</SelectItem>
                    <SelectItem value="bonus">Saldo Bônus</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-3 pt-4 border-t border-border">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Saldo:</span>
                  <span className="font-semibold">R$ {balances[accountType].toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Disponível para retirada</span>
                  <span className="font-semibold text-success">R$ {balances[accountType].toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Withdrawal Form Column */}
          <div className="lg:col-span-1">
            <form onSubmit={handleWithdrawal} className="bg-card rounded-lg p-6 border border-border space-y-6">
              <h3 className="text-lg font-semibold mb-4">Dados do saque</h3>

              {/* Withdrawal Type */}
              <div className="space-y-2">
                <Label>Tipo de saque</Label>
                <Select value={withdrawalType} onValueChange={(value: any) => setWithdrawalType(value)}>
                  <SelectTrigger className="bg-background">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-card border-border z-50">
                    <SelectItem value="BRL">BRL</SelectItem>
                    <SelectItem value="USDT">USDT</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Key Type */}
              <div className="space-y-2">
                <Label>Tipo da chave</Label>
                <Select value={keyType} onValueChange={(value: any) => setKeyType(value)}>
                  <SelectTrigger className="bg-background">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-card border-border z-50">
                    <SelectItem value="cpf">CPF</SelectItem>
                    <SelectItem value="cnpj">CNPJ</SelectItem>
                    <SelectItem value="phone">TELEFONE</SelectItem>
                    <SelectItem value="email">EMAIL</SelectItem>
                    <SelectItem value="random">Aleatória</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* PIX Key Input */}
              <div className="space-y-2">
                <Label htmlFor="pixKey">Chave pix</Label>
                <Input
                  id="pixKey"
                  value={pixKey}
                  onChange={(e) => setPixKey(e.target.value)}
                  placeholder={`Digite sua chave ${keyTypeLabels[keyType]}`}
                  required
                />
              </div>

              {/* Amount Input */}
              <div className="space-y-2">
                <Label htmlFor="amount">Valor</Label>
                <div className="relative">
                  <Input
                    id="amount"
                    type="number"
                    step="0.01"
                    min={settings.min_withdrawal}
                    max={settings.max_withdrawal}
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="pr-16"
                    placeholder="0.00"
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                    {withdrawalType}
                  </div>
                </div>
              </div>

              {/* Quick Amount Buttons */}
              <div className="flex flex-wrap gap-2">
                {quickAmounts.map((quickAmount) => (
                  <Button
                    key={quickAmount}
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setAmount(quickAmount.toString())}
                  >
                    {quickAmount} R$
                  </Button>
                ))}
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                className="w-full h-12 text-base font-semibold"
                size="lg"
                disabled={isSubmitting || balanceLoading}
              >
                <span>{isSubmitting ? "Processando..." : "Sacar"}</span>
                {!isSubmitting && <ArrowRight className="w-5 h-5 ml-2" />}
              </Button>
            </form>
          </div>

          {/* Important Info Column */}
          <div className="lg:col-span-1 space-y-4">
            <div className="bg-card rounded-lg p-6 border border-border">
              <h3 className="text-sm font-medium mb-4">Informações importantes:</h3>
              <div className="bg-primary/10 border-2 border-primary rounded-lg p-4">
                <div className="flex items-center gap-4">
                  <div className="w-20 h-20 flex items-center justify-center flex-shrink-0">
                    <img 
                      src={withdrawalType === "BRL" ? pixIcon : usdtIcon} 
                      alt={withdrawalType === "BRL" ? "PIX" : "USDT"} 
                      className="w-full h-full object-contain" 
                    />
                  </div>
                  <div className="space-y-2 text-sm flex-1">
                    <div>Valor mínimo: <span className="font-bold">{withdrawalType === "BRL" ? `R$ ${settings.min_withdrawal.toFixed(2)}` : `${settings.min_withdrawal.toFixed(2)} USDT`}</span></div>
                    <div>Valor máximo: <span className="font-bold">{withdrawalType === "BRL" ? `R$ ${settings.max_withdrawal.toFixed(2)}` : `${settings.max_withdrawal.toFixed(2)} USDT`}</span></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Information */}
        <div className="mt-8 bg-card rounded-lg p-6 border border-border">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="flex items-start gap-3">
              <div className="text-primary">
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z"/>
                </svg>
              </div>
              <div className="text-sm">
                <div className="text-muted-foreground">Valor mínimo do depósito:</div>
                <div className="font-semibold">{settings.min_deposit.toFixed(2)}</div>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="text-primary">
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M20 4H4c-1.11 0-1.99.89-1.99 2L2 18c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V6c0-1.11-.89-2-2-2zm0 14H4v-6h16v6zm0-10H4V6h16v2z"/>
                </svg>
              </div>
              <div className="text-sm">
                <div className="text-muted-foreground">Valor mínimo de retirada:</div>
                <div className="font-semibold">{settings.min_withdrawal.toFixed(2)}</div>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="text-primary">
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M13 2.03v2.02c4.39.54 7.5 4.53 6.96 8.92-.46 3.64-3.32 6.53-6.96 6.96v2.02c5.5-.55 9.5-5.43 8.95-10.93-.45-4.75-4.22-8.5-8.95-8.99zM11 2.06c-5.5.5-9.5 5.36-9 10.86.45 4.75 4.22 8.49 8.95 8.99v-2.02c-3.64-.43-6.5-3.32-6.96-6.96C3.45 8.57 6.56 4.58 11 4.03V2.06z"/>
                </svg>
              </div>
              <div className="text-sm">
                <div className="font-semibold">Retirada rápida</div>
                <div className="text-muted-foreground">de sua conta</div>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="text-primary">
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
                </svg>
              </div>
              <div className="text-sm">
                <div className="font-semibold">
                  {settings.withdrawal_fee > 0 ? `${settings.withdrawal_fee}% de taxa` : "Sem comissão"}
                </div>
                <div className="text-muted-foreground">em saques</div>
              </div>
            </div>
          </div>

          {/* Security Badges */}
          <div className="flex flex-wrap items-center justify-center gap-6 pt-6 border-t border-border">
            <img src={secureIcon1} alt="Verified by Visa" className="h-8 opacity-60" />
            <img src={secureIcon2} alt="3D Secure" className="h-8 opacity-60" />
            <img src={secureIcon3} alt="Secure Payment" className="h-8 opacity-60" />
            <img src={secureIcon4} alt="MasterCard SecureCode" className="h-8 opacity-60" />
            <img src={secureIcon5} alt="SSL Encryption" className="h-8 opacity-60" />
          </div>
        </div>

        {/* Back to Trading Button */}
        <div className="mt-6 text-center">
          <Button
            variant="outline"
            onClick={() => navigate('/')}
            className="gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar para Trading
          </Button>
        </div>
      </div>
    </div>
  );
}
