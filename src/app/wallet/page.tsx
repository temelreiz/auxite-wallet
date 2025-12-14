"use client";

import { useState, useEffect, useRef } from "react";
import { useAccount } from "wagmi";
import { ConnectKitButton } from "connectkit";
import Link from "next/link";
import Image from "next/image";
import { AllocationFinder } from "@/components/AllocationFinder";
import { TransactionHistory } from "@/components/TransactionHistory";
import { ExchangeModal } from "@/components/ExchangeModal";
import { BuyMetalModal } from "@/components/BuyMetalModal";
import { DepositAddressModal } from "@/components/DepositAddressModal";
import { PriceAlertsPanel } from "@/components/PriceAlertsPanel";
import { CryptoConvertModal } from "@/components/CryptoConvertModal";
import { MetalConvertModal } from "@/components/MetalConvertModal";
import { WithdrawModal } from "@/components/WithdrawModal";
import { UsdDepositModal } from "@/components/UsdDepositModal";
import { BuyWithUsdModal } from "@/components/BuyWithUsdModal";
import { UsdConvertModal } from "@/components/UsdConvertModal";
import { SecuritySettings } from "@/components/Security/SecuritySettings";
import { AdvancedSecurityModal } from "@/components/Security/AdvancedSecurityModal";
import { PriceAlertManager } from "@/components/PriceAlertManager";
import { RecurringBuyManager } from "@/components/RecurringBuyManager";
import { PhysicalDelivery } from "@/components/PhysicalDelivery";
import { LimitOrdersList } from "@/components/LimitOrdersList";
import { LockedAssetsModal } from "@/components/LockedAssetsModal";
import { useAllocations } from "@/hooks/useAllocations";
import { useStaking } from "@/hooks/useStaking";
import { useCryptoPrices } from "@/hooks/useCryptoPrices";
import { useMetalsPrices } from "@/hooks/useMetalsPrices";
import { useLanguage, LANGUAGES, getLanguageData, type LanguageCode } from "@/components/LanguageContext";

import { useWallet } from "@/components/WalletContext";

// ============================================
// LOCAL TRANSLATIONS - 6 Language Support
// ============================================
const walletTranslations: Record<string, Record<string, string>> = {
  tr: {
    myAssets: "Auxite ve Crypto Varlıklarım",
    lockedAssets: "Kilitli Varlıklar",
    totalLocked: "Toplam Kilitli",
    estValue: "Tahmini Değer",
    estimatedTotalValue: "Tahmini Toplam Değer",
    auxmBalance: "AUXM Bakiyesi",
    bonus: "Bonus",
    gold: "Altın",
    silver: "Gümüş",
    platinum: "Platin",
    palladium: "Paladyum",
    ecosystemDesc: "Auxite ekosistemindeki tüm tokenlar, temsil ettikleri metal türüne karşılık gelen fiziksel değer üzerine yapılandırılmıştır; ilgili varlıklar, dünya genelindeki yetkili ve denetimli depolama tesisleri üzerinden muhafaza edilir.",
    walletRequired: "Cüzdan Bağlantısı Gerekli",
    connectWallet: "Varlıklarınızı görüntülemek ve işlem yapmak için cüzdanınızı bağlayın.",
    selectDeposit: "Yatırma Yöntemi Seçin",
    depositCrypto: "Kripto Yatır",
    depositCryptoDesc: "BTC, ETH veya diğer desteklenen coinleri yatırın",
    depositUsd: "+ USD Yatır",
    depositUsdDesc: "Banka transferi veya kart ile USD yatırın",
    selectCoin: "Yatırılacak Coin Seç",
    transfer: "Gönder",
    token: "Token",
    recipientAddress: "Alıcı Adresi",
    amount: "Miktar",
    balance: "Bakiye",
    networkFee: "Ağ Ücreti",
    send: "Gönder",
    receive: "Al",
    walletAddress: "Cüzdan Adresi",
    copy: "Kopyala",
    share: "Paylaş",
    close: "Kapat",
    securitySettings: "Güvenlik Ayarları",
    markets: "Piyasalar",
    stake: "Biriktir",
    wallet: "Cüzdan",
    profile: "Profil",
    language: "Dil Seçimi",
    lightMode: "Aydınlık Mod",
    darkMode: "Karanlık Mod",
    priceAlerts: "Fiyat Uyarıları",
    recurringBuy: "Düzenli Yatırım",
    pendingOrders: "Bekleyen Emirler",
    buyWithUsd: "USD ile Al",
  },
  en: {
    myAssets: "My Auxite and Crypto Assets",
    lockedAssets: "Locked Assets",
    totalLocked: "Total Locked",
    estValue: "Est. Value",
    estimatedTotalValue: "Estimated Total Value",
    auxmBalance: "AUXM Balance",
    bonus: "Bonus",
    gold: "Gold",
    silver: "Silver",
    platinum: "Platinum",
    palladium: "Palladium",
    ecosystemDesc: "All tokens in the Auxite ecosystem are structured on physical value corresponding to the metal type they represent; related assets are stored through authorized and audited storage facilities worldwide.",
    walletRequired: "Wallet Connection Required",
    connectWallet: "Connect your wallet to view your assets and make transactions.",
    selectDeposit: "Select Deposit Method",
    depositCrypto: "Deposit Crypto",
    depositCryptoDesc: "Deposit BTC, ETH or other supported coins",
    depositUsd: "+ Deposit USD",
    depositUsdDesc: "Deposit USD via bank transfer or card",
    selectCoin: "Select Coin to Deposit",
    transfer: "Transfer",
    token: "Token",
    recipientAddress: "Recipient Address",
    amount: "Amount",
    balance: "Balance",
    networkFee: "Network Fee",
    send: "Send",
    receive: "Receive",
    walletAddress: "Wallet Address",
    copy: "Copy",
    share: "Share",
    close: "Close",
    securitySettings: "Security Settings",
    markets: "Markets",
    stake: "Stake",
    wallet: "Wallet",
    profile: "Profile",
    language: "Language",
    lightMode: "Light Mode",
    darkMode: "Dark Mode",
    priceAlerts: "Price Alerts",
    recurringBuy: "Auto-Invest",
    pendingOrders: "Pending Orders",
    buyWithUsd: "Buy with USD",
  },
  de: {
    myAssets: "Meine Auxite und Crypto Vermögenswerte",
    lockedAssets: "Gesperrte Vermögenswerte",
    totalLocked: "Gesamt Gesperrt",
    estValue: "Gesch. Wert",
    estimatedTotalValue: "Geschätzter Gesamtwert",
    auxmBalance: "AUXM Guthaben",
    bonus: "Bonus",
    gold: "Gold",
    silver: "Silber",
    platinum: "Platin",
    palladium: "Palladium",
    ecosystemDesc: "Alle Token im Auxite-Ökosystem basieren auf physischem Wert entsprechend dem Metalltyp, den sie repräsentieren; zugehörige Vermögenswerte werden in autorisierten und geprüften Lagerstätten weltweit aufbewahrt.",
    walletRequired: "Wallet-Verbindung erforderlich",
    connectWallet: "Verbinden Sie Ihre Wallet, um Ihre Vermögenswerte zu sehen und Transaktionen durchzuführen.",
    selectDeposit: "Einzahlungsmethode wählen",
    depositCrypto: "Krypto einzahlen",
    depositCryptoDesc: "BTC, ETH oder andere unterstützte Coins einzahlen",
    depositUsd: "+ USD einzahlen",
    depositUsdDesc: "USD per Banküberweisung oder Karte einzahlen",
    selectCoin: "Coin zum Einzahlen wählen",
    transfer: "Überweisung",
    token: "Token",
    recipientAddress: "Empfängeradresse",
    amount: "Betrag",
    balance: "Guthaben",
    networkFee: "Netzwerkgebühr",
    send: "Senden",
    receive: "Empfangen",
    walletAddress: "Wallet-Adresse",
    copy: "Kopieren",
    share: "Teilen",
    close: "Schließen",
    securitySettings: "Sicherheitseinstellungen",
    markets: "Märkte",
    stake: "Staken",
    wallet: "Wallet",
    profile: "Profil",
    language: "Sprache",
    lightMode: "Heller Modus",
    darkMode: "Dunkler Modus",
    priceAlerts: "Preisalarme",
    recurringBuy: "Automatisches Investieren",
    pendingOrders: "Offene Aufträge",
    buyWithUsd: "Mit USD kaufen",
  },
  fr: {
    myAssets: "Mes Actifs Auxite et Crypto",
    lockedAssets: "Actifs Verrouillés",
    totalLocked: "Total Verrouillé",
    estValue: "Valeur Est.",
    estimatedTotalValue: "Valeur Totale Estimée",
    auxmBalance: "Solde AUXM",
    bonus: "Bonus",
    gold: "Or",
    silver: "Argent",
    platinum: "Platine",
    palladium: "Palladium",
    ecosystemDesc: "Tous les tokens de l'écosystème Auxite sont structurés sur une valeur physique correspondant au type de métal qu'ils représentent ; les actifs associés sont stockés dans des installations de stockage autorisées et auditées dans le monde entier.",
    walletRequired: "Connexion Wallet Requise",
    connectWallet: "Connectez votre portefeuille pour voir vos actifs et effectuer des transactions.",
    selectDeposit: "Sélectionner la méthode de dépôt",
    depositCrypto: "Déposer Crypto",
    depositCryptoDesc: "Déposer BTC, ETH ou d'autres cryptos supportées",
    depositUsd: "+ Déposer USD",
    depositUsdDesc: "Déposer USD par virement bancaire ou carte",
    selectCoin: "Sélectionner la crypto à déposer",
    transfer: "Transfert",
    token: "Token",
    recipientAddress: "Adresse du destinataire",
    amount: "Montant",
    balance: "Solde",
    networkFee: "Frais de réseau",
    send: "Envoyer",
    receive: "Recevoir",
    walletAddress: "Adresse du portefeuille",
    copy: "Copier",
    share: "Partager",
    close: "Fermer",
    securitySettings: "Paramètres de sécurité",
    markets: "Marchés",
    stake: "Staker",
    wallet: "Portefeuille",
    profile: "Profil",
    language: "Langue",
    lightMode: "Mode Clair",
    darkMode: "Mode Sombre",
    priceAlerts: "Alertes de Prix",
    recurringBuy: "Investissement Auto",
    pendingOrders: "Ordres en Attente",
    buyWithUsd: "Acheter avec USD",
  },
  ar: {
    myAssets: "أصولي من Auxite والعملات المشفرة",
    lockedAssets: "الأصول المقفلة",
    totalLocked: "إجمالي المقفل",
    estValue: "القيمة التقديرية",
    estimatedTotalValue: "إجمالي القيمة المقدرة",
    auxmBalance: "رصيد AUXM",
    bonus: "مكافأة",
    gold: "ذهب",
    silver: "فضة",
    platinum: "بلاتين",
    palladium: "بلاديوم",
    ecosystemDesc: "جميع الرموز في نظام Auxite مبنية على قيمة فعلية تتوافق مع نوع المعدن الذي تمثله؛ يتم تخزين الأصول ذات الصلة في مرافق تخزين مرخصة ومدققة في جميع أنحاء العالم.",
    walletRequired: "اتصال المحفظة مطلوب",
    connectWallet: "قم بتوصيل محفظتك لعرض أصولك وإجراء المعاملات.",
    selectDeposit: "اختر طريقة الإيداع",
    depositCrypto: "إيداع العملات المشفرة",
    depositCryptoDesc: "إيداع BTC أو ETH أو العملات المدعومة الأخرى",
    depositUsd: "+ إيداع USD",
    depositUsdDesc: "إيداع USD عبر التحويل البنكي أو البطاقة",
    selectCoin: "اختر العملة للإيداع",
    transfer: "تحويل",
    token: "رمز",
    recipientAddress: "عنوان المستلم",
    amount: "المبلغ",
    balance: "الرصيد",
    networkFee: "رسوم الشبكة",
    send: "إرسال",
    receive: "استلام",
    walletAddress: "عنوان المحفظة",
    copy: "نسخ",
    share: "مشاركة",
    close: "إغلاق",
    securitySettings: "إعدادات الأمان",
    markets: "الأسواق",
    stake: "تخزين",
    wallet: "المحفظة",
    profile: "الملف الشخصي",
    language: "اللغة",
    lightMode: "الوضع الفاتح",
    darkMode: "الوضع الداكن",
    priceAlerts: "تنبيهات الأسعار",
    recurringBuy: "الاستثمار التلقائي",
    pendingOrders: "الأوامر المعلقة",
    buyWithUsd: "شراء بـ USD",
  },
  ru: {
    myAssets: "Мои Auxite и Крипто Активы",
    lockedAssets: "Заблокированные Активы",
    totalLocked: "Всего Заблокировано",
    estValue: "Оц. Стоимость",
    estimatedTotalValue: "Оценочная общая стоимость",
    auxmBalance: "Баланс AUXM",
    bonus: "Бонус",
    gold: "Золото",
    silver: "Серебро",
    platinum: "Платина",
    palladium: "Палладий",
    ecosystemDesc: "Все токены в экосистеме Auxite структурированы на физической стоимости, соответствующей типу металла, который они представляют; связанные активы хранятся в авторизованных и аудированных хранилищах по всему миру.",
    walletRequired: "Требуется подключение кошелька",
    connectWallet: "Подключите кошелек для просмотра активов и совершения транзакций.",
    selectDeposit: "Выберите способ пополнения",
    depositCrypto: "Пополнить крипто",
    depositCryptoDesc: "Пополните BTC, ETH или другие поддерживаемые монеты",
    depositUsd: "+ Внести USD",
    depositUsdDesc: "Пополните USD банковским переводом или картой",
    selectCoin: "Выберите монету для пополнения",
    transfer: "Перевод",
    token: "Токен",
    recipientAddress: "Адрес получателя",
    amount: "Сумма",
    balance: "Баланс",
    networkFee: "Комиссия сети",
    send: "Отправить",
    receive: "Получить",
    walletAddress: "Адрес кошелька",
    copy: "Копировать",
    share: "Поделиться",
    close: "Закрыть",
    securitySettings: "Настройки безопасности",
    markets: "Рынки",
    stake: "Стейкинг",
    wallet: "Кошелек",
    profile: "Профиль",
    language: "Язык",
    lightMode: "Светлый режим",
    darkMode: "Темный режим",
    priceAlerts: "Ценовые оповещения",
    recurringBuy: "Авто-инвестирование",
    pendingOrders: "Ожидающие ордера",
    buyWithUsd: "Купить за USD",
  },
};

// Storage keys
const STORAGE_KEYS = {
  HAS_WALLET: "auxite_has_wallet",
  WALLET_ADDRESS: "auxite_wallet_address",
  WALLET_MODE: "auxite_wallet_mode",
  SESSION_UNLOCKED: "auxite_session_unlocked",
  LANGUAGE: "auxite_language",
};

export default function WalletPage() {
  const { lang, setLang, t } = useLanguage();
  const wx = walletTranslations[lang] || walletTranslations.en;
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [langDropdownOpen, setLangDropdownOpen] = useState(false);
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const langDropdownRef = useRef<HTMLDivElement>(null);
  
  // External wallet (wagmi)
  const { isConnected: isExternalConnected, address: externalAddress } = useAccount();
  

  // Bakiyeler - useWallet hook
  const { balances } = useWallet();
  const { allocations, totalGrams: allocationGrams, isLoading: allocLoading } = useAllocations();
  const { activeStakes, loading: stakingLoading } = useStaking();
  const auxmBalance = balances?.auxm ?? 0;
  const bonusAuxm = balances?.bonusAuxm ?? 0;
  const auxgBalance = balances?.auxg ?? 0;
  const auxsBalance = balances?.auxs ?? 0;
  const auxptBalance = balances?.auxpt ?? 0;
  const auxpdBalance = balances?.auxpd ?? 0;
  const ethBalance = balances?.eth ?? 0;
  const btcBalance = balances?.btc ?? 0;
  const xrpBalance = balances?.xrp ?? 0;
  const solBalance = balances?.sol ?? 0;
  const usdBalance = balances?.usd ?? 0;
  const usdtBalance = balances?.usdt ?? 0;

  // Local wallet state
  const [localWalletAddress, setLocalWalletAddress] = useState<string | null>(null);
  const [walletMode, setWalletMode] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSessionUnlocked, setIsSessionUnlocked] = useState(false);
  
  // Modal states
  const [showExchange, setShowExchange] = useState(false);
  const [showDeposit, setShowDeposit] = useState(false);
  const [showOnChainDeposit, setShowOnChainDeposit] = useState(false);
  const [showFiatDeposit, setShowFiatDeposit] = useState(false);
  const [showTransfer, setShowTransfer] = useState(false);
  const [showReceive, setShowReceive] = useState(false);
  const [showBuyMetal, setShowBuyMetal] = useState(false);
  const [showWithdraw, setShowWithdraw] = useState(false);
  const [depositSearchQuery, setDepositSearchQuery] = useState("");
  const [showUsdDeposit, setShowUsdDeposit] = useState(false);
  const [showBuyWithUsd, setShowBuyWithUsd] = useState(false);
  const [showUsdConvert, setShowUsdConvert] = useState(false);
  const [showSecurity, setShowSecurity] = useState(false);
  const [showAdvancedSecurity, setShowAdvancedSecurity] = useState(false);
  const [showPriceAlerts, setShowPriceAlerts] = useState(false);
  const [showRecurringBuy, setShowRecurringBuy] = useState(false);
  const [showPhysicalDelivery, setShowPhysicalDelivery] = useState(false);
  const [showActionsDropdown, setShowActionsDropdown] = useState(false);
  const [showPendingOrders, setShowPendingOrders] = useState(false);
  const [pendingOrdersCount, setPendingOrdersCount] = useState(0);
  const [showLockedAssets, setShowLockedAssets] = useState(false);
  
  // New modal states for portfolio clicks
  const [selectedMetal, setSelectedMetal] = useState<"AUXG" | "AUXS" | "AUXPT" | "AUXPD" | null>(null);
  const [selectedDepositCoin, setSelectedDepositCoin] = useState<string | null>(null);
  const [selectedCrypto, setSelectedCrypto] = useState<"ETH" | "BTC" | "XRP" | "SOL" | null>(null);
  
  // Get prices for modals
  const { prices: cryptoPrices } = useCryptoPrices();
  const { prices: metalAskPrices, bidPrices } = useMetalsPrices();
  
  // USDT/USD fiyatı
  const [usdtPrice, setUsdtPrice] = useState<number>(1);
  
  // USDT/USD fiyatını çek (Binance API - daha güvenilir)
  useEffect(() => {
    const fetchUsdtPrice = async () => {
      try {
        // Binance USDT/USDC pair - USDC is 1:1 with USD
        const res = await fetch(
          "https://api.binance.com/api/v3/ticker/price?symbol=USDCUSDT"
        );
        const data = await res.json();
        if (data?.price) {
          // USDC/USDT fiyatı = 1 USDC kaç USDT
          // USDT/USD için tersini al: 1 / price
          const usdtUsdPrice = 1 / parseFloat(data.price);
          setUsdtPrice(usdtUsdPrice);
          console.log("USDT/USD fiyatı:", usdtUsdPrice);
        }
      } catch (err) {
        console.error("USDT price fetch error:", err);
        // Fallback: CoinGecko dene
        try {
          const res2 = await fetch(
            "https://api.coingecko.com/api/v3/simple/price?ids=tether&vs_currencies=usd"
          );
          const data2 = await res2.json();
          if (data2?.tether?.usd) {
            setUsdtPrice(data2.tether.usd);
            console.log("USDT/USD (CoinGecko):", data2.tether.usd);
          }
        } catch {
          setUsdtPrice(1);
        }
      }
    };
    
    fetchUsdtPrice();
    const interval = setInterval(fetchUsdtPrice, 30000);
    return () => clearInterval(interval);
  }, []);

  // Toplam varlık değeri hesapla (USDT cinsinden)
  const totalEstimatedValue = 
    (auxgBalance * (metalAskPrices?.AUXG || 0)) +
    (auxsBalance * (metalAskPrices?.AUXS || 0)) +
    (auxptBalance * (metalAskPrices?.AUXPT || 0)) +
    (auxpdBalance * (metalAskPrices?.AUXPD || 0)) +
    (ethBalance * (cryptoPrices?.eth || 0)) +
    (btcBalance * (cryptoPrices?.btc || 0)) +
    (xrpBalance * (cryptoPrices?.xrp || 0)) +
    (solBalance * (cryptoPrices?.sol || 0)) +
    (balances?.usdt || 0) +
    (balances?.usd || 0);
  
  // USD cinsinden toplam değer (USDT * USDT/USD kuru)
  const totalEstimatedUsd = totalEstimatedValue * usdtPrice;

  // Deposit coins list
  const depositCoins = [
    { id: "BTC", name: "Bitcoin", icon: "₿", color: "#F7931A" },
    { id: "ETH", name: "Ethereum", icon: "Ξ", color: "#627EEA" },
    { id: "XRP", name: "Ripple", icon: "✕", color: "#23292F" },
    { id: "SOL", name: "Solana", icon: "◎", color: "#9945FF" },
  ];
  
  const filteredDepositCoins = depositCoins.filter(coin => 
    coin.id.toLowerCase().includes(depositSearchQuery.toLowerCase()) ||
    coin.name.toLowerCase().includes(depositSearchQuery.toLowerCase())
  );

  // Check wallet state on mount
  useEffect(() => {
    const savedMode = localStorage.getItem(STORAGE_KEYS.WALLET_MODE);
    const hasLocalWallet = localStorage.getItem(STORAGE_KEYS.HAS_WALLET);
    const localAddress = localStorage.getItem(STORAGE_KEYS.WALLET_ADDRESS);
    const sessionUnlocked = sessionStorage.getItem(STORAGE_KEYS.SESSION_UNLOCKED);

    setWalletMode(savedMode);
    
    if (savedMode === "local" && hasLocalWallet === "true" && localAddress) {
      setLocalWalletAddress(localAddress);
      if (sessionUnlocked === "true") {
        setIsSessionUnlocked(true);
      }
    }
    
    // Load theme
    const savedTheme = localStorage.getItem("auxite_theme") as "dark" | "light";
    if (savedTheme) {
      setTheme(savedTheme);
      applyTheme(savedTheme);
    }
    
    setIsLoading(false);
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (langDropdownRef.current && !langDropdownRef.current.contains(event.target as Node)) {
        setLangDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Theme functions
  const applyTheme = (newTheme: "dark" | "light") => {
    const root = document.documentElement;
    const body = document.body;
    if (newTheme === "dark") {
      root.classList.add("dark");
      root.classList.remove("light");
      body.classList.add("dark");
      body.classList.remove("light");
      body.style.backgroundColor = "#09090b";
      body.style.color = "#ffffff";
    } else {
      root.classList.add("light");
      root.classList.remove("dark");
      body.classList.add("light");
      body.classList.remove("dark");
      body.style.backgroundColor = "#f8fafc";
      body.style.color = "#0f172a";
    }
  };

  const toggleTheme = () => {
    const newTheme = theme === "dark" ? "light" : "dark";
    setTheme(newTheme);
    localStorage.setItem("auxite_theme", newTheme);
    applyTheme(newTheme);
  };

  const handleLanguageSelect = (code: LanguageCode) => {
    setLang(code);
    setLangDropdownOpen(false);
  };

  const currentLangData = getLanguageData(lang);

  // Determine if wallet is connected
  const isWalletConnected = 
    (walletMode === "local" && !!localWalletAddress && isSessionUnlocked) || 
    (walletMode === "external" && isExternalConnected);

  const currentAddress = 
    walletMode === "local" ? localWalletAddress : externalAddress;

  // Fetch pending orders count
  useEffect(() => {
    const fetchPendingOrders = async () => {
      if (!currentAddress) return;
      try {
        const res = await fetch(`/api/orders/limit?address=${currentAddress}&status=pending`);
        if (res.ok) {
          const data = await res.json();
          const activeOrders = data.orders || [];
          setPendingOrdersCount(activeOrders.length);
        }
      } catch (err) {
        console.error("Failed to fetch pending orders:", err);
      }
    };
    
    fetchPendingOrders();
    const interval = setInterval(fetchPendingOrders, 30000);
    return () => clearInterval(interval);
  }, [currentAddress]);

  // Current prices for alerts
  const currentPrices: Record<string, number> = {
    BTC: cryptoPrices?.btc || 0,
    ETH: cryptoPrices?.eth || 0,
    XRP: cryptoPrices?.xrp || 0,
    SOL: cryptoPrices?.sol || 0,
    AUXG: metalAskPrices?.AUXG || 0,
    AUXS: metalAskPrices?.AUXS || 0,
    AUXPT: metalAskPrices?.AUXPT || 0,
    AUXPD: metalAskPrices?.AUXPD || 0,
  };

  if (isLoading) {
    return (
      <main className="min-h-screen bg-stone-100 dark:bg-slate-950 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-slate-600 border-t-emerald-500 rounded-full"></div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-stone-100 dark:bg-slate-950 text-slate-900 dark:text-white">
      {/* Top Navigation */}
      <div className="border-b border-stone-200 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            {/* Left Side - Logo + Navigation */}
            <div className="flex items-center gap-5">
              {/* Logo */}
              {/* Hamburger Menu - Mobile */}
              <button
                className="sm:hidden p-2 rounded-lg hover:bg-stone-300 dark:hover:bg-slate-800"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              >
                <svg className="w-6 h-6 text-slate-600 dark:text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  {mobileMenuOpen ? (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  )}
                </svg>
              </button>
              <Link href="/">
                <Image
                  src="/auxite-wallet-logo.png"
                  alt="Auxite"
                  width={160}
                  height={40}
                  className="h-12 w-auto"
                />
              </Link>

              {/* Navigation - Sıra: Piyasalar, Earn, Cüzdan */}
              <div className="hidden sm:flex gap-2">
                <Link
                  href="/"
                  className="px-4 py-1.5 rounded-lg bg-stone-200 dark:bg-slate-800 hover:bg-stone-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-medium text-sm transition-colors"
                >
                  {t("markets")}
                </Link>
                <Link
                  href="/stake"
                  className="px-4 py-1.5 rounded-lg bg-stone-200 dark:bg-slate-800 hover:bg-stone-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-medium text-sm transition-colors"
                >
                  {wx.stake}
                </Link>
                <Link
                  href="/wallet"
                  className="px-4 py-1.5 rounded-lg bg-emerald-500 text-white font-medium text-sm"
                >
                  {t("wallet")}
                </Link>
                <Link
                  href="/profile"
                  className="px-4 py-1.5 rounded-lg bg-stone-200 dark:bg-slate-800 hover:bg-stone-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-medium text-sm transition-colors"
                >
                  {t("profile")}
                </Link>
              </div>
            </div>

           {/* Right Side - Theme + Actions + Language + Wallet */}
            <div className="flex items-center gap-3">
              {/* Theme Toggle */}
              <button
                onClick={toggleTheme}
                className="p-2 rounded-lg bg-stone-200 dark:bg-slate-800 hover:bg-stone-300 dark:hover:bg-slate-700 border border-stone-300 dark:border-slate-700 transition-all"
                title={theme === "dark" ? "Light Mode" : "Dark Mode"}
              >
                {theme === "dark" ? (
                  <svg className="w-5 h-5 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                  </svg>
                )}
              </button>

              {/* Actions Dropdown - BEFORE LANGUAGE */}
              <div className="relative">
                <button
                  onClick={() => setShowActionsDropdown(!showActionsDropdown)}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-stone-200 dark:bg-slate-800 hover:bg-stone-300 dark:hover:bg-slate-700 border border-stone-300 dark:border-slate-700 hover:border-slate-600 transition-all"
                >
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    {t("actions")}
                  </span>
                  <svg className={`w-4 h-4 text-slate-600 dark:text-slate-400 transition-transform ${showActionsDropdown ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {showActionsDropdown && (
                  <div className="absolute right-0 mt-2 w-56 bg-stone-200 dark:bg-slate-800 border border-stone-300 dark:border-slate-700 rounded-xl shadow-xl z-50 overflow-hidden">
                    <button
                      onClick={() => { setShowRecurringBuy(true); setShowActionsDropdown(false); }}
                      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-stone-300 dark:hover:bg-slate-700 transition-colors"
                    >
                      <span className="text-purple-400">🔄</span>
                      <span className="text-sm text-slate-700 dark:text-slate-300">{t("autoInvest")}</span>
                    </button>
                    <button
                      onClick={() => { setShowPhysicalDelivery(true); setShowActionsDropdown(false); }}
                      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-stone-300 dark:hover:bg-slate-700 transition-colors"
                    >
                      <span className="text-amber-400">📦</span>
                      <span className="text-sm text-slate-700 dark:text-slate-300">{t("physicalDelivery")}</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Language Selector Dropdown - AFTER ACTIONS */}
              <div className="relative hidden sm:block" ref={langDropdownRef}>
                <button
                  onClick={() => setLangDropdownOpen(!langDropdownOpen)}
                  className="flex items-center gap-2 px-3 py-2 bg-stone-200 dark:bg-slate-800 hover:bg-stone-300 dark:hover:bg-slate-700 border border-stone-300 dark:border-slate-700 rounded-lg transition-colors"
                >
                  <span className="text-lg">{currentLangData.flag}</span>
                  <span className="text-sm text-slate-700 dark:text-slate-300">{currentLangData.nativeName}</span>
                  <svg
                    className={`w-4 h-4 text-slate-600 dark:text-slate-400 transition-transform ${langDropdownOpen ? "rotate-180" : ""}`}
                    fill="none" viewBox="0 0 24 24" stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {langDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-52 bg-white dark:bg-slate-800 border border-stone-300 dark:border-slate-700 rounded-xl shadow-xl z-50 overflow-hidden">
                    {LANGUAGES.map((language) => (
                      <button
                        key={language.code}
                        onClick={() => handleLanguageSelect(language.code)}
                        className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-stone-100 dark:hover:bg-slate-700 transition-colors ${
                          lang === language.code ? "bg-stone-100 dark:bg-slate-700/50" : ""
                        }`}
                      >
                        <span className="text-xl">{language.flag}</span>
                        <div className="text-left flex-1">
                          <p className="text-sm text-slate-800 dark:text-white font-medium">{language.nativeName}</p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">{language.name}</p>
                        </div>
                        {lang === language.code && (
                          <svg className="w-4 h-4 text-emerald-500 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Security Button */}
              <button
                onClick={() => setShowSecurity(true)}
                className="p-2 rounded-lg bg-stone-200 dark:bg-slate-800 hover:bg-stone-300 dark:hover:bg-slate-700 border border-stone-300 dark:border-slate-700 hover:border-emerald-500 transition-all group"
                title={lang === "tr" ? "Güvenlik Ayarları" : "Security Settings"}
              >
                <svg className="w-5 h-5 text-slate-600 dark:text-slate-400 group-hover:text-emerald-400 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </button>

              {/* Advanced Security Button */}
              <button
                onClick={() => setShowAdvancedSecurity(true)}
                className="p-2 rounded-lg bg-stone-200 dark:bg-slate-800 hover:bg-stone-300 dark:hover:bg-slate-700 border border-stone-300 dark:border-slate-700 hover:border-amber-500 transition-all group"
                title={t("advancedSecurity")}
              >
                <svg className="w-5 h-5 text-slate-600 dark:text-slate-400 group-hover:text-amber-400 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </button>

              {/* Price Alert Button */}
              <button
                onClick={() => setShowPriceAlerts(true)}
                className="p-2 rounded-lg bg-stone-200 dark:bg-slate-800 hover:bg-stone-300 dark:hover:bg-slate-700 border border-stone-300 dark:border-slate-700 hover:border-blue-500 transition-all group"
                title={t("priceAlerts")}
              >
                <svg className="w-5 h-5 text-slate-600 dark:text-slate-400 group-hover:text-blue-400 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
              </button>

              {/* Wallet Display */}
              {walletMode === "local" && localWalletAddress && isSessionUnlocked ? (
                <div className="flex items-center gap-2 px-3 py-2 bg-stone-200 dark:bg-slate-800 rounded-lg border border-stone-300 dark:border-slate-700">
                  <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                  <span className="text-sm text-slate-700 dark:text-slate-300 font-mono">
                    {localWalletAddress.slice(0, 6)}...{localWalletAddress.slice(-4)}
                  </span>
                </div>
              ) : (
                <ConnectKitButton />
              )}
            </div>
          </div>
        </div>
      </div>
      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="sm:hidden border-b border-stone-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95">
          <div className="max-w-7xl mx-auto px-4 py-3 space-y-2">
            <Link href="/" className="block px-4 py-3 rounded-lg bg-stone-200 dark:bg-slate-800 hover:bg-stone-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-medium text-sm">
              {lang === "tr" ? "Piyasalar" : lang === "en" ? "Markets" : t("markets")}
            </Link>
            <Link href="/stake" className="block px-4 py-3 rounded-lg bg-stone-200 dark:bg-slate-800 hover:bg-stone-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-medium text-sm">
              {wx.stake}
            </Link>
            <Link href="/wallet" className="block px-4 py-3 rounded-lg bg-emerald-500/20 text-emerald-400 font-medium text-sm border border-emerald-500/30">
              {lang === "tr" ? "Cüzdan" : lang === "en" ? "Wallet" : t("wallet")}
            </Link>
            <Link href="/profile" className="block px-4 py-3 rounded-lg bg-stone-200 dark:bg-slate-800 hover:bg-stone-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-medium text-sm">
              {lang === "tr" ? "Profil" : lang === "en" ? "Profile" : t("profile")}
            </Link>

            {/* Mobile Language Selector */}
            <div className="pt-3 mt-3 border-t border-stone-300 dark:border-slate-700">
              <p className="text-xs text-slate-500 dark:text-slate-500 mb-2 px-1">{lang === "tr" ? "Dil Seçimi" : "Language"}</p>
              <div className="grid grid-cols-3 gap-2">
                {LANGUAGES.map((language) => (
                  <button
                    key={language.code}
                    onClick={() => {
                      handleLanguageSelect(language.code);
                      setMobileMenuOpen(false);
                    }}
                    className={`flex items-center justify-center gap-1.5 px-2 py-2.5 rounded-lg transition-colors ${
                      lang === language.code
                        ? "bg-emerald-500/20 border border-emerald-500/30 text-emerald-400"
                        : "bg-stone-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-stone-300 dark:hover:bg-slate-700"
                    }`}
                  >
                    <span className="text-lg">{language.flag}</span>
                    <span className="text-xs font-medium">{language.code.toUpperCase()}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Mobile Theme Toggle */}
            <div className="pt-3 border-t border-stone-300 dark:border-slate-700">
              <button
                onClick={() => {
                  toggleTheme();
                  setMobileMenuOpen(false);
                }}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-stone-200 dark:bg-slate-800 rounded-lg hover:bg-stone-300 dark:hover:bg-slate-700 transition-colors"
              >
                {theme === "dark" ? (
                  <>
                    <svg className="w-5 h-5 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                    </svg>
                    <span className="text-slate-700 dark:text-slate-300">{lang === "tr" ? "Aydınlık Mod" : "Light Mode"}</span>
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                    </svg>
                    <span className="text-slate-700 dark:text-slate-300">{lang === "tr" ? "Karanlık Mod" : "Dark Mode"}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Wallet Description */}
      <div className="border-b border-stone-200 dark:border-slate-800 bg-white/30 dark:bg-slate-900/30">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-1">
            {t("myWallet")}
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            {t("walletDesc")}
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        {isWalletConnected ? (
          <>
            {/* 6 Action Buttons Row - EN ÜSTTE */}
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
              {/* Yatır / Add Funds */}
              <button
                onClick={() => setShowDeposit(true)}
                className="flex flex-col items-center gap-2 px-4 py-4 rounded-xl bg-stone-200 dark:bg-slate-800 hover:bg-stone-300 dark:hover:bg-slate-700 border border-stone-300 dark:border-slate-700 hover:border-emerald-500 transition-all group"
              >
                <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center group-hover:bg-emerald-500/30 transition-colors">
                  <svg className="w-5 h-5 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                </div>
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300 group-hover:text-white transition-colors">
                  {t("addFunds")}
                </span>
              </button>

              {/* Gönder / Transfer */}
              <button
                onClick={() => setShowTransfer(true)}
                className="flex flex-col items-center gap-2 px-4 py-4 rounded-xl bg-stone-200 dark:bg-slate-800 hover:bg-stone-300 dark:hover:bg-slate-700 border border-stone-300 dark:border-slate-700 hover:border-blue-500 transition-all group"
              >
                <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center group-hover:bg-blue-500/30 transition-colors">
                  <svg className="w-5 h-5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                </div>
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300 group-hover:text-white transition-colors">
                  {t("transfer")}
                </span>
              </button>

              {/* Hızlı Al / Quick Buy */}
              <button
                onClick={() => setShowBuyMetal(true)}
                className="flex flex-col items-center gap-2 px-4 py-4 rounded-xl bg-stone-200 dark:bg-slate-800 hover:bg-stone-300 dark:hover:bg-slate-700 border border-stone-300 dark:border-slate-700 hover:border-purple-500 transition-all group"
              >
                <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center group-hover:bg-purple-500/30 transition-colors">
                  <svg className="w-5 h-5 text-purple-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300 group-hover:text-white transition-colors">
                  {t("quickBuy")}
                </span>
              </button>

              {/* Dönüştür / Exchange */}
              <button
                onClick={() => setShowExchange(true)}
                className="flex flex-col items-center gap-2 px-4 py-4 rounded-xl bg-stone-200 dark:bg-slate-800 hover:bg-stone-300 dark:hover:bg-slate-700 border border-stone-300 dark:border-slate-700 hover:border-orange-500 transition-all group"
              >
                <div className="w-10 h-10 rounded-full bg-orange-500/20 flex items-center justify-center group-hover:bg-orange-500/30 transition-colors">
                  <svg className="w-5 h-5 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                  </svg>
                </div>
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300 group-hover:text-white transition-colors">
                  {t("exchange")}
                </span>
              </button>

              {/* Biriktir / Stake - Goes to Stake Page */}
              <Link
                href="/stake"
                className="flex flex-col items-center gap-2 px-4 py-4 rounded-xl bg-stone-200 dark:bg-slate-800 hover:bg-stone-300 dark:hover:bg-slate-700 border border-stone-300 dark:border-slate-700 hover:border-amber-500 transition-all group"
              >
                <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center group-hover:bg-amber-500/30 transition-colors">
                  <svg className="w-5 h-5 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300 group-hover:text-white transition-colors">
                  {wx.stake}
                </span>
              </Link>

              {/* Çek / Withdraw */}
              <button
                onClick={() => setShowWithdraw(true)}
                className="flex flex-col items-center gap-2 px-4 py-4 rounded-xl bg-stone-200 dark:bg-slate-800 hover:bg-stone-300 dark:hover:bg-slate-700 border border-stone-300 dark:border-slate-700 hover:border-red-500 transition-all group"
              >
                <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center group-hover:bg-red-500/30 transition-colors">
                  <svg className="w-5 h-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19V5m0 14l-4-4m4 4l4-4" />
                  </svg>
                </div>
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300 group-hover:text-white transition-colors">
                  {t("withdraw")}
                </span>
              </button>
            </div>

            {/* Total Asset Value Card */}
            <div className="rounded-2xl border border-stone-300 dark:border-slate-700 bg-gradient-to-br from-white to-stone-50 dark:from-slate-800 dark:to-slate-900 p-6">
              <div className="text-center mb-4">
                <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">
                  {t("totalAssetValue")}
                </p>
                <h2 className="text-4xl font-bold text-slate-800 dark:text-white">
                  ${totalEstimatedValue.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                </h2>
              </div>
              <div className="flex justify-center gap-8 pt-4 border-t border-stone-300 dark:border-slate-700">
                <div className="text-center">
                  <p className="text-xs text-slate-500 dark:text-slate-500 mb-1">
                    {t("auxiteAndCrypto")}
                  </p>
                  <p className="text-lg font-semibold text-emerald-400">$125,456.78</p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-slate-500 dark:text-slate-500 mb-1">
                    {t("lockedAssets")}
                  </p>
                  <p className="text-lg font-semibold text-amber-400">$13,000.00</p>
                </div>
                <button 
                  onClick={() => setShowPendingOrders(true)}
                  className="text-center hover:bg-stone-300 dark:hover:bg-slate-700/50 px-4 py-2 -my-2 rounded-lg transition-colors cursor-pointer"
                >
                  <p className="text-xs text-slate-500 dark:text-slate-500 mb-1">
                    {t("pendingOrders")}
                  </p>
                  <p className="text-lg font-semibold text-blue-400">
                    {pendingOrdersCount}
                  </p>
                </button>
              </div>
            </div>

            {/* USDT & AUXM Balance Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* USDT & USD Balance Card */}
              <div className="rounded-xl border border-emerald-500/30 bg-gradient-to-r from-emerald-500/10 to-teal-500/10 p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-emerald-500 flex items-center justify-center">
                      <span className="text-white text-xl font-bold">₮</span>
                    </div>
                    <div>
                      <p className="text-sm text-slate-600 dark:text-slate-400">{wx.estimatedTotalValue}</p>
                      <p className="text-2xl font-bold text-slate-800 dark:text-white">
                        {totalEstimatedValue.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})} 
                        <span className="text-emerald-500 dark:text-emerald-400 text-lg ml-1">USDT</span>
                      </p>
                      <p className="text-sm text-green-500 dark:text-green-400 mt-0.5">
                        ≈ ${totalEstimatedUsd.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})} USD
                      </p>
                    </div>
                  </div>
                  {/* USD Actions */}
                  <div className="flex flex-col gap-2">
                    <button
                      onClick={() => setShowUsdDeposit(true)}
                      className="px-3 py-1.5 text-xs font-medium rounded-lg bg-green-500/20 text-green-500 dark:text-green-400 hover:bg-green-500/30 transition-colors"
                    >
                      {wx.depositUsd}
                    </button>
                    {usdBalance > 0 && (
                      <button
                        onClick={() => setShowBuyWithUsd(true)}
                        className="px-3 py-1.5 text-xs font-medium rounded-lg bg-purple-500/20 text-purple-500 dark:text-purple-400 hover:bg-purple-500/30 transition-colors"
                      >
                        {wx.buyWithUsd}
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* AUXM Balance Card */}
              <div className="rounded-xl border border-purple-500/30 bg-gradient-to-r from-purple-500/10 to-pink-500/10 p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-purple-500 flex items-center justify-center">
                      <span className="text-white text-xl font-bold">◈</span>
                    </div>
                    <div>
                      <p className="text-sm text-slate-600 dark:text-slate-400">{wx.auxmBalance}</p>
                      <p className="text-2xl font-bold text-slate-800 dark:text-white">{auxmBalance.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})} <span className="text-purple-500 dark:text-purple-400 text-lg">AUXM</span></p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-purple-500 dark:text-purple-400">{wx.bonus}</p>
                    <p className="text-lg font-semibold text-purple-500 dark:text-purple-400">+{bonusAuxm.toFixed(2)}</p>
                  </div>
                </div>
              </div>
            </div>
            {/* Auxite ve Crypto Varlıklarım Section */}
            <div>
              <h3 className="text-lg font-semibold text-slate-800 dark:text-white mb-4">
                {wx.myAssets}
              </h3>
              
              {/* Metal Assets */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                {/* AUXG */}
                <button
                  onClick={() => setSelectedMetal("AUXG")}
                  className="p-4 rounded-xl bg-stone-200 dark:bg-slate-800 border border-stone-300 dark:border-slate-700 hover:border-yellow-500/50 transition-all text-left group"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <img src="/gold-favicon-32x32.png" alt="AUXG" className="w-8 h-8" />
                    <div>
                      <p className="text-sm font-medium text-slate-800 dark:text-white">AUXG</p>
                      <p className="text-xs text-slate-600 dark:text-slate-400">{wx.gold}</p>
                    </div>
                  </div>
                  <p className="text-lg font-bold text-yellow-500">{auxgBalance.toFixed(2)}g</p>
                  <p className="text-xs text-slate-600 dark:text-slate-400">≈ ${(auxgBalance * (metalAskPrices?.AUXG || 0)).toFixed(2)}</p>
                </button>

                {/* AUXS */}
                <button
                  onClick={() => setSelectedMetal("AUXS")}
                  className="p-4 rounded-xl bg-stone-200 dark:bg-slate-800 border border-stone-300 dark:border-slate-700 hover:border-gray-400/50 transition-all text-left group"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <img src="/silver-favicon-32x32.png" alt="AUXS" className="w-8 h-8" />
                    <div>
                      <p className="text-sm font-medium text-slate-800 dark:text-white">AUXS</p>
                      <p className="text-xs text-slate-600 dark:text-slate-400">{wx.silver}</p>
                    </div>
                  </div>
                  <p className="text-lg font-bold text-gray-400">{auxsBalance.toFixed(2)}g</p>
                  <p className="text-xs text-slate-600 dark:text-slate-400">≈ ${(auxsBalance * (metalAskPrices?.AUXS || 0)).toFixed(2)}</p>
                </button>

                {/* AUXPT */}
                <button
                  onClick={() => setSelectedMetal("AUXPT")}
                  className="p-4 rounded-xl bg-stone-200 dark:bg-slate-800 border border-stone-300 dark:border-slate-700 hover:border-cyan-400/50 transition-all text-left group"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <img src="/platinum-favicon-32x32.png" alt="AUXPT" className="w-8 h-8" />
                    <div>
                      <p className="text-sm font-medium text-slate-800 dark:text-white">AUXPT</p>
                      <p className="text-xs text-slate-600 dark:text-slate-400">{wx.platinum}</p>
                    </div>
                  </div>
                  <p className="text-lg font-bold text-cyan-400">{auxptBalance.toFixed(2)}g</p>
                  <p className="text-xs text-slate-600 dark:text-slate-400">≈ ${(auxptBalance * (metalAskPrices?.AUXPT || 0)).toFixed(2)}</p>
                </button>

                {/* AUXPD */}
                <button
                  onClick={() => setSelectedMetal("AUXPD")}
                  className="p-4 rounded-xl bg-stone-200 dark:bg-slate-800 border border-stone-300 dark:border-slate-700 hover:border-orange-400/50 transition-all text-left group"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <img src="/palladium-favicon-32x32.png" alt="AUXPD" className="w-8 h-8" />
                    <div>
                      <p className="text-sm font-medium text-slate-800 dark:text-white">AUXPD</p>
                      <p className="text-xs text-slate-600 dark:text-slate-400">{wx.palladium}</p>
                    </div>
                  </div>
                  <p className="text-lg font-bold text-orange-400">{auxpdBalance.toFixed(2)}g</p>
                  <p className="text-xs text-slate-600 dark:text-slate-400">≈ ${(auxpdBalance * (metalAskPrices?.AUXPD || 0)).toFixed(2)}</p>
                </button>
              </div>

              {/* Crypto Assets */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {/* ETH */}
                <button
                  onClick={() => setSelectedCrypto("ETH")}
                  className="p-4 rounded-xl bg-stone-200 dark:bg-slate-800 border border-stone-300 dark:border-slate-700 hover:border-[#627EEA]/50 transition-all text-left"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-8 h-8 rounded-full bg-[#627EEA] flex items-center justify-center">
                      <span className="text-white font-bold">Ξ</span>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-800 dark:text-white">ETH</p>
                      <p className="text-xs text-slate-600 dark:text-slate-400">Ethereum</p>
                    </div>
                  </div>
                  <p className="text-lg font-bold text-[#627EEA]">{ethBalance.toFixed(4)} ETH</p>
                  <p className="text-xs text-slate-600 dark:text-slate-400">≈ ${(ethBalance * (cryptoPrices?.eth || 3500)).toFixed(2)}</p>
                </button>

                {/* BTC */}
                <button
                  onClick={() => setSelectedCrypto("BTC")}
                  className="p-4 rounded-xl bg-stone-200 dark:bg-slate-800 border border-stone-300 dark:border-slate-700 hover:border-[#F7931A]/50 transition-all text-left"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-8 h-8 rounded-full bg-[#F7931A] flex items-center justify-center">
                      <span className="text-white font-bold">₿</span>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-800 dark:text-white">BTC</p>
                      <p className="text-xs text-slate-600 dark:text-slate-400">Bitcoin</p>
                    </div>
                  </div>
                  <p className="text-lg font-bold text-[#F7931A]">{btcBalance.toFixed(6)} BTC</p>
                  <p className="text-xs text-slate-600 dark:text-slate-400">≈ ${(btcBalance * (cryptoPrices?.btc || 95000)).toFixed(2)}</p>
                </button>

                {/* XRP */}
                <button
                  onClick={() => setSelectedCrypto("XRP")}
                  className="p-4 rounded-xl bg-stone-200 dark:bg-slate-800 border border-stone-300 dark:border-slate-700 hover:border-slate-400/50 transition-all text-left"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-8 h-8 rounded-full bg-[#23292F] flex items-center justify-center border border-slate-600">
                      <span className="text-white font-bold">✕</span>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-800 dark:text-white">XRP</p>
                      <p className="text-xs text-slate-600 dark:text-slate-400">Ripple</p>
                    </div>
                  </div>
                  <p className="text-lg font-bold text-slate-700 dark:text-slate-300">{xrpBalance.toFixed(2)} XRP</p>
                  <p className="text-xs text-slate-600 dark:text-slate-400">≈ ${(xrpBalance * (cryptoPrices?.xrp || 2.2)).toFixed(2)}</p>
                </button>

                {/* SOL */}
                <button
                  onClick={() => setSelectedCrypto("SOL")}
                  className="p-4 rounded-xl bg-stone-200 dark:bg-slate-800 border border-stone-300 dark:border-slate-700 hover:border-[#9945FF]/50 transition-all text-left"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-8 h-8 rounded-full bg-[#9945FF] flex items-center justify-center">
                      <span className="text-white font-bold">◎</span>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-800 dark:text-white">SOL</p>
                      <p className="text-xs text-slate-600 dark:text-slate-400">Solana</p>
                    </div>
                  </div>
                  <p className="text-lg font-bold text-[#9945FF]">{solBalance.toFixed(3)} SOL</p>
                  <p className="text-xs text-slate-600 dark:text-slate-400">≈ ${(solBalance * (cryptoPrices?.sol || 200)).toFixed(2)}</p>
                </button>
              </div>
            </div>

            {/* Ecosystem Description */}
            <div className="p-4 rounded-xl bg-stone-200 dark:bg-slate-800/30 border border-stone-300 dark:border-slate-700">
              <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                {wx.ecosystemDesc}
              </p>
            </div>
            {/* Kilitli Varlıklar Section - Tıklanabilir */}
            <div>
              <h3 className="text-lg font-semibold text-slate-800 dark:text-white mb-4">
                {wx.lockedAssets}
              </h3>
              
              {(() => {
                // Calculate totals from allocations + staking
                const metalPrices = {
                  AUXG: bidPrices?.AUXG || 95,
                  AUXS: bidPrices?.AUXS || 1.15,
                  AUXPT: bidPrices?.AUXPT || 32,
                  AUXPD: bidPrices?.AUXPD || 35,
                };
                
                // Allocation totals
                const allocTotals: Record<string, number> = { AUXG: 0, AUXS: 0, AUXPT: 0, AUXPD: 0 };
                allocations?.forEach((a) => {
                  if (allocTotals[a.metal] !== undefined) {
                    allocTotals[a.metal] += Number(a.grams);
                  }
                });
                
                // Staking totals
                const stakeTotals: Record<string, number> = { AUXG: 0, AUXS: 0, AUXPT: 0, AUXPD: 0 };
                activeStakes?.forEach((s) => {
                  if (stakeTotals[s.metalSymbol] !== undefined) {
                    stakeTotals[s.metalSymbol] += s.amountGrams;
                  }
                });
                
                // Combined totals
                const totalGrams: Record<string, number> = {};
                ["AUXG", "AUXS", "AUXPT", "AUXPD"].forEach((m) => {
                  totalGrams[m] = (allocTotals[m] || 0) + (stakeTotals[m] || 0);
                });
                
                // Total USD value
                const totalValue = Object.entries(totalGrams).reduce((sum, [metal, grams]) => {
                  return sum + grams * (metalPrices[metal as keyof typeof metalPrices] || 0);
                }, 0);
                
                // Average APY from staking
                const avgAPY = activeStakes?.length > 0
                  ? activeStakes.reduce((sum, s) => sum + s.apyPercent, 0) / activeStakes.length
                  : 0;
                
                // Build display string
                const displayParts: string[] = [];
                Object.entries(totalGrams).forEach(([metal, grams]) => {
                  if (grams > 0) displayParts.push(`${grams.toFixed(2)}g ${metal}`);
                });
                const displayString = displayParts.length > 0 ? displayParts.join(" + ") : "0g";
                
                // Preview items (max 4)
                const previewItems: Array<{icon: string; label: string; grams: number; value: number; type: string}> = [];
                allocations?.slice(0, 2).forEach((a) => {
                  const iconMap: Record<string, string> = {
                    AUXG: "/gold-favicon-32x32.png",
                    AUXS: "/silver-favicon-32x32.png",
                    AUXPT: "/platinum-favicon-32x32.png",
                    AUXPD: "/palladium-favicon-32x32.png",
                  };
                  previewItems.push({
                    icon: iconMap[a.metal] || "/gold-favicon-32x32.png",
                    label: `${a.metal} - Vault`,
                    grams: Number(a.grams),
                    value: Number(a.grams) * (metalPrices[a.metal as keyof typeof metalPrices] || 0),
                    type: "allocation"
                  });
                });
                activeStakes?.slice(0, 2).forEach((s) => {
                  const iconMap: Record<string, string> = {
                    AUXG: "/gold-favicon-32x32.png",
                    AUXS: "/silver-favicon-32x32.png",
                    AUXPT: "/platinum-favicon-32x32.png",
                    AUXPD: "/palladium-favicon-32x32.png",
                  };
                  previewItems.push({
                    icon: iconMap[s.metalSymbol] || "/gold-favicon-32x32.png",
                    label: `${s.metalSymbol} - Staking`,
                    grams: s.amountGrams,
                    value: s.amountGrams * (metalPrices[s.metalSymbol as keyof typeof metalPrices] || 0),
                    type: "staking"
                  });
                });
                
                const isLoadingLocked = allocLoading || stakingLoading;
                
                return (
                  <button
                    onClick={() => setShowLockedAssets(true)}
                    className="w-full text-left rounded-xl border border-amber-500/30 bg-amber-500/5 hover:bg-amber-500/10 hover:border-amber-500/50 p-4 transition-all group"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-full bg-amber-500/20 flex items-center justify-center">
                          <svg className="w-6 h-6 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                          </svg>
                        </div>
                        <div>
                          <p className="text-sm text-slate-600 dark:text-slate-400">{wx.totalLocked}</p>
                          <p className="text-xl font-bold text-slate-800 dark:text-white">
                            {isLoadingLocked ? "..." : displayString}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <p className="text-xs text-slate-600 dark:text-slate-400">{wx.estValue}</p>
                          <p className="text-lg font-semibold text-amber-400">
                            ${isLoadingLocked ? "..." : totalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </p>
                          {avgAPY > 0 && (
                            <p className="text-xs text-emerald-400">+{avgAPY.toFixed(2)}% APY</p>
                          )}
                        </div>
                        <svg className="w-5 h-5 text-slate-400 group-hover:text-amber-500 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    </div>
                    
                    {/* Locked Items Preview */}
                    {previewItems.length > 0 && (
                      <div className="mt-4 pt-4 border-t border-amber-500/20 space-y-2">
                        {previewItems.slice(0, 4).map((item, idx) => (
                          <div key={idx} className="flex items-center justify-between p-2 rounded-lg bg-stone-200/50 dark:bg-slate-800/50">
                            <div className="flex items-center gap-2">
                              <img src={item.icon} alt="" className="w-6 h-6" />
                              <span className="text-sm text-slate-700 dark:text-white">{item.label}</span>
                              {item.type === "staking" && (
                                <span className="text-xs px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-600 dark:text-emerald-400">Stake</span>
                              )}
                            </div>
                            <div className="text-right">
                              <span className="text-sm font-medium text-slate-700 dark:text-white">{item.grams.toFixed(2)}g</span>
                              <span className="text-xs text-slate-600 dark:text-slate-400 ml-2">≈ ${item.value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    
                    {/* "Detayları Gör" hint */}
                    <div className="mt-3 text-center">
                      <span className="text-xs text-amber-600 dark:text-amber-400 group-hover:underline">
                        {lang === "tr" ? "Detayları görmek için tıklayın →" : lang === "de" ? "Klicken für Details →" : lang === "fr" ? "Cliquez pour les détails →" : lang === "ar" ? "انقر للتفاصيل ←" : lang === "ru" ? "Нажмите для деталей →" : "Click to view details →"}
                      </span>
                    </div>
                  </button>
                );
              })()}
            </div>
            {/* Price Alerts */}
            <PriceAlertsPanel
              walletAddress={currentAddress || ""}
             
              currentPrices={currentPrices}
            />
            <AllocationFinder />

            {/* Transaction History */}
            <TransactionHistory />
          </>
        ) : (
          /* Connect Wallet Message */
          <div className="rounded-xl border border-stone-200 dark:border-slate-800 bg-slate-900/50 p-6">
            <div className="text-center py-12">
              <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-stone-200 dark:bg-slate-800 flex items-center justify-center">
                <svg className="w-10 h-10 text-slate-500 dark:text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-slate-200 mb-2">
                {lang === "tr" ? "Cüzdan Bağlantısı Gerekli" : "Wallet Connection Required"}
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-6">
                {lang === "tr"
                  ? "Varlıklarınızı görmek ve yönetmek için cüzdanınızı bağlayın"
                  : "Connect your wallet to view and manage your assets"}
              </p>
              <div className="flex justify-center">
                <ConnectKitButton />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Exchange Modal */}
      {showExchange && (
        <ExchangeModal 
          isOpen={showExchange}
          onClose={() => setShowExchange(false)}
         
        />
      )}

      {/* Buy Metal Modal (Hızlı Al) */}
      {showBuyMetal && (
        <BuyMetalModal
          isOpen={showBuyMetal}
          onClose={() => setShowBuyMetal(false)}
         
        />
      )}

      {selectedMetal && (
        <MetalConvertModal
          isOpen={!!selectedMetal}
          onClose={() => setSelectedMetal(null)}
          metal={selectedMetal}
         
        />
      )}

      {selectedCrypto && (
        <CryptoConvertModal
          isOpen={!!selectedCrypto}
          onClose={() => setSelectedCrypto(null)}
          crypto={selectedCrypto}
         
          cryptoBalances={{
            ETH: ethBalance,
            BTC: btcBalance,
            XRP: xrpBalance,
            SOL: solBalance,
          }}
          cryptoPrices={{
            ETH: cryptoPrices?.eth || 3500,
            BTC: cryptoPrices?.btc || 95000,
            XRP: cryptoPrices?.xrp || 2.2,
            SOL: cryptoPrices?.sol || 200,
          }}
          metalBidPrices={{
            AUXG: bidPrices?.AUXG || 90,
            AUXS: bidPrices?.AUXS || 1,
            AUXPT: bidPrices?.AUXPT || 30,
            AUXPD: bidPrices?.AUXPD || 30,
          }}
        />
      )}

      {/* Deposit Modal - Select Method */}
      {showDeposit && (
        <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-end sm:items-center justify-center z-50">
          <div className="bg-white dark:bg-slate-900 rounded-t-2xl sm:rounded-2xl border-t sm:border border-stone-300 dark:border-slate-700 w-full sm:max-w-md p-6 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-slate-800 dark:text-white">
                {lang === "tr" ? "Yatırma Yöntemi Seçin" : "Select Deposit Method"}
              </h3>
              <button
                onClick={() => setShowDeposit(false)}
                className="p-2 hover:bg-stone-300 dark:hover:bg-slate-800 rounded-lg transition-colors"
              >
                <svg className="w-5 h-5 text-slate-600 dark:text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="space-y-3">
              {/* On-Chain Deposit */}
              <button
                onClick={() => {
                  setShowDeposit(false);
                  setShowOnChainDeposit(true);
                }}
                className="w-full p-4 rounded-xl border border-stone-300 dark:border-slate-700 hover:border-slate-500 dark:hover:border-slate-600 bg-stone-50 dark:bg-slate-800/50 hover:bg-stone-100 dark:hover:bg-slate-800 transition-all text-left flex items-start gap-4"
              >
                <div className="w-10 h-10 rounded-lg bg-stone-200 dark:bg-slate-800 flex items-center justify-center flex-shrink-0">
                  <svg className="w-5 h-5 text-slate-700 dark:text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                  </svg>
                </div>
                <div className="flex-1">
                  <h4 className="text-slate-800 dark:text-white font-semibold mb-1">
                    {lang === "tr" ? "Kripto Yatır" :
                     lang === "de" ? "Krypto Einzahlen" :
                     lang === "fr" ? "Déposer Crypto" :
                     lang === "ar" ? "إيداع العملات المشفرة" :
                     lang === "ru" ? "Депозит Крипто" :
                     "On-Chain Deposit"}
                  </h4>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    {lang === "tr" ? "Diğer borsalardan/cüzdanlardan kripto yatırın" :
                     lang === "de" ? "Krypto von anderen Börsen/Wallets einzahlen" :
                     lang === "fr" ? "Déposez des cryptos depuis d'autres exchanges" :
                     lang === "ar" ? "إيداع العملات المشفرة من محافظ أخرى" :
                     lang === "ru" ? "Внесите криптовалюту с других бирж/кошельков" :
                     "Deposit crypto from other exchanges/wallets"}
                  </p>
                </div>
                <svg className="w-5 h-5 text-slate-500 dark:text-slate-500 flex-shrink-0 mt-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>

              {/* Deposit Fiat - USD */}
              <button
                onClick={() => {
                  setShowDeposit(false);
                  setShowUsdDeposit(true);
                }}
                className="w-full p-4 rounded-xl border border-green-500/30 hover:border-green-500/50 bg-green-50 dark:bg-transparent hover:bg-green-100 dark:hover:bg-green-500/5 transition-all text-left flex items-start gap-4"
              >
                <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center flex-shrink-0">
                  <span className="text-green-600 dark:text-green-400 font-bold text-lg">$</span>
                </div>
                <div className="flex-1">
                  <h4 className="text-slate-800 dark:text-white font-semibold mb-1">
                    {lang === "tr" ? "USD Yatır" : "Deposit USD"}
                  </h4>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    {lang === "tr" 
                      ? "Kredi kartı ile USD yatırın (MoonPay)" 
                      : "Deposit USD via credit card (MoonPay)"}
                  </p>
                </div>
                <svg className="w-5 h-5 text-slate-500 dark:text-slate-500 flex-shrink-0 mt-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* On-Chain Deposit - Select Coin Modal */}
      {showOnChainDeposit && !selectedDepositCoin && (
        <div className="fixed inset-0 bg-black/50 dark:bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-stone-300 dark:border-slate-700 w-full max-w-sm">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-stone-200 dark:border-slate-800">
              <h2 className="text-lg font-bold text-slate-800 dark:text-white">
                {lang === "tr" ? "Yatırılacak Coin Seç" : 
                 lang === "de" ? "Coin zum Einzahlen wählen" :
                 lang === "fr" ? "Sélectionner la Crypto" :
                 lang === "ar" ? "اختر العملة للإيداع" :
                 lang === "ru" ? "Выберите монету" :
                 "Select Coin to Deposit"}
              </h2>
              <button onClick={() => setShowOnChainDeposit(false)} className="p-2 hover:bg-stone-200 dark:hover:bg-slate-800 rounded-lg text-slate-600 dark:text-slate-400 text-xl">✕</button>
            </div>
            {/* Coin List */}
            <div className="p-4 space-y-2">
              {[{ id: "BTC", name: "Bitcoin", icon: "₿", color: "#F7931A" },
                { id: "ETH", name: "Ethereum", icon: "Ξ", color: "#627EEA" },
                { id: "XRP", name: "Ripple", icon: "✕", color: "#23292F" },
                { id: "SOL", name: "Solana", icon: "◎", color: "#9945FF" },
                { id: "USDT", name: "Tether", icon: "₮", color: "#26A17B" }].map((coin) => (
                <button
                  key={coin.id}
                  onClick={() => {
                    setSelectedDepositCoin(coin.id);
                  }}
                  className="w-full flex items-center gap-4 p-4 rounded-xl bg-stone-50 dark:bg-slate-800/50 border border-stone-300 dark:border-slate-700 hover:border-emerald-500 dark:hover:border-emerald-500 hover:bg-stone-100 dark:hover:bg-slate-800 transition-all"
                >
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center text-xl" style={{ backgroundColor: coin.color + "20", color: coin.color }}>
                    {coin.icon}
                  </div>
                  <div className="flex-1 text-left">
                    <div className="text-slate-900 dark:text-white font-semibold">{coin.id}</div>
                    <div className="text-sm text-slate-600 dark:text-slate-400">{coin.name}</div>
                  </div>
                  <svg className="w-5 h-5 text-slate-400 dark:text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Transfer Modal */}
      {showTransfer && (
        <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-stone-300 dark:border-slate-700 max-w-md w-full p-6 shadow-xl">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-slate-800 dark:text-white">
                {wx.transfer}
              </h3>
              <button
                onClick={() => setShowTransfer(false)}
                className="p-2 hover:bg-stone-200 dark:hover:bg-slate-800 rounded-lg transition-colors"
              >
                <svg className="w-5 h-5 text-slate-600 dark:text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Token Selection with Icons */}
            <div className="mb-4">
              <label className="text-sm text-slate-600 dark:text-slate-400 mb-2 block">{wx.token}</label>
              <div className="relative">
                <select className="w-full bg-stone-100 dark:bg-slate-800 border border-stone-300 dark:border-slate-700 rounded-xl px-4 py-3 text-slate-800 dark:text-white appearance-none pl-12">
                  <option value="AUXG">AUXG - {wx.gold}</option>
                  <option value="AUXS">AUXS - {wx.silver}</option>
                  <option value="AUXPT">AUXPT - {wx.platinum}</option>
                  <option value="AUXPD">AUXPD - {wx.palladium}</option>
                  <option value="ETH">ETH - Ethereum</option>
                  <option value="BTC">BTC - Bitcoin</option>
                  <option value="XRP">XRP - Ripple</option>
                  <option value="SOL">SOL - Solana</option>
                  <option value="USDT">USDT - Tether</option>
                </select>
                <div className="absolute left-3 top-1/2 -translate-y-1/2">
                  <img src="/gold-favicon-32x32.png" alt="" className="w-6 h-6" />
                </div>
                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                  <svg className="w-5 h-5 text-slate-600 dark:text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
            </div>

            {/* Recipient Address */}
            <div className="mb-4">
              <label className="text-sm text-slate-600 dark:text-slate-400 mb-2 block">{wx.recipientAddress}</label>
              <input
                type="text"
                placeholder="0x..."
                className="w-full bg-stone-100 dark:bg-slate-800 border border-stone-300 dark:border-slate-700 rounded-xl px-4 py-3 text-slate-800 dark:text-white placeholder-slate-400 dark:placeholder-slate-500"
              />
            </div>

            {/* Amount */}
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm text-slate-600 dark:text-slate-400">{wx.amount}</label>
                <span className="text-xs text-slate-500 dark:text-slate-500">{wx.balance}: {auxgBalance.toFixed(2)} AUXG</span>
              </div>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <input
                    type="number"
                    placeholder="0.00"
                    className="w-full bg-stone-100 dark:bg-slate-800 border border-stone-300 dark:border-slate-700 rounded-xl px-4 py-3 text-slate-800 dark:text-white placeholder-slate-400 dark:placeholder-slate-500"
                  />
                </div>
                <button className="px-4 py-3 bg-stone-100 dark:bg-slate-800 border border-stone-300 dark:border-slate-700 rounded-xl text-emerald-600 dark:text-emerald-500 font-medium hover:bg-stone-200 dark:hover:bg-slate-700 transition-colors">
                  MAX
                </button>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-500 mt-2">≈ $0.00 USD</p>
            </div>

            {/* Fee Info */}
            <div className="bg-stone-100 dark:bg-slate-800/50 rounded-xl p-3 mb-6 border border-stone-200 dark:border-slate-700">
              <div className="flex justify-between text-sm">
                <span className="text-slate-600 dark:text-slate-400">{wx.networkFee}</span>
                <span className="text-slate-700 dark:text-slate-300">~$0.50</span>
              </div>
            </div>

            <button className="w-full py-3 rounded-xl bg-blue-500 hover:bg-blue-600 text-white font-semibold transition-colors flex items-center justify-center gap-2">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
              {wx.send}
            </button>
          </div>
        </div>
      )}

      {/* Receive Modal */}
      {showReceive && (
        <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-stone-300 dark:border-slate-700 max-w-md w-full p-6 shadow-xl">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-slate-800 dark:text-white">
                {wx.receive}
              </h3>
              <button
                onClick={() => setShowReceive(false)}
                className="p-2 hover:bg-stone-200 dark:hover:bg-slate-800 rounded-lg transition-colors"
              >
                <svg className="w-5 h-5 text-slate-600 dark:text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
              {lang === "tr" 
                ? "Bu adresi paylaşarak token alabilirsiniz." 
                : "Share this address to receive tokens."}
            </p>

            {/* Token Selection with Icons */}
            <div className="mb-4">
              <label className="text-sm text-slate-600 dark:text-slate-400 mb-2 block">{lang === "tr" ? "Token Seç" : "Select Token"}</label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <button className="flex flex-col items-center gap-1 p-3 rounded-xl bg-emerald-500/20 border border-emerald-500 transition-all">
                  <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center">
                    <span className="text-xs text-white">All</span>
                  </div>
                  <span className="text-xs text-slate-700 dark:text-slate-300">{lang === "tr" ? "Tümü" : "All"}</span>
                </button>
                <button className="flex flex-col items-center gap-1 p-3 rounded-xl bg-stone-200 dark:bg-slate-800 border border-stone-300 dark:border-slate-700 hover:border-slate-600 transition-all">
                  <img src="/gold-favicon-32x32.png" alt="AUXG" className="w-8 h-8" />
                  <span className="text-xs text-slate-700 dark:text-slate-300">AUXG</span>
                </button>
                <button className="flex flex-col items-center gap-1 p-3 rounded-xl bg-stone-200 dark:bg-slate-800 border border-stone-300 dark:border-slate-700 hover:border-slate-600 transition-all">
                  <div className="w-8 h-8 rounded-full bg-[#627EEA] flex items-center justify-center">
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="white">
                      <path d="M12 1.5l-6.5 11L12 17l6.5-4.5L12 1.5z"/>
                    </svg>
                  </div>
                  <span className="text-xs text-slate-700 dark:text-slate-300">ETH</span>
                </button>
                <button className="flex flex-col items-center gap-1 p-3 rounded-xl bg-stone-200 dark:bg-slate-800 border border-stone-300 dark:border-slate-700 hover:border-slate-600 transition-all">
                  <div className="w-8 h-8 rounded-full bg-[#F7931A] flex items-center justify-center">
                    <span className="text-white text-sm font-bold">₿</span>
                  </div>
                  <span className="text-xs text-slate-700 dark:text-slate-300">BTC</span>
                </button>
              </div>
            </div>

            {/* QR Code */}
            <div className="bg-white p-4 rounded-xl mb-4 flex items-center justify-center">
              <div className="w-40 h-40 bg-slate-100 rounded-lg flex items-center justify-center">
                <svg className="w-32 h-32" viewBox="0 0 100 100" fill="none">
                  <rect x="10" y="10" width="25" height="25" fill="#000"/>
                  <rect x="65" y="10" width="25" height="25" fill="#000"/>
                  <rect x="10" y="65" width="25" height="25" fill="#000"/>
                  <rect x="15" y="15" width="15" height="15" fill="#fff"/>
                  <rect x="70" y="15" width="15" height="15" fill="#fff"/>
                  <rect x="15" y="70" width="15" height="15" fill="#fff"/>
                  <rect x="20" y="20" width="5" height="5" fill="#000"/>
                  <rect x="75" y="20" width="5" height="5" fill="#000"/>
                  <rect x="20" y="75" width="5" height="5" fill="#000"/>
                  <rect x="45" y="45" width="10" height="10" fill="#000"/>
                  <rect x="65" y="65" width="25" height="25" fill="#000"/>
                  <rect x="70" y="70" width="15" height="15" fill="#fff"/>
                  <rect x="75" y="75" width="5" height="5" fill="#000"/>
                </svg>
              </div>
            </div>

            {/* Address */}
            <div className="bg-stone-200 dark:bg-slate-800 rounded-xl p-4 mb-4">
              <p className="text-xs text-slate-500 dark:text-slate-500 mb-1">{lang === "tr" ? "Cüzdan Adresi" : "Wallet Address"}</p>
              <p className="text-sm text-slate-800 dark:text-slate-200 font-mono break-all">{currentAddress || "0xe6df1234567890abcdef1234567890abcdef3ba3"}</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => navigator.clipboard.writeText(currentAddress || "0xe6df1234567890abcdef1234567890abcdef3ba3")}
                className="py-3 rounded-xl bg-stone-200 dark:bg-slate-800 hover:bg-stone-300 dark:hover:bg-slate-700 border border-stone-300 dark:border-slate-700 text-slate-800 dark:text-white font-medium transition-colors flex items-center justify-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                {lang === "tr" ? "Kopyala" : "Copy"}
              </button>
              <button className="py-3 rounded-xl bg-purple-500 hover:bg-purple-600 text-white font-semibold transition-colors flex items-center justify-center gap-2">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                </svg>
                {lang === "tr" ? "Paylaş" : "Share"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Deposit Address Modal */}
      {selectedDepositCoin && (
        <DepositAddressModal
          isOpen={!!selectedDepositCoin}
          onClose={() => {
            setSelectedDepositCoin(null);
            setShowOnChainDeposit(false);
          }}
          coin={selectedDepositCoin}
          lang={lang as "tr" | "en" | "de" | "fr" | "ar" | "ru"}
        />
      )}

      {/* Withdraw Modal */}
      {showWithdraw && (
        <WithdrawModal
          isOpen={showWithdraw}
          onClose={() => setShowWithdraw(false)}
         
        />
      )}

      {/* USD Deposit Modal */}
      {showUsdDeposit && (
        <UsdDepositModal
              lang={lang as 'tr' | 'en'}
          isOpen={showUsdDeposit}
          onClose={() => setShowUsdDeposit(false)}
         
          walletAddress={currentAddress || ""}
        />
      )}

      {/* Buy with USD Modal */}
      {showBuyWithUsd && (
        <BuyWithUsdModal
              lang={(['de', 'fr, 'ar, 'ru].includes(lang) ? 'en' : lang) as 'tr' | 'en'}
          isOpen={showBuyWithUsd}
          onClose={() => setShowBuyWithUsd(false)}
         
          walletAddress={currentAddress || ""}
        />
      )}

      {/* USD Convert Modal */}
      {showUsdConvert && (
        <UsdConvertModal
          isOpen={showUsdConvert}
          onClose={() => setShowUsdConvert(false)}
         
          walletAddress={currentAddress || ""}
        />
      )}

      {/* Security Settings Modal */}
      {showSecurity && (
        <SecuritySettings
          walletAddress={currentAddress || ""}
         
          onClose={() => setShowSecurity(false)}
        />
      )}

      {/* Advanced Security Modal */}
      {showAdvancedSecurity && (
        <AdvancedSecurityModal
          walletAddress={currentAddress || ""}
         
          onClose={() => setShowAdvancedSecurity(false)}
        />
      )}

      {/* Price Alerts Modal */}
      {showPriceAlerts && (
        <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-stone-300 dark:border-slate-700 max-w-2xl w-full max-h-[90vh] overflow-hidden shadow-xl">
            <div className="flex items-center justify-between p-4 border-b border-stone-200 dark:border-slate-700 bg-white dark:bg-slate-900">
              <h3 className="text-lg font-semibold text-slate-800 dark:text-white">
                {lang === "tr" ? "Fiyat Uyarıları" : "Price Alerts"}
              </h3>
              <button onClick={() => setShowPriceAlerts(false)} className="p-2 hover:bg-stone-200 dark:hover:bg-slate-800 rounded-lg">
                <svg className="w-5 h-5 text-slate-600 dark:text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-4 overflow-y-auto max-h-[calc(90vh-80px)] bg-white dark:bg-slate-900">
              <PriceAlertManager walletAddress={currentAddress || ""} currentPrices={currentPrices} />
            </div>
          </div>
        </div>
      )}

      {/* Recurring Buy Modal */}
      {showRecurringBuy && (
        <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-stone-300 dark:border-slate-700 max-w-2xl w-full max-h-[90vh] overflow-hidden shadow-xl">
            <div className="flex items-center justify-between p-4 border-b border-stone-200 dark:border-slate-700 bg-white dark:bg-slate-900">
              <h3 className="text-lg font-semibold text-slate-800 dark:text-white">
                {lang === "tr" ? "Düzenli Yatırım" : "Auto-Invest"}
              </h3>
              <button onClick={() => setShowRecurringBuy(false)} className="p-2 hover:bg-stone-200 dark:hover:bg-slate-800 rounded-lg">
                <svg className="w-5 h-5 text-slate-600 dark:text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-4 overflow-y-auto max-h-[calc(90vh-80px)] bg-white dark:bg-slate-900">
              <RecurringBuyManager walletAddress={currentAddress || ""} usdBalance={usdBalance} usdtBalance={usdtBalance} ethBalance={ethBalance} btcBalance={btcBalance} xrpBalance={xrpBalance} solBalance={solBalance} />
            </div>
          </div>
        </div>
      )}

      {/* Physical Delivery Modal */}
      {showPhysicalDelivery && (
        <PhysicalDelivery
          walletAddress={currentAddress || ""}
         
          metalBalances={{
            auxg: auxgBalance,
            auxs: auxsBalance,
            auxpt: auxptBalance,
            auxpd: auxpdBalance,
          }}
          onClose={() => setShowPhysicalDelivery(false)}
        />
      )}

      {/* Pending Orders Modal */}
      {showPendingOrders && (
        <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-stone-300 dark:border-slate-700 max-w-2xl w-full max-h-[90vh] overflow-hidden shadow-xl">
            <div className="flex items-center justify-between p-4 border-b border-stone-200 dark:border-slate-700 bg-white dark:bg-slate-900">
              <h3 className="text-lg font-semibold text-slate-800 dark:text-white">
                {lang === "tr" ? "Bekleyen Emirler" : "Pending Orders"}
              </h3>
              <button onClick={() => setShowPendingOrders(false)} className="p-2 hover:bg-stone-200 dark:hover:bg-slate-800 rounded-lg">
                <svg className="w-5 h-5 text-slate-600 dark:text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-4 overflow-y-auto max-h-[calc(90vh-80px)] bg-white dark:bg-slate-900">
              <LimitOrdersList 
                walletAddress={currentAddress || ""} 
               
                onOrderCancelled={() => {
                  // Refresh pending orders count
                  setPendingOrdersCount(prev => Math.max(0, prev - 1));
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Locked Assets Modal */}
      {showLockedAssets && (
        <LockedAssetsModal
          isOpen={showLockedAssets}
          onClose={() => setShowLockedAssets(false)}
          lang={lang as "tr" | "en" | "de" | "fr" | "ar" | "ru"}
          metalPrices={{
            AUXG: bidPrices?.AUXG || 95,
            AUXS: bidPrices?.AUXS || 1.15,
            AUXPT: bidPrices?.AUXPT || 32,
            AUXPD: bidPrices?.AUXPD || 35,
          }}
        />
      )}
    </main>
  );
}
