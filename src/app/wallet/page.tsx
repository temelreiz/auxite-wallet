"use client";
import TopNav from "@/components/TopNav";
import { useState, useEffect, useRef } from "react";
import { useAccount } from "wagmi";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import Link from "next/link";
import Image from "next/image";
import AllocationFinder from "@/components/AllocationFinder";
import { TransactionHistory } from "@/components/TransactionHistory";
import { ExchangeModal } from "@/components/ExchangeModal";
import { BuyMetalModal } from "@/components/BuyMetalModal";
import { AllocationWizard } from "@/components/AllocationWizard";
import { DepositAddressModal } from "@/components/DepositAddressModal";
import { PriceAlertsPanel } from "@/components/PriceAlertsPanel";
import { CryptoConvertModal } from "@/components/CryptoConvertModal";
import { MetalConvertModal } from "@/components/MetalConvertModal";
import { WithdrawModal } from "@/components/WithdrawModal";
import { TransferModal } from "@/components/TransferModal";
import { UsdDepositModal } from "@/components/UsdDepositModal";
import { AddFundsModal } from "@/components/AddFundsModal";
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
import { usePortfolio } from "@/hooks/usePortfolio";
import { useLanguage, LANGUAGES, getLanguageData, type LanguageCode } from "@/components/LanguageContext";
import { RequireAllowedChain } from "@/components/RequireAllowedChain";
import { useWalletContext } from "@/components/WalletContext";
import { APP_CHAIN, isAllowedChain } from "@/config/chains";


// ============================================
// LOCAL TRANSLATIONS - 6 Language Support
// ============================================
const walletTranslations: Record<string, Record<string, string>> = {
  tr: {
    // Vault terminology
    vaultTitle: "Kasam",
    vaultOverview: "Kasa Özeti",
    trustMessage: "Varlıklarınız bağımsız saklama yapılarında tam tahsisli kasalarda güvenle muhafaza edilmektedir.",
    totalAuc: "Saklama Altındaki Toplam Varlıklar",
    allocatedMetals: "Tahsisli Metaller",
    digitalAssets: "Dijital Varlıklar",
    vaultLocation: "Zürih'te Saklanıyor",
    fullyAllocated: "Tam Tahsisli",
    audited: "Denetlenmiş",
    insured: "Sigortalı",
    netAssets: "Toplam Net Varlıklar",
    myAssets: "Auxite ve Kripto Varlıklarım",
    allocatedAndStaked: "Tahsisli & Stake",
    allocated: "Tahsisli",
    staked: "Stake",
    totalLocked: "Toplam",
    estValue: "Tahmini Değer",
    estimatedTotalValue: "Tahmini Toplam Değer",
    usdBalance: "USD Bakiyesi",
    auxmBalance: "AUXM Bakiyesi",
    bonus: "Bonus",
    gold: "Altın",
    silver: "Gümüş",
    platinum: "Platin",
    palladium: "Paladyum",
    ecosystemDesc: "Auxite ekosistemindeki tüm tokenlar, temsil ettikleri metal türüne karşılık gelen fiziksel değer üzerine yapılandırılmıştır; ilgili varlıklar, dünya genelindeki yetkili ve denetimli depolama tesisleri üzerinden muhafaza edilir.",
    walletRequired: "Kasa Bağlantısı Gerekli",
    connectWallet: "Varlıklarınızı görüntülemek ve işlem yapmak için kasanızı bağlayın.",
    selectDeposit: "Yatırma Yöntemi Seçin",
    depositCrypto: "Kripto Yatır",
    depositCryptoDesc: "BTC, ETH veya diğer desteklenen coinleri yatırın",
    depositUsd: "+ USD Yatır",
    depositUsdDesc: "Banka transferi veya kart ile USD yatırın",
    selectCoin: "Yatırılacak Coin Seç",
    transfer: "Transfer",
    token: "Token",
    recipientAddress: "Alıcı Adresi",
    amount: "Miktar",
    balance: "Bakiye",
    networkFee: "Ağ Ücreti",
    send: "Gönder",
    receive: "Al",
    walletAddress: "Kasa Adresi",
    copy: "Kopyala",
    share: "Paylaş",
    close: "Kapat",
    securitySettings: "Güvenlik Ayarları",
    markets: "Piyasalar",
    stake: "Biriktir",
    wallet: "Kasa",
    profile: "Profil",
    language: "Dil Seçimi",
    lightMode: "Aydınlık Mod",
    darkMode: "Karanlık Mod",
    priceAlerts: "Fiyat Uyarıları",
    recurringBuy: "Düzenli Yatırım",
    pendingOrders: "Bekleyen Emirler",
    buyWithUsd: "USD ile Tahsis Et",
    totalAssetValue: "Saklama Altındaki Toplam Varlıklar",
    auxiteAndCrypto: "Auxite & Kripto",
    whereAreAssets: "Varlıklarım Nerede?",
    viewDetails: "Detayları Gör",
    addFunds: "Fon Ekle",
    withdraw: "Çek",
    acquire: "Tahsis Et",
    redeem: "Geri Al",
  },
  en: {
    // Vault terminology - Institutional language
    vaultTitle: "My Vault",
    vaultOverview: "Vault Overview",
    trustMessage: "Your assets are securely held in fully allocated vaults under independent custody structures.",
    totalAuc: "Total Assets Under Custody",
    allocatedMetals: "Allocated Metals",
    digitalAssets: "Digital Assets",
    vaultLocation: "Stored in Zurich",
    fullyAllocated: "Fully Allocated",
    audited: "Audited",
    insured: "Insured",
    netAssets: "Total Net Assets",
    myAssets: "My Auxite and Crypto Assets",
    allocatedAndStaked: "Allocated & Staked",
    allocated: "Allocated",
    staked: "Staked",
    totalLocked: "Total",
    estValue: "Est. Value",
    estimatedTotalValue: "Estimated Total Value",
    usdBalance: "USD Balance",
    auxmBalance: "AUXM Balance",
    bonus: "Bonus",
    gold: "Gold",
    silver: "Silver",
    platinum: "Platinum",
    palladium: "Palladium",
    ecosystemDesc: "All tokens in the Auxite ecosystem are structured on physical value corresponding to the metal type they represent; related assets are stored through authorized and audited storage facilities worldwide.",
    walletRequired: "Vault Connection Required",
    connectWallet: "Connect your vault to view your assets and manage your holdings.",
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
    walletAddress: "Vault Address",
    copy: "Copy",
    share: "Share",
    close: "Close",
    securitySettings: "Security Settings",
    markets: "Markets",
    stake: "Stake",
    wallet: "Vault",
    profile: "Profile",
    language: "Language",
    lightMode: "Light Mode",
    darkMode: "Dark Mode",
    priceAlerts: "Price Alerts",
    recurringBuy: "Auto-Invest",
    pendingOrders: "Pending Orders",
    buyWithUsd: "Acquire with USD",
    totalAssetValue: "Total Assets Under Custody",
    auxiteAndCrypto: "Auxite & Crypto",
    whereAreAssets: "Where are my Assets?",
    viewDetails: "View Details",
    addFunds: "Add Funds",
    withdraw: "Withdraw",
    acquire: "Acquire",
    redeem: "Redeem",
  },
  de: {
    myAssets: "Meine Auxite und Crypto Vermögenswerte",
    allocatedAndStaked: "Zugewiesen & Gestaked",
    allocated: "Zugewiesen",
    staked: "Gestaked",
    totalLocked: "Gesamt",
    estValue: "Gesch. Wert",
    estimatedTotalValue: "Geschätzter Gesamtwert",
    usdBalance: "USD-Guthaben",
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
    totalAssetValue: "Gesamtvermögenswert",
    auxiteAndCrypto: "Auxite & Krypto",
    whereAreAssets: "Wo sind meine Vermögenswerte?",
    viewDetails: "Details anzeigen",
  },
  fr: {
    myAssets: "Mes Actifs Auxite et Crypto",
    allocatedAndStaked: "Alloué & Staké",
    allocated: "Alloué",
    staked: "Staké",
    totalLocked: "Total",
    estValue: "Valeur Est.",
    estimatedTotalValue: "Valeur Totale Estimée",
    usdBalance: "Solde USD",
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
    totalAssetValue: "Valeur Totale des Actifs",
    auxiteAndCrypto: "Auxite & Crypto",
    whereAreAssets: "Où sont mes actifs?",
    viewDetails: "Voir les détails",
  },
  ar: {
    myAssets: "أصولي من Auxite والعملات المشفرة",
    allocatedAndStaked: "مخصص ومرهون",
    allocated: "مخصص",
    staked: "مرهون",
    totalLocked: "الإجمالي",
    estValue: "القيمة التقديرية",
    estimatedTotalValue: "إجمالي القيمة المقدرة",
    usdBalance: "رصيد الدولار",
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
    totalAssetValue: "إجمالي قيمة الأصول",
    auxiteAndCrypto: "Auxite والعملات المشفرة",
    whereAreAssets: "أين أصولي؟",
    viewDetails: "عرض التفاصيل",
  },
  ru: {
    myAssets: "Мои Auxite и Крипто Активы",
    allocatedAndStaked: "Распределено и Застейкано",
    allocated: "Распределено",
    staked: "Застейкано",
    totalLocked: "Всего",
    estValue: "Оц. Стоимость",
    estimatedTotalValue: "Оценочная общая стоимость",
    usdBalance: "Баланс USD",
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
    totalAssetValue: "Общая стоимость активов",
    auxiteAndCrypto: "Auxite и Крипто",
    whereAreAssets: "Где мои активы?",
    viewDetails: "Посмотреть детали",
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
  
  // External wallet (wagmi)
  const { isConnected: isExternalConnected, address: externalAddress } = useAccount();
  

  // Bakiyeler - useWallet hook
  const { balances, stakedAmounts, allocationAmounts, isConnected, chainId, canSwitchChain, switchChain } = useWalletContext();
  const isWrongChain = isConnected && chainId !== null && !isAllowedChain(chainId);
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
  const [showAddFunds, setShowAddFunds] = useState(false);
  const [addFundsDefaultTab, setAddFundsDefaultTab] = useState<"crypto" | "card" | "bank">("crypto");
  const [showFiatDeposit, setShowFiatDeposit] = useState(false);
  const [showTransfer, setShowTransfer] = useState(false);
  const [showReceive, setShowReceive] = useState(false);
  const [showBuyMetal, setShowBuyMetal] = useState(false);
  const [showAllocationWizard, setShowAllocationWizard] = useState(false);
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
  const [showPendingOrders, setShowPendingOrders] = useState(false);
  const [pendingOrdersCount, setPendingOrdersCount] = useState(0);
  const [showLockedAssets, setShowLockedAssets] = useState(false);
  
  // New modal states for portfolio clicks
  const [selectedMetal, setSelectedMetal] = useState<"AUXG" | "AUXS" | "AUXPT" | "AUXPD" | null>(null);
  const [selectedDepositCoin, setSelectedDepositCoin] = useState<string | null>(null);
  const [selectedCrypto, setSelectedCrypto] = useState<"ETH" | "BTC" | "XRP" | "SOL" | null>(null);
  
  // Get prices for modals
  const { prices: cryptoPrices, loading: cryptoPricesLoading } = useCryptoPrices();
  const { prices: metalAskPrices, bidPrices, loading: metalPricesLoading } = useMetalsPrices();

  // Only show portfolio values when real prices are loaded
  const pricesLoaded = !cryptoPricesLoading && !metalPricesLoading;
  
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
    
    setIsLoading(false);
  }, []);

  // Determine if wallet is connected
  const isWalletConnected = 
    (walletMode === "local" && !!localWalletAddress && isSessionUnlocked) || 
    isExternalConnected;

  const currentAddress =
    (walletMode === "local" && localWalletAddress) ? localWalletAddress : externalAddress;

  // ═══════════════════════════════════════════════════════════════════════════
  // UNIFIED PORTFOLIO - Single source of truth for all values
  // ═══════════════════════════════════════════════════════════════════════════
  const portfolio = usePortfolio(currentAddress);

  // Calculate values using existing data as fallback while portfolio API is being fixed
  // Staked değeri
  const stakedValueCalc =
    ((stakedAmounts?.auxg || 0) * (metalAskPrices?.AUXG || 0)) +
    ((stakedAmounts?.auxs || 0) * (metalAskPrices?.AUXS || 0)) +
    ((stakedAmounts?.auxpt || 0) * (metalAskPrices?.AUXPT || 0)) +
    ((stakedAmounts?.auxpd || 0) * (metalAskPrices?.AUXPD || 0));

  // Allocation değeri (fiziksel metal - locked value olarak gösterilir)
  const allocatedValueCalc =
    ((allocationAmounts?.auxg || 0) * (metalAskPrices?.AUXG || 0)) +
    ((allocationAmounts?.auxs || 0) * (metalAskPrices?.AUXS || 0)) +
    ((allocationAmounts?.auxpt || 0) * (metalAskPrices?.AUXPT || 0)) +
    ((allocationAmounts?.auxpd || 0) * (metalAskPrices?.AUXPD || 0));

  // Metals değeri - balance zaten allocation dahil (API'den geliyor)
  const metalsValueCalc =
    (auxgBalance * (metalAskPrices?.AUXG || 0)) +
    (auxsBalance * (metalAskPrices?.AUXS || 0)) +
    (auxptBalance * (metalAskPrices?.AUXPT || 0)) +
    (auxpdBalance * (metalAskPrices?.AUXPD || 0));

  // Crypto değeri
  const cryptoValueCalc =
    (ethBalance * (cryptoPrices?.eth || 0)) +
    (btcBalance * (cryptoPrices?.btc || 0)) +
    (xrpBalance * (cryptoPrices?.xrp || 0)) +
    (solBalance * (cryptoPrices?.sol || 0)) +
    (balances?.usdt || 0) +
    (balances?.usd || 0);

  // TEMPORARILY DISABLED: Portfolio API returns wrong values (missing metal prices)
  // TODO: Fix portfolio API then re-enable
  // const usePortfolioAPI = portfolio.totalValue > 0;
  const usePortfolioAPI = false; // Force fallback calculation until API is fixed

  // IMPORTANT: Metal balances (auxgBalance etc.) already INCLUDE allocated amounts from API
  // So we should NOT add allocatedValueCalc again - that would be double counting!
  // Staked amounts are also part of user's total holdings, shown separately for info only

  // Total value = metals + crypto (metals already include allocations)
  const totalEstimatedValue = usePortfolioAPI
    ? portfolio.totalValue
    : (metalsValueCalc + cryptoValueCalc);

  // "Tahsisli & Stake" is shown for information only - these are PART OF the total, not additional
  const allocatedAndStakedValue = allocatedValueCalc + stakedValueCalc;

  // "Auxite & Kripto" shows the breakdown: total minus locked portions
  // But since metals already include allocations, we show total minus what's locked
  const auxiteAndCryptoValue = totalEstimatedValue - allocatedAndStakedValue;

  // USD cinsinden toplam değer
  const totalEstimatedUsd = totalEstimatedValue;

  // Get unique vault locations from allocations
  const vaultLocations = Array.from(
    new Set(
      allocations
        .filter(a => a.active && a.custodian)
        .map(a => a.custodian)
    )
  );

  // Map location names to flags
  const locationFlags: Record<string, string> = {
    "Zurich": "🇨🇭",
    "Dubai": "🇦🇪",
    "Singapore": "🇸🇬",
    "London": "🇬🇧",
    "New York": "🇺🇸",
  };

  // DEBUG
  console.log('📊 ASSET VALUE DEBUG:', {
    usePortfolioAPI,
    metalsValueCalc,
    cryptoValueCalc,
    allocatedValueCalc,
    stakedValueCalc,
    allocatedAndStakedValue,
    auxiteAndCryptoValue,
    FINAL_TOTAL: totalEstimatedValue,
    note: 'Metals already include allocations - no double counting'
  });

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
      {/* Wrong chain banner (P0: block critical actions) */}
      {isWrongChain && (
        <div className="bg-red-600 text-white text-sm px-4 py-3 flex items-center justify-center gap-3 flex-wrap">
          <span>
            {lang === "tr"
              ? `Yanlış ağ algılandı. Devam etmek için ${APP_CHAIN.name} ağına geçin.`
              : lang === "de"
              ? `Falsches Netzwerk erkannt. Bitte wechseln Sie zu ${APP_CHAIN.name}, um fortzufahren.`
              : lang === "fr"
              ? `Réseau incorrect détecté. Passez à ${APP_CHAIN.name} pour continuer.`
              : lang === "ar"
              ? `تم اكتشاف شبكة خاطئة. يرجى التبديل إلى ${APP_CHAIN.name} للمتابعة.`
              : lang === "ru"
              ? `Обнаружена неверная сеть. Переключитесь на ${APP_CHAIN.name}, чтобы продолжить.`
              : `Wrong network detected. Switch to ${APP_CHAIN.name} to continue.`}
          </span>

          {canSwitchChain && switchChain && (
            <button
              type="button"
              onClick={() => switchChain(APP_CHAIN.chainId)}
              className="bg-white/15 hover:bg-white/25 transition px-3 py-1.5 rounded-lg font-semibold"
            >
              {lang === "tr"
                ? `Ağa geç`
                : lang === "de"
                ? `Wechseln`
                : lang === "fr"
                ? `Basculer`
                : lang === "ar"
                ? `تبديل`
                : lang === "ru"
                ? `Переключить`
                : `Switch`}
            </button>
          )}
        </div>
      )}

      {/* TopNav with wallet actions */}
      <TopNav
        showWalletActions={true}
        onShowRecurringBuy={() => setShowRecurringBuy(true)}
        onShowPhysicalDelivery={() => setShowPhysicalDelivery(true)}
        onShowPriceAlerts={() => setShowPriceAlerts(true)}
        onShowSecurity={() => setShowSecurity(true)}
        onShowAdvancedSecurity={() => setShowAdvancedSecurity(true)}
      />





      {/* Wallet Description */}
      <div className="border-b border-stone-200 dark:border-slate-800 bg-white/30 dark:bg-slate-900/30">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 py-3 sm:py-4">
          <h2 className="text-base sm:text-lg font-semibold text-slate-800 dark:text-slate-100 mb-0.5 sm:mb-1">
            {t("myWallet")}
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">
            {t("walletDesc")}
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-3 sm:px-4 py-4 sm:py-6 space-y-4 sm:space-y-6">
        {isWalletConnected ? (
          <>
            {/* 6 Action Buttons Row - EN ÜSTTE */}
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 sm:gap-3">
              {/* Yatır / Add Funds */}
              <button
                onClick={() => {
                  setAddFundsDefaultTab("crypto");
                  setShowAddFunds(true);
                }}
                className="flex flex-col items-center gap-1.5 sm:gap-2 px-2 sm:px-4 py-3 sm:py-4 rounded-lg sm:rounded-xl bg-stone-200 dark:bg-slate-800 hover:bg-stone-300 dark:hover:bg-slate-700 border border-stone-300 dark:border-slate-700 hover:border-emerald-500 transition-all group"
              >
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-emerald-500/20 flex items-center justify-center group-hover:bg-emerald-500/30 transition-colors">
                  <svg className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                </div>
                <span className="text-[10px] sm:text-sm font-medium text-slate-700 dark:text-slate-300 group-hover:text-white transition-colors text-center">
                  {t("addFunds")}
                </span>
              </button>

              {/* Gönder / Transfer */}
              <button
                onClick={() => setShowTransfer(true)}
                className="flex flex-col items-center gap-1.5 sm:gap-2 px-2 sm:px-4 py-3 sm:py-4 rounded-lg sm:rounded-xl bg-stone-200 dark:bg-slate-800 hover:bg-stone-300 dark:hover:bg-slate-700 border border-stone-300 dark:border-slate-700 hover:border-blue-500 transition-all group"
              >
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-blue-500/20 flex items-center justify-center group-hover:bg-blue-500/30 transition-colors">
                  <svg className="w-4 h-4 sm:w-5 sm:h-5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                </div>
                <span className="text-[10px] sm:text-sm font-medium text-slate-700 dark:text-slate-300 group-hover:text-white transition-colors text-center">
                  {t("transfer")}
                </span>
              </button>

              {/* Allocate / Sermaye Tahsisi */}
              <button
                onClick={() => setShowAllocationWizard(true)}
                className="flex flex-col items-center gap-1.5 sm:gap-2 px-2 sm:px-4 py-3 sm:py-4 rounded-lg sm:rounded-xl bg-stone-200 dark:bg-slate-800 hover:bg-stone-300 dark:hover:bg-slate-700 border border-stone-300 dark:border-slate-700 hover:border-emerald-500 transition-all group"
              >
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-emerald-500/20 flex items-center justify-center group-hover:bg-emerald-500/30 transition-colors">
                  <svg className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                </div>
                <span className="text-[10px] sm:text-sm font-medium text-slate-700 dark:text-slate-300 group-hover:text-white transition-colors text-center">
                  {lang === "tr" ? "Tahsis Et" : "Allocate"}
                </span>
              </button>

              {/* Dönüştür / Exchange */}
              <button
                onClick={() => setShowExchange(true)}
                className="flex flex-col items-center gap-1.5 sm:gap-2 px-2 sm:px-4 py-3 sm:py-4 rounded-lg sm:rounded-xl bg-stone-200 dark:bg-slate-800 hover:bg-stone-300 dark:hover:bg-slate-700 border border-stone-300 dark:border-slate-700 hover:border-orange-500 transition-all group"
              >
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-orange-500/20 flex items-center justify-center group-hover:bg-orange-500/30 transition-colors">
                  <svg className="w-4 h-4 sm:w-5 sm:h-5 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                  </svg>
                </div>
                <span className="text-[10px] sm:text-sm font-medium text-slate-700 dark:text-slate-300 group-hover:text-white transition-colors text-center">
                  {t("exchange")}
                </span>
              </button>

              {/* Biriktir / Stake - Goes to Stake Page */}
              <Link
                href="/stake"
                className="flex flex-col items-center gap-1.5 sm:gap-2 px-2 sm:px-4 py-3 sm:py-4 rounded-lg sm:rounded-xl bg-stone-200 dark:bg-slate-800 hover:bg-stone-300 dark:hover:bg-slate-700 border border-stone-300 dark:border-slate-700 hover:border-amber-500 transition-all group"
              >
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-amber-500/20 flex items-center justify-center group-hover:bg-amber-500/30 transition-colors">
                  <svg className="w-4 h-4 sm:w-5 sm:h-5 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <span className="text-[10px] sm:text-sm font-medium text-slate-700 dark:text-slate-300 group-hover:text-white transition-colors text-center">
                  {wx.stake}
                </span>
              </Link>

              {/* Çek / Withdraw */}
              <button
                onClick={() => setShowWithdraw(true)}
                className="flex flex-col items-center gap-1.5 sm:gap-2 px-2 sm:px-4 py-3 sm:py-4 rounded-lg sm:rounded-xl bg-stone-200 dark:bg-slate-800 hover:bg-stone-300 dark:hover:bg-slate-700 border border-stone-300 dark:border-slate-700 hover:border-red-500 transition-all group"
              >
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-red-500/20 flex items-center justify-center group-hover:bg-red-500/30 transition-colors">
                  <svg className="w-4 h-4 sm:w-5 sm:h-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19V5m0 14l-4-4m4 4l4-4" />
                  </svg>
                </div>
                <span className="text-[10px] sm:text-sm font-medium text-slate-700 dark:text-slate-300 group-hover:text-white transition-colors text-center">
                  {t("withdraw")}
                </span>
              </button>
            </div>

            {/* Trust Message Banner */}
            <div className="rounded-xl border border-emerald-500/30 bg-gradient-to-r from-emerald-500/5 to-teal-500/5 dark:from-emerald-900/20 dark:to-teal-900/20 p-3 sm:p-4">
              <div className="flex items-center gap-3">
                <div className="hidden sm:flex w-10 h-10 rounded-full bg-emerald-500/20 items-center justify-center flex-shrink-0">
                  <svg className="w-5 h-5 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                </div>
                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                  {wx.trustMessage || "Your assets are securely held in fully allocated vaults under independent custody structures."}
                </p>
              </div>
              {/* Allocation Badges */}
              <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-emerald-500/20">
                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] sm:text-xs font-medium">
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  {wx.fullyAllocated || "Fully Allocated"}
                </span>
                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 text-[10px] sm:text-xs font-medium">
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  {wx.audited || "Audited"}
                </span>
                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-purple-500/10 text-purple-600 dark:text-purple-400 text-[10px] sm:text-xs font-medium">
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  {wx.insured || "Insured"}
                </span>
                {/* Dynamic Vault Locations */}
                {vaultLocations.length > 0 ? (
                  vaultLocations.map((loc, idx) => (
                    <span key={idx} className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 text-[10px] sm:text-xs font-medium">
                      {locationFlags[loc] || "📍"} {lang === "tr" ? `${loc}'de Saklanıyor` : lang === "de" ? `Gelagert in ${loc}` : lang === "fr" ? `Stocké à ${loc}` : lang === "ar" ? `مخزنة في ${loc}` : lang === "ru" ? `Хранится в ${loc}` : `Stored in ${loc}`}
                    </span>
                  ))
                ) : (
                  <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 text-[10px] sm:text-xs font-medium">
                    🏦 {lang === "tr" ? "Küresel Kasalar" : lang === "de" ? "Globale Tresore" : lang === "fr" ? "Coffres Mondiaux" : lang === "ar" ? "خزائن عالمية" : lang === "ru" ? "Глобальные Хранилища" : "Global Vaults"}
                  </span>
                )}
              </div>
            </div>

            {/* Total Assets Under Custody Card */}
            <div className="rounded-xl sm:rounded-2xl border border-stone-300 dark:border-slate-700 bg-gradient-to-br from-white to-stone-50 dark:from-slate-800 dark:to-slate-900 p-3 sm:p-6">
              <div className="text-center mb-2 sm:mb-4">
                <p className="text-[10px] sm:text-sm text-slate-600 dark:text-slate-400 mb-0.5 sm:mb-1">
                  {wx.totalAssetValue || wx.totalAuc || "Total Assets Under Custody"}
                </p>
                <h2 className="text-xl sm:text-4xl font-bold text-slate-800 dark:text-white">
                  {pricesLoaded
                    ? `$${totalEstimatedValue.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`
                    : "..."}
                </h2>
              </div>
              <div className="flex flex-wrap justify-center gap-2 sm:gap-6 pt-2 sm:pt-4 border-t border-stone-300 dark:border-slate-700">
                <div className="text-center min-w-[60px] sm:min-w-0">
                  <p className="text-[9px] sm:text-xs text-slate-500 dark:text-slate-500 mb-0.5 sm:mb-1">
                    {wx.auxiteAndCrypto}
                  </p>
                  <p className="text-sm sm:text-lg font-semibold text-emerald-400">
                    {pricesLoaded
                      ? `$${auxiteAndCryptoValue.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`
                      : "..."}
                  </p>
                </div>
                <div className="text-center min-w-[60px] sm:min-w-0">
                  <p className="text-[9px] sm:text-xs text-slate-500 dark:text-slate-500 mb-0.5 sm:mb-1">
                    {wx.allocated}
                  </p>
                  <p className="text-sm sm:text-lg font-semibold text-amber-400">
                    {pricesLoaded
                      ? `$${allocatedValueCalc.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`
                      : "..."}
                  </p>
                </div>
                <div className="text-center min-w-[60px] sm:min-w-0">
                  <p className="text-[9px] sm:text-xs text-slate-500 dark:text-slate-500 mb-0.5 sm:mb-1">
                    {wx.staked}
                  </p>
                  <p className="text-sm sm:text-lg font-semibold text-purple-400">
                    {pricesLoaded
                      ? `$${stakedValueCalc.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`
                      : "..."}
                  </p>
                </div>
                <button
                  onClick={() => setShowPendingOrders(true)}
                  className="text-center hover:bg-stone-300 dark:hover:bg-slate-700/50 px-2 sm:px-3 py-1 sm:py-2 -my-1 sm:-my-2 rounded-lg transition-colors cursor-pointer min-w-[60px] sm:min-w-0"
                >
                  <p className="text-[9px] sm:text-xs text-slate-500 dark:text-slate-500 mb-0.5 sm:mb-1">
                    {wx.pendingOrders}
                  </p>
                  <p className="text-sm sm:text-lg font-semibold text-blue-400">
                    {pendingOrdersCount}
                  </p>
                </button>
              </div>
            </div>

            {/* USDT & AUXM Balance Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
              {/* USDT & USD Balance Card */}
              <div className="rounded-lg sm:rounded-xl border border-emerald-500/30 bg-gradient-to-r from-emerald-500/10 to-teal-500/10 p-3 sm:p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 sm:gap-3">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-emerald-500 flex items-center justify-center">
                      <span className="text-white text-lg sm:text-xl font-bold">$</span>
                    </div>
                    <div>
                      <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">{wx.usdBalance || "USD Balance"}</p>
                      <p className="text-lg sm:text-2xl font-bold text-slate-800 dark:text-white">
                        ${usdBalance.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})} 
                        <span className="text-emerald-500 dark:text-emerald-400 text-sm sm:text-lg ml-1">USD</span>
                      </p>
                      {usdtBalance > 0 && (
                        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                          + {usdtBalance.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})} USDT
                        </p>
                      )}
                    </div>
                  </div>
                  {/* USD Actions */}
                  <div className="flex flex-col gap-1.5 sm:gap-2">
                    <button
                      onClick={() => {
                        setAddFundsDefaultTab("bank");
                        setShowAddFunds(true);
                      }}
                      className="px-2 sm:px-3 py-1 sm:py-1.5 text-[10px] sm:text-xs font-medium rounded-lg bg-green-500/20 text-green-500 dark:text-green-400 hover:bg-green-500/30 transition-colors"
                    >
                      {wx.depositUsd}
                    </button>
                    {usdBalance > 0 && (
                      <button
                        onClick={() => setShowBuyWithUsd(true)}
                        className="px-2 sm:px-3 py-1 sm:py-1.5 text-[10px] sm:text-xs font-medium rounded-lg bg-purple-500/20 text-purple-500 dark:text-purple-400 hover:bg-purple-500/30 transition-colors"
                      >
                        {wx.buyWithUsd}
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* AUXM Balance Card */}
              <div className="rounded-lg sm:rounded-xl border border-purple-500/30 bg-gradient-to-r from-purple-500/10 to-pink-500/10 p-3 sm:p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 sm:gap-3">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-purple-500 flex items-center justify-center">
                      <span className="text-white text-lg sm:text-xl font-bold">◈</span>
                    </div>
                    <div>
                      <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">{wx.auxmBalance}</p>
                      <p className="text-lg sm:text-2xl font-bold text-slate-800 dark:text-white">{auxmBalance.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})} <span className="text-purple-500 dark:text-purple-400 text-sm sm:text-lg">AUXM</span></p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] sm:text-xs text-purple-500 dark:text-purple-400">{wx.bonus}</p>
                    <p className="text-base sm:text-lg font-semibold text-purple-500 dark:text-purple-400">+{bonusAuxm.toFixed(2)}</p>
                  </div>
                </div>
              </div>
            </div>
            {/* Allocated Metals Section - GOLD FIRST */}
            <div className="mb-6">
              <h3 className="text-base sm:text-lg font-semibold text-slate-800 dark:text-white mb-3 sm:mb-4 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                {wx.allocatedMetals || "Allocated Metals"}
              </h3>

              {/* Metal Assets - Gold First */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-3">
                {/* AUXG */}
                <button
                  onClick={() => setSelectedMetal("AUXG")}
                  className="p-3 sm:p-4 rounded-lg sm:rounded-xl bg-stone-200 dark:bg-slate-800 border border-stone-300 dark:border-slate-700 hover:border-yellow-500/50 transition-all text-left group"
                >
                  <div className="flex items-center gap-1.5 sm:gap-2 mb-1.5 sm:mb-2">
                    <img src="/gold-favicon-32x32.png" alt="AUXG" className="w-6 h-6 sm:w-8 sm:h-8" />
                    <div>
                      <p className="text-xs sm:text-sm font-medium text-slate-800 dark:text-white">AUXG</p>
                      <p className="text-[10px] sm:text-xs text-slate-600 dark:text-slate-400">{wx.gold}</p>
                    </div>
                  </div>
                  <p className="text-base sm:text-lg font-bold text-yellow-500">
                    {auxgBalance.toFixed(2)}g
                  </p>
                  <p className="text-[10px] sm:text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                    ${(auxgBalance * (metalAskPrices?.AUXG || 0)).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                  </p>
                  {(allocationAmounts?.auxg || 0) > 0 && (
                    <div className="text-[9px] text-emerald-500 dark:text-emerald-400 mt-1">
                      ✓ {(allocationAmounts?.auxg || 0).toFixed(2)}g allocated
                    </div>
                  )}
                </button>

                {/* AUXS */}
                <button
                  onClick={() => setSelectedMetal("AUXS")}
                  className="p-3 sm:p-4 rounded-lg sm:rounded-xl bg-stone-200 dark:bg-slate-800 border border-stone-300 dark:border-slate-700 hover:border-gray-400/50 transition-all text-left group"
                >
                  <div className="flex items-center gap-1.5 sm:gap-2 mb-1.5 sm:mb-2">
                    <img src="/silver-favicon-32x32.png" alt="AUXS" className="w-6 h-6 sm:w-8 sm:h-8" />
                    <div>
                      <p className="text-xs sm:text-sm font-medium text-slate-800 dark:text-white">AUXS</p>
                      <p className="text-[10px] sm:text-xs text-slate-600 dark:text-slate-400">{wx.silver}</p>
                    </div>
                  </div>
                  <p className="text-base sm:text-lg font-bold text-gray-400">
                    {auxsBalance.toFixed(2)}g
                  </p>
                  <p className="text-[10px] sm:text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                    ${(auxsBalance * (metalAskPrices?.AUXS || 0)).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                  </p>
                  {(allocationAmounts?.auxs || 0) > 0 && (
                    <div className="text-[9px] text-emerald-500 dark:text-emerald-400 mt-1">
                      ✓ {(allocationAmounts?.auxs || 0).toFixed(2)}g allocated
                    </div>
                  )}
                </button>

                {/* AUXPT */}
                <button
                  onClick={() => setSelectedMetal("AUXPT")}
                  className="p-3 sm:p-4 rounded-lg sm:rounded-xl bg-stone-200 dark:bg-slate-800 border border-stone-300 dark:border-slate-700 hover:border-cyan-400/50 transition-all text-left group"
                >
                  <div className="flex items-center gap-1.5 sm:gap-2 mb-1.5 sm:mb-2">
                    <img src="/platinum-favicon-32x32.png" alt="AUXPT" className="w-6 h-6 sm:w-8 sm:h-8" />
                    <div>
                      <p className="text-xs sm:text-sm font-medium text-slate-800 dark:text-white">AUXPT</p>
                      <p className="text-[10px] sm:text-xs text-slate-600 dark:text-slate-400">{wx.platinum}</p>
                    </div>
                  </div>
                  <p className="text-base sm:text-lg font-bold text-cyan-400">
                    {auxptBalance.toFixed(2)}g
                  </p>
                  <p className="text-[10px] sm:text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                    ${(auxptBalance * (metalAskPrices?.AUXPT || 0)).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                  </p>
                  {(allocationAmounts?.auxpt || 0) > 0 && (
                    <div className="text-[9px] text-emerald-500 dark:text-emerald-400 mt-1">
                      ✓ {(allocationAmounts?.auxpt || 0).toFixed(2)}g allocated
                    </div>
                  )}
                </button>

                {/* AUXPD */}
                <button
                  onClick={() => setSelectedMetal("AUXPD")}
                  className="p-3 sm:p-4 rounded-lg sm:rounded-xl bg-stone-200 dark:bg-slate-800 border border-stone-300 dark:border-slate-700 hover:border-orange-400/50 transition-all text-left group"
                >
                  <div className="flex items-center gap-1.5 sm:gap-2 mb-1.5 sm:mb-2">
                    <img src="/palladium-favicon-32x32.png" alt="AUXPD" className="w-6 h-6 sm:w-8 sm:h-8" />
                    <div>
                      <p className="text-xs sm:text-sm font-medium text-slate-800 dark:text-white">AUXPD</p>
                      <p className="text-[10px] sm:text-xs text-slate-600 dark:text-slate-400">{wx.palladium}</p>
                    </div>
                  </div>
                  <p className="text-base sm:text-lg font-bold text-orange-400">
                    {auxpdBalance.toFixed(2)}g
                  </p>
                  <p className="text-[10px] sm:text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                    ${(auxpdBalance * (metalAskPrices?.AUXPD || 0)).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                  </p>
                  {(allocationAmounts?.auxpd || 0) > 0 && (
                    <div className="text-[9px] text-emerald-500 dark:text-emerald-400 mt-1">
                      ✓ {(allocationAmounts?.auxpd || 0).toFixed(2)}g allocated
                    </div>
                  )}
                </button>
              </div>
            </div>

            {/* Digital Assets Section */}
            <div>
              <h3 className="text-base sm:text-lg font-semibold text-slate-800 dark:text-white mb-3 sm:mb-4 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                {wx.digitalAssets || "Digital Assets"}
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-3">
                {/* ETH */}
                <button
                  onClick={() => setSelectedCrypto("ETH")}
                  className="p-3 sm:p-4 rounded-lg sm:rounded-xl bg-stone-200 dark:bg-slate-800 border border-stone-300 dark:border-slate-700 hover:border-[#627EEA]/50 transition-all text-left"
                >
                  <div className="flex items-center gap-1.5 sm:gap-2 mb-1.5 sm:mb-2">
                    <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-[#627EEA] flex items-center justify-center">
                      <span className="text-white font-bold text-xs sm:text-base">Ξ</span>
                    </div>
                    <div>
                      <p className="text-xs sm:text-sm font-medium text-slate-800 dark:text-white">ETH</p>
                      <p className="text-[10px] sm:text-xs text-slate-600 dark:text-slate-400">Ethereum</p>
                    </div>
                  </div>
                  <p className="text-base sm:text-lg font-bold text-[#627EEA]">{ethBalance.toFixed(4)} ETH</p>
                  <p className="text-[10px] sm:text-xs text-slate-600 dark:text-slate-400">≈ ${(ethBalance * (cryptoPrices?.eth || 3500)).toFixed(2)}</p>
                </button>

                {/* BTC */}
                <button
                  onClick={() => setSelectedCrypto("BTC")}
                  className="p-3 sm:p-4 rounded-lg sm:rounded-xl bg-stone-200 dark:bg-slate-800 border border-stone-300 dark:border-slate-700 hover:border-[#F7931A]/50 transition-all text-left"
                >
                  <div className="flex items-center gap-1.5 sm:gap-2 mb-1.5 sm:mb-2">
                    <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-[#F7931A] flex items-center justify-center">
                      <span className="text-white font-bold text-xs sm:text-base">₿</span>
                    </div>
                    <div>
                      <p className="text-xs sm:text-sm font-medium text-slate-800 dark:text-white">BTC</p>
                      <p className="text-[10px] sm:text-xs text-slate-600 dark:text-slate-400">Bitcoin</p>
                    </div>
                  </div>
                  <p className="text-base sm:text-lg font-bold text-[#F7931A]">{btcBalance.toFixed(6)} BTC</p>
                  <p className="text-[10px] sm:text-xs text-slate-600 dark:text-slate-400">≈ ${(btcBalance * (cryptoPrices?.btc || 95000)).toFixed(2)}</p>
                </button>

                {/* XRP */}
                <button
                  onClick={() => setSelectedCrypto("XRP")}
                  className="p-3 sm:p-4 rounded-lg sm:rounded-xl bg-stone-200 dark:bg-slate-800 border border-stone-300 dark:border-slate-700 hover:border-slate-400/50 transition-all text-left"
                >
                  <div className="flex items-center gap-1.5 sm:gap-2 mb-1.5 sm:mb-2">
                    <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-[#23292F] flex items-center justify-center border border-slate-600">
                      <span className="text-white font-bold text-xs sm:text-base">✕</span>
                    </div>
                    <div>
                      <p className="text-xs sm:text-sm font-medium text-slate-800 dark:text-white">XRP</p>
                      <p className="text-[10px] sm:text-xs text-slate-600 dark:text-slate-400">Ripple</p>
                    </div>
                  </div>
                  <p className="text-base sm:text-lg font-bold text-slate-700 dark:text-slate-300">{xrpBalance.toFixed(2)} XRP</p>
                  <p className="text-[10px] sm:text-xs text-slate-600 dark:text-slate-400">≈ ${(xrpBalance * (cryptoPrices?.xrp || 2.2)).toFixed(2)}</p>
                </button>

                {/* SOL */}
                <button
                  onClick={() => setSelectedCrypto("SOL")}
                  className="p-3 sm:p-4 rounded-lg sm:rounded-xl bg-stone-200 dark:bg-slate-800 border border-stone-300 dark:border-slate-700 hover:border-[#9945FF]/50 transition-all text-left"
                >
                  <div className="flex items-center gap-1.5 sm:gap-2 mb-1.5 sm:mb-2">
                    <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-[#9945FF] flex items-center justify-center">
                      <span className="text-white font-bold text-xs sm:text-base">◎</span>
                    </div>
                    <div>
                      <p className="text-xs sm:text-sm font-medium text-slate-800 dark:text-white">SOL</p>
                      <p className="text-[10px] sm:text-xs text-slate-600 dark:text-slate-400">Solana</p>
                    </div>
                  </div>
                  <p className="text-base sm:text-lg font-bold text-[#9945FF]">{solBalance.toFixed(3)} SOL</p>
                  <p className="text-[10px] sm:text-xs text-slate-600 dark:text-slate-400">≈ ${(solBalance * (cryptoPrices?.sol || 200)).toFixed(2)}</p>
                </button>
              </div>
            </div>

            {/* Ecosystem Description */}
            <div className="p-3 sm:p-4 rounded-lg sm:rounded-xl bg-stone-200 dark:bg-slate-800/30 border border-stone-300 dark:border-slate-700">
              <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                {wx.ecosystemDesc}
              </p>
            </div>
            {/* Allocated & Staked Section - Tıklanabilir */}
            <div>
              <h3 className="text-sm sm:text-lg font-semibold text-slate-800 dark:text-white mb-2 sm:mb-4">
                {wx.allocatedAndStaked}
              </h3>
              
              {(() => {
                // Calculate totals from stakedAmounts (from WalletContext/API)
                const metalPricesLocal = {
                  AUXG: bidPrices?.AUXG || 95,
                  AUXS: bidPrices?.AUXS || 1.15,
                  AUXPT: bidPrices?.AUXPT || 32,
                  AUXPD: bidPrices?.AUXPD || 35,
                };

                // Staked totals from WalletContext (API'den geliyor)
                // Mobil "Kilitli" ile eşleşmesi için sadece staked göster
                const totalGramsLocal: Record<string, number> = {
                  AUXG: stakedAmounts?.auxg || 0,
                  AUXS: stakedAmounts?.auxs || 0,
                  AUXPT: stakedAmounts?.auxpt || 0,
                  AUXPD: stakedAmounts?.auxpd || 0,
                };
                
                // Total USD value
                const totalValue = Object.entries(totalGramsLocal).reduce((sum, [metal, grams]) => {
                  return sum + grams * (metalPricesLocal[metal as keyof typeof metalPricesLocal] || 0);
                }, 0);
                
                // Average APY from staking
                const avgAPY = activeStakes?.length > 0
                  ? activeStakes.reduce((sum, s) => sum + s.apyPercent, 0) / activeStakes.length
                  : 0;
                
                // Build display string
                const displayParts: string[] = [];
                Object.entries(totalGramsLocal).forEach(([metal, grams]) => {
                  if (grams > 0) displayParts.push(`${grams.toFixed(2)}g ${metal}`);
                });
                const displayString = displayParts.length > 0 ? displayParts.join(" + ") : "0g";
                
                // Preview items - SADECE staking göster (mobil ile aynı)
                // Allocations artık gösterilmiyor çünkü mobilde de gösterilmiyor
                const previewItems: Array<{icon: string; label: string; grams: number; value: number; type: string}> = [];
                activeStakes?.slice(0, 4).forEach((s) => {
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
                    value: s.amountGrams * (metalPricesLocal[s.metalSymbol as keyof typeof metalPricesLocal] || 0),
                    type: "staking"
                  });
                });
                
                const isLoadingLocked = allocLoading || stakingLoading || !pricesLoaded;
                
                return (
                  <button
                    onClick={() => setShowLockedAssets(true)}
                    className="w-full text-left rounded-lg sm:rounded-xl border border-amber-500/30 bg-amber-500/5 hover:bg-amber-500/10 hover:border-amber-500/50 p-3 sm:p-4 transition-all group"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                        <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-amber-500/20 flex items-center justify-center flex-shrink-0">
                          <svg className="w-5 h-5 sm:w-6 sm:h-6 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                          </svg>
                        </div>
                        <div className="min-w-0">
                          <p className="text-[10px] sm:text-sm text-slate-600 dark:text-slate-400">{wx.totalLocked}</p>
                          <p className="text-sm sm:text-xl font-bold text-slate-800 dark:text-white truncate">
                            {isLoadingLocked ? "..." : displayString}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
                        <div className="text-right">
                          <p className="text-[10px] sm:text-xs text-slate-600 dark:text-slate-400">{wx.estValue}</p>
                          <p className="text-sm sm:text-lg font-semibold text-amber-400">
                            ${isLoadingLocked ? "..." : totalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </p>
                          {avgAPY > 0 && (
                            <p className="text-[10px] sm:text-xs text-emerald-400">+{avgAPY.toFixed(2)}% APY</p>
                          )}
                        </div>
                        <svg className="w-4 h-4 sm:w-5 sm:h-5 text-slate-400 group-hover:text-amber-500 transition-colors hidden sm:block" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    </div>
                    
                    {/* Locked Items Preview */}
                    {previewItems.length > 0 && (
                      <div className="mt-3 sm:mt-4 pt-3 sm:pt-4 border-t border-amber-500/20 space-y-1.5 sm:space-y-2">
                        {previewItems.slice(0, 4).map((item, idx) => (
                          <div key={idx} className="flex items-center justify-between p-1.5 sm:p-2 rounded-lg bg-stone-200/50 dark:bg-slate-800/50">
                            <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
                              <img src={item.icon} alt="" className="w-5 h-5 sm:w-6 sm:h-6 flex-shrink-0" />
                              <span className="text-xs sm:text-sm text-slate-700 dark:text-white truncate">{item.label}</span>
                              {item.type === "staking" && (
                                <span className="text-[10px] sm:text-xs px-1 sm:px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex-shrink-0">Stake</span>
                              )}
                            </div>
                            <div className="text-right flex-shrink-0">
                              <span className="text-xs sm:text-sm font-medium text-slate-700 dark:text-white">{item.grams.toFixed(2)}g</span>
                              <span className="text-[10px] sm:text-xs text-slate-600 dark:text-slate-400 ml-1 sm:ml-2 hidden sm:inline">≈ ${item.value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    
                    {/* "Detayları Gör" hint */}
                    <div className="mt-2 sm:mt-3 text-center">
                      <span className="text-[10px] sm:text-xs text-amber-600 dark:text-amber-400 group-hover:underline">
                        {wx.viewDetails} →
                      </span>
                    </div>
                  </button>
                );
              })()}
            </div>
            {/* Price Alerts */}
            <PriceAlertsPanel
              walletAddress={currentAddress || ""}
              lang={lang as "tr" | "en" | "de" | "fr" | "ar" | "ru"}
              currentPrices={currentPrices}
            />
            
            {/* Varlıklarım Nerede / Where are my Assets */}
            <AllocationFinder lang={lang as "tr" | "en" | "de" | "fr" | "ar" | "ru"} />

            {/* Transaction History */}
            <TransactionHistory lang={lang as "tr" | "en" | "de" | "fr" | "ar" | "ru"} />
          </>
        ) : (
          /* Connect Wallet Message */
          <div className="rounded-lg sm:rounded-xl border border-stone-200 dark:border-slate-800 bg-slate-900/50 p-4 sm:p-6">
            <div className="text-center py-8 sm:py-12">
              <div className="w-16 h-16 sm:w-20 sm:h-20 mx-auto mb-4 sm:mb-6 rounded-full bg-stone-200 dark:bg-slate-800 flex items-center justify-center">
                <svg className="w-8 h-8 sm:w-10 sm:h-10 text-slate-500 dark:text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                </svg>
              </div>
              <h3 className="text-lg sm:text-xl font-semibold text-slate-200 mb-1.5 sm:mb-2">
                {lang === "tr" ? "Cüzdan Bağlantısı Gerekli" : "Wallet Connection Required"}
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mb-4 sm:mb-6 px-4">
                {lang === "tr"
                  ? "Varlıklarınızı görmek ve yönetmek için cüzdanınızı bağlayın"
                  : "Connect your wallet to view and manage your assets"}
              </p>
              <div className="flex justify-center">
                <ConnectButton accountStatus="avatar" chainStatus="none" showBalance={false} />
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
          lang={lang as "tr" | "en" | "de" | "fr" | "ar" | "ru"}
         
        />
      )}

      {/* Buy Metal Modal (Legacy - replaced by AllocationWizard) */}
      {showBuyMetal && (
        <BuyMetalModal
          isOpen={showBuyMetal}
          onClose={() => setShowBuyMetal(false)}
          lang={lang as "tr" | "en" | "de" | "fr" | "ar" | "ru"}

        />
      )}

      {/* Allocation Wizard - 3-Step Institutional Flow */}
      {showAllocationWizard && (
        <AllocationWizard
          lang={lang as "tr" | "en" | "de" | "fr" | "ar" | "ru"}
          onClose={() => setShowAllocationWizard(false)}
          prices={{
            XAUt: metalAskPrices?.AUXG || 92,
            XAGt: metalAskPrices?.AUXS || 1.05,
            XPTt: metalAskPrices?.AUXPT || 32,
            XPDt: metalAskPrices?.AUXPD || 32,
          }}
        />
      )}

      {selectedMetal && (
        <MetalConvertModal
          isOpen={!!selectedMetal}
          onClose={() => setSelectedMetal(null)}
          metal={selectedMetal}
          lang={lang as "tr" | "en" | "de" | "fr" | "ar" | "ru"}
         
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
              {/* Kripto Yatır - NowPayments */}
              <button
                onClick={() => {
                  setShowDeposit(false);
                  setShowOnChainDeposit(true);
                }}
                className="w-full p-4 rounded-xl border-2 border-blue-500/50 hover:border-blue-500 bg-blue-50 dark:bg-blue-500/10 hover:bg-blue-100 dark:hover:bg-blue-500/20 transition-all text-left flex items-start gap-4 relative overflow-hidden"
              >
                <div className="absolute top-2 right-2 px-2 py-0.5 bg-emerald-500 text-white text-xs font-bold rounded">
                  {lang === "tr" ? "+%15 BONUS" : "+15% BONUS"}
                </div>
                <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center flex-shrink-0">
                  <span className="text-blue-600 dark:text-blue-400 font-bold text-lg">₿</span>
                </div>
                <div className="flex-1">
                  <h4 className="text-slate-800 dark:text-white font-semibold mb-1">
                    {lang === "tr" ? "Kripto Yatır" :
                     lang === "de" ? "Krypto Einzahlen" :
                     lang === "fr" ? "Dépôt Crypto" :
                     lang === "ar" ? "إيداع العملات المشفرة" :
                     lang === "ru" ? "Депозит Крипто" :
                     "Deposit Crypto"}
                  </h4>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    {lang === "tr" 
                      ? "BTC, ETH, USDT, SOL ve daha fazlası" 
                      : "BTC, ETH, USDT, SOL and more"}
                  </p>
                </div>
                <svg className="w-5 h-5 text-blue-500 flex-shrink-0 mt-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
      <TransferModal isOpen={showTransfer} onClose={() => setShowTransfer(false)} lang={lang} />
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
          lang={lang as "tr" | "en" | "de" | "fr" | "ar" | "ru"}
         
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
              lang={lang as "tr" | "en" | "de" | "fr" | "ar" | "ru"}
          isOpen={showBuyWithUsd}
          onClose={() => setShowBuyWithUsd(false)}
         
          walletAddress={currentAddress || ""}
        />
      )}

      {/* USD Convert Modal */}
      {showUsdConvert && (
        <UsdConvertModal
              lang={lang as "tr" | "en" | "de" | "fr" | "ar" | "ru"}
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
              lang={(["de", "fr", "ar", "ru"].includes(lang) ? "en" : lang) as "tr" | "en"}
          walletAddress={currentAddress || ""}
         
          onClose={() => setShowAdvancedSecurity(false)}
        />
      )}

      {/* Price Alerts Modal */}
      {showPriceAlerts && (
        <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center z-50 p-2 sm:p-4">
          <div className="bg-white dark:bg-slate-900 rounded-xl sm:rounded-2xl border border-stone-300 dark:border-slate-700 w-full max-w-2xl max-h-[95vh] sm:max-h-[90vh] overflow-hidden shadow-xl">
            <div className="flex items-center justify-between p-2.5 sm:p-4 border-b border-stone-200 dark:border-slate-700 bg-white dark:bg-slate-900">
              <h3 className="text-sm sm:text-lg font-semibold text-slate-800 dark:text-white">
                {wx.priceAlerts}
              </h3>
              <button onClick={() => setShowPriceAlerts(false)} className="p-1.5 sm:p-2 hover:bg-stone-200 dark:hover:bg-slate-800 rounded-lg">
                <svg className="w-4 h-4 sm:w-5 sm:h-5 text-slate-600 dark:text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-2.5 sm:p-4 overflow-y-auto max-h-[calc(95vh-60px)] sm:max-h-[calc(90vh-80px)] bg-white dark:bg-slate-900">
              <PriceAlertManager walletAddress={currentAddress || ""} currentPrices={currentPrices} />
            </div>
          </div>
        </div>
      )}

      {/* Recurring Buy Modal */}
      {showRecurringBuy && (
        <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center z-50 p-2 sm:p-4">
          <div className="bg-white dark:bg-slate-900 rounded-xl sm:rounded-2xl border border-stone-300 dark:border-slate-700 w-full max-w-2xl max-h-[95vh] sm:max-h-[90vh] overflow-hidden shadow-xl">
            <div className="flex items-center justify-between p-2.5 sm:p-4 border-b border-stone-200 dark:border-slate-700 bg-white dark:bg-slate-900">
              <h3 className="text-sm sm:text-lg font-semibold text-slate-800 dark:text-white">
                {wx.recurringBuy}
              </h3>
              <button onClick={() => setShowRecurringBuy(false)} className="p-1.5 sm:p-2 hover:bg-stone-200 dark:hover:bg-slate-800 rounded-lg">
                <svg className="w-4 h-4 sm:w-5 sm:h-5 text-slate-600 dark:text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-2.5 sm:p-4 overflow-y-auto max-h-[calc(95vh-60px)] sm:max-h-[calc(90vh-80px)] bg-white dark:bg-slate-900">
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
        <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center z-50 p-2 sm:p-4">
          <div className="bg-white dark:bg-slate-900 rounded-xl sm:rounded-2xl border border-stone-300 dark:border-slate-700 w-full max-w-2xl max-h-[95vh] sm:max-h-[90vh] overflow-hidden shadow-xl">
            <div className="flex items-center justify-between p-2.5 sm:p-4 border-b border-stone-200 dark:border-slate-700 bg-white dark:bg-slate-900">
              <h3 className="text-sm sm:text-lg font-semibold text-slate-800 dark:text-white">
                {wx.pendingOrders}
              </h3>
              <button onClick={() => setShowPendingOrders(false)} className="p-1.5 sm:p-2 hover:bg-stone-200 dark:hover:bg-slate-800 rounded-lg">
                <svg className="w-4 h-4 sm:w-5 sm:h-5 text-slate-600 dark:text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-2.5 sm:p-4 overflow-y-auto max-h-[calc(95vh-60px)] sm:max-h-[calc(90vh-80px)] bg-white dark:bg-slate-900">
              <LimitOrdersList 
                walletAddress={currentAddress || ""} 
                lang={lang as "tr" | "en" | "de" | "fr" | "ar" | "ru"}
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

      {/* Add Funds Modal - Unified Crypto + Card */}
      {showAddFunds && (
        <AddFundsModal
          isOpen={showAddFunds}
          onClose={() => setShowAddFunds(false)}
          lang={lang as "tr" | "en" | "de" | "fr" | "ar" | "ru"}
          walletAddress={currentAddress || ""}
          defaultTab={addFundsDefaultTab}
          bankOnly={addFundsDefaultTab === "bank"}
        />
      )}
    </main>
  );
}