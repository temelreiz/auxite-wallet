"use client";

import { useLanguage } from "@/components/LanguageContext";

// ============================================
// GLOBAL TRUST BAR - PRIORITY 3
// Trust First UX - 2 saniyede güven üretir
// ============================================

const translations: Record<string, Record<string, string>> = {
  tr: {
    fullyAllocated: "Tam Allocate Edilmiş",
    independentCustody: "Bağımsız Saklama",
    bankruptcyRemote: "İflas Korumalı",
    auditedReserves: "Denetlenmiş Rezervler",
  },
  en: {
    fullyAllocated: "Fully Allocated",
    independentCustody: "Independent Custody",
    bankruptcyRemote: "Bankruptcy Remote",
    auditedReserves: "Audited Reserves",
  },
  de: {
    fullyAllocated: "Vollständig Allokiert",
    independentCustody: "Unabhängige Verwahrung",
    bankruptcyRemote: "Insolvenzgeschützt",
    auditedReserves: "Geprüfte Reserven",
  },
  fr: {
    fullyAllocated: "Entièrement Alloué",
    independentCustody: "Garde Indépendante",
    bankruptcyRemote: "Protection Faillite",
    auditedReserves: "Réserves Auditées",
  },
  ar: {
    fullyAllocated: "مخصص بالكامل",
    independentCustody: "حفظ مستقل",
    bankruptcyRemote: "حماية من الإفلاس",
    auditedReserves: "احتياطيات مدققة",
  },
  ru: {
    fullyAllocated: "Полностью Размещено",
    independentCustody: "Независимое Хранение",
    bankruptcyRemote: "Защита от Банкротства",
    auditedReserves: "Проверенные Резервы",
  },
};

export function GlobalTrustBar() {
  const { lang } = useLanguage();
  const t = translations[lang] || translations.en;

  const trustSignals = [
    { key: "fullyAllocated", icon: "✓" },
    { key: "independentCustody", icon: "✓" },
    { key: "bankruptcyRemote", icon: "✓" },
    { key: "auditedReserves", icon: "✓" },
  ];

  return (
    <div className="global-trust-bar">
      {trustSignals.map((signal) => (
        <div key={signal.key} className="trust-signal">
          <svg
            className="trust-signal-icon"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M5 13l4 4L19 7"
            />
          </svg>
          <span>{t[signal.key as keyof typeof t]}</span>
        </div>
      ))}
    </div>
  );
}

export default GlobalTrustBar;
