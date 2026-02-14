"use client";

import { ReactNode } from "react";
import { useLanguage } from "@/components/LanguageContext";

/**
 * Empty State Component
 * Veri olmadığında veya hata durumlarında gösterilir
 */

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      {icon && (
        <div className="w-16 h-16 rounded-full bg-slate-800 flex items-center justify-center mb-4">
          {icon}
        </div>
      )}
      <h3 className="text-lg font-medium text-white mb-2">{title}</h3>
      {description && (
        <p className="text-slate-400 max-w-sm mb-4">{description}</p>
      )}
      {action && (
        <button
          onClick={action.onClick}
          className="px-4 py-2 bg-[#2F6F62] hover:bg-[#2F6F62] text-white rounded-lg transition-colors"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}

/**
 * Error State Component
 * Hata durumlarında gösterilir
 */

interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
}

const errorTexts = {
  tr: {
    title: "Bir hata oluştu",
    message: "Lütfen daha sonra tekrar deneyin.",
    retry: "Tekrar Dene",
  },
  en: {
    title: "Something went wrong",
    message: "Please try again later.",
    retry: "Try Again",
  },
  de: {
    title: "Etwas ist schiefgelaufen",
    message: "Bitte versuchen Sie es später erneut.",
    retry: "Erneut versuchen",
  },
  fr: {
    title: "Une erreur est survenue",
    message: "Veuillez réessayer plus tard.",
    retry: "Réessayer",
  },
  ar: {
    title: "حدث خطأ ما",
    message: "يرجى المحاولة مرة أخرى لاحقاً.",
    retry: "إعادة المحاولة",
  },
  ru: {
    title: "Что-то пошло не так",
    message: "Пожалуйста, попробуйте позже.",
    retry: "Повторить",
  },
};

export function ErrorState({ title, message, onRetry }: ErrorStateProps) {
  const { lang } = useLanguage();
  const t = (key: string) => (errorTexts as any)[lang]?.[key] || (errorTexts as any).en[key] || key;

  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mb-4">
        <svg className="w-8 h-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      </div>
      <h3 className="text-lg font-medium text-white mb-2">{title || t("title")}</h3>
      <p className="text-slate-400 max-w-sm mb-4">{message || t("message")}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          {t("retry")}
        </button>
      )}
    </div>
  );
}

/**
 * No Data State
 * Hiç veri olmadığında
 */

interface NoDataStateProps {
  type: "transactions" | "assets" | "devices" | "sessions" | "logs";
  onAction?: () => void;
}

const noDataTexts = {
  tr: {
    transactions: {
      title: "İşlem Geçmişi Boş",
      description: "Henüz bir işlem yapmadınız.",
      action: "İlk İşleminizi Yapın",
    },
    assets: {
      title: "Varlık Bulunamadı",
      description: "Portföyünüzde henüz varlık yok.",
      action: "Yatırım Yapın",
    },
    devices: {
      title: "Kayıtlı Cihaz Yok",
      description: "Güvenilir cihaz eklenmemiş.",
      action: "Cihaz Ekle",
    },
    sessions: {
      title: "Aktif Oturum Yok",
      description: "Şu anda aktif oturum bulunmuyor.",
      action: null,
    },
    logs: {
      title: "Güvenlik Logu Yok",
      description: "Henüz güvenlik kaydı bulunmuyor.",
      action: null,
    },
  },
  en: {
    transactions: {
      title: "No Transaction History",
      description: "You haven't made any transactions yet.",
      action: "Make Your First Transaction",
    },
    assets: {
      title: "No Assets Found",
      description: "You don't have any assets in your portfolio.",
      action: "Make a Deposit",
    },
    devices: {
      title: "No Registered Devices",
      description: "No trusted devices have been added.",
      action: "Add Device",
    },
    sessions: {
      title: "No Active Sessions",
      description: "There are no active sessions at the moment.",
      action: null,
    },
    logs: {
      title: "No Security Logs",
      description: "No security records found yet.",
      action: null,
    },
  },
  de: {
    transactions: {
      title: "Kein Transaktionsverlauf",
      description: "Sie haben noch keine Transaktionen durchgeführt.",
      action: "Erste Transaktion durchführen",
    },
    assets: {
      title: "Keine Vermögenswerte gefunden",
      description: "Sie haben noch keine Vermögenswerte in Ihrem Portfolio.",
      action: "Einzahlung vornehmen",
    },
    devices: {
      title: "Keine registrierten Geräte",
      description: "Es wurden keine vertrauenswürdigen Geräte hinzugefügt.",
      action: "Gerät hinzufügen",
    },
    sessions: {
      title: "Keine aktiven Sitzungen",
      description: "Derzeit gibt es keine aktiven Sitzungen.",
      action: null,
    },
    logs: {
      title: "Keine Sicherheitsprotokolle",
      description: "Noch keine Sicherheitsaufzeichnungen gefunden.",
      action: null,
    },
  },
  fr: {
    transactions: {
      title: "Aucun historique de transactions",
      description: "Vous n'avez encore effectué aucune transaction.",
      action: "Effectuer votre première transaction",
    },
    assets: {
      title: "Aucun actif trouvé",
      description: "Vous n'avez aucun actif dans votre portefeuille.",
      action: "Effectuer un dépôt",
    },
    devices: {
      title: "Aucun appareil enregistré",
      description: "Aucun appareil de confiance n'a été ajouté.",
      action: "Ajouter un appareil",
    },
    sessions: {
      title: "Aucune session active",
      description: "Il n'y a aucune session active pour le moment.",
      action: null,
    },
    logs: {
      title: "Aucun journal de sécurité",
      description: "Aucun enregistrement de sécurité trouvé.",
      action: null,
    },
  },
  ar: {
    transactions: {
      title: "لا يوجد سجل معاملات",
      description: "لم تقم بأي معاملات بعد.",
      action: "قم بأول معاملة لك",
    },
    assets: {
      title: "لم يتم العثور على أصول",
      description: "ليس لديك أي أصول في محفظتك.",
      action: "قم بالإيداع",
    },
    devices: {
      title: "لا توجد أجهزة مسجلة",
      description: "لم تتم إضافة أجهزة موثوقة.",
      action: "إضافة جهاز",
    },
    sessions: {
      title: "لا توجد جلسات نشطة",
      description: "لا توجد جلسات نشطة حالياً.",
      action: null,
    },
    logs: {
      title: "لا توجد سجلات أمان",
      description: "لم يتم العثور على سجلات أمان بعد.",
      action: null,
    },
  },
  ru: {
    transactions: {
      title: "Нет истории транзакций",
      description: "Вы ещё не совершали транзакций.",
      action: "Совершите первую транзакцию",
    },
    assets: {
      title: "Активы не найдены",
      description: "В вашем портфеле пока нет активов.",
      action: "Внести депозит",
    },
    devices: {
      title: "Нет зарегистрированных устройств",
      description: "Доверенные устройства не добавлены.",
      action: "Добавить устройство",
    },
    sessions: {
      title: "Нет активных сессий",
      description: "В данный момент нет активных сессий.",
      action: null,
    },
    logs: {
      title: "Нет журналов безопасности",
      description: "Записи безопасности пока не найдены.",
      action: null,
    },
  },
};

const noDataIcons = {
  transactions: (
    <svg className="w-8 h-8 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
    </svg>
  ),
  assets: (
    <svg className="w-8 h-8 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
    </svg>
  ),
  devices: (
    <svg className="w-8 h-8 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
    </svg>
  ),
  sessions: (
    <svg className="w-8 h-8 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
    </svg>
  ),
  logs: (
    <svg className="w-8 h-8 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  ),
};

export function NoDataState({ type, onAction }: NoDataStateProps) {
  const { lang } = useLanguage();
  const texts = (noDataTexts as any)[lang]?.[type] || noDataTexts.en[type];
  const icon = noDataIcons[type];

  return (
    <EmptyState
      icon={icon}
      title={texts.title}
      description={texts.description}
      action={texts.action && onAction ? { label: texts.action, onClick: onAction } : undefined}
    />
  );
}
