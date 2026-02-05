// components/auth/QRLoginModal.tsx
// QR Code Login Modal - Allows mobile app to scan and login to web

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { X, Smartphone, CheckCircle, XCircle, Loader2, RefreshCw } from 'lucide-react';

interface PairingSession {
  sessionId: string;
  pairingCode: string;
  qrData: string;
  expiresAt: number;
  status: 'pending' | 'verified' | 'confirmed' | 'rejected' | 'expired';
  walletAddress?: string;
  authToken?: string;
}

interface QRLoginModalProps {
  walletAddress?: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (walletAddress: string, authToken: string) => void;
  lang?: 'tr' | 'en' | 'de' | 'fr' | 'ar' | 'ru';
}

const translations = {
  tr: {
    title: 'Mobil ile Giriş Yap',
    subtitle: 'Auxite uygulamasından QR kodu tarayın',
    step1: 'Auxite mobil uygulamasını açın',
    step2: 'QR Tara butonuna tıklayın',
    step3: 'Bu kodu tarayın ve onaylayın',
    waiting: 'Mobil onay bekleniyor...',
    verified: 'QR tarandı, onay bekleniyor...',
    success: 'Giriş başarılı!',
    rejected: 'Giriş reddedildi',
    expired: 'QR kodunun süresi doldu',
    refresh: 'Yeni QR Oluştur',
    close: 'Kapat',
    orCode: 'veya bu kodu girin',
    expiresIn: 'Süre:',
    seconds: 'saniye',
  },
  en: {
    title: 'Login with Mobile',
    subtitle: 'Scan QR code from Auxite app',
    step1: 'Open Auxite mobile app',
    step2: 'Tap on Scan QR button',
    step3: 'Scan this code and confirm',
    waiting: 'Waiting for mobile confirmation...',
    verified: 'QR scanned, waiting for approval...',
    success: 'Login successful!',
    rejected: 'Login rejected',
    expired: 'QR code expired',
    refresh: 'Generate New QR',
    close: 'Close',
    orCode: 'or enter this code',
    expiresIn: 'Expires in:',
    seconds: 'seconds',
  },
  de: {
    title: 'Mit Handy anmelden',
    subtitle: 'QR-Code mit der Auxite-App scannen',
    step1: 'Öffnen Sie die Auxite Mobile App',
    step2: 'Tippen Sie auf QR scannen',
    step3: 'Scannen Sie diesen Code und bestätigen Sie',
    waiting: 'Warte auf mobile Bestätigung...',
    verified: 'QR gescannt, warte auf Genehmigung...',
    success: 'Anmeldung erfolgreich!',
    rejected: 'Anmeldung abgelehnt',
    expired: 'QR-Code abgelaufen',
    refresh: 'Neuen QR erstellen',
    close: 'Schließen',
    orCode: 'oder geben Sie diesen Code ein',
    expiresIn: 'Läuft ab in:',
    seconds: 'Sekunden',
  },
  fr: {
    title: 'Connexion Mobile',
    subtitle: "Scannez le code QR depuis l'app Auxite",
    step1: "Ouvrez l'application Auxite",
    step2: 'Appuyez sur Scanner QR',
    step3: 'Scannez ce code et confirmez',
    waiting: 'En attente de confirmation mobile...',
    verified: 'QR scanné, en attente d\'approbation...',
    success: 'Connexion réussie!',
    rejected: 'Connexion refusée',
    expired: 'Code QR expiré',
    refresh: 'Générer nouveau QR',
    close: 'Fermer',
    orCode: 'ou entrez ce code',
    expiresIn: 'Expire dans:',
    seconds: 'secondes',
  },
  ar: {
    title: 'تسجيل الدخول بالهاتف',
    subtitle: 'امسح رمز QR من تطبيق Auxite',
    step1: 'افتح تطبيق Auxite',
    step2: 'اضغط على مسح QR',
    step3: 'امسح هذا الرمز وأكد',
    waiting: 'في انتظار تأكيد الهاتف...',
    verified: 'تم مسح QR، في انتظار الموافقة...',
    success: 'تم تسجيل الدخول بنجاح!',
    rejected: 'تم رفض تسجيل الدخول',
    expired: 'انتهت صلاحية رمز QR',
    refresh: 'إنشاء QR جديد',
    close: 'إغلاق',
    orCode: 'أو أدخل هذا الرمز',
    expiresIn: 'ينتهي في:',
    seconds: 'ثانية',
  },
  ru: {
    title: 'Вход через мобильный',
    subtitle: 'Отсканируйте QR-код в приложении Auxite',
    step1: 'Откройте приложение Auxite',
    step2: 'Нажмите Сканировать QR',
    step3: 'Отсканируйте этот код и подтвердите',
    waiting: 'Ожидание подтверждения...',
    verified: 'QR отсканирован, ожидание одобрения...',
    success: 'Вход выполнен!',
    rejected: 'Вход отклонен',
    expired: 'QR-код истек',
    refresh: 'Создать новый QR',
    close: 'Закрыть',
    orCode: 'или введите этот код',
    expiresIn: 'Истекает через:',
    seconds: 'секунд',
  },
};

export function QRLoginModal({ isOpen, onClose, onSuccess, walletAddress, lang = 'en' }: QRLoginModalProps) {
  const t = translations[lang] || translations.en;
  
  const [session, setSession] = useState<PairingSession | null>(null);
  const [status, setStatus] = useState<'loading' | 'pending' | 'verified' | 'success' | 'rejected' | 'expired'>('loading');
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [pollInterval, setPollInterval] = useState<NodeJS.Timeout | null>(null);

  // Create new pairing session
  const createSession = useCallback(async () => {
    console.log('🔵 createSession called, walletAddress:', walletAddress);
    setStatus('loading');
    setSession(null);

    try {
      // Include wallet address if available for direct mobile pairing
      const url = walletAddress
        ? `/api/auth/qr-login?action=generate&walletAddress=${encodeURIComponent(walletAddress)}`
        : '/api/auth/qr-login?action=generate';
      const response = await fetch(url);

      if (!response.ok) throw new Error('Failed to create session');

      const data = await response.json();
      console.log('🔵 Session created:', data);

      if (!data.success) throw new Error('Failed to create session');

      // qrData might be URI format (auxite://...) or JSON
      let expiresAt = Date.now() + (data.expiresIn || 300) * 1000;
      if (typeof data.qrData === 'string' && data.qrData.startsWith('{')) {
        try {
          const qrDataObj = JSON.parse(data.qrData);
          expiresAt = qrDataObj.expiresAt || expiresAt;
        } catch {}
      }

      setSession({
        sessionId: data.sessionId,
        pairingCode: data.pairingCode || data.sessionId.slice(0, 6).toUpperCase(),
        qrData: data.qrData,
        expiresAt,
        status: 'pending',
        walletAddress: walletAddress || undefined,
      });
      setStatus('pending');
      console.log('🔵 Status set to pending, QR:', data.qrData);
      setTimeLeft(data.expiresIn || 300);
    } catch (error) {
      console.error('Create session error:', error);
      setStatus('expired');
    }
  }, [walletAddress]);

  // Poll for status updates
  const checkStatus = useCallback(async () => {
    console.log('🟡 checkStatus called, sessionId:', session?.sessionId);
    if (!session?.sessionId) return;

    try {
      const response = await fetch(`/api/auth/qr-login?action=status&sessionId=${session.sessionId}`);
      const data = await response.json();

      if (data.status === 'approved' && data.walletAddress) {
        setStatus('success');
        // Clear polling
        if (pollInterval) {
          clearInterval(pollInterval);
          setPollInterval(null);
        }
        // Notify parent
        setTimeout(() => {
          onSuccess(data.walletAddress, session.sessionId);
        }, 1500);
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
  }, [session?.sessionId, pollInterval, onSuccess]);

  // Initialize session when modal opens
  useEffect(() => {
    if (isOpen) {
      createSession();
    } else {
      // Cleanup when modal closes
      if (pollInterval) {
        clearInterval(pollInterval);
        setPollInterval(null);
      }
      setSession(null);
      setStatus('loading');
    }
  }, [isOpen, createSession]);

  // Start polling when session is created
  useEffect(() => {
    console.log('🟢 Polling useEffect - session:', !!session, 'status:', status);
    if (session && (status === 'pending' || status === 'verified')) {
      console.log('🟢 Starting polling interval');
      
      const pollStatus = async () => {
        console.log('🟡 Polling status for session:', session.sessionId);
        try {
          const response = await fetch(`/api/auth/qr-login?action=status&sessionId=${session.sessionId}`);
          const data = await response.json();
          console.log('🟡 Status response:', data);

          if (data.status === 'approved' && data.walletAddress) {
            console.log('🟢 Login approved!', data.walletAddress);
            setStatus('success');
            setTimeout(() => {
              onSuccess(data.walletAddress, session.sessionId);
            }, 1500);
          } else if (data.status === 'expired') {
            setStatus('expired');
          }
        } catch (error) {
          console.error('Poll status error:', error);
        }
      };

      const interval = setInterval(pollStatus, 2000);
      pollStatus(); // İlk çağrı hemen

      return () => {
        console.log('🟢 Clearing polling interval');
        clearInterval(interval);
      };
    }
  }, [session?.sessionId, status, onSuccess]);

  // Countdown timer
  useEffect(() => {
    if (timeLeft <= 0 || status !== 'pending') return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          setStatus('expired');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft, status]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
              <Smartphone className="w-5 h-5 text-emerald-600" />
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
        <div className="p-6">
          {/* QR Code */}
          <div className="flex flex-col items-center">
            {status === 'loading' ? (
              <div className="w-64 h-64 flex items-center justify-center bg-slate-100 dark:bg-slate-800 rounded-2xl">
                <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
              </div>
            ) : status === 'success' ? (
              <div className="w-64 h-64 flex flex-col items-center justify-center bg-emerald-50 dark:bg-emerald-900/20 rounded-2xl">
                <CheckCircle className="w-16 h-16 text-emerald-500 mb-4" />
                <p className="text-emerald-600 dark:text-emerald-400 font-medium">
                  {t.success}
                </p>
              </div>
            ) : status === 'rejected' ? (
              <div className="w-64 h-64 flex flex-col items-center justify-center bg-red-50 dark:bg-red-900/20 rounded-2xl">
                <XCircle className="w-16 h-16 text-red-500 mb-4" />
                <p className="text-red-600 dark:text-red-400 font-medium">
                  {t.rejected}
                </p>
              </div>
            ) : status === 'expired' ? (
              <div className="w-64 h-64 flex flex-col items-center justify-center bg-slate-100 dark:bg-slate-800 rounded-2xl">
                <p className="text-slate-500 dark:text-slate-400 mb-4">
                  {t.expired}
                </p>
                <button
                  onClick={createSession}
                  className="flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg transition-colors"
                >
                  <RefreshCw className="w-4 h-4" />
                  {t.refresh}
                </button>
              </div>
            ) : session?.qrData ? (
              <div className="relative">
                <div className="p-4 bg-white rounded-2xl shadow-lg">
                  <QRCodeSVG
                    value={session.qrData}
                    size={224}
                    level="M"
                    includeMargin={false}
                    bgColor="#FFFFFF"
                    fgColor="#0f172a"
                  />
                </div>
                
                {/* Status overlay */}
                {status === 'verified' && (
                  <div className="absolute inset-0 flex items-center justify-center bg-white/90 dark:bg-slate-900/90 rounded-2xl">
                    <div className="text-center">
                      <Loader2 className="w-8 h-8 text-emerald-500 animate-spin mx-auto mb-2" />
                      <p className="text-sm text-slate-600 dark:text-slate-300">
                        {t.verified}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            ) : null}

            {/* Pairing Code */}
            {session?.pairingCode && status === 'pending' && (
              <div className="mt-4 text-center">
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">
                  {t.orCode}
                </p>
                <div className="inline-flex items-center gap-1 px-4 py-2 bg-slate-100 dark:bg-slate-800 rounded-lg font-mono text-lg tracking-widest text-slate-900 dark:text-white">
                  {session.pairingCode.split('').map((digit, i) => (
                    <span key={i}>{digit}</span>
                  ))}
                </div>
              </div>
            )}

            {/* Timer */}
            {timeLeft > 0 && status === 'pending' && (
              <div className="mt-3 flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                <span>{t.expiresIn}</span>
                <span className="font-mono font-medium text-slate-700 dark:text-slate-200">
                  {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
                </span>
              </div>
            )}

            {/* Waiting indicator */}
            {status === 'pending' && (
              <div className="mt-4 flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>{t.waiting}</span>
              </div>
            )}
          </div>

          {/* Steps */}
          {(status === 'pending' || status === 'loading') && (
            <div className="mt-6 space-y-3">
              {[t.step1, t.step2, t.step3].map((step, index) => (
                <div 
                  key={index}
                  className="flex items-center gap-3 text-sm text-slate-600 dark:text-slate-300"
                >
                  <div className="w-6 h-6 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-xs font-medium text-emerald-600">
                    {index + 1}
                  </div>
                  <span>{step}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default QRLoginModal;
