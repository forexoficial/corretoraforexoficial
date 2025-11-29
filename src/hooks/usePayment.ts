import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { paymentRequestSchema } from "@/types/payment-gateway";
import { useTranslation } from "@/hooks/useTranslation";

interface PaymentData {
  qrCode?: string;
  qrCodeBase64?: string;
  ticketUrl?: string;
  transactionId: string;
  externalTransactionId: string;
  amount: number;
  status: string;
  expiresAt?: string;
}

export const usePayment = () => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [paymentData, setPaymentData] = useState<PaymentData | null>(null);

  const createPayment = async (
    amount: number,
    payerName: string,
    payerDocument: string,
    payerEmail?: string
  ): Promise<PaymentData | null> => {
    setLoading(true);

    try {
      // Validate input with Zod
      const validatedData = paymentRequestSchema.parse({
        amount,
        payerName,
        payerDocument: payerDocument.replace(/\D/g, ""), // Remove formatting
        payerEmail,
        description: "Depósito"
      });

      console.log("Creating payment:", validatedData);

      const { data, error } = await supabase.functions.invoke('process-payment', {
        body: validatedData
      });

      if (error) {
        console.error('Error invoking process-payment:', error);
        throw new Error(error.message || "Erro ao processar pagamento");
      }

      if (data.error) {
        throw new Error(data.error);
      }

      console.log("Payment created:", data);

      const payment: PaymentData = {
        qrCode: data.qr_code,
        qrCodeBase64: data.qr_code_base64,
        ticketUrl: data.ticket_url,
        transactionId: data.transaction_id,
        externalTransactionId: data.external_transaction_id,
        amount: data.amount,
        status: data.status,
        expiresAt: data.expires_at
      };

      setPaymentData(payment);
      toast.success(t("toast_payment_created"));
      return payment;

    } catch (error: any) {
      console.error('Payment creation error:', error);
      toast.error(error.message || t("toast_payment_error"));
      return null;
    } finally {
      setLoading(false);
    }
  };

  const resetPayment = () => {
    setPaymentData(null);
  };

  return {
    loading,
    paymentData,
    createPayment,
    resetPayment
  };
};
