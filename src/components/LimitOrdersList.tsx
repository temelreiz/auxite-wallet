// components/LimitOrdersList.tsx
// Reusable component for displaying limit orders

"use client";

import { useState } from 'react';
import { useLimitOrders, LimitOrder } from '@/hooks/useLimitOrders';

interface LimitOrdersListProps {
  address?: string;
  walletAddress?: string; // Alias for address
  metal?: string;
  compact?: boolean; // Mini view for TradePanel
  lang?: 'tr' | 'en' | 'de' | 'fr' | 'ar' | 'ru';
  onOrderCancelled?: () => void;
}

// Metal bilgileri - gerçek ikonlar ile
const METAL_INFO: Record<string, { icon: string; name: Record<string, string>; color: string }> = {
  AUXG: { 
    icon: '/gold-favicon-32x32.png', 
    name: { tr: 'Altın', en: 'Gold', de: 'Gold', fr: 'Or', ar: 'ذهب', ru: 'Золото' },
    color: '#FFD700' 
  },
  AUXS: { 
    icon: '/silver-favicon-32x32.png', 
    name: { tr: 'Gümüş', en: 'Silver', de: 'Silber', fr: 'Argent', ar: 'فضة', ru: 'Серебро' },
    color: '#C0C0C0' 
  },
  AUXPT: { 
    icon: '/platinum-favicon-32x32.png', 
    name: { tr: 'Platin', en: 'Platinum', de: 'Platin', fr: 'Platine', ar: 'بلاتين', ru: 'Платина' },
    color: '#E5E4E2' 
  },
  AUXPD: { 
    icon: '/palladium-favicon-32x32.png', 
    name: { tr: 'Paladyum', en: 'Palladium', de: 'Palladium', fr: 'Palladium', ar: 'بالاديوم', ru: 'Палладий' },
    color: '#CED0DD' 
  },
};

// 6-language translations
const translations: Record<string, Record<string, string>> = {
  tr: {
    title: 'Bekleyen Emirler',
    noOrders: 'Bekleyen emir yok',
    cancel: 'İptal',
    cancelling: 'İptal ediliyor...',
    buy: 'AL',
    sell: 'SAT',
    expires: 'Bitiş',
    loading: 'Yükleniyor...',
    refresh: 'Yenile',
    amount: 'Miktar',
    limitPrice: 'Limit Fiyat',
    total: 'Toplam',
    expired: 'Süresi doldu',
  },
  en: {
    title: 'Open Orders',
    noOrders: 'No open orders',
    cancel: 'Cancel',
    cancelling: 'Cancelling...',
    buy: 'BUY',
    sell: 'SELL',
    expires: 'Expires',
    loading: 'Loading...',
    refresh: 'Refresh',
    amount: 'Amount',
    limitPrice: 'Limit Price',
    total: 'Total',
    expired: 'Expired',
  },
  de: {
    title: 'Offene Aufträge',
    noOrders: 'Keine offenen Aufträge',
    cancel: 'Stornieren',
    cancelling: 'Wird storniert...',
    buy: 'KAUFEN',
    sell: 'VERKAUFEN',
    expires: 'Läuft ab',
    loading: 'Wird geladen...',
    refresh: 'Aktualisieren',
    amount: 'Menge',
    limitPrice: 'Limitpreis',
    total: 'Gesamt',
    expired: 'Abgelaufen',
  },
  fr: {
    title: 'Ordres en Attente',
    noOrders: 'Aucun ordre en attente',
    cancel: 'Annuler',
    cancelling: 'Annulation...',
    buy: 'ACHAT',
    sell: 'VENTE',
    expires: 'Expire',
    loading: 'Chargement...',
    refresh: 'Actualiser',
    amount: 'Quantité',
    limitPrice: 'Prix Limite',
    total: 'Total',
    expired: 'Expiré',
  },
  ar: {
    title: 'الأوامر المعلقة',
    noOrders: 'لا توجد أوامر معلقة',
    cancel: 'إلغاء',
    cancelling: 'جاري الإلغاء...',
    buy: 'شراء',
    sell: 'بيع',
    expires: 'ينتهي',
    loading: 'جاري التحميل...',
    refresh: 'تحديث',
    amount: 'الكمية',
    limitPrice: 'السعر المحدد',
    total: 'المجموع',
    expired: 'منتهي الصلاحية',
  },
  ru: {
    title: 'Открытые Ордера',
    noOrders: 'Нет открытых ордеров',
    cancel: 'Отмена',
    cancelling: 'Отменяется...',
    buy: 'КУПИТЬ',
    sell: 'ПРОДАТЬ',
    expires: 'Истекает',
    loading: 'Загрузка...',
    refresh: 'Обновить',
    amount: 'Количество',
    limitPrice: 'Лимитная Цена',
    total: 'Итого',
    expired: 'Истёк',
  },
};

export function LimitOrdersList({
  address,
  walletAddress,
  metal,
  compact = false,
  lang = 'en',
  onOrderCancelled,
}: LimitOrdersListProps) {
  // Support both address and walletAddress props
  const userAddress = address || walletAddress;
  
  const { orders, loading, error, cancelOrder, refresh } = useLimitOrders({
    address: userAddress,
    metal,
    status: 'pending',
  });

  const [cancellingId, setCancellingId] = useState<string | null>(null);

  const t = translations[lang] || translations.en;

  const handleCancel = async (orderId: string) => {
    setCancellingId(orderId);
    const success = await cancelOrder(orderId);
    setCancellingId(null);
    if (success && onOrderCancelled) {
      onOrderCancelled();
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const localeMap: Record<string, string> = {
      tr: 'tr-TR', en: 'en-US', de: 'de-DE', fr: 'fr-FR', ar: 'ar-SA', ru: 'ru-RU'
    };
    return date.toLocaleDateString(localeMap[lang] || 'en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getTimeRemaining = (expiresAt: string) => {
    const now = new Date();
    const expires = new Date(expiresAt);
    const diff = expires.getTime() - now.getTime();
    
    if (diff <= 0) return t.expired;
    
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    
    if (days > 0) return `${days}d ${hours}h`;
    return `${hours}h`;
  };

  // Render metal icon
  const renderMetalIcon = (metalSymbol: string, size: 'sm' | 'md' = 'md') => {
    const metalInfo = METAL_INFO[metalSymbol];
    const sizeClass = size === 'sm' ? 'w-4 h-4 sm:w-5 sm:h-5' : 'w-5 h-5 sm:w-6 sm:h-6';
    
    if (metalInfo) {
      return (
        <img 
          src={metalInfo.icon} 
          alt={metalSymbol} 
          className={sizeClass}
        />
      );
    }
    
    // Fallback for unknown metals
    return (
      <div 
        className={`${sizeClass} rounded-full bg-slate-300 dark:bg-slate-600 flex items-center justify-center text-[10px] sm:text-xs font-bold text-slate-600 dark:text-slate-300`}
      >
        {metalSymbol.slice(0, 2)}
      </div>
    );
  };

  if (loading && orders.length === 0) {
    return (
      <div className={`${compact ? 'p-2 sm:p-3' : 'p-3 sm:p-4'} text-center text-slate-500 dark:text-slate-400`}>
        <div className="animate-spin w-4 h-4 sm:w-5 sm:h-5 border-2 border-stone-300 dark:border-slate-600 border-t-[#BFA181] rounded-full mx-auto mb-2"></div>
        <span className="text-xs sm:text-sm">{t.loading}</span>
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className={`${compact ? 'p-2 sm:p-3' : 'p-3 sm:p-4'} text-center text-slate-500 dark:text-slate-400`}>
        <div className="text-xl sm:text-2xl mb-2">📋</div>
        <p className="text-xs sm:text-sm">{t.noOrders}</p>
      </div>
    );
  }

  // Compact view for TradePanel - Responsive
  if (compact) {
    return (
      <div className="space-y-1.5 sm:space-y-2">
        <div className="flex items-center justify-between px-1">
          <span className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400 font-medium">{t.title} ({orders.length})</span>
          <button
            onClick={refresh}
            disabled={loading}
            className="text-[10px] sm:text-xs text-[#2F6F62] dark:text-[#2F6F62] hover:text-[#2F6F62] dark:hover:text-[#BFA181]"
          >
            {t.refresh}
          </button>
        </div>
        
        <div className="max-h-28 sm:max-h-32 overflow-y-auto space-y-1">
          {orders.map((order) => (
            <div
              key={order.id}
              className="flex items-center justify-between p-1.5 sm:p-2 bg-stone-100 dark:bg-slate-800/50 rounded-lg text-[10px] sm:text-xs"
            >
              <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
                {renderMetalIcon(order.metal, 'sm')}
                <span className={`px-1 sm:px-1.5 py-0.5 rounded text-[8px] sm:text-[10px] font-bold ${
                  order.type === 'buy' 
                    ? 'bg-[#2F6F62]/20 text-[#2F6F62] dark:text-[#2F6F62]' 
                    : 'bg-red-500/20 text-red-600 dark:text-red-400'
                }`}>
                  {order.type === 'buy' ? t.buy : t.sell}
                </span>
                <span className="text-slate-800 dark:text-white font-mono truncate">
                  {order.grams}g @ ${order.limitPrice}
                </span>
              </div>
              
              <button
                onClick={() => handleCancel(order.id)}
                disabled={cancellingId === order.id}
                className="text-red-500 dark:text-red-400 hover:text-red-600 dark:hover:text-red-300 disabled:opacity-50 flex-shrink-0 ml-1 p-1"
              >
                {cancellingId === order.id ? '...' : '✕'}
              </button>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Full view for TradingDetailPage - Responsive
  return (
    <div className="space-y-2 sm:space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-xs sm:text-sm font-medium text-slate-600 dark:text-slate-300">{t.title}</h3>
        <button
          onClick={refresh}
          disabled={loading}
          className="text-[10px] sm:text-xs text-[#2F6F62] dark:text-[#2F6F62] hover:text-[#2F6F62] dark:hover:text-[#BFA181] disabled:opacity-50"
        >
          {loading ? '...' : t.refresh}
        </button>
      </div>

      <div className="space-y-2">
        {orders.map((order) => {
          const metalInfo = METAL_INFO[order.metal];
          const metalName = metalInfo?.name[lang] || order.metal;
          
          return (
            <div
              key={order.id}
              className="p-2.5 sm:p-3 bg-white dark:bg-slate-800/50 rounded-xl border border-stone-200 dark:border-slate-700 hover:border-stone-300 dark:hover:border-slate-600 transition-colors"
            >
              <div className="flex items-center justify-between mb-2 gap-2">
                <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
                  {renderMetalIcon(order.metal)}
                  <span className={`px-1.5 sm:px-2 py-0.5 rounded text-[10px] sm:text-xs font-bold ${
                    order.type === 'buy' 
                      ? 'bg-[#2F6F62]/20 text-[#2F6F62] dark:text-[#2F6F62]' 
                      : 'bg-red-500/20 text-red-600 dark:text-red-400'
                  }`}>
                    {order.type === 'buy' ? t.buy : t.sell}
                  </span>
                  <span className="text-slate-800 dark:text-white font-medium text-sm sm:text-base">{order.metal}</span>
                </div>
                
                <button
                  onClick={() => handleCancel(order.id)}
                  disabled={cancellingId === order.id}
                  className={`px-2 sm:px-3 py-1 rounded-lg text-[10px] sm:text-xs font-medium transition-colors flex-shrink-0 ${
                    cancellingId === order.id
                      ? 'bg-stone-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400'
                      : 'bg-red-500/20 text-red-600 dark:text-red-400 hover:bg-red-500/30'
                  }`}
                >
                  {cancellingId === order.id ? t.cancelling : t.cancel}
                </button>
              </div>

              {/* Grid - Responsive: stack on very small screens */}
              <div className="grid grid-cols-3 gap-1.5 sm:gap-2 text-xs sm:text-sm">
                <div className="min-w-0">
                  <span className="text-slate-500 dark:text-slate-400 text-[10px] sm:text-xs block">{t.amount}</span>
                  <span className="text-slate-800 dark:text-white font-mono truncate block">{order.grams}g</span>
                </div>
                <div className="min-w-0">
                  <span className="text-slate-500 dark:text-slate-400 text-[10px] sm:text-xs block">{t.limitPrice}</span>
                  <span className="text-slate-800 dark:text-white font-mono truncate block">${order.limitPrice.toFixed(2)}</span>
                </div>
                <div className="min-w-0">
                  <span className="text-slate-500 dark:text-slate-400 text-[10px] sm:text-xs block">{t.total}</span>
                  <span className="text-slate-800 dark:text-white font-mono truncate block">${(order.grams * order.limitPrice).toFixed(2)}</span>
                </div>
              </div>

              <div className="flex flex-col xs:flex-row xs:items-center justify-between mt-2 pt-2 border-t border-stone-200 dark:border-slate-700/50 text-[10px] sm:text-xs gap-1">
                <span className="text-slate-500 dark:text-slate-400">
                  {t.expires}: {getTimeRemaining(order.expiresAt)}
                </span>
                <span className="text-slate-400 dark:text-slate-500 font-mono truncate">
                  {order.id.slice(0, 12)}...
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default LimitOrdersList;
