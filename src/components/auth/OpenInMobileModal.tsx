// components/auth/OpenInMobileModal.tsx
// Opens the mobile app via push notification

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { X, Smartphone, CheckCircle, XCircle, Loader2, Bell } from 'lucide-react';

interface OpenInMobileModalProps {
  isOpen: boolean;
  onClose: () => void;
  walletAddress: string;
  action?: string;
  actionData?: Record<string, any>;
  lang?: 'tr' | 'en' | 'de' | 'fr' | 'ar' | 'ru';
}

const translations = {
  tr: {
    title: 'Mobile\'da Aç',
    subtitle: 'Auxite uygulamasında açılacak',
    sending: 'Bildirim gönderiliyor...',
    waiting: 'Mobil onay bekleniyor...',
    success: 'Mobilde açıldı!',
    rejected: 'İstek reddedildi',
    expired: 'İstek zaman aşımına uğradı',
    noDevice: 'Kayıtlı mobil cihaz bulunamadı',
    retry: 'Tekrar Dene',
    close: 'Kapat',
    checkPhone: 'Telefonunuzu kontrol edin',
    tapNotification: 'Bildirimi onaylayın',
  },
  en: {
    title: 'Open in Mobile',
    subtitle: 'Will open in Auxite app',
    sending: 'Sending notification...',
    waiting: 'Waiting for mobile confirmation...',
    success: 'Opened in mobile!',
    rejected: 'Request rejected',
    expired: 'Request timed out',
    noDevice: 'No registered mobile device found',
    retry: 'Try Again',
    close: 'Close',
    checkPhone: 'Check your phone',
    tapNotification: 'Approve the notification',
  },
  de: {
    title: 'In Mobile öffnen',
    subtitle: 'Wird in der Auxite-App geöffnet',
    sending: 'Benachrichtigung senden...',
    waiting: 'Warte auf mobile Bestätigung...',
    success: 'In Mobile geöffnet!',
    rejected: 'Anfrage abgelehnt',
    expired: 'Anfrage abgelaufen',
    noDevice: 'Kein registriertes Mobilgerät gefunden',
    retry: 'Erneut versuchen',
    close: 'Schließen',
    checkPhone: 'Überprüfen Sie Ihr Telefon',
    tapNotification: 'Bestätigen Sie die Benachrichtigung',
  },
  fr: {
    title: 'Ouvrir sur Mobile',
    subtitle: "S'ouvrira dans l'app Auxite",
    sending: 'Envoi de la notification...',
    waiting: 'En attente de confirmation mobile...',
    success: 'Ouvert sur mobile!',
    rejected: 'Demande refusée',
    expired: 'Demande expirée',
    noDevice: 'Aucun appareil mobile enregistré',
    retry: 'Réessayer',
    close: 'Fermer',
    checkPhone: 'Vérifiez votre téléphone',
    tapNotification: 'Approuvez la notification',
  },
  ar: {
    title: 'فتح في الهاتف',
    subtitle: 'سيفتح في تطبيق Auxite',
    sending: 'إرسال الإشعار...',
    waiting: 'في انتظار تأكيد الهاتف...',
    success: 'تم الفتح في الهاتف!',
    rejected: 'تم رفض الطلب',
    expired: 'انتهت مهلة الطلب',
    noDevice: 'لم يتم العثور على جهاز محمول مسجل',
    retry: 'حاول مرة أخرى',
    close: 'إغلاق',
    checkPhone: 'تحقق من هاتفك',
    tapNotification: 'وافق على الإشعار',
  },
  ru: {
    title: 'Открыть в мобильном',
    subtitle: 'Откроется в приложении Auxite',
    sending: 'Отправка уведомления...',
    waiting: 'Ожидание подтверждения...',
    success: 'Открыто в мобильном!',
    rejected: 'Запрос отклонен',
    expired: 'Время запроса истекло',
    noDevice: 'Зарегистрированное устройство не найдено',
    retry: 'Повторить',
    close: 'Закрыть',
    checkPhone: 'Проверьте телефон',
    tapNotification: 'Подтвердите уведомление',
  },
};

export function OpenInMobileModal({ 
  isOpen, 
  onClose, 
  walletAddress,
  action = 'open_app',
  actionData,
  lang = 'en' 
}: OpenInMobileModalProps) {
  const t = translations[lang] || translations.en;
  
  const [status, setStatus] = useState<'sending' | 'waiting' | 'success' | 'rejected' | 'expired' | 'noDevice'>('sending');
  const [requestId, setRequestId] = useState<string | null>(null);
  const [pollInterval, setPollInterval] = useState<NodeJS.Timeout | null>(null);

  // Send request to mobile
  const sendRequest = useCallback(async () => {
    setStatus('sending');
    setRequestId(null);

    try {
      const response = await fetch('/api/auth/mobile-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          walletAddress,
          action,
          actionData,
          sourceDevice: 'web',
        }),
      });

      const data = await response.json();

      if (!data.success) {
        if (data.error?.includes('No mobile device') || data.error?.includes('No registered')) {
          setStatus('noDevice');
        } else {
          setStatus('expired');
        }
        return;
      }

      setRequestId(data.requestId);
      setStatus('waiting');
    } catch (error) {
      console.error('Send request error:', error);
      setStatus('expired');
    }
  }, [walletAddress, action, actionData]);

  // Poll for status updates
  const checkStatus = useCallback(async () => {
    if (!requestId) return;

    try {
      const response = await fetch(`/api/auth/mobile-status/${requestId}`);
      const data = await response.json();

      if (data.status === 'confirmed') {
        setStatus('success');
        if (pollInterval) {
          clearInterval(pollInterval);
          setPollInterval(null);
        }
        // Auto close after success
        setTimeout(onClose, 2000);
      } else if (data.status === 'rejected') {
        setStatus('rejected');
        if (pollInterval) {
          clearInterval(pollInterval);
          setPollInterval(null);
        }
      } else if (data.status === 'expired') {
        setStatus('expired');
        if (pollInterval) {
          clearInterval(pollInterval);
          setPollInterval(null);
        }
      }
    } catch (error) {
      console.error('Check status error:', error);
    }
  }, [requestId, pollInterval, onClose]);

  // Initialize when modal opens
  useEffect(() => {
    if (isOpen && walletAddress) {
      sendRequest();
    } else {
      if (pollInterval) {
        clearInterval(pollInterval);
        setPollInterval(null);
      }
      setStatus('sending');
      setRequestId(null);
    }
  }, [isOpen, walletAddress, sendRequest]);

  // Start polling when request is sent
  useEffect(() => {
    if (requestId && status === 'waiting') {
      const interval = setInterval(checkStatus, 2000);
      setPollInterval(interval);

      // Auto-expire after 5 minutes
      const timeout = setTimeout(() => {
        setStatus('expired');
        clearInterval(interval);
      }, 5 * 60 * 1000);

      return () => {
        clearInterval(interval);
        clearTimeout(timeout);
      };
    }
  }, [requestId, status, checkStatus]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-sm mx-4 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
              <Smartphone className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                {t.title}
              </h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {t.subtitle}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 flex flex-col items-center">
          {status === 'sending' && (
            <>
              <div className="w-20 h-20 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center mb-4">
                <Loader2 className="w-10 h-10 text-blue-500 animate-spin" />
              </div>
              <p className="text-slate-600 dark:text-slate-300">{t.sending}</p>
            </>
          )}

          {status === 'waiting' && (
            <>
              <div className="w-20 h-20 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center mb-4 animate-pulse">
                <Bell className="w-10 h-10 text-amber-500" />
              </div>
              <p className="text-slate-600 dark:text-slate-300 text-center mb-2">
                {t.waiting}
              </p>
              <div className="space-y-2 text-sm text-slate-500 dark:text-slate-400">
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-[#2F6F62]/20 dark:bg-[#2F6F62]/20 flex items-center justify-center text-xs text-[#2F6F62]">1</span>
                  <span>{t.checkPhone}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-[#2F6F62]/20 dark:bg-[#2F6F62]/20 flex items-center justify-center text-xs text-[#2F6F62]">2</span>
                  <span>{t.tapNotification}</span>
                </div>
              </div>
            </>
          )}

          {status === 'success' && (
            <>
              <div className="w-20 h-20 rounded-full bg-[#2F6F62]/20 dark:bg-[#2F6F62]/20 flex items-center justify-center mb-4">
                <CheckCircle className="w-10 h-10 text-[#2F6F62]" />
              </div>
              <p className="text-[#2F6F62] dark:text-[#2F6F62] font-medium">
                {t.success}
              </p>
            </>
          )}

          {status === 'rejected' && (
            <>
              <div className="w-20 h-20 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mb-4">
                <XCircle className="w-10 h-10 text-red-500" />
              </div>
              <p className="text-red-600 dark:text-red-400 font-medium mb-4">
                {t.rejected}
              </p>
              <button
                onClick={sendRequest}
                className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg text-slate-700 dark:text-slate-200 transition-colors"
              >
                {t.retry}
              </button>
            </>
          )}

          {status === 'expired' && (
            <>
              <div className="w-20 h-20 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-4">
                <XCircle className="w-10 h-10 text-slate-400" />
              </div>
              <p className="text-slate-500 dark:text-slate-400 mb-4">
                {t.expired}
              </p>
              <button
                onClick={sendRequest}
                className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
              >
                {t.retry}
              </button>
            </>
          )}

          {status === 'noDevice' && (
            <>
              <div className="w-20 h-20 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-4">
                <Smartphone className="w-10 h-10 text-slate-400" />
              </div>
              <p className="text-slate-500 dark:text-slate-400 text-center mb-4">
                {t.noDevice}
              </p>
              <button
                onClick={onClose}
                className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg text-slate-700 dark:text-slate-200 transition-colors"
              >
                {t.close}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default OpenInMobileModal;
