import { 
  BasePaymentGateway 
} from "./base-gateway";
import {
  PixProvider,
  GatewayType,
  PaymentRequest,
  PaymentResponse,
  WebhookEvent,
  PaymentStatus
} from "@/types/payment-gateway";

/**
 * PixUP Payment Gateway Implementation
 * API Documentation: https://pixup.readme.io/reference
 */
export class PixUpGateway extends BasePaymentGateway {
  readonly provider = PixProvider.PIXUP;
  readonly type = GatewayType.PIX;
  
  private readonly baseUrl = "https://api.pixupbr.com/v2";
  private accessToken: string | null = null;
  private tokenExpiresAt: number = 0;

  /**
   * Generate Basic Auth header from CLIENT_ID:CLIENT_SECRET
   */
  private getBasicAuthHeader(): string {
    const clientId = this.credentials.CLIENT_ID;
    const clientSecret = this.credentials.CLIENT_SECRET;
    
    if (!clientId || !clientSecret) {
      throw new Error("CLIENT_ID and CLIENT_SECRET are required");
    }

    // Concatenate with ':'
    const credentials = `${clientId}:${clientSecret}`;
    
    // Encode to base64
    const base64Credentials = btoa(credentials);
    
    return `Basic ${base64Credentials}`;
  }

  /**
   * Get or refresh access token
   */
  private async getAccessToken(): Promise<string> {
    // Return cached token if still valid (with 60s buffer)
    if (this.accessToken && this.tokenExpiresAt > Date.now() + 60000) {
      return this.accessToken;
    }

    this.log("info", "Requesting new access token from PixUP");

    try {
      const response = await this.makeRequest<{
        access_token: string;
        expires_in: number;
      }>(`${this.baseUrl}/oauth/token`, {
        method: "POST",
        headers: {
          "Accept": "application/json",
          "Authorization": this.getBasicAuthHeader()
        }
      });

      this.accessToken = response.access_token;
      // Set expiration time (expires_in is in seconds)
      this.tokenExpiresAt = Date.now() + (response.expires_in * 1000);

      this.log("info", "Access token obtained successfully", {
        expiresIn: response.expires_in
      });

      return this.accessToken;
    } catch (error) {
      this.log("error", "Failed to obtain access token", error);
      throw new Error("PixUP authentication failed");
    }
  }

  /**
   * Create a PIX payment
   */
  async createPayment(request: PaymentRequest): Promise<PaymentResponse> {
    this.log("info", "Creating PixUP payment", { amount: request.amount });

    try {
      const token = await this.getAccessToken();

      const payload = {
        amount: request.amount,
        external_id: request.externalId || "",
        postbackUrl: this.config.webhookUrl || "",
        payerQuestion: request.description || "Depósito",
        payer: {
          name: request.payerName,
          document: request.payerDocument.replace(/\D/g, ""), // Remove formatting
          email: request.payerEmail || ""
        }
      };

      this.log("info", "PixUP request payload", payload);

      const response = await this.makeRequest<{
        transactionId: string;
        external_id: string;
        status: string;
        amount: number;
        calendar: {
          expiration: number;
          dueDate: string;
        };
        debtor: {
          name: string;
          document: string;
        };
        qrcode: string;
      }>(`${this.baseUrl}/pix/qrcode`, {
        method: "POST",
        headers: {
          "Accept": "application/json",
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      this.log("info", "PixUP payment created successfully", {
        transactionId: response.transactionId,
        status: response.status
      });

      // Convert PixUP status to our PaymentStatus
      let status: PaymentStatus;
      switch (response.status.toUpperCase()) {
        case "PENDING":
          status = PaymentStatus.PENDING;
          break;
        case "APPROVED":
        case "PAID":
          status = PaymentStatus.COMPLETED;
          break;
        case "REJECTED":
        case "CANCELLED":
          status = PaymentStatus.FAILED;
          break;
        default:
          status = PaymentStatus.PENDING;
      }

      return {
        success: true,
        transactionId: response.external_id || "",
        externalTransactionId: response.transactionId,
        qrCode: response.qrcode,
        amount: response.amount,
        status,
        expiresAt: response.calendar?.dueDate ? new Date(response.calendar.dueDate) : undefined,
        metadata: {
          pixup_transaction_id: response.transactionId,
          expiration_seconds: response.calendar?.expiration,
          debtor: response.debtor
        }
      };

    } catch (error) {
      this.log("error", "Failed to create PixUP payment", error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      return this.createErrorResponse("PIXUP_CREATE_FAILED", errorMessage, error);
    }
  }

  /**
   * Check payment status
   */
  async checkPaymentStatus(transactionId: string): Promise<PaymentResponse> {
    this.log("info", "Checking PixUP payment status", { transactionId });

    try {
      const token = await this.getAccessToken();

      // PixUP doesn't provide a clear status check endpoint in the docs
      // This would need to be implemented based on actual API capabilities
      this.log("warn", "PixUP status check not fully implemented");

      return this.createErrorResponse(
        "NOT_IMPLEMENTED",
        "Status check not implemented for PixUP"
      );
    } catch (error) {
      this.log("error", "Failed to check PixUP payment status", error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      return this.createErrorResponse("PIXUP_STATUS_CHECK_FAILED", errorMessage, error);
    }
  }

  /**
   * Process webhook from PixUP
   */
  async processWebhook(payload: any, signature?: string): Promise<WebhookEvent> {
    this.log("info", "Processing PixUP webhook", payload);

    try {
      // Extract webhook data
      const transactionId = payload.external_id || "";
      const externalTransactionId = payload.transactionId || payload.id || "";
      const status = this.mapPixUpStatus(payload.status);
      const amount = payload.amount || 0;
      const paidAt = payload.paidAt ? new Date(payload.paidAt) : undefined;

      return {
        provider: this.provider,
        eventType: payload.event || "payment.update",
        transactionId,
        externalTransactionId,
        status,
        amount,
        paidAt,
        metadata: payload,
        rawPayload: payload
      };
    } catch (error) {
      this.log("error", "Failed to process PixUP webhook", error);
      throw error;
    }
  }

  /**
   * Map PixUP status to our PaymentStatus
   */
  private mapPixUpStatus(pixupStatus: string): PaymentStatus {
    switch (pixupStatus?.toUpperCase()) {
      case "PENDING":
        return PaymentStatus.PENDING;
      case "APPROVED":
      case "PAID":
      case "COMPLETED":
        return PaymentStatus.COMPLETED;
      case "REJECTED":
      case "FAILED":
        return PaymentStatus.FAILED;
      case "CANCELLED":
        return PaymentStatus.CANCELLED;
      case "EXPIRED":
        return PaymentStatus.EXPIRED;
      default:
        return PaymentStatus.PENDING;
    }
  }

  /**
   * Validate credentials by attempting to get access token
   */
  async validateCredentials(): Promise<boolean> {
    try {
      await this.getAccessToken();
      return true;
    } catch (error) {
      this.log("error", "Credential validation failed", error);
      return false;
    }
  }
}
