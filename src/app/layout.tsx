import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Web3Provider from "@/context/Web3Provider";
import { ToastProvider } from "@/components/ui/Toast";

const inter = Inter({ subsets: ["latin"] });

// PWA & SEO Metadata
export const metadata: Metadata = {
  title: {
    default: "Auxite Wallet",
    template: "%s | Auxite Wallet",
  },
  description: "Precious Metals & Crypto Trading Platform",
  keywords: ["crypto", "wallet", "bitcoin", "ethereum", "gold", "silver", "auxite"],
  
  // PWA
  manifest: "/manifest.json",
  
  // Apple
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Auxite Wallet",
  },
  
  // Icons
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "16x16", type: "image/png" },
      { url: "/favicon.ico", sizes: "32x32", type: "image/png" },
      { url: "/icons/icon-192x192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512x512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
  
  // Open Graph
  openGraph: {
    type: "website",
    locale: "tr_TR",
    url: "https://auxite.com",
    siteName: "Auxite Wallet",
    title: "Auxite Wallet",
    description: "Precious Metals & Crypto Trading Platform",
  },
};

// Viewport
export const viewport: Viewport = {
  themeColor: "#10b981",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        {/* PWA Meta Tags */}
        <meta name="application-name" content="Auxite Wallet" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Auxite Wallet" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="msapplication-TileColor" content="#10b981" />
      </head>
      <body className={inter.className}>
        <ToastProvider>
          <Web3Provider>{children}</Web3Provider>
        </ToastProvider>
        
        {/* Service Worker Registration */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js').then(
                    function(registration) {
                      console.log('SW registered:', registration.scope);
                    },
                    function(err) {
                      console.log('SW registration failed:', err);
                    }
                  );
                });
              }
            `,
          }}
        />
      </body>
    </html>
  );
}
