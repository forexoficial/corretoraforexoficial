import { useState, useEffect } from "react";
import {
  PaymentElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle, XCircle } from "lucide-react";
import { useTranslation } from "@/hooks/useTranslation";
import { useCurrency } from "@/hooks/useCurrency";

interface StripeCheckoutFormProps {
  amount: number;
  onSuccess: () => void;
  onError: (error: string) => void;
}

export const StripeCheckoutForm = ({ 
  amount, 
  onSuccess, 
  onError 
}: StripeCheckoutFormProps) => {
  const { t } = useTranslation();
  const { formatCurrency } = useCurrency();
  const stripe = useStripe();
  const elements = useElements();
  
  const [isLoading, setIsLoading] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<"idle" | "processing" | "succeeded" | "failed">("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsLoading(true);
    setPaymentStatus("processing");
    setErrorMessage(null);

    try {
      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/deposit?payment_status=success`,
        },
        redirect: "if_required",
      });

      if (error) {
        setPaymentStatus("failed");
        setErrorMessage(error.message || "Payment failed");
        onError(error.message || "Payment failed");
      } else if (paymentIntent && paymentIntent.status === "succeeded") {
        setPaymentStatus("succeeded");
        onSuccess();
      } else if (paymentIntent && paymentIntent.status === "processing") {
        setPaymentStatus("processing");
      } else {
        // Handle other statuses
        setPaymentStatus("idle");
      }
    } catch (err: any) {
      setPaymentStatus("failed");
      setErrorMessage(err.message || "An unexpected error occurred");
      onError(err.message || "An unexpected error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  if (paymentStatus === "succeeded") {
    return (
      <div className="flex flex-col items-center justify-center py-8 space-y-4">
        <CheckCircle className="w-16 h-16 text-green-500" />
        <h3 className="text-xl font-semibold text-foreground">
          {t("payment_success") || "Payment Successful!"}
        </h3>
        <p className="text-muted-foreground text-center">
          {t("payment_success_message") || "Your deposit has been processed successfully."}
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="bg-muted/30 rounded-lg p-4 mb-4">
        <div className="flex justify-between items-center">
          <span className="text-muted-foreground">{t("amount") || "Amount"}:</span>
          <span className="text-xl font-bold text-foreground">
            ${amount.toFixed(2)} USD
          </span>
        </div>
      </div>

      <PaymentElement 
        options={{
          layout: "tabs",
          paymentMethodOrder: ["card", "apple_pay", "google_pay"],
        }}
      />

      {errorMessage && (
        <div className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
          <XCircle className="w-5 h-5 text-destructive" />
          <p className="text-sm text-destructive">{errorMessage}</p>
        </div>
      )}

      <Button
        type="submit"
        disabled={!stripe || !elements || isLoading}
        className="w-full h-12 text-lg font-semibold"
      >
        {isLoading ? (
          <>
            <Loader2 className="w-5 h-5 mr-2 animate-spin" />
            {t("processing") || "Processing..."}
          </>
        ) : (
          `${t("pay") || "Pay"} $${amount.toFixed(2)} USD`
        )}
      </Button>

      <p className="text-xs text-muted-foreground text-center">
        {t("stripe_secure_payment") || "Secure payment powered by Stripe. Your payment information is encrypted."}
      </p>
    </form>
  );
};
