// src/lib/contracts/leasing.ts
import { Address } from "viem";

export const LEASING_REGISTRY_ADDRESS: Address =
  "0xRegistryAddressHere" as Address;

export const LEASING_OFFERS: {
  id: string;
  address: Address;
  metalSymbol: "AUXG" | "AUXS" | "AUXPT" | "AUXPD";
  lockDays: number;
  dealerName: string;
  minAmount: string;
}[] = [
  {
    id: "auxg-90d",
    address: "0xOfferContractAddressHere" as Address,
    metalSymbol: "AUXG",
    lockDays: 90,
    dealerName: "Auxite Kıymetli Madenler Tic. A.Ş.",
    minAmount: "50",
  },
];
