"use client";

import { useState } from "react";
import { MultiSigSettings } from "./MultiSigSettings";
import { TransactionLimitsSettings } from "./TransactionLimits";
import { EmergencySettings } from "./EmergencySettings";

interface Props {
  walletAddress: string;
  lang: "tr" | "en" | "de" | "fr" | "ar" | "ru";
  onClose: () => void;
}

const t = {
  tr: {
    title: "Gelişmiş Güvenlik",
    tabs: {
      multisig: "Çoklu İmza",
      limits: "Limitler",
      emergency: "Acil",
      insurance: "Sigorta",
    },
    insurance: {
      title: "Varlık Sigortası",
      subtitle: "Varlıklarınız için koruma",
      comingSoon: "Yakında",
      description: "Varlık sigortası özelliği yakında aktif olacak. Bu özellik ile:",
      features: [
        "Hack ve güvenlik ihlallerine karşı koruma",
        "Smart contract hatalarına karşı sigorta",
        "Çalınma durumunda tazminat",
        "7/24 güvenlik izleme",
      ],
      notifyMe: "Beni Bilgilendir",
      notified: "Bilgilendirileceksiniz",
    },
  },
  en: {
    title: "Advanced Security",
    tabs: {
      multisig: "Multi-Sig",
      limits: "Limits",
      emergency: "Emergency",
      insurance: "Insurance",
    },
    insurance: {
      title: "Asset Insurance",
      subtitle: "Protection for your assets",
      comingSoon: "Coming Soon",
      description: "Asset insurance feature will be available soon. This feature includes:",
      features: [
        "Protection against hacks and security breaches",
        "Smart contract failure insurance",
        "Compensation in case of theft",
        "24/7 security monitoring",
      ],
      notifyMe: "Notify Me",
      notified: "You'll be notified",
    },
  },
  de: {
    title: "Erweiterte Sicherheit",
    tabs: {
      multisig: "Multi-Sig",
      limits: "Limits",
      emergency: "Notfall",
      insurance: "Versicherung",
    },
    insurance: {
      title: "Vermögensversicherung",
      subtitle: "Schutz für Ihre Vermögenswerte",
      comingSoon: "Demnächst",
      description: "Die Vermögensversicherung wird bald verfügbar sein. Diese Funktion beinhaltet:",
      features: [
        "Schutz vor Hacks und Sicherheitsverletzungen",
        "Smart-Contract-Ausfallversicherung",
        "Entschädigung bei Diebstahl",
        "24/7 Sicherheitsüberwachung",
      ],
      notifyMe: "Benachrichtigen",
      notified: "Sie werden benachrichtigt",
    },
  },
  fr: {
    title: "Sécurité Avancée",
    tabs: {
      multisig: "Multi-Sig",
      limits: "Limites",
      emergency: "Urgence",
      insurance: "Assurance",
    },
    insurance: {
      title: "Assurance des Actifs",
      subtitle: "Protection de vos actifs",
      comingSoon: "Bientôt",
      description: "La fonction d'assurance des actifs sera bientôt disponible. Cette fonction comprend:",
      features: [
        "Protection contre les piratages et les violations de sécurité",
        "Assurance contre les défaillances de smart contract",
        "Indemnisation en cas de vol",
        "Surveillance de sécurité 24/7",
      ],
      notifyMe: "Me Notifier",
      notified: "Vous serez notifié",
    },
  },
  ar: {
    title: "الأمان المتقدم",
    tabs: {
      multisig: "توقيع متعدد",
      limits: "الحدود",
      emergency: "طوارئ",
      insurance: "تأمين",
    },
    insurance: {
      title: "تأمين الأصول",
      subtitle: "حماية لأصولك",
      comingSoon: "قريباً",
      description: "ستتوفر ميزة تأمين الأصول قريباً. تشمل هذه الميزة:",
      features: [
        "الحماية من الاختراقات والانتهاكات الأمنية",
        "تأمين ضد فشل العقود الذكية",
        "تعويض في حالة السرقة",
        "مراقبة أمنية على مدار الساعة",
      ],
      notifyMe: "أبلغني",
      notified: "سيتم إبلاغك",
    },
  },
  ru: {
    title: "Расширенная Безопасность",
    tabs: {
      multisig: "Мульти-Подпись",
      limits: "Лимиты",
      emergency: "Экстренный",
      insurance: "Страхование",
    },
    insurance: {
      title: "Страхование Активов",
      subtitle: "Защита ваших активов",
      comingSoon: "Скоро",
      description: "Функция страхования активов скоро будет доступна. Эта функция включает:",
      features: [
        "Защита от взломов и нарушений безопасности",
        "Страхование от сбоев смарт-контрактов",
        "Компенсация в случае кражи",
        "Круглосуточный мониторинг безопасности",
      ],
      notifyMe: "Уведомить меня",
      notified: "Вы будете уведомлены",
    },
  },
};

type TabType = "multisig" | "limits" | "emergency" | "insurance";

export function AdvancedSecurityModal({ walletAddress, lang, onClose }: Props) {
  const [activeTab, setActiveTab] = useState<TabType>("multisig");
  const [insuranceNotified, setInsuranceNotified] = useState(false);

  const labels = (t as Record<string, typeof t.en>)[lang] || t.en;

  const tabs: { id: TabType; label: string; icon: string }[] = [
    { id: "multisig", label: labels.tabs.multisig, icon: "👥" },
    { id: "limits", label: labels.tabs.limits, icon: "📊" },
    { id: "emergency", label: labels.tabs.emergency, icon: "🚨" },
    { id: "insurance", label: labels.tabs.insurance, icon: "🛡️" },
  ];

  const handleNotifyInsurance = async () => {
    // TODO: API call to save notification preference
    setInsuranceNotified(true);
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-2 sm:p-4">
      <div className="bg-slate-900 rounded-xl sm:rounded-2xl w-full max-w-[calc(100vw-16px)] sm:max-w-3xl max-h-[95vh] sm:max-h-[90vh] overflow-hidden border border-slate-700 shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-slate-700">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-gradient-to-br from-amber-500 to-red-500 flex items-center justify-center flex-shrink-0">
              <svg className="w-4 h-4 sm:w-5 sm:h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h2 className="text-base sm:text-xl font-bold text-white">{labels.title}</h2>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-slate-800 hover:bg-slate-700 flex items-center justify-center transition-colors touch-manipulation"
          >
            <svg className="w-4 h-4 sm:w-5 sm:h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-700 overflow-x-auto scrollbar-hide">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 min-w-[70px] py-3 sm:py-4 px-2 sm:px-4 text-xs sm:text-sm font-medium transition-colors relative touch-manipulation ${
                activeTab === tab.id
                  ? "text-white"
                  : "text-slate-400 hover:text-slate-300"
              }`}
            >
              <span className="flex items-center justify-center gap-1 sm:gap-2">
                <span className="text-sm sm:text-base">{tab.icon}</span>
                <span className="truncate">{tab.label}</span>
              </span>
              {activeTab === tab.id && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-amber-500 to-red-500" />
              )}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 p-4 sm:p-6 overflow-y-auto">
          {activeTab === "multisig" && (
            <MultiSigSettings walletAddress={walletAddress} lang={lang} />
          )}

          {activeTab === "limits" && (
            <TransactionLimitsSettings walletAddress={walletAddress} lang={lang} />
          )}

          {activeTab === "emergency" && (
            <EmergencySettings walletAddress={walletAddress} lang={lang} />
          )}

          {activeTab === "insurance" && (
            <div className="text-center py-6 sm:py-12">
              <div className="w-16 h-16 sm:w-24 sm:h-24 mx-auto mb-4 sm:mb-6 rounded-full bg-gradient-to-br from-emerald-500/20 to-blue-500/20 flex items-center justify-center">
                <span className="text-3xl sm:text-5xl">🛡️</span>
              </div>
              
              <span className="inline-block px-3 sm:px-4 py-1 sm:py-1.5 bg-emerald-500/20 text-emerald-400 rounded-full text-xs sm:text-sm font-medium mb-3 sm:mb-4">
                {labels.insurance.comingSoon}
              </span>
              
              <h3 className="text-xl sm:text-2xl font-bold text-white mb-2">
                {labels.insurance.title}
              </h3>
              <p className="text-sm sm:text-base text-slate-400 mb-6 sm:mb-8">
                {labels.insurance.subtitle}
              </p>

              <div className="max-w-md mx-auto text-left bg-slate-800/50 rounded-xl p-4 sm:p-6 border border-slate-700 mb-6 sm:mb-8">
                <p className="text-sm sm:text-base text-slate-300 mb-3 sm:mb-4">{labels.insurance.description}</p>
                <ul className="space-y-2 sm:space-y-3">
                  {labels.insurance.features.map((feature, i) => (
                    <li key={i} className="flex items-start gap-2 sm:gap-3 text-xs sm:text-sm text-slate-400">
                      <svg className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <button
                onClick={handleNotifyInsurance}
                disabled={insuranceNotified}
                className={`px-6 sm:px-8 py-2.5 sm:py-3 rounded-xl text-sm sm:text-base font-medium transition-all touch-manipulation ${
                  insuranceNotified
                    ? "bg-emerald-500/20 text-emerald-400 cursor-default"
                    : "bg-gradient-to-r from-emerald-500 to-blue-500 text-white hover:opacity-90 active:scale-95"
                }`}
              >
                {insuranceNotified ? (
                  <span className="flex items-center gap-2">
                    <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    {labels.insurance.notified}
                  </span>
                ) : (
                  labels.insurance.notifyMe
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
