// src/app/auth/register/page.tsx
// Web Register Page

'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Loader2, Mail, Lock, Eye, EyeOff, AlertCircle, User, CheckCircle } from 'lucide-react';
import { useLanguage } from "@/components/LanguageContext";

const translations: Record<string, Record<string, string>> = {
  tr: {
    checkYourEmail: "E-postanızı Kontrol Edin",
    verificationLinkSent: "Doğrulama bağlantısı gönderildi:",
    clickLinkToVerify: "Hesabınızı doğrulamak ve başlamak için e-postadaki bağlantıya tıklayın.",
    backToLogin: "Girişe Dön",
    createAccountTitle: "Hesap Oluştur",
    joinAuxite: "Bugün Auxite'a katılın",
    fullName: "Ad Soyad",
    email: "E-posta",
    password: "Şifre",
    confirmPassword: "Şifreyi Onayla",
    minChars: "8+ karakter",
    uppercase: "Büyük harf",
    lowercase: "Küçük harf",
    number: "Rakam",
    passwordRequirements: "Şifre gereksinimleri karşılanmıyor",
    passwordsNoMatch: "Şifreler eşleşmiyor",
    registrationFailed: "Kayıt başarısız",
    connectionError: "Bağlantı hatası. Lütfen tekrar deneyin.",
    creatingAccount: "Hesap oluşturuluyor...",
    createAccountBtn: "Hesap Oluştur",
    or: "veya",
    continueApple: "Apple ile Devam Et",
    continueWithGoogle: "Google ile Devam Et",
    alreadyHaveAccount: "Zaten bir hesabınız var mı?",
    signIn: "Giriş yap",
    bySigningUp: "Kaydolarak, şartlarımızı kabul etmiş olursunuz:",
    termsOfService: "Hizmet Şartları",
    and: "ve",
    privacyPolicy: "Gizlilik Politikası",
  },
  en: {
    checkYourEmail: "Check Your Email",
    verificationLinkSent: "We've sent a verification link to",
    clickLinkToVerify: "Click the link in the email to verify your account and get started.",
    backToLogin: "Back to Login",
    createAccountTitle: "Create Account",
    joinAuxite: "Join Auxite today",
    fullName: "Full Name",
    email: "Email",
    password: "Password",
    confirmPassword: "Confirm Password",
    minChars: "8+ characters",
    uppercase: "Uppercase",
    lowercase: "Lowercase",
    number: "Number",
    passwordRequirements: "Password does not meet requirements",
    passwordsNoMatch: "Passwords do not match",
    registrationFailed: "Registration failed",
    connectionError: "Connection error. Please try again.",
    creatingAccount: "Creating account...",
    createAccountBtn: "Create Account",
    or: "or",
    continueApple: "Continue with Apple",
    continueWithGoogle: "Continue with Google",
    alreadyHaveAccount: "Already have an account?",
    signIn: "Sign in",
    bySigningUp: "By signing up, you agree to our",
    termsOfService: "Terms of Service",
    and: "and",
    privacyPolicy: "Privacy Policy",
  },
  de: {
    checkYourEmail: "Überprüfen Sie Ihre E-Mail",
    verificationLinkSent: "Wir haben einen Bestätigungslink gesendet an",
    clickLinkToVerify: "Klicken Sie auf den Link in der E-Mail, um Ihr Konto zu bestätigen und loszulegen.",
    backToLogin: "Zurück zur Anmeldung",
    createAccountTitle: "Konto erstellen",
    joinAuxite: "Treten Sie Auxite heute bei",
    fullName: "Vollständiger Name",
    email: "E-Mail",
    password: "Passwort",
    confirmPassword: "Passwort bestätigen",
    minChars: "8+ Zeichen",
    uppercase: "Großbuchstabe",
    lowercase: "Kleinbuchstabe",
    number: "Zahl",
    passwordRequirements: "Passwort erfüllt nicht die Anforderungen",
    passwordsNoMatch: "Passwörter stimmen nicht überein",
    registrationFailed: "Registrierung fehlgeschlagen",
    connectionError: "Verbindungsfehler. Bitte versuchen Sie es erneut.",
    creatingAccount: "Konto wird erstellt...",
    createAccountBtn: "Konto erstellen",
    or: "oder",
    continueApple: "Weiter mit Apple",
    continueWithGoogle: "Weiter mit Google",
    alreadyHaveAccount: "Haben Sie bereits ein Konto?",
    signIn: "Anmelden",
    bySigningUp: "Mit der Registrierung stimmen Sie unseren",
    termsOfService: "Nutzungsbedingungen",
    and: "und",
    privacyPolicy: "Datenschutzrichtlinie",
  },
  fr: {
    checkYourEmail: "Vérifiez votre e-mail",
    verificationLinkSent: "Nous avons envoyé un lien de vérification à",
    clickLinkToVerify: "Cliquez sur le lien dans l'e-mail pour vérifier votre compte et commencer.",
    backToLogin: "Retour à la connexion",
    createAccountTitle: "Créer un compte",
    joinAuxite: "Rejoignez Auxite aujourd'hui",
    fullName: "Nom complet",
    email: "E-mail",
    password: "Mot de passe",
    confirmPassword: "Confirmer le mot de passe",
    minChars: "8+ caractères",
    uppercase: "Majuscule",
    lowercase: "Minuscule",
    number: "Chiffre",
    passwordRequirements: "Le mot de passe ne répond pas aux exigences",
    passwordsNoMatch: "Les mots de passe ne correspondent pas",
    registrationFailed: "Échec de l'inscription",
    connectionError: "Erreur de connexion. Veuillez réessayer.",
    creatingAccount: "Création du compte...",
    createAccountBtn: "Créer un compte",
    or: "ou",
    continueApple: "Continuer avec Apple",
    continueWithGoogle: "Continuer avec Google",
    alreadyHaveAccount: "Vous avez déjà un compte ?",
    signIn: "Se connecter",
    bySigningUp: "En vous inscrivant, vous acceptez nos",
    termsOfService: "Conditions d'utilisation",
    and: "et",
    privacyPolicy: "Politique de confidentialité",
  },
  ar: {
    checkYourEmail: "تحقق من بريدك الإلكتروني",
    verificationLinkSent: "لقد أرسلنا رابط التحقق إلى",
    clickLinkToVerify: "انقر على الرابط في البريد الإلكتروني للتحقق من حسابك والبدء.",
    backToLogin: "العودة لتسجيل الدخول",
    createAccountTitle: "إنشاء حساب",
    joinAuxite: "انضم إلى Auxite اليوم",
    fullName: "الاسم الكامل",
    email: "البريد الإلكتروني",
    password: "كلمة المرور",
    confirmPassword: "تأكيد كلمة المرور",
    minChars: "٨+ أحرف",
    uppercase: "حرف كبير",
    lowercase: "حرف صغير",
    number: "رقم",
    passwordRequirements: "كلمة المرور لا تستوفي المتطلبات",
    passwordsNoMatch: "كلمات المرور غير متطابقة",
    registrationFailed: "فشل التسجيل",
    connectionError: "خطأ في الاتصال. يرجى المحاولة مرة أخرى.",
    creatingAccount: "جاري إنشاء الحساب...",
    createAccountBtn: "إنشاء حساب",
    or: "أو",
    continueApple: "المتابعة مع Apple",
    continueWithGoogle: "المتابعة مع جوجل",
    alreadyHaveAccount: "هل لديك حساب بالفعل؟",
    signIn: "تسجيل الدخول",
    bySigningUp: "بالتسجيل، فإنك توافق على",
    termsOfService: "شروط الخدمة",
    and: "و",
    privacyPolicy: "سياسة الخصوصية",
  },
  ru: {
    checkYourEmail: "Проверьте вашу почту",
    verificationLinkSent: "Мы отправили ссылку для подтверждения на",
    clickLinkToVerify: "Нажмите на ссылку в письме, чтобы подтвердить аккаунт и начать работу.",
    backToLogin: "Вернуться к входу",
    createAccountTitle: "Создать аккаунт",
    joinAuxite: "Присоединяйтесь к Auxite сегодня",
    fullName: "Полное имя",
    email: "Эл. почта",
    password: "Пароль",
    confirmPassword: "Подтвердите пароль",
    minChars: "8+ символов",
    uppercase: "Заглавная буква",
    lowercase: "Строчная буква",
    number: "Цифра",
    passwordRequirements: "Пароль не соответствует требованиям",
    passwordsNoMatch: "Пароли не совпадают",
    registrationFailed: "Регистрация не удалась",
    connectionError: "Ошибка соединения. Попробуйте ещё раз.",
    creatingAccount: "Создание аккаунта...",
    createAccountBtn: "Создать аккаунт",
    or: "или",
    continueApple: "Продолжить с Apple",
    continueWithGoogle: "Продолжить с Google",
    alreadyHaveAccount: "Уже есть аккаунт?",
    signIn: "Войти",
    bySigningUp: "Регистрируясь, вы соглашаетесь с нашими",
    termsOfService: "Условия использования",
    and: "и",
    privacyPolicy: "Политика конфиденциальности",
  },
};

export default function RegisterPage() {
  const router = useRouter();
  const { lang } = useLanguage();
  const t = (key: string) => (translations as any)[lang]?.[key] || (translations as any).en[key] || key;
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  // Password validation
  const hasMinLength = password.length >= 8;
  const hasUppercase = /[A-Z]/.test(password);
  const hasLowercase = /[a-z]/.test(password);
  const hasNumber = /\d/.test(password);
  const passwordsMatch = password === confirmPassword && password.length > 0;

  const handleRegister = async (e: React.FormEvent) => {
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
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, name, language: lang }),
      });

      const data = await response.json();

      if (!data.success) {
        setError(data.error || t('registrationFailed'));
        return;
      }

      // Show success message
      setSuccess(true);

    } catch (err) {
      setError(t('connectionError'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleAppleLogin = () => {
    window.location.href = `/api/auth/apple/redirect`;
  };

  const handleGoogleLogin = () => {
    window.location.href = `/api/auth/google/redirect`;
  };

  // Success State
  if (success) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <div className="w-full max-w-md text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-[#2F6F62]/20 mb-6">
            <Mail className="w-10 h-10 text-[#2F6F62]" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-3">{t('checkYourEmail')}</h1>
          <p className="text-slate-400 mb-2">
            {t('verificationLinkSent')}
          </p>
          <p className="text-[#2F6F62] font-medium mb-8">{email}</p>
          <p className="text-sm text-slate-500 mb-6">
            {t('clickLinkToVerify')}
          </p>
          <Link
            href="/auth/login"
            className="inline-flex items-center justify-center px-6 py-3 bg-slate-800 text-white font-medium rounded-xl hover:bg-slate-700 transition-colors"
          >
            {t('backToLogin')}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-[#2F6F62]/20 mb-3">
            <svg className="w-7 h-7 text-[#2F6F62]" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-white">{t('createAccountTitle')}</h1>
          <p className="text-slate-400 mt-1">{t('joinAuxite')}</p>
        </div>

        {/* Form */}
        <form onSubmit={handleRegister} className="space-y-4">
          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">
              {t('fullName')}
            </label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="John Doe"
                className="w-full pl-10 pr-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-[#BFA181] focus:border-transparent transition-all"
                required
              />
            </div>
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">
              {t('email')}
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full pl-10 pr-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-[#BFA181] focus:border-transparent transition-all"
                required
              />
            </div>
          </div>

          {/* Password */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">
              {t('password')}
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-10 pr-12 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-[#BFA181] focus:border-transparent transition-all"
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
            <div className="grid grid-cols-2 gap-2 mt-2">
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
            <label className="block text-sm font-medium text-slate-300 mb-1.5">
              {t('confirmPassword')}
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type={showPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                className={`w-full pl-10 pr-4 py-2.5 bg-slate-800 border rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-[#BFA181] focus:border-transparent transition-all ${
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

          {/* Terms */}
          <p className="text-xs text-slate-500 text-center">
            {t('bySigningUp')}{' '}
            <Link href="/terms" className="text-[#2F6F62] hover:underline">{t('termsOfService')}</Link>
            {' '}{t('and')}{' '}
            <Link href="/privacy" className="text-[#2F6F62] hover:underline">{t('privacyPolicy')}</Link>
          </p>

          {/* Submit */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 bg-gradient-to-r from-[#2F6F62] to-[#2F6F62] text-white font-semibold rounded-xl hover:from-[#2F6F62] hover:to-[#2F6F62]/80 focus:outline-none focus:ring-2 focus:ring-[#BFA181] focus:ring-offset-2 focus:ring-offset-slate-900 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                {t('creatingAccount')}
              </>
            ) : (
              t('createAccountBtn')
            )}
          </button>
        </form>

        {/* Divider */}
        <div className="flex items-center gap-4 my-5">
          <div className="flex-1 h-px bg-slate-700" />
          <span className="text-xs text-slate-500">{t('or')}</span>
          <div className="flex-1 h-px bg-slate-700" />
        </div>

        {/* OAuth */}
        <div className="space-y-3">
          <button
            onClick={handleAppleLogin}
            type="button"
            className="w-full py-2.5 bg-slate-800 border border-slate-700 text-white font-medium rounded-xl hover:bg-slate-750 hover:border-slate-600 transition-all flex items-center justify-center gap-3"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
            </svg>
            {t('continueApple')}
          </button>

          <button
            onClick={handleGoogleLogin}
            className="w-full py-2.5 bg-slate-800 border border-slate-700 text-white font-medium rounded-xl hover:bg-slate-750 hover:border-slate-600 transition-all flex items-center justify-center gap-3"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="#EA4335" d="M5.26620003,9.76452941 C6.19878754,6.93863203 8.85444915,4.90909091 12,4.90909091 C13.6909091,4.90909091 15.2181818,5.50909091 16.4181818,6.49090909 L19.9090909,3 C17.7818182,1.14545455 15.0545455,0 12,0 C7.27006974,0 3.1977497,2.69829785 1.23999023,6.65002441 L5.26620003,9.76452941 Z"/>
              <path fill="#34A853" d="M16.0407269,18.0125889 C14.9509167,18.7163016 13.5660892,19.0909091 12,19.0909091 C8.86648613,19.0909091 6.21911939,17.076871 5.27698177,14.2678769 L1.23746264,17.3349879 C3.19279051,21.2936293 7.26500293,24 12,24 C14.9328362,24 17.7353462,22.9573905 19.834192,20.9995801 L16.0407269,18.0125889 Z"/>
              <path fill="#4A90E2" d="M19.834192,20.9995801 C22.0291676,18.9520994 23.4545455,15.903663 23.4545455,12 C23.4545455,11.2909091 23.3454545,10.5272727 23.1818182,9.81818182 L12,9.81818182 L12,14.4545455 L18.4363636,14.4545455 C18.1187732,16.013626 17.2662994,17.2212117 16.0407269,18.0125889 L19.834192,20.9995801 Z"/>
              <path fill="#FBBC05" d="M5.27698177,14.2678769 C5.03832634,13.556323 4.90909091,12.7937589 4.90909091,12 C4.90909091,11.2182781 5.03443647,10.4668121 5.26620003,9.76452941 L1.23999023,6.65002441 C0.43658717,8.26043162 0,10.0753848 0,12 C0,13.9195484 0.444780743,15.7301709 1.23746264,17.3349879 L5.27698177,14.2678769 Z"/>
            </svg>
            {t('continueWithGoogle')}
          </button>
        </div>

        {/* Login Link */}
        <p className="text-center text-slate-400 mt-6">
          {t('alreadyHaveAccount')}{' '}
          <Link href="/auth/login" className="text-[#2F6F62] hover:text-[#2F6F62] font-medium transition-colors">
            {t('signIn')}
          </Link>
        </p>
      </div>
    </div>
  );
}
