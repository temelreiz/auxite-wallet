"use client";
import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { usePathname } from "next/navigation";
import { isPublicMarketingPath } from "@/lib/public-routes";

// ============================================
// LANGUAGE TYPES & CONFIG
// ============================================
export const LANGUAGES = [
  { code: "tr", name: "Turkish", nativeName: "Türkçe", flag: "🇹🇷" },
  { code: "en", name: "English", nativeName: "English", flag: "🇺🇸" },
  { code: "de", name: "German", nativeName: "Deutsch", flag: "🇩🇪" },
  { code: "fr", name: "French", nativeName: "Français", flag: "🇫🇷" },
  { code: "ar", name: "Arabic", nativeName: "العربية", flag: "🇸🇦" },
  { code: "ru", name: "Russian", nativeName: "Русский", flag: "🇷🇺" },
] as const;

export type LanguageCode = typeof LANGUAGES[number]["code"];

// ============================================
// ALL TRANSLATIONS
// ============================================
export const translations: Record<LanguageCode, Record<string, string>> = {
  tr: {
    // Navigation
    markets: "Piyasalar",
    earn: "Kazan",
    stakeNav: "Biriktir",
    wallet: "Cüzdan",
    profile: "Profil",
    connect: "Bağla",
    disconnect: "Kes",
    language: "Dil Seçimi",
    
    // Home/Markets Page
    auxiteMarkets: "Auxite Piyasalar",
    marketsDesc: "Fiziksel metallerle desteklenen dijital tokenleri alın ve satın. Gerçek zamanlı fiyatlar ve anlık işlemler.",
    pricesTitle: "Güncel Fiyatlar",
    pricesDesc: "Canlı piyasa verileri",
    ecosystemDesc: "Auxite ekosistemindeki tüm tokenlar, temsil ettikleri metal türüne karşılık gelen fiziksel değer üzerine yapılandırılmıştır; ilgili varlıklar, dünya genelindeki yetkili ve denetimli depolama tesisleri üzerinden muhafaza edilir.",
    chooseWallet: "Cüzdan Seçin",
    chooseHowConnect: "Nasıl bağlanmak istediğinizi seçin",
    auxiteWallet: "Auxite Cüzdan",
    createOrImport: "Yeni cüzdan oluştur veya içe aktar",
    recommended: "Önerilen",
    externalWallet: "Harici Cüzdan",
    connectMetamask: "MetaMask, WalletConnect, vb.",
    keysStayWithYou: "Anahtarlarınız her zaman sizde kalır. Non-custodial.",
    logout: "Çıkış Yap",
    switchWallet: "Cüzdan Değiştir",
    
    // Earn Page
    earnTitle: "Kazan",
    earnDesc: "Metallerinizi stake edin ve ödüller kazanın",
    myLeases: "Yapılandırılmış Getirilerim",
    leaseDescription: "Altınınızı yapılandırılmış getiri programına dahil edin ve faiz kazanın.",
    connectWalletForLeasing: "Yapılandırılmış getiri işlemlerini görüntülemek ve yeni katılım başlatmak için cüzdanınızı bağlayın.",
    stakingOverview: "Staking Genel Bakış",
    totalStaked: "Toplam Stake Edilmiş",
    totalRewards: "Toplam Ödüller",
    avgApy: "Ortalama APY",
    stakingPools: "Staking Havuzları",
    flexibleStaking: "Esnek Staking",
    noLockPeriod: "Kilitleme yok, dilediğiniz zaman çekin",
    stake: "Stake Et",
    lockedStaking: "Kilitli Staking",
    lockFor30Days: "30 gün kilitleyin, daha yüksek getiri",
    higherReturns: "Daha Yüksek Getiri",
    yourPositions: "Pozisyonlarınız",
    noActivePositions: "Aktif pozisyon yok",
    startStaking: "Staking yaparak pasif gelir kazanmaya başlayın",
    
    // Wallet Page
    myWallet: "Cüzdanım",
    walletDesc: "Varlıklarınızı görüntüleyin, transfer edin ve yönetin.",
    addFunds: "Yatır",
    transfer: "Gönder",
    quickBuy: "Hızlı Al",
    exchange: "Dönüştür",
    withdraw: "Çek",
    
    // Deposit Modal
    selectDeposit: "Yatırma Yöntemi Seçin",
    depositCrypto: "Kripto Yatır",
    depositCryptoDesc: "BTC, ETH veya diğer coinleri yatırın",
    depositUsd: "+ USD Yatır",
    depositUsdDesc: "Banka veya kart ile yatırın",
    selectCoin: "Coin Seç",
    totalAssetValue: "Toplam Varlık Değeri (tahmini)",
    auxiteAndCrypto: "Auxite ve Crypto Varlıklar",
    lockedAssets: "Kilitli Varlıklar",
    myAssets: "Auxite ve Crypto Varlıklarım",
    gold: "Altın",
    silver: "Gümüş",
    platinum: "Platin",
    palladium: "Paladyum",
    walletRequired: "Cüzdan Bağlantısı Gerekli",
    connectToView: "Varlıklarınızı görmek ve yönetmek için cüzdanınızı bağlayın",
    buyWithUsd: "USD ile Al",
    actions: "İşlemler",
    autoInvest: "Düzenli Yatırım",
    physicalDelivery: "Fiziksel Teslimat",
    security: "Güvenlik Ayarları",
    advancedSecurity: "Gelişmiş Güvenlik",
    priceAlerts: "Fiyat Uyarıları",
    
    // Profile Page
    profileTitle: "Profil",
    accountSettings: "Hesap Ayarları",
    personalInfo: "Kişisel Bilgiler",
    securitySettings: "Güvenlik Ayarları",
    notifications: "Bildirimler",
    preferences: "Tercihler",
    email: "E-posta",
    phone: "Telefon",
    country: "Ülke",
    timezone: "Saat Dilimi",
    twoFactorAuth: "İki Faktörlü Doğrulama",
    enabled: "Aktif",
    disabled: "Devre Dışı",
    changePassword: "Şifre Değiştir",
    emailNotifications: "E-posta Bildirimleri",
    pushNotifications: "Push Bildirimleri",
    priceAlertNotifications: "Fiyat Uyarı Bildirimleri",
    transactionNotifications: "İşlem Bildirimleri",
    displayCurrency: "Görüntüleme Para Birimi",
    darkMode: "Karanlık Mod",
    lightMode: "Aydınlık Mod",
    referralProgram: "Referans Programı",
    yourReferralCode: "Referans Kodunuz",
    copy: "Kopyala",
    share: "Paylaş",
    totalReferrals: "Toplam Referans",
    totalEarnings: "Toplam Kazanç",
    exportData: "Verileri Dışa Aktar",
    deleteAccount: "Hesabı Sil",
    logout2: "Çıkış Yap",

    // Common
    loading: "Yükleniyor...",
    error: "Hata",
    success: "Başarılı",
    cancel: "İptal",
    confirm: "Onayla",
    save: "Kaydet",
    edit: "Düzenle",
    delete: "Sil",
    close: "Kapat",
    back: "Geri",
    next: "İleri",
    submit: "Gönder",
    amount: "Miktar",
    balance: "Bakiye",
    fee: "Ücret",
    total: "Toplam",
    min: "Min",
    max: "Max",
    available: "Kullanılabilir",
    estimated: "Tahmini",
    
    // Metal names
    AUXG: "Altın",
    AUXS: "Gümüş",
    AUXPT: "Platin",
    AUXPD: "Paladyum",
    wrongNetworkDetected: "Yanlış ağ. Devam etmek için lütfen {chain} ağına geçin.",
    switchToChain: "{chain} ağına geç",

  },
  
  en: {
    // Navigation
    markets: "Markets",
    earn: "Earn",
    stakeNav: "Stake",
    wallet: "Wallet",
    profile: "Profile",
    connect: "Connect",
    disconnect: "Disconnect",
    language: "Language",
    
    // Home/Markets Page
    auxiteMarkets: "Auxite Markets",
    marketsDesc: "Trade digital tokens backed by physical metals. Real-time prices and instant transactions.",
    pricesTitle: "Current Prices",
    pricesDesc: "Live market data",
    ecosystemDesc: "All tokens in the Auxite ecosystem are structured on physical value corresponding to the metal type they represent; related assets are stored through authorized and audited storage facilities worldwide.",
    chooseWallet: "Choose Wallet",
    chooseHowConnect: "Choose how you want to connect",
    auxiteWallet: "Auxite Wallet",
    createOrImport: "Create new wallet or import",
    recommended: "Recommended",
    externalWallet: "External Wallet",
    connectMetamask: "MetaMask, WalletConnect, etc.",
    keysStayWithYou: "Your keys always stay with you. Non-custodial.",
    logout: "Log Out",
    switchWallet: "Switch Wallet",
    
    // Earn Page
    earnTitle: "Earn",
    earnDesc: "Stake your metals and earn rewards",
    myLeases: "My Structured Yields",
    leaseDescription: "Enroll your gold in structured yield and earn interest.",
    connectWalletForLeasing: "Connect your wallet to view structured yield operations and start new participations.",
    stakingOverview: "Staking Overview",
    totalStaked: "Total Staked",
    totalRewards: "Total Rewards",
    avgApy: "Average APY",
    stakingPools: "Staking Pools",
    flexibleStaking: "Flexible Staking",
    noLockPeriod: "No lock period, withdraw anytime",
    stake: "Stake",
    lockedStaking: "Locked Staking",
    lockFor30Days: "Lock for 30 days, higher returns",
    higherReturns: "Higher Returns",
    yourPositions: "Your Positions",
    noActivePositions: "No active positions",
    startStaking: "Start staking to earn passive income",
    
    // Wallet Page
    myWallet: "My Wallet",
    walletDesc: "View, transfer and manage your assets.",
    addFunds: "Add Funds",
    transfer: "Transfer",
    quickBuy: "Quick Buy",
    exchange: "Exchange",
    withdraw: "Withdraw",
    
    // Deposit Modal
    selectDeposit: "Select Deposit Method",
    depositCrypto: "Deposit Crypto",
    depositCryptoDesc: "Deposit BTC, ETH or other coins",
    depositUsd: "+ Deposit USD",
    depositUsdDesc: "Via bank transfer or card",
    selectCoin: "Select Coin",
    totalAssetValue: "Total Asset Value (est.)",
    auxiteAndCrypto: "Auxite and Crypto Assets",
    lockedAssets: "Locked Assets",
    myAssets: "My Auxite and Crypto Assets",
    gold: "Gold",
    silver: "Silver",
    platinum: "Platinum",
    palladium: "Palladium",
    walletRequired: "Wallet Connection Required",
    connectToView: "Connect your wallet to view and manage your assets",
    buyWithUsd: "Buy with USD",
    actions: "Actions",
    autoInvest: "Auto-Invest",
    physicalDelivery: "Physical Delivery",
    security: "Security Settings",
    advancedSecurity: "Advanced Security",
    priceAlerts: "Price Alerts",
    
    // Profile Page
    profileTitle: "Profile",
    accountSettings: "Account Settings",
    personalInfo: "Personal Information",
    securitySettings: "Security Settings",
    notifications: "Notifications",
    preferences: "Preferences",
    email: "Email",
    phone: "Phone",
    country: "Country",
    timezone: "Timezone",
    twoFactorAuth: "Two-Factor Authentication",
    enabled: "Enabled",
    disabled: "Disabled",
    changePassword: "Change Password",
    emailNotifications: "Email Notifications",
    pushNotifications: "Push Notifications",
    priceAlertNotifications: "Price Alert Notifications",
    transactionNotifications: "Transaction Notifications",
    displayCurrency: "Display Currency",
    darkMode: "Dark Mode",
    lightMode: "Light Mode",
    referralProgram: "Referral Program",
    yourReferralCode: "Your Referral Code",
    copy: "Copy",
    share: "Share",
    totalReferrals: "Total Referrals",
    totalEarnings: "Total Earnings",
    exportData: "Export Data",
    deleteAccount: "Delete Account",
    logout2: "Log Out",
    
    // Common
    loading: "Loading...",
    error: "Error",
    success: "Success",
    cancel: "Cancel",
    confirm: "Confirm",
    save: "Save",
    edit: "Edit",
    delete: "Delete",
    close: "Close",
    back: "Back",
    next: "Next",
    submit: "Submit",
    amount: "Amount",
    balance: "Balance",
    fee: "Fee",
    total: "Total",
    min: "Min",
    max: "Max",
    available: "Available",
    estimated: "Estimated",
    
    // Metal names
    AUXG: "Gold",
    AUXS: "Silver",
    AUXPT: "Platinum",
    AUXPD: "Palladium",
    wrongNetworkDetected: "Wrong network detected. Please switch to {chain} to continue.",
    switchToChain: "Switch to {chain}",
  },
  
  de: {
    // Navigation
    markets: "Märkte",
    earn: "Verdienen",
    stakeNav: "Staken",
    wallet: "Brieftasche",
    profile: "Profil",
    connect: "Verbinden",
    disconnect: "Trennen",
    language: "Sprache",
    
    // Home/Markets Page
    auxiteMarkets: "Auxite Märkte",
    marketsDesc: "Handeln Sie digitale Token, die durch physische Metalle gedeckt sind. Echtzeitpreise und sofortige Transaktionen.",
    pricesTitle: "Aktuelle Preise",
    pricesDesc: "Live-Marktdaten",
    ecosystemDesc: "Alle Token im Auxite-Ökosystem basieren auf physischem Wert entsprechend dem Metalltyp, den sie repräsentieren; zugehörige Vermögenswerte werden in autorisierten und geprüften Lagerstätten weltweit aufbewahrt.",
    chooseWallet: "Wallet Wählen",
    chooseHowConnect: "Wählen Sie, wie Sie sich verbinden möchten",
    auxiteWallet: "Auxite Wallet",
    createOrImport: "Neue Wallet erstellen oder importieren",
    recommended: "Empfohlen",
    externalWallet: "Externe Wallet",
    connectMetamask: "MetaMask, WalletConnect, usw.",
    keysStayWithYou: "Ihre Schlüssel bleiben immer bei Ihnen. Non-custodial.",
    logout: "Abmelden",
    switchWallet: "Wallet Wechseln",
    
    // Earn Page
    earnTitle: "Verdienen",
    earnDesc: "Staken Sie Ihre Metalle und verdienen Sie Belohnungen",
    myLeases: "Meine Strukturierten Erträge",
    leaseDescription: "Melden Sie Ihr Gold für strukturierte Erträge an und verdienen Sie Zinsen.",
    connectWalletForLeasing: "Verbinden Sie Ihre Wallet, um strukturierte Ertragsvorgänge anzuzeigen und neue Teilnahmen zu starten.",
    stakingOverview: "Staking Übersicht",
    totalStaked: "Gesamt Gestaked",
    totalRewards: "Gesamt Belohnungen",
    avgApy: "Durchschnittlicher APY",
    stakingPools: "Staking Pools",
    flexibleStaking: "Flexibles Staking",
    noLockPeriod: "Keine Sperrfrist, jederzeit abheben",
    stake: "Staken",
    lockedStaking: "Gesperrtes Staking",
    lockFor30Days: "30 Tage sperren, höhere Rendite",
    higherReturns: "Höhere Rendite",
    yourPositions: "Ihre Positionen",
    noActivePositions: "Keine aktiven Positionen",
    startStaking: "Beginnen Sie mit dem Staking, um passives Einkommen zu verdienen",
    
    // Wallet Page
    myWallet: "Meine Brieftasche",
    walletDesc: "Anzeigen, übertragen und verwalten Sie Ihre Vermögenswerte.",
    addFunds: "Einzahlen",
    transfer: "Überweisen",
    quickBuy: "Schnellkauf",
    exchange: "Tauschen",
    withdraw: "Abheben",
    
    // Deposit Modal
    selectDeposit: "Einzahlungsmethode wählen",
    depositCrypto: "Krypto einzahlen",
    depositCryptoDesc: "BTC, ETH oder andere Coins einzahlen",
    depositUsd: "+ USD Einzahlen",
    depositUsdDesc: "Per Banküberweisung oder Karte",
    selectCoin: "Coin auswählen",
    totalAssetValue: "Gesamtvermögenswert (geschätzt)",
    auxiteAndCrypto: "Auxite und Krypto-Vermögen",
    lockedAssets: "Gesperrte Vermögenswerte",
    myAssets: "Meine Auxite und Krypto-Vermögen",
    gold: "Gold",
    silver: "Silber",
    platinum: "Platin",
    palladium: "Palladium",
    walletRequired: "Wallet-Verbindung erforderlich",
    connectToView: "Verbinden Sie Ihre Wallet, um Ihre Vermögenswerte anzuzeigen und zu verwalten",
    buyWithUsd: "Mit USD Kaufen",
    actions: "Aktionen",
    autoInvest: "Auto-Invest",
    physicalDelivery: "Physische Lieferung",
    security: "Sicherheitseinstellungen",
    advancedSecurity: "Erweiterte Sicherheit",
    priceAlerts: "Preisalarme",
    
    // Profile Page
    profileTitle: "Profil",
    accountSettings: "Kontoeinstellungen",
    personalInfo: "Persönliche Informationen",
    securitySettings: "Sicherheitseinstellungen",
    notifications: "Benachrichtigungen",
    preferences: "Einstellungen",
    email: "E-Mail",
    phone: "Telefon",
    country: "Land",
    timezone: "Zeitzone",
    twoFactorAuth: "Zwei-Faktor-Authentifizierung",
    enabled: "Aktiviert",
    disabled: "Deaktiviert",
    changePassword: "Passwort Ändern",
    emailNotifications: "E-Mail-Benachrichtigungen",
    pushNotifications: "Push-Benachrichtigungen",
    priceAlertNotifications: "Preisalarm-Benachrichtigungen",
    transactionNotifications: "Transaktionsbenachrichtigungen",
    displayCurrency: "Anzeigewährung",
    darkMode: "Dunkelmodus",
    lightMode: "Hellmodus",
    referralProgram: "Empfehlungsprogramm",
    yourReferralCode: "Ihr Empfehlungscode",
    copy: "Kopieren",
    share: "Teilen",
    totalReferrals: "Gesamt Empfehlungen",
    totalEarnings: "Gesamteinnahmen",
    exportData: "Daten Exportieren",
    deleteAccount: "Konto Löschen",
    logout2: "Abmelden",
    
    // Common
    loading: "Laden...",
    error: "Fehler",
    success: "Erfolg",
    cancel: "Abbrechen",
    confirm: "Bestätigen",
    save: "Speichern",
    edit: "Bearbeiten",
    delete: "Löschen",
    close: "Schließen",
    back: "Zurück",
    next: "Weiter",
    submit: "Absenden",
    amount: "Betrag",
    balance: "Guthaben",
    fee: "Gebühr",
    total: "Gesamt",
    min: "Min",
    max: "Max",
    available: "Verfügbar",
    estimated: "Geschätzt",
    
    // Metal names
    AUXG: "Gold",
    AUXS: "Silber",
    AUXPT: "Platin",
    AUXPD: "Palladium",
    wrongNetworkDetected: "Falsches Netzwerk. Bitte wechsle zu {chain}, um fortzufahren.",
    switchToChain: "Zu {chain} wechseln",

  },
  
  fr: {
    // Navigation
    markets: "Marchés",
    earn: "Gagner",
    stakeNav: "Staking",
    wallet: "Portefeuille",
    profile: "Profil",
    connect: "Connecter",
    disconnect: "Déconnecter",
    language: "Langue",
    
    // Home/Markets Page
    auxiteMarkets: "Marchés Auxite",
    marketsDesc: "Échangez des jetons numériques adossés à des métaux physiques. Prix en temps réel et transactions instantanées.",
    pricesTitle: "Prix Actuels",
    pricesDesc: "Données de marché en direct",
    ecosystemDesc: "Tous les tokens de l'écosystème Auxite sont structurés sur une valeur physique correspondant au type de métal qu'ils représentent ; les actifs associés sont stockés dans des installations de stockage autorisées et auditées dans le monde entier.",
    chooseWallet: "Choisir le Portefeuille",
    chooseHowConnect: "Choisissez comment vous voulez vous connecter",
    auxiteWallet: "Portefeuille Auxite",
    createOrImport: "Créer un nouveau portefeuille ou importer",
    recommended: "Recommandé",
    externalWallet: "Portefeuille Externe",
    connectMetamask: "MetaMask, WalletConnect, etc.",
    keysStayWithYou: "Vos clés restent toujours avec vous. Non-custodial.",
    logout: "Déconnexion",
    switchWallet: "Changer de Portefeuille",
    
    // Earn Page
    earnTitle: "Gagner",
    earnDesc: "Stakez vos métaux et gagnez des récompenses",
    myLeases: "Mes Rendements Structurés",
    leaseDescription: "Inscrivez votre or au rendement structuré et gagnez des intérêts.",
    connectWalletForLeasing: "Connectez votre portefeuille pour voir les opérations de rendement structuré et démarrer de nouvelles participations.",
    stakingOverview: "Aperçu du Staking",
    totalStaked: "Total Staké",
    totalRewards: "Total des Récompenses",
    avgApy: "APY Moyen",
    stakingPools: "Pools de Staking",
    flexibleStaking: "Staking Flexible",
    noLockPeriod: "Pas de période de blocage, retirez à tout moment",
    stake: "Staker",
    lockedStaking: "Staking Verrouillé",
    lockFor30Days: "Bloquez pendant 30 jours, rendements plus élevés",
    higherReturns: "Rendements Plus Élevés",
    yourPositions: "Vos Positions",
    noActivePositions: "Aucune position active",
    startStaking: "Commencez le staking pour gagner un revenu passif",
    
    // Wallet Page
    myWallet: "Mon Portefeuille",
    walletDesc: "Visualisez, transférez et gérez vos actifs.",
    addFunds: "Déposer",
    transfer: "Transférer",
    quickBuy: "Achat Rapide",
    exchange: "Échanger",
    withdraw: "Retirer",
    
    // Deposit Modal
    selectDeposit: "Sélectionner Méthode de Dépôt",
    depositCrypto: "Déposer Crypto",
    depositCryptoDesc: "Déposer BTC, ETH ou autres coins",
    depositUsd: "+ Déposer USD",
    depositUsdDesc: "Par virement bancaire ou carte",
    selectCoin: "Sélectionner Coin",
    totalAssetValue: "Valeur Totale des Actifs (est.)",
    auxiteAndCrypto: "Actifs Auxite et Crypto",
    lockedAssets: "Actifs Verrouillés",
    myAssets: "Mes Actifs Auxite et Crypto",
    gold: "Or",
    silver: "Argent",
    platinum: "Platine",
    palladium: "Palladium",
    walletRequired: "Connexion au Portefeuille Requise",
    connectToView: "Connectez votre portefeuille pour voir et gérer vos actifs",
    buyWithUsd: "Acheter avec USD",
    actions: "Actions",
    autoInvest: "Auto-Investissement",
    physicalDelivery: "Livraison Physique",
    security: "Paramètres de Sécurité",
    advancedSecurity: "Sécurité Avancée",
    priceAlerts: "Alertes de Prix",
    
    // Profile Page
    profileTitle: "Profil",
    accountSettings: "Paramètres du Compte",
    personalInfo: "Informations Personnelles",
    securitySettings: "Paramètres de Sécurité",
    notifications: "Notifications",
    preferences: "Préférences",
    email: "E-mail",
    phone: "Téléphone",
    country: "Pays",
    timezone: "Fuseau Horaire",
    twoFactorAuth: "Authentification à Deux Facteurs",
    enabled: "Activé",
    disabled: "Désactivé",
    changePassword: "Changer le Mot de Passe",
    emailNotifications: "Notifications par E-mail",
    pushNotifications: "Notifications Push",
    priceAlertNotifications: "Notifications d'Alertes de Prix",
    transactionNotifications: "Notifications de Transactions",
    displayCurrency: "Devise d'Affichage",
    darkMode: "Mode Sombre",
    lightMode: "Mode Clair",
    referralProgram: "Programme de Parrainage",
    yourReferralCode: "Votre Code de Parrainage",
    copy: "Copier",
    share: "Partager",
    totalReferrals: "Total des Parrainages",
    totalEarnings: "Gains Totaux",
    exportData: "Exporter les Données",
    deleteAccount: "Supprimer le Compte",
    logout2: "Déconnexion",
    
    // Common
    loading: "Chargement...",
    error: "Erreur",
    success: "Succès",
    cancel: "Annuler",
    confirm: "Confirmer",
    save: "Sauvegarder",
    edit: "Modifier",
    delete: "Supprimer",
    close: "Fermer",
    back: "Retour",
    next: "Suivant",
    submit: "Soumettre",
    amount: "Montant",
    balance: "Solde",
    fee: "Frais",
    total: "Total",
    min: "Min",
    max: "Max",
    available: "Disponible",
    estimated: "Estimé",
    
    // Metal names
    AUXG: "Or",
    AUXS: "Argent",
    AUXPT: "Platine",
    AUXPD: "Palladium",
    wrongNetworkDetected: "Mauvais réseau. Veuillez passer sur {chain} pour continuer.",
    switchToChain: "Passer sur {chain}",

  },
  
  ar: {
    // Navigation
    markets: "الأسواق",
    earn: "اكسب",
    stakeNav: "التخزين",
    wallet: "المحفظة",
    profile: "الملف",
    connect: "اتصال",
    disconnect: "قطع",
    language: "اللغة",
    
    // Home/Markets Page
    auxiteMarkets: "أسواق أوكسايت",
    marketsDesc: "تداول الرموز الرقمية المدعومة بالمعادن الفيزيائية. أسعار في الوقت الحقيقي ومعاملات فورية.",
    pricesTitle: "الأسعار الحالية",
    pricesDesc: "بيانات السوق المباشرة",
    ecosystemDesc: "جميع الرموز في نظام Auxite مبنية على قيمة فعلية تتوافق مع نوع المعدن الذي تمثله؛ يتم تخزين الأصول ذات الصلة في مرافق تخزين مرخصة ومدققة في جميع أنحاء العالم.",
    chooseWallet: "اختر المحفظة",
    chooseHowConnect: "اختر كيف تريد الاتصال",
    auxiteWallet: "محفظة أوكسايت",
    createOrImport: "إنشاء محفظة جديدة أو استيراد",
    recommended: "موصى به",
    externalWallet: "محفظة خارجية",
    connectMetamask: "ميتاماسك، واليت كونيكت، إلخ.",
    keysStayWithYou: "مفاتيحك تبقى معك دائماً. غير حفظي.",
    logout: "تسجيل الخروج",
    switchWallet: "تبديل المحفظة",
    
    // Earn Page
    earnTitle: "اكسب",
    earnDesc: "ضع معادنك في الستيكنج واكسب مكافآت",
    myLeases: "العوائد المهيكلة الخاصة بي",
    leaseDescription: "سجّل ذهبك في برنامج العائد المهيكل واكسب فوائد.",
    connectWalletForLeasing: "قم بتوصيل محفظتك لعرض عمليات العائد المهيكل وبدء مشاركات جديدة.",
    stakingOverview: "نظرة عامة على الستيكنج",
    totalStaked: "إجمالي المراهنة",
    totalRewards: "إجمالي المكافآت",
    avgApy: "متوسط العائد السنوي",
    stakingPools: "مجمعات الستيكنج",
    flexibleStaking: "ستيكنج مرن",
    noLockPeriod: "لا فترة قفل، اسحب في أي وقت",
    stake: "ستيكنج",
    lockedStaking: "ستيكنج مقفل",
    lockFor30Days: "اقفل لمدة 30 يوماً، عوائد أعلى",
    higherReturns: "عوائد أعلى",
    yourPositions: "مراكزك",
    noActivePositions: "لا توجد مراكز نشطة",
    startStaking: "ابدأ الستيكنج لكسب دخل سلبي",
    
    // Wallet Page
    myWallet: "محفظتي",
    walletDesc: "عرض، نقل وإدارة أصولك.",
    addFunds: "إيداع",
    transfer: "تحويل",
    quickBuy: "شراء سريع",
    exchange: "تبادل",
    withdraw: "سحب",
    
    // Deposit Modal
    selectDeposit: "اختر طريقة الإيداع",
    depositCrypto: "إيداع العملات المشفرة",
    depositCryptoDesc: "إيداع BTC أو ETH أو عملات أخرى",
    depositUsd: "+ إيداع دولار",
    depositUsdDesc: "عبر التحويل البنكي أو البطاقة",
    selectCoin: "اختر العملة",
    totalAssetValue: "إجمالي قيمة الأصول (تقديري)",
    auxiteAndCrypto: "أصول أوكسايت والعملات المشفرة",
    lockedAssets: "الأصول المقفلة",
    myAssets: "أصولي من أوكسايت والعملات المشفرة",
    gold: "ذهب",
    silver: "فضة",
    platinum: "بلاتين",
    palladium: "بالاديوم",
    walletRequired: "يجب اتصال المحفظة",
    connectToView: "اربط محفظتك لعرض وإدارة أصولك",
    buyWithUsd: "شراء بالدولار",
    actions: "الإجراءات",
    autoInvest: "استثمار تلقائي",
    physicalDelivery: "التسليم الفعلي",
    security: "إعدادات الأمان",
    advancedSecurity: "أمان متقدم",
    priceAlerts: "تنبيهات الأسعار",
    
    // Profile Page
    profileTitle: "الملف الشخصي",
    accountSettings: "إعدادات الحساب",
    personalInfo: "المعلومات الشخصية",
    securitySettings: "إعدادات الأمان",
    notifications: "الإشعارات",
    preferences: "التفضيلات",
    email: "البريد الإلكتروني",
    phone: "الهاتف",
    country: "الدولة",
    timezone: "المنطقة الزمنية",
    twoFactorAuth: "المصادقة الثنائية",
    enabled: "مفعّل",
    disabled: "معطّل",
    changePassword: "تغيير كلمة المرور",
    emailNotifications: "إشعارات البريد",
    pushNotifications: "إشعارات الدفع",
    priceAlertNotifications: "إشعارات تنبيه الأسعار",
    transactionNotifications: "إشعارات المعاملات",
    displayCurrency: "عملة العرض",
    darkMode: "الوضع الداكن",
    lightMode: "الوضع الفاتح",
    referralProgram: "برنامج الإحالة",
    yourReferralCode: "رمز الإحالة الخاص بك",
    copy: "نسخ",
    share: "مشاركة",
    totalReferrals: "إجمالي الإحالات",
    totalEarnings: "إجمالي الأرباح",
    exportData: "تصدير البيانات",
    deleteAccount: "حذف الحساب",
    logout2: "تسجيل الخروج",
    
    // Common
    loading: "جاري التحميل...",
    error: "خطأ",
    success: "نجاح",
    cancel: "إلغاء",
    confirm: "تأكيد",
    save: "حفظ",
    edit: "تعديل",
    delete: "حذف",
    close: "إغلاق",
    back: "رجوع",
    next: "التالي",
    submit: "إرسال",
    amount: "المبلغ",
    balance: "الرصيد",
    fee: "الرسوم",
    total: "الإجمالي",
    min: "الحد الأدنى",
    max: "الحد الأقصى",
    available: "متاح",
    estimated: "تقديري",
    
    // Metal names
    AUXG: "ذهب",
    AUXS: "فضة",
    AUXPT: "بلاتين",
    AUXPD: "بالاديوم",
    wrongNetworkDetected: "شبكة غير صحيحة. يرجى التبديل إلى {chain} للمتابعة.",
    switchToChain: "التبديل إلى {chain}",

  },
  
  ru: {
    // Navigation
    markets: "Рынки",
    earn: "Заработок",
    stakeNav: "Стейкинг",
    wallet: "Кошелек",
    profile: "Профиль",
    connect: "Подключить",
    disconnect: "Отключить",
    language: "Язык",
    
    // Home/Markets Page
    auxiteMarkets: "Рынки Auxite",
    marketsDesc: "Торгуйте цифровыми токенами, обеспеченными физическими металлами. Цены в реальном времени и мгновенные транзакции.",
    pricesTitle: "Текущие Цены",
    pricesDesc: "Данные рынка в реальном времени",
    ecosystemDesc: "Все токены в экосистеме Auxite структурированы на физической стоимости, соответствующей типу металла, который они представляют; связанные активы хранятся в авторизованных и аудированных хранилищах по всему миру.",
    chooseWallet: "Выберите Кошелек",
    chooseHowConnect: "Выберите способ подключения",
    auxiteWallet: "Кошелек Auxite",
    createOrImport: "Создать новый кошелек или импортировать",
    recommended: "Рекомендуется",
    externalWallet: "Внешний Кошелек",
    connectMetamask: "MetaMask, WalletConnect и т.д.",
    keysStayWithYou: "Ваши ключи всегда остаются у вас. Non-custodial.",
    logout: "Выйти",
    switchWallet: "Сменить Кошелек",
    
    // Earn Page
    earnTitle: "Заработок",
    earnDesc: "Стейкайте металлы и зарабатывайте награды",
    myLeases: "Мои Структурированные Доходы",
    leaseDescription: "Зарегистрируйте своё золото в программе структурированного дохода и зарабатывайте проценты.",
    connectWalletForLeasing: "Подключите кошелек для просмотра операций структурированного дохода и начала новых участий.",
    stakingOverview: "Обзор Стейкинга",
    totalStaked: "Всего в Стейкинге",
    totalRewards: "Всего Наград",
    avgApy: "Средний APY",
    stakingPools: "Пулы Стейкинга",
    flexibleStaking: "Гибкий Стейкинг",
    noLockPeriod: "Без периода блокировки, выводите в любое время",
    stake: "Стейкать",
    lockedStaking: "Заблокированный Стейкинг",
    lockFor30Days: "Блокировка на 30 дней, более высокая доходность",
    higherReturns: "Более Высокая Доходность",
    yourPositions: "Ваши Позиции",
    noActivePositions: "Нет активных позиций",
    startStaking: "Начните стейкинг для получения пассивного дохода",
    
    // Wallet Page
    myWallet: "Мой Кошелек",
    walletDesc: "Просматривайте, переводите и управляйте активами.",
    addFunds: "Пополнить",
    transfer: "Перевести",
    quickBuy: "Быстрая Покупка",
    exchange: "Обмен",
    withdraw: "Вывести",
    
    // Deposit Modal
    selectDeposit: "Выберите Способ Пополнения",
    depositCrypto: "Внести Криптовалюту",
    depositCryptoDesc: "Внести BTC, ETH или другие монеты",
    depositUsd: "+ Внести USD",
    depositUsdDesc: "Банковским переводом или картой",
    selectCoin: "Выберите Монету",
    totalAssetValue: "Общая Стоимость Активов (оценка)",
    auxiteAndCrypto: "Активы Auxite и Крипто",
    lockedAssets: "Заблокированные Активы",
    myAssets: "Мои Активы Auxite и Крипто",
    gold: "Золото",
    silver: "Серебро",
    platinum: "Платина",
    palladium: "Палладий",
    walletRequired: "Требуется Подключение Кошелька",
    connectToView: "Подключите кошелек для просмотра и управления активами",
    buyWithUsd: "Купить за USD",
    actions: "Действия",
    autoInvest: "Авто-Инвест",
    physicalDelivery: "Физическая Доставка",
    security: "Настройки Безопасности",
    advancedSecurity: "Расширенная Безопасность",
    priceAlerts: "Ценовые Оповещения",
    
    // Profile Page
    profileTitle: "Профиль",
    accountSettings: "Настройки Аккаунта",
    personalInfo: "Личная Информация",
    securitySettings: "Настройки Безопасности",
    notifications: "Уведомления",
    preferences: "Предпочтения",
    email: "Email",
    phone: "Телефон",
    country: "Страна",
    timezone: "Часовой Пояс",
    twoFactorAuth: "Двухфакторная Аутентификация",
    enabled: "Включено",
    disabled: "Отключено",
    changePassword: "Изменить Пароль",
    emailNotifications: "Email Уведомления",
    pushNotifications: "Push Уведомления",
    priceAlertNotifications: "Уведомления о Ценах",
    transactionNotifications: "Уведомления о Транзакциях",
    displayCurrency: "Валюта Отображения",
    darkMode: "Темный Режим",
    lightMode: "Светлый Режим",
    referralProgram: "Реферальная Программа",
    yourReferralCode: "Ваш Реферальный Код",
    copy: "Копировать",
    share: "Поделиться",
    totalReferrals: "Всего Рефералов",
    totalEarnings: "Всего Заработано",
    exportData: "Экспорт Данных",
    deleteAccount: "Удалить Аккаунт",
    logout2: "Выйти",
    
    // Common
    loading: "Загрузка...",
    error: "Ошибка",
    success: "Успех",
    cancel: "Отмена",
    confirm: "Подтвердить",
    save: "Сохранить",
    edit: "Редактировать",
    delete: "Удалить",
    close: "Закрыть",
    back: "Назад",
    next: "Далее",
    submit: "Отправить",
    amount: "Сумма",
    balance: "Баланс",
    fee: "Комиссия",
    total: "Итого",
    min: "Мин",
    max: "Макс",
    available: "Доступно",
    estimated: "Примерно",
    
    // Metal names
    AUXG: "Золото",
    AUXS: "Серебро",
    AUXPT: "Платина",
    AUXPD: "Палладий",
    wrongNetworkDetected: "Неверная сеть. Переключитесь на {chain}, чтобы продолжить.",
    switchToChain: "Переключиться на {chain}",

  },
};

// ============================================
// CONTEXT
// ============================================
interface LanguageContextType {
  lang: LanguageCode;
  setLang: (lang: LanguageCode) => void;
  t: (key: string) => string;
  isRTL: boolean;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [lang, setLangState] = useState<LanguageCode>("tr");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const savedLang = localStorage.getItem("auxite_language") as LanguageCode;
    if (savedLang && LANGUAGES.some(l => l.code === savedLang)) {
      setLangState(savedLang);
      // Set RTL for Arabic
      document.documentElement.dir = savedLang === "ar" ? "rtl" : "ltr";
    }
    setMounted(true);
  }, []);

  const setLang = (newLang: LanguageCode) => {
    setLangState(newLang);
    localStorage.setItem("auxite_language", newLang);
    window.dispatchEvent(new Event("languageChange"));
    // Set RTL for Arabic
    document.documentElement.dir = newLang === "ar" ? "rtl" : "ltr";

    // Sync language preference to backend (for emails, certificates, notifications)
    const token = localStorage.getItem("authToken");
    if (token) {
      fetch("/api/user/language", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ language: newLang }),
      }).catch(() => {
        // Silent fail — localStorage is primary, Redis is for backend services
      });
    }
  };

  const t = (key: string): string => {
    return translations[lang]?.[key] || translations.en[key] || key;
  };

  const isRTL = lang === "ar";

  // Public marketing pages must be server-rendered for SEO, so render them
  // immediately with the default language (client swaps to the saved language
  // after mount). Authenticated paths keep the original mount gate.
  if (!mounted && !isPublicMarketingPath(pathname)) {
    return null;
  }

  return (
    <LanguageContext.Provider value={{ lang, setLang, t, isRTL }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used within LanguageProvider");
  }
  return context;
}

// Helper to get language data
export function getLanguageData(code: LanguageCode) {
  return LANGUAGES.find(l => l.code === code) || LANGUAGES[0];
}
