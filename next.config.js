/** @type {import('next').NextConfig} */
const nextConfig = {
  async redirects() {
    return [
      {
        source: "/privacy",
        destination: "/legal/privacy",
        permanent: true,
      },
      {
        source: "/privacy-policy",
        destination: "/legal/privacy",
        permanent: true,
      },
    ];
  },

  async headers() {
    const securityHeaders = [
      { key: "X-Frame-Options", value: "DENY" },
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "X-XSS-Protection", value: "1; mode=block" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      { key: "Permissions-Policy", value: "camera=(self), microphone=(), geolocation=()" },
      {
        key: "Strict-Transport-Security",
        value: "max-age=63072000; includeSubDomains; preload",
      },
      {
        key: "Content-Security-Policy",
        value: [
          "default-src 'self'",
          "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.googletagmanager.com https://*.google-analytics.com https://challenges.cloudflare.com https://cdn.jsdelivr.net https://*.sumsub.com https://connect.facebook.net https://global-stg.transak.com https://global.transak.com https://client.crisp.chat https://settings.crisp.chat",
          "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://client.crisp.chat",
          "font-src 'self' https://fonts.gstatic.com https://client.crisp.chat data:",
          "img-src 'self' data: blob: https: https://www.facebook.com https://image.crisp.chat",
          "connect-src 'self' https: wss: https://*.auxite.io https://*.upstash.io https://*.walletconnect.com https://*.walletconnect.org wss://*.walletconnect.com wss://*.walletconnect.org https://*.infura.io https://*.alchemy.com https://cloudflare-eth.com https://api.coingecko.com https://api.goldapi.io https://*.sentry.io https://*.coinbase.com https://*.nowpayments.io https://api.transak.com https://*.sumsub.com https://www.google-analytics.com https://*.analytics.google.com https://connect.facebook.net https://www.facebook.com https://*.crisp.chat wss://*.crisp.chat",
          "frame-src 'self' https://challenges.cloudflare.com https://verify.walletconnect.com https://global-stg.transak.com https://global.transak.com https://*.sumsub.com https://game.crisp.chat https://*.google.com",
          "object-src 'none'",
          "base-uri 'self'",
          "form-action 'self' https://appleid.apple.com",
          "frame-ancestors 'none'",
        ].join("; "),
      },
    ];

    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
      {
        source: "/api/:path*",
        headers: [
          { key: "Access-Control-Allow-Credentials", value: "true" },
          {
            key: "Access-Control-Allow-Origin",
            value: process.env.CORS_ORIGIN || "https://vault.auxite.io",
          },
          { key: "Access-Control-Allow-Methods", value: "GET,POST,PUT,DELETE,PATCH,OPTIONS" },
          {
            key: "Access-Control-Allow-Headers",
            value: "Content-Type, Authorization, x-wallet-address, x-client-platform, x-client-version, x-request-id",
          },
        ],
      },
    ];
  },

  images: {
    remotePatterns: [{ protocol: "https", hostname: "**" }],
  },

  // Family wallet hatalarını engelle
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.alias = { ...config.resolve.alias, family: false };
      config.resolve.fallback = { ...config.resolve.fallback, family: false };
    }
    return config;
  },
};

const { withSentryConfig } = require("@sentry/nextjs");

module.exports = withSentryConfig(nextConfig, {
  org: "auxite",
  project: "javascript-nextjs",
  silent: !process.env.CI,
  widenClientFileUpload: true,
  tunnelRoute: "/monitoring",
  disableLogger: true,
  automaticVercelMonitors: true,
});
