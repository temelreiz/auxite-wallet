"use client";

import { ReactNode } from "react";

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
          className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg transition-colors"
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
  lang?: "tr" | "en";
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
};

export function ErrorState({ title, message, onRetry, lang = "tr" }: ErrorStateProps) {
  const texts = errorTexts[lang];

  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mb-4">
        <svg className="w-8 h-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      </div>
      <h3 className="text-lg font-medium text-white mb-2">{title || texts.title}</h3>
      <p className="text-slate-400 max-w-sm mb-4">{message || texts.message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          {texts.retry}
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
  lang?: "tr" | "en";
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

export function NoDataState({ type, lang = "tr", onAction }: NoDataStateProps) {
  const texts = noDataTexts[lang][type];
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
