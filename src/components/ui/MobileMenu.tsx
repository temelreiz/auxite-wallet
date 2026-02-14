"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useLanguage } from "@/components/LanguageContext";

/**
 * Mobile Menu Component
 * Hamburger menu for mobile responsive navigation
 */

// ═══════════════════════════════════════════════════════════════════════════════
// TRANSLATIONS
// ═══════════════════════════════════════════════════════════════════════════════

const translations = {
  tr: {
    markets: "Piyasalar",
    earn: "Kazan",
    vault: "Kasa",
    security: "Güvenlik",
    advancedSecurity: "Gelişmiş Güvenlik",
    menu: "Menü",
  },
  en: {
    markets: "Markets",
    earn: "Earn",
    vault: "Vault",
    security: "Security",
    advancedSecurity: "Advanced Security",
    menu: "Menu",
  },
  de: {
    markets: "Märkte",
    earn: "Verdienen",
    vault: "Tresor",
    security: "Sicherheit",
    advancedSecurity: "Erweiterte Sicherheit",
    menu: "Menü",
  },
  fr: {
    markets: "Marchés",
    earn: "Gagner",
    vault: "Coffre",
    security: "Sécurité",
    advancedSecurity: "Sécurité Avancée",
    menu: "Menu",
  },
  ar: {
    markets: "الأسواق",
    earn: "اكسب",
    vault: "الخزنة",
    security: "الأمان",
    advancedSecurity: "أمان متقدم",
    menu: "القائمة",
  },
  ru: {
    markets: "Рынки",
    earn: "Заработок",
    vault: "Хранилище",
    security: "Безопасность",
    advancedSecurity: "Расширенная Безопасность",
    menu: "Меню",
  },
};

interface MobileMenuProps {
  currentPath?: string;
}

export function MobileMenu({ currentPath = "/" }: MobileMenuProps) {
  const { lang } = useLanguage();
  const t = (key: string) => (translations as any)[lang]?.[key] || (translations as any).en[key] || key;
  const [isOpen, setIsOpen] = useState(false);

  // Close menu on route change
  useEffect(() => {
    setIsOpen(false);
  }, [currentPath]);

  // Prevent body scroll when menu is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  const navItems = [
    { href: "/", label: t("markets"), icon: "📊" },
    { href: "/earn", label: t("earn"), icon: "💰" },
    { href: "/vault", label: t("vault"), icon: "🏦" },
  ];

  return (
    <>
      {/* Hamburger Button - Only visible on mobile */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="lg:hidden p-2 rounded-lg bg-slate-800 hover:bg-slate-700 transition-colors"
        aria-label="Toggle menu"
      >
        <div className="w-5 h-4 relative flex flex-col justify-between">
          <span
            className={`w-full h-0.5 bg-slate-300 rounded-full transition-all duration-300 ${
              isOpen ? "rotate-45 translate-y-1.5" : ""
            }`}
          />
          <span
            className={`w-full h-0.5 bg-slate-300 rounded-full transition-all duration-300 ${
              isOpen ? "opacity-0" : ""
            }`}
          />
          <span
            className={`w-full h-0.5 bg-slate-300 rounded-full transition-all duration-300 ${
              isOpen ? "-rotate-45 -translate-y-1.5" : ""
            }`}
          />
        </div>
      </button>

      {/* Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Slide-out Menu */}
      <div
        className={`
          fixed top-0 right-0 h-full w-72 bg-slate-900 border-l border-slate-800
          z-50 lg:hidden transform transition-transform duration-300 ease-out
          ${isOpen ? "translate-x-0" : "translate-x-full"}
        `}
      >
        {/* Menu Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-800">
          <span className="text-lg font-semibold text-white">{t("menu")}</span>
          <button
            onClick={() => setIsOpen(false)}
            className="p-2 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Navigation Links */}
        <nav className="p-4 space-y-2">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setIsOpen(false)}
              className={`
                flex items-center gap-3 px-4 py-3 rounded-xl transition-colors
                ${currentPath === item.href
                  ? "bg-[#d4a574]/20 text-[#d4a574]"
                  : "text-slate-300 hover:bg-slate-800"
                }
              `}
            >
              <span className="text-xl">{item.icon}</span>
              <span className="font-medium">{item.label}</span>
            </Link>
          ))}
        </nav>

        {/* Divider */}
        <div className="mx-4 border-t border-slate-800" />

        {/* Security Links */}
        <div className="p-4 space-y-2">
          <p className="px-4 text-xs font-medium text-slate-500 uppercase tracking-wider mb-2">
            {t("security")}
          </p>
          <button
            onClick={() => {
              setIsOpen(false);
              // Dispatch custom event for security modal
              window.dispatchEvent(new CustomEvent("openSecurity"));
            }}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-slate-300 hover:bg-slate-800 transition-colors text-left"
          >
            <span className="text-xl">🛡️</span>
            <span className="font-medium">{t("security")}</span>
          </button>
          <button
            onClick={() => {
              setIsOpen(false);
              // Dispatch custom event for advanced security modal
              window.dispatchEvent(new CustomEvent("openAdvancedSecurity"));
            }}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-slate-300 hover:bg-slate-800 transition-colors text-left"
          >
            <span className="text-xl">🔐</span>
            <span className="font-medium">{t("advancedSecurity")}</span>
          </button>
        </div>
      </div>
    </>
  );
}

/**
 * Mobile Bottom Navigation
 * Sabit alt navigasyon barı
 */

interface MobileBottomNavProps {
  currentPath?: string;
  onSecurityClick?: () => void;
}

export function MobileBottomNav({ currentPath = "/", onSecurityClick }: MobileBottomNavProps) {
  const { lang } = useLanguage();
  const t = (key: string) => (translations as any)[lang]?.[key] || (translations as any).en[key] || key;

  const navItems = [
    { href: "/", label: t("markets"), icon: "📊" },
    { href: "/earn", label: t("earn"), icon: "💰" },
    { href: "/vault", label: t("vault"), icon: "🏦" },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-slate-900/95 backdrop-blur-lg border-t border-slate-800 z-40 lg:hidden safe-area-bottom">
      <div className="flex items-center justify-around py-2">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`flex flex-col items-center gap-1 px-4 py-2 rounded-lg transition-colors ${
              currentPath === item.href
                ? "text-[#d4a574]"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <span className="text-xl">{item.icon}</span>
            <span className="text-xs font-medium">{item.label}</span>
          </Link>
        ))}
        <button
          onClick={onSecurityClick}
          className="flex flex-col items-center gap-1 px-4 py-2 rounded-lg text-slate-400 hover:text-slate-200 transition-colors"
        >
          <span className="text-xl">🛡️</span>
          <span className="text-xs font-medium">{t("security")}</span>
        </button>
      </div>
    </nav>
  );
}
