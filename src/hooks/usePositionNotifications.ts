import { useMemo, useEffect, useState } from "react";
import { useAccount, useReadContract } from "wagmi";
import { formatUnits } from "viem";
import { LEASING_CONTRACTS } from "@/contracts/leasingContracts";
import LeasingOfferABI from "@/contracts/AuxiteLeasingOffer.json";

interface Notification {
  id: string;
  type: "unlock_soon" | "unlocked" | "new_position";
  metal: string;
  amount: string;
  message: string;
  timestamp: number;
  positionIndex: number;
  contractAddress: string;
  daysRemaining?: number;
}

const METAL_NAMES = {
  AUXG: { tr: "Altın", en: "Gold" },
  AUXS: { tr: "Gümüş", en: "Silver" },
  AUXPT: { tr: "Platin", en: "Platinum" },
  AUXPD: { tr: "Paladyum", en: "Palladium" },
};

export function usePositionNotifications(lang: "tr" | "en" = "en") {
  const { address } = useAccount();
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());

  // Read positions for each metal
  const { data: auxgPositions } = useReadContract({
    address: LEASING_CONTRACTS.AUXG["90"] as `0x${string}`,
    abi: LeasingOfferABI.abi,
    functionName: "getPositions",
    args: address ? [address] : undefined,
  });

  const { data: auxsPositions } = useReadContract({
    address: LEASING_CONTRACTS.AUXS["90"] as `0x${string}`,
    abi: LeasingOfferABI.abi,
    functionName: "getPositions",
    args: address ? [address] : undefined,
  });

  const { data: auxptPositions } = useReadContract({
    address: LEASING_CONTRACTS.AUXPT["90"] as `0x${string}`,
    abi: LeasingOfferABI.abi,
    functionName: "getPositions",
    args: address ? [address] : undefined,
  });

  const { data: auxpdPositions } = useReadContract({
    address: LEASING_CONTRACTS.AUXPD["90"] as `0x${string}`,
    abi: LeasingOfferABI.abi,
    functionName: "getPositions",
    args: address ? [address] : undefined,
  });

  // Generate notifications
  const notifications = useMemo(() => {
    const allNotifications: Notification[] = [];
    const now = Math.floor(Date.now() / 1000);

    const processPositions = (
      positions: any,
      metal: keyof typeof METAL_NAMES,
      contractAddress: string
    ) => {
      if (!positions || !Array.isArray(positions)) return;

      positions.forEach((pos: any, index: number) => {
        if (pos.withdrawn) return;

        const endTime = Number(pos.endTime);
        const amount = formatUnits(pos.amount, 18);
        const daysRemaining = Math.max(0, Math.ceil((endTime - now) / (24 * 60 * 60)));
        const metalName = METAL_NAMES[metal][lang];

        // Already unlocked
        if (endTime <= now) {
          allNotifications.push({
            id: `${metal}-${index}-unlocked`,
            type: "unlocked",
            metal,
            amount,
            message: lang === "tr"
              ? `${parseFloat(amount).toFixed(2)}g ${metalName} pozisyonunuz çekilmeye hazır!`
              : `Your ${parseFloat(amount).toFixed(2)}g ${metalName} position is ready to withdraw!`,
            timestamp: endTime,
            positionIndex: index,
            contractAddress,
            daysRemaining: 0,
          });
        }
        // Unlocking within 7 days
        else if (daysRemaining <= 7) {
          allNotifications.push({
            id: `${metal}-${index}-soon`,
            type: "unlock_soon",
            metal,
            amount,
            message: lang === "tr"
              ? `${parseFloat(amount).toFixed(2)}g ${metalName} pozisyonunuz ${daysRemaining} gün içinde açılacak`
              : `Your ${parseFloat(amount).toFixed(2)}g ${metalName} position unlocks in ${daysRemaining} days`,
            timestamp: endTime,
            positionIndex: index,
            contractAddress,
            daysRemaining,
          });
        }
      });
    };

    processPositions(auxgPositions, "AUXG", LEASING_CONTRACTS.AUXG["90"]);
    processPositions(auxsPositions, "AUXS", LEASING_CONTRACTS.AUXS["90"]);
    processPositions(auxptPositions, "AUXPT", LEASING_CONTRACTS.AUXPT["90"]);
    processPositions(auxpdPositions, "AUXPD", LEASING_CONTRACTS.AUXPD["90"]);

    // Sort by urgency (unlocked first, then by days remaining)
    return allNotifications
      .filter(n => !dismissedIds.has(n.id))
      .sort((a, b) => {
        if (a.type === "unlocked" && b.type !== "unlocked") return -1;
        if (b.type === "unlocked" && a.type !== "unlocked") return 1;
        return (a.daysRemaining || 0) - (b.daysRemaining || 0);
      });
  }, [auxgPositions, auxsPositions, auxptPositions, auxpdPositions, lang, dismissedIds]);

  const dismissNotification = (id: string) => {
    setDismissedIds(prev => new Set([...prev, id]));
  };

  const clearAllNotifications = () => {
    setDismissedIds(new Set(notifications.map(n => n.id)));
  };

  // Count by type
  const unlockedCount = notifications.filter(n => n.type === "unlocked").length;
  const soonCount = notifications.filter(n => n.type === "unlock_soon").length;

  return {
    notifications,
    unlockedCount,
    soonCount,
    totalCount: notifications.length,
    dismissNotification,
    clearAllNotifications,
  };
}