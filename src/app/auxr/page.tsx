// ============================================================================
// /auxr — Web buy/sell UI for the AUXR basket reserve token
// ----------------------------------------------------------------------------
// Mirrors the mobile (tabs)/auxr screen. Reads:
//   GET  /api/auxr/price     — live NAV + buy/sell quotes (30s polling)
//   GET  /api/auxr/reserves  — current backing pool grams
//   GET  /api/user/balance   — user balances per token
//   GET  /api/user/profile   — KYC status
//   POST /api/auxr/buy       — debit AUXM/USDT/USDC, credit AUXR
//   POST /api/auxr/sell      — burn AUXR, credit AUXM
//
// Bilingual EN/TR. Locale-aware uppercase via toLocaleUpperCase so the
// Turkish dotless-i bug never surfaces.
// ============================================================================

"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import TopNav from "@/components/TopNav";
import { useLanguage } from "@/components/LanguageContext";
import { useWallet } from "@/components/WalletContext";

// ── Types ────────────────────────────────────────────────────────────────────
type Pricing = {
  navUSD: number;
  buyPriceUSD: number;
  sellPriceUSD: number;
  spread: { buyBps: number; sellBps: number };
  components: Record<"gold" | "silver" | "platinum" | "palladium", {
    gramsPerUnit: number;
    spotUSDPerGram: number;
    valueUSD: number;
    weightPct: number;
  }>;
  basket: {
    weights: { gold: number; silver: number; platinum: number; palladium: number };
    gramsPerUnit: { gold: number; silver: number; platinum: number; palladium: number };
    referenceNavUSD: number;
  };
  constraints: { minPurchaseUSD: number };
};

type Reserves = {
  supply: { unitsAUXR: number; marketCapUSD: number };
  reserves: { grams: { gold: number; silver: number; platinum: number; palladium: number } };
  required: { grams: { gold: number; silver: number; platinum: number; palladium: number } };
  backing: {
    ratio: { gold: number; silver: number; platinum: number; palladium: number; weakest: number };
    fullyBacked: boolean;
  };
};

// ── i18n ─────────────────────────────────────────────────────────────────────
const T = {
  en: {
    title: "AUXR — Reserve Basket",
    subtitle: "55% gold · 30% silver · 10% platinum · 5% palladium · price-tracked, fully hedged",
    live: "LIVE",
    nav: "NAV per AUXR",
    bid: "Sell",
    ask: "Buy",
    mode_buy: "Buy",
    mode_sell: "Sell",
    amountUSD: "Amount (USD)",
    amountAUXR: "Amount (AUXR)",
    payWith: "Pay with",
    available: "Available",
    receive: "You receive",
    proceedsLabel: "You receive",
    buyCTA: "Buy AUXR",
    sellCTA: "Sell AUXR",
    useMax: "Max",
    minIs: "Minimum",
    insufficient: "Insufficient balance",
    kycRequired: "Identity verification required",
    kycDesc: "AUXR tracks a precious-metals basket, hedged 1:1 with metal positions. Complete a 2-minute KYC to trade.",
    verifyNow: "Verify Identity",
    backingPool: "Backing Pool",
    backingSub: (n: string) => `Metal-price exposure hedged 1:1 for ${n} AUXR in circulation.`,
    fullyBacked: "FULLY BACKED",
    required: "Required",
    backed: "backed",
    emptyPool: "As users mint AUXR, we hedge each mint 1:1 with metal positions held via a regulated broker — not allocated physical bullion.",
    composition: "Basket Composition",
    compositionSub: "Fixed grams per unit. Weights drift naturally with spot prices.",
    th_metal: "Metal",
    th_gpu: "Grams / AUXR",
    th_spot: "Spot",
    th_weight: "Weight",
    viewPoR: "View Proof of Reserves →",
    disclosure: "AUXR is an off-chain basket token whose NAV tracks 55/30/10/5 Au/Ag/Pt/Pd at global spot. Its metal-price exposure is hedged 1:1 through metal derivative and unallocated positions with a regulated metals broker — it is not backed by allocated physical bullion. Spread is 50 bps each side (1% round-trip). Phase 1A — internal beta. Cash-settled at NAV; not physically redeemable.",
    success_buy: "Purchase complete",
    success_sell: "Sale complete",
    boughtSummary: (units: string, usd: string) => `${usd} → ${units} AUXR`,
    soldSummary: (units: string, usd: string) => `${units} AUXR → ${usd}`,
    done: "Done",
    connect_prompt: "Connect your account to trade AUXR.",
    demo_prompt: "Switch to a live account to trade AUXR.",
    metals: { gold: "Gold", silver: "Silver", platinum: "Platinum", palladium: "Palladium" },
  },
  tr: {
    title: "AUXR — Rezerv Sepeti",
    subtitle: "%55 altın · %30 gümüş · %10 platin · %5 paladyum · fiyat-endeksli, tam hedge'li",
    live: "CANLI",
    nav: "AUXR Başına NAV",
    bid: "Sat",
    ask: "Al",
    mode_buy: "Al",
    mode_sell: "Sat",
    amountUSD: "Tutar (USD)",
    amountAUXR: "Miktar (AUXR)",
    payWith: "Ödeme aracı",
    available: "Kullanılabilir",
    receive: "Alacağınız",
    proceedsLabel: "Alacağınız",
    buyCTA: "AUXR Al",
    sellCTA: "AUXR Sat",
    useMax: "Tümü",
    minIs: "Minimum",
    insufficient: "Yetersiz bakiye",
    kycRequired: "Kimlik doğrulaması gerekli",
    kycDesc: "AUXR bir değerli metal sepetini izler, metal pozisyonlarıyla 1:1 hedge edilir. İşlem için 2 dakikalık KYC tamamlayın.",
    verifyNow: "Kimlik Doğrula",
    backingPool: "Rezerv Havuzu",
    backingSub: (n: string) => `Dolaşımdaki ${n} AUXR için metal-fiyat exposure'ı 1:1 hedge edilir.`,
    fullyBacked: "TAM DESTEKLİ",
    required: "Gerekli",
    backed: "destekli",
    emptyPool: "Kullanıcılar AUXR mint ettikçe, her mint düzenlenmiş bir broker'daki metal pozisyonlarıyla 1:1 hedge edilir — tahsisli fiziksel külçe değil.",
    composition: "Sepet Bileşimi",
    compositionSub: "Birim başına sabit gram. Ağırlıklar spot fiyatlarla doğal olarak değişir.",
    th_metal: "Metal",
    th_gpu: "Gram / AUXR",
    th_spot: "Spot",
    th_weight: "Ağırlık",
    viewPoR: "Rezerv Kanıtını Gör →",
    disclosure: "AUXR, NAV'ı global spot'ta 55/30/10/5 Au/Ag/Pt/Pd sepetini izleyen off-chain bir token'dır. Metal-fiyat exposure'ı, düzenlenmiş bir metal broker'ı nezdinde metal türev ve unallocated pozisyonlarla 1:1 hedge edilir — tahsisli fiziksel külçe ile desteklenmez. Spread her yönde 50 bps (toplam %1). Phase 1A — iç beta. NAV'dan nakit uzlaşı; fiziksel teslim alınamaz.",
    success_buy: "Alım tamamlandı",
    success_sell: "Satış tamamlandı",
    boughtSummary: (units: string, usd: string) => `${usd} → ${units} AUXR`,
    soldSummary: (units: string, usd: string) => `${units} AUXR → ${usd}`,
    done: "Tamam",
    connect_prompt: "AUXR alıp satmak için hesabınızı bağlayın.",
    demo_prompt: "AUXR alıp satmak için canlı hesaba geçin.",
    metals: { gold: "Altın", silver: "Gümüş", platinum: "Platin", palladium: "Paladyum" },
  },
  de: {
    title: "AUXR — Reservekorb",
    subtitle: "55% Gold · 30% Silber · 10% Platin · 5% Palladium · preisbasiert, voll abgesichert",
    live: "LIVE",
    nav: "NAV pro AUXR",
    bid: "Verkaufen",
    ask: "Kaufen",
    mode_buy: "Kaufen",
    mode_sell: "Verkaufen",
    amountUSD: "Betrag (USD)",
    amountAUXR: "Menge (AUXR)",
    payWith: "Bezahlen mit",
    available: "Verfügbar",
    receive: "Sie erhalten",
    proceedsLabel: "Sie erhalten",
    buyCTA: "AUXR kaufen",
    sellCTA: "AUXR verkaufen",
    useMax: "Max",
    minIs: "Minimum",
    insufficient: "Unzureichendes Guthaben",
    kycRequired: "Identitätsprüfung erforderlich",
    kycDesc: "AUXR bildet einen Edelmetallkorb ab und wird 1:1 mit Metallpositionen abgesichert. Schließen Sie eine 2-minütige KYC ab, um zu handeln.",
    verifyNow: "Identität verifizieren",
    backingPool: "Deckungspool",
    backingSub: (n: string) => `Metallpreis-Exposure 1:1 abgesichert für ${n} AUXR im Umlauf.`,
    fullyBacked: "VOLL GEDECKT",
    required: "Erforderlich",
    backed: "gedeckt",
    emptyPool: "Wenn Nutzer AUXR minten, sichern wir jeden Mint 1:1 mit Metallpositionen bei einem regulierten Broker ab — kein zugewiesenes physisches Metall.",
    composition: "Korbzusammensetzung",
    compositionSub: "Feste Gramm pro Einheit. Gewichte verschieben sich natürlich mit den Spotpreisen.",
    th_metal: "Metall",
    th_gpu: "Gramm / AUXR",
    th_spot: "Spot",
    th_weight: "Gewicht",
    viewPoR: "Reservenachweis ansehen →",
    disclosure: "AUXR ist ein Off-Chain-Korb-Token, dessen NAV 55/30/10/5 Au/Ag/Pt/Pd zum globalen Spotpreis abbildet. Das Metallpreis-Exposure wird 1:1 über Metallderivate und nicht zugewiesene Positionen bei einem regulierten Metallbroker abgesichert — es ist nicht durch zugewiesenes physisches Metall gedeckt. Spread 50 bps je Seite (1% Round-Trip). Phase 1A — interne Beta. Barausgleich zum NAV; keine physische Einlösung.",
    success_buy: "Kauf abgeschlossen",
    success_sell: "Verkauf abgeschlossen",
    boughtSummary: (units: string, usd: string) => `${usd} → ${units} AUXR`,
    soldSummary: (units: string, usd: string) => `${units} AUXR → ${usd}`,
    done: "Fertig",
    connect_prompt: "Verbinden Sie Ihr Konto, um AUXR zu handeln.",
    demo_prompt: "Wechseln Sie zu einem Live-Konto, um AUXR zu handeln.",
    metals: { gold: "Gold", silver: "Silber", platinum: "Platin", palladium: "Palladium" },
  },
  fr: {
    title: "AUXR — Panier de réserve",
    subtitle: "55% or · 30% argent · 10% platine · 5% palladium · indexé, entièrement couvert",
    live: "EN DIRECT",
    nav: "VNI par AUXR",
    bid: "Vendre",
    ask: "Acheter",
    mode_buy: "Acheter",
    mode_sell: "Vendre",
    amountUSD: "Montant (USD)",
    amountAUXR: "Quantité (AUXR)",
    payWith: "Payer avec",
    available: "Disponible",
    receive: "Vous recevez",
    proceedsLabel: "Vous recevez",
    buyCTA: "Acheter AUXR",
    sellCTA: "Vendre AUXR",
    useMax: "Max",
    minIs: "Minimum",
    insufficient: "Solde insuffisant",
    kycRequired: "Vérification d'identité requise",
    kycDesc: "AUXR suit un panier de métaux précieux, couvert 1:1 par des positions sur métaux. Complétez une KYC de 2 minutes pour trader.",
    verifyNow: "Vérifier l'identité",
    backingPool: "Pool de couverture",
    backingSub: (n: string) => `Exposition au prix des métaux couverte 1:1 pour ${n} AUXR en circulation.`,
    fullyBacked: "ENTIÈREMENT COUVERT",
    required: "Requis",
    backed: "couvert",
    emptyPool: "Lorsque les utilisateurs mintent des AUXR, nous couvrons chaque mint 1:1 avec des positions sur métaux détenues via un courtier réglementé — pas de métal physique alloué.",
    composition: "Composition du panier",
    compositionSub: "Grammes fixes par unité. Les poids varient naturellement avec les prix spot.",
    th_metal: "Métal",
    th_gpu: "Grammes / AUXR",
    th_spot: "Spot",
    th_weight: "Poids",
    viewPoR: "Voir la preuve de réserves →",
    disclosure: "AUXR est un token panier off-chain dont la VNI suit 55/30/10/5 Au/Ag/Pt/Pd au spot mondial. Son exposition au prix des métaux est couverte 1:1 via des dérivés et positions non allouées auprès d'un courtier en métaux réglementé — il n'est pas adossé à du métal physique alloué. Spread de 50 pb de chaque côté (1% aller-retour). Phase 1A — bêta interne. Règlement en espèces à la VNI ; non remboursable en physique.",
    success_buy: "Achat terminé",
    success_sell: "Vente terminée",
    boughtSummary: (units: string, usd: string) => `${usd} → ${units} AUXR`,
    soldSummary: (units: string, usd: string) => `${units} AUXR → ${usd}`,
    done: "Terminé",
    connect_prompt: "Connectez votre compte pour trader AUXR.",
    demo_prompt: "Passez à un compte réel pour trader AUXR.",
    metals: { gold: "Or", silver: "Argent", platinum: "Platine", palladium: "Palladium" },
  },
  ar: {
    title: "AUXR — سلة الاحتياطي",
    subtitle: "55% ذهب · 30% فضة · 10% بلاتين · 5% بلاديوم · مُسعّر ومُحوّط بالكامل",
    live: "مباشر",
    nav: "صافي قيمة الأصول لكل AUXR",
    bid: "بيع",
    ask: "شراء",
    mode_buy: "شراء",
    mode_sell: "بيع",
    amountUSD: "المبلغ (USD)",
    amountAUXR: "الكمية (AUXR)",
    payWith: "الدفع بواسطة",
    available: "متاح",
    receive: "ستستلم",
    proceedsLabel: "ستستلم",
    buyCTA: "شراء AUXR",
    sellCTA: "بيع AUXR",
    useMax: "الحد الأقصى",
    minIs: "الحد الأدنى",
    insufficient: "رصيد غير كافٍ",
    kycRequired: "التحقق من الهوية مطلوب",
    kycDesc: "يتتبع AUXR سلة معادن نفيسة، مُحوّطة 1:1 بمراكز على المعادن. أكمل التحقق (KYC) خلال دقيقتين للتداول.",
    verifyNow: "التحقق من الهوية",
    backingPool: "مجمع التغطية",
    backingSub: (n: string) => `تغطية سعر المعادن 1:1 لعدد ${n} AUXR المتداولة.`,
    fullyBacked: "مغطى بالكامل",
    required: "المطلوب",
    backed: "مغطى",
    emptyPool: "عندما يقوم المستخدمون بسك AUXR، نقوم بتحويط كل سك 1:1 عبر مراكز على المعادن لدى وسيط منظّم — وليس معدناً مادياً مخصصاً.",
    composition: "تكوين السلة",
    compositionSub: "غرامات ثابتة لكل وحدة. تتغير الأوزان طبيعياً مع الأسعار الفورية.",
    th_metal: "المعدن",
    th_gpu: "غرام / AUXR",
    th_spot: "فوري",
    th_weight: "الوزن",
    viewPoR: "عرض إثبات الاحتياطي ←",
    disclosure: "AUXR رمز سلة خارج السلسلة، تتبع قيمته الصافية سلة 55/30/10/5 من الذهب والفضة والبلاتين والبلاديوم بالسعر الفوري العالمي. يتم تحويط تعرضه لسعر المعادن 1:1 عبر مشتقات ومراكز غير مخصصة لدى وسيط معادن منظّم — وهو غير مدعوم بمعدن مادي مخصص. الفارق 50 نقطة أساس لكل جهة (1% ذهاباً وإياباً). المرحلة 1A — نسخة تجريبية داخلية. تسوية نقدية بصافي القيمة؛ غير قابل للاسترداد مادياً.",
    success_buy: "اكتمل الشراء",
    success_sell: "اكتمل البيع",
    boughtSummary: (units: string, usd: string) => `${usd} → ${units} AUXR`,
    soldSummary: (units: string, usd: string) => `${units} AUXR → ${usd}`,
    done: "تم",
    connect_prompt: "اربط حسابك لتداول AUXR.",
    demo_prompt: "انتقل إلى حساب مباشر لتداول AUXR.",
    metals: { gold: "ذهب", silver: "فضة", platinum: "بلاتين", palladium: "بلاديوم" },
  },
  ru: {
    title: "AUXR — Резервная корзина",
    subtitle: "55% золото · 30% серебро · 10% платина · 5% палладий · по рынку, полностью хеджировано",
    live: "LIVE",
    nav: "NAV за AUXR",
    bid: "Продать",
    ask: "Купить",
    mode_buy: "Купить",
    mode_sell: "Продать",
    amountUSD: "Сумма (USD)",
    amountAUXR: "Количество (AUXR)",
    payWith: "Оплата",
    available: "Доступно",
    receive: "Вы получите",
    proceedsLabel: "Вы получите",
    buyCTA: "Купить AUXR",
    sellCTA: "Продать AUXR",
    useMax: "Макс",
    minIs: "Минимум",
    insufficient: "Недостаточно средств",
    kycRequired: "Требуется верификация личности",
    kycDesc: "AUXR отслеживает корзину драгметаллов, хеджируется 1:1 позициями по металлам. Пройдите 2-минутную KYC для торговли.",
    verifyNow: "Верифицировать личность",
    backingPool: "Пул обеспечения",
    backingSub: (n: string) => `Экспозиция на цену металлов хеджирована 1:1 для ${n} AUXR в обращении.`,
    fullyBacked: "ПОЛНОСТЬЮ ОБЕСПЕЧЕНО",
    required: "Требуется",
    backed: "обеспечено",
    emptyPool: "Когда пользователи минтят AUXR, мы хеджируем каждый минт 1:1 позициями по металлам у регулируемого брокера — не выделенным физическим металлом.",
    composition: "Состав корзины",
    compositionSub: "Фиксированные граммы на единицу. Веса естественно меняются со спот-ценами.",
    th_metal: "Металл",
    th_gpu: "Грамм / AUXR",
    th_spot: "Спот",
    th_weight: "Вес",
    viewPoR: "Смотреть подтверждение резервов →",
    disclosure: "AUXR — офф-чейн токен-корзина, NAV которого отслеживает 55/30/10/5 Au/Ag/Pt/Pd по мировому споту. Его экспозиция на цену металлов хеджируется 1:1 через металлические деривативы и неаллоцированные позиции у регулируемого брокера — он не обеспечен выделенным физическим металлом. Спред 50 бпс с каждой стороны (1% туда-обратно). Фаза 1A — внутренняя бета. Денежный расчёт по NAV; без физического погашения.",
    success_buy: "Покупка завершена",
    success_sell: "Продажа завершена",
    boughtSummary: (units: string, usd: string) => `${usd} → ${units} AUXR`,
    soldSummary: (units: string, usd: string) => `${units} AUXR → ${usd}`,
    done: "Готово",
    connect_prompt: "Подключите аккаунт для торговли AUXR.",
    demo_prompt: "Переключитесь на реальный аккаунт для торговли AUXR.",
    metals: { gold: "Золото", silver: "Серебро", platinum: "Платина", palladium: "Палладий" },
  },
} as const;

const BUY_PRESETS = [30, 100, 250, 500];
const METAL_KEYS = ["gold", "silver", "platinum", "palladium"] as const;
const SYMBOLS = { gold: "Au", silver: "Ag", platinum: "Pt", palladium: "Pd" };
const COLORS = { gold: "#D4AF37", silver: "#C0C0C0", platinum: "#E5E4E2", palladium: "#CED0DD" };

function fmtUSD(n: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 }).format(n);
}
function fmtGrams(g: number) {
  if (Math.abs(g) >= 1000) return `${(g / 1000).toFixed(3)} kg`;
  if (g === 0) return "0 g";
  if (Math.abs(g) < 0.01) return `${g.toFixed(5)} g`;
  return `${g.toFixed(4)} g`;
}

export default function AuxrPage() {
  const { lang } = useLanguage();
  const t = T[((lang in T ? lang : "en") as keyof typeof T)];
  const upper = useCallback(
    (s: string) => {
      const loc = lang === "tr" ? "tr-TR" : lang === "de" ? "de-DE" : lang === "fr" ? "fr-FR"
        : lang === "ru" ? "ru-RU" : lang === "ar" ? "ar" : "en-US";
      try { return s.toLocaleUpperCase(loc); }
      catch { return s.toUpperCase(); }
    },
    [lang]
  );
  const { isDemoMode } = useWallet();

  // Wallet address from localStorage (matches /allocate pattern).
  const [address, setAddress] = useState<string | null>(null);
  useEffect(() => {
    const a = typeof window === "undefined" ? null : localStorage.getItem("auxite_wallet_address");
    if (a) setAddress(a);
  }, []);

  const [pricing, setPricing] = useState<Pricing | null>(null);
  const [reserves, setReserves] = useState<Reserves | null>(null);
  const [balances, setBalances] = useState({ auxm: 0, bonus: 0, usdt: 0, usdc: 0, usd: 0, btc: 0, eth: 0, auxr: 0 });
  const [cryptoPx, setCryptoPx] = useState({ btc: 0, eth: 0 });
  const [kycVerified, setKycVerified] = useState(false);

  const [mode, setMode] = useState<"buy" | "sell">("buy");
  const [buyAmount, setBuyAmount] = useState("100");
  const [sellUnits, setSellUnits] = useState("");
  const [paymentToken, setPaymentToken] = useState<"auxm" | "usdt" | "usdc" | "usd" | "btc" | "eth">("auxm");

  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<null | { mode: "buy" | "sell"; units: number; usd: number }>(null);

  // ── Data loading ───────────────────────────────────────────────────────────
  const loadPricing = useCallback(async () => {
    try {
      const r = await fetch("/api/auxr/price", { cache: "no-store" });
      const j = await r.json();
      if (j?.success) setPricing(j);
    } catch {}
  }, []);
  const loadReserves = useCallback(async () => {
    try {
      const r = await fetch("/api/auxr/reserves", { cache: "no-store" });
      const j = await r.json();
      if (j?.success) setReserves(j);
    } catch {}
  }, []);
  const loadCrypto = useCallback(async () => {
    try {
      const d = await (await fetch("/api/crypto", { cache: "no-store" })).json();
      setCryptoPx({ btc: Number(d.bitcoin?.usd || 0), eth: Number(d.ethereum?.usd || 0) });
    } catch {}
  }, []);
  const loadUser = useCallback(async () => {
    if (!address) return;
    try {
      const [balR, profR] = await Promise.all([
        fetch(`/api/user/balance?address=${address}`, { cache: "no-store" }),
        fetch(`/api/user/profile?address=${address}`, { cache: "no-store" }),
      ]);
      const balJ = await balR.json();
      const profJ = await profR.json();
      const b = balJ?.balances || {};
      setBalances({
        auxm: parseFloat(String(b.auxm || 0)) || 0,
        bonus: parseFloat(String(b.bonusAuxm || 0)) || 0,
        usdt: parseFloat(String(b.usdt || 0)) || 0,
        usdc: parseFloat(String(b.usdc || 0)) || 0,
        usd: parseFloat(String(b.usd || 0)) || 0,
        btc: parseFloat(String(b.btc || 0)) || 0,
        eth: parseFloat(String(b.eth || 0)) || 0,
        auxr: parseFloat(String(b.auxr || 0)) || 0,
      });
      const k = profJ?.profile?.kycStatus || profJ?.profile?.kycLevel || "none";
      setKycVerified(k === "approved" || k === "verified" || k === "enhanced");
    } catch {}
  }, [address]);

  useEffect(() => {
    loadPricing();
    loadReserves();
    loadUser();
    loadCrypto();
    const interval = setInterval(() => { loadPricing(); loadReserves(); loadCrypto(); }, 30_000);
    return () => clearInterval(interval);
  }, [loadPricing, loadReserves, loadUser, loadCrypto]);

  // Pre-select the rail the user tapped in the vault Liquidity chooser (?fund=).
  useEffect(() => {
    const f = new URLSearchParams(window.location.search).get("fund")?.toLowerCase();
    if (f && ["auxm", "usdt", "usdc", "usd", "btc", "eth"].includes(f)) {
      setPaymentToken(f as "auxm" | "usdt" | "usdc" | "usd" | "btc" | "eth");
    }
  }, []);

  // ── Derived ─────────────────────────────────────────────────────────────────
  const buyAmountNum = parseFloat(buyAmount) || 0;
  const sellUnitsNum = parseFloat(sellUnits) || 0;
  const minUSD = pricing?.constraints.minPurchaseUSD ?? 100;
  const totalAuxm = balances.auxm + balances.bonus;
  // railBalance is always the USD value available on the chosen rail.
  const railBalance =
    paymentToken === "auxm" ? totalAuxm
    : paymentToken === "usdt" ? balances.usdt
    : paymentToken === "usdc" ? balances.usdc
    : paymentToken === "usd" ? balances.usd
    : paymentToken === "btc" ? balances.btc * cryptoPx.btc
    : balances.eth * cryptoPx.eth;
  const railLabel =
    paymentToken === "auxm" ? "AUXM"
    : paymentToken === "usdt" ? "USDT"
    : paymentToken === "usdc" ? "USDC"
    : paymentToken === "usd" ? "USD"
    : paymentToken.toUpperCase();
  const expectedUnits = pricing && pricing.buyPriceUSD > 0 ? buyAmountNum / pricing.buyPriceUSD : 0;
  const expectedProceeds = pricing ? sellUnitsNum * pricing.sellPriceUSD : 0;
  const canBuy = !!pricing && !!address && !isDemoMode && kycVerified && buyAmountNum >= minUSD && buyAmountNum <= railBalance;
  const canSell = !!pricing && !!address && !isDemoMode && kycVerified && sellUnitsNum > 0 && sellUnitsNum <= balances.auxr;

  // ── Submit ─────────────────────────────────────────────────────────────────
  const submitBuy = async () => {
    if (!canBuy || submitting) return;
    setSubmitting(true); setErr(null);
    const refId = `web-buy-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    try {
      const r = await fetch("/api/auxr/buy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address, usdAmount: buyAmountNum, paymentToken, source: "web", refId }),
      });
      const j = await r.json();
      if (j?.success) {
        setOk({ mode: "buy", units: j.unitsAUXR, usd: buyAmountNum });
        loadUser();
        loadReserves();
      } else {
        setErr(j?.error || "buy_failed");
      }
    } catch (e: any) {
      setErr(e?.message || "buy_failed");
    } finally {
      setSubmitting(false);
    }
  };

  const submitSell = async () => {
    if (!canSell || submitting) return;
    setSubmitting(true); setErr(null);
    const refId = `web-sell-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    try {
      const r = await fetch("/api/auxr/sell", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address, unitsAUXR: sellUnitsNum, source: "web", refId }),
      });
      const j = await r.json();
      if (j?.success) {
        setOk({ mode: "sell", units: sellUnitsNum, usd: j.proceedsUSD });
        loadUser();
        loadReserves();
      } else {
        setErr(j?.error || "sell_failed");
      }
    } catch (e: any) {
      setErr(e?.message || "sell_failed");
    } finally {
      setSubmitting(false);
    }
  };

  const fullyBacked = reserves?.backing.fullyBacked ?? false;

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <TopNav />

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        {/* Header */}
        <header className="flex flex-wrap items-baseline justify-between gap-3">
          <div>
            <div className="flex items-baseline gap-3">
              <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">{t.title}</h1>
              <span className="text-xs px-2 py-0.5 rounded bg-[#BFA181]/20 text-[#BFA181] font-semibold tracking-wider">
                BETA
              </span>
            </div>
            <p className="text-sm text-slate-400 mt-1">{t.subtitle}</p>
          </div>
          <div className="flex items-center gap-2 text-xs px-2 py-1 rounded bg-emerald-500/20 text-emerald-300">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block animate-pulse" />
            {upper(t.live)}
          </div>
        </header>

        {/* NAV card */}
        <div className="rounded-2xl bg-zinc-900/80 border border-white/5 p-6">
          <div className="text-xs text-slate-500 tracking-wider mb-1">{upper(t.nav)}</div>
          <div className="text-4xl font-bold text-[#BFA181]">
            {pricing ? `$${pricing.navUSD.toFixed(4)}` : "—"}
          </div>
          <div className="grid grid-cols-2 gap-4 mt-4 max-w-md">
            <div>
              <div className="text-[10px] text-slate-500 tracking-wider">{upper(t.bid)}</div>
              <div className="text-sm font-semibold">{pricing ? `$${pricing.sellPriceUSD.toFixed(4)}` : "—"}</div>
            </div>
            <div className="text-right">
              <div className="text-[10px] text-slate-500 tracking-wider">{upper(t.ask)}</div>
              <div className="text-sm font-semibold">{pricing ? `$${pricing.buyPriceUSD.toFixed(4)}` : "—"}</div>
            </div>
          </div>
          <div className="grid grid-cols-4 gap-3 mt-5 pt-4 border-t border-white/5 text-center">
            {METAL_KEYS.map((m) => (
              <div key={m}>
                <div className="text-[10px] text-slate-500">{SYMBOLS[m]}</div>
                <div className="text-sm font-semibold" style={{ color: COLORS[m] }}>
                  {pricing?.components[m].weightPct.toFixed(1) ?? "—"}%
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Trade card */}
        <div className="rounded-2xl bg-zinc-900/80 border border-white/5 p-6">
          {/* Mode toggle */}
          <div className="grid grid-cols-2 gap-2 mb-5">
            {(["buy", "sell"] as const).map((m) => {
              const active = mode === m;
              return (
                <button
                  key={m}
                  onClick={() => { setMode(m); setErr(null); setOk(null); }}
                  className={`py-2.5 rounded-lg text-sm font-semibold transition-colors ${
                    active
                      ? "bg-[#BFA181] text-zinc-950"
                      : "bg-transparent text-slate-300 border border-white/5 hover:border-white/15"
                  }`}
                >
                  {m === "buy" ? t.mode_buy : t.mode_sell}
                </button>
              );
            })}
          </div>

          {/* Gates */}
          {!address ? (
            <div className="text-center py-8 text-slate-400">{t.connect_prompt}</div>
          ) : isDemoMode ? (
            <div className="text-center py-8 text-slate-400">{t.demo_prompt}</div>
          ) : !kycVerified ? (
            <div className="text-center py-8">
              <div className="text-slate-300 font-semibold mb-1">{t.kycRequired}</div>
              <div className="text-sm text-slate-500 mb-4 max-w-md mx-auto">{t.kycDesc}</div>
              <Link href="/kyc" className="inline-block px-5 py-2 rounded-lg bg-[#BFA181] text-zinc-950 font-semibold text-sm hover:bg-[#D4B47A]">
                {t.verifyNow}
              </Link>
            </div>
          ) : ok ? (
            <div className="text-center py-8">
              <div className="w-14 h-14 mx-auto rounded-full bg-emerald-500/20 flex items-center justify-center mb-3">
                <svg className="w-8 h-8 text-emerald-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div className="text-emerald-400 font-semibold text-lg">
                {ok.mode === "buy" ? t.success_buy : t.success_sell}
              </div>
              <div className="text-sm text-slate-400 mt-1">
                {ok.mode === "buy"
                  ? t.boughtSummary(ok.units.toFixed(6), fmtUSD(ok.usd))
                  : t.soldSummary(ok.units.toFixed(6), fmtUSD(ok.usd))}
              </div>
              <button
                onClick={() => { setOk(null); setBuyAmount("100"); setSellUnits(""); }}
                className="mt-5 px-5 py-2 rounded-lg bg-[#BFA181] text-zinc-950 font-semibold text-sm"
              >
                {t.done}
              </button>
            </div>
          ) : mode === "buy" ? (
            <>
              <label className="text-xs text-slate-500 tracking-wider">{upper(t.amountUSD)}</label>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-3xl text-slate-500 font-light">$</span>
                <input
                  type="number"
                  value={buyAmount}
                  onChange={(e) => { setBuyAmount(e.target.value); setErr(null); }}
                  className="bg-transparent text-3xl font-bold flex-1 outline-none min-w-0"
                  placeholder="0"
                />
              </div>
              <div className="text-xs text-slate-500 mt-1">
                ≈ {expectedUnits.toFixed(6)} AUXR · {pricing?.spread.buyBps ?? 50}bps spread
              </div>

              {/* Amount presets */}
              <div className="grid grid-cols-4 gap-2 mt-4">
                {BUY_PRESETS.map((p) => (
                  <button
                    key={p}
                    onClick={() => setBuyAmount(String(p))}
                    className={`py-2 rounded-lg text-sm font-semibold border transition-colors ${
                      buyAmountNum === p
                        ? "bg-[#BFA181]/20 border-[#BFA181] text-white"
                        : "bg-transparent border-white/5 text-slate-300 hover:border-white/15"
                    }`}
                  >
                    ${p}
                  </button>
                ))}
              </div>

              {/* Rail picker */}
              <div className="mt-5">
                <label className="text-xs text-slate-500 tracking-wider">{upper(t.payWith)}</label>
                <div className="grid grid-cols-3 gap-2 mt-1">
                  {([
                    { key: "auxm" as const, label: "AUXM", bal: totalAuxm },
                    { key: "usdt" as const, label: "USDT", bal: balances.usdt },
                    { key: "usdc" as const, label: "USDC", bal: balances.usdc },
                    { key: "usd" as const, label: "USD", bal: balances.usd },
                    { key: "btc" as const, label: "BTC", bal: balances.btc * cryptoPx.btc },
                    { key: "eth" as const, label: "ETH", bal: balances.eth * cryptoPx.eth },
                  ]).map((r) => {
                    const active = paymentToken === r.key;
                    const aff = r.bal >= buyAmountNum && r.bal > 0;
                    return (
                      <button
                        key={r.key}
                        onClick={() => { setPaymentToken(r.key); setErr(null); }}
                        className={`py-2 px-2 rounded-lg border transition-colors ${
                          active
                            ? "bg-[#BFA181]/20 border-[#BFA181]"
                            : "bg-transparent border-white/5 hover:border-white/15"
                        } ${r.bal > 0 ? "opacity-100" : "opacity-40"}`}
                      >
                        <div className="text-sm font-semibold">{r.label}</div>
                        <div className={`text-[10px] ${aff ? "text-slate-500" : "text-amber-400"}`}>
                          ${r.bal.toFixed(2)}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Available row */}
              <div className="flex justify-between items-center mt-4 pt-4 border-t border-white/5 text-sm">
                <span className="text-slate-500">{upper(t.available)}</span>
                <span className="font-semibold">${railBalance.toFixed(2)} {railLabel}</span>
              </div>

              {err && (
                <div className="mt-3 px-3 py-2 rounded-lg bg-red-500/15 border border-red-500/40 text-sm text-red-300">
                  {err}
                </div>
              )}
              {buyAmountNum > railBalance && (
                <div className="mt-2 text-xs text-amber-400 text-center">{t.insufficient} ({railLabel})</div>
              )}
              {buyAmountNum > 0 && buyAmountNum < minUSD && (
                <div className="mt-2 text-xs text-amber-400 text-center">{t.minIs} ${minUSD}</div>
              )}

              <button
                disabled={!canBuy || submitting}
                onClick={submitBuy}
                className={`w-full mt-4 py-3 rounded-xl font-semibold text-sm transition-colors ${
                  canBuy && !submitting
                    ? "bg-[#BFA181] text-zinc-950 hover:bg-[#D4B47A]"
                    : "bg-zinc-800 text-slate-500 cursor-not-allowed"
                }`}
              >
                {submitting ? "..." : `${t.buyCTA} $${buyAmountNum.toFixed(0)}`}
              </button>
            </>
          ) : (
            <>
              <label className="text-xs text-slate-500 tracking-wider">{upper(t.amountAUXR)}</label>
              <div className="flex items-baseline gap-2 mt-1">
                <input
                  type="number"
                  value={sellUnits}
                  onChange={(e) => { setSellUnits(e.target.value); setErr(null); }}
                  className="bg-transparent text-3xl font-bold flex-1 outline-none min-w-0"
                  placeholder="0"
                />
                <span className="text-base text-slate-500 font-semibold">AUXR</span>
              </div>
              <div className="text-xs text-slate-500 mt-1">
                ≈ {fmtUSD(expectedProceeds)} AUXM
              </div>
              <button
                onClick={() => setSellUnits(String(balances.auxr))}
                className="mt-3 text-xs text-[#BFA181] font-semibold hover:underline"
              >
                {t.useMax}: {balances.auxr.toFixed(6)} AUXR
              </button>

              {err && (
                <div className="mt-3 px-3 py-2 rounded-lg bg-red-500/15 border border-red-500/40 text-sm text-red-300">
                  {err}
                </div>
              )}

              <button
                disabled={!canSell || submitting}
                onClick={submitSell}
                className={`w-full mt-4 py-3 rounded-xl font-semibold text-sm transition-colors ${
                  canSell && !submitting
                    ? "bg-[#BFA181] text-zinc-950 hover:bg-[#D4B47A]"
                    : "bg-zinc-800 text-slate-500 cursor-not-allowed"
                }`}
              >
                {submitting ? "..." : t.sellCTA}
              </button>
            </>
          )}
        </div>

        {/* Backing Pool */}
        <div className="rounded-2xl bg-zinc-900/80 border border-white/5 p-6">
          <div className="flex items-center justify-between mb-1">
            <h2 className="text-base font-semibold">{t.backingPool}</h2>
            {fullyBacked && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 font-semibold tracking-wider">
                ● {upper(t.fullyBacked)}
              </span>
            )}
          </div>
          <p className="text-sm text-slate-400 mb-4">
            {t.backingSub((reserves?.supply.unitsAUXR ?? 0).toLocaleString(undefined, { maximumFractionDigits: 4 }))}
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {METAL_KEYS.map((m) => {
              const ratio = reserves?.backing.ratio[m] ?? 1;
              const reserveG = reserves?.reserves.grams[m] ?? 0;
              const requiredG = reserves?.required.grams[m] ?? 0;
              const ok = ratio >= 0.9999;
              return (
                <div key={m} className="flex items-center justify-between rounded-lg bg-white/5 px-4 py-3">
                  <div>
                    <span className="font-semibold" style={{ color: COLORS[m] }}>{SYMBOLS[m]}</span>
                    <span className="ml-2 text-slate-300">{t.metals[m]}</span>
                    <div className="text-xs text-slate-500 mt-0.5">
                      {t.required}: {fmtGrams(requiredG)}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`font-semibold ${ok ? "text-emerald-400" : "text-amber-400"}`}>
                      {fmtGrams(reserveG)}
                    </div>
                    <div className="text-[10px] text-slate-500">
                      {(ratio * 100).toFixed(2)}% {t.backed}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          {reserves && reserves.supply.unitsAUXR === 0 && (
            <p className="text-xs text-slate-500 mt-3 italic">{t.emptyPool}</p>
          )}
          <Link
            href="/proof-of-reserves"
            className="inline-block mt-4 text-xs text-[#BFA181] font-semibold hover:underline"
          >
            {t.viewPoR}
          </Link>
        </div>

        {/* Composition table */}
        <div className="rounded-2xl bg-zinc-900/80 border border-white/5 overflow-hidden">
          <div className="p-6 pb-3">
            <h2 className="text-base font-semibold">{t.composition}</h2>
            <p className="text-sm text-slate-400 mt-1">{t.compositionSub}</p>
          </div>
          <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-white/[0.02] text-slate-500 text-xs tracking-wider">
              <tr>
                <th className="text-left py-3 px-3 sm:px-6">{upper(t.th_metal)}</th>
                <th className="text-right py-3 px-3 sm:px-6">{upper(t.th_gpu)}</th>
                <th className="text-right py-3 px-3 sm:px-6">{upper(t.th_spot)}</th>
                <th className="text-right py-3 px-3 sm:px-6">{upper(t.th_weight)}</th>
              </tr>
            </thead>
            <tbody>
              {METAL_KEYS.map((m) => (
                <tr key={m} className="border-t border-white/5">
                  <td className="py-3 px-3 sm:px-6">
                    <span className="font-semibold" style={{ color: COLORS[m] }}>{SYMBOLS[m]}</span>
                    <span className="ml-2 text-slate-400">{t.metals[m]}</span>
                  </td>
                  <td className="text-right py-3 px-3 sm:px-6 font-mono text-slate-300">
                    {pricing?.basket.gramsPerUnit[m].toFixed(5) ?? "—"}
                  </td>
                  <td className="text-right py-3 px-3 sm:px-6 font-mono text-slate-300">
                    {pricing ? fmtUSD(pricing.components[m].spotUSDPerGram) : "—"}
                  </td>
                  <td className="text-right py-3 px-3 sm:px-6 font-semibold">
                    {pricing ? pricing.components[m].weightPct.toFixed(2) + "%" : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </div>

        <p className="text-[11px] text-slate-500 leading-relaxed max-w-3xl">
          {t.disclosure}
        </p>
      </main>
    </div>
  );
}
