"use client";

import { useState, useEffect } from "react";
import TopNav from "@/components/TopNav";
import { useLanguage } from "@/components/LanguageContext";
import { FundTab } from "@/components/funding/FundTab";
import { WithdrawTab } from "@/components/funding/WithdrawTab";
import { MetalConversionTab } from "@/components/funding/MetalConversionTab";
import { useDemoMode } from "@/hooks/useDemoMode";
import type { DemoWithdrawal } from "@/hooks/useDemoMode";

// ============================================
// FUNDING, WITHDRAWALS & METAL CONVERSION — Thin Orchestrator
// ============================================

const translations: Record<string, Record<string, string>> = {
  tr: {
    title: "Fonlama & Çekim",
    subtitle: "Saklama hesabınıza sermaye ekleyin, varlıklarınızı çekin veya metaller arası dönüşüm yapın",
    fundTab: "Fonlama",
    withdrawTab: "Çekim",
    convertTab: "Dönüşüm",
  },
  en: {
    title: "Funding & Withdrawals",
    subtitle: "Add capital to your custody account, withdraw your assets, or convert between metals",
    fundTab: "Fund",
    withdrawTab: "Withdraw",
    convertTab: "Convert",
  },
  de: {
    title: "Finanzierung & Abhebungen",
    subtitle: "Fügen Sie Kapital hinzu, heben Sie Vermögenswerte ab oder konvertieren Sie zwischen Metallen",
    fundTab: "Einzahlung",
    withdrawTab: "Abhebung",
    convertTab: "Konvertieren",
  },
  fr: {
    title: "Financement & Retraits",
    subtitle: "Ajoutez du capital, retirez vos actifs ou convertissez entre métaux",
    fundTab: "Financer",
    withdrawTab: "Retirer",
    convertTab: "Convertir",
  },
  ar: {
    title: "التمويل والسحوبات",
    subtitle: "أضف رأس المال أو اسحب أصولك أو حوّل بين المعادن",
    fundTab: "التمويل",
    withdrawTab: "السحب",
    convertTab: "تحويل",
  },
  ru: {
    title: "Финансирование и вывод",
    subtitle: "Пополните капитал, выведите активы или конвертируйте между металлами",
    fundTab: "Пополнение",
    withdrawTab: "Вывод",
    convertTab: "Конвертация",
  },
};

const demoTranslations: Record<string, Record<string, string>> = {
  en: {
    demoBadge: "Demo Mode",
    demoFundDisabled: "You're in Demo Mode. Real funding is not needed -- you have $10,000 virtual balance.",
    demoConvertNote: "Metal conversions in demo mode use your virtual balance.",
    // Withdraw
    withdrawTitle: "Simulate Withdrawal",
    withdrawDesc: "This is a simulated withdrawal. No real assets will be moved.",
    selectAsset: "Select Asset",
    amount: "Amount",
    destinationAddress: "Destination Address (simulated)",
    simulateWithdraw: "Simulate Withdrawal",
    processing: "Processing...",
    withdrawSuccess: "Withdrawal Simulated",
    withdrawSuccessMsg: "Your withdrawal of {amount} {asset} would be processed within 24 hours.",
    simulateAnother: "Simulate Another",
    insufficientBalance: "Insufficient demo balance",
    recentWithdrawals: "Recent Demo Withdrawals",
    noWithdrawals: "No simulated withdrawals yet",
    // Convert
    convertTitle: "Convert Assets",
    convertDesc: "Convert between your demo assets using real market prices.",
    from: "From",
    to: "To",
    estimatedReceive: "Estimated to receive",
    executeConvert: "Execute Conversion",
    convertSuccess: "Conversion Complete",
    convertSuccessMsg: "Converted {fromAmount} {fromAsset} to {toAmount} {toAsset}",
    convertAnother: "Convert More",
  },
  tr: {
    demoBadge: "Demo Modu",
    demoFundDisabled: "Demo Modundasiniz. Gercek fonlama gerekmez -- $10.000 sanal bakiyeniz var.",
    demoConvertNote: "Demo modunda donusumler sanal bakiyenizi kullanir.",
    withdrawTitle: "Cekim Simulasyonu",
    withdrawDesc: "Bu simule edilmis bir cekimdir. Gercek varlik hareketi yapilmaz.",
    selectAsset: "Varlik Secin",
    amount: "Miktar",
    destinationAddress: "Hedef Adres (simule)",
    simulateWithdraw: "Cekimi Simule Et",
    processing: "Isleniyor...",
    withdrawSuccess: "Cekim Simule Edildi",
    withdrawSuccessMsg: "{amount} {asset} cekiminiz 24 saat icinde islenecektir.",
    simulateAnother: "Baskasini Simule Et",
    insufficientBalance: "Yetersiz demo bakiye",
    recentWithdrawals: "Son Demo Cekimleri",
    noWithdrawals: "Henuz simule edilmis cekim yok",
    convertTitle: "Varlik Donusumu",
    convertDesc: "Demo varliklarinizi gercek piyasa fiyatlariyla donusturun.",
    from: "Kaynak",
    to: "Hedef",
    estimatedReceive: "Tahmini alinacak",
    executeConvert: "Donusumu Yap",
    convertSuccess: "Donusum Tamamlandi",
    convertSuccessMsg: "{fromAmount} {fromAsset} -> {toAmount} {toAsset} donusturuldu",
    convertAnother: "Daha Fazla Donustur",
  },
  de: {
    demoBadge: "Demo-Modus",
    demoFundDisabled: "Sie sind im Demo-Modus. Keine Einzahlung notig.",
    demoConvertNote: "Konvertierungen im Demo-Modus verwenden Ihr virtuelles Guthaben.",
    withdrawTitle: "Abhebung simulieren",
    withdrawDesc: "Dies ist eine simulierte Abhebung.",
    selectAsset: "Vermogenswert wahlen",
    amount: "Betrag",
    destinationAddress: "Zieladresse (simuliert)",
    simulateWithdraw: "Abhebung simulieren",
    processing: "Verarbeitung...",
    withdrawSuccess: "Abhebung simuliert",
    withdrawSuccessMsg: "Ihre Abhebung von {amount} {asset} wurde simuliert.",
    simulateAnother: "Weitere simulieren",
    insufficientBalance: "Unzureichendes Demo-Guthaben",
    recentWithdrawals: "Letzte Demo-Abhebungen",
    noWithdrawals: "Keine simulierten Abhebungen",
    convertTitle: "Vermogenswerte konvertieren",
    convertDesc: "Konvertieren Sie Demo-Vermogenswerte zu Marktpreisen.",
    from: "Von",
    to: "Nach",
    estimatedReceive: "Voraussichtlich erhalten",
    executeConvert: "Konvertierung ausfuhren",
    convertSuccess: "Konvertierung abgeschlossen",
    convertSuccessMsg: "{fromAmount} {fromAsset} in {toAmount} {toAsset} konvertiert",
    convertAnother: "Mehr konvertieren",
  },
  fr: {
    demoBadge: "Mode Demo",
    demoFundDisabled: "Vous etes en mode demo. Pas besoin de financement reel.",
    demoConvertNote: "Les conversions en mode demo utilisent votre solde virtuel.",
    withdrawTitle: "Simuler un retrait",
    withdrawDesc: "Ceci est un retrait simule.",
    selectAsset: "Selectionnez l'actif",
    amount: "Montant",
    destinationAddress: "Adresse de destination (simulee)",
    simulateWithdraw: "Simuler le retrait",
    processing: "Traitement...",
    withdrawSuccess: "Retrait simule",
    withdrawSuccessMsg: "Votre retrait de {amount} {asset} a ete simule.",
    simulateAnother: "Simuler un autre",
    insufficientBalance: "Solde demo insuffisant",
    recentWithdrawals: "Retraits demo recents",
    noWithdrawals: "Aucun retrait simule",
    convertTitle: "Convertir les actifs",
    convertDesc: "Convertissez vos actifs demo aux prix du marche.",
    from: "De",
    to: "Vers",
    estimatedReceive: "Estimation a recevoir",
    executeConvert: "Executer la conversion",
    convertSuccess: "Conversion terminee",
    convertSuccessMsg: "{fromAmount} {fromAsset} converti en {toAmount} {toAsset}",
    convertAnother: "Convertir plus",
  },
  ar: {
    demoBadge: "الوضع التجريبي",
    demoFundDisabled: "انت في الوضع التجريبي. لا حاجة للتمويل الحقيقي.",
    demoConvertNote: "تحويلات الوضع التجريبي تستخدم رصيدك الافتراضي.",
    withdrawTitle: "محاكاة السحب",
    withdrawDesc: "هذا سحب تجريبي. لن يتم نقل اصول حقيقية.",
    selectAsset: "اختر الاصل",
    amount: "المبلغ",
    destinationAddress: "عنوان الوجهة (تجريبي)",
    simulateWithdraw: "محاكاة السحب",
    processing: "جاري المعالجة...",
    withdrawSuccess: "تمت محاكاة السحب",
    withdrawSuccessMsg: "سيتم معالجة سحب {amount} {asset} خلال 24 ساعة.",
    simulateAnother: "محاكاة اخرى",
    insufficientBalance: "رصيد تجريبي غير كاف",
    recentWithdrawals: "السحوبات التجريبية الاخيرة",
    noWithdrawals: "لا توجد سحوبات تجريبية",
    convertTitle: "تحويل الاصول",
    convertDesc: "حول اصولك التجريبية باسعار السوق الحقيقية.",
    from: "من",
    to: "الى",
    estimatedReceive: "المقدر للاستلام",
    executeConvert: "تنفيذ التحويل",
    convertSuccess: "اكتمل التحويل",
    convertSuccessMsg: "تم تحويل {fromAmount} {fromAsset} الى {toAmount} {toAsset}",
    convertAnother: "تحويل المزيد",
  },
  ru: {
    demoBadge: "Демо-режим",
    demoFundDisabled: "Вы в демо-режиме. Реальное пополнение не требуется.",
    demoConvertNote: "Конвертации в демо-режиме используют виртуальный баланс.",
    withdrawTitle: "Симуляция вывода",
    withdrawDesc: "Это симулированный вывод. Реальные активы не будут перемещены.",
    selectAsset: "Выберите актив",
    amount: "Сумма",
    destinationAddress: "Адрес назначения (симуляция)",
    simulateWithdraw: "Симулировать вывод",
    processing: "Обработка...",
    withdrawSuccess: "Вывод симулирован",
    withdrawSuccessMsg: "Ваш вывод {amount} {asset} будет обработан в течение 24 часов.",
    simulateAnother: "Симулировать еще",
    insufficientBalance: "Недостаточный демо-баланс",
    recentWithdrawals: "Последние демо-выводы",
    noWithdrawals: "Нет симулированных выводов",
    convertTitle: "Конвертация активов",
    convertDesc: "Конвертируйте демо-активы по рыночным ценам.",
    from: "Из",
    to: "В",
    estimatedReceive: "Ожидаемое получение",
    executeConvert: "Выполнить конвертацию",
    convertSuccess: "Конвертация завершена",
    convertSuccessMsg: "Конвертировано {fromAmount} {fromAsset} в {toAmount} {toAsset}",
    convertAnother: "Конвертировать еще",
  },
};

// Assets available in demo mode
const DEMO_ASSETS = [
  { symbol: "USDT", name: "Tether", key: "usdt" },
  { symbol: "USDC", name: "USD Coin", key: "usdc" },
  { symbol: "ETH", name: "Ethereum", key: "eth" },
  { symbol: "BTC", name: "Bitcoin", key: "btc" },
  { symbol: "AUXG", name: "Gold", key: "auxg" },
  { symbol: "AUXS", name: "Silver", key: "auxs" },
  { symbol: "AUXPT", name: "Platinum", key: "auxpt" },
  { symbol: "AUXPD", name: "Palladium", key: "auxpd" },
];

type ActiveTab = "fund" | "withdraw" | "convert";

// ============================================
// Demo Withdraw Component
// ============================================
function DemoWithdrawTab({
  dt,
  demoBalance,
  executeDemoWithdraw,
  fetchDemoWithdrawals,
  refreshDemo,
}: {
  dt: Record<string, string>;
  demoBalance: Record<string, number> | null;
  executeDemoWithdraw: (params: { fromAsset: string; fromAmount: number; toAddress?: string }) => Promise<{ success: boolean; withdrawal?: any; transaction?: any; error?: string }>;
  fetchDemoWithdrawals: () => Promise<DemoWithdrawal[]>;
  refreshDemo: () => Promise<void>;
}) {
  const [selectedAsset, setSelectedAsset] = useState("USDT");
  const [amount, setAmount] = useState("");
  const [destAddress, setDestAddress] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<{ amount: number; asset: string } | null>(null);
  const [withdrawals, setWithdrawals] = useState<DemoWithdrawal[]>([]);

  useEffect(() => {
    fetchDemoWithdrawals().then(setWithdrawals);
  }, [fetchDemoWithdrawals]);

  const selectedKey = selectedAsset.toLowerCase();
  const available = demoBalance?.[selectedKey] || 0;

  const handleWithdraw = async () => {
    const numAmount = parseFloat(amount);
    if (!numAmount || numAmount <= 0) return;
    if (numAmount > available) {
      setError(dt.insufficientBalance);
      return;
    }

    setLoading(true);
    setError(null);

    const result = await executeDemoWithdraw({
      fromAsset: selectedAsset,
      fromAmount: numAmount,
      toAddress: destAddress || undefined,
    });

    setLoading(false);

    if (result.success) {
      setSuccess({ amount: numAmount, asset: selectedAsset });
      setAmount("");
      setDestAddress("");
      await refreshDemo();
      const updated = await fetchDemoWithdrawals();
      setWithdrawals(updated);
    } else {
      setError(result.error || "Withdrawal simulation failed");
    }
  };

  if (success) {
    return (
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-green-200 dark:border-green-800 p-8 text-center">
        <div className="w-14 h-14 rounded-full bg-green-100 dark:bg-green-900/40 flex items-center justify-center mx-auto mb-4">
          <svg className="w-7 h-7 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-2">{dt.withdrawSuccess}</h3>
        <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto mb-6">
          {dt.withdrawSuccessMsg
            .replace("{amount}", success.amount.toString())
            .replace("{asset}", success.asset)}
        </p>
        <button
          onClick={() => setSuccess(null)}
          className="px-6 py-3 rounded-xl bg-[#BFA181] text-white font-semibold text-sm"
        >
          {dt.simulateAnother}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-purple-200 dark:border-purple-800 p-6">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-lg">🎮</span>
          <h3 className="text-lg font-bold text-slate-800 dark:text-white">{dt.withdrawTitle}</h3>
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-6">{dt.withdrawDesc}</p>

        {/* Asset Selection */}
        <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-2 uppercase tracking-wide">
          {dt.selectAsset}
        </label>
        <div className="grid grid-cols-4 gap-2 mb-4">
          {DEMO_ASSETS.filter(a => (demoBalance?.[a.key] || 0) > 0).map(asset => (
            <button
              key={asset.symbol}
              onClick={() => { setSelectedAsset(asset.symbol); setAmount(""); setError(null); }}
              className={`p-3 rounded-xl border text-center transition-all ${
                selectedAsset === asset.symbol
                  ? "border-[#BFA181] bg-[#BFA181]/10"
                  : "border-stone-200 dark:border-slate-700 hover:border-slate-300"
              }`}
            >
              <div className="text-sm font-bold text-slate-800 dark:text-white">{asset.symbol}</div>
              <div className="text-xs text-slate-500 mt-0.5">{(demoBalance?.[asset.key] || 0).toLocaleString("en-US", { maximumFractionDigits: 4 })}</div>
            </button>
          ))}
        </div>

        {/* Amount */}
        <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-2 uppercase tracking-wide">
          {dt.amount}
        </label>
        <div className="flex items-center gap-2 mb-4">
          <input
            type="number"
            value={amount}
            onChange={(e) => { setAmount(e.target.value); setError(null); }}
            placeholder="0.00"
            className="flex-1 px-4 py-3 rounded-xl border border-stone-200 dark:border-slate-700 bg-stone-50 dark:bg-slate-800 text-slate-800 dark:text-white text-sm font-mono"
          />
          <button
            onClick={() => setAmount(available.toString())}
            className="px-3 py-3 rounded-xl bg-stone-100 dark:bg-slate-800 text-xs font-semibold text-[#BFA181] border border-stone-200 dark:border-slate-700"
          >
            MAX
          </button>
        </div>

        {/* Destination Address */}
        <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-2 uppercase tracking-wide">
          {dt.destinationAddress}
        </label>
        <input
          type="text"
          value={destAddress}
          onChange={(e) => setDestAddress(e.target.value)}
          placeholder="0x..."
          className="w-full px-4 py-3 rounded-xl border border-stone-200 dark:border-slate-700 bg-stone-50 dark:bg-slate-800 text-slate-800 dark:text-white text-sm font-mono mb-4"
        />

        {error && (
          <div className="mb-4 px-4 py-2 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          </div>
        )}

        <button
          onClick={handleWithdraw}
          disabled={loading || !parseFloat(amount)}
          className="w-full py-3 rounded-xl bg-[#BFA181] text-white font-semibold text-sm disabled:opacity-40 transition-all"
        >
          {loading ? dt.processing : dt.simulateWithdraw}
        </button>
      </div>

      {/* Recent Demo Withdrawals */}
      {withdrawals.length > 0 && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-stone-200 dark:border-slate-800 p-6">
          <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-4">{dt.recentWithdrawals}</h4>
          <div className="space-y-3">
            {withdrawals.slice(0, 5).map((w) => (
              <div key={w.id} className="flex items-center justify-between py-2 border-b border-stone-100 dark:border-slate-800 last:border-0">
                <div>
                  <span className="text-sm font-mono font-semibold text-slate-800 dark:text-white">{w.amount} {w.asset}</span>
                  <span className="ml-2 text-xs px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400">simulated</span>
                </div>
                <span className="text-xs text-slate-400">{new Date(w.timestamp).toLocaleDateString()}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================
// Demo Convert Component
// ============================================
function DemoConvertTab({
  dt,
  demoBalance,
  executeDemoTrade,
  refreshDemo,
}: {
  dt: Record<string, string>;
  demoBalance: Record<string, number> | null;
  executeDemoTrade: (params: { fromAsset: string; toAsset: string; fromAmount: number }) => Promise<{ success: boolean; transaction?: any; error?: string }>;
  refreshDemo: () => Promise<void>;
}) {
  const [fromAsset, setFromAsset] = useState("USDT");
  const [toAsset, setToAsset] = useState("ETH");
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<{ fromAmount: number; fromAsset: string; toAmount: number; toAsset: string } | null>(null);

  const fromKey = fromAsset.toLowerCase();
  const available = demoBalance?.[fromKey] || 0;

  // Filter "to" assets to exclude the "from" asset
  const toAssets = DEMO_ASSETS.filter(a => a.symbol !== fromAsset);

  const handleConvert = async () => {
    const numAmount = parseFloat(amount);
    if (!numAmount || numAmount <= 0) return;
    if (numAmount > available) {
      setError(dt.insufficientBalance || "Insufficient balance");
      return;
    }

    setLoading(true);
    setError(null);

    const result = await executeDemoTrade({
      fromAsset,
      toAsset,
      fromAmount: numAmount,
    });

    setLoading(false);

    if (result.success) {
      setSuccess({
        fromAmount: numAmount,
        fromAsset,
        toAmount: result.transaction?.toAmount || 0,
        toAsset,
      });
      setAmount("");
      await refreshDemo();
    } else {
      setError(result.error || "Conversion failed");
    }
  };

  if (success) {
    return (
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-green-200 dark:border-green-800 p-8 text-center">
        <div className="w-14 h-14 rounded-full bg-green-100 dark:bg-green-900/40 flex items-center justify-center mx-auto mb-4">
          <svg className="w-7 h-7 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-2">{dt.convertSuccess}</h3>
        <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto mb-2">
          {dt.convertSuccessMsg
            .replace("{fromAmount}", success.fromAmount.toLocaleString("en-US", { maximumFractionDigits: 6 }))
            .replace("{fromAsset}", success.fromAsset)
            .replace("{toAmount}", success.toAmount.toLocaleString("en-US", { maximumFractionDigits: 6 }))
            .replace("{toAsset}", success.toAsset)}
        </p>
        <button
          onClick={() => setSuccess(null)}
          className="mt-4 px-6 py-3 rounded-xl bg-[#2F6F62] text-white font-semibold text-sm"
        >
          {dt.convertAnother}
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-purple-200 dark:border-purple-800 p-6">
      <div className="flex items-center gap-2 mb-1">
        <span className="text-lg">🎮</span>
        <h3 className="text-lg font-bold text-slate-800 dark:text-white">{dt.convertTitle}</h3>
      </div>
      <p className="text-xs text-slate-500 dark:text-slate-400 mb-6">{dt.convertDesc}</p>

      {/* From Asset */}
      <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-2 uppercase tracking-wide">
        {dt.from}
      </label>
      <div className="grid grid-cols-4 gap-2 mb-4">
        {DEMO_ASSETS.filter(a => (demoBalance?.[a.key] || 0) > 0).map(asset => (
          <button
            key={asset.symbol}
            onClick={() => {
              setFromAsset(asset.symbol);
              if (toAsset === asset.symbol) {
                const alt = DEMO_ASSETS.find(a => a.symbol !== asset.symbol);
                if (alt) setToAsset(alt.symbol);
              }
              setAmount("");
              setError(null);
            }}
            className={`p-3 rounded-xl border text-center transition-all ${
              fromAsset === asset.symbol
                ? "border-[#2F6F62] bg-[#2F6F62]/10"
                : "border-stone-200 dark:border-slate-700 hover:border-slate-300"
            }`}
          >
            <div className="text-sm font-bold text-slate-800 dark:text-white">{asset.symbol}</div>
            <div className="text-xs text-slate-500 mt-0.5">{(demoBalance?.[asset.key] || 0).toLocaleString("en-US", { maximumFractionDigits: 4 })}</div>
          </button>
        ))}
      </div>

      {/* Amount */}
      <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-2 uppercase tracking-wide">
        {dt.amount}
      </label>
      <div className="flex items-center gap-2 mb-4">
        <input
          type="number"
          value={amount}
          onChange={(e) => { setAmount(e.target.value); setError(null); }}
          placeholder="0.00"
          className="flex-1 px-4 py-3 rounded-xl border border-stone-200 dark:border-slate-700 bg-stone-50 dark:bg-slate-800 text-slate-800 dark:text-white text-sm font-mono"
        />
        <button
          onClick={() => setAmount(available.toString())}
          className="px-3 py-3 rounded-xl bg-stone-100 dark:bg-slate-800 text-xs font-semibold text-[#2F6F62] border border-stone-200 dark:border-slate-700"
        >
          MAX
        </button>
      </div>

      {/* To Asset */}
      <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-2 uppercase tracking-wide">
        {dt.to}
      </label>
      <div className="grid grid-cols-4 gap-2 mb-6">
        {toAssets.map(asset => (
          <button
            key={asset.symbol}
            onClick={() => { setToAsset(asset.symbol); setError(null); }}
            className={`p-3 rounded-xl border text-center transition-all ${
              toAsset === asset.symbol
                ? "border-[#BFA181] bg-[#BFA181]/10"
                : "border-stone-200 dark:border-slate-700 hover:border-slate-300"
            }`}
          >
            <div className="text-sm font-bold text-slate-800 dark:text-white">{asset.symbol}</div>
            <div className="text-xs text-slate-500">{asset.name}</div>
          </button>
        ))}
      </div>

      {error && (
        <div className="mb-4 px-4 py-2 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        </div>
      )}

      <button
        onClick={handleConvert}
        disabled={loading || !parseFloat(amount)}
        className="w-full py-3 rounded-xl bg-[#2F6F62] text-white font-semibold text-sm disabled:opacity-40 transition-all"
      >
        {loading ? dt.processing : dt.executeConvert}
      </button>
    </div>
  );
}

// ============================================
// MAIN PAGE
// ============================================

export default function FundingWithdrawalsPage() {
  const { lang } = useLanguage();
  const t = translations[lang] || translations.en;
  const dt = demoTranslations[lang] || demoTranslations.en;
  const [activeTab, setActiveTab] = useState<ActiveTab>("fund");

  // Get wallet address for demo check
  const [address, setAddress] = useState<string | null>(null);
  useEffect(() => {
    const savedAddress = localStorage.getItem("auxite_wallet_address");
    if (savedAddress) setAddress(savedAddress);
  }, []);

  const { demoActive, demoBalance, executeDemoTrade, executeDemoWithdraw, fetchDemoWithdrawals, refreshDemo } = useDemoMode(address);

  return (
    <div className="min-h-screen bg-stone-100 dark:bg-slate-950">
      <TopNav />

      <div className="max-w-5xl mx-auto px-4 py-8">
        {/* Demo Mode Banner */}
        {demoActive && (
          <div className="mb-6 flex items-center gap-2 px-4 py-3 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-xl">
            <span className="text-lg">🎮</span>
            <span className="text-sm font-semibold text-purple-700 dark:text-purple-300">{dt.demoBadge}</span>
            {demoBalance && (
              <span className="ml-auto text-xs font-mono text-purple-600 dark:text-purple-300">
                ${(demoBalance.usdt + demoBalance.auxm + demoBalance.usdc).toLocaleString("en-US", { maximumFractionDigits: 0 })}
              </span>
            )}
          </div>
        )}

        {/* Page Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-800 dark:text-white mb-1">{t.title}</h1>
          <p className="text-sm text-slate-600 dark:text-slate-400">{t.subtitle}</p>
        </div>

        {/* Tab Switcher */}
        <div className="flex gap-1 mb-8 bg-white dark:bg-slate-900 rounded-xl border border-stone-200 dark:border-slate-800 p-1">
          <button
            onClick={() => setActiveTab("fund")}
            className={`flex-1 py-3 px-2 sm:px-6 rounded-lg font-semibold text-sm transition-all flex items-center justify-center gap-1.5 sm:gap-2 ${
              activeTab === "fund"
                ? "bg-[#2F6F62] text-white shadow-md"
                : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
            }`}
          >
            <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            {t.fundTab}
          </button>
          <button
            onClick={() => setActiveTab("withdraw")}
            className={`flex-1 py-3 px-2 sm:px-6 rounded-lg font-semibold text-sm transition-all flex items-center justify-center gap-1.5 sm:gap-2 ${
              activeTab === "withdraw"
                ? "bg-[#BFA181] text-white shadow-md"
                : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
            }`}
          >
            <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19V5m0 14l-7-7m7 7l7-7" />
            </svg>
            {t.withdrawTab}
          </button>
          <button
            onClick={() => setActiveTab("convert")}
            className={`flex-1 py-3 px-2 sm:px-6 rounded-lg font-semibold text-sm transition-all flex items-center justify-center gap-1.5 sm:gap-2 ${
              activeTab === "convert"
                ? "bg-[#2F6F62] text-white shadow-md"
                : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
            }`}
          >
            <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
            </svg>
            {t.convertTab}
          </button>
        </div>

        {/* Active Tab Content */}
        {demoActive && activeTab === "fund" ? (
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-purple-200 dark:border-purple-800 p-8 text-center">
            <div className="w-14 h-14 rounded-full bg-purple-100 dark:bg-purple-900/40 flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">🎮</span>
            </div>
            <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-2">{dt.demoBadge}</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto">{dt.demoFundDisabled}</p>
          </div>
        ) : demoActive && activeTab === "withdraw" ? (
          <DemoWithdrawTab
            dt={dt}
            demoBalance={demoBalance as Record<string, number> | null}
            executeDemoWithdraw={executeDemoWithdraw}
            fetchDemoWithdrawals={fetchDemoWithdrawals}
            refreshDemo={refreshDemo}
          />
        ) : demoActive && activeTab === "convert" ? (
          <DemoConvertTab
            dt={dt}
            demoBalance={demoBalance as Record<string, number> | null}
            executeDemoTrade={executeDemoTrade}
            refreshDemo={refreshDemo}
          />
        ) : (
          activeTab === "fund" ? <FundTab /> : activeTab === "withdraw" ? <WithdrawTab /> : <MetalConversionTab />
        )}
      </div>
    </div>
  );
}
