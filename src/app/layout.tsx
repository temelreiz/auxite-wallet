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

const inter = Inter({ subsets: ["latin"] });

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Auxite - Tokenized Precious Metals",
  description: "Trade digital tokens backed by physical precious metals",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Auxite",
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
        <ToastProvider>
          <UIToastProvider>
            <Web3Provider>
              <LanguageProvider>
                <SecurityBanner />
                <ChainGuard />
                {children}
              </LanguageProvider>
            </Web3Provider>
          </UIToastProvider>
        </ToastProvider>
      </body>
    </html>
  );
}
