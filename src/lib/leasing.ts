// src/lib/leasing.ts
import type { Address } from "viem";

/**
 * Tek bir leasing programı için UI config'i.
 * Buradaki bilgiler sadece frontend içindir; asıl doğruluk on-chain kontrattadır.
 */
export type AuxiteLeasingOfferConfig = {
  id: string; // URL paramı: /leasing/[id]
  address: Address; // AuxiteLeasingOffer kontrat adresi
  metalToken: Address; // AUXG / AUXS / AUXPT / AUXPD ERC20 adresi
  symbol: "AUXG" | "AUXS" | "AUXPT" | "AUXPD";
  lockDays: number;
  minAmount: string; // kullanıcıya gösterilen string (örn: "10")
  dealerName: string;
};

export const AUXITE_LEASING_OFFERS: readonly AuxiteLeasingOfferConfig[] = [
  // ✅ AUXG – 90 gün leasing (Sepolia)
  {
    id: "auxg-90d",
    address: "0x9D1468ae2A04Af3514a015070B59072F47F17e23" as Address,
    metalToken: "0x5B18e37006B605c64b6d296409c7A98e136d68e9" as Address,
    symbol: "AUXG",
    lockDays: 90,
    minAmount: "10",
    dealerName: "Auxite Kıymetli Madenler Tic. A.Ş.",
  },

  // ✅ AUXS – 90 gün leasing
  {
    id: "auxs-90d",
    address: "0x36E5C3330c958137eAC41D323C5adc5125553683" as Address,
    metalToken: "0xfAEe6F8B00862524719909D6c367b49Ac7AEF69f" as Address,
    symbol: "AUXS",
    lockDays: 90,
    minAmount: "10",
    dealerName: "Auxite Kıymetli Madenler Tic. A.Ş.",
  },

  // ✅ AUXPT – 90 gün leasing
  {
    id: "auxpt-90d",
    address: "0x27F4De6c866CFfc2cD9927e50790Cb0622c90544" as Address,
    metalToken: "0x8a145B64C5c2F1e3Fa09480db119E59a240722F0" as Address,
    symbol: "AUXPT",
    lockDays: 90,
    minAmount: "5",
    dealerName: "Auxite Kıymetli Madenler Tic. A.Ş.",
  },

  // ✅ AUXPD – 90 gün leasing
  {
    id: "auxpd-90d",
    address: "0x648B123aE97A11d80641ff46C5E9D72eCD388Eb5" as Address,
    metalToken: "0xd4A5357B8881fA6a649CbA7117ba96af5B264238" as Address,
    symbol: "AUXPD",
    lockDays: 90,
    minAmount: "5",
    dealerName: "Auxite Kıymetli Madenler Tic. A.Ş.",
  },
];

/**
 * AuxiteLeasingOffer kontratı için minimal ABI.
 */
export const auxiteLeasingOfferAbi = [
  {
    name: "deposit",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [{ name: "amount", type: "uint256" }],
    outputs: [],
  },
  {
    name: "withdraw",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [{ name: "index", type: "uint256" }],
    outputs: [],
  },
  {
    name: "numPositions",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "user", type: "address" }],
    outputs: [{ type: "uint256" }],
  },
  {
    name: "getPosition",
    type: "function",
    stateMutability: "view",
    inputs: [
      { name: "user", type: "address" },
      { name: "index", type: "uint256" },
    ],
    outputs: [
      { name: "amount", type: "uint256" },
      { name: "startTime", type: "uint64" },
      { name: "endTime", type: "uint64" },
      { name: "closed", type: "bool" },
      { name: "rewardClaimed", type: "bool" },
    ],
  },
] as const;

/**
 * ID'den leasing offer config'ini bulmak için yardımcı fonksiyon.
 */
export function getLeasingOfferById(id: string): AuxiteLeasingOfferConfig | undefined {
  return AUXITE_LEASING_OFFERS.find((o) => o.id === id);
}
