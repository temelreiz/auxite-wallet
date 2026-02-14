"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AddFundsModal } from "@/components/AddFundsModal";
import { useWallet } from "@/components/WalletContext";
import { useLanguage } from "@/components/LanguageContext";

export default function FundVaultPage() {
  const router = useRouter();
  const { address, balances } = useWallet();
  const { lang } = useLanguage();
  const [showModal, setShowModal] = useState(true);

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
