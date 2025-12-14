'use client';

import * as Sentry from '@sentry/nextjs';
import { useEffect } from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log to Sentry
    Sentry.captureException(error);
  }, [error]);

  return (
    <html>
      <body>
        <div className="min-h-screen flex items-center justify-center bg-gray-900">
          <div className="text-center p-8">
            <h1 className="text-4xl font-bold text-white mb-4">
              Something went wrong!
            </h1>
            <p className="text-gray-400 mb-6">
              We apologize for the inconvenience. Our team has been notified.
            </p>
            {error.digest && (
              <p className="text-gray-500 text-sm mb-6">
                Error ID: {error.digest}
              </p>
            )}
            <button
              onClick={reset}
              className="px-6 py-3 bg-amber-500 text-black font-semibold rounded-lg hover:bg-amber-400 transition-colors"
            >
              Try Again
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
