// src/app/auth/verify-email/page.tsx
// Web Email Verification Page

'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Loader2, Mail, AlertCircle, CheckCircle } from 'lucide-react';
import { useLanguage } from "@/components/LanguageContext";

const translations: Record<string, Record<string, string>> = {
  tr: {
    verifyingEmail: "E-posta Doğrulanıyor...",
    pleaseWait: "E-posta adresinizi doğrularken lütfen bekleyin.",
    emailVerified: "E-posta Doğrulandı!",
    emailVerifiedDesc: "E-posta adresiniz başarıyla doğrulandı. Artık Auxite hesabınızın tüm özelliklerine erişebilirsiniz.",
    goToDashboard: "Panele Git",
    alreadyVerified: "Zaten Doğrulanmış",
    alreadyVerifiedDesc: "Bu e-posta adresi zaten doğrulanmış. Hesabınıza giriş yapabilirsiniz.",
    signIn: "Giriş Yap",
    verificationFailed: "Doğrulama Başarısız",
    linkExpired: "Doğrulama bağlantısının süresi dolmuş veya zaten kullanılmış olabilir.",
    createAccount: "Hesap Oluştur",
    invalidLink: "Geçersiz doğrulama bağlantısı",
    verificationFailedError: "Doğrulama başarısız oldu",
    connectionError: "Bağlantı hatası. Lütfen tekrar deneyin.",
  },
  en: {
    verifyingEmail: "Verifying Email...",
    pleaseWait: "Please wait while we verify your email address.",
    emailVerified: "Email Verified!",
    emailVerifiedDesc: "Your email has been successfully verified. You can now access all features of your Auxite account.",
    goToDashboard: "Go to Dashboard",
    alreadyVerified: "Already Verified",
    alreadyVerifiedDesc: "This email address has already been verified. You can sign in to your account.",
    signIn: "Sign In",
    verificationFailed: "Verification Failed",
    linkExpired: "The verification link may have expired or already been used.",
    createAccount: "Create Account",
    invalidLink: "Invalid verification link",
    verificationFailedError: "Verification failed",
    connectionError: "Connection error. Please try again.",
  },
  de: {
    verifyingEmail: "E-Mail wird überprüft...",
    pleaseWait: "Bitte warten Sie, während wir Ihre E-Mail-Adresse überprüfen.",
    emailVerified: "E-Mail bestätigt!",
    emailVerifiedDesc: "Ihre E-Mail-Adresse wurde erfolgreich bestätigt. Sie können jetzt auf alle Funktionen Ihres Auxite-Kontos zugreifen.",
    goToDashboard: "Zum Dashboard",
    alreadyVerified: "Bereits bestätigt",
    alreadyVerifiedDesc: "Diese E-Mail-Adresse wurde bereits bestätigt. Sie können sich in Ihrem Konto anmelden.",
    signIn: "Anmelden",
    verificationFailed: "Überprüfung fehlgeschlagen",
    linkExpired: "Der Bestätigungslink ist möglicherweise abgelaufen oder wurde bereits verwendet.",
    createAccount: "Konto erstellen",
    invalidLink: "Ungültiger Bestätigungslink",
    verificationFailedError: "Überprüfung fehlgeschlagen",
    connectionError: "Verbindungsfehler. Bitte versuchen Sie es erneut.",
  },
  fr: {
    verifyingEmail: "Vérification de l'e-mail...",
    pleaseWait: "Veuillez patienter pendant que nous vérifions votre adresse e-mail.",
    emailVerified: "E-mail vérifié !",
    emailVerifiedDesc: "Votre adresse e-mail a été vérifiée avec succès. Vous pouvez maintenant accéder à toutes les fonctionnalités de votre compte Auxite.",
    goToDashboard: "Aller au tableau de bord",
    alreadyVerified: "Déjà vérifié",
    alreadyVerifiedDesc: "Cette adresse e-mail a déjà été vérifiée. Vous pouvez vous connecter à votre compte.",
    signIn: "Se connecter",
    verificationFailed: "Échec de la vérification",
    linkExpired: "Le lien de vérification a peut-être expiré ou a déjà été utilisé.",
    createAccount: "Créer un compte",
    invalidLink: "Lien de vérification invalide",
    verificationFailedError: "Échec de la vérification",
    connectionError: "Erreur de connexion. Veuillez réessayer.",
  },
  ar: {
    verifyingEmail: "جارٍ التحقق من البريد الإلكتروني...",
    pleaseWait: "يرجى الانتظار بينما نتحقق من عنوان بريدك الإلكتروني.",
    emailVerified: "تم التحقق من البريد الإلكتروني!",
    emailVerifiedDesc: "تم التحقق من بريدك الإلكتروني بنجاح. يمكنك الآن الوصول إلى جميع ميزات حساب Auxite الخاص بك.",
    goToDashboard: "الذهاب إلى لوحة التحكم",
    alreadyVerified: "تم التحقق مسبقاً",
    alreadyVerifiedDesc: "تم التحقق من عنوان البريد الإلكتروني هذا مسبقاً. يمكنك تسجيل الدخول إلى حسابك.",
    signIn: "تسجيل الدخول",
    verificationFailed: "فشل التحقق",
    linkExpired: "ربما انتهت صلاحية رابط التحقق أو تم استخدامه بالفعل.",
    createAccount: "إنشاء حساب",
    invalidLink: "رابط تحقق غير صالح",
    verificationFailedError: "فشل التحقق",
    connectionError: "خطأ في الاتصال. يرجى المحاولة مرة أخرى.",
  },
  ru: {
    verifyingEmail: "Проверка электронной почты...",
    pleaseWait: "Пожалуйста, подождите, пока мы проверяем ваш адрес электронной почты.",
    emailVerified: "Электронная почта подтверждена!",
    emailVerifiedDesc: "Ваш адрес электронной почты успешно подтверждён. Теперь вы можете использовать все функции вашего аккаунта Auxite.",
    goToDashboard: "Перейти в панель управления",
    alreadyVerified: "Уже подтверждено",
    alreadyVerifiedDesc: "Этот адрес электронной почты уже подтверждён. Вы можете войти в свой аккаунт.",
    signIn: "Войти",
    verificationFailed: "Ошибка проверки",
    linkExpired: "Ссылка для подтверждения могла истечь или уже была использована.",
    createAccount: "Создать аккаунт",
    invalidLink: "Недействительная ссылка для подтверждения",
    verificationFailedError: "Ошибка проверки",
    connectionError: "Ошибка соединения. Пожалуйста, попробуйте снова.",
  },
};

export default function VerifyEmailPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { lang } = useLanguage();

  const t = (key: string) => (translations as any)[lang]?.[key] || (translations as any).en[key] || key;

  const token = searchParams.get('token');
  const email = searchParams.get('email');

  const [status, setStatus] = useState<'verifying' | 'success' | 'error' | 'already'>('verifying');
  const [error, setError] = useState('');

  useEffect(() => {
    if (token && email) {
      verifyEmail();
    } else {
      setStatus('error');
      setError(t('invalidLink'));
    }
  }, [token, email]);

  const verifyEmail = async () => {
    try {
      const response = await fetch(`/api/auth/verify-email?token=${token}&email=${encodeURIComponent(email || '')}`);
      const data = await response.json();

      if (data.success) {
        if (data.alreadyVerified) {
          setStatus('already');
        } else {
          setStatus('success');
          // Store token if provided
          if (data.token) {
            localStorage.setItem('authToken', data.token);
            localStorage.setItem('user', JSON.stringify(data.user));
          }
        }
      } else {
        setStatus('error');
        setError(data.error || t('verificationFailedError'));
      }
    } catch (err) {
      setStatus('error');
      setError(t('connectionError'));
    }
  };

  // Verifying State
  if (status === 'verifying') {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <div className="w-full max-w-md text-center">
          <Loader2 className="w-12 h-12 text-[#2F6F62] animate-spin mx-auto mb-6" />
          <h1 className="text-2xl font-bold text-white mb-3">{t('verifyingEmail')}</h1>
          <p className="text-slate-400">{t('pleaseWait')}</p>
        </div>
      </div>
    );
  }

  // Success State
  if (status === 'success') {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <div className="w-full max-w-md text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-[#2F6F62]/20 mb-6">
            <CheckCircle className="w-10 h-10 text-[#2F6F62]" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-3">{t('emailVerified')}</h1>
          <p className="text-slate-400 mb-8">
            {t('emailVerifiedDesc')}
          </p>
          <Link
            href="/dashboard"
            className="inline-flex items-center justify-center px-8 py-3 bg-gradient-to-r from-[#2F6F62] to-[#2F6F62] text-white font-semibold rounded-xl hover:from-[#2F6F62] hover:to-[#2F6F62]/80 transition-all"
          >
            {t('goToDashboard')}
          </Link>
        </div>
      </div>
    );
  }

  // Already Verified State
  if (status === 'already') {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <div className="w-full max-w-md text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-blue-500/20 mb-6">
            <CheckCircle className="w-10 h-10 text-blue-500" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-3">{t('alreadyVerified')}</h1>
          <p className="text-slate-400 mb-8">
            {t('alreadyVerifiedDesc')}
          </p>
          <Link
            href="/auth/login"
            className="inline-flex items-center justify-center px-8 py-3 bg-gradient-to-r from-[#2F6F62] to-[#2F6F62] text-white font-semibold rounded-xl hover:from-[#2F6F62] hover:to-[#2F6F62]/80 transition-all"
          >
            {t('signIn')}
          </Link>
        </div>
      </div>
    );
  }

  // Error State
  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md text-center">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-red-500/20 mb-6">
          <AlertCircle className="w-10 h-10 text-red-500" />
        </div>
        <h1 className="text-2xl font-bold text-white mb-3">{t('verificationFailed')}</h1>
        <p className="text-slate-400 mb-2">{error}</p>
        <p className="text-slate-500 text-sm mb-8">
          {t('linkExpired')}
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/auth/login"
            className="px-6 py-3 bg-slate-800 text-white font-medium rounded-xl hover:bg-slate-700 transition-colors"
          >
            {t('signIn')}
          </Link>
          <button
            onClick={() => router.push('/auth/register')}
            className="px-6 py-3 bg-gradient-to-r from-[#2F6F62] to-[#2F6F62] text-white font-semibold rounded-xl hover:from-[#2F6F62] hover:to-[#2F6F62]/80 transition-all"
          >
            {t('createAccount')}
          </button>
        </div>
      </div>
    </div>
  );
}
