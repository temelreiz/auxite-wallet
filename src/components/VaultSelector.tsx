"use client";

import { useState } from "react";
import { useLanguage } from "@/components/LanguageContext";

// ============================================
// VAULT SELECTOR - PRIORITY 4
// Allocation sırasında vault seçimi
// Algıyı anında büyütür - startup hissi ölür
// ============================================

interface VaultOption {
  id: string;
  name: string;
  location: string;
  flag: string;
  insuranceLevel: string;
  available: boolean;
  status?: "on-hold" | "coming-soon";
}

const vaultOptions: VaultOption[] = [
  {
    id: "zurich",
    name: "Zurich",
    location: "Switzerland",
    flag: "🇨🇭",
    insuranceLevel: "Full",
    available: true,
  },
  {
    id: "london",
    name: "London",
    location: "United Kingdom",
    flag: "🇬🇧",
    insuranceLevel: "Full",
    available: true,
  },
  {
    id: "dubai",
    name: "Dubai",
    location: "UAE",
    flag: "🇦🇪",
    insuranceLevel: "Full",
    available: false,
    status: "on-hold",
  },
  {
    id: "istanbul",
    name: "Istanbul",
    location: "Turkey",
    flag: "🇹🇷",
    insuranceLevel: "Full",
    available: true,
  },
];

const translations: Record<string, Record<string, string>> = {
  tr: {
    selectVault: "Saklama Merkezi Seçin",
    selectVaultDesc: "Varlıklarınız seçilen lokasyonda ayrılmış saklama altında tutulacaktır",
    selectedVault: "Seçilen Kasa",
    insuredCustody: "Sigortalı Saklama",
    segregatedStorage: "Ayrılmış Depolama",
    independentAudit: "Bağımsız Denetim",
    comingSoon: "Yakında",
  },
  en: {
    selectVault: "Select Custody Location",
    selectVaultDesc: "Your assets will be held in segregated custody at the selected location",
    selectedVault: "Selected Vault",
    insuredCustody: "Insured Custody",
    segregatedStorage: "Segregated Storage",
    independentAudit: "Independent Audit",
    comingSoon: "Coming Soon",
  },
  de: {
    selectVault: "Verwahrungsort Wählen",
    selectVaultDesc: "Ihre Vermögenswerte werden am ausgewählten Standort in getrennter Verwahrung gehalten",
    selectedVault: "Ausgewählter Tresor",
    insuredCustody: "Versicherte Verwahrung",
    segregatedStorage: "Getrennte Lagerung",
    independentAudit: "Unabhängige Prüfung",
    comingSoon: "Demnächst",
  },
  fr: {
    selectVault: "Sélectionner le Lieu de Garde",
    selectVaultDesc: "Vos actifs seront conservés en garde séparée à l'emplacement sélectionné",
    selectedVault: "Coffre Sélectionné",
    insuredCustody: "Garde Assurée",
    segregatedStorage: "Stockage Séparé",
    independentAudit: "Audit Indépendant",
    comingSoon: "Bientôt",
  },
  ar: {
    selectVault: "اختر موقع الحفظ",
    selectVaultDesc: "سيتم الاحتفاظ بأصولك في حفظ منفصل في الموقع المحدد",
    selectedVault: "الخزنة المحددة",
    insuredCustody: "حفظ مؤمّن",
    segregatedStorage: "تخزين منفصل",
    independentAudit: "تدقيق مستقل",
    comingSoon: "قريباً",
  },
  ru: {
    selectVault: "Выберите Место Хранения",
    selectVaultDesc: "Ваши активы будут храниться в раздельном хранении в выбранном месте",
    selectedVault: "Выбранное Хранилище",
    insuredCustody: "Застрахованное Хранение",
    segregatedStorage: "Раздельное Хранение",
    independentAudit: "Независимый Аудит",
    comingSoon: "Скоро",
  },
};

interface VaultSelectorProps {
  selectedVault: string;
  onSelect: (vaultId: string) => void;
  compact?: boolean;
}

export function VaultSelector({ selectedVault, onSelect, compact = false }: VaultSelectorProps) {
  const { lang } = useLanguage();
  const t = translations[lang] || translations.en;

  if (compact) {
    return (
      <div className="flex gap-2">
        {vaultOptions.filter(v => v.available).map((vault) => (
          <button
            key={vault.id}
            onClick={() => onSelect(vault.id)}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-all ${
              selectedVault === vault.id
                ? "border-[#2F6F62] bg-[#2F6F62]/10"
                : "border-slate-700 bg-slate-800/50 hover:border-slate-600"
            }`}
          >
            <span className="text-lg">{vault.flag}</span>
            <span className={`text-sm font-medium ${
              selectedVault === vault.id ? "text-[#2F6F62]" : "text-slate-300"
            }`}>
              {vault.name}
            </span>
          </button>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div>
        <h4 className="text-sm font-medium text-slate-200 mb-1">{t.selectVault}</h4>
        <p className="text-xs text-slate-400">{t.selectVaultDesc}</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {vaultOptions.map((vault) => (
          <button
            key={vault.id}
            onClick={() => vault.available && onSelect(vault.id)}
            disabled={!vault.available}
            className={`vault-option relative ${
              selectedVault === vault.id ? "selected" : ""
            } ${!vault.available ? "opacity-50 cursor-not-allowed" : ""}`}
          >
            {!vault.available && (
              <div className={`absolute top-2 right-2 px-2 py-0.5 rounded text-[10px] font-medium ${
                vault.status === "on-hold"
                  ? "bg-amber-900/50 text-amber-400 border border-amber-700/50"
                  : "bg-slate-700 text-slate-400"
              }`}>
                {vault.status === "on-hold" ? "⏸ On Hold" : t.comingSoon}
              </div>
            )}

            <span className="text-2xl">{vault.flag}</span>

            <div className="flex-1">
              <div className="vault-name">{vault.name}</div>
              <div className="vault-location">{vault.location}</div>
            </div>

            {selectedVault === vault.id && (
              <div className="w-5 h-5 rounded-full bg-[#2F6F62] flex items-center justify-center">
                <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              </div>
            )}
          </button>
        ))}
      </div>

      {/* Trust signals for selected vault */}
      {selectedVault && (
        <div className="flex flex-wrap gap-2 pt-2">
          <span className="px-2 py-1 rounded-full text-[10px] font-medium bg-[#2F6F62]/10 text-[#2F6F62] border border-[#2F6F62]/20">
            ✓ {t.insuredCustody}
          </span>
          <span className="px-2 py-1 rounded-full text-[10px] font-medium bg-[#2F6F62]/10 text-[#2F6F62] border border-[#2F6F62]/20">
            ✓ {t.segregatedStorage}
          </span>
          <span className="px-2 py-1 rounded-full text-[10px] font-medium bg-[#2F6F62]/10 text-[#2F6F62] border border-[#2F6F62]/20">
            ✓ {t.independentAudit}
          </span>
        </div>
      )}
    </div>
  );
}

export default VaultSelector;
