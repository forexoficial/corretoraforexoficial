import { useState, useEffect } from "react";
import { loadStripe, Appearance } from "@stripe/stripe-js";
import { Elements } from "@stripe/react-stripe-js";
import { StripeCheckoutForm } from "./StripeCheckoutForm";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";
import { useTheme } from "next-themes";
import { toast } from "sonner";

// Initialize Stripe with publishable key
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || "");

interface StripeCheckoutProps {
  amount: number;
  onSuccess: () => void;
  onCancel: () => void;
}

export const StripeCheckout = ({ amount, onSuccess, onCancel }: StripeCheckoutProps) => {
  const { theme } = useTheme();
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const createPaymentIntent = async () => {
      try {
        setLoading(true);
        setError(null);

        const { data, error: invokeError } = await supabase.functions.invoke(
          "create-stripe-payment-intent",
          {
            body: { amount, currency: "usd" },
          }
        );

        if (invokeError) {
          throw new Error(invokeError.message);
        }

        if (data.error) {
          throw new Error(data.error);
        }

        if (data.clientSecret) {
          setClientSecret(data.clientSecret);
        } else {
          throw new Error("No client secret returned");
        }
      } catch (err: any) {
        console.error("Error creating payment intent:", err);
        setError(err.message || "Failed to initialize payment");
        toast.error(err.message || "Failed to initialize payment");
      } finally {
        setLoading(false);
      }
    };

    if (amount > 0) {
      createPaymentIntent();
    }
  }, [amount]);

  const appearance: Appearance = {
    theme: theme === "dark" ? "night" : "stripe",
    variables: {
      colorPrimary: "#10b981",
      colorBackground: theme === "dark" ? "#1a1a2e" : "#ffffff",
      colorText: theme === "dark" ? "#ffffff" : "#1a1a2e",
      colorDanger: "#ef4444",
      fontFamily: "system-ui, sans-serif",
      borderRadius: "8px",
      spacingUnit: "4px",
    },
    rules: {
      ".Input": {
        border: theme === "dark" ? "1px solid #374151" : "1px solid #e5e7eb",
        boxShadow: "none",
      },
      ".Input:focus": {
        border: "1px solid #10b981",
        boxShadow: "0 0 0 1px #10b981",
      },
      ".Tab": {
        border: theme === "dark" ? "1px solid #374151" : "1px solid #e5e7eb",
      },
      ".Tab--selected": {
        borderColor: "#10b981",
        backgroundColor: theme === "dark" ? "#1f2937" : "#f0fdf4",
      },
    },
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-12 space-y-4">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
        <p className="text-muted-foreground">Initializing secure payment...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-12 space-y-4">
        <p className="text-destructive">{error}</p>
        <button
          onClick={onCancel}
          className="text-primary hover:underline"
        >
          Go back
        </button>
      </div>
    );
  }

  if (!clientSecret) {
    return (
      <div className="flex flex-col items-center justify-center py-12 space-y-4">
        <p className="text-destructive">Failed to initialize payment</p>
        <button
          onClick={onCancel}
          className="text-primary hover:underline"
        >
          Go back
        </button>
      </div>
    );
  }

  return (
    <Elements
      stripe={stripePromise}
      options={{
        clientSecret,
        appearance,
        locale: "auto",
      }}
    >
      <StripeCheckoutForm
        amount={amount}
        onSuccess={onSuccess}
        onError={(err) => {
          toast.error(err);
        }}
      />
    </Elements>
  );
};
