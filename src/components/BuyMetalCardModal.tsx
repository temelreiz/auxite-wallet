"use client";

// ════════════════════════════════════════════════════════════════════════════
// BUY METAL WITH CARD — Stripe-powered direct precious metal purchase
// ════════════════════════════════════════════════════════════════════════════
//
// Flow: pick metal → enter amount → quote → Stripe Elements → confirm → success
//
// Stripe ToS compliance: this UI is framed as PRECIOUS METAL purchase.
// The word "AUXM" is intentionally absent. The user buys grams of Gold/
// Silver/Platinum/Palladium directly with their card. AUXM is internal
// plumbing not exposed in this flow.
//
// API:
//   POST /api/stripe/create-payment-intent → { clientSecret, breakdown }
//   stripe.confirmPayment(...) → 3DS handled automatically by Elements
//   Webhook /api/stripe/webhook credits balance after payment_intent.succeeded
// ════════════════════════════════════════════════════════════════════════════

import { useState, useEffect, useMemo } from "react";
import { loadStripe, type Stripe as StripeJS } from "@stripe/stripe-js";
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { useWallet } from "@/components/WalletContext";
import { useLanguage } from "@/components/LanguageContext";
import { formatAmount } from "@/lib/format";
import { logEvent } from "@/lib/analytics";
import { fireConversion } from "@/lib/google-ads-conversion";

// ── Stripe.js singleton (lazy, browser-only) ───────────────────────────────
// loadStripe must only run in the browser (it injects a <script>). Even
// inside a "use client" file, top-level evaluation can run during SSR/build
// in some configurations. Defer initialization until first access.
let _stripePromise: Promise<StripeJS | null> | null = null;
function getStripePromise(): Promise<StripeJS | null> {
  if (typeof window === "undefined") return Promise.resolve(null);
  if (_stripePromise) return _stripePromise;
  const pk = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
  _stripePromise = pk ? loadStripe(pk) : Promise.resolve(null);
  return _stripePromise;
}

// ── i18n ───────────────────────────────────────────────────────────────────
const t = {
  tr: {
    title: "Kredi Kartı ile Metal Al",
    subtitle: "Anında değerli metal yatırımı",
    selectMetal: "Metal Seç",
    inputMode: "Tutar Tipi",
    byGrams: "Gram",
    byUsd: "USD",
    amount: "Miktar",
    youReceive: "Alacağın",
    pricePerGram: "Gram Fiyatı",
    cardFee: "İşlem Ücreti",
    totalCharge: "Toplam Ücret",
    continue: "Devam Et",
    payNow: "Şimdi Öde",
    processing: "İşleniyor...",
    paymentSuccess: "Ödeme Başarılı!",
    metalAllocated: "metalin hesabına eklendi",
    error: "Hata",
    close: "Kapat",
    back: "Geri",
    minAmount: "Minimum: $30",
    maxAmount: "Maksimum: $5,000",
    minGrams: "Çok düşük miktar, en az ~$30 değerinde olmalı",
    quoteError: "Fiyat alınamadı, tekrar dene",
    paymentInfo: "Kart bilgilerin Stripe'a doğrudan gönderilir, Auxite saklamaz.",
    metalPurchaseDisclaimer: "Bu işlem fiziksel olarak ayrılmış altın/gümüş/platin/paladyum alımıdır. Cüzdanına anında gram olarak yansır.",
    statementDescriptor: "Kart ekstresinde \"AURUM LEDGER\" görünür",
  },
  en: {
    title: "Buy Metal with Card",
    subtitle: "Instant precious metal investment",
    selectMetal: "Select Metal",
    inputMode: "Amount type",
    byGrams: "Grams",
    byUsd: "USD",
    amount: "Amount",
    youReceive: "You receive",
    pricePerGram: "Price per gram",
    cardFee: "Processing",
    totalCharge: "Total charge",
    continue: "Continue",
    payNow: "Pay Now",
    processing: "Processing...",
    paymentSuccess: "Payment Successful!",
    metalAllocated: "added to your balance",
    error: "Error",
    close: "Close",
    back: "Back",
    minAmount: "Minimum: $30",
    maxAmount: "Maximum: $5,000",
    minGrams: "Amount too small, must be ≥ ~$30",
    quoteError: "Failed to fetch price, please retry",
    paymentInfo: "Your card details are sent directly to Stripe; Auxite never stores them.",
    metalPurchaseDisclaimer: "This is a purchase of physically allocated gold/silver/platinum/palladium. Grams are credited to your vault instantly.",
    statementDescriptor: "Will appear as \"AURUM LEDGER\" on your card statement",
  },
};

type Lang = keyof typeof t;
const tr = (lang: Lang, key: keyof typeof t.en): string =>
  (t[lang] as any)?.[key] || t.en[key] || String(key);

// ── Metal config ───────────────────────────────────────────────────────────
type Metal = "AUXG" | "AUXS" | "AUXPT" | "AUXPD";

const METAL_INFO: Record<Metal, { name: string; nameTr: string; icon: string; color: string }> = {
  AUXG:  { name: "Gold",      nameTr: "Altın",    icon: "/auxg_icon.png",  color: "#BFA181" },
  AUXS:  { name: "Silver",    nameTr: "Gümüş",    icon: "/auxs_icon.png",  color: "#9CA3AF" },
  AUXPT: { name: "Platinum",  nameTr: "Platin",   icon: "/auxpt_icon.png", color: "#22D3EE" },
  AUXPD: { name: "Palladium", nameTr: "Paladyum", icon: "/auxpd_icon.png", color: "#A855F7" },
};
const METALS: Metal[] = ["AUXG", "AUXS", "AUXPT", "AUXPD"];

// ── Types ──────────────────────────────────────────────────────────────────
interface BuyMetalCardModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface Quote {
  metal: Metal;
  metalName: string;
  grams: number;
  amountUSD: number;
  pricePerGramUSD: number;
  baseAskPerGram: number;
  metalSpreadPct: number;
  cardBufferPct: number;
}

// ════════════════════════════════════════════════════════════════════════════
// MAIN MODAL
// ════════════════════════════════════════════════════════════════════════════
export function BuyMetalCardModal({ isOpen, onClose }: BuyMetalCardModalProps) {
  const { address, refreshBalances } = useWallet();
  const { lang } = useLanguage();
  const L = (lang as Lang) in t ? (lang as Lang) : "en";

  type Step = "form" | "pay" | "result";
  const [step, setStep] = useState<Step>("form");
  const [metal, setMetal] = useState<Metal>("AUXG");
  const [mode, setMode] = useState<"byGrams" | "byUsd">("byUsd");
  const [amountInput, setAmountInput] = useState<string>("100"); // default $100 USD
  const [quoting, setQuoting] = useState(false);
  const [quote, setQuote] = useState<Quote | null>(null);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [paymentIntentId, setPaymentIntentId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);
  // KYC limit state — mirrors server. null = haven't fetched yet.
  const [kycState, setKycState] = useState<{
    kycVerified: boolean;
    perTxLimitUSD: number;
    cumulativeLimit30dUSD: number;
    remainingUSD: number | null;
  } | null>(null);

  // Reset on open + analytics: modal opened
  useEffect(() => {
    if (isOpen) {
      setStep("form");
      setMetal("AUXG");
      setMode("byUsd");
      setAmountInput("100");
      setQuote(null);
      setClientSecret(null);
      setPaymentIntentId(null);
      setError(null);
      setResult(null);
      logEvent("card_purchase_modal_opened", { surface: "web" });
      // Fetch this user's KYC limit state so we can display proactive
      // "$X left without verification" copy and pre-block the form.
      if (address) {
        fetch(`/api/user/kyc-limits?address=${address}`)
          .then(r => r.ok ? r.json() : null)
          .then(d => { if (d) setKycState(d); })
          .catch(() => { /* silent — copy just falls back to defaults */ });
      }
    }
  }, [isOpen, address]);

  // Stripe Elements options memoized for stable reference.
  // MUST be declared above the early-return — Rules of Hooks: hooks
  // must run in the same order on every render.
  const elementsOptions = useMemo(
    () => (clientSecret ? { clientSecret, appearance: { theme: "stripe" as const } } : undefined),
    [clientSecret]
  );

  if (!isOpen) return null;

  const amountNum = parseFloat(amountInput) || 0;
  const canSubmit = amountNum > 0 && address && !quoting;

  const handleQuote = async () => {
    if (!canSubmit) return;
    // Pre-check soft KYC ceilings so the user doesn't see Stripe Elements
    // mount for an amount the server will reject anyway. Server still
    // enforces both gates (defense in depth).
    if (kycState && !kycState.kycVerified && mode === "byUsd") {
      if (amountNum > kycState.perTxLimitUSD) {
        setError(`Verify your identity to buy more than $${kycState.perTxLimitUSD}.`);
        return;
      }
      if (kycState.remainingUSD !== null && amountNum > kycState.remainingUSD) {
        setError(`You've used $${(kycState.cumulativeLimit30dUSD - kycState.remainingUSD).toFixed(0)} of your $${kycState.cumulativeLimit30dUSD} 30-day cap. Verify to continue.`);
        return;
      }
    }
    setError(null);
    setQuoting(true);
    logEvent("card_purchase_quote_requested", { surface: "web", metal, mode, amount: amountNum });
    try {
      const res = await fetch("/api/stripe/create-payment-intent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          metal,
          mode,
          grams: mode === "byGrams" ? amountNum : undefined,
          amountUSD: mode === "byUsd" ? amountNum : undefined,
          userAddress: address,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || tr(L, "quoteError"));

      setClientSecret(data.clientSecret);
      setPaymentIntentId(data.paymentIntentId);
      setQuote(data.breakdown);
      setStep("pay");
      logEvent("card_purchase_quote_received", {
        surface: "web", metal, grams: data.breakdown?.grams, amountUSD: data.breakdown?.amountUSD,
      });
    } catch (e: any) {
      const msg = e?.message || tr(L, "quoteError");
      setError(msg);
      logEvent("card_purchase_quote_failed", { surface: "web", metal, error: msg });
    } finally {
      setQuoting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4">
      <div className="absolute inset-0 bg-black/50 dark:bg-black/80 backdrop-blur-sm" onClick={onClose} />

      <div className="relative z-10 w-full max-w-md bg-white dark:bg-slate-900 rounded-xl sm:rounded-2xl border border-stone-300 dark:border-slate-700 overflow-hidden max-h-[90vh] flex flex-col shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between p-3 sm:p-4 border-b border-stone-200 dark:border-slate-800">
          <div className="flex items-center gap-2">
            {step === "pay" && (
              <button
                onClick={() => { setStep("form"); setClientSecret(null); setPaymentIntentId(null); }}
                className="p-1 hover:bg-stone-100 dark:hover:bg-slate-800 rounded-lg text-slate-600 dark:text-slate-400"
              >
                ←
              </button>
            )}
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-800 dark:text-white">
                {tr(L, "title")}
              </h2>
              <p className="text-[10px] sm:text-xs text-slate-500">{tr(L, "subtitle")}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 sm:p-2 hover:bg-stone-100 dark:hover:bg-slate-800 rounded-lg text-slate-600 dark:text-slate-400">✕</button>
        </div>

        {/* Body */}
        <div className="p-3 sm:p-4 space-y-3 overflow-y-auto flex-1 bg-stone-50 dark:bg-slate-900/50">
          {step === "form" && (
            <>
              {/* Metal selector */}
              <div>
                <label className="block text-xs sm:text-sm text-slate-600 dark:text-slate-400 mb-1.5 font-medium">
                  {tr(L, "selectMetal")}
                </label>
                <div className="grid grid-cols-4 gap-1.5">
                  {METALS.map((m) => {
                    const info = METAL_INFO[m];
                    const selected = metal === m;
                    return (
                      <button
                        key={m}
                        onClick={() => setMetal(m)}
                        className={`p-2 rounded-lg border-2 transition-all flex flex-col items-center gap-0.5 ${
                          selected
                            ? "border-[#BFA181] bg-[#BFA181]/10"
                            : "border-stone-200 dark:border-slate-700 hover:border-[#BFA181]/50 bg-white dark:bg-slate-800"
                        }`}
                      >
                        <img src={info.icon} alt={m} className="w-7 h-7" />
                        <span className="text-[10px] sm:text-xs font-semibold text-slate-800 dark:text-white">{m}</span>
                        <span className="text-[9px] text-slate-500">
                          {L === "tr" ? info.nameTr : info.name}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Mode toggle */}
              <div>
                <label className="block text-xs sm:text-sm text-slate-600 dark:text-slate-400 mb-1.5 font-medium">
                  {tr(L, "inputMode")}
                </label>
                <div className="flex gap-1.5">
                  {(["byUsd", "byGrams"] as const).map((m) => (
                    <button
                      key={m}
                      onClick={() => { setMode(m); setAmountInput(m === "byUsd" ? "100" : "1"); }}
                      className={`flex-1 py-2 rounded-lg border-2 transition-all text-xs font-semibold ${
                        mode === m
                          ? "border-[#BFA181] bg-[#BFA181]/10 text-[#BFA181]"
                          : "border-stone-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                      }`}
                    >
                      {tr(L, m)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Amount */}
              <div>
                <label className="block text-xs sm:text-sm text-slate-600 dark:text-slate-400 mb-1.5 font-medium">
                  {tr(L, "amount")} {mode === "byUsd" ? "(USD)" : "(g)"}
                </label>
                <input
                  type="number"
                  value={amountInput}
                  onChange={(e) => setAmountInput(e.target.value)}
                  placeholder={mode === "byUsd" ? "100" : "1"}
                  step="any"
                  className="w-full px-3 sm:px-4 py-2.5 rounded-lg bg-white dark:bg-slate-800 border border-stone-300 dark:border-slate-700 text-slate-800 dark:text-white text-base sm:text-lg font-semibold focus:outline-none focus:border-[#BFA181]"
                />
                <p className="text-[10px] text-slate-500 mt-1">
                  {tr(L, "minAmount")} · {tr(L, "maxAmount")}
                  {kycState && !kycState.kycVerified && mode === "byUsd" && (
                    <>
                      {" · "}
                      <span className="text-[#BFA181]">
                        {kycState.remainingUSD === null
                          ? `Up to $${kycState.perTxLimitUSD}/tx without verification`
                          : `$${kycState.remainingUSD.toFixed(0)} left this month without verification`}
                      </span>
                    </>
                  )}
                </p>
              </div>

              {/* Soft KYC nudge — same gating logic as mobile: per-tx OR
                  30d cumulative. Hidden in byGrams mode (we'd need a spot
                  conversion to gate accurately; backend still 403's). */}
              {kycState && !kycState.kycVerified && mode === "byUsd" && (() => {
                const overPerTx = amountNum > kycState.perTxLimitUSD;
                const over30d = kycState.remainingUSD !== null && amountNum > kycState.remainingUSD && !overPerTx;
                if (!overPerTx && !over30d) return null;
                return (
                  <div className="flex items-center gap-3 p-3 rounded-lg border border-[#BFA181]/40 bg-[#BFA181]/10">
                    <div className="text-xl">🛡️</div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs sm:text-sm font-semibold text-slate-800 dark:text-white">
                        {overPerTx
                          ? `Verify ID for purchases over $${kycState.perTxLimitUSD}`
                          : `You've hit your $${kycState.cumulativeLimit30dUSD}/30-day no-KYC cap`}
                      </div>
                      <div className="text-[10px] sm:text-[11px] text-slate-500 mt-0.5">
                        {overPerTx
                          ? "Single tx limit. Verify (3 min) to remove the cap."
                          : "Verify once to lift the rolling 30-day limit. 3 minutes."}
                      </div>
                    </div>
                    <a
                      href="/kyc-verification"
                      onClick={() => logEvent("kyc_cta_from_buy_modal", { surface: "web", amountUSD: amountNum, reason: overPerTx ? "per_tx" : "30d" })}
                      className="px-3 py-1.5 rounded-md bg-[#BFA181] text-black text-xs font-bold hover:bg-[#D4B47A] transition-colors whitespace-nowrap"
                    >
                      Verify
                    </a>
                  </div>
                );
              })()}

              {error && (
                <div className="p-2.5 rounded-lg bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30">
                  <p className="text-xs text-red-600 dark:text-red-400">⚠️ {error}</p>
                </div>
              )}

              <p className="text-[10px] sm:text-[11px] text-slate-500 dark:text-slate-400 italic px-1 leading-relaxed">
                {tr(L, "metalPurchaseDisclaimer")}
              </p>
            </>
          )}

          {step === "pay" && quote && clientSecret && elementsOptions && (
            <>
              <QuoteSummary quote={quote} L={L} />
              <Elements stripe={getStripePromise()} options={elementsOptions}>
                <PaymentForm
                  L={L}
                  paymentIntentId={paymentIntentId!}
                  metal={quote.metal}
                  grams={quote.grams}
                  onSuccess={async () => {
                    setResult({
                      success: true,
                      message: `${quote.grams.toFixed(4)}g ${METAL_INFO[quote.metal][L === "tr" ? "nameTr" : "name"]}`,
                    });
                    setStep("result");
                    logEvent("card_purchase_succeeded", {
                      surface: "web", metal: quote.metal, grams: quote.grams, amountUSD: quote.amountUSD,
                    });
                    // Google Ads conversion — fire on the client right at
                    // the moment the user sees the success screen. paymentIntentId
                    // is the natural dedupe key for Google Ads reports.
                    fireConversion("purchase", {
                      value: quote.amountUSD,
                      currency: "USD",
                      transactionId: paymentIntentId || undefined,
                    });
                    await refreshBalances();
                  }}
                  onError={(msg) => {
                    setResult({ success: false, message: msg });
                    logEvent("card_purchase_failed", {
                      surface: "web", metal: quote.metal, grams: quote.grams, error: msg,
                    });
                  }}
                />
              </Elements>
              <p className="text-[10px] text-slate-500 italic px-1">{tr(L, "paymentInfo")}</p>
              <p className="text-[10px] text-slate-500 italic px-1">{tr(L, "statementDescriptor")}</p>
            </>
          )}

          {step === "result" && result && (
            <div className="text-center py-6">
              <div
                className={`w-14 h-14 mx-auto mb-3 rounded-full flex items-center justify-center ${
                  result.success ? "bg-[#2F6F62]/20" : "bg-red-100 dark:bg-red-500/20"
                }`}
              >
                <span className="text-2xl">{result.success ? "✓" : "✕"}</span>
              </div>
              <h3
                className={`text-lg font-bold mb-2 ${
                  result.success ? "text-[#2F6F62]" : "text-red-600 dark:text-red-400"
                }`}
              >
                {result.success ? tr(L, "paymentSuccess") : tr(L, "error")}
              </h3>
              <p className="text-slate-600 dark:text-slate-400 text-sm mb-3">
                {result.success
                  ? `${result.message} ${tr(L, "metalAllocated")}`
                  : result.message}
              </p>
              <button
                onClick={onClose}
                className="px-6 py-2 bg-slate-200 dark:bg-slate-700 rounded-lg text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors"
              >
                {tr(L, "close")}
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        {step === "form" && (
          <div className="p-3 sm:p-4 border-t border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900">
            <button
              onClick={handleQuote}
              disabled={!canSubmit}
              className="w-full py-2.5 rounded-lg font-semibold text-sm sm:text-base text-white bg-gradient-to-r from-[#BFA181] to-[#D4B47A] hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {quoting ? tr(L, "processing") : tr(L, "continue")}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────

function QuoteSummary({ quote, L }: { quote: Quote; L: Lang }) {
  const info = METAL_INFO[quote.metal];
  return (
    <div className="p-3 rounded-lg bg-[#BFA181]/10 border border-[#BFA181]/30 space-y-1.5">
      <div className="flex justify-between items-center mb-1.5 pb-1.5 border-b border-[#BFA181]/20">
        <div className="flex items-center gap-2">
          <img src={info.icon} alt={quote.metal} className="w-7 h-7" />
          <div>
            <div className="font-semibold text-sm text-slate-800 dark:text-white">
              {L === "tr" ? info.nameTr : info.name}
            </div>
            <div className="text-[10px] text-slate-500">{quote.metal}</div>
          </div>
        </div>
        <div className="text-right">
          <div className="font-bold text-base text-slate-800 dark:text-white">
            {formatAmount(quote.grams, quote.metal)}g
          </div>
          <div className="text-[10px] text-slate-500">{tr(L, "youReceive")}</div>
        </div>
      </div>
      <div className="flex justify-between text-[11px]">
        <span className="text-slate-500">{tr(L, "pricePerGram")}</span>
        <span className="text-slate-700 dark:text-slate-300">${quote.pricePerGramUSD.toFixed(2)}</span>
      </div>
      <div className="flex justify-between text-[11px]">
        <span className="text-slate-500">{tr(L, "cardFee")}</span>
        <span className="text-slate-700 dark:text-slate-300">~{quote.cardBufferPct.toFixed(1)}%</span>
      </div>
      <div className="flex justify-between text-sm font-semibold pt-1 border-t border-[#BFA181]/20">
        <span className="text-slate-800 dark:text-white">{tr(L, "totalCharge")}</span>
        <span className="text-[#BFA181]">${quote.amountUSD.toFixed(2)}</span>
      </div>
    </div>
  );
}

function PaymentForm({
  L, paymentIntentId, metal, grams, onSuccess, onError,
}: {
  L: Lang;
  paymentIntentId: string;
  metal: Metal;
  grams: number;
  onSuccess: () => Promise<void>;
  onError: (msg: string) => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [submitting, setSubmitting] = useState(false);

  const handlePay = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    setSubmitting(true);
    logEvent("card_purchase_payment_attempted", { surface: "web", metal, grams });
    try {
      const result = await stripe.confirmPayment({
        elements,
        confirmParams: {
          // No redirect — handle inline. Stripe still redirects 3DS challenges
          // when needed, then comes back to this page automatically.
          return_url: window.location.href,
        },
        redirect: "if_required",
      });

      if (result.error) {
        onError(result.error.message || "Payment failed");
        return;
      }

      // Success — webhook will credit balance asynchronously.
      // Note: there's a small race where the user lands on the success screen
      // before the webhook runs (~1-3s). Balance refresh on success will pick
      // up the credit on the next call.
      await onSuccess();
    } catch (err: any) {
      onError(err?.message || "Payment failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handlePay} className="space-y-3">
      <PaymentElement options={{ layout: "tabs" }} />
      <button
        type="submit"
        disabled={!stripe || !elements || submitting}
        className="w-full py-2.5 rounded-lg font-semibold text-sm sm:text-base text-white bg-gradient-to-r from-[#BFA181] to-[#D4B47A] hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
      >
        {submitting ? tr(L, "processing") : tr(L, "payNow")}
      </button>
    </form>
  );
}

export default BuyMetalCardModal;
