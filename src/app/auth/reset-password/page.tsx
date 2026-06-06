// src/app/auth/reset-password/page.tsx
// Web Reset Password Page (from email link)

'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Loader2, Lock, AlertCircle, CheckCircle, Eye, EyeOff, Smartphone, ExternalLink } from 'lucide-react';
import { useLanguage } from '@/components/LanguageContext';

const translations: Record<string, Record<string, string>> = {
  tr: {
    passwordChanged: "Şifre Değiştirildi!",
    passwordChangedDesc: "Şifreniz başarıyla sıfırlandı. Artık yeni şifrenizle giriş yapabilirsiniz.",
    signIn: "Giriş Yap",
    invalidLink: "Geçersiz Bağlantı",
    invalidLinkDesc: "Bu şifre sıfırlama bağlantısı geçersiz veya süresi dolmuş. Lütfen yeni bir tane talep edin.",
    requestNewLink: "Yeni Bağlantı Talep Et",
    setNewPassword: "Yeni Şifre Belirle",
    createStrongPassword: "Hesabınız için güçlü bir şifre oluşturun",
    newPassword: "Yeni Şifre",
    confirmPassword: "Şifreyi Onayla",
    minChars: "8+ karakter",
    uppercase: "Büyük harf",
    lowercase: "Küçük harf",
    number: "Rakam",
    passwordRequirements: "Şifre gereksinimleri karşılanmıyor",
    passwordsNoMatch: "Şifreler eşleşmiyor",
    linkExpired: "Bu sıfırlama bağlantısının süresi dolmuş. Lütfen yeni bir tane talep edin.",
    failedReset: "Şifre sıfırlama başarısız oldu",
    connectionError: "Bağlantı hatası. Lütfen tekrar deneyin.",
    invalidOrExpired: "Geçersiz veya süresi dolmuş sıfırlama bağlantısı. Lütfen yeni bir tane talep edin.",
    resetting: "Sıfırlanıyor...",
    resetPassword: "Şifreyi Sıfırla",
  },
  en: {
    passwordChanged: "Password Changed!",
    passwordChangedDesc: "Your password has been successfully reset. You can now sign in with your new password.",
    signIn: "Sign In",
    invalidLink: "Invalid Link",
    invalidLinkDesc: "This password reset link is invalid or has expired. Please request a new one.",
    requestNewLink: "Request New Link",
    setNewPassword: "Set New Password",
    createStrongPassword: "Create a strong password for your account",
    newPassword: "New Password",
    confirmPassword: "Confirm Password",
    minChars: "8+ characters",
    uppercase: "Uppercase",
    lowercase: "Lowercase",
    number: "Number",
    passwordRequirements: "Password does not meet requirements",
    passwordsNoMatch: "Passwords do not match",
    linkExpired: "This reset link has expired. Please request a new one.",
    failedReset: "Failed to reset password",
    connectionError: "Connection error. Please try again.",
    invalidOrExpired: "Invalid or expired reset link. Please request a new one.",
    resetting: "Resetting...",
    resetPassword: "Reset Password",
  },
  de: {
    passwordChanged: "Passwort geändert!",
    passwordChangedDesc: "Ihr Passwort wurde erfolgreich zurückgesetzt. Sie können sich jetzt mit Ihrem neuen Passwort anmelden.",
    signIn: "Anmelden",
    invalidLink: "Ungültiger Link",
    invalidLinkDesc: "Dieser Link zum Zurücksetzen des Passworts ist ungültig oder abgelaufen. Bitte fordern Sie einen neuen an.",
    requestNewLink: "Neuen Link anfordern",
    setNewPassword: "Neues Passwort festlegen",
    createStrongPassword: "Erstellen Sie ein starkes Passwort für Ihr Konto",
    newPassword: "Neues Passwort",
    confirmPassword: "Passwort bestätigen",
    minChars: "8+ Zeichen",
    uppercase: "Großbuchstabe",
    lowercase: "Kleinbuchstabe",
    number: "Zahl",
    passwordRequirements: "Passwort erfüllt nicht die Anforderungen",
    passwordsNoMatch: "Passwörter stimmen nicht überein",
    linkExpired: "Dieser Link ist abgelaufen. Bitte fordern Sie einen neuen an.",
    failedReset: "Passwort konnte nicht zurückgesetzt werden",
    connectionError: "Verbindungsfehler. Bitte versuchen Sie es erneut.",
    invalidOrExpired: "Ungültiger oder abgelaufener Link. Bitte fordern Sie einen neuen an.",
    resetting: "Wird zurückgesetzt...",
    resetPassword: "Passwort zurücksetzen",
  },
  fr: {
    passwordChanged: "Mot de passe modifié !",
    passwordChangedDesc: "Votre mot de passe a été réinitialisé avec succès. Vous pouvez maintenant vous connecter avec votre nouveau mot de passe.",
    signIn: "Se connecter",
    invalidLink: "Lien invalide",
    invalidLinkDesc: "Ce lien de réinitialisation est invalide ou a expiré. Veuillez en demander un nouveau.",
    requestNewLink: "Demander un nouveau lien",
    setNewPassword: "Définir un nouveau mot de passe",
    createStrongPassword: "Créez un mot de passe fort pour votre compte",
    newPassword: "Nouveau mot de passe",
    confirmPassword: "Confirmer le mot de passe",
    minChars: "8+ caractères",
    uppercase: "Majuscule",
    lowercase: "Minuscule",
    number: "Chiffre",
    passwordRequirements: "Le mot de passe ne répond pas aux exigences",
    passwordsNoMatch: "Les mots de passe ne correspondent pas",
    linkExpired: "Ce lien a expiré. Veuillez en demander un nouveau.",
    failedReset: "Échec de la réinitialisation du mot de passe",
    connectionError: "Erreur de connexion. Veuillez réessayer.",
    invalidOrExpired: "Lien de réinitialisation invalide ou expiré. Veuillez en demander un nouveau.",
    resetting: "Réinitialisation...",
    resetPassword: "Réinitialiser le mot de passe",
  },
  ar: {
    passwordChanged: "تم تغيير كلمة المرور!",
    passwordChangedDesc: "تمت إعادة تعيين كلمة المرور بنجاح. يمكنك الآن تسجيل الدخول بكلمة المرور الجديدة.",
    signIn: "تسجيل الدخول",
    invalidLink: "رابط غير صالح",
    invalidLinkDesc: "رابط إعادة تعيين كلمة المرور هذا غير صالح أو منتهي الصلاحية. يرجى طلب رابط جديد.",
    requestNewLink: "طلب رابط جديد",
    setNewPassword: "تعيين كلمة مرور جديدة",
    createStrongPassword: "أنشئ كلمة مرور قوية لحسابك",
    newPassword: "كلمة المرور الجديدة",
    confirmPassword: "تأكيد كلمة المرور",
    minChars: "8+ أحرف",
    uppercase: "حرف كبير",
    lowercase: "حرف صغير",
    number: "رقم",
    passwordRequirements: "كلمة المرور لا تستوفي المتطلبات",
    passwordsNoMatch: "كلمات المرور غير متطابقة",
    linkExpired: "انتهت صلاحية رابط إعادة التعيين. يرجى طلب رابط جديد.",
    failedReset: "فشل في إعادة تعيين كلمة المرور",
    connectionError: "خطأ في الاتصال. يرجى المحاولة مرة أخرى.",
    invalidOrExpired: "رابط إعادة تعيين غير صالح أو منتهي الصلاحية. يرجى طلب رابط جديد.",
    resetting: "جارٍ إعادة التعيين...",
    resetPassword: "إعادة تعيين كلمة المرور",
  },
  ru: {
    passwordChanged: "Пароль изменён!",
    passwordChangedDesc: "Ваш пароль был успешно сброшен. Теперь вы можете войти с новым паролем.",
    signIn: "Войти",
    invalidLink: "Недействительная ссылка",
    invalidLinkDesc: "Эта ссылка для сброса пароля недействительна или устарела. Пожалуйста, запросите новую.",
    requestNewLink: "Запросить новую ссылку",
    setNewPassword: "Установить новый пароль",
    createStrongPassword: "Создайте надёжный пароль для вашего аккаунта",
    newPassword: "Новый пароль",
    confirmPassword: "Подтвердите пароль",
    minChars: "8+ символов",
    uppercase: "Заглавная буква",
    lowercase: "Строчная буква",
    number: "Цифра",
    passwordRequirements: "Пароль не соответствует требованиям",
    passwordsNoMatch: "Пароли не совпадают",
    linkExpired: "Срок действия ссылки истёк. Пожалуйста, запросите новую.",
    failedReset: "Не удалось сбросить пароль",
    connectionError: "Ошибка соединения. Пожалуйста, попробуйте снова.",
    invalidOrExpired: "Недействительная или устаревшая ссылка для сброса. Пожалуйста, запросите новую.",
    resetting: "Сброс...",
    resetPassword: "Сбросить пароль",
  },
};

export default function ResetPasswordPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { lang } = useLanguage();

  const t = (key: string) => (translations as any)[lang]?.[key] || (translations as any).en[key] || key;

  const token = searchParams.get('token');
  const email = searchParams.get('email');

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Detect mobile UA on mount so we can render a prominent "Open in
  // App" CTA at the top of the page. We used to fire
  // window.location.href to the custom scheme automatically on mount,
  // but modern mobile browsers (especially in-app Gmail/Outlook
  // webviews) silently block scheme launches that aren't triggered by
  // a user gesture — so users ended up stuck on the web form not
  // realising the deep link existed. A real tap on the CTA below
  // bypasses that restriction.
  useEffect(() => {
    if (typeof navigator === 'undefined') return;
    const ua = navigator.userAgent || '';
    setIsMobile(/iPhone|iPad|iPod|Android/.test(ua));
  }, []);

  const deepLink =
    token && email
      ? `auxite-vault://onboarding/reset-password?token=${encodeURIComponent(token)}&email=${encodeURIComponent(email)}`
      : '';

  // Password validation
  const hasMinLength = password.length >= 8;
  const hasUppercase = /[A-Z]/.test(password);
  const hasLowercase = /[a-z]/.test(password);
  const hasNumber = /\d/.test(password);
  const passwordsMatch = password === confirmPassword && password.length > 0;

  // Check for valid token
  useEffect(() => {
    if (!token || !email) {
      setError(t('invalidOrExpired'));
    }
  }, [token, email]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validate
    if (!hasMinLength || !hasUppercase || !hasLowercase || !hasNumber) {
      setError(t('passwordRequirements'));
      return;
    }

    if (!passwordsMatch) {
      setError(t('passwordsNoMatch'));
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, token, newPassword: password }),
      });

      const data = await response.json();

      if (!data.success) {
        if (data.error?.includes('expired')) {
          setError(t('linkExpired'));
        } else {
          setError(data.error || t('failedReset'));
        }
        return;
      }

      setSuccess(true);

    } catch (err) {
      setError(t('connectionError'));
    } finally {
      setIsLoading(false);
    }
  };

  // Success State — most users who hit this page came from a mobile
  // app email link. Show "Open App" as the primary action so they get
  // dropped back into the native signin instead of having to switch
  // to web. Browsers that can't honor the custom scheme silently no-op,
  // and the web "Sign In" link below catches that case.
  if (success) {
    // Heuristic: anyone on iOS/Android UA is almost certainly here from
    // a tap inside the email client on their phone. Show the deep link
    // as the hero CTA for them; keep web-only Sign In as a secondary.
    const isMobile =
      typeof navigator !== 'undefined' &&
      /iPhone|iPad|iPod|Android/.test(navigator.userAgent || '');
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <div className="w-full max-w-md text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-[#2F6F62]/20 mb-6">
            <CheckCircle className="w-10 h-10 text-[#2F6F62]" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-3">{t('passwordChanged')}</h1>
          <p className="text-slate-400 mb-8">
            {t('passwordChangedDesc')}
          </p>
          {isMobile && (
            <a
              href="auxite-vault://onboarding/login"
              className="inline-flex items-center justify-center w-full px-8 py-3 mb-3 bg-gradient-to-r from-[#BFA181] to-[#D4B47A] text-black font-semibold rounded-xl hover:opacity-90 transition-all"
            >
              📱 {t('openAppToSignIn') || (
                lang === 'tr' ? 'Uygulamada Giriş Yap'
                : lang === 'de' ? 'In der App anmelden'
                : lang === 'fr' ? "Se connecter dans l'app"
                : lang === 'ar' ? 'سجّل الدخول في التطبيق'
                : lang === 'ru' ? 'Войти в приложении'
                : 'Sign In in the App'
              )}
            </a>
          )}
          <Link
            href="/auth/login"
            className={
              isMobile
                ? 'inline-flex items-center justify-center px-8 py-2 text-slate-400 text-sm hover:text-white transition-colors'
                : 'inline-flex items-center justify-center px-8 py-3 bg-gradient-to-r from-[#2F6F62] to-[#2F6F62] text-white font-semibold rounded-xl hover:from-[#2F6F62] hover:to-[#2F6F62]/80 transition-all'
            }
          >
            {isMobile
              ? (lang === 'tr' ? 'Veya tarayıcıdan devam et'
                : lang === 'de' ? 'Oder im Browser fortfahren'
                : lang === 'fr' ? 'Ou continuer dans le navigateur'
                : lang === 'ar' ? 'أو متابعة في المتصفح'
                : lang === 'ru' ? 'Или продолжить в браузере'
                : 'Or continue in browser')
              : t('signIn')}
          </Link>
        </div>
      </div>
    );
  }

  // Invalid Link State
  if (!token || !email) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <div className="w-full max-w-md text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-red-500/20 mb-6">
            <AlertCircle className="w-10 h-10 text-red-500" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-3">{t('invalidLink')}</h1>
          <p className="text-slate-400 mb-8">
            {t('invalidLinkDesc')}
          </p>
          <Link
            href="/auth/forgot-password"
            className="inline-flex items-center justify-center px-8 py-3 bg-gradient-to-r from-[#2F6F62] to-[#2F6F62] text-white font-semibold rounded-xl hover:from-[#2F6F62] hover:to-[#2F6F62]/80 transition-all"
          >
            {t('requestNewLink')}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-start p-4 pt-6">
      <div className="w-full max-w-md">
        {/* Mobile deep-link CTA — pinned above the form so users
            arriving from the email link on their phone can jump
            straight into the native Auxite Vault app where their
            session lives. We can't auto-fire the scheme (mobile
            browsers block scheme launches without a user gesture and
            silently swallow them in in-app email webviews) so we make
            this CTA loud and unmissable. If the user doesn't have the
            app installed the tap silently no-ops and they can finish
            on the web form below. */}
        {isMobile && deepLink && (
          <a
            href={deepLink}
            className="block w-full mb-6 rounded-xl bg-gradient-to-r from-[#BFA181] to-[#D4B47A] p-4 hover:opacity-95 transition-all shadow-lg shadow-[#BFA181]/20"
          >
            <div className="flex items-center gap-3">
              <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-black/20 flex items-center justify-center">
                <Smartphone className="w-5 h-5 text-black" />
              </div>
              <div className="flex-1 min-w-0 text-left">
                <p className="text-[13px] font-bold text-black leading-tight">
                  {lang === 'tr' ? 'Uygulamada Sıfırla'
                    : lang === 'de' ? 'In der App zurücksetzen'
                    : lang === 'fr' ? "Réinitialiser dans l'app"
                    : lang === 'ar' ? 'إعادة التعيين في التطبيق'
                    : lang === 'ru' ? 'Сбросить в приложении'
                    : 'Reset in the App'}
                </p>
                <p className="text-[11px] text-black/70 mt-0.5 leading-tight">
                  {lang === 'tr' ? 'Auxite Vault yüklüyse buraya dokun — oturumun orada'
                    : lang === 'de' ? 'Wenn Auxite Vault installiert ist — Sitzung dort'
                    : lang === 'fr' ? 'Si Auxite Vault est installée — session là-bas'
                    : lang === 'ar' ? 'إذا كان Auxite Vault مثبتًا — جلستك هناك'
                    : lang === 'ru' ? 'Если Auxite Vault установлен — сессия там'
                    : 'If Auxite Vault is installed, your session lives there'}
                </p>
              </div>
              <ExternalLink className="w-4 h-4 text-black flex-shrink-0" />
            </div>
          </a>
        )}

        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-[#2F6F62]/20 mb-4">
            <Lock className="w-8 h-8 text-[#2F6F62]" />
          </div>
          <h1 className="text-2xl font-bold text-white">{t('setNewPassword')}</h1>
          <p className="text-slate-400 mt-2">
            {t('createStrongPassword')}
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* New Password */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              {t('newPassword')}
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-10 pr-12 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-[#BFA181] focus:border-transparent transition-all"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-300"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>

            {/* Password Requirements */}
            <div className="grid grid-cols-2 gap-2 mt-3">
              <div className={`flex items-center gap-1.5 text-xs ${hasMinLength ? 'text-[#2F6F62]' : 'text-slate-500'}`}>
                <CheckCircle className="w-3.5 h-3.5" />
                {t('minChars')}
              </div>
              <div className={`flex items-center gap-1.5 text-xs ${hasUppercase ? 'text-[#2F6F62]' : 'text-slate-500'}`}>
                <CheckCircle className="w-3.5 h-3.5" />
                {t('uppercase')}
              </div>
              <div className={`flex items-center gap-1.5 text-xs ${hasLowercase ? 'text-[#2F6F62]' : 'text-slate-500'}`}>
                <CheckCircle className="w-3.5 h-3.5" />
                {t('lowercase')}
              </div>
              <div className={`flex items-center gap-1.5 text-xs ${hasNumber ? 'text-[#2F6F62]' : 'text-slate-500'}`}>
                <CheckCircle className="w-3.5 h-3.5" />
                {t('number')}
              </div>
            </div>
          </div>

          {/* Confirm Password */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              {t('confirmPassword')}
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type={showPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                className={`w-full pl-10 pr-12 py-3 bg-slate-800 border rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-[#BFA181] focus:border-transparent transition-all ${
                  confirmPassword && !passwordsMatch ? 'border-red-500' : 'border-slate-700'
                }`}
                required
              />
              {confirmPassword && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  {passwordsMatch ? (
                    <CheckCircle className="w-5 h-5 text-[#2F6F62]" />
                  ) : (
                    <AlertCircle className="w-5 h-5 text-red-500" />
                  )}
                </div>
              )}
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
                {t('resetting')}
              </>
            ) : (
              t('resetPassword')
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
