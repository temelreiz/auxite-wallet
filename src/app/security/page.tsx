"use client";

import { useState, useEffect } from "react";
import TopNav from "@/components/TopNav";
import { useLanguage } from "@/components/LanguageContext";
import { useWallet } from "@/components/WalletContext";
import Link from "next/link";

const translations: Record<string, Record<string, string>> = {
  tr: {
    title: "Güvenlik Merkezi",
    subtitle: "Hesap koruma ve erişim kontrolleri",
    protectionLevel: "KORUMA SEVİYESİ",
    moreSecureThan: "Kasanız müşterilerin %{percent}'inden daha güvenli.",
    emailVerified: "E-posta doğrulandı",
    deviceRegistered: "Cihaz kayıtlı",
    kycVerified: "KYC doğrulandı",
    whitelist: "Beyaz liste",
    dailyLimits: "GÜNLÜK LİMİTLER",
    redemptionLimit: "Çekim Limiti",
    transferLimit: "Transfer Limiti",
    remaining: "Kalan",
    authentication: "KİMLİK DOĞRULAMA",
    twoFactorAuth: "İki Faktörlü Doğrulama",
    twoFADesc: "TOTP tabanlı güvenlik kodu",
    required: "Zorunlu",
    passkey: "Passkey / Biyometri",
    passkeyDesc: "FaceID veya parmak izi ile giriş",
    hardwareKey: "Donanım Anahtarı",
    hardwareKeyDesc: "YubiKey veya benzeri cihaz",
    optional: "Opsiyonel",
    setup: "Kur",
    sessionControl: "OTURUM KONTROLÜ",
    activeSessions: "Aktif Oturumlar",
    authorizedDevices: "Yetkili Cihazlar",
    authorizedDevicesDesc: "Yalnızca kayıtlı cihazlar çekim başlatabilir",
    currentDevice: "Bu Cihaz",
    terminateAll: "Tüm Oturumları Sonlandır",
    qrLogin: "QR ile Giriş",
    qrLoginDesc: "Masaüstünden hızlı giriş",
    withdrawalProtection: "ÇEKİM KORUMASI",
    withdrawalProtectionNote: "Büyük çekimler güvenlik incelemesine tabi olabilir",
    withdrawalDelay: "Çekim Gecikmesi",
    withdrawalDelayDesc: "24 saatlik bekleme süresi",
    newAddressCooling: "Yeni Adres Soğutma",
    newAddressCoolingDesc: "Yeni adresler 48 saat sonra aktif",
    emailConfirmation: "E-posta Onayı",
    emailConfirmationDesc: "Her çekimde e-posta doğrulaması",
    deviceManagement: "CİHAZ YÖNETİMİ",
    removeDevice: "Cihazı Kaldır",
    activityLog: "AKTİVİTE KAYDI",
    viewAll: "Tümünü Gör",
    emergencyControls: "ACİL DURUM KONTROLLERİ",
    freezeVault: "Kasayı Hemen Dondur",
    freezeVaultDesc: "Tüm çekimler ve transferler durdurulur",
    unfreezeVault: "Kasayı Aç",
    vaultFrozen: "KASA DONDURULDU",
    vaultFrozenDesc: "Kasanız şu anda güvenlik nedeniyle dondurulmuştur. Tüm çekimler ve transferler devre dışıdır.",
    freezeConfirmTitle: "Kasayı Dondur?",
    freezeConfirmDesc: "Bu işlem tüm çekimleri durduracak, tüm transferleri durduracak, tüm cihazları çıkaracak ve API tokenlarını iptal edecek.",
    freezeConfirm: "Evet, Dondur",
    cancel: "İptal",
    back: "Geri",
  },
  en: {
    title: "Security Center",
    subtitle: "Account protection and access controls",
    protectionLevel: "PROTECTION LEVEL",
    moreSecureThan: "Your vault is more secure than {percent}% of clients.",
    emailVerified: "Email verified",
    deviceRegistered: "Device registered",
    kycVerified: "KYC verified",
    whitelist: "Whitelist",
    dailyLimits: "DAILY LIMITS",
    redemptionLimit: "Redemption Limit",
    transferLimit: "Transfer Limit",
    remaining: "Remaining",
    authentication: "AUTHENTICATION",
    twoFactorAuth: "Two-Factor Authentication",
    twoFADesc: "TOTP-based security code",
    required: "Required",
    passkey: "Passkey / Biometrics",
    passkeyDesc: "Sign in with FaceID or fingerprint",
    hardwareKey: "Hardware Key",
    hardwareKeyDesc: "YubiKey or similar device",
    optional: "Optional",
    setup: "Setup",
    sessionControl: "SESSION CONTROL",
    activeSessions: "Active Sessions",
    authorizedDevices: "Authorized Devices",
    authorizedDevicesDesc: "Only registered devices can initiate withdrawals",
    currentDevice: "Current Device",
    terminateAll: "Terminate All Sessions",
    qrLogin: "QR Code Login",
    qrLoginDesc: "Quick login from desktop",
    withdrawalProtection: "WITHDRAWAL PROTECTION",
    withdrawalProtectionNote: "Large withdrawals may be subject to security review",
    withdrawalDelay: "Withdrawal Delay",
    withdrawalDelayDesc: "24-hour waiting period",
    newAddressCooling: "New Address Cooling",
    newAddressCoolingDesc: "New addresses active after 48 hours",
    emailConfirmation: "Email Confirmation",
    emailConfirmationDesc: "Email verification for every withdrawal",
    deviceManagement: "DEVICE MANAGEMENT",
    removeDevice: "Remove Device",
    activityLog: "ACTIVITY LOG",
    viewAll: "View All",
    emergencyControls: "EMERGENCY CONTROLS",
    freezeVault: "Freeze Vault Immediately",
    freezeVaultDesc: "All withdrawals and transfers will be halted",
    unfreezeVault: "Unfreeze Vault",
    vaultFrozen: "VAULT FROZEN",
    vaultFrozenDesc: "Your vault is currently frozen for security. All withdrawals and transfers are disabled.",
    freezeConfirmTitle: "Freeze Vault?",
    freezeConfirmDesc: "This will stop all withdrawals, stop all transfers, logout all devices, and revoke API tokens.",
    freezeConfirm: "Yes, Freeze",
    cancel: "Cancel",
    back: "Back",
  },
  de: {
    title: "Sicherheitszentrum",
    subtitle: "Kontoschutz und Zugangskontrollen",
    protectionLevel: "SCHUTZSTUFE",
    moreSecureThan: "Ihr Tresor ist sicherer als {percent}% der Kunden.",
    emailVerified: "E-Mail verifiziert",
    deviceRegistered: "Gerät registriert",
    kycVerified: "KYC verifiziert",
    whitelist: "Whitelist",
    dailyLimits: "TÄGLICHE LIMITS",
    redemptionLimit: "Auszahlungslimit",
    transferLimit: "Transferlimit",
    remaining: "Verbleibend",
    authentication: "AUTHENTIFIZIERUNG",
    twoFactorAuth: "Zwei-Faktor-Authentifizierung",
    twoFADesc: "TOTP-basierter Sicherheitscode",
    required: "Erforderlich",
    passkey: "Passkey / Biometrie",
    passkeyDesc: "Anmeldung mit FaceID oder Fingerabdruck",
    hardwareKey: "Hardware-Schlüssel",
    hardwareKeyDesc: "YubiKey oder ähnliches Gerät",
    optional: "Optional",
    setup: "Einrichten",
    sessionControl: "SITZUNGSKONTROLLE",
    activeSessions: "Aktive Sitzungen",
    authorizedDevices: "Autorisierte Geräte",
    authorizedDevicesDesc: "Nur registrierte Geräte können Auszahlungen initiieren",
    currentDevice: "Dieses Gerät",
    terminateAll: "Alle Sitzungen beenden",
    qrLogin: "QR-Code-Login",
    qrLoginDesc: "Schnelles Login vom Desktop",
    withdrawalProtection: "AUSZAHLUNGSSCHUTZ",
    withdrawalProtectionNote: "Große Auszahlungen können einer Sicherheitsüberprüfung unterliegen",
    withdrawalDelay: "Auszahlungsverzögerung",
    withdrawalDelayDesc: "24-stündige Wartezeit",
    newAddressCooling: "Neue Adresse Abkühlung",
    newAddressCoolingDesc: "Neue Adressen nach 48 Stunden aktiv",
    emailConfirmation: "E-Mail-Bestätigung",
    emailConfirmationDesc: "E-Mail-Verifizierung für jede Auszahlung",
    deviceManagement: "GERÄTEVERWALTUNG",
    removeDevice: "Gerät entfernen",
    activityLog: "AKTIVITÄTSPROTOKOLL",
    viewAll: "Alle anzeigen",
    emergencyControls: "NOTFALLKONTROLLEN",
    freezeVault: "Tresor sofort einfrieren",
    freezeVaultDesc: "Alle Auszahlungen und Transfers werden gestoppt",
    unfreezeVault: "Tresor entsperren",
    vaultFrozen: "TRESOR EINGEFROREN",
    vaultFrozenDesc: "Ihr Tresor ist derzeit aus Sicherheitsgründen eingefroren.",
    freezeConfirmTitle: "Tresor einfrieren?",
    freezeConfirmDesc: "Dies stoppt alle Auszahlungen und Transfers.",
    freezeConfirm: "Ja, einfrieren",
    cancel: "Abbrechen",
    back: "Zurück",
  },
  fr: {
    title: "Centre de sécurité",
    subtitle: "Protection du compte et contrôles d'accès",
    protectionLevel: "NIVEAU DE PROTECTION",
    moreSecureThan: "Votre coffre est plus sécurisé que {percent}% des clients.",
    emailVerified: "E-mail vérifié",
    deviceRegistered: "Appareil enregistré",
    kycVerified: "KYC vérifié",
    whitelist: "Liste blanche",
    dailyLimits: "LIMITES JOURNALIÈRES",
    redemptionLimit: "Limite de retrait",
    transferLimit: "Limite de transfert",
    remaining: "Restant",
    authentication: "AUTHENTIFICATION",
    twoFactorAuth: "Authentification à deux facteurs",
    twoFADesc: "Code de sécurité basé sur TOTP",
    required: "Requis",
    passkey: "Passkey / Biométrie",
    passkeyDesc: "Connexion avec FaceID ou empreinte digitale",
    hardwareKey: "Clé matérielle",
    hardwareKeyDesc: "YubiKey ou appareil similaire",
    optional: "Optionnel",
    setup: "Configurer",
    sessionControl: "CONTRÔLE DE SESSION",
    activeSessions: "Sessions actives",
    authorizedDevices: "Appareils autorisés",
    authorizedDevicesDesc: "Seuls les appareils enregistrés peuvent initier des retraits",
    currentDevice: "Cet appareil",
    terminateAll: "Terminer toutes les sessions",
    qrLogin: "Connexion QR Code",
    qrLoginDesc: "Connexion rapide depuis le bureau",
    withdrawalProtection: "PROTECTION DE RETRAIT",
    withdrawalProtectionNote: "Les retraits importants peuvent être soumis à un examen de sécurité",
    withdrawalDelay: "Délai de retrait",
    withdrawalDelayDesc: "Période d'attente de 24 heures",
    newAddressCooling: "Refroidissement nouvelle adresse",
    newAddressCoolingDesc: "Nouvelles adresses actives après 48 heures",
    emailConfirmation: "Confirmation par e-mail",
    emailConfirmationDesc: "Vérification par e-mail pour chaque retrait",
    deviceManagement: "GESTION DES APPAREILS",
    removeDevice: "Supprimer l'appareil",
    activityLog: "JOURNAL D'ACTIVITÉ",
    viewAll: "Tout voir",
    emergencyControls: "CONTRÔLES D'URGENCE",
    freezeVault: "Geler le coffre immédiatement",
    freezeVaultDesc: "Tous les retraits et transferts seront arrêtés",
    unfreezeVault: "Dégeler le coffre",
    vaultFrozen: "COFFRE GELÉ",
    vaultFrozenDesc: "Votre coffre est actuellement gelé pour des raisons de sécurité.",
    freezeConfirmTitle: "Geler le coffre ?",
    freezeConfirmDesc: "Cela arrêtera tous les retraits et transferts.",
    freezeConfirm: "Oui, geler",
    cancel: "Annuler",
    back: "Retour",
  },
  ar: {
    title: "مركز الأمان",
    subtitle: "حماية الحساب وضوابط الوصول",
    protectionLevel: "مستوى الحماية",
    moreSecureThan: "خزنتك أكثر أمانًا من {percent}% من العملاء.",
    emailVerified: "البريد الإلكتروني تم التحقق منه",
    deviceRegistered: "الجهاز مسجل",
    kycVerified: "KYC تم التحقق",
    whitelist: "القائمة البيضاء",
    dailyLimits: "الحدود اليومية",
    redemptionLimit: "حد السحب",
    transferLimit: "حد التحويل",
    remaining: "المتبقي",
    authentication: "المصادقة",
    twoFactorAuth: "المصادقة الثنائية",
    twoFADesc: "رمز أمان قائم على TOTP",
    required: "مطلوب",
    passkey: "مفتاح المرور / القياسات الحيوية",
    passkeyDesc: "تسجيل الدخول باستخدام FaceID أو بصمة الإصبع",
    hardwareKey: "مفتاح الأجهزة",
    hardwareKeyDesc: "YubiKey أو جهاز مشابه",
    optional: "اختياري",
    setup: "إعداد",
    sessionControl: "التحكم في الجلسة",
    activeSessions: "الجلسات النشطة",
    authorizedDevices: "الأجهزة المصرح بها",
    authorizedDevicesDesc: "فقط الأجهزة المسجلة يمكنها بدء عمليات السحب",
    currentDevice: "هذا الجهاز",
    terminateAll: "إنهاء جميع الجلسات",
    qrLogin: "تسجيل دخول برمز QR",
    qrLoginDesc: "تسجيل دخول سريع من سطح المكتب",
    withdrawalProtection: "حماية السحب",
    withdrawalProtectionNote: "قد تخضع عمليات السحب الكبيرة لمراجعة أمنية",
    withdrawalDelay: "تأخير السحب",
    withdrawalDelayDesc: "فترة انتظار 24 ساعة",
    newAddressCooling: "تبريد العنوان الجديد",
    newAddressCoolingDesc: "العناوين الجديدة تنشط بعد 48 ساعة",
    emailConfirmation: "تأكيد البريد الإلكتروني",
    emailConfirmationDesc: "التحقق بالبريد الإلكتروني لكل عملية سحب",
    deviceManagement: "إدارة الأجهزة",
    removeDevice: "إزالة الجهاز",
    activityLog: "سجل النشاط",
    viewAll: "عرض الكل",
    emergencyControls: "ضوابط الطوارئ",
    freezeVault: "تجميد الخزنة فورًا",
    freezeVaultDesc: "سيتم إيقاف جميع عمليات السحب والتحويل",
    unfreezeVault: "إلغاء تجميد الخزنة",
    vaultFrozen: "الخزنة مجمدة",
    vaultFrozenDesc: "خزنتك مجمدة حاليًا لأسباب أمنية.",
    freezeConfirmTitle: "تجميد الخزنة؟",
    freezeConfirmDesc: "سيؤدي ذلك إلى إيقاف جميع العمليات.",
    freezeConfirm: "نعم، جمّد",
    cancel: "إلغاء",
    back: "رجوع",
  },
  ru: {
    title: "Центр безопасности",
    subtitle: "Защита аккаунта и контроль доступа",
    protectionLevel: "УРОВЕНЬ ЗАЩИТЫ",
    moreSecureThan: "Ваш сейф безопаснее, чем у {percent}% клиентов.",
    emailVerified: "Email подтверждён",
    deviceRegistered: "Устройство зарегистрировано",
    kycVerified: "KYC пройден",
    whitelist: "Белый список",
    dailyLimits: "ДНЕВНЫЕ ЛИМИТЫ",
    redemptionLimit: "Лимит вывода",
    transferLimit: "Лимит перевода",
    remaining: "Остаток",
    authentication: "АУТЕНТИФИКАЦИЯ",
    twoFactorAuth: "Двухфакторная аутентификация",
    twoFADesc: "Код безопасности на основе TOTP",
    required: "Обязательно",
    passkey: "Passkey / Биометрия",
    passkeyDesc: "Вход с FaceID или отпечатком пальца",
    hardwareKey: "Аппаратный ключ",
    hardwareKeyDesc: "YubiKey или аналогичное устройство",
    optional: "Необязательно",
    setup: "Настроить",
    sessionControl: "УПРАВЛЕНИЕ СЕССИЯМИ",
    activeSessions: "Активные сессии",
    authorizedDevices: "Авторизованные устройства",
    authorizedDevicesDesc: "Только зарегистрированные устройства могут инициировать выводы",
    currentDevice: "Это устройство",
    terminateAll: "Завершить все сессии",
    qrLogin: "Вход по QR-коду",
    qrLoginDesc: "Быстрый вход с десктопа",
    withdrawalProtection: "ЗАЩИТА ВЫВОДА",
    withdrawalProtectionNote: "Крупные выводы могут подлежать проверке безопасности",
    withdrawalDelay: "Задержка вывода",
    withdrawalDelayDesc: "24-часовой период ожидания",
    newAddressCooling: "Охлаждение нового адреса",
    newAddressCoolingDesc: "Новые адреса активны через 48 часов",
    emailConfirmation: "Подтверждение по email",
    emailConfirmationDesc: "Проверка email для каждого вывода",
    deviceManagement: "УПРАВЛЕНИЕ УСТРОЙСТВАМИ",
    removeDevice: "Удалить устройство",
    activityLog: "ЖУРНАЛ АКТИВНОСТИ",
    viewAll: "Показать все",
    emergencyControls: "ЭКСТРЕННОЕ УПРАВЛЕНИЕ",
    freezeVault: "Заморозить хранилище немедленно",
    freezeVaultDesc: "Все выводы и переводы будут остановлены",
    unfreezeVault: "Разморозить хранилище",
    vaultFrozen: "ХРАНИЛИЩЕ ЗАМОРОЖЕНО",
    vaultFrozenDesc: "Ваше хранилище заморожено из соображений безопасности.",
    freezeConfirmTitle: "Заморозить хранилище?",
    freezeConfirmDesc: "Это остановит все выводы и переводы.",
    freezeConfirm: "Да, заморозить",
    cancel: "Отмена",
    back: "Назад",
  },
};

export default function SecurityPage() {
  const { lang } = useLanguage();
  const { address } = useWallet();
  const t = translations[lang] || translations.en;

  // Security states
  const [twoFAEnabled, setTwoFAEnabled] = useState(false);
  const [biometricsEnabled, setBiometricsEnabled] = useState(false);
  const [withdrawalDelay, setWithdrawalDelay] = useState(true);
  const [newAddressCooling, setNewAddressCooling] = useState(true);
  const [emailConfirmation, setEmailConfirmation] = useState(true);
  const [isVaultFrozen, setIsVaultFrozen] = useState(false);
  const [showFreezeModal, setShowFreezeModal] = useState(false);
  const [loading, setLoading] = useState(true);

  // Data states
  const [sessions, setSessions] = useState<any[]>([]);
  const [devices, setDevices] = useState<any[]>([]);
  const [activityLogs, setActivityLogs] = useState<any[]>([]);
  const [securityChecks, setSecurityChecks] = useState({
    emailVerified: false,
    deviceRegistered: false,
    twoFactorEnabled: false,
    kycVerified: false,
    whitelistEnabled: false,
  });

  // Protection level calculation
  const calculateProtectionLevel = () => {
    let level = 20;
    if (securityChecks.emailVerified) level += 15;
    if (securityChecks.deviceRegistered) level += 15;
    if (securityChecks.twoFactorEnabled) level += 25;
    if (securityChecks.kycVerified) level += 15;
    if (securityChecks.whitelistEnabled) level += 10;
    return level;
  };

  const protectionLevel = calculateProtectionLevel();
  const securityPercentile = Math.min(99, Math.max(70, protectionLevel + 20));

  // Daily limits
  const dailyLimits = {
    redemptionLimit: 50000,
    redemptionUsed: 0,
    transferLimit: 100000,
    transferUsed: 0,
  };

  // Fetch security data
  useEffect(() => {
    if (!address) return;

    const fetchSecurityData = async () => {
      setLoading(true);
      try {
        const [twoFARes, sessionsRes, devicesRes, logsRes, emergencyRes] = await Promise.all([
          fetch(`/api/security/2fa/status`, { headers: { "x-wallet-address": address } }).catch(() => null),
          fetch(`/api/security/sessions`, { headers: { "x-wallet-address": address } }).catch(() => null),
          fetch(`/api/security/devices`, { headers: { "x-wallet-address": address } }).catch(() => null),
          fetch(`/api/security/logs`, { headers: { "x-wallet-address": address } }).catch(() => null),
          fetch(`/api/security/emergency`, { headers: { "x-wallet-address": address } }).catch(() => null),
        ]);

        // Load frozen state from backend
        if (emergencyRes?.ok) {
          const emergencyData = await emergencyRes.json();
          if (emergencyData.config?.frozen) {
            setIsVaultFrozen(true);
          }
        }

        if (twoFARes?.ok) {
          const data = await twoFARes.json();
          setTwoFAEnabled(data.enabled || false);
          setSecurityChecks(prev => ({ ...prev, twoFactorEnabled: data.enabled || false }));
        }

        if (sessionsRes?.ok) {
          const data = await sessionsRes.json();
          setSessions(data.sessions || []);
        } else {
          // Mock sessions
          setSessions([
            { id: "s1", deviceName: "Chrome - MacBook Pro", location: "Istanbul, Turkey", isCurrent: true },
            { id: "s2", deviceName: "Safari - iPhone 15", location: "Istanbul, Turkey", isCurrent: false },
          ]);
        }

        if (devicesRes?.ok) {
          const data = await devicesRes.json();
          setDevices(data.devices || []);
        } else {
          // Mock devices
          setDevices([
            { id: "d1", name: "MacBook Pro", type: "desktop", location: "Istanbul, Turkey", ip: "78.***.***.12", isCurrent: true },
            { id: "d2", name: "iPhone 15 Pro", type: "mobile", location: "Istanbul, Turkey", ip: "78.***.***.12", isCurrent: false },
          ]);
        }

        if (logsRes?.ok) {
          const data = await logsRes.json();
          setActivityLogs(data.logs || []);
        } else {
          // Mock activity
          setActivityLogs([
            { action: "Login", device: "Chrome - MacBook Pro", time: "2 min ago", icon: "login" },
            { action: "Address Whitelisted", device: "MacBook Pro", time: "1 day ago", icon: "shield" },
            { action: "2FA Verified", device: "iPhone 15 Pro", time: "2 days ago", icon: "key" },
          ]);
        }

        // Update checks
        setSecurityChecks(prev => ({
          ...prev,
          emailVerified: true,
          deviceRegistered: true,
        }));
      } catch (err) {
        console.error("Security fetch error:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchSecurityData();
  }, [address]);

  const handleTerminateSession = async (sessionId: string) => {
    try {
      await fetch(`/api/security/sessions`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json", "x-wallet-address": address || "" },
        body: JSON.stringify({ sessionId }),
      });
      setSessions(prev => prev.filter(s => s.id !== sessionId));
    } catch (err) {
      console.error("Session terminate error:", err);
    }
  };

  const handleTerminateAll = async () => {
    try {
      await fetch(`/api/security/sessions`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json", "x-wallet-address": address || "" },
        body: JSON.stringify({ terminateAll: true }),
      });
      setSessions(prev => prev.filter(s => s.isCurrent));
    } catch (err) {
      console.error("Session terminate all error:", err);
    }
  };

  const handleRemoveDevice = async (deviceId: string) => {
    try {
      await fetch(`/api/security/devices`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json", "x-wallet-address": address || "" },
        body: JSON.stringify({ deviceId }),
      });
      setDevices(prev => prev.filter(d => d.id !== deviceId));
    } catch (err) {
      console.error("Device remove error:", err);
    }
  };

  const handleFreezeVault = async () => {
    try {
      const res = await fetch(`/api/security/emergency`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-wallet-address": address || "" },
        body: JSON.stringify({ action: "freeze", reason: "Manuel dondurma" }),
      });
      if (res.ok) {
        setIsVaultFrozen(true);
      }
    } catch (err) {
      console.error("Vault freeze error:", err);
    }
    setShowFreezeModal(false);
  };

  const handleUnfreezeVault = async () => {
    try {
      const res = await fetch(`/api/security/emergency`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-wallet-address": address || "" },
        body: JSON.stringify({ action: "unfreeze" }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setIsVaultFrozen(false);
      } else {
        alert(data.error || "Unfreeze failed");
      }
    } catch (err) {
      console.error("Vault unfreeze error:", err);
    }
  };

  const protectionColor = protectionLevel >= 80 ? "bg-[#2F6F62]" : protectionLevel >= 50 ? "bg-[#BFA181]" : "bg-[#f59e0b]";

  return (
    <div className="min-h-screen bg-[#f8f5f0] dark:bg-[#0a0a0a]">
      <TopNav />
      <div className="max-w-3xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Link href="/client-center" className="p-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition">
            <svg className="w-5 h-5 text-slate-800 dark:text-white" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" /></svg>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-slate-800 dark:text-white">{t.title}</h1>
            <p className="text-sm text-slate-500 dark:text-zinc-400">{t.subtitle}</p>
          </div>
        </div>

        {/* Protection Level Card */}
        <div className={`${protectionColor} rounded-2xl p-5 mb-4`}>
          <div className="flex justify-between items-center mb-3">
            <span className="text-[11px] font-semibold text-white/80 tracking-wider">{t.protectionLevel}</span>
            <span className="text-3xl font-bold text-white">{protectionLevel}%</span>
          </div>
          <div className="flex items-center gap-2 mb-4">
            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" /></svg>
            <span className="text-sm text-white font-medium">{t.moreSecureThan.replace("{percent}", securityPercentile.toString())}</span>
          </div>
          <div className="flex flex-wrap gap-3">
            {[
              { key: "emailVerified", label: t.emailVerified, checked: securityChecks.emailVerified },
              { key: "deviceRegistered", label: t.deviceRegistered, checked: securityChecks.deviceRegistered },
              { key: "twoFactor", label: "2FA", checked: securityChecks.twoFactorEnabled },
              { key: "kyc", label: "KYC", checked: securityChecks.kycVerified },
              { key: "whitelist", label: t.whitelist, checked: securityChecks.whitelistEnabled },
            ].map(item => (
              <div key={item.key} className="flex items-center gap-1.5 opacity-90">
                {item.checked ? (
                  <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>
                ) : (
                  <svg className="w-4 h-4 text-white/50" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><circle cx="12" cy="12" r="10" /></svg>
                )}
                <span className="text-[11px] text-white font-medium">{item.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Daily Limits Card */}
        <div className="bg-white dark:bg-zinc-800/50 rounded-xl border border-stone-200 dark:border-zinc-700/50 p-4 mb-4">
          <p className="text-[11px] font-semibold text-slate-500 dark:text-zinc-400 tracking-wider mb-3">{t.dailyLimits}</p>
          <div className="flex justify-between items-center">
            <div>
              <p className="text-sm font-medium text-slate-800 dark:text-white">{t.redemptionLimit}</p>
              <p className="text-[11px] text-slate-500 dark:text-zinc-500">{t.remaining}: ${(dailyLimits.redemptionLimit - dailyLimits.redemptionUsed).toLocaleString()}</p>
            </div>
            <span className="text-base font-bold text-[#BFA181]">${dailyLimits.redemptionLimit.toLocaleString()}</span>
          </div>
          <div className="h-px bg-stone-200 dark:bg-zinc-700 my-3" />
          <div className="flex justify-between items-center">
            <div>
              <p className="text-sm font-medium text-slate-800 dark:text-white">{t.transferLimit}</p>
              <p className="text-[11px] text-slate-500 dark:text-zinc-500">{t.remaining}: ${(dailyLimits.transferLimit - dailyLimits.transferUsed).toLocaleString()}</p>
            </div>
            <span className="text-base font-bold text-[#BFA181]">${dailyLimits.transferLimit.toLocaleString()}</span>
          </div>
        </div>

        {/* Authentication Section */}
        <div className="bg-white dark:bg-zinc-800/50 rounded-xl p-4 mb-4">
          <p className="text-[11px] font-semibold text-slate-500 dark:text-zinc-400 tracking-wider mb-4">{t.authentication}</p>

          {/* 2FA */}
          <div className="flex items-center justify-between py-3.5 border-b border-stone-200 dark:border-zinc-700/50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[#2F6F62]/15 flex items-center justify-center">
                <svg className="w-[18px] h-[18px] text-[#2F6F62]" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25a3 3 0 013 3m3 0a6 6 0 01-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1121.75 8.25z" /></svg>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[15px] font-medium text-slate-800 dark:text-white">{t.twoFactorAuth}</span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-[#2F6F62]/20 text-[#2F6F62]">{t.required}</span>
                </div>
                <p className="text-xs text-slate-500 dark:text-zinc-500 mt-1">{t.twoFADesc}</p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" checked={twoFAEnabled} onChange={(e) => setTwoFAEnabled(e.target.checked)} className="sr-only peer" />
              <div className="w-11 h-6 bg-gray-200 dark:bg-zinc-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#2F6F62]"></div>
            </label>
          </div>

          {/* Passkey */}
          <div className="flex items-center justify-between py-3.5 border-b border-stone-200 dark:border-zinc-700/50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[#2F6F62]/15 flex items-center justify-center">
                <svg className="w-[18px] h-[18px] text-[#2F6F62]" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M7.864 4.243A7.5 7.5 0 0119.5 10.5c0 2.92-.556 5.709-1.568 8.268M5.742 6.364A7.465 7.465 0 004.5 10.5a7.464 7.464 0 01-1.15 3.993m1.989 3.559A11.209 11.209 0 008.25 10.5a3.75 3.75 0 117.5 0c0 .527-.021 1.049-.064 1.565M12 10.5a14.94 14.94 0 01-3.6 9.75m6.633-4.596a18.666 18.666 0 01-2.485 5.33" /></svg>
              </div>
              <div>
                <span className="text-[15px] font-medium text-slate-800 dark:text-white">{t.passkey}</span>
                <p className="text-xs text-slate-500 dark:text-zinc-500 mt-1">{t.passkeyDesc}</p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" checked={biometricsEnabled} onChange={(e) => setBiometricsEnabled(e.target.checked)} className="sr-only peer" />
              <div className="w-11 h-6 bg-gray-200 dark:bg-zinc-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#2F6F62]"></div>
            </label>
          </div>

          {/* Hardware Key */}
          <div className="flex items-center justify-between py-3.5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[#BFA181]/15 flex items-center justify-center">
                <svg className="w-[18px] h-[18px] text-[#BFA181]" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 3v1.5M4.5 8.25H3m18 0h-1.5M4.5 12H3m18 0h-1.5m-15 3.75H3m18 0h-1.5M8.25 19.5V21M12 3v1.5m0 15V21m3.75-18v1.5m0 15V21m-9-1.5h10.5a2.25 2.25 0 002.25-2.25V6.75a2.25 2.25 0 00-2.25-2.25H6.75A2.25 2.25 0 004.5 6.75v10.5a2.25 2.25 0 002.25 2.25z" /></svg>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[15px] font-medium text-slate-800 dark:text-white">{t.hardwareKey}</span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-200/50 dark:bg-zinc-600/30 text-slate-500 dark:text-zinc-400">{t.optional}</span>
                </div>
                <p className="text-xs text-slate-500 dark:text-zinc-500 mt-1">{t.hardwareKeyDesc}</p>
              </div>
            </div>
            <button className="px-3 py-1.5 rounded-md border border-[#BFA181] text-xs font-semibold text-[#BFA181] hover:bg-[#BFA181]/10 transition">{t.setup}</button>
          </div>
        </div>

        {/* Session Control */}
        <div className="bg-white dark:bg-zinc-800/50 rounded-xl p-4 mb-4">
          <p className="text-[11px] font-semibold text-slate-500 dark:text-zinc-400 tracking-wider mb-4">{t.sessionControl}</p>

          {/* Authorized Devices Banner */}
          <div className="flex items-start gap-3 p-3.5 rounded-lg border border-[#BFA181]/40 bg-[#BFA181]/10 mb-4">
            <svg className="w-5 h-5 text-[#BFA181] mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 3v1.5M4.5 8.25H3m18 0h-1.5M4.5 12H3m18 0h-1.5m-15 3.75H3m18 0h-1.5M8.25 19.5V21M12 3v1.5m0 15V21m3.75-18v1.5m0 15V21m-9-1.5h10.5a2.25 2.25 0 002.25-2.25V6.75a2.25 2.25 0 00-2.25-2.25H6.75A2.25 2.25 0 004.5 6.75v10.5a2.25 2.25 0 002.25 2.25z" /></svg>
            <div>
              <p className="text-sm font-semibold text-slate-800 dark:text-white">{t.authorizedDevices}</p>
              <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">{t.authorizedDevicesDesc}</p>
            </div>
          </div>

          <p className="text-sm font-semibold text-slate-800 dark:text-white mb-3">{t.activeSessions}</p>
          {sessions.map((session) => (
            <div key={session.id} className="flex items-center justify-between p-3 rounded-lg border border-stone-200 dark:border-zinc-700/50 bg-[#f8f5f0] dark:bg-[#0a0a0a] mb-2">
              <div className="flex items-center gap-3">
                <svg className="w-5 h-5 text-slate-800 dark:text-white" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  {session.deviceName?.includes("iPhone") || session.deviceName?.includes("phone") ? (
                    <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 1.5H8.25A2.25 2.25 0 006 3.75v16.5a2.25 2.25 0 002.25 2.25h7.5A2.25 2.25 0 0018 20.25V3.75a2.25 2.25 0 00-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-6 18.75h6" />
                  ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 17.25v1.007a3 3 0 01-.879 2.122L7.5 21h9l-.621-.621A3 3 0 0115 18.257V17.25m6-12V15a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 15V5.25m18 0A2.25 2.25 0 0018.75 3H5.25A2.25 2.25 0 003 5.25m18 0V12a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 12V5.25" />
                  )}
                </svg>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-slate-800 dark:text-white">{session.deviceName}</span>
                    {session.isCurrent && (
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-semibold bg-[#2F6F62] text-white">{t.currentDevice}</span>
                    )}
                  </div>
                  <span className="text-xs text-slate-500 dark:text-zinc-500">{session.location}</span>
                </div>
              </div>
              {!session.isCurrent ? (
                <button onClick={() => handleTerminateSession(session.id)} className="w-8 h-8 rounded-full bg-red-500/15 flex items-center justify-center hover:bg-red-500/25 transition">
                  <svg className="w-4 h-4 text-red-500" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              ) : (
                <span className="text-xs text-[#2F6F62] font-medium">Now</span>
              )}
            </div>
          ))}

          <button onClick={handleTerminateAll} className="w-full flex items-center justify-center gap-2 py-3 rounded-lg border border-red-500 bg-red-500/10 text-red-500 text-sm font-semibold hover:bg-red-500/20 transition mt-2 mb-4">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" /></svg>
            {t.terminateAll}
          </button>

          {/* QR Login */}
          <div className="flex items-center gap-3 p-3.5 rounded-lg border border-[#BFA181]/40 bg-[#BFA181]/10 cursor-pointer hover:bg-[#BFA181]/15 transition">
            <svg className="w-6 h-6 text-[#BFA181]" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 013.75 9.375v-4.5zM3.75 14.625c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 01-1.125-1.125v-4.5zM13.5 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0113.5 9.375v-4.5z" /><path strokeLinecap="round" strokeLinejoin="round" d="M6.75 6.75h.75v.75h-.75v-.75zM6.75 16.5h.75v.75h-.75v-.75zM16.5 6.75h.75v.75H16.5v-.75zM13.5 13.5h.75v.75h-.75v-.75zM13.5 19.5h.75v.75h-.75v-.75zM19.5 13.5h.75v.75h-.75v-.75zM19.5 19.5h.75v.75h-.75v-.75zM16.5 16.5h.75v.75H16.5v-.75z" /></svg>
            <div className="flex-1">
              <p className="text-sm font-semibold text-slate-800 dark:text-white">{t.qrLogin}</p>
              <p className="text-[11px] text-slate-500 dark:text-zinc-400 mt-0.5">{t.qrLoginDesc}</p>
            </div>
            <svg className="w-4 h-4 text-[#BFA181]" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" /></svg>
          </div>
        </div>

        {/* Withdrawal Protection */}
        <div className="bg-white dark:bg-zinc-800/50 rounded-xl p-4 mb-4">
          <p className="text-[11px] font-semibold text-slate-500 dark:text-zinc-400 tracking-wider mb-4">{t.withdrawalProtection}</p>

          <div className="flex items-center gap-2 p-2.5 rounded-lg bg-[#f59e0b]/10 mb-3.5">
            <svg className="w-3.5 h-3.5 text-[#f59e0b]" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" /></svg>
            <span className="text-[11px] text-[#f59e0b] font-medium">{t.withdrawalProtectionNote}</span>
          </div>

          {[
            { icon: "⏱", title: t.withdrawalDelay, desc: t.withdrawalDelayDesc, enabled: withdrawalDelay, onToggle: setWithdrawalDelay },
            { icon: "❄️", title: t.newAddressCooling, desc: t.newAddressCoolingDesc, enabled: newAddressCooling, onToggle: setNewAddressCooling },
            { icon: "✉️", title: t.emailConfirmation, desc: t.emailConfirmationDesc, enabled: emailConfirmation, onToggle: setEmailConfirmation },
          ].map((item, idx) => (
            <div key={idx} className="flex items-center justify-between py-3.5 border-b border-stone-200 dark:border-zinc-700/50 last:border-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#2F6F62]/15 flex items-center justify-center">
                  <span className="text-base">{item.icon}</span>
                </div>
                <div>
                  <span className="text-[15px] font-medium text-slate-800 dark:text-white">{item.title}</span>
                  <p className="text-xs text-slate-500 dark:text-zinc-500 mt-1">{item.desc}</p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" checked={item.enabled} onChange={(e) => item.onToggle(e.target.checked)} className="sr-only peer" />
                <div className="w-11 h-6 bg-gray-200 dark:bg-zinc-600 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#2F6F62]"></div>
              </label>
            </div>
          ))}
        </div>

        {/* Device Management */}
        <div className="bg-white dark:bg-zinc-800/50 rounded-xl p-4 mb-4">
          <p className="text-[11px] font-semibold text-slate-500 dark:text-zinc-400 tracking-wider mb-4">{t.deviceManagement}</p>

          {devices.map((device) => (
            <div key={device.id} className="flex items-center justify-between p-3.5 rounded-xl border border-stone-200 dark:border-zinc-700/50 bg-[#f8f5f0] dark:bg-[#0a0a0a] mb-2.5">
              <div className="flex items-center gap-3.5">
                <div className="w-11 h-11 rounded-full bg-[#BFA181]/15 flex items-center justify-center">
                  <svg className="w-5 h-5 text-[#BFA181]" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    {device.type === "mobile" ? (
                      <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 1.5H8.25A2.25 2.25 0 006 3.75v16.5a2.25 2.25 0 002.25 2.25h7.5A2.25 2.25 0 0018 20.25V3.75a2.25 2.25 0 00-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-6 18.75h6" />
                    ) : (
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 17.25v1.007a3 3 0 01-.879 2.122L7.5 21h9l-.621-.621A3 3 0 0115 18.257V17.25m6-12V15a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 15V5.25m18 0A2.25 2.25 0 0018.75 3H5.25A2.25 2.25 0 003 5.25m18 0V12a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 12V5.25" />
                    )}
                  </svg>
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-semibold text-slate-800 dark:text-white">{device.name}</span>
                    {device.isCurrent && (
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-semibold bg-[#2F6F62] text-white">{t.currentDevice}</span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 dark:text-zinc-500">{device.location}</p>
                  <p className="text-[11px] text-slate-400 dark:text-zinc-600">IP: {device.ip}</p>
                </div>
              </div>
              {!device.isCurrent && (
                <button onClick={() => handleRemoveDevice(device.id)} className="w-9 h-9 rounded-full bg-red-500/10 flex items-center justify-center hover:bg-red-500/20 transition">
                  <svg className="w-4 h-4 text-red-500" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" /></svg>
                </button>
              )}
            </div>
          ))}
        </div>

        {/* Activity Log */}
        <div className="bg-white dark:bg-zinc-800/50 rounded-xl p-4 mb-4">
          <div className="flex justify-between items-center mb-4">
            <p className="text-[11px] font-semibold text-slate-500 dark:text-zinc-400 tracking-wider">{t.activityLog}</p>
            <button className="text-sm text-[#BFA181] font-medium hover:underline">{t.viewAll}</button>
          </div>

          {activityLogs.map((activity, idx) => (
            <div key={idx} className="flex items-center py-3 border-b border-stone-200 dark:border-zinc-700/50 last:border-0">
              <div className="w-9 h-9 rounded-full bg-[#2F6F62]/15 flex items-center justify-center mr-3">
                <svg className="w-4 h-4 text-[#2F6F62]" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  {activity.icon === "login" ? (
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" />
                  ) : activity.icon === "shield" ? (
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
                  ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25a3 3 0 013 3m3 0a6 6 0 01-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1121.75 8.25z" />
                  )}
                </svg>
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-slate-800 dark:text-white">{activity.action}</p>
                <p className="text-xs text-slate-500 dark:text-zinc-500 mt-0.5">{activity.device}</p>
              </div>
              <span className="text-[11px] text-slate-400 dark:text-zinc-500">{activity.time}</span>
            </div>
          ))}
        </div>

        {/* Emergency Controls */}
        <div className="bg-white dark:bg-zinc-800/50 rounded-xl p-4 mb-8">
          <p className="text-[11px] font-semibold text-slate-500 dark:text-zinc-400 tracking-wider mb-4">{t.emergencyControls}</p>

          {isVaultFrozen && (
            <div className="flex items-start gap-3.5 p-4 rounded-xl border border-red-500 bg-red-500/15 mb-4">
              <span className="text-2xl">❄️</span>
              <div>
                <p className="text-sm font-bold text-red-500">{t.vaultFrozen}</p>
                <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1 leading-relaxed">{t.vaultFrozenDesc}</p>
              </div>
            </div>
          )}

          <button
            onClick={() => isVaultFrozen ? handleUnfreezeVault() : setShowFreezeModal(true)}
            className={`w-full flex items-center gap-3.5 p-4 rounded-xl border transition ${
              isVaultFrozen
                ? "border-[#2F6F62] bg-[#2F6F62]/15 hover:bg-[#2F6F62]/20"
                : "border-red-500 bg-red-500/15 hover:bg-red-500/20"
            }`}
          >
            <span className="text-xl">{isVaultFrozen ? "🔓" : "❄️"}</span>
            <div className="flex-1 text-left">
              <p className={`text-[15px] font-semibold ${isVaultFrozen ? "text-[#2F6F62]" : "text-red-500"}`}>
                {isVaultFrozen ? t.unfreezeVault : t.freezeVault}
              </p>
              <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">{t.freezeVaultDesc}</p>
            </div>
            <svg className={`w-5 h-5 ${isVaultFrozen ? "text-[#2F6F62]" : "text-red-500"}`} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" /></svg>
          </button>
        </div>
      </div>

      {/* Freeze Confirmation Modal */}
      {showFreezeModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-6">
          <div className="bg-white dark:bg-zinc-800 rounded-2xl p-6 max-w-sm w-full text-center">
            <div className="w-[72px] h-[72px] rounded-full bg-red-500/15 flex items-center justify-center mx-auto mb-5">
              <svg className="w-8 h-8 text-red-500" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" /></svg>
            </div>
            <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-3">{t.freezeConfirmTitle}</h3>
            <p className="text-sm text-slate-500 dark:text-zinc-400 leading-relaxed mb-6">{t.freezeConfirmDesc}</p>
            <div className="flex gap-3">
              <button onClick={() => setShowFreezeModal(false)} className="flex-1 py-3.5 rounded-xl border border-stone-200 dark:border-zinc-700 text-[15px] font-semibold text-slate-800 dark:text-white hover:bg-slate-50 dark:hover:bg-zinc-700 transition">{t.cancel}</button>
              <button onClick={handleFreezeVault} className="flex-1 py-3.5 rounded-xl bg-red-500 text-[15px] font-semibold text-white flex items-center justify-center gap-2 hover:bg-red-600 transition">
                <span>❄️</span> {t.freezeConfirm}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
