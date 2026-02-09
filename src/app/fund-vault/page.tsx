"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AddFundsModal } from "@/components/AddFundsModal";
import { useWallet } from "@/components/WalletContext";

export default function FundVaultPage() {
  const router = useRouter();
  const { address } = useWallet();
  const [showModal, setShowModal] = useState(true);

  const handleClose = () => {
    setShowModal(false);
    router.push("/vault");
  };

  return (
    <div className="min-h-screen bg-stone-100 dark:bg-[#0D1421]">
      <AddFundsModal
        isOpen={showModal}
        onClose={handleClose}
        lang="en"
        walletAddress={address || ""}
      />
    </div>
  );
}
