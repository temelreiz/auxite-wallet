"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AddFundsModal } from "@/components/AddFundsModal";
import { useWallet } from "@/components/WalletContext";
import { useLanguage } from "@/components/LanguageContext";
import { useDemoMode } from "@/hooks/useDemoMode";
import TopNav from "@/components/TopNav";

const demoTranslations: Record<string, Record<string, string>> = {
  en: {
    demoBadge: "Demo Mode",
    demoTitle: "You're in Demo Mode",
    demoMessage: "You have $10,000 virtual USDT to explore Auxite. Switch to real mode to fund your vault with real assets.",
    exitDemo: "Exit Demo & Fund Real Vault",
    backToVault: "Back to Vault",
    virtualBalance: "Virtual Balance",
  },
  tr: {
    demoBadge: "Demo Modu",
    demoTitle: "Demo Modundasınız",
    demoMessage: "Auxite'i keşfetmek için $10.000 sanal USDT'niz var. Gerçek varlıklarla kasanızı fonlamak için gerçek moda geçin.",
    exitDemo: "Demo'dan Çık & Gerçek Kasayı Fonla",
    backToVault: "Kasaya Dön",
    virtualBalance: "Sanal Bakiye",
  },
  de: {
    demoBadge: "Demo-Modus",
    demoTitle: "Sie sind im Demo-Modus",
    demoMessage: "Sie haben $10.000 virtuelles USDT. Wechseln Sie in den Echtmodus, um Ihren Tresor mit echten Vermögenswerten zu finanzieren.",
    exitDemo: "Demo beenden & Tresor finanzieren",
    backToVault: "Zurück zum Tresor",
    virtualBalance: "Virtuelles Guthaben",
  },
  fr: {
    demoBadge: "Mode Démo",
    demoTitle: "Vous êtes en Mode Démo",
    demoMessage: "Vous avez 10 000 $ USDT virtuels. Passez en mode réel pour financer votre coffre.",
    exitDemo: "Quitter le Démo & Financer",
    backToVault: "Retour au Coffre",
    virtualBalance: "Solde Virtuel",
  },
  ar: {
    demoBadge: "الوضع التجريبي",
    demoTitle: "أنت في الوضع التجريبي",
    demoMessage: "لديك 10,000$ USDT افتراضي. قم بالتحويل إلى الوضع الحقيقي لتمويل خزنتك.",
    exitDemo: "إنهاء التجريبي وتمويل الخزنة",
    backToVault: "العودة إلى الخزنة",
    virtualBalance: "الرصيد الافتراضي",
  },
  ru: {
    demoBadge: "Демо-режим",
    demoTitle: "Вы в Демо-режиме",
    demoMessage: "У вас есть $10 000 виртуальных USDT. Переключитесь в реальный режим для пополнения хранилища.",
    exitDemo: "Выйти из демо и пополнить",
    backToVault: "Назад к хранилищу",
    virtualBalance: "Виртуальный баланс",
  },
};

export default function FundVaultPage() {
  const router = useRouter();
  const { address, balances } = useWallet();
  const { lang } = useLanguage();
  const [showModal, setShowModal] = useState(true);
  const { demoActive, demoBalance, deactivateDemo, demoLoading } = useDemoMode(address);

  const dt = demoTranslations[lang] || demoTranslations.en;

  // Real AUXM balance from wallet context
  const auxmBalance = balances?.auxm ?? 0;

  // Generate vault ID same as vault page
  const vaultId = address ? `AUX-${address.slice(2, 8).toUpperCase()}` : undefined;

  const handleClose = () => {
    setShowModal(false);
    router.push("/vault");
  };

  const handleAuxmTransfer = (amount: number): boolean => {
    // TODO: Implement real AUXM transfer via API
    console.log(`AUXM Transfer: ${amount} AUXM`);
    return true;
  };

  const handleExitDemoAndFund = async () => {
    await deactivateDemo();
    // Page will re-render without demo mode, showing real fund modal
  };

  // If demo mode is active, show demo message instead of real funding
  if (demoActive) {
    return (
      <div className="min-h-screen bg-stone-100 dark:bg-[#0D1421]">
        <TopNav />
        <div className="max-w-lg mx-auto px-4 py-12">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-purple-200 dark:border-purple-800 overflow-hidden shadow-lg">
            {/* Demo header */}
            <div className="flex flex-col items-center py-8 bg-purple-50 dark:bg-purple-900/20 border-b border-purple-200 dark:border-purple-800">
              <div className="w-16 h-16 rounded-full bg-purple-100 dark:bg-purple-900/40 flex items-center justify-center mb-4">
                <span className="text-3xl">🎮</span>
              </div>
              <h2 className="text-xl font-bold text-purple-700 dark:text-purple-300">{dt.demoTitle}</h2>
              <span className="mt-1 px-3 py-0.5 rounded-full bg-purple-200 dark:bg-purple-800 text-purple-800 dark:text-purple-200 text-xs font-semibold">
                {dt.demoBadge}
              </span>
            </div>

            <div className="p-6 space-y-5">
              {/* Virtual Balance Display */}
              {demoBalance && (
                <div className="p-4 bg-purple-50 dark:bg-purple-900/10 rounded-xl border border-purple-100 dark:border-purple-800">
                  <p className="text-xs text-purple-500 mb-1 font-semibold">{dt.virtualBalance}</p>
                  <p className="text-2xl font-bold text-purple-700 dark:text-purple-300">
                    ${(demoBalance.usdt + demoBalance.auxm + demoBalance.usdc).toLocaleString("en-US", { maximumFractionDigits: 0 })}
                  </p>
                </div>
              )}

              <p className="text-sm text-slate-600 dark:text-slate-400 text-center">
                {dt.demoMessage}
              </p>

              {/* Exit Demo and Fund Real Vault */}
              <button
                onClick={handleExitDemoAndFund}
                disabled={demoLoading}
                className="w-full py-4 bg-[#BFA181] text-white font-semibold rounded-xl hover:bg-[#b39370] transition-colors disabled:opacity-50"
              >
                {demoLoading ? "..." : dt.exitDemo}
              </button>

              <button
                onClick={() => router.push("/vault")}
                className="w-full py-3 text-slate-500 text-sm hover:text-slate-700 dark:hover:text-slate-300 transition-colors"
              >
                {dt.backToVault}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-100 dark:bg-[#0D1421]">
      <AddFundsModal
        isOpen={showModal}
        onClose={handleClose}
        walletAddress={address || ""}
        vaultId={vaultId}
        auxmBalance={auxmBalance}
        onAuxmTransfer={handleAuxmTransfer}
      />
    </div>
  );
}
