import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";

import "@rainbow-me/rainbowkit/styles.css";
import "./globals.css";

import { Web3Provider } from "@/components/Web3Provider";
import { ToastProvider } from "@/components/ToastProvider";
import { ToastProvider as UIToastProvider } from "@/components/ui/Toast";
import { LanguageProvider } from "@/components/LanguageContext";
import { ChainGuard } from "@/components/ChainGuard";
import { SecurityBanner } from "@/components/SecurityBanner";
import { CookieConsent } from "@/components/CookieConsent";
import Script from "next/script";

const inter = Inter({ subsets: ["latin"] });

export const dynamic = "force-dynamic";

const GA_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID || "";

export const metadata: Metadata = {
  title: {
    default: "Auxite | Fully Allocated Precious Metals",
    template: "%s | Auxite",
  },
  description: "Own fully allocated precious metals with institutional custody and real-time transparency. Auxite brings vaulted metals on-chain.",
  manifest: "/manifest.json",
  metadataBase: new URL("https://vault.auxite.io"),
  alternates: {
    canonical: "https://vault.auxite.io",
    languages: {
      "en": "https://vault.auxite.io",
      "tr": "https://vault.auxite.io",
      "x-default": "https://vault.auxite.io",
    },
  },
  openGraph: {
    title: "Auxite | Fully Allocated Precious Metals",
    description: "Own fully allocated precious metals with institutional custody and real-time transparency. Auxite brings vaulted metals on-chain.",
    url: "https://vault.auxite.io",
    siteName: "Auxite",
    type: "website",
    locale: "en_US",
    images: [
      {
        url: "/api/og",
        width: 1200,
        height: 630,
        alt: "Auxite — Fully Allocated Precious Metals",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Auxite | Fully Allocated Precious Metals",
    description: "Own fully allocated precious metals with institutional custody and real-time transparency.",
    images: ["/api/og"],
  },
  robots: {
    index: true,
    follow: true,
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Auxite | Allocated Metals",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#09090b",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="tr" suppressHydrationWarning>
      <head>
        {/* Default PWA icons (ensure these files exist in /public) */}
        <link rel="apple-touch-icon" href="/icon-192.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="mobile-web-app-capable" content="yes" />

        {/* JSON-LD Structured Data — FinancialService (RWA optimized) */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "FinancialService",
              name: "Auxite",
              url: "https://vault.auxite.io",
              description: "Auxite provides access to fully allocated precious metals with institutional custody and transparency-first reporting.",
              areaServed: "Global",
              serviceType: "Asset-backed precious metals platform",
              sameAs: [
                "https://www.linkedin.com/company/auxite",
                "https://x.com/AuxiteGlobal",
              ],
            }),
          }}
        />

        {/* Theme initialization script - always dark mode */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  document.documentElement.classList.add('dark');
                  document.documentElement.classList.remove('light');

                  var lang = localStorage.getItem('auxite_language');
                  if (lang === 'ar') {
                    document.documentElement.dir = 'rtl';
                  }
                } catch (e) {}
              })();
            `,
          }}
        />
      </head>
      <body
        className={`${inter.className} antialiased bg-stone-100 dark:bg-zinc-950`}
        suppressHydrationWarning
      >
        {/* Google Analytics 4 */}
        {GA_ID && (
          <>
            <Script src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`} strategy="afterInteractive" />
            <Script id="ga4-init" strategy="afterInteractive">
              {`
                window.dataLayer = window.dataLayer || [];
                function gtag(){dataLayer.push(arguments);}
                gtag('js', new Date());
                gtag('config', '${GA_ID}', {
                  page_path: window.location.pathname,
                  anonymize_ip: true,
                  cookie_flags: 'SameSite=None;Secure',
                });
                // Respect cookie consent
                if (!window.auxite_analytics_consent) {
                  gtag('consent', 'default', {
                    analytics_storage: 'denied',
                  });
                }
              `}
            </Script>
          </>
        )}
        {/* Meta Pixel */}
        <Script id="meta-pixel" strategy="afterInteractive">
          {`
            !function(f,b,e,v,n,t,s)
            {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
            n.callMethod.apply(n,arguments):n.queue.push(arguments)};
            if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
            n.queue=[];t=b.createElement(e);t.async=!0;
            t.src=v;s=b.getElementsByTagName(e)[0];
            s.parentNode.insertBefore(t,s)}(window, document,'script',
            'https://connect.facebook.net/en_US/fbevents.js');
            fbq('init', '938812332212962');
            fbq('track', 'PageView');
          `}
        </Script>
        <noscript>
          <img height="1" width="1" style={{display:'none'}}
            src="https://www.facebook.com/tr?id=938812332212962&ev=PageView&noscript=1"
          />
        </noscript>
        <ToastProvider>
          <UIToastProvider>
            <Web3Provider>
              <LanguageProvider>
                <SecurityBanner />
                <ChainGuard />
                {children}
                <CookieConsent />
              </LanguageProvider>
            </Web3Provider>
          </UIToastProvider>
        </ToastProvider>
      </body>
    </html>
  );
}
