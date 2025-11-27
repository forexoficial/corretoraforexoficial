import { 
  BasePaymentGateway 
} from "./base-gateway";
import {
  PixProvider,
  GatewayType,
  PaymentRequest,
  PaymentResponse,
  WebhookEvent,
  PaymentStatus,
  mercadoPagoConfigSchema
} from "@/types/payment-gateway";

/**
 * Mercado Pago Payment Gateway Implementation
 * Supports PIX payments via Mercado Pago API
 */
export class MercadoPagoGateway extends BasePaymentGateway {
  readonly provider = PixProvider.MERCADO_PAGO;
  readonly type = GatewayType.PIX;

  private readonly baseUrl = "https://api.mercadopago.com";
  private accessToken: string;

  constructor(config: Record<string, any>, credentials: Record<string, string>) {
    super(config, credentials);
    
    // Validate config with Zod
    const validatedConfig = mercadoPagoConfigSchema.parse({
      accessToken: credentials.accessToken,
      ...config
    });
    
    this.accessToken = validatedConfig.accessToken;
  }

  async createPayment(request: PaymentRequest): Promise<PaymentResponse> {
    this.log("info", "Creating Mercado Pago PIX payment", { amount: request.amount });

    try {
      const payload = {
        transaction_amount: request.amount,
        description: request.description || "Depósito",
        payment_method_id: "pix",
        external_reference: request.externalId,
        payer: {
          email: request.payerEmail || "cliente@exemplo.com",
          first_name: request.payerName,
          identification: {
            type: request.payerDocument.length === 11 ? "CPF" : "CNPJ",
            number: request.payerDocument
          }
        }
      };

      const response = await this.makeRequest<any>(
        `${this.baseUrl}/v1/payments`,
        {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${this.accessToken}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify(payload)
        }
      );

      this.log("info", "Mercado Pago payment created", { 
        id: response.id, 
        status: response.status 
      });

      return {
        success: true,
        transactionId: request.externalId || response.id.toString(),
        externalTransactionId: response.id.toString(),
        qrCode: response.point_of_interaction?.transaction_data?.qr_code,
        qrCodeBase64: response.point_of_interaction?.transaction_data?.qr_code_base64,
        amount: response.transaction_amount,
        status: this.mapMPStatus(response.status),
        expiresAt: response.date_of_expiration ? new Date(response.date_of_expiration) : undefined,
        metadata: {
          ticketUrl: response.point_of_interaction?.transaction_data?.ticket_url
        }
      };

    } catch (error: any) {
      this.log("error", "Failed to create Mercado Pago payment", { error: error.message });
      return this.createErrorResponse(
        "MP_CREATE_PAYMENT_ERROR",
        `Erro ao criar pagamento: ${error.message}`,
        error
      );
    }
  }

  async checkPaymentStatus(transactionId: string): Promise<PaymentResponse> {
    this.log("info", "Checking payment status", { transactionId });

    try {
      const response = await this.makeRequest<any>(
        `${this.baseUrl}/v1/payments/${transactionId}`,
        {
          method: "GET",
          headers: {
            "Authorization": `Bearer ${this.accessToken}`
          }
        }
      );

      return {
        success: true,
        transactionId,
        externalTransactionId: response.id.toString(),
        amount: response.transaction_amount,
        status: this.mapMPStatus(response.status),
        metadata: response
      };

    } catch (error: any) {
      this.log("error", "Failed to check payment status", { error: error.message });
      return this.createErrorResponse(
        "MP_STATUS_CHECK_ERROR",
        `Erro ao verificar status: ${error.message}`,
        error
      );
    }
  }

  async processWebhook(payload: any, signature?: string): Promise<WebhookEvent> {
    this.log("info", "Processing Mercado Pago webhook", { type: payload.type });

    // Mercado Pago sends the payment ID in different ways
    const paymentId = payload.data?.id || payload.id;
    
    if (!paymentId) {
      throw new Error("Payment ID not found in webhook payload");
    }

    // Fetch full payment details
    const paymentDetails = await this.makeRequest<any>(
      `${this.baseUrl}/v1/payments/${paymentId}`,
      {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${this.accessToken}`
        }
      }
    );

    return {
      provider: this.provider,
      eventType: payload.action || "payment.updated",
      transactionId: paymentDetails.external_reference || paymentId.toString(),
      externalTransactionId: paymentId.toString(),
      status: this.mapMPStatus(paymentDetails.status),
      amount: paymentDetails.transaction_amount,
      paidAt: paymentDetails.date_approved ? new Date(paymentDetails.date_approved) : undefined,
      metadata: paymentDetails,
      rawPayload: payload
    };
  }

  async validateCredentials(): Promise<boolean> {
    try {
      // Test credentials by fetching payment methods
      await this.makeRequest<any>(
        `${this.baseUrl}/v1/payment_methods`,
        {
          method: "GET",
          headers: {
            "Authorization": `Bearer ${this.accessToken}`
          }
        }
      );
      return true;
    } catch (error) {
      this.log("error", "Credential validation failed", { error });
      return false;
    }
  }

  /**
   * Map Mercado Pago status to our internal status
   */
  private mapMPStatus(mpStatus: string): PaymentStatus {
    const statusMap: Record<string, PaymentStatus> = {
      "pending": PaymentStatus.PENDING,
      "approved": PaymentStatus.COMPLETED,
      "authorized": PaymentStatus.PROCESSING,
      "in_process": PaymentStatus.PROCESSING,
      "in_mediation": PaymentStatus.PROCESSING,
      "rejected": PaymentStatus.FAILED,
      "cancelled": PaymentStatus.CANCELLED,
      "refunded": PaymentStatus.CANCELLED,
      "charged_back": PaymentStatus.CANCELLED
    };

    return statusMap[mpStatus] || PaymentStatus.PENDING;
  }
}
