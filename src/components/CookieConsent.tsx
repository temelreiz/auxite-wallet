"use client";

import { useState, useEffect } from "react";
import { useLanguage } from "@/components/LanguageContext";

const translations: Record<string, { banner: string; accept: string; decline: string; settings: string; essential: string; analytics: string; essentialDesc: string; analyticsDesc: string; save: string }> = {
  en: {
    banner: "We use cookies to improve your experience. Essential cookies are required for the site to function. Analytics cookies help us understand usage.",
    accept: "Accept All",
    decline: "Essential Only",
    settings: "Cookie Settings",
    essential: "Essential Cookies",
    analytics: "Analytics Cookies",
    essentialDesc: "Required for security, authentication, and core functionality.",
    analyticsDesc: "Help us understand how you use the platform to improve our services.",
    save: "Save Preferences",
  },
  tr: {
    banner: "Deneyiminizi geliştirmek için çerezler kullanıyoruz. Temel çerezler sitenin çalışması için gereklidir. Analiz çerezleri kullanımı anlamamıza yardımcı olur.",
    accept: "Tümünü Kabul Et",
    decline: "Yalnızca Gerekli",
    settings: "Çerez Ayarları",
    essential: "Temel Çerezler",
    analytics: "Analiz Çerezleri",
    essentialDesc: "Güvenlik, kimlik doğrulama ve temel işlevsellik için gereklidir.",
    analyticsDesc: "Hizmetlerimizi iyileştirmek için platformu nasıl kullandığınızı anlamamıza yardımcı olur.",
    save: "Tercihleri Kaydet",
  },
  de: {
    banner: "Wir verwenden Cookies, um Ihre Erfahrung zu verbessern. Essentielle Cookies sind für die Funktion der Website erforderlich. Analyse-Cookies helfen uns, die Nutzung zu verstehen.",
    accept: "Alle akzeptieren",
    decline: "Nur erforderliche",
    settings: "Cookie-Einstellungen",
    essential: "Essentielle Cookies",
    analytics: "Analyse-Cookies",
    essentialDesc: "Erforderlich für Sicherheit, Authentifizierung und Kernfunktionalität.",
    analyticsDesc: "Helfen uns zu verstehen, wie Sie die Plattform nutzen, um unsere Dienste zu verbessern.",
    save: "Einstellungen speichern",
  },
  fr: {
    banner: "Nous utilisons des cookies pour améliorer votre expérience. Les cookies essentiels sont nécessaires au fonctionnement du site. Les cookies analytiques nous aident à comprendre l'utilisation.",
    accept: "Tout accepter",
    decline: "Essentiels uniquement",
    settings: "Paramètres des cookies",
    essential: "Cookies essentiels",
    analytics: "Cookies analytiques",
    essentialDesc: "Nécessaires pour la sécurité, l'authentification et les fonctionnalités de base.",
    analyticsDesc: "Nous aident à comprendre comment vous utilisez la plateforme pour améliorer nos services.",
    save: "Enregistrer les préférences",
  },
  ar: {
    banner: "نستخدم ملفات تعريف الارتباط لتحسين تجربتك. ملفات تعريف الارتباط الأساسية مطلوبة لعمل الموقع. تساعدنا ملفات تعريف الارتباط التحليلية على فهم الاستخدام.",
    accept: "قبول الكل",
    decline: "الأساسية فقط",
    settings: "إعدادات ملفات تعريف الارتباط",
    essential: "ملفات تعريف الارتباط الأساسية",
    analytics: "ملفات تعريف الارتباط التحليلية",
    essentialDesc: "مطلوبة للأمان والمصادقة والوظائف الأساسية.",
    analyticsDesc: "تساعدنا على فهم كيفية استخدامك للمنصة لتحسين خدماتنا.",
    save: "حفظ التفضيلات",
  },
  ru: {
    banner: "Мы используем файлы cookie для улучшения вашего опыта. Основные файлы cookie необходимы для работы сайта. Аналитические файлы cookie помогают нам понять использование.",
    accept: "Принять все",
    decline: "Только необходимые",
    settings: "Настройки cookie",
    essential: "Основные cookie",
    analytics: "Аналитические cookie",
    essentialDesc: "Необходимы для безопасности, аутентификации и основных функций.",
    analyticsDesc: "Помогают нам понять, как вы используете платформу, для улучшения наших услуг.",
    save: "Сохранить настройки",
  },
};

export function CookieConsent() {
  const { lang } = useLanguage();
  const t = translations[lang] || translations.en;
  const [visible, setVisible] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [analyticsEnabled, setAnalyticsEnabled] = useState(false);

  useEffect(() => {
    try {
      const consent = localStorage.getItem("auxite_cookie_consent");
      if (!consent) {
        // Small delay so it doesn't flash on first paint
        const timer = setTimeout(() => setVisible(true), 1200);
        return () => clearTimeout(timer);
      }
    } catch {}
  }, []);

  const saveConsent = (analytics: boolean) => {
    const consent = {
      essential: true,
      analytics,
      timestamp: new Date().toISOString(),
      version: "1.0",
    };
    localStorage.setItem("auxite_cookie_consent", JSON.stringify(consent));

    // Enable/disable analytics based on consent
    if (analytics && typeof window !== "undefined") {
      (window as any).auxite_analytics_consent = true;
    }

    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[9999] p-4 animate-in slide-in-from-bottom duration-500">
      <div className="max-w-2xl mx-auto bg-[#0D1421] border border-slate-700/60 rounded-2xl shadow-2xl shadow-black/40 overflow-hidden">
        {/* Main Banner */}
        {!showSettings && (
          <div className="p-5">
            <div className="flex items-start gap-3 mb-4">
              <span className="text-xl mt-0.5">🍪</span>
              <p className="text-sm text-slate-300 leading-relaxed">{t.banner}</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => saveConsent(true)}
                className="px-4 py-2 bg-[#2F6F62] text-white text-sm font-semibold rounded-lg hover:bg-[#2F6F62]/80 transition-colors"
              >
                {t.accept}
              </button>
              <button
                onClick={() => saveConsent(false)}
                className="px-4 py-2 bg-slate-700 text-slate-200 text-sm font-medium rounded-lg hover:bg-slate-600 transition-colors"
              >
                {t.decline}
              </button>
              <button
                onClick={() => setShowSettings(true)}
                className="px-4 py-2 text-slate-400 text-sm hover:text-white transition-colors"
              >
                {t.settings}
              </button>
            </div>
          </div>
        )}

        {/* Settings Panel */}
        {showSettings && (
          <div className="p-5">
            <h3 className="text-sm font-bold text-white mb-4">{t.settings}</h3>
            <div className="space-y-3 mb-4">
              {/* Essential — always on */}
              <div className="flex items-center justify-between bg-slate-800/50 rounded-xl p-3">
                <div className="flex-1 min-w-0 mr-3">
                  <p className="text-sm font-medium text-white">{t.essential}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{t.essentialDesc}</p>
                </div>
                <div className="w-11 h-6 bg-[#2F6F62] rounded-full relative cursor-not-allowed opacity-70">
                  <div className="absolute right-0.5 top-0.5 w-5 h-5 bg-white rounded-full" />
                </div>
              </div>
              {/* Analytics — toggleable */}
              <div className="flex items-center justify-between bg-slate-800/50 rounded-xl p-3">
                <div className="flex-1 min-w-0 mr-3">
                  <p className="text-sm font-medium text-white">{t.analytics}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{t.analyticsDesc}</p>
                </div>
                <button
                  onClick={() => setAnalyticsEnabled(!analyticsEnabled)}
                  className={`w-11 h-6 rounded-full relative transition-colors ${analyticsEnabled ? "bg-[#2F6F62]" : "bg-slate-600"}`}
                >
                  <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full transition-all ${analyticsEnabled ? "right-0.5" : "left-0.5"}`} />
                </button>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => saveConsent(analyticsEnabled)}
                className="px-4 py-2 bg-[#2F6F62] text-white text-sm font-semibold rounded-lg hover:bg-[#2F6F62]/80 transition-colors"
              >
                {t.save}
              </button>
              <button
                onClick={() => setShowSettings(false)}
                className="px-4 py-2 text-slate-400 text-sm hover:text-white transition-colors"
              >
                ←
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
