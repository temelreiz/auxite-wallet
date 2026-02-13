// src/app/auth/callback/page.tsx
// OAuth Callback Handler - Saves token to localStorage and redirects

'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { useLanguage } from "@/components/LanguageContext";

const translations: Record<string, Record<string, string>> = {
  tr: { completingSignIn: "Giriş tamamlanıyor...", pleaseWait: "Lütfen bekleyin" },
  en: { completingSignIn: "Completing sign in...", pleaseWait: "Please wait" },
  de: { completingSignIn: "Anmeldung wird abgeschlossen...", pleaseWait: "Bitte warten" },
  fr: { completingSignIn: "Connexion en cours...", pleaseWait: "Veuillez patienter" },
  ar: { completingSignIn: "جاري إتمام تسجيل الدخول...", pleaseWait: "يرجى الانتظار" },
  ru: { completingSignIn: "Завершение входа...", pleaseWait: "Пожалуйста, подождите" },
};

export default function AuthCallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { lang } = useLanguage();
  const t = (key: string) => (translations as any)[lang]?.[key] || (translations as any).en[key] || key;

  useEffect(() => {
    const token = searchParams.get('token');
    const userParam = searchParams.get('user');
    const error = searchParams.get('error');

    if (error) {
      console.error('OAuth error:', error);
      router.push(`/auth/login?error=${error}`);
      return;
    }

    if (token && userParam) {
      try {
        // Save to localStorage
        localStorage.setItem('authToken', token);

        const user = JSON.parse(decodeURIComponent(userParam));
        localStorage.setItem('user', JSON.stringify(user));

        // Store wallet address for TopNav display (same as login flow)
        const displayAddress = user.walletAddress || null;
        if (displayAddress) {
          localStorage.setItem('auxite_wallet_address', displayAddress);
          localStorage.setItem('auxite_wallet_mode', 'custody');
          window.dispatchEvent(new Event('walletChanged'));
          console.log('[OAuth Callback] Stored address:', displayAddress);
        }

        // Redirect to vault
        router.push('/vault');
      } catch (e) {
        console.error('Failed to parse user data:', e);
        router.push('/auth/login?error=parse_failed');
      }
    } else {
      router.push('/auth/login?error=missing_data');
    }
  }, [searchParams, router]);

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center">
      <div className="text-center">
        <Loader2 className="w-12 h-12 text-[#2F6F62] animate-spin mx-auto mb-4" />
        <p className="text-white text-lg">{t("completingSignIn")}</p>
        <p className="text-slate-400 text-sm mt-2">{t("pleaseWait")}</p>
      </div>
    </div>
  );
}
