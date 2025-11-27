import { 
  IPaymentGateway, 
  GatewayProvider, 
  GatewayType,
  PaymentRequest,
  PaymentResponse,
  WebhookEvent,
  PaymentStatus
} from "@/types/payment-gateway";

/**
 * Abstract base class for payment gateways
 * Implements common functionality and enforces interface
 */
export abstract class BasePaymentGateway implements IPaymentGateway {
  abstract readonly provider: GatewayProvider;
  abstract readonly type: GatewayType;
  
  protected config: Record<string, any>;
  protected credentials: Record<string, string>;

  constructor(config: Record<string, any>, credentials: Record<string, string>) {
    this.config = config;
    this.credentials = credentials;
  }

  // Abstract methods that must be implemented by concrete classes
  abstract createPayment(request: PaymentRequest): Promise<PaymentResponse>;
  abstract checkPaymentStatus(transactionId: string): Promise<PaymentResponse>;
  abstract processWebhook(payload: any, signature?: string): Promise<WebhookEvent>;
  
  async cancelPayment(transactionId: string): Promise<boolean> {
    // Default implementation - can be overridden
    console.warn(`Cancel payment not implemented for ${this.provider}`);
    return false;
  }

  async validateCredentials(): Promise<boolean> {
    // Default implementation - can be overridden
    try {
      // Try a simple operation to validate credentials
      return true;
    } catch (error) {
      console.error(`Credential validation failed for ${this.provider}:`, error);
      return false;
    }
  }

  // Helper method for making HTTP requests
  protected async makeRequest<T>(
    url: string,
    options: RequestInit = {}
  ): Promise<T> {
    const timeout = this.config.timeout || 30000;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      });

      if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorBody}`);
      }

      return await response.json();
    } finally {
      clearTimeout(timeoutId);
    }
  }

  // Helper to create error response
  protected createErrorResponse(
    code: string,
    message: string,
    details?: any
  ): PaymentResponse {
    return {
      success: false,
      transactionId: "",
      amount: 0,
      status: PaymentStatus.FAILED,
      error: { code, message, details }
    };
  }

  // Helper to log structured events
  protected log(level: "info" | "warn" | "error", message: string, data?: any) {
    const logData = {
      timestamp: new Date().toISOString(),
      provider: this.provider,
      level,
      message,
      data
    };
    console.log(JSON.stringify(logData));
  }
}
