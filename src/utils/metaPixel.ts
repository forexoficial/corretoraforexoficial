// Meta Pixel Event Tracking Utility
// Pixel ID: 4135866706629908

declare global {
  interface Window {
    fbq: (...args: any[]) => void;
  }
}

/**
 * Track a Meta Pixel event
 */
export const trackEvent = (eventName: string, params?: Record<string, any>) => {
  if (typeof window !== 'undefined' && window.fbq) {
    window.fbq('track', eventName, params);
    console.log(`[Meta Pixel] Event tracked: ${eventName}`, params);
  }
};

/**
 * Track custom Meta Pixel event
 */
export const trackCustomEvent = (eventName: string, params?: Record<string, any>) => {
  if (typeof window !== 'undefined' && window.fbq) {
    window.fbq('trackCustom', eventName, params);
    console.log(`[Meta Pixel] Custom event tracked: ${eventName}`, params);
  }
};

// Standard Events

/**
 * Track user registration completion
 */
export const trackCompleteRegistration = (params?: {
  content_name?: string;
  currency?: string;
  value?: number;
  status?: string;
}) => {
  trackEvent('CompleteRegistration', {
    content_name: params?.content_name || 'User Registration',
    status: params?.status || 'success',
    ...params,
  });
};

/**
 * Track deposit/purchase completion
 */
export const trackPurchase = (params: {
  value: number;
  currency: string;
  content_name?: string;
  content_type?: string;
  transaction_id?: string;
}) => {
  trackEvent('Purchase', {
    content_name: params.content_name || 'Deposit',
    content_type: params.content_type || 'deposit',
    value: params.value,
    currency: params.currency,
    transaction_id: params.transaction_id,
  });
};

/**
 * Track when user initiates checkout/deposit
 */
export const trackInitiateCheckout = (params?: {
  value?: number;
  currency?: string;
  content_name?: string;
  payment_method?: string;
}) => {
  trackEvent('InitiateCheckout', {
    content_name: params?.content_name || 'Deposit',
    ...params,
  });
};

/**
 * Track lead generation (e.g., user starts signup)
 */
export const trackLead = (params?: {
  content_name?: string;
  content_category?: string;
}) => {
  trackEvent('Lead', {
    content_name: params?.content_name || 'Signup Started',
    content_category: params?.content_category || 'registration',
    ...params,
  });
};

/**
 * Track page view (manual, in addition to automatic)
 */
export const trackPageView = () => {
  trackEvent('PageView');
};

/**
 * Track when user adds payment info
 */
export const trackAddPaymentInfo = (params?: {
  content_name?: string;
  payment_method?: string;
}) => {
  trackEvent('AddPaymentInfo', {
    content_name: params?.content_name || 'Payment Method Added',
    ...params,
  });
};

/**
 * Track when user views content
 */
export const trackViewContent = (params?: {
  content_name?: string;
  content_type?: string;
  content_ids?: string[];
}) => {
  trackEvent('ViewContent', params);
};

/**
 * Track search actions
 */
export const trackSearch = (params?: {
  search_string?: string;
  content_category?: string;
}) => {
  trackEvent('Search', params);
};

// Custom Events for Trading Platform

/**
 * Track when user places a trade
 */
export const trackPlaceTrade = (params: {
  trade_type: 'call' | 'put';
  amount: number;
  currency: string;
  asset_name?: string;
  duration?: number;
}) => {
  trackCustomEvent('PlaceTrade', params);
};

/**
 * Track trade result
 */
export const trackTradeResult = (params: {
  result: 'win' | 'loss';
  profit: number;
  currency: string;
}) => {
  trackCustomEvent('TradeResult', params);
};

/**
 * Track identity verification submission
 */
export const trackSubmitVerification = () => {
  trackCustomEvent('SubmitVerification', {
    content_name: 'Identity Verification',
  });
};

/**
 * Track withdrawal request
 */
export const trackWithdrawalRequest = (params: {
  value: number;
  currency: string;
}) => {
  trackCustomEvent('WithdrawalRequest', params);
};
