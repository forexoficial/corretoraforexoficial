import { z } from "zod";

// ===== ENUMS =====
export enum GatewayType {
  PIX = "pix",
  CRYPTO = "crypto",
  WORLDWIDE = "worldwide"
}

export enum PaymentStatus {
  PENDING = "pending",
  PROCESSING = "processing",
  COMPLETED = "completed",
  FAILED = "failed",
  CANCELLED = "cancelled",
  EXPIRED = "expired"
}

// Provedores PIX
export enum PixProvider {
  MERCADO_PAGO = "mercado_pago",
  CUSTOM_PIX = "custom_pix",
  PIXUP = "pixup"
}

// Provedores Cripto
export enum CryptoProvider {
  CUSTOM_CRYPTO = "custom_crypto"
}

// Provedores Worldwide (Internacionais)
export enum WorldwideProvider {
  STRIPE = "stripe",
  PAYPAL = "paypal",
  CUSTOM_WORLDWIDE = "custom_worldwide"
}

// Union type for backward compatibility
export type GatewayProvider = PixProvider | CryptoProvider | WorldwideProvider;

// ===== CREDENTIAL DEFINITIONS =====
export interface CredentialField {
  name: string;
  label: string;
  placeholder: string;
  description?: string;
  required: boolean;
  type?: "text" | "password";
}

// Credenciais para provedores PIX
export const PIX_PROVIDER_CREDENTIALS: Record<PixProvider, CredentialField[]> = {
  [PixProvider.MERCADO_PAGO]: [
    {
      name: "ACCESS_TOKEN",
      label: "Access Token",
      placeholder: "APP_USR-xxxx-xxxxxx-xxxx",
      description: "Obtenha em: Mercado Pago → Credenciais de Produção",
      required: true,
      type: "password"
    },
    {
      name: "PUBLIC_KEY",
      label: "Public Key (Opcional)",
      placeholder: "APP_USR-xxxx-xxxx-xxxx",
      description: "Para integrações frontend (opcional)",
      required: false,
      type: "text"
    }
  ],
  [PixProvider.CUSTOM_PIX]: [
    {
      name: "API_KEY",
      label: "API Key PIX",
      placeholder: "Sua chave de API PIX",
      description: "Chave de autenticação do provedor PIX",
      required: true,
      type: "password"
    },
    {
      name: "API_SECRET",
      label: "API Secret PIX",
      placeholder: "Seu secret PIX",
      description: "Secret do provedor PIX (opcional)",
      required: false,
      type: "password"
    }
  ],
  [PixProvider.PIXUP]: [
    {
      name: "CLIENT_ID",
      label: "Client ID",
      placeholder: "Seu Client ID do PixUP",
      description: "Client ID fornecido pelo PixUP",
      required: true,
      type: "text"
    },
    {
      name: "CLIENT_SECRET",
      label: "Client Secret",
      placeholder: "Seu Client Secret do PixUP",
      description: "Client Secret fornecido pelo PixUP",
      required: true,
      type: "password"
    }
  ]
};

// Credenciais para provedores Cripto
export const CRYPTO_PROVIDER_CREDENTIALS: Record<CryptoProvider, CredentialField[]> = {
  [CryptoProvider.CUSTOM_CRYPTO]: [
    {
      name: "WALLET_ADDRESS",
      label: "Endereço da Carteira",
      placeholder: "Endereço USDT TRC20",
      description: "Endereço da carteira para receber USDT",
      required: true,
      type: "text"
    },
    {
      name: "API_KEY",
      label: "API Key Cripto",
      placeholder: "Chave da API do provedor",
      description: "Chave de autenticação (se necessário)",
      required: false,
      type: "password"
    },
    {
      name: "API_SECRET",
      label: "API Secret Cripto",
      placeholder: "Secret da API",
      description: "Secret do provedor (se necessário)",
      required: false,
      type: "password"
    }
  ]
};

// Credenciais para provedores Worldwide (Internacionais)
export const WORLDWIDE_PROVIDER_CREDENTIALS: Record<WorldwideProvider, CredentialField[]> = {
  [WorldwideProvider.STRIPE]: [
    {
      name: "SECRET_KEY",
      label: "Secret Key",
      placeholder: "sk_live_xxxx ou sk_test_xxxx",
      description: "Obtenha em: Stripe Dashboard → Developers → API Keys",
      required: true,
      type: "password"
    },
    {
      name: "PUBLISHABLE_KEY",
      label: "Publishable Key",
      placeholder: "pk_live_xxxx ou pk_test_xxxx",
      description: "Chave pública para integrações frontend",
      required: false,
      type: "text"
    },
    {
      name: "WEBHOOK_SECRET",
      label: "Webhook Secret",
      placeholder: "whsec_xxxx",
      description: "Secret para validar webhooks do Stripe",
      required: false,
      type: "password"
    }
  ],
  [WorldwideProvider.PAYPAL]: [
    {
      name: "CLIENT_ID",
      label: "Client ID",
      placeholder: "Seu Client ID do PayPal",
      description: "Obtenha em: PayPal Developer → My Apps & Credentials",
      required: true,
      type: "text"
    },
    {
      name: "CLIENT_SECRET",
      label: "Client Secret",
      placeholder: "Seu Client Secret do PayPal",
      description: "Secret do app PayPal",
      required: true,
      type: "password"
    }
  ],
  [WorldwideProvider.CUSTOM_WORLDWIDE]: [
    {
      name: "API_KEY",
      label: "API Key",
      placeholder: "Chave da API do gateway",
      description: "Chave de autenticação do provedor",
      required: true,
      type: "password"
    },
    {
      name: "API_SECRET",
      label: "API Secret",
      placeholder: "Secret da API",
      description: "Secret do provedor (se necessário)",
      required: false,
      type: "password"
    },
    {
      name: "MERCHANT_ID",
      label: "Merchant ID",
      placeholder: "ID do comerciante",
      description: "Identificador do comerciante (se necessário)",
      required: false,
      type: "text"
    }
  ]
};

// ===== ZOD SCHEMAS =====

// Mercado Pago Config
export const mercadoPagoConfigSchema = z.object({
  accessToken: z.string().min(1, "Access token é obrigatório"),
  publicKey: z.string().optional(),
  webhookSecret: z.string().optional(),
  notificationUrl: z.string().url().optional(),
  expirationMinutes: z.number().int().positive().optional()
});

// Gateway Config - generic configuration for all providers
export const gatewayConfigSchema = z.object({
  provider: z.string(), // Can be PixProvider or CryptoProvider
  secretName: z.string().optional(),
  endpoint: z.string().url().optional(),
  timeout: z.number().int().positive().optional(),
  retryAttempts: z.number().int().min(0).max(5).optional(),
  metadata: z.record(z.string(), z.any()).optional()
});

// Gateway form validation
export const gatewayFormSchema = z.object({
  name: z.string().min(3, "Nome deve ter no mínimo 3 caracteres").max(100),
  type: z.nativeEnum(GatewayType),
  provider: z.string(), // Can be PixProvider or CryptoProvider
  secretName: z.string().min(1, "Secret name é obrigatório"),
  webhookUrl: z.string().url("URL de webhook inválida").optional(),
  config: z.string().refine((val) => {
    try {
      JSON.parse(val);
      return true;
    } catch {
      return false;
    }
  }, "JSON de configuração inválido"),
  isActive: z.boolean().default(true)
});

// Payment request validation
export const paymentRequestSchema = z.object({
  amount: z.number().positive("Valor deve ser positivo"),
  currency: z.enum(["BRL", "USDT"]).optional(),
  payerName: z.string().min(1).max(200),
  payerDocument: z.string().min(11).max(14),
  payerEmail: z.string().email().optional(),
  description: z.string().max(500).optional(),
  externalId: z.string().optional()
});

// ===== TYPESCRIPT TYPES =====
export type MercadoPagoConfig = z.infer<typeof mercadoPagoConfigSchema>;
export type GatewayConfig = z.infer<typeof gatewayConfigSchema>;
export type GatewayFormData = z.infer<typeof gatewayFormSchema>;
export type PaymentRequest = z.infer<typeof paymentRequestSchema>;

// Database Gateway Model
export interface Gateway {
  id: string;
  name: string;
  type: GatewayType;
  provider: GatewayProvider;
  secretName: string; // Reference to Supabase secret
  webhookUrl: string | null;
  config: GatewayConfig;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// Payment Response
export interface PaymentResponse {
  success: boolean;
  transactionId: string;
  externalTransactionId?: string;
  qrCode?: string;
  qrCodeBase64?: string;
  paymentUrl?: string;
  amount: number;
  status: PaymentStatus;
  expiresAt?: Date;
  metadata?: Record<string, any>;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
}

// Webhook Event
export interface WebhookEvent {
  provider: string; // Can be PixProvider or CryptoProvider
  eventType: string;
  transactionId: string;
  externalTransactionId: string;
  status: PaymentStatus;
  amount: number;
  paidAt?: Date;
  metadata?: Record<string, any>;
  rawPayload: any;
}

// Payment Gateway Interface (Strategy Pattern)
export interface IPaymentGateway {
  readonly provider: string; // Can be PixProvider or CryptoProvider
  readonly type: GatewayType;
  
  createPayment(request: PaymentRequest): Promise<PaymentResponse>;
  checkPaymentStatus(transactionId: string): Promise<PaymentResponse>;
  cancelPayment(transactionId: string): Promise<boolean>;
  processWebhook(payload: any, signature?: string): Promise<WebhookEvent>;
  validateCredentials(): Promise<boolean>;
}
