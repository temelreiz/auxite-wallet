// src/app/auth/verify-email/page.tsx
// Web Email Verification Page — supports both token link and 6-digit code entry

'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Loader2, Mail, AlertCircle, CheckCircle } from 'lucide-react';
import { useLanguage } from "@/components/LanguageContext";

const translations: Record<string, Record<string, string>> = {
  tr: {
    verifyingEmail: "E-posta Dogrulanıyor...",
    pleaseWait: "E-posta adresinizi dogrularken lutfen bekleyin.",
    emailVerified: "E-posta Dogrulandı!",
    emailVerifiedDesc: "E-posta adresiniz basarıyla dogrulandı. Artık Auxite hesabınızın tum ozelliklerine erisebilirsiniz.",
    goToDashboard: "Panele Git",
    alreadyVerified: "Zaten Dogrulanmıs",
    alreadyVerifiedDesc: "Bu e-posta adresi zaten dogrulanmıs. Hesabınıza giris yapabilirsiniz.",
    signIn: "Giris Yap",
    verificationFailed: "Dogrulama Basarısız",
    linkExpired: "Dogrulama baglantısının suresi dolmus veya zaten kullanılmıs olabilir.",
    createAccount: "Hesap Olustur",
    invalidLink: "Gecersiz dogrulama baglantısı",
    verificationFailedError: "Dogrulama basarısız oldu",
    connectionError: "Baglantı hatası. Lutfen tekrar deneyin.",
    enterCode: "Dogrulama Kodu Girin",
    enterCodeDesc: "E-posta adresinize gonderilen 6 haneli dogrulama kodunu girin.",
    codeSentTo: "Kod gonderildi:",
    verify: "Dogrula",
    resendCode: "Kodu Tekrar Gonder",
    codeSent: "Yeni kod gonderildi!",
    invalidCode: "Gecersiz dogrulama kodu",
    codeExpired: "Dogrulama kodunun suresi doldu. Lutfen yeni kod isteyin.",
    emailNotVerified: "E-posta Dogrulanmadı",
    emailNotVerifiedDesc: "Hesabınıza erismek icin e-posta adresinizi dogrulamanız gerekiyor.",
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
    enterCode: "Enter Verification Code",
    enterCodeDesc: "Enter the 6-digit verification code sent to your email address.",
    codeSentTo: "Code sent to:",
    verify: "Verify",
    resendCode: "Resend Code",
    codeSent: "New code sent!",
    invalidCode: "Invalid verification code",
    codeExpired: "Verification code expired. Please request a new one.",
    emailNotVerified: "Email Not Verified",
    emailNotVerifiedDesc: "You need to verify your email address to access your account.",
  },
  de: {
    verifyingEmail: "E-Mail wird uberpruft...",
    pleaseWait: "Bitte warten Sie, wahrend wir Ihre E-Mail-Adresse uberprufen.",
    emailVerified: "E-Mail bestatigt!",
    emailVerifiedDesc: "Ihre E-Mail-Adresse wurde erfolgreich bestatigt. Sie konnen jetzt auf alle Funktionen Ihres Auxite-Kontos zugreifen.",
    goToDashboard: "Zum Dashboard",
    alreadyVerified: "Bereits bestatigt",
    alreadyVerifiedDesc: "Diese E-Mail-Adresse wurde bereits bestatigt. Sie konnen sich in Ihrem Konto anmelden.",
    signIn: "Anmelden",
    verificationFailed: "Uberprufung fehlgeschlagen",
    linkExpired: "Der Bestatigungslink ist moglicherweise abgelaufen oder wurde bereits verwendet.",
    createAccount: "Konto erstellen",
    invalidLink: "Ungultiger Bestatigungslink",
    verificationFailedError: "Uberprufung fehlgeschlagen",
    connectionError: "Verbindungsfehler. Bitte versuchen Sie es erneut.",
    enterCode: "Bestatigungscode eingeben",
    enterCodeDesc: "Geben Sie den 6-stelligen Code ein, der an Ihre E-Mail gesendet wurde.",
    codeSentTo: "Code gesendet an:",
    verify: "Bestatigen",
    resendCode: "Code erneut senden",
    codeSent: "Neuer Code gesendet!",
    invalidCode: "Ungultiger Bestatigungscode",
    codeExpired: "Bestatigungscode abgelaufen. Bitte fordern Sie einen neuen an.",
    emailNotVerified: "E-Mail nicht bestatigt",
    emailNotVerifiedDesc: "Sie mussen Ihre E-Mail-Adresse bestatigen, um auf Ihr Konto zugreifen zu konnen.",
  },
  fr: {
    verifyingEmail: "Verification de l'e-mail...",
    pleaseWait: "Veuillez patienter pendant que nous verifions votre adresse e-mail.",
    emailVerified: "E-mail verifie !",
    emailVerifiedDesc: "Votre adresse e-mail a ete verifiee avec succes. Vous pouvez maintenant acceder a toutes les fonctionnalites de votre compte Auxite.",
    goToDashboard: "Aller au tableau de bord",
    alreadyVerified: "Deja verifie",
    alreadyVerifiedDesc: "Cette adresse e-mail a deja ete verifiee. Vous pouvez vous connecter a votre compte.",
    signIn: "Se connecter",
    verificationFailed: "Echec de la verification",
    linkExpired: "Le lien de verification a peut-etre expire ou a deja ete utilise.",
    createAccount: "Creer un compte",
    invalidLink: "Lien de verification invalide",
    verificationFailedError: "Echec de la verification",
    connectionError: "Erreur de connexion. Veuillez reessayer.",
    enterCode: "Entrez le code de verification",
    enterCodeDesc: "Entrez le code a 6 chiffres envoye a votre adresse e-mail.",
    codeSentTo: "Code envoye a :",
    verify: "Verifier",
    resendCode: "Renvoyer le code",
    codeSent: "Nouveau code envoye !",
    invalidCode: "Code de verification invalide",
    codeExpired: "Le code de verification a expire. Veuillez en demander un nouveau.",
    emailNotVerified: "E-mail non verifie",
    emailNotVerifiedDesc: "Vous devez verifier votre adresse e-mail pour acceder a votre compte.",
  },
  ar: {
    verifyingEmail: "\u062c\u0627\u0631\u064d \u0627\u0644\u062a\u062d\u0642\u0642 \u0645\u0646 \u0627\u0644\u0628\u0631\u064a\u062f \u0627\u0644\u0625\u0644\u0643\u062a\u0631\u0648\u0646\u064a...",
    pleaseWait: "\u064a\u0631\u062c\u0649 \u0627\u0644\u0627\u0646\u062a\u0638\u0627\u0631 \u0628\u064a\u0646\u0645\u0627 \u0646\u062a\u062d\u0642\u0642 \u0645\u0646 \u0639\u0646\u0648\u0627\u0646 \u0628\u0631\u064a\u062f\u0643 \u0627\u0644\u0625\u0644\u0643\u062a\u0631\u0648\u0646\u064a.",
    emailVerified: "\u062a\u0645 \u0627\u0644\u062a\u062d\u0642\u0642 \u0645\u0646 \u0627\u0644\u0628\u0631\u064a\u062f \u0627\u0644\u0625\u0644\u0643\u062a\u0631\u0648\u0646\u064a!",
    emailVerifiedDesc: "\u062a\u0645 \u0627\u0644\u062a\u062d\u0642\u0642 \u0645\u0646 \u0628\u0631\u064a\u062f\u0643 \u0627\u0644\u0625\u0644\u0643\u062a\u0631\u0648\u0646\u064a \u0628\u0646\u062c\u0627\u062d.",
    goToDashboard: "\u0627\u0644\u0630\u0647\u0627\u0628 \u0625\u0644\u0649 \u0644\u0648\u062d\u0629 \u0627\u0644\u062a\u062d\u0643\u0645",
    alreadyVerified: "\u062a\u0645 \u0627\u0644\u062a\u062d\u0642\u0642 \u0645\u0633\u0628\u0642\u0627\u064b",
    alreadyVerifiedDesc: "\u062a\u0645 \u0627\u0644\u062a\u062d\u0642\u0642 \u0645\u0646 \u0647\u0630\u0627 \u0627\u0644\u0628\u0631\u064a\u062f \u0645\u0633\u0628\u0642\u0627\u064b.",
    signIn: "\u062a\u0633\u062c\u064a\u0644 \u0627\u0644\u062f\u062e\u0648\u0644",
    verificationFailed: "\u0641\u0634\u0644 \u0627\u0644\u062a\u062d\u0642\u0642",
    linkExpired: "\u0631\u0628\u0645\u0627 \u0627\u0646\u062a\u0647\u062a \u0635\u0644\u0627\u062d\u064a\u0629 \u0631\u0627\u0628\u0637 \u0627\u0644\u062a\u062d\u0642\u0642.",
    createAccount: "\u0625\u0646\u0634\u0627\u0621 \u062d\u0633\u0627\u0628",
    invalidLink: "\u0631\u0627\u0628\u0637 \u062a\u062d\u0642\u0642 \u063a\u064a\u0631 \u0635\u0627\u0644\u062d",
    verificationFailedError: "\u0641\u0634\u0644 \u0627\u0644\u062a\u062d\u0642\u0642",
    connectionError: "\u062e\u0637\u0623 \u0641\u064a \u0627\u0644\u0627\u062a\u0635\u0627\u0644.",
    enterCode: "\u0623\u062f\u062e\u0644 \u0631\u0645\u0632 \u0627\u0644\u062a\u062d\u0642\u0642",
    enterCodeDesc: "\u0623\u062f\u062e\u0644 \u0627\u0644\u0631\u0645\u0632 \u0627\u0644\u0645\u0643\u0648\u0646 \u0645\u0646 6 \u0623\u0631\u0642\u0627\u0645.",
    codeSentTo: "\u062a\u0645 \u0625\u0631\u0633\u0627\u0644 \u0627\u0644\u0631\u0645\u0632 \u0625\u0644\u0649:",
    verify: "\u062a\u062d\u0642\u0642",
    resendCode: "\u0625\u0639\u0627\u062f\u0629 \u0625\u0631\u0633\u0627\u0644 \u0627\u0644\u0631\u0645\u0632",
    codeSent: "\u062a\u0645 \u0625\u0631\u0633\u0627\u0644 \u0631\u0645\u0632 \u062c\u062f\u064a\u062f!",
    invalidCode: "\u0631\u0645\u0632 \u062a\u062d\u0642\u0642 \u063a\u064a\u0631 \u0635\u0627\u0644\u062d",
    codeExpired: "\u0627\u0646\u062a\u0647\u062a \u0635\u0644\u0627\u062d\u064a\u0629 \u0627\u0644\u0631\u0645\u0632.",
    emailNotVerified: "\u0644\u0645 \u064a\u062a\u0645 \u0627\u0644\u062a\u062d\u0642\u0642 \u0645\u0646 \u0627\u0644\u0628\u0631\u064a\u062f",
    emailNotVerifiedDesc: "\u064a\u062c\u0628 \u0627\u0644\u062a\u062d\u0642\u0642 \u0645\u0646 \u0628\u0631\u064a\u062f\u0643 \u0627\u0644\u0625\u0644\u0643\u062a\u0631\u0648\u0646\u064a.",
  },
  ru: {
    verifyingEmail: "\u041f\u0440\u043e\u0432\u0435\u0440\u043a\u0430 \u044d\u043b\u0435\u043a\u0442\u0440\u043e\u043d\u043d\u043e\u0439 \u043f\u043e\u0447\u0442\u044b...",
    pleaseWait: "\u041f\u043e\u0436\u0430\u043b\u0443\u0439\u0441\u0442\u0430, \u043f\u043e\u0434\u043e\u0436\u0434\u0438\u0442\u0435.",
    emailVerified: "\u042d\u043b\u0435\u043a\u0442\u0440\u043e\u043d\u043d\u0430\u044f \u043f\u043e\u0447\u0442\u0430 \u043f\u043e\u0434\u0442\u0432\u0435\u0440\u0436\u0434\u0435\u043d\u0430!",
    emailVerifiedDesc: "\u0412\u0430\u0448 \u0430\u0434\u0440\u0435\u0441 \u0443\u0441\u043f\u0435\u0448\u043d\u043e \u043f\u043e\u0434\u0442\u0432\u0435\u0440\u0436\u0434\u0435\u043d.",
    goToDashboard: "\u041f\u0435\u0440\u0435\u0439\u0442\u0438 \u0432 \u043f\u0430\u043d\u0435\u043b\u044c",
    alreadyVerified: "\u0423\u0436\u0435 \u043f\u043e\u0434\u0442\u0432\u0435\u0440\u0436\u0434\u0435\u043d\u043e",
    alreadyVerifiedDesc: "\u042d\u0442\u043e\u0442 \u0430\u0434\u0440\u0435\u0441 \u0443\u0436\u0435 \u043f\u043e\u0434\u0442\u0432\u0435\u0440\u0436\u0434\u0435\u043d.",
    signIn: "\u0412\u043e\u0439\u0442\u0438",
    verificationFailed: "\u041e\u0448\u0438\u0431\u043a\u0430 \u043f\u0440\u043e\u0432\u0435\u0440\u043a\u0438",
    linkExpired: "\u0421\u0441\u044b\u043b\u043a\u0430 \u043c\u043e\u0433\u043b\u0430 \u0438\u0441\u0442\u0435\u0447\u044c.",
    createAccount: "\u0421\u043e\u0437\u0434\u0430\u0442\u044c \u0430\u043a\u043a\u0430\u0443\u043d\u0442",
    invalidLink: "\u041d\u0435\u0434\u0435\u0439\u0441\u0442\u0432\u0438\u0442\u0435\u043b\u044c\u043d\u0430\u044f \u0441\u0441\u044b\u043b\u043a\u0430",
    verificationFailedError: "\u041e\u0448\u0438\u0431\u043a\u0430 \u043f\u0440\u043e\u0432\u0435\u0440\u043a\u0438",
    connectionError: "\u041e\u0448\u0438\u0431\u043a\u0430 \u0441\u043e\u0435\u0434\u0438\u043d\u0435\u043d\u0438\u044f.",
    enterCode: "\u0412\u0432\u0435\u0434\u0438\u0442\u0435 \u043a\u043e\u0434 \u043f\u043e\u0434\u0442\u0432\u0435\u0440\u0436\u0434\u0435\u043d\u0438\u044f",
    enterCodeDesc: "\u0412\u0432\u0435\u0434\u0438\u0442\u0435 6-\u0437\u043d\u0430\u0447\u043d\u044b\u0439 \u043a\u043e\u0434.",
    codeSentTo: "\u041a\u043e\u0434 \u043e\u0442\u043f\u0440\u0430\u0432\u043b\u0435\u043d \u043d\u0430:",
    verify: "\u041f\u043e\u0434\u0442\u0432\u0435\u0440\u0434\u0438\u0442\u044c",
    resendCode: "\u041e\u0442\u043f\u0440\u0430\u0432\u0438\u0442\u044c \u0441\u043d\u043e\u0432\u0430",
    codeSent: "\u041d\u043e\u0432\u044b\u0439 \u043a\u043e\u0434 \u043e\u0442\u043f\u0440\u0430\u0432\u043b\u0435\u043d!",
    invalidCode: "\u041d\u0435\u0432\u0435\u0440\u043d\u044b\u0439 \u043a\u043e\u0434",
    codeExpired: "\u041a\u043e\u0434 \u0438\u0441\u0442\u0435\u043a. \u0417\u0430\u043f\u0440\u043e\u0441\u0438\u0442\u0435 \u043d\u043e\u0432\u044b\u0439.",
    emailNotVerified: "\u042d\u043b. \u043f\u043e\u0447\u0442\u0430 \u043d\u0435 \u043f\u043e\u0434\u0442\u0432\u0435\u0440\u0436\u0434\u0435\u043d\u0430",
    emailNotVerifiedDesc: "\u041d\u0435\u043e\u0431\u0445\u043e\u0434\u0438\u043c\u043e \u043f\u043e\u0434\u0442\u0432\u0435\u0440\u0434\u0438\u0442\u044c \u044d\u043b. \u043f\u043e\u0447\u0442\u0443.",
  },
};

export default function VerifyEmailPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { lang } = useLanguage();

  const t = (key: string) => (translations as any)[lang]?.[key] || (translations as any).en[key] || key;

  const token = searchParams.get('token');
  const email = searchParams.get('email');

  // Mode: 'token' = auto-verify via link, 'code' = manual 6-digit code entry
  const mode = token ? 'token' : 'code';

  const [status, setStatus] = useState<'verifying' | 'code_entry' | 'success' | 'error' | 'already'>(
    mode === 'token' ? 'verifying' : 'code_entry'
  );
  const [error, setError] = useState('');
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [resendMessage, setResendMessage] = useState('');
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (mode === 'token' && token && email) {
      verifyEmail();
    } else if (mode === 'code' && !email) {
      setStatus('error');
      setError(t('invalidLink'));
    }
  }, [token, email]);

  // Token-based verification (from email link)
  const verifyEmail = async () => {
    try {
      const response = await fetch(`/api/auth/verify-email?token=${token}&email=${encodeURIComponent(email || '')}`);
      const data = await response.json();

      if (data.success) {
        if (data.alreadyVerified) {
          setStatus('already');
        } else {
          setStatus('success');
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

  // Code-based verification (6-digit code)
  const handleCodeSubmit = async () => {
    const fullCode = code.join('');
    if (fullCode.length !== 6) return;

    setIsSubmitting(true);
    setError('');

    try {
      const response = await fetch('/api/auth/verify-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code: fullCode }),
      });

      const data = await response.json();

      if (data.success) {
        if (data.alreadyVerified) {
          setStatus('already');
        } else {
          setStatus('success');
          if (data.token) {
            localStorage.setItem('authToken', data.token);
            localStorage.setItem('user', JSON.stringify(data.user));
          }
        }
      } else {
        setError(data.error || t('invalidCode'));
      }
    } catch (err) {
      setError(t('connectionError'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResendCode = async () => {
    setResendMessage('');
    try {
      const response = await fetch('/api/auth/resend-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();
      if (data.success) {
        setResendMessage(t('codeSent'));
        setCode(['', '', '', '', '', '']);
        setError('');
        setTimeout(() => setResendMessage(''), 3000);
      } else {
        setError(data.error || t('connectionError'));
      }
    } catch (err) {
      setError(t('connectionError'));
    }
  };

  const handleCodeChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    const newCode = [...code];
    newCode[index] = value.slice(-1);
    setCode(newCode);

    // Auto-focus next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto-submit when all 6 digits entered
    if (value && index === 5 && newCode.every(d => d !== '')) {
      setTimeout(() => handleCodeSubmit(), 100);
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pasted.length === 6) {
      const newCode = pasted.split('');
      setCode(newCode);
      inputRefs.current[5]?.focus();
      setTimeout(() => handleCodeSubmit(), 100);
    }
  };

  // Verifying State (token mode)
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

  // Code Entry State (login redirect)
  if (status === 'code_entry') {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-amber-500/20 mb-6">
              <Mail className="w-10 h-10 text-amber-500" />
            </div>
            <h1 className="text-2xl font-bold text-white mb-3">{t('emailNotVerified')}</h1>
            <p className="text-slate-400 mb-2">{t('enterCodeDesc')}</p>
            <p className="text-slate-500 text-sm">{t('codeSentTo')} <span className="text-white">{email}</span></p>
          </div>

          {/* 6-digit code input */}
          <div className="flex justify-center gap-3 mb-6" onPaste={handlePaste}>
            {code.map((digit, i) => (
              <input
                key={i}
                ref={el => { inputRefs.current[i] = el; }}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={e => handleCodeChange(i, e.target.value)}
                onKeyDown={e => handleKeyDown(i, e)}
                className="w-12 h-14 text-center text-2xl font-bold bg-slate-800 border-2 border-slate-700 rounded-xl text-white focus:border-[#2F6F62] focus:outline-none transition-colors"
                autoFocus={i === 0}
              />
            ))}
          </div>

          {error && (
            <div className="flex items-center gap-2 text-red-400 text-sm mb-4 justify-center">
              <AlertCircle className="w-4 h-4" />
              <span>{error}</span>
            </div>
          )}

          {resendMessage && (
            <div className="flex items-center gap-2 text-green-400 text-sm mb-4 justify-center">
              <CheckCircle className="w-4 h-4" />
              <span>{resendMessage}</span>
            </div>
          )}

          <button
            onClick={handleCodeSubmit}
            disabled={isSubmitting || code.some(d => d === '')}
            className="w-full py-3 bg-gradient-to-r from-[#2F6F62] to-[#2F6F62] text-white font-semibold rounded-xl hover:from-[#2F6F62] hover:to-[#2F6F62]/80 transition-all disabled:opacity-50 disabled:cursor-not-allowed mb-4"
          >
            {isSubmitting ? (
              <Loader2 className="w-5 h-5 animate-spin mx-auto" />
            ) : (
              t('verify')
            )}
          </button>

          <button
            onClick={handleResendCode}
            className="w-full py-3 text-slate-400 hover:text-white text-sm transition-colors"
          >
            {t('resendCode')}
          </button>

          <div className="text-center mt-4">
            <Link href="/auth/login" className="text-slate-500 hover:text-slate-300 text-sm transition-colors">
              {t('signIn')}
            </Link>
          </div>
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
            href="/"
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
