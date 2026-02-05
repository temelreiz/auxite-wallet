"use client";

import { useState, useCallback } from "react";
import { useWallet } from "@/components/WalletContext";

interface TransakWidgetProps {
  defaultCrypto?: string;
  defaultFiat?: string;
  defaultAmount?: number;
  onSuccess?: (orderRef: string) => void;
  onClose?: () => void;
  className?: string;
}

interface TransakOrder {
  success: boolean;
  orderRef: string;
  widgetUrl: string;
  params: {
    cryptoCurrency: string;
    fiatCurrency: string;
    fiatAmount: number;
    walletAddress: string;
  };
}

const CRYPTO_OPTIONS = [
  { value: "ETH", label: "Ethereum (ETH)", icon: "/eth-icon.png" },
  { value: "USDT", label: "Tether (USDT)", icon: "/usdt-icon.png" },
  { value: "USDC", label: "USD Coin (USDC)", icon: "/usdc-icon.png" },
  { value: "BTC", label: "Bitcoin (BTC)", icon: "/btc-icon.png" },
];

const FIAT_OPTIONS = [
  { value: "USD", label: "US Dollar", symbol: "$" },
  { value: "EUR", label: "Euro", symbol: "€" },
  { value: "GBP", label: "British Pound", symbol: "£" },
  { value: "TRY", label: "Turkish Lira", symbol: "₺" },
];

const AMOUNT_PRESETS = [50, 100, 250, 500, 1000];

export function TransakWidget({
  defaultCrypto = "ETH",
  defaultFiat = "USD",
  defaultAmount = 100,
  onSuccess,
  onClose,
  className = "",
}: TransakWidgetProps) {
  const { address, isConnected } = useWallet();
  const [cryptoCurrency, setCryptoCurrency] = useState(defaultCrypto);
  const [fiatCurrency, setFiatCurrency] = useState(defaultFiat);
  const [amount, setAmount] = useState(defaultAmount.toString());
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showWidget, setShowWidget] = useState(false);
  const [widgetUrl, setWidgetUrl] = useState<string | null>(null);
  const [orderRef, setOrderRef] = useState<string | null>(null);

  const fiatSymbol = FIAT_OPTIONS.find(f => f.value === fiatCurrency)?.symbol || "$";

  const handleCreateOrder = useCallback(async () => {
    if (!address || !isConnected) {
      setError("Please connect your wallet first");
      return;
    }

    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum < 30 || amountNum > 10000) {
      setError("Amount must be between $30 and $10,000");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/transak/order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          walletAddress: address,
          cryptoCurrency,
          fiatCurrency,
          fiatAmount: amountNum,
          email: email || undefined,
        }),
      });

      const data: TransakOrder = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.orderRef || "Failed to create order");
      }

      setOrderRef(data.orderRef);
      setWidgetUrl(data.widgetUrl);
      setShowWidget(true);

      // Open Transak in new window/popup
      const popup = window.open(
        data.widgetUrl,
        "transak",
        "width=450,height=700,scrollbars=yes,resizable=yes"
      );

      if (!popup) {
        // Popup blocked, show iframe instead
        setShowWidget(true);
      }

    } catch (err: any) {
      setError(err.message || "Failed to create order");
    } finally {
      setIsLoading(false);
    }
  }, [address, isConnected, amount, cryptoCurrency, fiatCurrency, email]);

  const handleClose = useCallback(() => {
    setShowWidget(false);
    setWidgetUrl(null);
    onClose?.();
  }, [onClose]);

  if (!isConnected) {
    return (
      <div className={`p-6 bg-white dark:bg-zinc-800 rounded-xl border border-stone-200 dark:border-zinc-700 ${className}`}>
        <div className="text-center py-8">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
            <svg className="w-8 h-8 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-slate-800 dark:text-zinc-200 mb-2">
            Connect Wallet
          </h3>
          <p className="text-sm text-slate-500 dark:text-zinc-400">
            Please connect your wallet to buy crypto
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={`p-6 bg-white dark:bg-zinc-800 rounded-xl border border-stone-200 dark:border-zinc-700 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-slate-800 dark:text-zinc-200">
          Buy Crypto
        </h3>
        <span className="px-2 py-1 text-xs font-medium rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400">
          Powered by Transak
        </span>
      </div>

      {/* Crypto Selection */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-slate-600 dark:text-zinc-400 mb-2">
          I want to buy
        </label>
        <div className="grid grid-cols-4 gap-2">
          {CRYPTO_OPTIONS.map((crypto) => (
            <button
              key={crypto.value}
              onClick={() => setCryptoCurrency(crypto.value)}
              className={`p-3 rounded-lg border transition-all ${
                cryptoCurrency === crypto.value
                  ? "border-amber-500 bg-amber-50 dark:bg-amber-900/20"
                  : "border-stone-200 dark:border-zinc-700 hover:border-amber-300"
              }`}
            >
              <span className="text-sm font-medium text-slate-700 dark:text-zinc-300">
                {crypto.value}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Amount Input */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-slate-600 dark:text-zinc-400 mb-2">
          Amount
        </label>
        <div className="relative">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 dark:text-zinc-400 font-medium">
            {fiatSymbol}
          </span>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            min={30}
            max={10000}
            className="w-full pl-10 pr-20 py-3 rounded-lg border border-stone-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-slate-800 dark:text-zinc-200 focus:ring-2 focus:ring-amber-500 focus:border-transparent"
            placeholder="100"
          />
          <select
            value={fiatCurrency}
            onChange={(e) => setFiatCurrency(e.target.value)}
            className="absolute right-2 top-1/2 -translate-y-1/2 bg-stone-100 dark:bg-zinc-700 border-none rounded px-2 py-1 text-sm font-medium text-slate-700 dark:text-zinc-300"
          >
            {FIAT_OPTIONS.map((fiat) => (
              <option key={fiat.value} value={fiat.value}>
                {fiat.value}
              </option>
            ))}
          </select>
        </div>

        {/* Amount Presets */}
        <div className="flex gap-2 mt-2">
          {AMOUNT_PRESETS.map((preset) => (
            <button
              key={preset}
              onClick={() => setAmount(preset.toString())}
              className={`flex-1 py-1.5 text-xs font-medium rounded border transition-all ${
                amount === preset.toString()
                  ? "border-amber-500 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400"
                  : "border-stone-200 dark:border-zinc-700 text-slate-600 dark:text-zinc-400 hover:border-amber-300"
              }`}
            >
              {fiatSymbol}{preset}
            </button>
          ))}
        </div>
      </div>

      {/* Email (Optional) */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-slate-600 dark:text-zinc-400 mb-2">
          Email (optional - for receipt)
        </label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full px-4 py-3 rounded-lg border border-stone-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-slate-800 dark:text-zinc-200 focus:ring-2 focus:ring-amber-500 focus:border-transparent"
          placeholder="your@email.com"
        />
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-4 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        </div>
      )}

      {/* Buy Button */}
      <button
        onClick={handleCreateOrder}
        disabled={isLoading}
        className="w-full py-4 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-amber-600 hover:to-amber-700 text-white font-semibold text-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        {isLoading ? (
          <>
            <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            Processing...
          </>
        ) : (
          <>
            Buy {cryptoCurrency} with {fiatCurrency}
          </>
        )}
      </button>

      {/* Security Note */}
      <p className="mt-4 text-xs text-center text-slate-500 dark:text-zinc-500">
        Secure payment powered by Transak. Your funds will be sent directly to your wallet.
      </p>

      {/* Wallet Address Display */}
      <div className="mt-4 p-3 rounded-lg bg-stone-50 dark:bg-zinc-900/50 border border-stone-200 dark:border-zinc-700">
        <p className="text-xs text-slate-500 dark:text-zinc-500 mb-1">Receiving wallet</p>
        <p className="text-sm font-mono text-slate-700 dark:text-zinc-300 truncate">
          {address}
        </p>
      </div>

      {/* Iframe Fallback (if popup blocked) */}
      {showWidget && widgetUrl && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-800 rounded-xl overflow-hidden w-full max-w-md">
            <div className="flex items-center justify-between p-4 border-b border-stone-200 dark:border-zinc-700">
              <h4 className="font-semibold text-slate-800 dark:text-zinc-200">
                Complete Payment
              </h4>
              <button
                onClick={handleClose}
                className="p-2 hover:bg-stone-100 dark:hover:bg-zinc-700 rounded-lg transition-colors"
              >
                <svg className="w-5 h-5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <iframe
              src={widgetUrl}
              className="w-full h-[600px] border-none"
              allow="camera;microphone;payment"
            />
          </div>
        </div>
      )}
    </div>
  );
}

export default TransakWidget;
