"use client";

import { useState, useEffect } from "react";
import TopNav from "@/components/TopNav";
import { useLanguage } from "@/components/LanguageContext";
import { KYCVerification } from "@/components/KYCVerification";

// ============================================
// CLIENT CENTER - Institutional Client Management
// Private Bank Style Account Management
// Synced with Mobile Account Screen
// ============================================

const translations: Record<string, Record<string, string>> = {
  tr: {
    title: "Müşteri Merkezi",
    subtitle: "Kimlik ve hesap yönetimi",

    // Relationship Manager
    relationshipTeam: "İLİŞKİ YÖNETİMİ",
    yourRelationshipManager: "İlişki Yöneticiniz",
    relationshipManagerDesc: "Saklama uzmanlarına doğrudan erişim",
    contactTeam: "Ekiple İletişim",
    available: "Müsait",

    // Account Safeguards
    accountSafeguards: "HESAP GÜVENCELERİ",
    fullyAllocated: "Tam Tahsisli",
    segregated: "Ayrılmış",
    bankruptcyRemote: "İflastan Korumalı",
    independentCustody: "Bağımsız Saklama",

    // Client Verification - Institutional KYC Flow
    clientVerification: "MÜŞTERİ DOĞRULAMA",
    verificationRequired: "Doğrulama Gerekli",
    verifiedCustodyEnabled: "Doğrulanmış — Saklama Etkin",
    verificationPending: "Doğrulama Beklemede — Sınırlı Erişim",
    beginVerification: "Doğrulamayı Başlat",
    verificationDesc: "Saklama yeteneklerini etkinleştirmek için kimlik doğrulaması gereklidir.",
    verificationTime: "Genellikle birkaç dakika sürer",
    secureHandling: "Güvenli belge işleme",
    custodyActivation: "Saklama etkinleştirme için gerekli",

    // Identity Section
    identity: "KİMLİK",
    legalName: "Yasal İsim",
    accountType: "Hesap Türü",
    individual: "Bireysel",
    institutional: "Kurumsal",
    jurisdiction: "Yetki Alanı",
    kycStatus: "Müşteri Durumu",
    verified: "Doğrulanmış",
    pending: "Beklemede",

    // Contact Section
    contact: "İLETİŞİM",
    email: "E-posta",
    verifiedPhone: "Doğrulanmış Telefon",

    // Custody Addresses
    custodyAddresses: "SAKLAMA ADRESLERİ",
    vaultAddress: "Kasa Adresi",
    whitelistedAddresses: "Beyaz Liste Adresleri",
    addAddress: "Adres Ekle",
    whitelistRequired: "Çekimler yalnızca beyaz listedeki adreslere yapılabilir",

    // Menu Items
    securityCenter: "Güvenlik Merkezi",
    documentVault: "Belge Kasası",
    capitalLedger: "Sermaye Defteri",
    notifications: "Bildirimler",
    statements: "Hesap Özetleri",
    trustedContact: "Güvenilir Kişi",
    support: "Destek",
    trustCenter: "Güven Merkezi",
    preferences: "TERCİHLER",
    languageSetting: "Dil",
    signOut: "Çıkış Yap",
  },
  en: {
    title: "Client Center",
    subtitle: "Identity and account management",

    // Relationship Manager
    relationshipTeam: "RELATIONSHIP MANAGEMENT",
    yourRelationshipManager: "Your Relationship Manager",
    relationshipManagerDesc: "Direct access to custody specialists",
    contactTeam: "Contact Team",
    available: "Available",

    // Account Safeguards
    accountSafeguards: "ACCOUNT SAFEGUARDS",
    fullyAllocated: "Fully Allocated",
    segregated: "Segregated",
    bankruptcyRemote: "Bankruptcy Remote",
    independentCustody: "Independent Custody",

    // Client Verification - Institutional KYC Flow
    clientVerification: "CLIENT VERIFICATION",
    verificationRequired: "Verification Required",
    verifiedCustodyEnabled: "Verified — Custody Enabled",
    verificationPending: "Verification Pending — Limited Access",
    beginVerification: "Begin Verification",
    verificationDesc: "Identity verification is required to activate custody capabilities.",
    verificationTime: "Typically takes a few minutes",
    secureHandling: "Secure document handling",
    custodyActivation: "Required for custody activation",

    // Identity Section
    identity: "IDENTITY",
    legalName: "Legal Name",
    accountType: "Account Type",
    individual: "Individual",
    institutional: "Institutional",
    jurisdiction: "Jurisdiction",
    kycStatus: "Client Status",
    verified: "Verified",
    pending: "Pending",

    // Contact Section
    contact: "CONTACT",
    email: "Email",
    verifiedPhone: "Verified Phone",

    // Custody Addresses
    custodyAddresses: "CUSTODY ADDRESSES",
    vaultAddress: "Vault Address",
    whitelistedAddresses: "Whitelisted Addresses",
    addAddress: "Add Address",
    whitelistRequired: "Withdrawals can only be made to whitelisted addresses",

    // Menu Items
    securityCenter: "Security Center",
    documentVault: "Document Vault",
    capitalLedger: "Capital Ledger",
    notifications: "Notifications",
    statements: "Statements",
    trustedContact: "Trusted Contact",
    support: "Support",
    trustCenter: "Trust Center",
    preferences: "PREFERENCES",
    languageSetting: "Language",
    signOut: "Sign Out",
  },
  de: {
    title: "Kundenzentrum",
    subtitle: "Identitäts- und Kontoverwaltung",
    relationshipTeam: "BEZIEHUNGSMANAGEMENT",
    yourRelationshipManager: "Ihr Beziehungsmanager",
    relationshipManagerDesc: "Direkter Zugang zu Verwahrungsspezialisten",
    contactTeam: "Team kontaktieren",
    available: "Verfügbar",
    accountSafeguards: "KONTOSICHERUNGEN",
    fullyAllocated: "Vollständig zugewiesen",
    segregated: "Getrennt",
    bankruptcyRemote: "Insolvenzfern",
    independentCustody: "Unabhängige Verwahrung",
    identity: "IDENTITÄT",
    legalName: "Rechtlicher Name",
    accountType: "Kontotyp",
    individual: "Einzelperson",
    institutional: "Institutionell",
    jurisdiction: "Gerichtsbarkeit",
    kycStatus: "KYC-Status",
    verified: "Verifiziert",
    pending: "Ausstehend",
    contact: "KONTAKT",
    email: "E-Mail",
    verifiedPhone: "Verifiziertes Telefon",
    custodyAddresses: "VERWAHRUNGSADRESSEN",
    vaultAddress: "Tresoradresse",
    whitelistedAddresses: "Whitelist-Adressen",
    addAddress: "Adresse hinzufügen",
    whitelistRequired: "Abhebungen können nur an Whitelist-Adressen erfolgen",
    securityCenter: "Sicherheitszentrum",
    documentVault: "Dokumententresor",
    capitalLedger: "Kapitalbuch",
    notifications: "Benachrichtigungen",
    statements: "Kontoauszüge",
    trustedContact: "Vertrauenskontakt",
    support: "Support",
    trustCenter: "Vertrauenszentrum",
    preferences: "EINSTELLUNGEN",
    languageSetting: "Sprache",
    signOut: "Abmelden",
  },
  fr: {
    title: "Centre Client",
    subtitle: "Gestion de l'identité et du compte",
    relationshipTeam: "GESTION DES RELATIONS",
    yourRelationshipManager: "Votre Gestionnaire de Relation",
    relationshipManagerDesc: "Accès direct aux spécialistes de la garde",
    contactTeam: "Contacter l'équipe",
    available: "Disponible",
    accountSafeguards: "GARANTIES DU COMPTE",
    fullyAllocated: "Entièrement alloué",
    segregated: "Séparé",
    bankruptcyRemote: "Protégé de la faillite",
    independentCustody: "Garde indépendante",
    identity: "IDENTITÉ",
    legalName: "Nom légal",
    accountType: "Type de compte",
    individual: "Individuel",
    institutional: "Institutionnel",
    jurisdiction: "Juridiction",
    kycStatus: "Statut KYC",
    verified: "Vérifié",
    pending: "En attente",
    contact: "CONTACT",
    email: "Email",
    verifiedPhone: "Téléphone vérifié",
    custodyAddresses: "ADRESSES DE GARDE",
    vaultAddress: "Adresse du coffre",
    whitelistedAddresses: "Adresses autorisées",
    addAddress: "Ajouter une adresse",
    whitelistRequired: "Les retraits ne peuvent être effectués qu'aux adresses autorisées",
    securityCenter: "Centre de sécurité",
    documentVault: "Coffre de documents",
    capitalLedger: "Grand livre du capital",
    notifications: "Notifications",
    statements: "Relevés",
    trustedContact: "Contact de confiance",
    support: "Support",
    trustCenter: "Centre de confiance",
    preferences: "PRÉFÉRENCES",
    languageSetting: "Langue",
    signOut: "Déconnexion",
  },
  ar: {
    title: "مركز العملاء",
    subtitle: "إدارة الهوية والحساب",
    relationshipTeam: "إدارة العلاقات",
    yourRelationshipManager: "مدير علاقاتك",
    relationshipManagerDesc: "الوصول المباشر لمتخصصي الحفظ",
    contactTeam: "اتصل بالفريق",
    available: "متاح",
    accountSafeguards: "ضمانات الحساب",
    fullyAllocated: "مخصص بالكامل",
    segregated: "منفصل",
    bankruptcyRemote: "محمي من الإفلاس",
    independentCustody: "حفظ مستقل",
    identity: "الهوية",
    legalName: "الاسم القانوني",
    accountType: "نوع الحساب",
    individual: "فردي",
    institutional: "مؤسسي",
    jurisdiction: "الاختصاص القضائي",
    kycStatus: "حالة KYC",
    verified: "موثق",
    pending: "قيد الانتظار",
    contact: "الاتصال",
    email: "البريد الإلكتروني",
    verifiedPhone: "الهاتف الموثق",
    custodyAddresses: "عناوين الحفظ",
    vaultAddress: "عنوان الخزنة",
    whitelistedAddresses: "العناوين المعتمدة",
    addAddress: "إضافة عنوان",
    whitelistRequired: "يمكن إجراء عمليات السحب فقط إلى العناوين المعتمدة",
    securityCenter: "مركز الأمان",
    documentVault: "خزنة المستندات",
    capitalLedger: "دفتر رأس المال",
    notifications: "الإشعارات",
    statements: "كشوف الحساب",
    trustedContact: "جهة الاتصال الموثوقة",
    support: "الدعم",
    trustCenter: "مركز الثقة",
    preferences: "التفضيلات",
    languageSetting: "اللغة",
    signOut: "تسجيل الخروج",
  },
  ru: {
    title: "Клиентский центр",
    subtitle: "Управление идентификацией и аккаунтом",
    relationshipTeam: "УПРАВЛЕНИЕ ОТНОШЕНИЯМИ",
    yourRelationshipManager: "Ваш менеджер по работе с клиентами",
    relationshipManagerDesc: "Прямой доступ к специалистам по хранению",
    contactTeam: "Связаться с командой",
    available: "Доступен",
    accountSafeguards: "ГАРАНТИИ АККАУНТА",
    fullyAllocated: "Полностью распределено",
    segregated: "Сегрегировано",
    bankruptcyRemote: "Защита от банкротства",
    independentCustody: "Независимое хранение",
    identity: "ИДЕНТИФИКАЦИЯ",
    legalName: "Юридическое имя",
    accountType: "Тип аккаунта",
    individual: "Физическое лицо",
    institutional: "Институциональный",
    jurisdiction: "Юрисдикция",
    kycStatus: "Статус KYC",
    verified: "Подтверждено",
    pending: "Ожидание",
    contact: "КОНТАКТ",
    email: "Электронная почта",
    verifiedPhone: "Подтвержденный телефон",
    custodyAddresses: "АДРЕСА ХРАНЕНИЯ",
    vaultAddress: "Адрес хранилища",
    whitelistedAddresses: "Белый список адресов",
    addAddress: "Добавить адрес",
    whitelistRequired: "Вывод средств возможен только на адреса из белого списка",
    securityCenter: "Центр безопасности",
    documentVault: "Хранилище документов",
    capitalLedger: "Книга капитала",
    notifications: "Уведомления",
    statements: "Выписки",
    trustedContact: "Доверенный контакт",
    support: "Поддержка",
    trustCenter: "Центр доверия",
    preferences: "НАСТРОЙКИ",
    languageSetting: "Язык",
    signOut: "Выйти",
  },
};

// Language display names
const languageNames: Record<string, string> = {
  en: "English",
  tr: "Türkçe",
  de: "Deutsch",
  fr: "Français",
  ar: "العربية",
  ru: "Русский",
};

export default function ClientCenterPage() {
  const { lang, setLang } = useLanguage();
  const t = translations[lang] || translations.en;

  // Auxite Vault Wallet - no external wallet connect
  const [address, setAddress] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [showKycModal, setShowKycModal] = useState(false);
  const [kycData, setKycData] = useState<{
    level: "none" | "basic" | "verified" | "enhanced";
    status: "not_started" | "pending" | "under_review" | "approved" | "rejected" | "expired";
  } | null>(null);
  const [kycLoading, setKycLoading] = useState(true);

  // Real user data from API
  const [userProfile, setUserProfile] = useState<{
    name: string;
    email: string;
    phone: string;
    country: string;
    accountType: string;
  }>({ name: "", email: "", phone: "", country: "", accountType: "individual" });
  const [whitelistedAddresses, setWhitelistedAddresses] = useState<
    { label: string; address: string }[]
  >([]);

  // Load wallet address from localStorage
  useEffect(() => {
    const savedAddress = localStorage.getItem("auxite_wallet_address");
    if (savedAddress) {
      setAddress(savedAddress);
    }
  }, []);

  // Fetch user profile from API
  useEffect(() => {
    if (!address) return;
    const fetchProfile = async () => {
      try {
        const res = await fetch(`/api/user/profile?address=${address}`);
        if (res.ok) {
          const data = await res.json();
          if (data.success && data.profile) {
            const maskedEmail = data.profile.email
              ? data.profile.email.replace(/(.{2})(.*)(@.*)/, "$1***$3")
              : "—";
            const maskedPhone = data.profile.phone
              ? data.profile.phone.replace(/(.{4})(.*)(.{4})/, "$1 *** $3")
              : "—";
            setUserProfile({
              name: data.profile.name || data.profile.email?.split("@")[0] || "—",
              email: maskedEmail,
              phone: maskedPhone,
              country: data.profile.country || "—",
              accountType: "individual",
            });
          }
        }
      } catch (err) {
        console.error("Profile fetch error:", err);
      }
    };
    fetchProfile();
  }, [address]);

  // Fetch whitelist addresses from API
  useEffect(() => {
    if (!address) return;
    const fetchWhitelist = async () => {
      try {
        const res = await fetch(`/api/security/whitelist?address=${address}`);
        if (res.ok) {
          const data = await res.json();
          if (data.addresses && data.addresses.length > 0) {
            setWhitelistedAddresses(
              data.addresses.map((a: any) => ({
                label: a.label || a.network || "Address",
                address: a.address
                  ? `${a.address.slice(0, 6)}...${a.address.slice(-4)}`
                  : "—",
              }))
            );
          }
        }
      } catch (err) {
        console.error("Whitelist fetch error:", err);
      }
    };
    fetchWhitelist();
  }, [address]);

  // Fetch KYC status from API
  useEffect(() => {
    const fetchKYC = async () => {
      if (!address) {
        setKycLoading(false);
        return;
      }
      try {
        const res = await fetch("/api/kyc", {
          headers: { "x-wallet-address": address }
        });
        if (res.ok) {
          const data = await res.json();
          setKycData(data.kyc);
        }
      } catch (err) {
        console.error("Fetch KYC error:", err);
      } finally {
        setKycLoading(false);
      }
    };
    fetchKYC();
  }, [address]);

  // Map KYC status to our display format
  const getKycStatus = (): "none" | "pending" | "verified" => {
    if (!kycData) return "none";
    if (kycData.status === "approved") return "verified";
    if (kycData.status === "pending" || kycData.status === "under_review") return "pending";
    return "none";
  };

  const kycStatus = getKycStatus();

  // Combined user data (real profile + KYC status)
  const userData = {
    legalName: userProfile.name,
    accountType: userProfile.accountType,
    jurisdiction: userProfile.country,
    kycStatus: kycStatus,
    email: userProfile.email,
    phone: userProfile.phone,
    whitelistedAddresses: whitelistedAddresses,
  };

  // Start Sumsub verification
  const handleStartVerification = () => {
    setShowKycModal(true);
  };

  // Refresh KYC status when modal closes
  const handleKycClose = async () => {
    setShowKycModal(false);
    if (address) {
      setKycLoading(true);
      try {
        const res = await fetch("/api/kyc", {
          headers: { "x-wallet-address": address }
        });
        if (res.ok) {
          const data = await res.json();
          setKycData(data.kyc);
        }
      } catch (err) {
        console.error("Fetch KYC error:", err);
      } finally {
        setKycLoading(false);
      }
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Menu Item Component - same style as mobile
  const MenuItem = ({
    icon,
    label,
    href,
    danger = false,
    badge,
  }: {
    icon: React.ReactNode;
    label: string;
    href: string;
    danger?: boolean;
    badge?: string;
  }) => (
    <a
      href={href}
      className={`flex items-center justify-between py-4 border-b border-stone-200 dark:border-slate-700 last:border-b-0 group`}
    >
      <div className="flex items-center gap-3">
        <div
          className={`w-9 h-9 rounded-full flex items-center justify-center ${
            danger ? "bg-red-500/15" : "bg-[#BFA181]/15"
          }`}
        >
          {icon}
        </div>
        <span
          className={`font-medium ${
            danger ? "text-red-600 dark:text-red-400" : "text-slate-800 dark:text-white"
          }`}
        >
          {label}
        </span>
      </div>
      <div className="flex items-center gap-2">
        {badge && (
          <span className="px-2 py-0.5 text-xs rounded-full bg-[#2F6F62] text-white font-semibold">
            {badge}
          </span>
        )}
        <svg
          className="w-5 h-5 text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300 transition-colors"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </div>
    </a>
  );

  return (
    <div className="min-h-screen bg-stone-100 dark:bg-slate-950">
      <TopNav />

      <div className="max-w-3xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-800 dark:text-white mb-1">{t.title}</h1>
          <p className="text-sm text-slate-600 dark:text-slate-400">{t.subtitle}</p>
        </div>

        {/* Relationship Manager Card - Private Bank Feel */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-[#BFA181]/50 p-4 mb-4">
          <div className="flex items-start gap-3 mb-4">
            <div className="w-12 h-12 rounded-full bg-[#BFA181]/15 flex items-center justify-center flex-shrink-0">
              <svg className="w-7 h-7 text-[#BFA181]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0zm6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="flex-1">
              <p className="text-[10px] font-semibold text-slate-500 tracking-wider mb-0.5">
                {t.yourRelationshipManager}
              </p>
              <p className="text-base font-semibold text-slate-800 dark:text-white mb-0.5">
                Marcus Reynolds
              </p>
              <p className="text-xs text-slate-500">{t.relationshipManagerDesc}</p>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-[#2F6F62] animate-pulse" />
              <span className="text-[10px] font-medium text-[#2F6F62] dark:text-[#2F6F62]">
                {t.available}
              </span>
            </div>
          </div>
          <button className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-[#BFA181]/15 text-[#BFA181] dark:text-[#BFA181] font-medium text-sm hover:bg-[#BFA181]/25 transition-colors">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            {t.contactTeam}
          </button>
        </div>

        {/* Account Safeguards Banner - Only show when verified */}
        {userData.kycStatus === "verified" && (
          <div className="bg-[#2F6F62]/10 border border-[#2F6F62] rounded-xl p-4 mb-4">
            <p className="text-[11px] font-semibold text-[#2F6F62] dark:text-[#2F6F62] tracking-wider mb-3">
              {t.accountSafeguards}
            </p>
            <div className="grid grid-cols-2 gap-2">
              {[t.fullyAllocated, t.segregated, t.bankruptcyRemote, t.independentCustody].map(
                (item, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-[#2F6F62] flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="text-xs font-medium text-[#2F6F62] dark:text-[#2F6F62]">
                      {item}
                    </span>
                  </div>
                )
              )}
            </div>
          </div>
        )}

        {/* ============================================ */}
        {/* CLIENT VERIFICATION - Institutional KYC Flow */}
        {/* Status + Action + Progress */}
        {/* ============================================ */}
        <div className={`rounded-xl p-5 mb-4 border ${
          userData.kycStatus === "verified"
            ? "bg-[#2F6F62]/10 border-[#2F6F62]"
            : userData.kycStatus === "pending"
            ? "bg-[#BFA181]/10 border-[#BFA181]"
            : "bg-white dark:bg-slate-900 border-[#BFA181]"
        }`}>
          <p className="text-[11px] font-semibold text-slate-500 tracking-wider mb-4">
            {t.clientVerification}
          </p>

          {/* Status Display */}
          <div className="flex items-center gap-3 mb-4">
            <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
              kycLoading
                ? "bg-slate-500/20"
                : userData.kycStatus === "verified"
                ? "bg-[#2F6F62]/20"
                : userData.kycStatus === "pending"
                ? "bg-[#BFA181]/20"
                : "bg-[#BFA181]/20"
            }`}>
              {userData.kycStatus === "verified" ? (
                <svg className="w-6 h-6 text-[#2F6F62]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              ) : userData.kycStatus === "pending" ? (
                <svg className="w-6 h-6 text-[#BFA181] animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              ) : (
                <svg className="w-6 h-6 text-[#BFA181]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              )}
            </div>
            <div>
              <p className={`text-sm font-semibold ${
                userData.kycStatus === "verified"
                  ? "text-[#2F6F62] dark:text-[#2F6F62]"
                  : "text-[#BFA181] dark:text-[#BFA181]"
              }`}>
                {userData.kycStatus === "verified"
                  ? t.verifiedCustodyEnabled
                  : userData.kycStatus === "pending"
                  ? t.verificationPending
                  : t.verificationRequired}
              </p>
              <p className="text-xs text-slate-500 mt-0.5">
                {t.verificationDesc}
              </p>
            </div>
          </div>

          {/* Action Button - Only show if not verified */}
          {userData.kycStatus !== "verified" && !kycLoading && (
            <>
              <button
                onClick={handleStartVerification}
                disabled={!address}
                className="w-full py-3.5 rounded-xl bg-[#BFA181] hover:bg-[#BFA181] disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold text-base transition-colors mb-4"
              >
                {t.beginVerification}
              </button>

              {/* Trust Points */}
              <div className="space-y-2">
                {[t.verificationTime, t.secureHandling, t.custodyActivation].map((item, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-[#2F6F62] flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span className="text-xs text-slate-600 dark:text-slate-400">{item}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Identity Section */}
        <div className="bg-white dark:bg-slate-900 rounded-xl p-4 mb-4">
          <p className="text-[11px] font-semibold text-slate-500 tracking-wider mb-4">
            {t.identity}
          </p>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-500">{t.legalName}</span>
              <span className="text-sm font-medium text-slate-800 dark:text-white">
                {userData.legalName}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-500">{t.accountType}</span>
              <span className="px-2.5 py-1 text-xs font-semibold rounded-md bg-[#BFA181]/15 text-[#BFA181] dark:text-[#BFA181]">
                {userData.accountType === "individual" ? t.individual : t.institutional}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-500">{t.jurisdiction}</span>
              <span className="text-sm font-medium text-slate-800 dark:text-white">
                {userData.jurisdiction}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-500">{t.kycStatus}</span>
              <span
                className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-md ${
                  userData.kycStatus === "verified"
                    ? "bg-[#2F6F62]/15 text-[#2F6F62] dark:text-[#2F6F62]"
                    : "bg-[#BFA181]/15 text-[#BFA181] dark:text-[#BFA181]"
                }`}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    userData.kycStatus === "verified" ? "bg-[#2F6F62]" : "bg-[#BFA181]"
                  }`}
                />
                {userData.kycStatus === "verified"
                  ? t.verifiedCustodyEnabled
                  : userData.kycStatus === "pending"
                  ? t.verificationPending
                  : t.verificationRequired}
              </span>
            </div>
          </div>
        </div>

        {/* Contact Section */}
        <div className="bg-white dark:bg-slate-900 rounded-xl p-4 mb-4">
          <p className="text-[11px] font-semibold text-slate-500 tracking-wider mb-4">
            {t.contact}
          </p>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-500">{t.email}</span>
              <span className="text-sm font-medium text-slate-800 dark:text-white">
                {userData.email}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-500">{t.verifiedPhone}</span>
              <span className="text-sm font-medium text-slate-800 dark:text-white">
                {userData.phone}
              </span>
            </div>
          </div>
        </div>

        {/* Custody Addresses */}
        <div className="bg-white dark:bg-slate-900 rounded-xl p-4 mb-4">
          <p className="text-[11px] font-semibold text-slate-500 tracking-wider mb-4">
            {t.custodyAddresses}
          </p>

          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-slate-500">{t.vaultAddress}</span>
              <button
                onClick={() => address && copyToClipboard(address)}
                className="p-1 rounded hover:bg-stone-100 dark:hover:bg-slate-800"
              >
                <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              </button>
            </div>
            <p className="text-xs font-mono text-slate-600 dark:text-slate-400">
              {address ? `${address.slice(0, 8)}...${address.slice(-6)}` : "—"}
            </p>
          </div>

          <div className="pt-3 border-t border-stone-200 dark:border-slate-700">
            <p className="text-sm font-semibold text-slate-800 dark:text-white mb-1">
              {t.whitelistedAddresses}
            </p>
            <p className="text-xs text-slate-500 italic mb-3">{t.whitelistRequired}</p>

            <div className="space-y-2 mb-3">
              {userData.whitelistedAddresses.length > 0 ? (
                userData.whitelistedAddresses.map((addr, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-3 rounded-lg bg-stone-50 dark:bg-slate-800 border border-stone-200 dark:border-slate-700"
                  >
                    <div>
                      <p className="text-sm font-medium text-slate-800 dark:text-white mb-0.5">
                        {addr.label}
                      </p>
                      <p className="text-xs font-mono text-slate-500">{addr.address}</p>
                    </div>
                    <svg className="w-5 h-5 text-[#2F6F62]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                  </div>
                ))
              ) : (
                <div className="p-3 rounded-lg bg-stone-50 dark:bg-slate-800 border border-dashed border-stone-300 dark:border-slate-600 text-center">
                  <p className="text-xs text-slate-500">
                    {lang === "tr" ? "Henüz beyaz liste adresi eklenmedi" : "No whitelisted addresses yet"}
                  </p>
                </div>
              )}
            </div>

            <button className="w-full flex items-center justify-center gap-2 py-3 rounded-lg border border-dashed border-[#BFA181]/50 text-[#BFA181] dark:text-[#BFA181] font-medium text-sm hover:bg-[#BFA181]/10 transition-colors">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              {t.addAddress}
            </button>
          </div>
        </div>

        {/* Menu Section */}
        <div className="bg-white dark:bg-slate-900 rounded-xl p-4 mb-4">
          <MenuItem
            icon={<svg className="w-5 h-5 text-[#BFA181]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>}
            label={t.securityCenter}
            href="/security"
          />
          <MenuItem
            icon={<svg className="w-5 h-5 text-[#BFA181]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>}
            label={t.documentVault}
            href="/documents"
            badge="3"
          />
          <MenuItem
            icon={<svg className="w-5 h-5 text-[#BFA181]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" /></svg>}
            label={t.capitalLedger}
            href="/ledger"
          />
          <MenuItem
            icon={<svg className="w-5 h-5 text-[#BFA181]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>}
            label={t.notifications}
            href="/notifications"
            badge="2"
          />
          <MenuItem
            icon={<svg className="w-5 h-5 text-[#BFA181]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>}
            label={t.statements}
            href="/statements"
          />
          <MenuItem
            icon={<svg className="w-5 h-5 text-[#BFA181]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>}
            label={t.trustedContact}
            href="/trusted-contact"
          />
          <MenuItem
            icon={<svg className="w-5 h-5 text-[#BFA181]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" /></svg>}
            label={t.trustCenter}
            href="/trust-center"
          />
          <MenuItem
            icon={<svg className="w-5 h-5 text-[#BFA181]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" /></svg>}
            label={t.support}
            href="/support"
          />
        </div>

        {/* Preferences Section */}
        <div className="bg-white dark:bg-slate-900 rounded-xl p-4 mb-4">
          <p className="text-[11px] font-semibold text-slate-500 tracking-wider mb-4">
            {t.preferences}
          </p>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-[#BFA181]/15 flex items-center justify-center">
                <svg className="w-5 h-5 text-[#BFA181]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                </svg>
              </div>
              <span className="font-medium text-slate-800 dark:text-white">{t.languageSetting}</span>
            </div>
            <select
              value={lang}
              onChange={(e) => setLang(e.target.value as typeof lang)}
              className="px-3 py-1.5 bg-stone-100 dark:bg-slate-800 border border-stone-200 dark:border-slate-700 rounded-lg text-sm text-[#BFA181] dark:text-[#BFA181] font-medium focus:outline-none focus:border-[#BFA181]"
            >
              {Object.entries(languageNames).map(([code, name]) => (
                <option key={code} value={code}>
                  {name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Sign Out Section */}
        <div className="bg-white dark:bg-slate-900 rounded-xl p-4 mb-8">
          <MenuItem
            icon={<svg className="w-5 h-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>}
            label={t.signOut}
            href="/auth/logout"
            danger
          />
        </div>
      </div>

      {/* Copied Toast */}
      {copied && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 px-4 py-2 bg-slate-800 text-white rounded-lg text-sm shadow-lg">
          Copied!
        </div>
      )}

      {/* KYC Verification Modal - Real Sumsub Integration */}
      {showKycModal && address && (
        <KYCVerification
          walletAddress={address}
          onClose={handleKycClose}
        />
      )}
    </div>
  );
}
