"use client";

import { useState, useEffect } from "react";

/**
 * PWA Install Banner
 * Uygulamayı yükleme önerisi gösterir
 */

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

interface Props {
  lang?: "tr" | "en";
}

const t = {
  tr: {
    title: "Uygulamayı Yükle",
    description: "Ana ekranınıza ekleyerek daha hızlı erişin",
    install: "Yükle",
    notNow: "Şimdi Değil",
    iosInstructions: "Safari'de paylaş butonuna tıklayın ve 'Ana Ekrana Ekle' seçin",
  },
  en: {
    title: "Install App",
    description: "Add to home screen for quick access",
    install: "Install",
    notNow: "Not Now",
    iosInstructions: "Tap the share button in Safari and select 'Add to Home Screen'",
  },
};

export function PWAInstallBanner({ lang = "tr" }: Props) {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showBanner, setShowBanner] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  const labels = t[lang];

  useEffect(() => {
    // iOS kontrolü
    const ios = /iPad|iPhone|iPod/.test(navigator.userAgent);
    setIsIOS(ios);

    // Standalone kontrolü (zaten yüklü mü?)
    const standalone = window.matchMedia("(display-mode: standalone)").matches;
    setIsStandalone(standalone);

    // Daha önce reddedilmiş mi?
    const dismissed = localStorage.getItem("pwa-install-dismissed");
    if (dismissed && Date.now() - parseInt(dismissed) < 7 * 24 * 60 * 60 * 1000) {
      return; // 1 hafta içinde tekrar gösterme
    }

    // Android/Chrome için
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setShowBanner(true);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstall);

    // iOS için (Safari)
    if (ios && !standalone) {
      setTimeout(() => setShowBanner(true), 3000);
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === "accepted") {
      console.log("PWA installed");
    }

    setDeferredPrompt(null);
    setShowBanner(false);
  };

  const handleDismiss = () => {
    localStorage.setItem("pwa-install-dismissed", Date.now().toString());
    setShowBanner(false);
  };

  if (!showBanner || isStandalone) return null;

  return (
    <div className="fixed bottom-20 left-4 right-4 z-50 lg:left-auto lg:right-4 lg:w-80 animate-slideInUp">
      <div className="bg-slate-900 rounded-2xl border border-slate-700 shadow-2xl shadow-black/50 overflow-hidden">
        <div className="p-4">
          <div className="flex items-start gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center flex-shrink-0">
              <span className="text-2xl">💎</span>
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="font-semibold text-white">{labels.title}</h4>
              <p className="text-sm text-slate-400 mt-0.5">
                {isIOS ? labels.iosInstructions : labels.description}
              </p>
            </div>
            <button
              onClick={handleDismiss}
              className="text-slate-500 hover:text-slate-300 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {!isIOS && deferredPrompt && (
            <div className="flex gap-2 mt-4">
              <button
                onClick={handleDismiss}
                className="flex-1 py-2 text-sm text-slate-400 hover:text-slate-300 transition-colors"
              >
                {labels.notNow}
              </button>
              <button
                onClick={handleInstall}
                className="flex-1 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-sm font-medium transition-colors"
              >
                {labels.install}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * PWA Register Hook
 * Service worker kaydı için
 */
export function usePWARegister() {
  useEffect(() => {
    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js")
        .then((registration) => {
          console.log("SW registered:", registration.scope);

          // Güncelleme kontrolü
          registration.addEventListener("updatefound", () => {
            const newWorker = registration.installing;
            if (newWorker) {
              newWorker.addEventListener("statechange", () => {
                if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
                  // Yeni versiyon mevcut
                  console.log("New SW version available");
                  // TODO: Kullanıcıya güncelleme bildirimi göster
                }
              });
            }
          });
        })
        .catch((error) => {
          console.error("SW registration failed:", error);
        });
    }
  }, []);
}
