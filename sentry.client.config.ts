// sentry.client.config.ts
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Performance monitoring
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,

  // Session replay
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,

  // Environment
  environment: process.env.NODE_ENV || "development",

  // Debug mode (development only)
  debug: false,

  // Hata filtreleme
  beforeSend(event, hint) {
    const error = hint.originalException;
    const errorMessage = error?.toString?.() || event.message || '';
    
    // Family/Aave wallet hatalarını ignore et
    if (
      errorMessage.includes('FamilyAccountsSdk') ||
      errorMessage.includes('Aave Wallet') ||
      errorMessage.includes('EIP1193 provider connection timeout') ||
      errorMessage.includes('Family Accounts is not connected') ||
      errorMessage.includes('family-accounts-connector') ||
      errorMessage.includes('initializeLazyConnection')
    ) {
      return null;
    }

    // Wallet rejection hatalarını ignore et
    if (
      errorMessage.includes('User rejected') ||
      errorMessage.includes('User denied') ||
      errorMessage.includes('user rejected transaction')
    ) {
      return null;
    }
    
    return event;
  },

  // Ignore edilecek hatalar
  ignoreErrors: [
    // Wallet hataları
    'FamilyAccountsSdk',
    'Aave Wallet',
    'EIP1193 provider connection timeout',
    'Family Accounts is not connected',
    'User rejected',
    'User denied',
    'user rejected transaction',
    'User closed modal',
    // Chunk yükleme hataları
    'ChunkLoadError',
    'Loading chunk',
    'Failed to fetch dynamically imported module',
    // Network hataları
    'Network request failed',
    'Failed to fetch',
    'Load failed',
    // Browser extension hataları
    'Extension context invalidated',
    'ResizeObserver loop',
  ],

  // Ignore edilecek URL'ler
  denyUrls: [
    /extensions\//i,
    /^chrome:\/\//i,
    /^chrome-extension:\/\//i,
    /^moz-extension:\/\//i,
  ],

  integrations: [
    Sentry.replayIntegration({
      maskAllText: false,
      blockAllMedia: false,
    }),
  ],
});