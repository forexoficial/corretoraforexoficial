import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, ExternalLink, Copy, Check, Wallet, Clock, AlertCircle } from "lucide-react";
import { useTranslation } from "@/hooks/useTranslation";

interface CoinbaseCheckoutProps {
  amount: number;
  currency?: string;
  onSuccess?: () => void;
  onCancel?: () => void;
}

interface ChargeData {
  transaction_id: string;
  charge_id: string;
  charge_code: string;
  hosted_url: string;
  expires_at: string;
  amount: number;
  currency: string;
  pricing: any;
  web3_data: any;
}

export function CoinbaseCheckout({ 
  amount, 
  currency = "USD", 
  onSuccess, 
  onCancel 
}: CoinbaseCheckoutProps) {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [chargeData, setChargeData] = useState<ChargeData | null>(null);
  const [copied, setCopied] = useState(false);
  const [timeLeft, setTimeLeft] = useState<string>("");
  const [expired, setExpired] = useState(false);

  // Create charge on mount
  useEffect(() => {
    createCharge();
  }, []);

  // Countdown timer
  useEffect(() => {
    if (!chargeData?.expires_at) return;

    const updateTimer = () => {
      const now = new Date();
      const expiry = new Date(chargeData.expires_at);
      const diff = expiry.getTime() - now.getTime();

      if (diff <= 0) {
        setExpired(true);
        setTimeLeft("Expired");
        return;
      }

      const minutes = Math.floor(diff / 60000);
      const seconds = Math.floor((diff % 60000) / 1000);
      setTimeLeft(`${minutes}:${seconds.toString().padStart(2, "0")}`);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [chargeData]);

  // Monitor transaction status
  useEffect(() => {
    if (!chargeData?.transaction_id) return;

    const channel = supabase
      .channel(`coinbase-tx-${chargeData.transaction_id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'transactions',
          filter: `id=eq.${chargeData.transaction_id}`
        },
        (payload) => {
          const transaction = payload.new as any;
          console.log('[CoinbaseCheckout] Transaction updated:', transaction.status);

          if (transaction.status === 'completed') {
            toast.success(t("payment_completed") || "Payment completed!");
            onSuccess?.();
          } else if (transaction.status === 'failed') {
            toast.error(t("payment_failed") || "Payment failed");
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [chargeData]);

  const createCharge = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-coinbase-charge', {
        body: {
          amount,
          currency,
          description: 'Account Deposit',
        },
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error || 'Failed to create charge');

      console.log('[CoinbaseCheckout] Charge created:', data);
      setChargeData(data);
    } catch (error: any) {
      console.error('[CoinbaseCheckout] Error:', error);
      toast.error(error.message || 'Failed to create payment');
      onCancel?.();
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast.success(t("copied") || "Copied!");
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast.error("Failed to copy");
    }
  };

  const openHostedPage = () => {
    if (chargeData?.hosted_url) {
      window.open(chargeData.hosted_url, '_blank');
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-12 space-y-4">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
        <p className="text-muted-foreground">{t("creating_payment")}</p>
      </div>
    );
  }

  if (expired) {
    return (
      <div className="flex flex-col items-center justify-center py-12 space-y-4">
        <AlertCircle className="w-12 h-12 text-destructive" />
        <h3 className="text-lg font-semibold">{t("payment_expired")}</h3>
        <p className="text-muted-foreground text-center">
          {t("payment_expired_desc")}
        </p>
        <div className="flex gap-3">
          <Button variant="outline" onClick={onCancel}>
            {t("cancel")}
          </Button>
          <Button onClick={createCharge}>
            {t("try_again")}
          </Button>
        </div>
      </div>
    );
  }

  if (!chargeData) {
    return (
      <div className="flex flex-col items-center justify-center py-12 space-y-4">
        <AlertCircle className="w-12 h-12 text-destructive" />
        <p className="text-muted-foreground">{t("payment_error")}</p>
        <Button onClick={onCancel}>{t("back")}</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="flex items-center justify-center gap-2">
          <Wallet className="w-6 h-6 text-primary" />
          <h3 className="text-xl font-semibold">{t("crypto_payment")}</h3>
        </div>
        <p className="text-muted-foreground">
          {t("pay_with_crypto")}
        </p>
      </div>

      {/* Amount Display */}
      <Card className="p-6 text-center bg-primary/5 border-primary/20">
        <p className="text-sm text-muted-foreground mb-1">{t("amount_to_pay")}</p>
        <p className="text-3xl font-bold text-primary">
          ${chargeData.amount.toFixed(2)} <span className="text-lg">{chargeData.currency}</span>
        </p>
      </Card>

      {/* Timer */}
      <div className="flex items-center justify-center gap-2 text-muted-foreground">
        <Clock className="w-4 h-4" />
        <span>{t("expires_in")}:</span>
        <span className="font-mono font-semibold text-foreground">{timeLeft}</span>
      </div>

      {/* Charge Code */}
      <div className="space-y-2">
        <label className="text-sm font-medium">{t("payment_code")}</label>
        <div className="flex gap-2">
          <div className="flex-1 bg-muted rounded-lg p-3 font-mono text-sm break-all">
            {chargeData.charge_code}
          </div>
          <Button
            variant="outline"
            size="icon"
            onClick={() => copyToClipboard(chargeData.charge_code)}
          >
            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
          </Button>
        </div>
      </div>

      {/* Coinbase Hosted Page Button */}
      <Button
        className="w-full gap-2"
        size="lg"
        onClick={openHostedPage}
      >
        <Wallet className="w-5 h-5" />
        {t("pay_with_coinbase")}
        <ExternalLink className="w-4 h-4" />
      </Button>

      <p className="text-xs text-center text-muted-foreground">
        {t("coinbase_redirect_note")}
      </p>

      {/* Supported Cryptocurrencies Info */}
      <div className="bg-muted/50 rounded-lg p-4 space-y-2">
        <p className="text-sm font-medium">{t("supported_crypto")}</p>
        <div className="flex flex-wrap gap-2">
          {["BTC", "ETH", "USDC", "DAI", "USDT", "LTC"].map((coin) => (
            <span
              key={coin}
              className="px-2 py-1 bg-background rounded text-xs font-medium border"
            >
              {coin}
            </span>
          ))}
        </div>
      </div>

      {/* Cancel Button */}
      <Button
        variant="ghost"
        className="w-full"
        onClick={onCancel}
      >
        {t("cancel")}
      </Button>
    </div>
  );
}
