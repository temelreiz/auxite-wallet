import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  
  // Environment
  environment: process.env.NEXT_PUBLIC_APP_ENV || 'development',
  
  // Performance Monitoring
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
  
  // Debug
  debug: false,
  
  // Filter transactions
  beforeSendTransaction(event) {
    // Health check'leri filtrele
    if (event.transaction === 'GET /api/health') {
      return null;
    }
    return event;
  },
});
