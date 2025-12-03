import { IPaymentGateway, PixProvider, CryptoProvider, WorldwideProvider } from "@/types/payment-gateway";
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
    provider: string, // Can be PixProvider, CryptoProvider, or WorldwideProvider
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
      
      case WorldwideProvider.STRIPE:
        throw new Error("Stripe gateway requires implementation");
      
      case WorldwideProvider.PAYPAL:
        throw new Error("PayPal gateway requires implementation");
      
      case WorldwideProvider.CUSTOM_WORLDWIDE:
        throw new Error("Custom worldwide gateway requires implementation");
      
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
      // WorldwideProvider.STRIPE, // Coming soon
      // WorldwideProvider.PAYPAL, // Coming soon
    ];
  }

  /**
   * Check if a provider is supported
   */
  static isProviderSupported(provider: string): boolean {
    return this.getSupportedProviders().includes(provider);
  }
}
