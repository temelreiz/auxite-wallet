// src/app/auth/login/page.tsx
// Client Sign In - Institutional terminology synced with mobile

'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { useLanguage } from '@/components/LanguageContext';

// ============================================
// TRANSLATIONS - Synced with Mobile
// ============================================
const translations: Record<string, Record<string, string>> = {
  tr: {
    title: "Müşteri Girişi",
    subtitle: "Kasanıza erişin",
    email: "E-posta Adresi",
    password: "Şifre",
    forgotPassword: "Şifremi Unuttum",
    signIn: "Giriş Yap",
    newClient: "Yeni müşteri misiniz?",
    establishVault: "Kasa Oluştur",
    continueApple: "Apple ile Giriş",
    continueGoogle: "Google ile Giriş",
    or: "veya",
    invalidCredentials: "Geçersiz e-posta veya şifre",
    connectionError: "Bağlantı hatası. Tekrar deneyin.",
    signingIn: "Giriş yapılıyor...",
    brandTagline: "DİJİTAL VARLIK SAKLAMA",
  },
  en: {
    title: "Client Sign In",
    subtitle: "Access your vault",
    email: "Email Address",
    password: "Password",
    forgotPassword: "Forgot Password",
    signIn: "Sign In",
    newClient: "New client?",
    establishVault: "Establish Vault",
    continueApple: "Sign in with Apple",
    continueGoogle: "Sign in with Google",
    or: "or",
    invalidCredentials: "Invalid email or password",
    connectionError: "Connection error. Please try again.",
    signingIn: "Signing in...",
    brandTagline: "DIGITAL ASSET CUSTODY",
  },
  de: {
    title: "Kundenlogin",
    subtitle: "Zugriff auf Ihren Tresor",
    email: "E-Mail-Adresse",
    password: "Passwort",
    forgotPassword: "Passwort vergessen",
    signIn: "Anmelden",
    newClient: "Neuer Kunde?",
    establishVault: "Tresor erstellen",
    continueApple: "Mit Apple anmelden",
    continueGoogle: "Mit Google anmelden",
    or: "oder",
    invalidCredentials: "Ungültige E-Mail oder Passwort",
    connectionError: "Verbindungsfehler. Bitte erneut versuchen.",
    signingIn: "Anmeldung...",
    brandTagline: "DIGITALE VERMÖGENSVERWALTUNG",
  },
  fr: {
    title: "Connexion Client",
    subtitle: "Accédez à votre coffre",
    email: "Adresse e-mail",
    password: "Mot de passe",
    forgotPassword: "Mot de passe oublié",
    signIn: "Se connecter",
    newClient: "Nouveau client ?",
    establishVault: "Créer un coffre",
    continueApple: "Connexion avec Apple",
    continueGoogle: "Connexion avec Google",
    or: "ou",
    invalidCredentials: "E-mail ou mot de passe invalide",
    connectionError: "Erreur de connexion. Veuillez réessayer.",
    signingIn: "Connexion...",
    brandTagline: "GARDE D'ACTIFS NUMÉRIQUES",
  },
  ar: {
    title: "تسجيل دخول العميل",
    subtitle: "الوصول إلى خزنتك",
    email: "عنوان البريد الإلكتروني",
    password: "كلمة المرور",
    forgotPassword: "نسيت كلمة المرور",
    signIn: "تسجيل الدخول",
    newClient: "عميل جديد؟",
    establishVault: "إنشاء خزنة",
    continueApple: "الدخول مع Apple",
    continueGoogle: "الدخول مع Google",
    or: "أو",
    invalidCredentials: "بريد إلكتروني أو كلمة مرور غير صالحة",
    connectionError: "خطأ في الاتصال. حاول مرة أخرى.",
    signingIn: "جاري تسجيل الدخول...",
    brandTagline: "حفظ الأصول الرقمية",
  },
  ru: {
    title: "Вход клиента",
    subtitle: "Доступ к вашему хранилищу",
    email: "Адрес электронной почты",
    password: "Пароль",
    forgotPassword: "Забыли пароль",
    signIn: "Войти",
    newClient: "Новый клиент?",
    establishVault: "Создать хранилище",
    continueApple: "Войти через Apple",
    continueGoogle: "Войти через Google",
    or: "или",
    invalidCredentials: "Неверный email или пароль",
    connectionError: "Ошибка подключения. Попробуйте снова.",
    signingIn: "Вход...",
    brandTagline: "ХРАНЕНИЕ ЦИФРОВЫХ АКТИВОВ",
  },
};

export default function LoginPage() {
  const router = useRouter();
  const { lang } = useLanguage();
  const t = translations[lang] || translations.en;

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;

    setError('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!data.success) {
        setError(data.error || t.invalidCredentials);
        return;
      }

      // Store token and user data
      localStorage.setItem('authToken', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));

      // Debug log
      console.log('[Login] Response:', data);
      console.log('[Login] Wallet Address:', data.user.walletAddress);

      // Store wallet address for TopNav display
      // Use walletAddress from response, or generate placeholder from vaultId
      const displayAddress = data.user.walletAddress ||
        (data.user.vaultId ? `0x${data.user.vaultId.slice(0, 40)}` : null) ||
        (data.user.id ? `0x${data.user.id.replace(/[^a-f0-9]/gi, '').slice(0, 40).padEnd(40, '0')}` : null);

      if (displayAddress) {
        localStorage.setItem('auxite_wallet_address', displayAddress);
        localStorage.setItem('auxite_wallet_mode', 'custody');
        // Dispatch event to notify TopNav
        window.dispatchEvent(new Event('walletChanged'));
        console.log('[Login] Stored address:', displayAddress);
      }

      // Redirect to main app
      router.push('/');
    } catch (err) {
      setError(t.connectionError);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = () => {
    window.location.href = `/api/auth/google/redirect`;
  };

  const isValidEmail = email.includes('@') && email.includes('.');
  const canSignIn = isValidEmail && password.length >= 8;

  return (
    <div className="min-h-screen bg-stone-100 dark:bg-slate-950 flex flex-col">
      {/* Logo Area - Synced with Mobile */}
      <div className="pt-16 pb-10 text-center">
        <div className="w-24 h-24 rounded-3xl bg-[#BFA181]/15 flex items-center justify-center mx-auto mb-4">
          <svg className="w-12 h-12 text-[#BFA181]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-[#BFA181] tracking-widest">AUXITE</h1>
        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 tracking-wider mt-1">
          {t.brandTagline}
        </p>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col justify-center px-6 pb-8">
        <div className="max-w-md w-full mx-auto">
          {/* Title */}
          <div className="mb-8">
            <h2 className="text-3xl font-bold text-slate-800 dark:text-white mb-2">{t.title}</h2>
            <p className="text-slate-500 dark:text-slate-400">{t.subtitle}</p>
          </div>

          {/* Form */}
          <form onSubmit={handleLogin} className="space-y-5">
            {/* Email */}
            <div>
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-2 tracking-wide">
                {t.email}
              </label>
              <div className="relative">
                <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="client@example.com"
                  className="w-full pl-12 pr-4 py-4 bg-white dark:bg-slate-900 border border-stone-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#BFA181] focus:border-transparent transition-all"
                  required
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-2 tracking-wide">
                {t.password}
              </label>
              <div className="relative">
                <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-12 pr-12 py-4 bg-white dark:bg-slate-900 border border-stone-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#BFA181] focus:border-transparent transition-all"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? (
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {/* Forgot Password */}
            <div className="flex justify-end">
              <Link
                href="/auth/forgot-password"
                className="text-sm font-semibold text-[#BFA181] hover:text-[#BFA181] transition-colors"
              >
                {t.forgotPassword}
              </Link>
            </div>

            {/* Error */}
            {error && (
              <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-xl">
                <svg className="w-5 h-5 text-red-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-sm text-red-500">{error}</p>
              </div>
            )}

            {/* Sign In Button - Institutional Gold */}
            <button
              type="submit"
              disabled={!canSignIn || isLoading}
              className={`w-full py-4 rounded-xl font-bold text-base transition-all flex items-center justify-center gap-2 ${
                canSignIn
                  ? 'bg-[#BFA181] hover:bg-[#BFA181] text-black'
                  : 'bg-[#BFA181]/40 text-black/50 cursor-not-allowed'
              }`}
            >
              {isLoading ? t.signingIn : t.signIn}
              {!isLoading && (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-4 my-6">
            <div className="flex-1 h-px bg-stone-200 dark:bg-slate-700" />
            <span className="text-sm text-slate-400">{t.or}</span>
            <div className="flex-1 h-px bg-stone-200 dark:bg-slate-700" />
          </div>

          {/* Social Sign In - Synced with Mobile */}
          <div className="space-y-3">
            <button
              type="button"
              className="w-full py-3.5 bg-white dark:bg-slate-900 border border-stone-200 dark:border-slate-700 text-slate-800 dark:text-white font-medium rounded-xl hover:bg-stone-50 dark:hover:bg-slate-800 transition-all flex items-center justify-center gap-3"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.913 1.183-4.961 3.014-2.117 3.675-.546 9.103 1.519 12.09 1.013 1.454 2.208 3.09 3.792 3.039 1.52-.065 2.09-.987 3.935-.987 1.831 0 2.35.987 3.96.948 1.637-.026 2.676-1.48 3.676-2.948 1.156-1.688 1.636-3.325 1.662-3.415-.039-.013-3.182-1.221-3.22-4.857-.026-3.04 2.48-4.494 2.597-4.559-1.429-2.09-3.623-2.324-4.39-2.376-2-.156-3.675 1.09-4.61 1.09zM15.53 3.83c.843-1.012 1.4-2.427 1.245-3.83-1.207.052-2.662.805-3.532 1.818-.78.896-1.454 2.338-1.273 3.714 1.338.104 2.715-.688 3.559-1.701"/>
              </svg>
              {t.continueApple}
            </button>

            <button
              onClick={handleGoogleLogin}
              type="button"
              className="w-full py-3.5 bg-white dark:bg-slate-900 border border-stone-200 dark:border-slate-700 text-slate-800 dark:text-white font-medium rounded-xl hover:bg-stone-50 dark:hover:bg-slate-800 transition-all flex items-center justify-center gap-3"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#EA4335" d="M5.26620003,9.76452941 C6.19878754,6.93863203 8.85444915,4.90909091 12,4.90909091 C13.6909091,4.90909091 15.2181818,5.50909091 16.4181818,6.49090909 L19.9090909,3 C17.7818182,1.14545455 15.0545455,0 12,0 C7.27006974,0 3.1977497,2.69829785 1.23999023,6.65002441 L5.26620003,9.76452941 Z"/>
                <path fill="#34A853" d="M16.0407269,18.0125889 C14.9509167,18.7163016 13.5660892,19.0909091 12,19.0909091 C8.86648613,19.0909091 6.21911939,17.076871 5.27698177,14.2678769 L1.23746264,17.3349879 C3.19279051,21.2936293 7.26500293,24 12,24 C14.9328362,24 17.7353462,22.9573905 19.834192,20.9995801 L16.0407269,18.0125889 Z"/>
                <path fill="#4A90E2" d="M19.834192,20.9995801 C22.0291676,18.9520994 23.4545455,15.903663 23.4545455,12 C23.4545455,11.2909091 23.3454545,10.5272727 23.1818182,9.81818182 L12,9.81818182 L12,14.4545455 L18.4363636,14.4545455 C18.1187732,16.013626 17.2662994,17.2212117 16.0407269,18.0125889 L19.834192,20.9995801 Z"/>
                <path fill="#FBBC05" d="M5.27698177,14.2678769 C5.03832634,13.556323 4.90909091,12.7937589 4.90909091,12 C4.90909091,11.2182781 5.03443647,10.4668121 5.26620003,9.76452941 L1.23999023,6.65002441 C0.43658717,8.26043162 0,10.0753848 0,12 C0,13.9195484 0.444780743,15.7301709 1.23746264,17.3349879 L5.27698177,14.2678769 Z"/>
              </svg>
              {t.continueGoogle}
            </button>
          </div>

          {/* New Client */}
          <div className="flex items-center justify-center gap-2 mt-8">
            <span className="text-slate-500 dark:text-slate-400">{t.newClient}</span>
            <Link
              href="/auth/register"
              className="text-[#BFA181] font-semibold hover:text-[#BFA181] transition-colors"
            >
              {t.establishVault}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
