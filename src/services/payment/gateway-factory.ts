import { IPaymentGateway, PixProvider, CryptoProvider } from "@/types/payment-gateway";
import { MercadoPagoGateway } from "./mercado-pago-gateway";
import { PixUpGateway } from "./pixup-gateway";

/**
 * Factory for creating payment gateway instances
 * Implements Factory Pattern for gateway creation
 */
export class PaymentGatewayFactory {
  /**
   * Create a payment gateway instance based on provider
   */
  static createGateway(
    provider: string, // Can be PixProvider or CryptoProvider
    config: Record<string, any>,
    credentials: Record<string, string>
  ): IPaymentGateway {
    switch (provider) {
      case PixProvider.MERCADO_PAGO:
        return new MercadoPagoGateway(config, credentials);
      
      case PixProvider.PIXUP:
        return new PixUpGateway(config, credentials);
      
      case PixProvider.CUSTOM_PIX:
        throw new Error("Custom PIX gateway requires implementation");
      
      case CryptoProvider.CUSTOM_CRYPTO:
        throw new Error("Custom crypto gateway requires implementation");
      
      default:
        throw new Error(`Unknown payment gateway provider: ${provider}`);
    }
  }

  /**
   * Get list of supported providers
   */
  static getSupportedProviders(): string[] {
    return [
      PixProvider.MERCADO_PAGO,
      PixProvider.PIXUP,
      // Add more as implemented
    ];
  }

  /**
   * Check if a provider is supported
   */
  static isProviderSupported(provider: string): boolean {
    return this.getSupportedProviders().includes(provider);
  }
}
