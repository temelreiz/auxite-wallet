import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  
  // Environment
  environment: process.env.NEXT_PUBLIC_APP_ENV || 'development',
  
  // Performance Monitoring
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
  
  // Session Replay
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,
  
  // Debug (sadece development)
  debug: process.env.NODE_ENV === 'development',
  
  // Integrations
  integrations: [
    Sentry.replayIntegration({
      maskAllText: true,
      blockAllMedia: true,
    }),
  ],
  
  // Filter errors
  beforeSend(event, hint) {
    // Wallet connection hatalarını filtrele
    if (event.exception?.values?.[0]?.value?.includes('User rejected')) {
      return null;
    }
    
    // Network hatalarını filtrele (opsiyonel)
    if (event.exception?.values?.[0]?.type === 'ChunkLoadError') {
      return null;
    }
    
    return event;
  },
  
  // Ignore specific errors
  ignoreErrors: [
    'ResizeObserver loop limit exceeded',
    'ResizeObserver loop completed with undelivered notifications',
    'Non-Error promise rejection captured',
    /Loading chunk \d+ failed/,
  ],
});
