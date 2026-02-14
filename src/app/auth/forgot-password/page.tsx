// src/app/auth/forgot-password/page.tsx
// Web Forgot Password Page

'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Loader2, Mail, AlertCircle, ArrowLeft, CheckCircle } from 'lucide-react';
import { useLanguage } from '@/components/LanguageContext';

const translations: Record<string, Record<string, string>> = {
  tr: {
    checkYourEmail: "E-postanızı Kontrol Edin",
    ifAccountExists: "Eğer şu adresle bir hesap varsa",
    resetLinkShortly: "kısa süre içinde bir şifre sıfırlama bağlantısı alacaksınız.",
    backToLogin: "Girişe Dön",
    backToLoginLink: "Girişe dön",
    forgotPassword: "Şifrenizi mi Unuttunuz?",
    enterEmailDesc: "E-postanızı girin, size bir sıfırlama bağlantısı gönderelim",
    emailAddress: "E-posta Adresi",
    connectionError: "Bağlantı hatası. Lütfen tekrar deneyin.",
    sending: "Gönderiliyor...",
    sendResetLink: "Sıfırlama Bağlantısı Gönder",
    rememberPassword: "Şifrenizi hatırlıyor musunuz?",
    signIn: "Giriş yap",
  },
  en: {
    checkYourEmail: "Check Your Email",
    ifAccountExists: "If an account exists with",
    resetLinkShortly: "you'll receive a password reset link shortly.",
    backToLogin: "Back to Login",
    backToLoginLink: "Back to login",
    forgotPassword: "Forgot Password?",
    enterEmailDesc: "Enter your email and we'll send you a reset link",
    emailAddress: "Email Address",
    connectionError: "Connection error. Please try again.",
    sending: "Sending...",
    sendResetLink: "Send Reset Link",
    rememberPassword: "Remember your password?",
    signIn: "Sign in",
  },
  de: {
    checkYourEmail: "Überprüfen Sie Ihre E-Mail",
    ifAccountExists: "Wenn ein Konto existiert mit",
    resetLinkShortly: "erhalten Sie in Kürze einen Link zum Zurücksetzen des Passworts.",
    backToLogin: "Zurück zur Anmeldung",
    backToLoginLink: "Zurück zur Anmeldung",
    forgotPassword: "Passwort vergessen?",
    enterEmailDesc: "Geben Sie Ihre E-Mail ein und wir senden Ihnen einen Link zum Zurücksetzen",
    emailAddress: "E-Mail-Adresse",
    connectionError: "Verbindungsfehler. Bitte versuchen Sie es erneut.",
    sending: "Senden...",
    sendResetLink: "Link zum Zurücksetzen senden",
    rememberPassword: "Erinnern Sie sich an Ihr Passwort?",
    signIn: "Anmelden",
  },
  fr: {
    checkYourEmail: "Vérifiez votre e-mail",
    ifAccountExists: "Si un compte existe avec",
    resetLinkShortly: "vous recevrez un lien de réinitialisation du mot de passe sous peu.",
    backToLogin: "Retour à la connexion",
    backToLoginLink: "Retour à la connexion",
    forgotPassword: "Mot de passe oublié ?",
    enterEmailDesc: "Entrez votre e-mail et nous vous enverrons un lien de réinitialisation",
    emailAddress: "Adresse e-mail",
    connectionError: "Erreur de connexion. Veuillez réessayer.",
    sending: "Envoi en cours...",
    sendResetLink: "Envoyer le lien de réinitialisation",
    rememberPassword: "Vous vous souvenez de votre mot de passe ?",
    signIn: "Se connecter",
  },
  ar: {
    checkYourEmail: "تحقق من بريدك الإلكتروني",
    ifAccountExists: "إذا كان هناك حساب مرتبط بـ",
    resetLinkShortly: "ستتلقى رابط إعادة تعيين كلمة المرور قريباً.",
    backToLogin: "العودة إلى تسجيل الدخول",
    backToLoginLink: "العودة إلى تسجيل الدخول",
    forgotPassword: "نسيت كلمة المرور؟",
    enterEmailDesc: "أدخل بريدك الإلكتروني وسنرسل لك رابط إعادة التعيين",
    emailAddress: "عنوان البريد الإلكتروني",
    connectionError: "خطأ في الاتصال. يرجى المحاولة مرة أخرى.",
    sending: "جارٍ الإرسال...",
    sendResetLink: "إرسال رابط إعادة التعيين",
    rememberPassword: "هل تتذكر كلمة المرور؟",
    signIn: "تسجيل الدخول",
  },
  ru: {
    checkYourEmail: "Проверьте вашу почту",
    ifAccountExists: "Если существует аккаунт с",
    resetLinkShortly: "вы получите ссылку для сброса пароля в ближайшее время.",
    backToLogin: "Вернуться к входу",
    backToLoginLink: "Вернуться к входу",
    forgotPassword: "Забыли пароль?",
    enterEmailDesc: "Введите ваш e-mail, и мы отправим вам ссылку для сброса",
    emailAddress: "Адрес электронной почты",
    connectionError: "Ошибка соединения. Пожалуйста, попробуйте снова.",
    sending: "Отправка...",
    sendResetLink: "Отправить ссылку для сброса",
    rememberPassword: "Помните свой пароль?",
    signIn: "Войти",
  },
};

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const { lang } = useLanguage();
  const t = (key: string) => (translations as any)[lang]?.[key] || (translations as any).en[key] || key;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      // Always show success for security (don't reveal if email exists)
      setSuccess(true);

    } catch (err) {
      setError(t('connectionError'));
    } finally {
      setIsLoading(false);
    }
  };

  // Success State
  if (success) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <div className="w-full max-w-md text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-[#2F6F62]/20 mb-6">
            <CheckCircle className="w-10 h-10 text-[#2F6F62]" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-3">{t('checkYourEmail')}</h1>
          <p className="text-slate-400 mb-2">
            {t('ifAccountExists')}
          </p>
          <p className="text-[#2F6F62] font-medium mb-6">{email}</p>
          <p className="text-slate-400 mb-8">
            {t('resetLinkShortly')}
          </p>
          <Link
            href="/auth/login"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-slate-800 text-white font-medium rounded-xl hover:bg-slate-700 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            {t('backToLogin')}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Back Link */}
        <Link
          href="/auth/login"
          className="inline-flex items-center gap-2 text-slate-400 hover:text-white mb-8 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          {t('backToLoginLink')}
        </Link>

        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-[#BFA181]/20 mb-4">
            <Mail className="w-8 h-8 text-[#BFA181]" />
          </div>
          <h1 className="text-2xl font-bold text-white">{t('forgotPassword')}</h1>
          <p className="text-slate-400 mt-2">
            {t('enterEmailDesc')}
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              {t('emailAddress')}
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full pl-10 pr-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-[#BFA181] focus:border-transparent transition-all"
                required
              />
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
              <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 bg-gradient-to-r from-[#2F6F62] to-[#2F6F62] text-white font-semibold rounded-xl hover:from-[#2F6F62] hover:to-[#2F6F62]/80 focus:outline-none focus:ring-2 focus:ring-[#BFA181] focus:ring-offset-2 focus:ring-offset-slate-900 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                {t('sending')}
              </>
            ) : (
              t('sendResetLink')
            )}
          </button>
        </form>

        {/* Help Text */}
        <p className="text-center text-slate-500 text-sm mt-8">
          {t('rememberPassword')}{' '}
          <Link href="/auth/login" className="text-[#2F6F62] hover:text-[#2F6F62] transition-colors">
            {t('signIn')}
          </Link>
        </p>
      </div>
    </div>
  );
}
