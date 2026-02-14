import { useWallet } from "./WalletContext";
import { useLanguage } from "@/components/LanguageContext";
import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import { formatAmount, getDecimalPlaces } from '@/lib/format';

interface MetalTradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  metal: "AUXG" | "AUXS" | "AUXPT" | "AUXPD";
  metalName: string;
  currentPrice: number;
  bidPrice?: number;
  initialMode?: "buy" | "sell";
  userBalance?: {
    auxm: number;
    metals: Record<string, number>;
    crypto?: {
      USDT: number;
      USDC: number;
      BTC: number;
      ETH: number;
    };
  };
  cryptoPrices?: {
    BTC: number;
    ETH: number;
  };
  walletAddress?: string;
  onTradeComplete?: () => void;
}

interface Quote {
  id: string;
  type: "buy" | "sell";
  metal: string;
  grams: number;
  basePrice: number;
  pricePerGram: number;
  spreadPercent: number;
  totalUSD: number;
  totalAUXM: number;
  expiresAt: number;
  timeRemaining: number;
}

type PaymentMethod = "AUXM" | "USDT" | "USDC" | "BTC" | "ETH";
type OrderType = "market" | "limit";

const METAL_INFO = {
  AUXG: { name: "Gold", nameTr: "Altın", icon: "/auxg_icon.png", color: "#FFD700" },
  AUXS: { name: "Silver", nameTr: "Gümüş", icon: "/auxs_icon.png", color: "#C0C0C0" },
  AUXPT: { name: "Platinum", nameTr: "Platin", icon: "/auxpt_icon.png", color: "#E5E4E2" },
  AUXPD: { name: "Palladium", nameTr: "Paladyum", icon: "/auxpd_icon.png", color: "#CED0DD" },
};

const PAYMENT_METHODS: { id: PaymentMethod; name: string; icon: string; color: string }[] = [
  { id: "AUXM", name: "AUXM", icon: "◈", color: "#A855F7" },
  { id: "USDT", name: "USDT", icon: "₮", color: "#26A17B" },
  { id: "BTC", name: "BTC", icon: "₿", color: "#F7931A" },
  { id: "ETH", name: "ETH", icon: "Ξ", color: "#627EEA" },
  { id: "USDC", name: "USDC", icon: "$", color: "#2775CA" },
];

const translations: Record<string, Record<string, string>> = {
  tr: {
    buy: "Al",
    sell: "Sat",
    market: "Piyasa",
    limit: "Limit",
    orderType: "Emir Tipi",
    marketDesc: "Anl\u0131k piyasa fiyat\u0131ndan i\u015flem",
    limitDesc: "Belirledi\u011fin fiyattan i\u015flem",
    amount: "Miktar",
    limitPrice: "Limit Fiyat",
    currentMarketPrice: "G\u00fcncel Piyasa Fiyat\u0131",
    askPrice: "Sat\u0131\u015f Fiyat\u0131 (Ask)",
    bidPrice: "Al\u0131\u015f Fiyat\u0131 (Bid)",
    balance: "Bakiye",
    bonus: "Bonus",
    total: "Toplam",
    totalPayment: "Toplam \u00d6deme",
    youReceive: "Alaca\u011f\u0131n\u0131z",
    paymentMethod: "\u00d6deme Y\u00f6ntemi",
    processing: "\u0130\u015fleniyor...",
    cancel: "\u0130ptal",
    confirm: "Onayla",
    priceLocked: "Fiyat Sabitlendi",
    seconds: "sn",
    spread: "Spread",
    insufficientBalance: "Yetersiz bakiye",
    bonusUsage: "Bonus Kullan\u0131m\u0131",
    normalAuxm: "Normal AUXM",
    newPrice: "Fiyat G\u00fcncellendi",
    success: "\u0130\u015flem Ba\u015far\u0131l\u0131!",
    orderPlaced: "Emir Verildi!",
    limitOrderInfo: "Limit emriniz piyasa fiyat\u0131 belirledi\u011finiz fiyata ula\u015ft\u0131\u011f\u0131nda ger\u00e7ekle\u015fecektir.",
    pendingOrders: "Bekleyen Emirler",
    noOrders: "Bekleyen emir yok",
    close: "Kapat",
    placeOrder: "Emir Ver",
    partialAllocation: "K\u0131smi Allocation",
    youAreBuying: "sat\u0131n al\u0131yorsunuz:",
    vaultAllocated: "Kasada Allocate",
    nonAllocated: "Non-Allocated",
    allocationExplanation: "Sadece tam gramlar fiziksel alt\u0131na allocate edilebilir. Kesirli k\u0131s\u0131m bakiyenizde non-allocated olarak kal\u0131r.",
    add: "Ekle",
    continueBtn: "Devam Et",
  },
  en: {
    buy: "Buy",
    sell: "Sell",
    market: "Market",
    limit: "Limit",
    orderType: "Order Type",
    marketDesc: "Trade at current market price",
    limitDesc: "Trade at your specified price",
    amount: "Amount",
    limitPrice: "Limit Price",
    currentMarketPrice: "Current Market Price",
    askPrice: "Ask Price",
    bidPrice: "Bid Price",
    balance: "Balance",
    bonus: "Bonus",
    total: "Total",
    totalPayment: "Total Payment",
    youReceive: "You Receive",
    paymentMethod: "Payment Method",
    processing: "Processing...",
    cancel: "Cancel",
    confirm: "Confirm",
    priceLocked: "Price Locked",
    seconds: "sec",
    spread: "Spread",
    insufficientBalance: "Insufficient balance",
    bonusUsage: "Bonus Usage",
    normalAuxm: "Regular AUXM",
    newPrice: "Price Updated",
    success: "Trade Successful!",
    orderPlaced: "Order Placed!",
    limitOrderInfo: "Your limit order will execute when market price reaches your specified price.",
    pendingOrders: "Pending Orders",
    noOrders: "No pending orders",
    close: "Close",
    placeOrder: "Place Order",
    partialAllocation: "Partial Allocation",
    youAreBuying: "You are buying",
    vaultAllocated: "Vault Allocated",
    nonAllocated: "Non-Allocated",
    allocationExplanation: "Only whole grams can be allocated to physical metal. Fractional amounts remain non-allocated in your balance.",
    add: "Add",
    continueBtn: "Continue",
  },
  de: {
    buy: "Kaufen",
    sell: "Verkaufen",
    market: "Markt",
    limit: "Limit",
    orderType: "Auftragstyp",
    marketDesc: "Handel zum aktuellen Marktpreis",
    limitDesc: "Handel zu Ihrem festgelegten Preis",
    amount: "Menge",
    limitPrice: "Limitpreis",
    currentMarketPrice: "Aktueller Marktpreis",
    askPrice: "Briefkurs (Ask)",
    bidPrice: "Geldkurs (Bid)",
    balance: "Guthaben",
    bonus: "Bonus",
    total: "Gesamt",
    totalPayment: "Gesamtzahlung",
    youReceive: "Sie erhalten",
    paymentMethod: "Zahlungsmethode",
    processing: "Verarbeitung...",
    cancel: "Abbrechen",
    confirm: "Best\u00e4tigen",
    priceLocked: "Preis Gesperrt",
    seconds: "Sek",
    spread: "Spread",
    insufficientBalance: "Unzureichendes Guthaben",
    bonusUsage: "Bonus-Nutzung",
    normalAuxm: "Normales AUXM",
    newPrice: "Preis Aktualisiert",
    success: "Handel Erfolgreich!",
    orderPlaced: "Auftrag Erteilt!",
    limitOrderInfo: "Ihr Limitauftrag wird ausgef\u00fchrt, wenn der Marktpreis Ihren festgelegten Preis erreicht.",
    pendingOrders: "Ausstehende Auftr\u00e4ge",
    noOrders: "Keine ausstehenden Auftr\u00e4ge",
    close: "Schlie\u00dfen",
    placeOrder: "Auftrag Erteilen",
    partialAllocation: "Teilweise Zuordnung",
    youAreBuying: "Sie kaufen",
    vaultAllocated: "Tresor Zugeordnet",
    nonAllocated: "Nicht Zugeordnet",
    allocationExplanation: "Nur ganze Gramm k\u00f6nnen physischem Metall zugeordnet werden. Bruchteile bleiben nicht zugeordnet in Ihrem Guthaben.",
    add: "Hinzuf\u00fcgen",
    continueBtn: "Weiter",
  },
  fr: {
    buy: "Acheter",
    sell: "Vendre",
    market: "March\u00e9",
    limit: "Limite",
    orderType: "Type d'Ordre",
    marketDesc: "Trader au prix actuel du march\u00e9",
    limitDesc: "Trader au prix que vous sp\u00e9cifiez",
    amount: "Montant",
    limitPrice: "Prix Limite",
    currentMarketPrice: "Prix Actuel du March\u00e9",
    askPrice: "Prix de Vente (Ask)",
    bidPrice: "Prix d'Achat (Bid)",
    balance: "Solde",
    bonus: "Bonus",
    total: "Total",
    totalPayment: "Paiement Total",
    youReceive: "Vous Recevez",
    paymentMethod: "M\u00e9thode de Paiement",
    processing: "Traitement...",
    cancel: "Annuler",
    confirm: "Confirmer",
    priceLocked: "Prix Verrouill\u00e9",
    seconds: "sec",
    spread: "Spread",
    insufficientBalance: "Solde insuffisant",
    bonusUsage: "Utilisation du Bonus",
    normalAuxm: "AUXM Normal",
    newPrice: "Prix Mis \u00e0 Jour",
    success: "Transaction R\u00e9ussie!",
    orderPlaced: "Ordre Plac\u00e9!",
    limitOrderInfo: "Votre ordre limite sera ex\u00e9cut\u00e9 lorsque le prix du march\u00e9 atteindra votre prix sp\u00e9cifi\u00e9.",
    pendingOrders: "Ordres en Attente",
    noOrders: "Aucun ordre en attente",
    close: "Fermer",
    placeOrder: "Passer l'Ordre",
    partialAllocation: "Allocation Partielle",
    youAreBuying: "Vous achetez",
    vaultAllocated: "Coffre Allou\u00e9",
    nonAllocated: "Non-Allou\u00e9",
    allocationExplanation: "Seuls les grammes entiers peuvent \u00eatre allou\u00e9s au m\u00e9tal physique. Les montants fractionnaires restent non-allou\u00e9s dans votre solde.",
    add: "Ajouter",
    continueBtn: "Continuer",
  },
  ar: {
    buy: "\u0634\u0631\u0627\u0621",
    sell: "\u0628\u064a\u0639",
    market: "\u0633\u0648\u0642",
    limit: "\u0645\u062d\u062f\u062f",
    orderType: "\u0646\u0648\u0639 \u0627\u0644\u0623\u0645\u0631",
    marketDesc: "\u062a\u062f\u0627\u0648\u0644 \u0628\u0633\u0639\u0631 \u0627\u0644\u0633\u0648\u0642 \u0627\u0644\u062d\u0627\u0644\u064a",
    limitDesc: "\u062a\u062f\u0627\u0648\u0644 \u0628\u0627\u0644\u0633\u0639\u0631 \u0627\u0644\u0630\u064a \u062a\u062d\u062f\u062f\u0647",
    amount: "\u0627\u0644\u0643\u0645\u064a\u0629",
    limitPrice: "\u0627\u0644\u0633\u0639\u0631 \u0627\u0644\u0645\u062d\u062f\u062f",
    currentMarketPrice: "\u0633\u0639\u0631 \u0627\u0644\u0633\u0648\u0642 \u0627\u0644\u062d\u0627\u0644\u064a",
    askPrice: "\u0633\u0639\u0631 \u0627\u0644\u0637\u0644\u0628 (Ask)",
    bidPrice: "\u0633\u0639\u0631 \u0627\u0644\u0639\u0631\u0636 (Bid)",
    balance: "\u0627\u0644\u0631\u0635\u064a\u062f",
    bonus: "\u0645\u0643\u0627\u0641\u0623\u0629",
    total: "\u0627\u0644\u0625\u062c\u0645\u0627\u0644\u064a",
    totalPayment: "\u0625\u062c\u0645\u0627\u0644\u064a \u0627\u0644\u062f\u0641\u0639",
    youReceive: "\u0633\u062a\u062a\u0644\u0642\u0649",
    paymentMethod: "\u0637\u0631\u064a\u0642\u0629 \u0627\u0644\u062f\u0641\u0639",
    processing: "\u062c\u0627\u0631\u064a \u0627\u0644\u0645\u0639\u0627\u0644\u062c\u0629...",
    cancel: "\u0625\u0644\u063a\u0627\u0621",
    confirm: "\u062a\u0623\u0643\u064a\u062f",
    priceLocked: "\u0627\u0644\u0633\u0639\u0631 \u0645\u062b\u0628\u062a",
    seconds: "\u062b",
    spread: "\u0627\u0644\u0641\u0627\u0631\u0642",
    insufficientBalance: "\u0631\u0635\u064a\u062f \u063a\u064a\u0631 \u0643\u0627\u0641\u064d",
    bonusUsage: "\u0627\u0633\u062a\u062e\u062f\u0627\u0645 \u0627\u0644\u0645\u0643\u0627\u0641\u0623\u0629",
    normalAuxm: "AUXM \u0639\u0627\u062f\u064a",
    newPrice: "\u062a\u0645 \u062a\u062d\u062f\u064a\u062b \u0627\u0644\u0633\u0639\u0631",
    success: "\u062a\u0645\u062a \u0627\u0644\u0635\u0641\u0642\u0629 \u0628\u0646\u062c\u0627\u062d!",
    orderPlaced: "\u062a\u0645 \u062a\u0642\u062f\u064a\u0645 \u0627\u0644\u0623\u0645\u0631!",
    limitOrderInfo: "\u0633\u064a\u062a\u0645 \u062a\u0646\u0641\u064a\u0630 \u0623\u0645\u0631\u0643 \u0627\u0644\u0645\u062d\u062f\u062f \u0639\u0646\u062f\u0645\u0627 \u064a\u0635\u0644 \u0633\u0639\u0631 \u0627\u0644\u0633\u0648\u0642 \u0625\u0644\u0649 \u0627\u0644\u0633\u0639\u0631 \u0627\u0644\u0630\u064a \u062d\u062f\u062f\u062a\u0647.",
    pendingOrders: "\u0627\u0644\u0623\u0648\u0627\u0645\u0631 \u0627\u0644\u0645\u0639\u0644\u0642\u0629",
    noOrders: "\u0644\u0627 \u062a\u0648\u062c\u062f \u0623\u0648\u0627\u0645\u0631 \u0645\u0639\u0644\u0642\u0629",
    close: "\u0625\u063a\u0644\u0627\u0642",
    placeOrder: "\u062a\u0642\u062f\u064a\u0645 \u0627\u0644\u0623\u0645\u0631",
    partialAllocation: "\u062a\u062e\u0635\u064a\u0635 \u062c\u0632\u0626\u064a",
    youAreBuying: "\u0623\u0646\u062a \u062a\u0634\u062a\u0631\u064a",
    vaultAllocated: "\u0645\u062e\u0635\u0635 \u0641\u064a \u0627\u0644\u062e\u0632\u0646\u0629",
    nonAllocated: "\u063a\u064a\u0631 \u0645\u062e\u0635\u0635",
    allocationExplanation: "\u064a\u0645\u0643\u0646 \u062a\u062e\u0635\u064a\u0635 \u0627\u0644\u063a\u0631\u0627\u0645\u0627\u062a \u0627\u0644\u0643\u0627\u0645\u0644\u0629 \u0641\u0642\u0637 \u0644\u0644\u0645\u0639\u062f\u0646 \u0627\u0644\u0641\u0639\u0644\u064a. \u0627\u0644\u0643\u0633\u0648\u0631 \u062a\u0628\u0642\u0649 \u063a\u064a\u0631 \u0645\u062e\u0635\u0635\u0629 \u0641\u064a \u0631\u0635\u064a\u062f\u0643.",
    add: "\u0625\u0636\u0627\u0641\u0629",
    continueBtn: "\u0645\u062a\u0627\u0628\u0639\u0629",
  },
  ru: {
    buy: "\u041a\u0443\u043f\u0438\u0442\u044c",
    sell: "\u041f\u0440\u043e\u0434\u0430\u0442\u044c",
    market: "\u0420\u044b\u043d\u043e\u043a",
    limit: "\u041b\u0438\u043c\u0438\u0442",
    orderType: "\u0422\u0438\u043f \u041e\u0440\u0434\u0435\u0440\u0430",
    marketDesc: "\u0422\u043e\u0440\u0433\u043e\u0432\u043b\u044f \u043f\u043e \u0442\u0435\u043a\u0443\u0449\u0435\u0439 \u0440\u044b\u043d\u043e\u0447\u043d\u043e\u0439 \u0446\u0435\u043d\u0435",
    limitDesc: "\u0422\u043e\u0440\u0433\u043e\u0432\u043b\u044f \u043f\u043e \u0443\u043a\u0430\u0437\u0430\u043d\u043d\u043e\u0439 \u0432\u0430\u043c\u0438 \u0446\u0435\u043d\u0435",
    amount: "\u041a\u043e\u043b\u0438\u0447\u0435\u0441\u0442\u0432\u043e",
    limitPrice: "\u041b\u0438\u043c\u0438\u0442\u043d\u0430\u044f \u0426\u0435\u043d\u0430",
    currentMarketPrice: "\u0422\u0435\u043a\u0443\u0449\u0430\u044f \u0420\u044b\u043d\u043e\u0447\u043d\u0430\u044f \u0426\u0435\u043d\u0430",
    askPrice: "\u0426\u0435\u043d\u0430 \u041f\u0440\u043e\u0434\u0430\u0436\u0438 (Ask)",
    bidPrice: "\u0426\u0435\u043d\u0430 \u041f\u043e\u043a\u0443\u043f\u043a\u0438 (Bid)",
    balance: "\u0411\u0430\u043b\u0430\u043d\u0441",
    bonus: "\u0411\u043e\u043d\u0443\u0441",
    total: "\u0418\u0442\u043e\u0433\u043e",
    totalPayment: "\u041e\u0431\u0449\u0430\u044f \u041e\u043f\u043b\u0430\u0442\u0430",
    youReceive: "\u0412\u044b \u041f\u043e\u043b\u0443\u0447\u0438\u0442\u0435",
    paymentMethod: "\u0421\u043f\u043e\u0441\u043e\u0431 \u041e\u043f\u043b\u0430\u0442\u044b",
    processing: "\u041e\u0431\u0440\u0430\u0431\u043e\u0442\u043a\u0430...",
    cancel: "\u041e\u0442\u043c\u0435\u043d\u0430",
    confirm: "\u041f\u043e\u0434\u0442\u0432\u0435\u0440\u0434\u0438\u0442\u044c",
    priceLocked: "\u0426\u0435\u043d\u0430 \u0417\u0430\u0444\u0438\u043a\u0441\u0438\u0440\u043e\u0432\u0430\u043d\u0430",
    seconds: "\u0441\u0435\u043a",
    spread: "\u0421\u043f\u0440\u0435\u0434",
    insufficientBalance: "\u041d\u0435\u0434\u043e\u0441\u0442\u0430\u0442\u043e\u0447\u043d\u044b\u0439 \u0431\u0430\u043b\u0430\u043d\u0441",
    bonusUsage: "\u0418\u0441\u043f\u043e\u043b\u044c\u0437\u043e\u0432\u0430\u043d\u0438\u0435 \u0411\u043e\u043d\u0443\u0441\u0430",
    normalAuxm: "\u041e\u0431\u044b\u0447\u043d\u044b\u0439 AUXM",
    newPrice: "\u0426\u0435\u043d\u0430 \u041e\u0431\u043d\u043e\u0432\u043b\u0435\u043d\u0430",
    success: "\u0421\u0434\u0435\u043b\u043a\u0430 \u0423\u0441\u043f\u0435\u0448\u043d\u0430!",
    orderPlaced: "\u041e\u0440\u0434\u0435\u0440 \u0420\u0430\u0437\u043c\u0435\u0449\u0435\u043d!",
    limitOrderInfo: "\u0412\u0430\u0448 \u043b\u0438\u043c\u0438\u0442\u043d\u044b\u0439 \u043e\u0440\u0434\u0435\u0440 \u0431\u0443\u0434\u0435\u0442 \u0438\u0441\u043f\u043e\u043b\u043d\u0435\u043d, \u043a\u043e\u0433\u0434\u0430 \u0440\u044b\u043d\u043e\u0447\u043d\u0430\u044f \u0446\u0435\u043d\u0430 \u0434\u043e\u0441\u0442\u0438\u0433\u043d\u0435\u0442 \u0443\u043a\u0430\u0437\u0430\u043d\u043d\u043e\u0439 \u0432\u0430\u043c\u0438 \u0446\u0435\u043d\u044b.",
    pendingOrders: "\u041e\u0436\u0438\u0434\u0430\u044e\u0449\u0438\u0435 \u041e\u0440\u0434\u0435\u0440\u0430",
    noOrders: "\u041d\u0435\u0442 \u043e\u0436\u0438\u0434\u0430\u044e\u0449\u0438\u0445 \u043e\u0440\u0434\u0435\u0440\u043e\u0432",
    close: "\u0417\u0430\u043a\u0440\u044b\u0442\u044c",
    placeOrder: "\u0420\u0430\u0437\u043c\u0435\u0441\u0442\u0438\u0442\u044c \u041e\u0440\u0434\u0435\u0440",
    partialAllocation: "\u0427\u0430\u0441\u0442\u0438\u0447\u043d\u043e\u0435 \u0420\u0430\u0437\u043c\u0435\u0449\u0435\u043d\u0438\u0435",
    youAreBuying: "\u0412\u044b \u043f\u043e\u043a\u0443\u043f\u0430\u0435\u0442\u0435",
    vaultAllocated: "\u0420\u0430\u0437\u043c\u0435\u0449\u0435\u043d\u043e \u0432 \u0425\u0440\u0430\u043d\u0438\u043b\u0438\u0449\u0435",
    nonAllocated: "\u041d\u0435 \u0420\u0430\u0437\u043c\u0435\u0449\u0435\u043d\u043e",
    allocationExplanation: "\u0422\u043e\u043b\u044c\u043a\u043e \u0446\u0435\u043b\u044b\u0435 \u0433\u0440\u0430\u043c\u043c\u044b \u043c\u043e\u0433\u0443\u0442 \u0431\u044b\u0442\u044c \u0440\u0430\u0437\u043c\u0435\u0449\u0435\u043d\u044b \u0432 \u0444\u0438\u0437\u0438\u0447\u0435\u0441\u043a\u043e\u043c \u043c\u0435\u0442\u0430\u043b\u043b\u0435. \u0414\u0440\u043e\u0431\u043d\u044b\u0435 \u0441\u0443\u043c\u043c\u044b \u043e\u0441\u0442\u0430\u044e\u0442\u0441\u044f \u043d\u0435\u0440\u0430\u0437\u043c\u0435\u0449\u0435\u043d\u043d\u044b\u043c\u0438 \u043d\u0430 \u0432\u0430\u0448\u0435\u043c \u0431\u0430\u043b\u0430\u043d\u0441\u0435.",
    add: "\u0414\u043e\u0431\u0430\u0432\u0438\u0442\u044c",
    continueBtn: "\u041f\u0440\u043e\u0434\u043e\u043b\u0436\u0438\u0442\u044c",
  },
};

export function MetalTradeModal({
  isOpen,
  onClose,
  metal,
  metalName,
  currentPrice,
  bidPrice,
  initialMode = "buy",
  cryptoPrices = { BTC: 97500, ETH: 3650 },
  walletAddress,
  onTradeComplete,
}: MetalTradeModalProps) {
  const { lang } = useLanguage();
  const t = (key: string) => (translations as any)[lang]?.[key] || (translations as any).en[key] || key;
  const { balances: walletBalances } = useWallet();
  const [mode, setMode] = useState<"buy" | "sell">(initialMode);
  const userBalance = {
    auxm: walletBalances?.auxm || 0,
    metals: {
      AUXG: walletBalances?.auxg || 0,
      AUXS: walletBalances?.auxs || 0,
      AUXPT: walletBalances?.auxpt || 0,
      AUXPD: walletBalances?.auxpd || 0,
    },
    crypto: {
      USDT: walletBalances?.usdt || 0,
      USDC: walletBalances?.usdc || 0,
      BTC: walletBalances?.btc || 0,
      ETH: walletBalances?.eth || 0,
    },
  };
  const [orderType, setOrderType] = useState<OrderType>("market");
  const [amount, setAmount] = useState<string>("1");
  const [limitPrice, setLimitPrice] = useState<string>("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("AUXM");
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<"success" | "error" | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  
  const [quote, setQuote] = useState<Quote | null>(null);
  const [countdown, setCountdown] = useState(0);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [showAllocationWarning, setShowAllocationWarning] = useState(false);
  const [allocationPreview, setAllocationPreview] = useState<{
    totalGrams: number;
    allocatedGrams: number;
    nonAllocatedGrams: number;
    hasPartialAllocation: boolean;
    suggestion?: {
      gramsToAdd: number;
      auxmToAdd: number;
      targetGrams: number;
    };
  } | null>(null);

  const metalInfo = METAL_INFO[metal];

  useEffect(() => {
    if (isOpen) {
      setMode(initialMode);
      setOrderType("market");
      setAmount("1");
      setLimitPrice("");
      setPaymentMethod("AUXM");
      setResult(null);
      setErrorMessage("");
      setQuote(null);
      setCountdown(0);
      setShowConfirmation(false);
    }
  }, [isOpen, initialMode]);

  useEffect(() => {
    if (orderType === "limit" && !limitPrice) {
      const defaultPrice = mode === "buy" ? currentPrice : (bidPrice || currentPrice * 0.98);
      setLimitPrice(defaultPrice.toFixed(2));
    }
  }, [orderType, mode, currentPrice, bidPrice, limitPrice]);

  useEffect(() => {
    if (!quote || countdown <= 0) return;
    
    const timer = setInterval(() => {
      const remaining = Math.max(0, Math.floor((quote.expiresAt - Date.now()) / 1000));
      setCountdown(remaining);
      
      if (remaining <= 0) {
        setQuote(null);
        setShowConfirmation(false);
      }
    }, 1000);
    
    return () => clearInterval(timer);
  }, [quote]);

  const amountNum = parseFloat(amount) || 0;
  const limitPriceNum = parseFloat(limitPrice) || 0;
  
  const getDisplayPrice = () => {
    if (orderType === "limit") {
      return limitPriceNum;
    }
    return quote?.pricePerGram || (mode === "buy" ? currentPrice : (bidPrice || currentPrice * 0.98));
  };
  
  const displayPrice = getDisplayPrice();
  
  const getAvailableBalance = (pm: PaymentMethod): number => {
    if (pm === "AUXM") {
      return userBalance?.auxm || 0;
    }
    return userBalance?.crypto?.[pm] || 0;
  };

  const calculateTotal = () => {
    if (mode === "buy") {
      const totalUSD = amountNum * displayPrice;
      if (paymentMethod === "AUXM" || paymentMethod === "USDT") {
        return totalUSD;
      }
      const cryptoPrice = cryptoPrices[paymentMethod as keyof typeof cryptoPrices];
      return totalUSD / cryptoPrice;
    } else {
      return amountNum * displayPrice;
    }
  };

  const total = calculateTotal();
  const availableBalance = getAvailableBalance(paymentMethod);
  
  const hasInsufficientBalance = mode === "buy" 
    ? total > availableBalance 
    : amountNum > (userBalance?.metals?.[metal] || 0);


  const handleMarketOrder = async () => {
    if (!walletAddress || amountNum <= 0 || hasInsufficientBalance) return;
    
    setIsProcessing(true);
    setErrorMessage("");
    
    try {
      const quoteRes = await fetch("/api/quote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: mode,
          metal: metal,
          grams: amountNum,
          address: walletAddress,
        }),
      });
      
      const quoteData = await quoteRes.json();
      
      if (!quoteRes.ok) {
        throw new Error(quoteData.error || "Quote failed");
      }
      
      // API response: { success, quote: {...}, message }
      // Sadece quote objesini state'e set et
      setQuote(quoteData.quote);
      setCountdown(quoteData.quote?.timeRemaining || quoteData.timeRemaining || 15);
      setShowConfirmation(true);
      
    } catch (error: any) {
      setErrorMessage(error.message || "Failed to get quote");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleLimitOrder = async () => {
    if (!walletAddress || amountNum <= 0 || limitPriceNum <= 0 || hasInsufficientBalance) return;
    
    setIsProcessing(true);
    setErrorMessage("");
    
    try {
      const orderRes = await fetch("/api/orders/limit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: mode,
          metal: metal,
          grams: amountNum,
          limitPrice: limitPriceNum,
          paymentMethod: paymentMethod,
          address: walletAddress,
        }),
      });
      
      const orderData = await orderRes.json();
      
      if (!orderRes.ok) {
        throw new Error(orderData.error || "Order failed");
      }
      
      setResult("success");
      onTradeComplete?.();
      
    } catch (error: any) {
      setErrorMessage(error.message || "Failed to place order");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleTradeClick = async () => {
    if (orderType === "limit") {
      handleLimitOrder();
      return;
    }
    
    // Market order için önce allocation preview kontrol et
    console.log("🔍 handleTradeClick - mode:", mode, "showAllocationWarning:", showAllocationWarning);
    if (mode === "buy" && !showAllocationWarning) {
      try {
        // displayPrice = spread uygulanmış fiyat (askPerGram), currentPrice = ham fiyat
        const auxmAmount = amountNum * displayPrice;
        console.log("🔍 Checking allocation preview - amount:", amountNum, "displayPrice:", displayPrice, "auxm:", auxmAmount, "address:", walletAddress);
        const previewRes = await fetch(
          `/api/trade?type=buy&fromToken=AUXM&toToken=${metal}&amount=${auxmAmount}&address=${walletAddress}`
        );
        const previewData = await previewRes.json();
        console.log("🔍 Preview response:", previewData);
        
        if (previewData.preview?.allocationPreview?.hasPartialAllocation) {
          console.log("🔍 Has partial allocation, showing warning");
          setAllocationPreview(previewData.preview.allocationPreview);
          setShowAllocationWarning(true);
          return;
        }
        console.log("🔍 No partial allocation, proceeding");
      } catch (e) {
        console.warn("Preview check failed:", e);
      }
    }
    
    handleMarketOrder();
  };
  
  const handleAllocationConfirm = () => {
    setShowAllocationWarning(false);
    handleMarketOrder();
  };
  
  const handleAddMoreAuxm = () => {
    if (allocationPreview?.suggestion) {
      // Yeni miktarı hesapla (hedef gram * spread'li fiyat)
      const newAuxmAmount = allocationPreview.suggestion.targetGrams * displayPrice;
      setAmount(allocationPreview.suggestion.targetGrams.toString());
    }
    setShowAllocationWarning(false);
  };

  const handleConfirmTrade = async () => {
    if (!quote || !walletAddress || countdown <= 0) return;
    
    setIsProcessing(true);
    setErrorMessage("");
    
    try {
      // Quote'tan gelen değerleri kullan
      const tradePayload = {
        quoteId: quote.id,
        type: mode, // "buy" veya "sell"
        fromToken: mode === "buy" ? "AUXM" : metal,
        toToken: mode === "buy" ? metal : "AUXM",
        fromAmount: mode === "buy" ? quote.totalAUXM : quote.grams,
        address: walletAddress,
        executeOnChain: true,
      };
      
      console.log("🔷 Trade payload:", tradePayload);
      
      const tradeRes = await fetch("/api/trade", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(tradePayload),
      });
      
      const tradeData = await tradeRes.json();
      
      if (!tradeRes.ok) {
        throw new Error(tradeData.error || "Trade failed");
      }
      
      setResult("success");
      onTradeComplete?.();
      
    } catch (error: any) {
      setErrorMessage(error.message || "Trade failed");
      setResult("error");
    } finally {
      setIsProcessing(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-slate-900 rounded-2xl border border-slate-700 w-full max-w-md max-h-[90vh] overflow-y-auto">
        {/* Header with Metal Icon */}
        <div className="flex items-center justify-between p-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: metalInfo.color + '30' }}>
              <Image 
                src={metalInfo.icon} 
                alt={metal} 
                width={28} 
                height={28}
                className="object-contain"
              />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">{metalName}</h2>
              <p className="text-xs text-slate-400">{metal}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-lg transition-colors">
            <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-4 space-y-4">
          {/* Allocation Warning Modal */}
          {showAllocationWarning && allocationPreview && (
            <div className="py-4">
              <div className="flex items-center justify-center mb-4">
                <div className="w-14 h-14 bg-[#BFA181]/20 rounded-full flex items-center justify-center">
                  <svg className="w-7 h-7 text-[#BFA181]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
              </div>
              
              <h3 className="text-lg font-bold text-white text-center mb-2">
                {t("partialAllocation")}
              </h3>

              <p className="text-sm text-slate-400 text-center mb-4">
                {`${t("youAreBuying")} ${formatAmount(allocationPreview.totalGrams, metal)}g ${metal}:`}
              </p>
              
              <div className="bg-slate-800/50 rounded-xl p-4 space-y-3 mb-4">
                {/* Allocated */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 rounded-full bg-[#2F6F62]/20 flex items-center justify-center">
                      <svg className="w-3 h-3 text-[#2F6F62]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <span className="text-sm text-slate-300">
                      {t("vaultAllocated")}
                    </span>
                  </div>
                  <span className="text-sm font-medium text-[#2F6F62]">
                    {allocationPreview.allocatedGrams}g
                  </span>
                </div>
                
                {/* Non-Allocated */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 rounded-full bg-[#BFA181]/20 flex items-center justify-center">
                      <span className="text-[#BFA181] text-xs">○</span>
                    </div>
                    <span className="text-sm text-slate-300">
                      {t("nonAllocated")}
                    </span>
                  </div>
                  <span className="text-sm font-medium text-[#BFA181]">
                    {formatAmount(allocationPreview.nonAllocatedGrams, metal)}g
                  </span>
                </div>
              </div>
              
              <p className="text-xs text-slate-500 text-center mb-4">
                {t("allocationExplanation")}
              </p>
              
              <div className="grid grid-cols-2 gap-3">
                {allocationPreview.suggestion && (
                  <button
                    onClick={handleAddMoreAuxm}
                    className="px-4 py-3 rounded-xl bg-slate-800 border border-slate-600 text-slate-200 hover:bg-slate-700 transition-colors text-sm font-medium"
                  >
                    <span className="block text-xs text-slate-400 mb-0.5">
                      {t("add")}
                    </span>
                    +{formatAmount(allocationPreview.suggestion.gramsToAdd, metal)}g → {allocationPreview.suggestion.targetGrams}g
                  </button>
                )}
                <button
                  onClick={handleAllocationConfirm}
                  className="px-4 py-3 rounded-xl bg-gradient-to-r from-[#BFA181] to-yellow-500 text-black font-semibold hover:from-[#BFA181] hover:to-yellow-600 transition-colors text-sm"
                >
                  {t("continueBtn")}
                </button>
              </div>
            </div>
          )}
          
          {result === "success" ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-[#2F6F62]/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-[#2F6F62]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-white mb-2">
                {orderType === "limit" ? t("orderPlaced") : t("success")}
              </h3>
              {orderType === "limit" && (
                <p className="text-sm text-slate-400 mb-4">{t("limitOrderInfo")}</p>
              )}
              <button
                onClick={onClose}
                className="px-6 py-2 bg-[#2F6F62] hover:bg-[#2F6F62] rounded-xl text-white font-medium"
              >
                {t("close")}
              </button>
            </div>
          ) : showAllocationWarning ? null : (
            <>
              {/* Buy/Sell Toggle */}
              <div className="grid grid-cols-2 gap-2 p-1 bg-slate-800 rounded-xl">
                <button
                  onClick={() => { setMode("buy"); setQuote(null); setShowConfirmation(false); }}
                  className={`py-2.5 rounded-lg font-semibold transition-all ${
                    mode === "buy"
                      ? "bg-[#2F6F62] text-white shadow-lg"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  {t("buy")}
                </button>
                <button
                  onClick={() => { setMode("sell"); setQuote(null); setShowConfirmation(false); }}
                  className={`py-2.5 rounded-lg font-semibold transition-all ${
                    mode === "sell"
                      ? "bg-red-500 text-white shadow-lg"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  {t("sell")}
                </button>
              </div>

              {/* Order Type Toggle */}
              <div>
                <label className="text-sm text-slate-400 mb-2 block">{t("orderType")}</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => { setOrderType("market"); setQuote(null); setShowConfirmation(false); }}
                    className={`p-3 rounded-xl border-2 transition-all ${
                      orderType === "market"
                        ? "border-[#2F6F62] bg-[#2F6F62]/10"
                        : "border-slate-700 bg-slate-800/50 hover:border-slate-600"
                    }`}
                  >
                    <div className={`font-semibold ${orderType === "market" ? "text-[#BFA181]" : "text-slate-300"}`}>
                      {t("market")}
                    </div>
                    <div className="text-xs text-slate-500 mt-1">{t("marketDesc")}</div>
                  </button>
                  <button
                    onClick={() => { setOrderType("limit"); setQuote(null); setShowConfirmation(false); }}
                    className={`p-3 rounded-xl border-2 transition-all ${
                      orderType === "limit"
                        ? "border-blue-500 bg-blue-500/10"
                        : "border-slate-700 bg-slate-800/50 hover:border-slate-600"
                    }`}
                  >
                    <div className={`font-semibold ${orderType === "limit" ? "text-blue-400" : "text-slate-300"}`}>
                      {t("limit")}
                    </div>
                    <div className="text-xs text-slate-500 mt-1">{t("limitDesc")}</div>
                  </button>
                </div>
              </div>

              {/* Balance Display */}
              <div className="p-3 bg-slate-800/50 rounded-xl space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">
                    {mode === "buy" ? `${t("balance")} (${paymentMethod})` : `${t("balance")} (${metal})`}
                  </span>
                  <span className="text-white font-mono">
                    {mode === "buy"
                      ? `${formatAmount(availableBalance, paymentMethod)} ${paymentMethod}`
                      : `${formatAmount(userBalance?.metals?.[metal] || 0, metal)} ${metal}`
                    }
                  </span>
                </div>
              </div>

              {/* Price Display */}
              <div className="p-3 bg-slate-800/50 rounded-xl">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">{mode === "buy" ? t("askPrice") : t("bidPrice")}</span>
                  <span className="text-[#2F6F62] font-mono">${displayPrice.toFixed(2)}/g</span>
                </div>
                {quote && (
                  <div className="flex justify-between text-sm mt-1">
                    <span className="text-slate-400">{t("spread")}</span>
                    <span className="text-[#BFA181] font-mono">{quote.spreadPercent.toFixed(2)}%</span>
                  </div>
                )}
              </div>

              {/* Amount Input */}
              <div>
                <label className="text-sm text-slate-400 mb-2 block">{t("amount")}</label>
                <div className="relative">
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => { setAmount(e.target.value); setQuote(null); setShowConfirmation(false); }}
                    placeholder="0.00"
                    min="0"
                    step="0.01"
                    className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white text-lg font-mono focus:outline-none focus:ring-2 focus:ring-[#BFA181] pr-20"
                  />
                  <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-2">
                    <span className="text-slate-500">{metal}</span>
                    <button
                      onClick={() => {
                        const maxPrice = orderType === "limit" ? limitPriceNum : displayPrice;
                        const max = mode === "buy"
                          ? maxPrice > 0 ? (availableBalance / maxPrice).toFixed(getDecimalPlaces(metal)) : "0"
                          : (userBalance?.metals?.[metal] || 0).toString();
                        setAmount(max);
                        setQuote(null);
                        setShowConfirmation(false);
                      }}
                      className="px-2 py-1 text-xs bg-[#2F6F62]/20 text-[#2F6F62] rounded hover:bg-[#2F6F62]/30"
                    >
                      MAX
                    </button>
                  </div>
                </div>
              </div>

              {/* Limit Price Input */}
              {orderType === "limit" && (
                <div>
                  <label className="text-sm text-slate-400 mb-2 block">{t("limitPrice")}</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">$</span>
                    <input
                      type="number"
                      value={limitPrice}
                      onChange={(e) => setLimitPrice(e.target.value)}
                      placeholder="0.00"
                      min="0"
                      step="0.01"
                      className="w-full pl-8 pr-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white text-lg font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 text-sm">/ gram</span>
                  </div>
                  <div className="flex gap-2 mt-2">
                    {[-5, -2, -1, 0, 1, 2, 5].map((percent) => {
                      const basePrice = mode === "buy" ? currentPrice : (bidPrice || currentPrice * 0.98);
                      const adjustedPrice = basePrice * (1 + percent / 100);
                      return (
                        <button
                          key={percent}
                          onClick={() => setLimitPrice(adjustedPrice.toFixed(2))}
                          className={`flex-1 py-1.5 text-xs rounded-lg transition-colors ${
                            percent === 0 
                              ? "bg-slate-700 text-white" 
                              : percent < 0 
                                ? "bg-[#2F6F62]/20 text-[#2F6F62] hover:bg-[#2F6F62]/30"
                                : "bg-red-500/20 text-red-400 hover:bg-red-500/30"
                          }`}
                        >
                          {percent > 0 ? "+" : ""}{percent}%
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Payment Method */}
              {mode === "buy" && (
                <div>
                  <label className="text-sm text-slate-400 mb-2 block">{t("paymentMethod")}</label>
                  <div className="grid grid-cols-6 gap-2">
                    {PAYMENT_METHODS.map((pm) => (
                      <button
                        key={pm.id}
                        onClick={() => { setPaymentMethod(pm.id); setQuote(null); setShowConfirmation(false); }}
                        className={`p-2 rounded-xl text-center transition-all ${
                          paymentMethod === pm.id
                            ? "bg-purple-500/30 border-2 border-purple-500"
                            : "bg-slate-800 border-2 border-slate-700"
                        }`}
                      >
                        <div className="text-lg" style={{ color: pm.color }}>{pm.icon}</div>
                        <div className="text-xs text-slate-400 mt-1">{pm.name}</div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Total */}
              <div className="p-4 bg-purple-500/10 border border-purple-500/30 rounded-xl">
                <div className="text-sm text-slate-400 mb-1">
                  {mode === "buy" ? t("totalPayment") : t("youReceive")}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-2xl" style={{ color: PAYMENT_METHODS.find(p => p.id === (mode === "buy" ? paymentMethod : "AUXM"))?.color }}>
                    {PAYMENT_METHODS.find(p => p.id === (mode === "buy" ? paymentMethod : "AUXM"))?.icon}
                  </span>
                  <span className="text-2xl font-bold text-white">
                    {formatAmount(total, paymentMethod)}
                  </span>
                  <span className="text-slate-400">{mode === "buy" ? paymentMethod : "AUXM"}</span>
                </div>
                {mode === "buy" && paymentMethod !== "AUXM" && (
                  <div className="text-sm text-slate-400 mt-1">
                    ≈ ${(amountNum * displayPrice).toFixed(2)} USD
                  </div>
                )}
                {orderType === "limit" && (
                  <div className="text-xs text-blue-400 mt-2">
                    @ ${limitPriceNum.toFixed(2)} / gram
                  </div>
                )}
              </div>


              {/* Insufficient Balance Warning */}
              {hasInsufficientBalance && (
                <div className="p-3 bg-red-500/20 border border-red-500/50 rounded-xl">
                  <p className="text-red-400 text-sm">{t("insufficientBalance")}</p>
                </div>
              )}

              {/* Error Message */}
              {errorMessage && !result && (
                <div className="p-3 bg-red-500/20 border border-red-500/50 rounded-xl">
                  <p className="text-red-400 text-sm">{errorMessage}</p>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-3">
                <button
                  onClick={onClose}
                  className="flex-1 py-3 bg-slate-700 hover:bg-slate-600 rounded-xl font-medium text-slate-300 transition-all"
                >
                  {t("cancel")}
                </button>
                
                {orderType === "limit" ? (
                  <button
                    onClick={handleTradeClick}
                    disabled={isProcessing || amountNum <= 0 || limitPriceNum <= 0 || hasInsufficientBalance || !walletAddress}
                    className={`flex-1 py-3 rounded-xl font-semibold text-white transition-all ${
                      isProcessing || amountNum <= 0 || limitPriceNum <= 0 || hasInsufficientBalance || !walletAddress
                        ? "bg-slate-600 cursor-not-allowed"
                        : "bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600"
                    }`}
                  >
                    {isProcessing ? t("processing") : t("placeOrder")}
                  </button>
                ) : !showConfirmation ? (
                  <button
                    onClick={handleTradeClick}
                    disabled={isProcessing || amountNum <= 0 || hasInsufficientBalance || !walletAddress}
                    className={`flex-1 py-3 rounded-xl font-semibold text-white transition-all ${
                      isProcessing || amountNum <= 0 || hasInsufficientBalance || !walletAddress
                        ? "bg-slate-600 cursor-not-allowed"
                        : mode === "buy"
                          ? "bg-gradient-to-r from-[#2F6F62] to-teal-500 hover:from-[#2F6F62] hover:to-teal-600"
                          : "bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600"
                    }`}
                  >
                    {isProcessing ? t("processing") : `${mode === "buy" ? t("buy") : t("sell")} ${metal}`}
                  </button>
                ) : (
                  <button
                    onClick={handleConfirmTrade}
                    disabled={isProcessing || countdown <= 0}
                    className={`flex-1 py-3 rounded-xl font-semibold text-white transition-all ${
                      isProcessing || countdown <= 0
                        ? "bg-slate-600 cursor-not-allowed"
                        : "bg-gradient-to-r from-[#2F6F62] to-teal-500 hover:from-[#2F6F62] hover:to-teal-600 animate-pulse"
                    }`}
                  >
                    {isProcessing ? t("processing") : countdown <= 0 ? t("newPrice") : `✓ ${t("confirm")} (${countdown}s)`}
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default MetalTradeModal;
