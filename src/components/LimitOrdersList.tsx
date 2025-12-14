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
    const sizeClass = size === 'sm' ? 'w-5 h-5' : 'w-6 h-6';
    
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
        className={`${sizeClass} rounded-full bg-slate-300 dark:bg-slate-600 flex items-center justify-center text-xs font-bold text-slate-600 dark:text-slate-300`}
      >
        {metalSymbol.slice(0, 2)}
      </div>
    );
  };

  if (loading && orders.length === 0) {
    return (
      <div className={`${compact ? 'p-3' : 'p-4'} text-center text-slate-500 dark:text-slate-400`}>
        <div className="animate-spin w-5 h-5 border-2 border-stone-300 dark:border-slate-600 border-t-emerald-500 rounded-full mx-auto mb-2"></div>
        {t.loading}
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className={`${compact ? 'p-3' : 'p-4'} text-center text-slate-500 dark:text-slate-400`}>
        <div className="text-2xl mb-2">📋</div>
        <p className="text-sm">{t.noOrders}</p>
      </div>
    );
  }

  // Compact view for TradePanel
  if (compact) {
    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between px-1">
          <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">{t.title} ({orders.length})</span>
          <button
            onClick={refresh}
            disabled={loading}
            className="text-xs text-emerald-600 dark:text-emerald-400 hover:text-emerald-500 dark:hover:text-emerald-300"
          >
            {t.refresh}
          </button>
        </div>
        
        <div className="max-h-32 overflow-y-auto space-y-1">
          {orders.map((order) => (
            <div
              key={order.id}
              className="flex items-center justify-between p-2 bg-stone-100 dark:bg-slate-800/50 rounded-lg text-xs"
            >
              <div className="flex items-center gap-2">
                {renderMetalIcon(order.metal, 'sm')}
                <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                  order.type === 'buy' 
                    ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400' 
                    : 'bg-red-500/20 text-red-600 dark:text-red-400'
                }`}>
                  {order.type === 'buy' ? t.buy : t.sell}
                </span>
                <span className="text-slate-800 dark:text-white font-mono">
                  {order.grams}g @ ${order.limitPrice}
                </span>
              </div>
              
              <button
                onClick={() => handleCancel(order.id)}
                disabled={cancellingId === order.id}
                className="text-red-500 dark:text-red-400 hover:text-red-600 dark:hover:text-red-300 disabled:opacity-50"
              >
                {cancellingId === order.id ? '...' : '✕'}
              </button>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Full view for TradingDetailPage
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-slate-600 dark:text-slate-300">{t.title}</h3>
        <button
          onClick={refresh}
          disabled={loading}
          className="text-xs text-emerald-600 dark:text-emerald-400 hover:text-emerald-500 dark:hover:text-emerald-300 disabled:opacity-50"
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
              className="p-3 bg-white dark:bg-slate-800/50 rounded-xl border border-stone-200 dark:border-slate-700 hover:border-stone-300 dark:hover:border-slate-600 transition-colors"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  {renderMetalIcon(order.metal)}
                  <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                    order.type === 'buy' 
                      ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400' 
                      : 'bg-red-500/20 text-red-600 dark:text-red-400'
                  }`}>
                    {order.type === 'buy' ? t.buy : t.sell}
                  </span>
                  <span className="text-slate-800 dark:text-white font-medium">{order.metal}</span>
                </div>
                
                <button
                  onClick={() => handleCancel(order.id)}
                  disabled={cancellingId === order.id}
                  className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                    cancellingId === order.id
                      ? 'bg-stone-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400'
                      : 'bg-red-500/20 text-red-600 dark:text-red-400 hover:bg-red-500/30'
                  }`}
                >
                  {cancellingId === order.id ? t.cancelling : t.cancel}
                </button>
              </div>

              <div className="grid grid-cols-3 gap-2 text-sm">
                <div>
                  <span className="text-slate-500 dark:text-slate-400 text-xs block">{t.amount}</span>
                  <span className="text-slate-800 dark:text-white font-mono">{order.grams}g</span>
                </div>
                <div>
                  <span className="text-slate-500 dark:text-slate-400 text-xs block">{t.limitPrice}</span>
                  <span className="text-slate-800 dark:text-white font-mono">${order.limitPrice.toFixed(2)}</span>
                </div>
                <div>
                  <span className="text-slate-500 dark:text-slate-400 text-xs block">{t.total}</span>
                  <span className="text-slate-800 dark:text-white font-mono">${(order.grams * order.limitPrice).toFixed(2)}</span>
                </div>
              </div>

              <div className="flex items-center justify-between mt-2 pt-2 border-t border-stone-200 dark:border-slate-700/50 text-xs">
                <span className="text-slate-500 dark:text-slate-400">
                  {t.expires}: {getTimeRemaining(order.expiresAt)}
                </span>
                <span className="text-slate-400 dark:text-slate-500 font-mono">
                  {order.id.slice(0, 16)}...
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
