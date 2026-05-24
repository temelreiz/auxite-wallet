"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AddFundsModal } from "@/components/AddFundsModal";
import { BuyMetalCardModal } from "@/components/BuyMetalCardModal";
import { useWallet } from "@/components/WalletContext";

export default function FundVaultPage() {
  const router = useRouter();
  const { address, balances } = useWallet();
  const [showModal, setShowModal] = useState(true);
  const [showBuyMetalCardModal, setShowBuyMetalCardModal] = useState(false);

  // Real AUXM balance from wallet context
  const auxmBalance = balances?.auxm ?? 0;

  // Generate vault ID same as vault page
  const vaultId = address ? `AUX-${address.slice(2, 8).toUpperCase()}` : undefined;

  const handleClose = () => {
    setShowModal(false);
    // If the card modal is open, stay on /fund-vault until it closes;
    // otherwise return to vault.
    if (!showBuyMetalCardModal) {
      router.push("/vault");
    }
  };

  const handleAuxmTransfer = (amount: number): boolean => {
    // TODO: Implement real AUXM transfer via API
    console.log(`AUXM Transfer: ${amount} AUXM`);
    return true;
  };

  return (
    <div className="min-h-screen bg-stone-100 dark:bg-[#020617]">
      <AddFundsModal
        isOpen={showModal}
        onClose={handleClose}
        walletAddress={address || ""}
        vaultId={vaultId}
        auxmBalance={auxmBalance}
        onAuxmTransfer={handleAuxmTransfer}
        onCardPurchase={() => setShowBuyMetalCardModal(true)}
      />
      <BuyMetalCardModal
        isOpen={showBuyMetalCardModal}
        onClose={() => {
          setShowBuyMetalCardModal(false);
          // After the card flow closes, send the user back to /vault.
          router.push("/vault");
        }}
      />
    </div>
  );
}
