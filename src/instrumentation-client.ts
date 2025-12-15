import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,
  
  debug: false,
  
  environment: process.env.NODE_ENV || "development",

  beforeSend(event, hint) {
    const error = hint.originalException;
    const errorMessage = error?.toString?.() || event.message || '';
    
    if (
      errorMessage.includes('FamilyAccountsSdk') ||
      errorMessage.includes('Aave Wallet') ||
      errorMessage.includes('EIP1193') ||
      errorMessage.includes('Family Accounts') ||
      errorMessage.includes('User rejected') ||
      errorMessage.includes('User denied')
    ) {
      return null;
    }
    
    return event;
  },

  ignoreErrors: [
    'FamilyAccountsSdk',
    'Aave Wallet',
    'EIP1193',
    'User rejected',
    'User denied',
    'ChunkLoadError',
  ],
});
