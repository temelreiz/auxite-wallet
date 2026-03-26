"use client";

// ============================================
// VAULT - Main Holdings Screen
// Digital Private Bank Style - UBS meets Digital Gold
// Synced with Mobile (auxite-vault)
// ============================================

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import TopNav from "@/components/TopNav";
import LiquidateModal from "@/components/LiquidateModal";
import { MarketStatusBanner } from "@/components/MarketStatusBanner";
import { useLanguage } from "@/components/LanguageContext";
import { formatAmount, getDecimalPlaces } from '@/lib/format';
import { useDemoMode } from "@/hooks/useDemoMode";

// Metal icons
const metalIcons: Record<string, string> = {
  AUXG: "/auxg_icon.png",
  AUXS: "/auxs_icon.png",
  AUXPT: "/auxpt_icon.png",
  AUXPD: "/auxpd_icon.png",
};

// Crypto asset definitions — institutional liquidity instruments
const cryptoAssets = [
  { symbol: "USDT", name: "Tether", color: "#26A17B", icon: "₮" },
  { symbol: "BTC", name: "Bitcoin", color: "#F7931A", icon: "₿" },
  { symbol: "ETH", name: "Ethereum", color: "#627EEA", icon: "Ξ" },
  { symbol: "USDC", name: "USD Coin", color: "#2775CA", icon: "$" },
];

interface MetalHolding {
  symbol: string;
  name: string;
  allocated: number;
  available: number;
  total: number;
  price: number;
  value: number;
  stakedGrams: number;
}

// ============================================
// TRANSLATIONS - Synced with Mobile
// ============================================
const translations: Record<string, Record<string, string>> = {
  // ══════════════════════════════════════════════════════════════
  // ENGLISH (Source of Truth)
  // ══════════════════════════════════════════════════════════════
  en: {
    custodyStatus: "Custody Status", statusOffline: "Offline", statusOnline: "Online",
    connectPrompt: "Connect to activate safeguarded asset infrastructure",
    clientAssetsUnderCustody: "CLIENT ASSETS UNDER CUSTODY",
    heldWithinBankruptcy: "Held within bankruptcy-remote custody structures.",
    lastStatement: "Last Statement",
    allocatedAssets: "ALLOCATED ASSETS",
    allocatedAssetsDesc: "Physical metals held in your name within segregated vault structures.",
    availableLiquidity: "AVAILABLE LIQUIDITY",
    availableLiquidityDesc: "Assets immediately available for transfer, allocation, or redemption.",
    encumberedAssets: "ENCUMBERED ASSETS",
    encumberedAssetsDesc: "Assets currently committed to yield programs, settlement, or delivery obligations.",
    assetUtilization: "ASSET UTILIZATION",
    fullyAllocated: "Fully Allocated",
    fullyAllocatedDesc: "Every gram of metal corresponds to uniquely identified physical bars. No pooled assets.",
    segregated: "Segregated",
    segregatedDesc: "Client assets are legally separated from corporate balance sheets.",
    bankruptcyRemote: "Bankruptcy Remote",
    bankruptcyRemoteDesc: "Your assets remain protected and accessible even in the event of corporate insolvency.",
    audited: "Audited",
    auditedDesc: "Regularly verified by independent third-party auditors.",
    close: "Close",
    capitalActions: "CAPITAL ACTIONS", fundSettlement: "Fund Settlement",
    allocateMetal: "Allocate Metal", enterYield: "Participate", transfer: "Transfer",
    holdings: "Your Holdings", metalsAllocated: "Metals (Allocated)",
    liquidityCashCrypto: "Liquidity (Cash & Crypto)",
    allocated: "Allocated", noHoldings: "No holdings yet", available: "Available",
    sell: "Sell", sellGold: "Sell Gold", sellSilver: "Sell Silver",
    sellPlatinum: "Sell Platinum", sellPalladium: "Sell Palladium",
    buyGold: "Buy Gold", buySilver: "Buy Silver",
    buyPlatinum: "Buy Platinum", buyPalladium: "Buy Palladium",
    holdingsLabel: "Holdings", avgCost: "Avg Cost", market: "Market",
    unrealizedPL: "Unrealized P/L", livePricing: "Live",
    physicalRedemption: "Physical Redemption",
    physicalRedemptionDesc: "Convert allocated metal into physical delivery",
    protectionStatus: "PROTECTION STATUS", protectionLevel: "Protection Level",
    elite: "ELITE", vaultSuspended: "VAULT SUSPENDED",
    vaultSuspendedShort: "All operations halted", vaultId: "Vault ID",
    settlementBalance: "Settlement Balance", auxmUnit: "AUXM",
    auxmPrimaryCapital: "Internal settlement unit for capital movement",
    auxmPeg: "USD equivalent", fullyReserved: "Fully Reserved",
    offBalanceSheet: "Off-Balance Sheet", fundVault: "Fund Vault",
    auxmDisclaimer: "AUXM is an internal settlement unit used exclusively within the Auxite infrastructure. It is not a cryptocurrency or a transferable asset.",
    transferToSettlement: "Transfer to Settlement",
    capitalClarity: "CAPITAL STATUS", settledCapital: "Settled", encumbered: "Encumbered",
    institutionalArchitecture: "Built on institutional custody architecture.",
    trustBar: "FULLY ALLOCATED  •  SEGREGATED  •  AUDITED",
    noMinDeposit: "No minimum deposit required",
    allocateMetals: "Allocate Metals",
    fundFirst: "Fund your vault first",
    step1: "Fund your vault",
    step2: "Allocate metals",
    step3: "Hold or sell anytime",
    trustMicrocopy: "Your funds remain under your control until allocation. You are buying real, allocated metal — not exposure. Sell anytime at live market price.",
    custodySeparation: "Assets under custody are never commingled with corporate funds.",
    notRehypothecated: "Client assets are never rehypothecated.",
    unallocatedCapital: "UNALLOCATED CAPITAL",
    availableForAllocation: "Available for Allocation",
    denominatedInUsd: "Denominated in USD value for settlement purposes.",
    encumberedBreakdown: "Encumbered Breakdown",
    yieldPrograms: "Yield Programs", pendingDelivery: "Pending Physical Delivery",
    tradeSettlement: "Trade Settlement",
    custodyVerification: "Custody Verification",
    custodyVerificationDesc: "Verify via certificate number or QR code",
    noLiquidity: "No liquidity balance yet", total: "Total",
    structuredYield: "Structured Yield", yieldValue: "Yield Value",
    kycRequired: "Identity Verification Required", kycRequiredDesc: "Complete KYC & deposit $100 to earn your 10 AUXS Welcome Bonus!",
    kycPending: "KYC Under Review", kycPendingDesc: "Your verification is being reviewed",
    kycAction: "Verify Now",
    // Demo Mode
    demoMode: "Demo Mode",
    demoDescription: "Virtual balance, real market prices",
    demoActivate: "Try Demo Mode",
    demoBanner: "Demo Mode — Virtual balance, real prices. Ready to invest?",
    demoFundReal: "Fund Your Vault",
    demoBalance: "Virtual Balance",
    demoTryWith: "Experience Auxite with $10,000 virtual balance",
    demoNoRisk: "Trade with real market prices — no risk",
  },
  // ══════════════════════════════════════════════════════════════
  // TURKISH — "Teminatlı" → "Bloke" standardized, auxmPeg fixed
  // ══════════════════════════════════════════════════════════════
  tr: {
    custodyStatus: "Saklama Durumu", statusOffline: "Çevrimdışı", statusOnline: "Çevrimiçi",
    connectPrompt: "Güvenli varlık altyapısını aktifleştirmek için bağlanın",
    clientAssetsUnderCustody: "SAKLAMA ALTINDAKİ MÜŞTERİ VARLIKLARI",
    heldWithinBankruptcy: "İflastan korumalı saklama yapıları altında tutulmaktadır.",
    lastStatement: "Son Özet",
    allocatedAssets: "TAHSİSLİ VARLIKLAR",
    allocatedAssetsDesc: "Adınıza ayrılmış saklama kasalarında tutulan fiziksel metaller.",
    availableLiquidity: "KULLANILABİLİR LİKİDİTE",
    availableLiquidityDesc: "Transfer, tahsis veya teslimat için hemen kullanılabilir varlıklar.",
    encumberedAssets: "BLOKE VARLIKLAR",
    encumberedAssetsDesc: "Getiri programları, takas veya teslimat yükümlülüklerine bağlı varlıklar.",
    assetUtilization: "VARLIK KULLANIM ORANI",
    fullyAllocated: "Tam Tahsisli",
    fullyAllocatedDesc: "Her gram metal, benzersiz olarak tanımlanmış fiziksel külçelere karşılık gelir. Havuzlanmış varlık yok.",
    segregated: "Ayrılmış",
    segregatedDesc: "Müşteri varlıkları kurumsal bilançodan yasal olarak ayrılmıştır.",
    bankruptcyRemote: "İflastan Korumalı",
    bankruptcyRemoteDesc: "Kurumsal iflas durumunda bile varlıklarınız korunur ve erişilebilir kalır.",
    audited: "Denetlenmiş",
    auditedDesc: "Bağımsız üçüncü taraf denetçiler tarafından düzenli olarak doğrulanır.",
    close: "Kapat",
    capitalActions: "SERMAYE İŞLEMLERİ", fundSettlement: "Takas Fonla",
    allocateMetal: "Metal Tahsis Et", enterYield: "Getiriye Katıl", transfer: "Transfer",
    holdings: "Varlıklarınız", metalsAllocated: "Metaller (Tahsisli)",
    liquidityCashCrypto: "Likidite (Nakit & Kripto)",
    allocated: "Tahsisli", noHoldings: "Henüz varlık yok", available: "Kullanılabilir",
    sell: "Sat", sellGold: "Altın Sat", sellSilver: "Gümüş Sat",
    sellPlatinum: "Platin Sat", sellPalladium: "Paladyum Sat",
    buyGold: "Altın Al", buySilver: "Gümüş Al",
    buyPlatinum: "Platin Al", buyPalladium: "Paladyum Al",
    holdingsLabel: "Varlıklar", avgCost: "Ort. Maliyet", market: "Piyasa",
    unrealizedPL: "Gerçekleşmemiş K/Z", livePricing: "Canlı",
    physicalRedemption: "Fiziksel Teslimat",
    physicalRedemptionDesc: "Tahsisli metali fiziksel teslimata dönüştürün",
    protectionStatus: "KORUMA DURUMU", protectionLevel: "Koruma Seviyesi",
    elite: "ELITE", vaultSuspended: "KASA ASKIYA ALINDI",
    vaultSuspendedShort: "Tüm işlemler durduruldu", vaultId: "Kasa ID",
    settlementBalance: "Takas Bakiyesi", auxmUnit: "AUXM",
    auxmPrimaryCapital: "Sermaye hareketi için dahili takas birimi",
    auxmPeg: "USD eşdeğeri", fullyReserved: "Tam Rezervli",
    offBalanceSheet: "Bilanço Dışı", fundVault: "Kasayı Fonla",
    auxmDisclaimer: "AUXM, yalnızca Auxite altyapısı içinde kullanılan dahili takas birimidir. Kripto para veya transfer edilebilir varlık değildir.",
    transferToSettlement: "Takasa Transfer Et",
    capitalClarity: "SERMAYE DURUMU", settledCapital: "Takas Edilmiş", encumbered: "Bloke",
    institutionalArchitecture: "Kurumsal saklama mimarisi üzerine inşa edilmiştir.",
    trustBar: "TAM TAHSİSLİ  •  AYRILMIŞ  •  DENETLENMİŞ",
    noMinDeposit: "Minimum yatırım tutarı yok",
    allocateMetals: "Metal Tahsis Et",
    fundFirst: "Önce kasanızı fonlayın",
    step1: "Kasanızı fonlayın",
    step2: "Metal tahsis edin",
    step3: "Tutun veya istediğiniz zaman satın",
    trustMicrocopy: "Fonlarınız tahsis edilene kadar kontrolünüz altındadır. Gerçek, tahsis edilmiş metal satın alıyorsunuz — maruz kalma değil. İstediğiniz zaman canlı piyasa fiyatından satın.",
    custodySeparation: "Saklama altındaki varlıklar hiçbir zaman kurumsal fonlarla birleştirilmez.",
    notRehypothecated: "Müşteri varlıkları asla yeniden teminatlandırılmaz.",
    unallocatedCapital: "TAHSİS EDİLMEMİŞ SERMAYE",
    availableForAllocation: "Tahsis için kullanılabilir",
    denominatedInUsd: "Takas amaçları için USD değerinde ifade edilir.",
    encumberedBreakdown: "Bloke Dağılımı",
    yieldPrograms: "Getiri Programları", pendingDelivery: "Bekleyen Fiziksel Teslimat",
    tradeSettlement: "Takas İşlemleri",
    custodyVerification: "Saklama Doğrulama",
    custodyVerificationDesc: "Sertifika numarası veya QR kod ile doğrulayın",
    noLiquidity: "Henüz likidite bakiyesi yok", total: "Toplam",
    structuredYield: "Yapılandırılmış Getiri", yieldValue: "Getiri Değeri",
    kycRequired: "Kimlik Doğrulama Gerekli", kycRequiredDesc: "KYC'nizi tamamlayın ve $100 yatırın, 10 AUXS Hoş Geldin Bonusu kazanın!",
    kycPending: "KYC İnceleniyor", kycPendingDesc: "Doğrulamanız inceleniyor",
    kycAction: "Doğrula",
    // Demo Mode
    demoMode: "Demo Modu",
    demoDescription: "Sanal bakiye, gerçek piyasa fiyatları",
    demoActivate: "Demo Modunu Dene",
    demoBanner: "Demo Modu — Sanal bakiye, gerçek fiyatlar. Yatırım yapmaya hazır mısınız?",
    demoFundReal: "Kasanızı Fonlayın",
    demoBalance: "Sanal Bakiye",
    demoTryWith: "Auxite'i $10.000 sanal bakiye ile deneyimleyin",
    demoNoRisk: "Gerçek piyasa fiyatlarıyla işlem yapın — risk yok",
  },
  // ══════════════════════════════════════════════════════════════
  // GERMAN
  // ══════════════════════════════════════════════════════════════
  de: {
    custodyStatus: "Verwahrungsstatus", statusOffline: "Offline", statusOnline: "Online",
    connectPrompt: "Verbinden Sie sich, um die gesicherte Vermögensinfrastruktur zu aktivieren",
    clientAssetsUnderCustody: "KUNDENVERMÖGEN IN VERWAHRUNG",
    heldWithinBankruptcy: "Gehalten in insolvenzfernen Verwahrungsstrukturen.",
    lastStatement: "Letzter Auszug",
    allocatedAssets: "ZUGETEILTE VERMÖGENSWERTE",
    allocatedAssetsDesc: "Physische Metalle in Ihrem Namen in getrennten Tresorstrukturen verwahrt.",
    availableLiquidity: "VERFÜGBARE LIQUIDITÄT",
    availableLiquidityDesc: "Sofort verfügbare Vermögenswerte für Überweisung, Zuteilung oder Einlösung.",
    encumberedAssets: "BELASTETE VERMÖGENSWERTE",
    encumberedAssetsDesc: "Vermögenswerte in Ertragsprogrammen, Abwicklung oder Lieferverpflichtungen.",
    assetUtilization: "AUSLASTUNG",
    fullyAllocated: "Vollständig zugeteilt",
    fullyAllocatedDesc: "Jedes Gramm Metall entspricht eindeutig identifizierten physischen Barren.",
    segregated: "Getrennt",
    segregatedDesc: "Kundenvermögen ist rechtlich von Unternehmensbilanzen getrennt.",
    bankruptcyRemote: "Insolvenzfern",
    bankruptcyRemoteDesc: "Ihre Vermögenswerte bleiben auch im Falle einer Unternehmensinsolvenz geschützt.",
    audited: "Geprüft",
    auditedDesc: "Regelmäßig von unabhängigen Prüfern verifiziert.",
    close: "Schließen",
    capitalActions: "KAPITALAKTIONEN", fundSettlement: "Abwicklung finanzieren",
    allocateMetal: "Metall zuteilen", enterYield: "Teilnehmen", transfer: "Überweisung",
    holdings: "Ihre Bestände", metalsAllocated: "Metalle (Zugeteilt)",
    liquidityCashCrypto: "Liquidität (Bar & Krypto)",
    allocated: "Zugeteilt", noHoldings: "Noch keine Bestände", available: "Verfügbar",
    sell: "Verkaufen", sellGold: "Gold verkaufen", sellSilver: "Silber verkaufen",
    sellPlatinum: "Platin verkaufen", sellPalladium: "Palladium verkaufen",
    buyGold: "Gold kaufen", buySilver: "Silber kaufen",
    buyPlatinum: "Platin kaufen", buyPalladium: "Palladium kaufen",
    holdingsLabel: "Bestände", avgCost: "Durchschn. Kosten", market: "Markt",
    unrealizedPL: "Unrealisierter G/V", livePricing: "Live",
    physicalRedemption: "Physische Einlösung",
    physicalRedemptionDesc: "Zugeteiltes Metall in physische Lieferung umwandeln",
    protectionStatus: "SCHUTZSTATUS", protectionLevel: "Schutzniveau",
    elite: "ELITE", vaultSuspended: "TRESOR GESPERRT",
    vaultSuspendedShort: "Alle Operationen gestoppt", vaultId: "Tresor-ID",
    settlementBalance: "Abwicklungssaldo", auxmUnit: "AUXM",
    auxmPrimaryCapital: "Interne Abwicklungseinheit für Kapitalbewegung",
    auxmPeg: "USD-Äquivalent", fullyReserved: "Vollständig reserviert",
    offBalanceSheet: "Außerbilanziell", fundVault: "Tresor finanzieren",
    auxmDisclaimer: "AUXM ist eine interne Abwicklungseinheit, die ausschließlich innerhalb der Auxite-Infrastruktur verwendet wird. Es ist keine Kryptowährung oder übertragbarer Vermögenswert.",
    transferToSettlement: "Zur Abwicklung überweisen",
    capitalClarity: "KAPITALSTATUS", settledCapital: "Abgewickelt", encumbered: "Belastet",
    institutionalArchitecture: "Aufgebaut auf institutioneller Verwahrungsarchitektur.",
    trustBar: "VOLL ZUGETEILT  •  GETRENNT  •  GEPRÜFT",
    noMinDeposit: "Keine Mindesteinlage erforderlich",
    allocateMetals: "Metalle zuweisen",
    fundFirst: "Finanzieren Sie zuerst Ihren Tresor",
    step1: "Tresor finanzieren",
    step2: "Metalle zuweisen",
    step3: "Halten oder jederzeit verkaufen",
    trustMicrocopy: "Ihre Mittel bleiben bis zur Zuweisung unter Ihrer Kontrolle. Sie kaufen echtes, zugewiesenes Metall — keine Exposition. Jederzeit zum Live-Marktpreis verkaufen.",
    custodySeparation: "Verwahrte Vermögenswerte werden niemals mit Unternehmensgeldern vermischt.",
    notRehypothecated: "Kundenvermögen wird niemals weiterverpfändet.",
    unallocatedCapital: "NICHT ZUGETEILTES KAPITAL",
    availableForAllocation: "Verfügbar zur Zuteilung",
    denominatedInUsd: "In USD-Wert für Abwicklungszwecke denominiert.",
    encumberedBreakdown: "Belastungsaufschlüsselung",
    yieldPrograms: "Ertragsprogramme", pendingDelivery: "Ausstehende physische Lieferung",
    tradeSettlement: "Handelsabwicklung",
    custodyVerification: "Verwahrungsverifizierung",
    custodyVerificationDesc: "Verifizieren Sie per Zertifikatsnummer oder QR-Code",
    noLiquidity: "Noch kein Liquiditätssaldo", total: "Gesamt",
    structuredYield: "Strukturierter Ertrag", yieldValue: "Ertragswert",
    kycRequired: "Identitätsprüfung erforderlich", kycRequiredDesc: "KYC abschließen & $100 einzahlen, um 10 AUXS Willkommensbonus zu erhalten!",
    kycPending: "KYC wird überprüft", kycPendingDesc: "Ihre Verifizierung wird überprüft",
    kycAction: "Jetzt verifizieren",
    // Demo Mode
    demoMode: "Demo-Modus",
    demoDescription: "Virtuelles Guthaben, echte Marktpreise",
    demoActivate: "Demo-Modus testen",
    demoBanner: "Demo-Modus — Virtuelles Guthaben, echte Preise. Bereit zu investieren?",
    demoFundReal: "Tresor finanzieren",
    demoBalance: "Virtuelles Guthaben",
    demoTryWith: "Erleben Sie Auxite mit $10.000 virtuellem Guthaben",
    demoNoRisk: "Handeln Sie mit echten Marktpreisen — kein Risiko",
  },
  // ══════════════════════════════════════════════════════════════
  // FRENCH
  // ══════════════════════════════════════════════════════════════
  fr: {
    custodyStatus: "Statut de conservation", statusOffline: "Hors ligne", statusOnline: "En ligne",
    connectPrompt: "Connectez-vous pour activer l'infrastructure sécurisée des actifs",
    clientAssetsUnderCustody: "ACTIFS CLIENTS EN CONSERVATION",
    heldWithinBankruptcy: "Détenus dans des structures de conservation protégées contre la faillite.",
    lastStatement: "Dernier relevé",
    allocatedAssets: "ACTIFS ALLOUÉS",
    allocatedAssetsDesc: "Métaux physiques détenus à votre nom dans des structures de coffre ségrégué.",
    availableLiquidity: "LIQUIDITÉ DISPONIBLE",
    availableLiquidityDesc: "Actifs immédiatement disponibles pour transfert, allocation ou rachat.",
    encumberedAssets: "ACTIFS GREVÉS",
    encumberedAssetsDesc: "Actifs engagés dans des programmes de rendement, règlement ou livraison.",
    assetUtilization: "UTILISATION",
    fullyAllocated: "Entièrement alloué",
    fullyAllocatedDesc: "Chaque gramme de métal correspond à des lingots physiques identifiés.",
    segregated: "Ségrégué",
    segregatedDesc: "Les actifs clients sont légalement séparés des bilans de l'entreprise.",
    bankruptcyRemote: "Protection faillite",
    bankruptcyRemoteDesc: "Vos actifs restent protégés même en cas d'insolvabilité de l'entreprise.",
    audited: "Audité",
    auditedDesc: "Régulièrement vérifié par des auditeurs indépendants.",
    close: "Fermer",
    capitalActions: "ACTIONS DE CAPITAL", fundSettlement: "Financer le règlement",
    allocateMetal: "Allouer du métal", enterYield: "Participer", transfer: "Transfert",
    holdings: "Vos avoirs", metalsAllocated: "Métaux (Alloués)",
    liquidityCashCrypto: "Liquidité (Espèces & Crypto)",
    allocated: "Alloué", noHoldings: "Pas encore d'avoirs", available: "Disponible",
    sell: "Vendre", sellGold: "Vendre de l'or", sellSilver: "Vendre de l'argent",
    sellPlatinum: "Vendre du platine", sellPalladium: "Vendre du palladium",
    buyGold: "Acheter de l'or", buySilver: "Acheter de l'argent",
    buyPlatinum: "Acheter du platine", buyPalladium: "Acheter du palladium",
    holdingsLabel: "Avoirs", avgCost: "Coût moyen", market: "Marché",
    unrealizedPL: "P/L non réalisé", livePricing: "En direct",
    physicalRedemption: "Rachat physique",
    physicalRedemptionDesc: "Convertir le métal alloué en livraison physique",
    protectionStatus: "STATUT DE PROTECTION", protectionLevel: "Niveau de protection",
    elite: "ÉLITE", vaultSuspended: "COFFRE SUSPENDU",
    vaultSuspendedShort: "Toutes les opérations arrêtées", vaultId: "ID du coffre",
    settlementBalance: "Solde de règlement", auxmUnit: "AUXM",
    auxmPrimaryCapital: "Unité de règlement interne pour les mouvements de capitaux",
    auxmPeg: "Équivalent USD", fullyReserved: "Entièrement réservé",
    offBalanceSheet: "Hors bilan", fundVault: "Financer le coffre",
    auxmDisclaimer: "AUXM est une unité de règlement interne utilisée exclusivement au sein de l'infrastructure Auxite. Ce n'est pas une cryptomonnaie ni un actif transférable.",
    transferToSettlement: "Transférer au règlement",
    capitalClarity: "STATUT DU CAPITAL", settledCapital: "Réglé", encumbered: "Grevé",
    institutionalArchitecture: "Construit sur une architecture de conservation institutionnelle.",
    trustBar: "ENTIÈREMENT ALLOUÉ  •  SÉPARÉ  •  AUDITÉ",
    noMinDeposit: "Aucun dépôt minimum requis",
    allocateMetals: "Allouer des Métaux",
    fundFirst: "Alimentez d'abord votre coffre",
    step1: "Alimentez votre coffre",
    step2: "Allouez des métaux",
    step3: "Conservez ou vendez à tout moment",
    trustMicrocopy: "Vos fonds restent sous votre contrôle jusqu'à l'allocation. Vous achetez du métal réel et alloué — pas une exposition. Vendez à tout moment au prix du marché.",
    custodySeparation: "Les actifs en conservation ne sont jamais mélangés avec les fonds de l'entreprise.",
    notRehypothecated: "Les actifs clients ne sont jamais réhypothéqués.",
    unallocatedCapital: "CAPITAL NON ALLOUÉ",
    availableForAllocation: "Disponible pour allocation",
    denominatedInUsd: "Libellé en valeur USD à des fins de règlement.",
    encumberedBreakdown: "Détail des charges",
    yieldPrograms: "Programmes de rendement", pendingDelivery: "Livraison physique en attente",
    tradeSettlement: "Règlement des transactions",
    custodyVerification: "Vérification de conservation",
    custodyVerificationDesc: "Vérifiez par numéro de certificat ou code QR",
    noLiquidity: "Pas encore de solde de liquidité", total: "Total",
    structuredYield: "Rendement structuré", yieldValue: "Valeur du rendement",
    kycRequired: "Vérification d'identité requise", kycRequiredDesc: "Complétez le KYC et déposez 100$ pour gagner 10 AUXS de bonus de bienvenue !",
    kycPending: "KYC en cours d'examen", kycPendingDesc: "Votre vérification est en cours",
    kycAction: "Vérifier",
    // Demo Mode
    demoMode: "Mode Démo",
    demoDescription: "Solde virtuel, prix réels du marché",
    demoActivate: "Essayer le Mode Démo",
    demoBanner: "Mode Démo — Solde virtuel, prix réels. Prêt à investir ?",
    demoFundReal: "Financer le Coffre",
    demoBalance: "Solde Virtuel",
    demoTryWith: "Découvrez Auxite avec un solde virtuel de 10 000 $",
    demoNoRisk: "Tradez avec les prix réels du marché — sans risque",
  },
  // ══════════════════════════════════════════════════════════════
  // ARABIC
  // ══════════════════════════════════════════════════════════════
  ar: {
    custodyStatus: "حالة الحفظ", statusOffline: "غير متصل", statusOnline: "متصل",
    connectPrompt: "اتصل لتفعيل البنية التحتية المؤمنة للأصول",
    clientAssetsUnderCustody: "أصول العملاء تحت الحفظ",
    heldWithinBankruptcy: "محتفظ بها ضمن هياكل حفظ محمية من الإفلاس.",
    lastStatement: "آخر كشف",
    allocatedAssets: "الأصول المخصصة",
    allocatedAssetsDesc: "معادن مادية محتفظ بها باسمك في هياكل خزنة منفصلة.",
    availableLiquidity: "السيولة المتاحة",
    availableLiquidityDesc: "أصول متاحة فوراً للتحويل أو التخصيص أو الاسترداد.",
    encumberedAssets: "الأصول المرهونة",
    encumberedAssetsDesc: "أصول ملتزمة ببرامج العائد أو التسوية أو التسليم.",
    assetUtilization: "معدل الاستخدام",
    fullyAllocated: "مخصص بالكامل",
    fullyAllocatedDesc: "كل غرام من المعدن يقابل سبائك مادية محددة بشكل فريد.",
    segregated: "منفصل",
    segregatedDesc: "أصول العملاء مفصولة قانونياً عن الميزانيات العمومية للشركة.",
    bankruptcyRemote: "محمي من الإفلاس",
    bankruptcyRemoteDesc: "تبقى أصولك محمية ومتاحة حتى في حالة إفلاس الشركة.",
    audited: "مُدقق",
    auditedDesc: "يتم التحقق منه بانتظام من قبل مدققين مستقلين.",
    close: "إغلاق",
    capitalActions: "إجراءات رأس المال", fundSettlement: "تمويل التسوية",
    allocateMetal: "تخصيص المعدن", enterYield: "المشاركة", transfer: "تحويل",
    holdings: "ممتلكاتك", metalsAllocated: "المعادن (المخصصة)",
    liquidityCashCrypto: "السيولة (نقد وعملات رقمية)",
    allocated: "مخصص", noHoldings: "لا توجد ممتلكات بعد", available: "متاح",
    sell: "بيع", sellGold: "بيع الذهب", sellSilver: "بيع الفضة",
    sellPlatinum: "بيع البلاتين", sellPalladium: "بيع البالاديوم",
    buyGold: "شراء الذهب", buySilver: "شراء الفضة",
    buyPlatinum: "شراء البلاتين", buyPalladium: "شراء البالاديوم",
    holdingsLabel: "الممتلكات", avgCost: "متوسط التكلفة", market: "السوق",
    unrealizedPL: "ربح/خسارة غير محقق", livePricing: "مباشر",
    physicalRedemption: "استرداد مادي",
    physicalRedemptionDesc: "تحويل المعدن المخصص إلى تسليم مادي",
    protectionStatus: "حالة الحماية", protectionLevel: "مستوى الحماية",
    elite: "نخبة", vaultSuspended: "الخزنة معلقة",
    vaultSuspendedShort: "جميع العمليات متوقفة", vaultId: "معرف الخزنة",
    settlementBalance: "رصيد التسوية", auxmUnit: "AUXM",
    auxmPrimaryCapital: "وحدة تسوية داخلية لحركة رأس المال",
    auxmPeg: "معادل الدولار", fullyReserved: "محجوز بالكامل",
    offBalanceSheet: "خارج الميزانية", fundVault: "تمويل الخزنة",
    auxmDisclaimer: "AUXM هي وحدة تسوية داخلية تُستخدم حصرياً ضمن بنية Auxite التحتية. ليست عملة مشفرة أو أصل قابل للتحويل.",
    transferToSettlement: "تحويل إلى التسوية",
    capitalClarity: "حالة رأس المال", settledCapital: "مسوّى", encumbered: "مرهون",
    institutionalArchitecture: "مبني على بنية حفظ مؤسسية.",
    trustBar: "مخصص بالكامل  •  منفصل  •  مدقق",
    noMinDeposit: "لا يوجد حد أدنى للإيداع",
    allocateMetals: "تخصيص المعادن",
    fundFirst: "قم بتمويل خزنتك أولاً",
    step1: "موّل خزنتك",
    step2: "خصّص المعادن",
    step3: "احتفظ أو بع في أي وقت",
    trustMicrocopy: "أموالك تبقى تحت سيطرتك حتى التخصيص. أنت تشتري معدناً حقيقياً مخصصاً — وليس تعرضاً. بع في أي وقت بسعر السوق المباشر.",
    custodySeparation: "لا يتم خلط الأصول المحفوظة أبداً مع أموال الشركة.",
    notRehypothecated: "لا يتم إعادة رهن أصول العملاء أبداً.",
    unallocatedCapital: "رأس المال غير المخصص",
    availableForAllocation: "متاح للتخصيص",
    denominatedInUsd: "مقوم بقيمة الدولار لأغراض التسوية.",
    encumberedBreakdown: "تفصيل الرهن",
    yieldPrograms: "برامج العائد", pendingDelivery: "تسليم مادي معلق",
    tradeSettlement: "تسوية التداول",
    custodyVerification: "التحقق من الحفظ",
    custodyVerificationDesc: "التحقق عبر رقم الشهادة أو رمز QR",
    noLiquidity: "لا يوجد رصيد سيولة بعد", total: "الإجمالي",
    structuredYield: "العائد المهيكل", yieldValue: "قيمة العائد",
    kycRequired: "مطلوب التحقق من الهوية", kycRequiredDesc: "أكمل KYC وأودع 100$ لكسب 10 AUXS مكافأة ترحيب!",
    kycPending: "KYC قيد المراجعة", kycPendingDesc: "يتم مراجعة التحقق الخاص بك",
    kycAction: "تحقق الآن",
    // Demo Mode
    demoMode: "الوضع التجريبي",
    demoDescription: "رصيد افتراضي، أسعار سوق حقيقية",
    demoActivate: "جرّب الوضع التجريبي",
    demoBanner: "الوضع التجريبي — رصيد افتراضي، أسعار حقيقية. مستعد للاستثمار؟",
    demoFundReal: "موّل خزنتك",
    demoBalance: "الرصيد الافتراضي",
    demoTryWith: "جرّب Auxite برصيد افتراضي قدره 10,000$",
    demoNoRisk: "تداول بأسعار السوق الحقيقية — بدون مخاطر",
  },
  // ══════════════════════════════════════════════════════════════
  // RUSSIAN
  // ══════════════════════════════════════════════════════════════
  ru: {
    custodyStatus: "Статус хранения", statusOffline: "Офлайн", statusOnline: "Онлайн",
    connectPrompt: "Подключитесь для активации защищённой инфраструктуры активов",
    clientAssetsUnderCustody: "КЛИЕНТСКИЕ АКТИВЫ НА ХРАНЕНИИ",
    heldWithinBankruptcy: "Хранятся в структурах, защищённых от банкротства.",
    lastStatement: "Последняя выписка",
    allocatedAssets: "РАЗМЕЩЁННЫЕ АКТИВЫ",
    allocatedAssetsDesc: "Физические металлы, хранящиеся на ваше имя в обособленных хранилищах.",
    availableLiquidity: "ДОСТУПНАЯ ЛИКВИДНОСТЬ",
    availableLiquidityDesc: "Активы, доступные для перевода, размещения или погашения.",
    encumberedAssets: "ОБРЕМЕНЁННЫЕ АКТИВЫ",
    encumberedAssetsDesc: "Активы в программах доходности, расчётах или обязательствах по доставке.",
    assetUtilization: "ИСПОЛЬЗОВАНИЕ",
    fullyAllocated: "Полностью размещено",
    fullyAllocatedDesc: "Каждый грамм металла соответствует уникально идентифицированным физическим слиткам.",
    segregated: "Обособлено",
    segregatedDesc: "Активы клиентов юридически отделены от корпоративных балансов.",
    bankruptcyRemote: "Защита от банкротства",
    bankruptcyRemoteDesc: "Ваши активы остаются защищёнными даже в случае банкротства компании.",
    audited: "Проверено",
    auditedDesc: "Регулярно проверяется независимыми аудиторами.",
    close: "Закрыть",
    capitalActions: "ДЕЙСТВИЯ С КАПИТАЛОМ", fundSettlement: "Финансировать расчёт",
    allocateMetal: "Разместить металл", enterYield: "Участвовать", transfer: "Перевод",
    holdings: "Ваши активы", metalsAllocated: "Металлы (Размещённые)",
    liquidityCashCrypto: "Ликвидность (Наличные и Крипто)",
    allocated: "Размещено", noHoldings: "Активов пока нет", available: "Доступно",
    sell: "Продать", sellGold: "Продать золото", sellSilver: "Продать серебро",
    sellPlatinum: "Продать платину", sellPalladium: "Продать палладий",
    buyGold: "Купить золото", buySilver: "Купить серебро",
    buyPlatinum: "Купить платину", buyPalladium: "Купить палладий",
    holdingsLabel: "Активы", avgCost: "Ср. стоимость", market: "Рынок",
    unrealizedPL: "Нереализованный P/L", livePricing: "Онлайн",
    physicalRedemption: "Физическое погашение",
    physicalRedemptionDesc: "Конвертировать размещённый металл в физическую доставку",
    protectionStatus: "СТАТУС ЗАЩИТЫ", protectionLevel: "Уровень защиты",
    elite: "ЭЛИТА", vaultSuspended: "ХРАНИЛИЩЕ ПРИОСТАНОВЛЕНО",
    vaultSuspendedShort: "Все операции остановлены", vaultId: "ID хранилища",
    settlementBalance: "Расчётный баланс", auxmUnit: "AUXM",
    auxmPrimaryCapital: "Внутренняя расчётная единица для движения капитала",
    auxmPeg: "Эквивалент USD", fullyReserved: "Полностью зарезервировано",
    offBalanceSheet: "Внебалансовый", fundVault: "Пополнить хранилище",
    auxmDisclaimer: "AUXM — внутренняя расчётная единица, используемая исключительно в инфраструктуре Auxite. Это не криптовалюта и не передаваемый актив.",
    transferToSettlement: "Перевести на расчёт",
    capitalClarity: "СТАТУС КАПИТАЛА", settledCapital: "Рассчитано", encumbered: "Обременено",
    institutionalArchitecture: "Построено на институциональной архитектуре хранения.",
    trustBar: "ПОЛНОСТЬЮ РАСПРЕДЕЛЕНО  •  СЕГРЕГИРОВАНО  •  ПРОВЕРЕНО",
    noMinDeposit: "Минимальный депозит не требуется",
    allocateMetals: "Распределить Металлы",
    fundFirst: "Сначала пополните хранилище",
    step1: "Пополните хранилище",
    step2: "Распределите металлы",
    step3: "Держите или продавайте в любое время",
    trustMicrocopy: "Ваши средства остаются под вашим контролем до распределения. Вы покупаете реальный, распределённый металл — не экспозицию. Продавайте в любое время по рыночной цене.",
    custodySeparation: "Хранимые активы никогда не смешиваются с корпоративными средствами.",
    notRehypothecated: "Активы клиентов никогда не перезакладываются.",
    unallocatedCapital: "НЕРАСПРЕДЕЛЁННЫЙ КАПИТАЛ",
    availableForAllocation: "Доступно для размещения",
    denominatedInUsd: "Деноминировано в USD для расчётных целей.",
    encumberedBreakdown: "Детализация обременений",
    yieldPrograms: "Программы доходности", pendingDelivery: "Ожидающая физическая доставка",
    tradeSettlement: "Торговый расчёт",
    custodyVerification: "Верификация хранения",
    custodyVerificationDesc: "Проверьте по номеру сертификата или QR-коду",
    noLiquidity: "Баланс ликвидности пока отсутствует", total: "Итого",
    structuredYield: "Структурированный доход", yieldValue: "Стоимость дохода",
    kycRequired: "Требуется проверка личности", kycRequiredDesc: "Пройдите KYC и внесите $100, чтобы получить 10 AUXS приветственный бонус!",
    kycPending: "KYC на рассмотрении", kycPendingDesc: "Ваша верификация рассматривается",
    kycAction: "Подтвердить",
    // Demo Mode
    demoMode: "Демо-режим",
    demoDescription: "Виртуальный баланс, реальные рыночные цены",
    demoActivate: "Попробовать Демо",
    demoBanner: "Демо-режим — Виртуальный баланс, реальные цены. Готовы инвестировать?",
    demoFundReal: "Пополнить Хранилище",
    demoBalance: "Виртуальный Баланс",
    demoTryWith: "Попробуйте Auxite с виртуальным балансом $10 000",
    demoNoRisk: "Торгуйте по реальным рыночным ценам — без риска",
  },
};

export default function VaultPage() {
  const { lang } = useLanguage();
  const t = translations[lang] || translations.en;

  // Auxite Vault Wallet - no external wallet connect
  const [address, setAddress] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Load wallet address from localStorage
  useEffect(() => {
    const savedAddress = localStorage.getItem("auxite_wallet_address");
    if (savedAddress) {
      setAddress(savedAddress);
    }
  }, []);
  const [totalVaultValue, setTotalVaultValue] = useState(0);
  const [allocatedHoldings, setAllocatedHoldings] = useState(0);
  const [encumberedAssetsValue, setEncumberedAssetsValue] = useState(0);
  const [liquidityValue, setLiquidityValue] = useState(0);
  const [holdings, setHoldings] = useState<MetalHolding[]>([]);
  const [settlementBalance, setSettlementBalance] = useState(0);
  const [cryptoBalances, setCryptoBalances] = useState<Record<string, number>>({});
  const [cryptoPrices, setCryptoPrices] = useState<Record<string, number>>({});
  const [trustBadgeModal, setTrustBadgeModal] = useState<string | null>(null);
  const [showEncumberedModal, setShowEncumberedModal] = useState(false);
  const [encumberedBreakdown, setEncumberedBreakdown] = useState({ yieldPrograms: 0, pendingDelivery: 0, tradeSettlement: 0 });
  const [sellModal, setSellModal] = useState<{ open: boolean; metal: MetalHolding | null }>({ open: false, metal: null });
  const [kycStatus, setKycStatus] = useState<'none' | 'pending' | 'verified'>('none');
  const [kycLoaded, setKycLoaded] = useState(false);
  const [bonusData, setBonusData] = useState<any>(null);
  const [custodyStatus, setCustodyStatus] = useState<'active' | 'pending' | 'offline'>('offline');
  const [custodyProvider, setCustodyProvider] = useState<string>('');
  const [realVaultId, setRealVaultId] = useState<string | null>(null);

  // Demo Mode — shared hook
  const { demoActive, demoBalance, demoChecked, demoLoading, activateDemo, executeDemoTrade } = useDemoMode(address);

  const vaultId = realVaultId || (address ? `AUX-${address.slice(2, 8).toUpperCase()}` : null);
  const protectionLevel = custodyStatus === 'active' ? 85 : 50;

  // Fetch custody vault data — skip in demo mode
  useEffect(() => {
    if (demoActive) return;

    const fetchCustodyData = async () => {
      try {
        const token = localStorage.getItem("authToken");
        if (!token) return;

        const response = await fetch("/api/custody/vault", {
          headers: { Authorization: `Bearer ${token}` },
        });

        const data = await response.json();

        if (data.success && data.vault) {
          setCustodyStatus(data.vault.status === 'active' ? 'active' : 'pending');
          setCustodyProvider(data.vault.provider || 'fireblocks');
          setRealVaultId(data.vault.id?.slice(0, 16));
        }
      } catch (error) {
        console.error("Failed to fetch custody data:", error);
      }
    };

    fetchCustodyData();
  }, [demoActive]);

  // Fetch vault data — skipped when demo mode is active (demo overlay handles balances)
  const fetchVaultData = useCallback(async () => {
    if (!address) {
      setLoading(false);
      return;
    }

    // Wait for demo check to complete before fetching real data
    if (!demoChecked) return;

    // In demo mode, skip all real API calls — the demo overlay useEffect handles everything
    if (demoActive) {
      setLoading(false);
      return;
    }

    try {
      const [balanceRes, allocRes, priceRes, stakeRes, cryptoRes, profileRes] = await Promise.all([
        fetch(`/api/user/balance?address=${address}`),
        fetch(`/api/allocations?address=${address}`),
        fetch(`/api/prices?chain=84532`),
        fetch(`/api/stakes?address=${address}`),
        fetch(`/api/crypto`),
        fetch(`/api/user/profile?address=${address}`),
      ]);

      const balanceData = await balanceRes.json().catch(() => ({ success: false, balances: {} }));
      const allocData = await allocRes.json().catch(() => ({ success: false, allocations: [], summary: {} }));
      const priceData = await priceRes.json().catch(() => ({ success: false, basePrices: {} }));
      const stakeData = await stakeRes.json().catch(() => ({ success: false, stakes: [] }));
      const cryptoData = await cryptoRes.json().catch(() => ({}));
      const profileData = await profileRes.json().catch(() => ({ profile: { kycStatus: 'not_started' } }));

      // KYC status (API returns { profile: { kycStatus, kycLevel } })
      const kycSt = profileData.profile?.kycStatus || profileData.profile?.kycLevel || 'none';
      setKycStatus(kycSt === 'approved' || kycSt === 'verified' || kycSt === 'enhanced' ? 'verified' : kycSt === 'pending' || kycSt === 'under_review' ? 'pending' : 'none');
      setKycLoaded(true);

      // Bonus status fetch
      try {
        const bonusRes = await fetch(`/api/bonus?address=${address}`);
        const bonusJson = await bonusRes.json();
        if (bonusJson.success) setBonusData(bonusJson.bonus);
      } catch {}

      const metalSymbols = ["AUXG", "AUXS", "AUXPT", "AUXPD"];
      const metalNames: Record<string, string> = {
        AUXG: "Gold",
        AUXS: "Silver",
        AUXPT: "Platinum",
        AUXPD: "Palladium",
      };

      let totalValue = 0;
      let allocatedValue = 0;
      let encumberedValue = 0;
      const holdingsList: MetalHolding[] = [];

      for (const symbol of metalSymbols) {
        const lowerSymbol = symbol.toLowerCase();
        const balance = balanceData.balances?.[lowerSymbol] || 0;
        const allocatedGrams = allocData.summary?.[symbol] || 0;
        const price = priceData.basePrices?.[symbol] || 0;

        const availableGrams = Math.max(0, balance - allocatedGrams);
        const value = balance * price;

        holdingsList.push({
          symbol,
          name: metalNames[symbol],
          allocated: allocatedGrams,
          available: availableGrams,
          total: balance,
          price,
          value,
          stakedGrams: 0,
        });

        totalValue += value;
        allocatedValue += allocatedGrams * price; // Only certificated physical metal
      }

      // Encumbered positions (yield programs) + per-metal staked grams
      let yieldProgramsValue = 0;
      const stakedByMetal: Record<string, number> = {};
      if (stakeData.success && stakeData.stakes) {
        for (const stake of stakeData.stakes) {
          const amount = parseFloat(stake.amount) || 0;
          const metal = stake.metal?.toUpperCase() || "AUXG";
          const price = priceData.basePrices?.[metal] || 0;
          yieldProgramsValue += amount * price;
          stakedByMetal[metal] = (stakedByMetal[metal] || 0) + amount;
        }
      }

      // Attach stakedGrams to each holding
      for (const h of holdingsList) {
        h.stakedGrams = stakedByMetal[h.symbol] || 0;
      }
      encumberedValue = yieldProgramsValue;
      setEncumberedBreakdown({
        yieldPrograms: yieldProgramsValue,
        pendingDelivery: 0,
        tradeSettlement: 0,
      });

      // Crypto prices
      const cPrices: Record<string, number> = { usdt: 1.0 };
      if (cryptoData.bitcoin?.usd) cPrices.btc = cryptoData.bitcoin.usd;
      if (cryptoData.ethereum?.usd) cPrices.eth = cryptoData.ethereum.usd;
      setCryptoPrices(cPrices);

      // Crypto balances from balance API
      const cryptoSymbols = ["usdt", "btc", "eth", "usdc"];
      const cBalances: Record<string, number> = {};
      let cryptoTotalValue = 0;
      for (const sym of cryptoSymbols) {
        const bal = balanceData.balances?.[sym] || 0;
        cBalances[sym] = bal;
        cryptoTotalValue += bal * (cPrices[sym] || 0);
      }
      setCryptoBalances(cBalances);

      // AUXM Settlement Balance
      const auxmBalance = balanceData.balances?.auxm || balanceData.balances?.AUXM || 0;
      setSettlementBalance(auxmBalance);

      // Liquidity = AUXM + crypto + unallocated metal balance
      const unallocatedMetalValue = holdingsList.reduce((sum, h) => sum + (h.available * h.price), 0);
      const totalLiquidity = auxmBalance + cryptoTotalValue + unallocatedMetalValue;
      setLiquidityValue(totalLiquidity);

      // Total vault value = metals + crypto + AUXM
      totalValue += cryptoTotalValue + auxmBalance;

      setHoldings(holdingsList);
      setTotalVaultValue(totalValue);
      setAllocatedHoldings(allocatedValue);
      setEncumberedAssetsValue(encumberedValue);
    } catch (error) {
      console.warn("Valuation temporarily unavailable:", error);
    } finally {
      setLoading(false);
    }
  }, [address, demoActive, demoChecked]);

  useEffect(() => {
    fetchVaultData();
    const interval = setInterval(fetchVaultData, 30000);
    return () => clearInterval(interval);
  }, [fetchVaultData]);

  // Demo mode: override displayed values with demo balance
  useEffect(() => {
    if (!demoActive || !demoBalance) return;

    const applyDemoOverlay = async () => {
      try {
        // Fetch real prices for display
        const priceRes = await fetch("/api/prices?chain=84532");
        const priceData = await priceRes.json().catch(() => ({ success: false, basePrices: {} }));
        const cryptoRes = await fetch("/api/crypto");
        const cryptoData = await cryptoRes.json().catch(() => ({}));

        const metalSymbols = ["AUXG", "AUXS", "AUXPT", "AUXPD"];
        const metalNames: Record<string, string> = {
          AUXG: "Gold", AUXS: "Silver", AUXPT: "Platinum", AUXPD: "Palladium",
        };

        let totalValue = 0;
        let allocatedValue = 0;
        const holdingsList: MetalHolding[] = [];

        for (const symbol of metalSymbols) {
          const lowerSymbol = symbol.toLowerCase();
          const balance = demoBalance[lowerSymbol] || 0;
          const price = priceData.basePrices?.[symbol] || 0;
          const value = balance * price;

          holdingsList.push({
            symbol,
            name: metalNames[symbol],
            allocated: balance, // In demo, all metal is "allocated"
            available: balance,
            total: balance,
            price,
            value,
            stakedGrams: 0,
          });

          totalValue += value;
          allocatedValue += balance * price;
        }

        // Crypto prices
        const cPrices: Record<string, number> = { usdt: 1.0 };
        if (cryptoData.bitcoin?.usd) cPrices.btc = cryptoData.bitcoin.usd;
        if (cryptoData.ethereum?.usd) cPrices.eth = cryptoData.ethereum.usd;
        setCryptoPrices(cPrices);

        // Crypto balances from demo
        const cryptoSymbols = ["usdt", "btc", "eth", "usdc"];
        const cBalances: Record<string, number> = {};
        let cryptoTotalValue = 0;
        for (const sym of cryptoSymbols) {
          const bal = demoBalance[sym] || 0;
          cBalances[sym] = bal;
          cryptoTotalValue += bal * (cPrices[sym] || 0);
        }
        setCryptoBalances(cBalances);

        // AUXM Settlement Balance from demo
        const auxmBalance = demoBalance.auxm || 0;
        setSettlementBalance(auxmBalance);

        const totalLiquidity = auxmBalance + cryptoTotalValue;
        setLiquidityValue(totalLiquidity);

        totalValue += cryptoTotalValue + auxmBalance;

        setHoldings(holdingsList);
        setTotalVaultValue(totalValue);
        setAllocatedHoldings(allocatedValue);
        setEncumberedAssetsValue(0);
        setLoading(false);
      } catch (error) {
        console.warn("Demo overlay error:", error);
      }
    };

    applyDemoOverlay();
  }, [demoActive, demoBalance]);

  const formatCurrency = (value: number) => {
    return "$" + value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const formatGrams = (grams: number, symbol: string = "AUXG") => {
    if (grams < 1 && grams > 0) return (grams * 1000).toFixed(1) + "mg";
    return formatAmount(grams, symbol) + "g";
  };

  const utilizationRatio = totalVaultValue > 0
    ? ((encumberedAssetsValue / totalVaultValue) * 100).toFixed(1)
    : "0.0";

  // Show demo activation card when: no demo active, wallet connected, data loaded
  const showDemoActivation = !loading && !demoActive && demoChecked && address;

  return (
    <div className="min-h-screen bg-stone-100 dark:bg-slate-950">
      <TopNav />

      {/* Demo Mode Persistent Banner */}
      {demoActive && (
        <div className="bg-gradient-to-r from-amber-500 to-orange-500 text-white py-3 px-4">
          <div className="max-w-5xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-lg">🎮</span>
              <span className="text-sm font-semibold">{t.demoBanner}</span>
            </div>
            <a
              href="/fund-vault"
              className="px-4 py-1.5 bg-white text-orange-600 text-xs font-bold rounded-lg hover:bg-white/90 transition-colors"
            >
              {t.demoFundReal}
            </a>
          </div>
        </div>
      )}

      <div className="max-w-5xl mx-auto px-4 py-6 space-y-4">
        {/* ═══ TRUST BAR ═══ */}
        <a href="/trust-center" className="block">
          <div className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-[#C5A55A]/5 border border-[#C5A55A]/20 hover:bg-[#C5A55A]/10 transition-colors cursor-pointer">
            <svg className="w-4 h-4 text-[#C5A55A]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            <span className="text-[10px] font-semibold text-[#C5A55A] tracking-[2px]">
              {t.trustBar}
            </span>
            <svg className="w-3 h-3 text-[#C5A55A]/50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </div>
        </a>

        {/* Market Status Banner */}
        <MarketStatusBanner />

        {/* Demo Mode Activation Card */}
        {showDemoActivation && (
          <div className="bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/10 dark:to-orange-900/10 rounded-2xl p-6 border border-amber-200 dark:border-amber-800/30">
            <div className="text-center">
              <span className="text-4xl mb-3 block">🎮</span>
              <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-2">{t.demoActivate}</h3>
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">{t.demoTryWith}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-5">{t.demoNoRisk}</p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <button
                  onClick={activateDemo}
                  disabled={demoLoading}
                  className="px-6 py-3 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                  {demoLoading ? "..." : t.demoActivate}
                </button>
                <a
                  href="/fund-vault"
                  className="px-6 py-3 border border-[#C5A55A] text-[#C5A55A] font-bold rounded-xl hover:bg-[#C5A55A]/10 transition-colors text-center"
                >
                  {t.demoFundReal}
                </a>
              </div>
            </div>
          </div>
        )}

        {/* KYC Warning Banner */}
        {kycStatus !== 'verified' && kycLoaded && (
          <Link href="/profile" className="block">
            <div className={`flex items-center gap-3 p-4 rounded-xl border ${
              kycStatus === 'pending'
                ? 'bg-amber-50 dark:bg-amber-900/10 border-amber-200 dark:border-amber-800/30'
                : 'bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-800/30'
            }`}>
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                kycStatus === 'pending' ? 'bg-amber-100 dark:bg-amber-900/30' : 'bg-red-100 dark:bg-red-900/30'
              }`}>
                <svg className={`w-5 h-5 ${kycStatus === 'pending' ? 'text-amber-600' : 'text-red-500'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  {kycStatus === 'pending'
                    ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  }
                </svg>
              </div>
              <div className="flex-1">
                <p className={`text-sm font-semibold ${kycStatus === 'pending' ? 'text-amber-700 dark:text-amber-400' : 'text-red-600 dark:text-red-400'}`}>
                  {kycStatus === 'pending' ? t.kycPending : t.kycRequired}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  {kycStatus === 'pending' ? t.kycPendingDesc : t.kycRequiredDesc}
                </p>
              </div>
              <span className={`text-xs font-semibold px-3 py-1.5 rounded-lg ${
                kycStatus === 'pending'
                  ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400'
                  : 'bg-[#BFA181]/15 text-[#BFA181]'
              }`}>
                {kycStatus === 'pending' ? '⏳' : t.kycAction}
              </span>
            </div>
          </Link>
        )}

        {/* Hero Card - Client Assets Under Custody */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-stone-200 dark:border-slate-800">
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 tracking-wider mb-2">
            {demoActive ? t.demoBalance : t.clientAssetsUnderCustody}
          </p>
          {loading ? (
            <div className="h-12 flex items-center">
              <div className="w-6 h-6 border-2 border-[#BFA181] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <p className="text-4xl font-bold text-slate-800 dark:text-white mb-1">
              {formatCurrency(totalVaultValue)}
            </p>
          )}
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">{demoActive ? t.demoDescription : t.heldWithinBankruptcy}</p>

          {/* Statement Indicator */}
          <div className="flex items-center gap-2 mb-6">
            <svg className="w-4 h-4 text-[#2F6F62]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <span className="text-xs text-[#2F6F62] font-medium">{t.lastStatement}: February 2026</span>
          </div>

          {/* Stats Row — Mini Balance Sheet: Allocated | Liquidity | Encumbered | Utilization */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 border-t border-stone-200 dark:border-slate-700">
            <div className="text-center">
              <p className="text-base sm:text-lg font-semibold text-[#BFA181]">{formatCurrency(allocatedHoldings)}</p>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 tracking-wide">{t.allocatedAssets}</p>
            </div>
            <div className="text-center sm:border-x border-stone-200 dark:border-slate-700">
              <p className="text-base sm:text-lg font-semibold text-[#2F6F62]">{formatCurrency(liquidityValue)}</p>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 tracking-wide">{t.availableLiquidity}</p>
            </div>
            <div className="text-center sm:border-r border-stone-200 dark:border-slate-700">
              <button onClick={() => setShowEncumberedModal(true)} className="hover:opacity-80 transition-opacity">
                <p className="text-base sm:text-lg font-semibold text-orange-500">{formatCurrency(encumberedAssetsValue)}</p>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 tracking-wide">{t.encumberedAssets}</p>
              </button>
            </div>
            <div className="text-center">
              <p className="text-base sm:text-lg font-semibold text-slate-500">{utilizationRatio}%</p>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 tracking-wide">{t.assetUtilization}</p>
            </div>
          </div>
        </div>

        {/* ═══ PRIMARY CTA: FUND VAULT / ALLOCATE (demo) ═══ */}
        <a href={demoActive ? "/allocate" : "/fund-vault"} className="block">
          <div className="bg-gradient-to-r from-[#C5A55A] to-[#D4AF37] rounded-xl py-4 px-6 text-center hover:opacity-90 transition-opacity shadow-lg shadow-[#C5A55A]/20">
            <p className="text-lg font-bold text-[#0B0B0D] tracking-wide">{demoActive ? t.allocateMetals : t.fundVault}</p>
            <p className="text-xs text-[#0B0B0D]/60 mt-1">{demoActive ? "🎮 $10,000 USDT virtual balance ready" : t.noMinDeposit}</p>
          </div>
        </a>

        {/* ═══ SECONDARY CTA: ALLOCATE METALS / FUND REAL ═══ */}
        <a href={demoActive ? "/fund-vault" : "/allocate"} className={`block ${!demoActive && totalVaultValue <= 0 ? 'pointer-events-none opacity-40' : ''}`}>
          <div className={`rounded-xl py-3.5 px-6 text-center border ${totalVaultValue > 0 ? 'border-[#C5A55A]/40 hover:bg-[#C5A55A]/5' : 'border-slate-700'} transition-colors`}>
            <p className={`text-sm font-semibold ${totalVaultValue > 0 ? 'text-[#C5A55A]' : 'text-slate-500'}`}>{t.allocateMetals}</p>
            {totalVaultValue <= 0 && <p className="text-[10px] text-slate-600 mt-0.5">{t.fundFirst}</p>}
          </div>
        </a>

        {/* ═══ HOW IT WORKS - 3 STEPS ═══ */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { icon: '💰', label: t.step1 },
            { icon: '🏗️', label: t.step2 },
            { icon: '📈', label: t.step3 },
          ].map((step, i) => (
            <div key={i} className="flex flex-col items-center py-4 px-2 bg-white dark:bg-slate-900 rounded-xl border border-stone-200 dark:border-slate-800">
              <span className="text-2xl mb-2">{step.icon}</span>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 text-center leading-tight">{step.label}</p>
            </div>
          ))}
        </div>

        {/* ═══ TRUST MICROCOPY ═══ */}
        <div className="flex items-start gap-3 py-3 px-4 bg-white dark:bg-slate-900 rounded-xl border border-[#BFA181]/20">
          <svg className="w-5 h-5 text-[#BFA181] flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
          <p className="text-xs text-[#BFA181] leading-relaxed">
            {t.trustMicrocopy}
          </p>
        </div>

        {/* Institutional Architecture Message */}
        <div className="flex items-center justify-center gap-3 py-3 px-4 bg-white dark:bg-slate-900 rounded-xl border border-[#BFA181]/30">
          <svg className="w-5 h-5 text-[#BFA181]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
          </svg>
          <span className="text-sm font-semibold text-[#BFA181]">{t.institutionalArchitecture}</span>
        </div>

        {/* Capital Clarity Bar — Allocated | Liquidity | Encumbered */}
        <div className="bg-white dark:bg-slate-900 rounded-xl p-4 border border-stone-200 dark:border-slate-800">
          <p className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 tracking-wider mb-3">
            {t.capitalClarity}
          </p>
          <div className="flex flex-wrap gap-x-6 gap-y-3 sm:grid sm:grid-cols-3 sm:gap-4">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-[#BFA181]" />
              <div>
                <p className="text-sm font-bold text-slate-800 dark:text-white">{formatCurrency(allocatedHoldings)}</p>
                <p className="text-[10px] text-slate-500">{t.allocatedAssets}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-[#2F6F62]" />
              <div>
                <p className="text-sm font-bold text-slate-800 dark:text-white">{formatCurrency(liquidityValue)}</p>
                <p className="text-[10px] text-slate-500">{t.availableLiquidity}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-orange-500" />
              <div>
                <p className="text-sm font-bold text-slate-800 dark:text-white">{formatCurrency(encumberedAssetsValue)}</p>
                <p className="text-[10px] text-slate-500">{t.encumberedAssets}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Protection Status Widget */}
        <div className="bg-white dark:bg-slate-900 rounded-xl p-4 border border-stone-200 dark:border-slate-800">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <p className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 tracking-wider">
                {t.protectionStatus}
              </p>
              <span className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-semibold ${
                custodyStatus === 'active'
                  ? 'bg-[#2F6F62]/15 text-[#2F6F62]'
                  : custodyStatus === 'pending'
                  ? 'bg-[#BFA181]/15 text-[#BFA181]'
                  : 'bg-slate-500/15 text-slate-500'
              }`}>
                <span className={`w-1.5 h-1.5 rounded-full ${
                  custodyStatus === 'active' ? 'bg-[#2F6F62]' :
                  custodyStatus === 'pending' ? 'bg-[#BFA181]' : 'bg-slate-500'
                }`} />
                {custodyStatus === 'active' ? 'Active' : custodyStatus === 'pending' ? 'Pending' : 'Offline'}
              </span>
            </div>
            {vaultId && (
              <span className="px-2 py-1 bg-[#BFA181]/15 rounded text-[10px] font-semibold text-[#BFA181]">
                {vaultId}
              </span>
            )}
          </div>

          {/* Protection Level Meter */}
          <div className="mb-4">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium text-slate-800 dark:text-white">{t.protectionLevel}</span>
              <span className={`text-sm font-bold ${protectionLevel >= 80 ? "text-[#2F6F62]" : "text-[#BFA181]"}`}>
                {protectionLevel >= 80 ? t.elite : `${protectionLevel}%`}
              </span>
            </div>
            <div className="h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${protectionLevel >= 80 ? "bg-[#2F6F62]" : "bg-[#BFA181]"}`}
                style={{ width: `${protectionLevel}%` }}
              />
            </div>
          </div>

          {/* Trust Checklist */}
          <div className="flex flex-wrap gap-3">
            {[
              { key: "fullyAllocated", label: t.fullyAllocated },
              { key: "bankruptcyRemote", label: t.bankruptcyRemote },
              { key: "segregated", label: t.segregated },
            ].map((item) => (
              <div key={item.key} className="flex items-center gap-1.5">
                <svg className="w-4 h-4 text-[#2F6F62]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-xs font-medium text-slate-700 dark:text-slate-300">{item.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Trust Strip - 4 Badges */}
        <div className="flex items-center justify-center gap-2 py-3 px-4 bg-[#2F6F62]/10 dark:bg-[#2F6F62]/10 rounded-xl border border-[#2F6F62]/30 dark:border-[#2F6F62]/30">
          {[
            { key: "fullyAllocated", label: t.fullyAllocated },
            { key: "segregated", label: t.segregated },
            { key: "bankruptcyRemote", label: t.bankruptcyRemote },
            { key: "audited", label: t.audited },
          ].map((badge, i) => (
            <button
              key={badge.key}
              onClick={() => setTrustBadgeModal(badge.key)}
              className="flex items-center gap-1 px-2 py-1 hover:bg-[#2F6F62]/20 dark:hover:bg-[#2F6F62]/20 rounded transition-colors"
            >
              <svg className="w-3 h-3 text-[#2F6F62]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span className="text-[10px] font-medium text-slate-600 dark:text-slate-400">{badge.label}</span>
              {i < 3 && <span className="ml-2 text-slate-300 dark:text-slate-600">|</span>}
            </button>
          ))}
        </div>

        {/* Unallocated Capital (AUXM) */}
        <div className="bg-white dark:bg-slate-900 rounded-xl p-4 border border-stone-200 dark:border-slate-800">
          <div className="flex items-center justify-between mb-3">
            <p className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 tracking-wider">
              {t.unallocatedCapital}
            </p>
            <span className="px-2 py-1 bg-[#2F6F62]/15 rounded text-[10px] font-semibold text-[#2F6F62]">
              {t.availableForAllocation}
            </span>
          </div>

          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-full bg-indigo-500/15 flex items-center justify-center">
                <span className="text-lg text-indigo-500">◈</span>
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-800 dark:text-white">
                  {t.settlementBalance} ({t.auxmUnit})
                </p>
                <p className="text-[11px] text-slate-500">{t.denominatedInUsd}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-xl font-bold text-slate-800 dark:text-white">
                {settlementBalance.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
              <p className="text-xs font-semibold text-indigo-500">{t.auxmUnit}</p>
            </div>
          </div>

          {/* AUXM Badges */}
          <div className="flex flex-wrap gap-2 mb-3">
            <span className="flex items-center gap-1 px-2 py-1 bg-[#2F6F62]/15 rounded text-[9px] font-semibold text-[#2F6F62]">
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              {t.fullyReserved}
            </span>
            <span className="flex items-center gap-1 px-2 py-1 bg-indigo-500/15 rounded text-[9px] font-semibold text-indigo-500">
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              {t.offBalanceSheet}
            </span>
            <span className="flex items-center gap-1 px-2 py-1 bg-[#BFA181]/15 rounded text-[9px] font-semibold text-[#BFA181]">
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              {t.bankruptcyRemote}
            </span>
          </div>

          {/* AUXM Disclaimer */}
          <p className="text-[11px] text-slate-500 dark:text-slate-400 italic mb-4">{t.auxmDisclaimer}</p>

          {/* Fund Vault Button */}
          <Link
            href="/fund-vault"
            className="flex items-center justify-center gap-2 w-full py-3 border border-indigo-500 rounded-xl text-indigo-500 font-semibold hover:bg-indigo-500/10 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            {t.fundVault}
          </Link>
        </div>

        {/* Trust Messages */}
        <div className="space-y-2">
          <div className="flex items-center gap-3 p-3 bg-[#2F6F62]/10 dark:bg-[#2F6F62]/10 rounded-xl border border-[#2F6F62]/30 dark:border-[#2F6F62]/30">
            <svg className="w-4 h-4 text-[#2F6F62] flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            <span className="text-xs font-semibold text-[#2F6F62] dark:text-[#2F6F62]">{t.custodySeparation}</span>
          </div>
          <div className="flex items-center gap-3 p-3 bg-[#BFA181]/10 dark:bg-[#BFA181]/10 rounded-xl border border-[#BFA181]/30 dark:border-[#BFA181]/30">
            <svg className="w-4 h-4 text-[#BFA181] flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            <span className="text-xs font-semibold text-[#BFA181] dark:text-[#BFA181]">{t.notRehypothecated}</span>
          </div>
        </div>

        {/* Custody Verification — Certificate & QR Verification */}
        <Link
          href="/verify"
          className="flex items-center justify-between p-4 bg-[#BFA181]/10 rounded-xl border border-[#BFA181]/40 hover:border-[#BFA181] transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-[#BFA181]/20 flex items-center justify-center">
              <svg className="w-5 h-5 text-[#BFA181]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-800 dark:text-white">{t.custodyVerification}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">{t.custodyVerificationDesc}</p>
            </div>
          </div>
          <svg className="w-5 h-5 text-[#BFA181]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </Link>

        {/* Capital Actions */}
        <div>
          <p className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 tracking-wider mb-3">
            {t.capitalActions}
          </p>
          <div className="grid grid-cols-4 gap-2 sm:gap-3">
            {[
              { icon: "wallet", label: t.fundSettlement, href: "/fund-vault" },
              { icon: "cube", label: t.allocateMetal, href: "/allocate" },
              { icon: "trending-up", label: t.enterYield, href: "/stake" },
              { icon: "arrows", label: t.transfer, href: "/transfers" },
            ].map((action) => (
              <Link
                key={action.label}
                href={action.href}
                className="flex flex-col items-center p-2 sm:p-3 bg-white dark:bg-slate-900 rounded-xl border border-stone-200 dark:border-slate-800 hover:border-[#BFA181] transition-colors"
              >
                <div className="w-10 h-10 rounded-full bg-[#BFA181]/15 flex items-center justify-center mb-2">
                  {action.icon === "wallet" && (
                    <svg className="w-5 h-5 text-[#BFA181]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                    </svg>
                  )}
                  {action.icon === "cube" && (
                    <svg className="w-5 h-5 text-[#BFA181]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                    </svg>
                  )}
                  {action.icon === "trending-up" && (
                    <svg className="w-5 h-5 text-[#BFA181]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                    </svg>
                  )}
                  {action.icon === "arrows" && (
                    <svg className="w-5 h-5 text-[#BFA181]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                    </svg>
                  )}
                </div>
                <span className="text-[11px] font-medium text-slate-700 dark:text-slate-300 text-center">{action.label}</span>
              </Link>
            ))}
          </div>
        </div>

        {/* Bonus / Liquidity Credits Widget */}
        {bonusData?.hasBonus && !loading && (
          <div className="relative overflow-hidden rounded-2xl border border-[#BFA181]/30">
            {/* Premium gradient background */}
            <div className="absolute inset-0 bg-gradient-to-br from-[#1a1207] via-[#2a1f10] to-[#0D1421] dark:from-[#1a1207] dark:via-[#2a1f10] dark:to-[#0D1421]" />
            <div className="absolute inset-0 bg-gradient-to-r from-[#BFA181]/10 via-transparent to-[#D4B47A]/10" />
            {/* Subtle shimmer line */}
            <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-[#BFA181]/50 to-transparent" />

            <div className="relative p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-[#BFA181]/20 flex items-center justify-center">
                    <svg className="w-5 h-5 text-[#BFA181]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-[#BFA181] tracking-[0.15em]">LIQUIDITY CREDITS</p>
                    <p className="text-[10px] text-[#BFA181]/60">Platform utility credits</p>
                  </div>
                </div>
                <span className={`text-xs font-bold px-3 py-1.5 rounded-lg ${
                  bonusData.unlocked
                    ? 'bg-[#2F6F62]/20 text-[#2F6F62] border border-[#2F6F62]/30'
                    : 'bg-[#BFA181]/15 text-[#BFA181] border border-[#BFA181]/20'
                }`}>
                  {bonusData.unlocked ? '✓ Unlocked' : `${bonusData.unlockPercent?.toFixed(0) || 0}%`}
                </span>
              </div>

              {/* Bonus Balances */}
              <div className="flex flex-wrap gap-2 mb-4">
                {Object.entries(bonusData.bonusBalances || {}).map(([metal, grams]: [string, any]) => (
                  grams > 0 && (
                    <div key={metal} className="flex items-center gap-2 bg-white/5 backdrop-blur-sm px-4 py-2.5 rounded-xl border border-[#BFA181]/10">
                      <span className="text-sm font-bold text-white">{Number(grams).toFixed(3)}g</span>
                      <span className="text-[10px] font-semibold text-[#BFA181]/80 tracking-wider">{metal}-B</span>
                    </div>
                  )
                ))}
              </div>

              {/* Unlock Progress Bar */}
              {!bonusData.unlocked && (
                <div>
                  <div className="w-full h-2.5 bg-white/5 rounded-full overflow-hidden mb-2">
                    <div
                      className="h-full bg-gradient-to-r from-[#BFA181] via-[#D4B47A] to-[#BFA181] rounded-full transition-all duration-700 shadow-[0_0_12px_rgba(191,161,129,0.4)]"
                      style={{ width: `${Math.min(100, bonusData.unlockPercent || 0)}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] text-[#BFA181]/50">
                      {bonusData.daysRemaining > 0 && `${Math.ceil(bonusData.daysRemaining)} days remaining`}
                      {bonusData.daysRemaining > 0 && bonusData.volumeProgress < 100 && ' · '}
                      {bonusData.volumeProgress < 100 && `$${Math.max(0, (bonusData.volumeRequired || 0) - (bonusData.currentVolumeUsd || 0)).toFixed(0)} volume to unlock`}
                    </p>
                    <p className="text-[10px] text-[#BFA181]/40">Trade or hold to unlock</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Holdings Section — Split into Metals + Liquidity */}
        <div className="bg-white dark:bg-slate-900 rounded-xl p-4 border border-stone-200 dark:border-slate-800">
          <h3 className="text-base font-semibold text-slate-800 dark:text-white mb-4">{t.holdings}</h3>

          {loading ? (
            <div className="flex justify-center py-8">
              <div className="w-6 h-6 border-2 border-[#BFA181] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <div className="space-y-6">
              {/* Section 1 — Metals (Allocated) */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-2 h-2 rounded-full bg-[#BFA181]" />
                  <h4 className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 tracking-wider">
                    {t.metalsAllocated}
                  </h4>
                </div>

                {holdings.length === 0 ? (
                  <p className="text-center py-6 text-slate-500 dark:text-slate-400">{t.noHoldings}</p>
                ) : (
                  <div className="space-y-3">
                    {holdings.map((holding) => (
                      <div
                        key={holding.symbol}
                        className="p-3 rounded-lg"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-11 h-11 rounded-full bg-[#BFA181]/10 flex items-center justify-center relative">
                              {metalIcons[holding.symbol] ? (
                                <Image
                                  src={metalIcons[holding.symbol]}
                                  alt={holding.name}
                                  width={44}
                                  height={44}
                                  className="object-cover rounded-full"
                                  style={{ filter: 'drop-shadow(0 6px 18px rgba(0,0,0,.35))' }}
                                />
                              ) : (
                                <span className="text-[#BFA181] font-bold">{holding.symbol[0]}</span>
                              )}
                            </div>
                            <div>
                              <div className="flex items-center gap-1.5">
                                <p className="text-sm font-semibold text-slate-800 dark:text-white">{holding.name}</p>
                                <span className="flex items-center gap-1 px-1.5 py-0.5 bg-[#2F6F62]/10 rounded-full">
                                  <span className="w-1.5 h-1.5 rounded-full bg-[#2F6F62] animate-pulse" />
                                  <span className="text-[8px] font-semibold text-[#2F6F62]">{t.livePricing}</span>
                                </span>
                              </div>
                              <p className="text-xs text-slate-500">{holding.symbol}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-semibold text-slate-800 dark:text-white">{formatCurrency(holding.value)}</p>
                            <p className="text-xs text-[#2F6F62] font-medium">
                              {formatGrams(holding.allocated)} {t.allocated}
                            </p>
                          </div>
                        </div>

                        {/* Holdings Detail Row */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-3 pl-14 pr-2">
                          <div>
                            <p className="text-[9px] text-slate-400 dark:text-slate-500">{t.holdingsLabel}</p>
                            <p className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">{formatGrams(holding.total)}</p>
                          </div>
                          <div>
                            <p className="text-[9px] text-slate-400 dark:text-slate-500">{t.avgCost}</p>
                            <p className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                              {holding.total > 0 ? formatCurrency(holding.value / holding.total) : "--"}
                            </p>
                          </div>
                          <div>
                            <p className="text-[9px] text-slate-400 dark:text-slate-500">{t.market}</p>
                            <p className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">{formatCurrency(holding.price)}/g</p>
                          </div>
                          <div>
                            <p className="text-[9px] text-slate-400 dark:text-slate-500">{t.unrealizedPL}</p>
                            <p className={`text-[11px] font-semibold ${holding.total > 0 ? "text-[#2F6F62]" : "text-slate-400"}`}>
                              {"--"}
                            </p>
                          </div>
                        </div>

                        {/* Structured Yield Row */}
                        <div className="grid grid-cols-2 gap-2 mt-2 pl-14 pr-2">
                          <div>
                            <p className="text-[9px] text-[#D4B47A]">{t.structuredYield}</p>
                            <p className={`text-[11px] font-semibold ${holding.stakedGrams > 0 ? "text-[#D4B47A]" : "text-slate-400 dark:text-slate-500"}`}>
                              {holding.stakedGrams > 0 ? formatGrams(holding.stakedGrams, holding.symbol) : "--"}
                            </p>
                          </div>
                          <div>
                            {holding.stakedGrams > 0 && (
                              <>
                                <p className="text-[9px] text-[#D4B47A]">{t.yieldValue}</p>
                                <p className="text-[11px] font-semibold text-[#D4B47A]">
                                  {formatCurrency(holding.stakedGrams * holding.price)}
                                </p>
                              </>
                            )}
                          </div>
                        </div>

                        {/* Buy / Sell Buttons */}
                        <div className="flex items-center gap-2 mt-3 pl-14">
                            <Link
                              href="/allocate"
                              className="flex-1 py-2 text-center text-xs font-semibold bg-[#BFA181] text-white rounded-lg hover:bg-[#BFA181]/90 transition-colors"
                            >
                              {holding.symbol === "AUXG" ? t.buyGold : holding.symbol === "AUXS" ? t.buySilver : holding.symbol === "AUXPT" ? t.buyPlatinum : t.buyPalladium}
                            </Link>
                            <button
                              onClick={() => setSellModal({ open: true, metal: holding })}
                              className="flex-1 py-2 text-center text-xs font-semibold border border-[#BFA181] text-[#BFA181] rounded-lg hover:bg-[#BFA181]/10 transition-colors"
                            >
                              {holding.symbol === "AUXG" ? t.sellGold : holding.symbol === "AUXS" ? t.sellSilver : holding.symbol === "AUXPT" ? t.sellPlatinum : t.sellPalladium}
                            </button>
                          </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Section 2 — Liquidity (Cash & Crypto) */}
              {(settlementBalance > 0 || cryptoAssets.some(c => (cryptoBalances[c.symbol.toLowerCase()] || 0) > 0)) && (
                <div>
                  <div className="flex items-center gap-2 mb-3 pt-4 border-t border-stone-200 dark:border-slate-700">
                    <div className="w-2 h-2 rounded-full bg-[#2F6F62]" />
                    <h4 className="text-[11px] font-semibold text-[#2F6F62] tracking-wider">
                      {t.liquidityCashCrypto}
                    </h4>
                  </div>

                  <div className="space-y-2">
                    {/* AUXM Settlement Balance Row */}
                    {settlementBalance > 0 && (
                      <div className="flex items-center justify-between p-3 rounded-lg hover:bg-stone-50 dark:hover:bg-slate-800 transition-colors">
                        <div className="flex items-center gap-3">
                          <div className="w-11 h-11 rounded-full bg-indigo-500/15 flex items-center justify-center">
                            <span className="text-lg font-bold text-indigo-500">◈</span>
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-slate-800 dark:text-white">{t.settlementBalance}</p>
                            <p className="text-xs text-slate-500">{t.auxmUnit}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-semibold text-slate-800 dark:text-white">{formatCurrency(settlementBalance)}</p>
                          <div className="flex items-center gap-1.5 justify-end">
                            <p className="text-xs text-[#2F6F62] font-medium">
                              {settlementBalance.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {t.auxmUnit}
                            </p>
                            <span className="px-1.5 py-0.5 bg-[#2F6F62]/10 rounded text-[8px] font-semibold text-[#2F6F62]">
                              {t.available}
                            </span>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Crypto Balance Rows */}
                    {cryptoAssets.map((crypto) => {
                      const bal = cryptoBalances[crypto.symbol.toLowerCase()] || 0;
                      if (bal <= 0) return null;
                      const price = cryptoPrices[crypto.symbol.toLowerCase()] || 0;
                      const value = bal * price;
                      return (
                        <div
                          key={crypto.symbol}
                          className="flex items-center justify-between p-3 rounded-lg hover:bg-stone-50 dark:hover:bg-slate-800 transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <div
                              className="w-11 h-11 rounded-full flex items-center justify-center"
                              style={{ backgroundColor: crypto.color + "15" }}
                            >
                              <span className="text-lg font-bold" style={{ color: crypto.color }}>{crypto.icon}</span>
                            </div>
                            <div>
                              <p className="text-sm font-semibold text-slate-800 dark:text-white">{crypto.name}</p>
                              <p className="text-xs text-slate-500">{crypto.symbol}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-semibold text-slate-800 dark:text-white">{formatCurrency(value)}</p>
                            <div className="flex items-center gap-1.5 justify-end">
                              <p className="text-xs text-[#2F6F62] font-medium">
                                {formatAmount(bal, crypto.symbol)} {crypto.symbol}
                              </p>
                              <span className="px-1.5 py-0.5 bg-[#2F6F62]/10 rounded text-[8px] font-semibold text-[#2F6F62]">
                                {t.available}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Physical Redemption Card */}
        <Link
          href="/redeem"
          className="flex items-center justify-between p-4 bg-white dark:bg-slate-900 rounded-xl border border-stone-200 dark:border-slate-800 hover:border-[#BFA181] transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-[#BFA181]/15 flex items-center justify-center">
              <svg className="w-6 h-6 text-[#BFA181]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-800 dark:text-white">{t.physicalRedemption}</p>
              <p className="text-xs text-slate-500">{t.physicalRedemptionDesc}</p>
            </div>
          </div>
          <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </Link>
      </div>

      {/* Sell Modal */}
      {sellModal.metal && (
        <LiquidateModal
          isOpen={sellModal.open}
          onClose={() => setSellModal({ open: false, metal: null })}
          metal={{
            symbol: sellModal.metal.symbol,
            name: sellModal.metal.name,
            allocated: sellModal.metal.available,
            price: sellModal.metal.price,
          }}
          address={address || ""}
          onSuccess={fetchVaultData}
          demoMode={demoActive}
          onDemoTrade={executeDemoTrade}
        />
      )}

      {/* Trust Badge Modal */}
      {trustBadgeModal && (
        <div
          className="fixed inset-0 bg-black/60 flex items-center justify-center p-6 z-50"
          onClick={() => setTrustBadgeModal(null)}
        >
          <div
            className="bg-white dark:bg-slate-900 rounded-2xl p-6 max-w-sm w-full text-center"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-16 h-16 rounded-full bg-[#2F6F62]/15 flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-[#2F6F62]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-3">
              {trustBadgeModal === "fullyAllocated" && t.fullyAllocated}
              {trustBadgeModal === "segregated" && t.segregated}
              {trustBadgeModal === "bankruptcyRemote" && t.bankruptcyRemote}
              {trustBadgeModal === "audited" && t.audited}
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-6">
              {trustBadgeModal === "fullyAllocated" && t.fullyAllocatedDesc}
              {trustBadgeModal === "segregated" && t.segregatedDesc}
              {trustBadgeModal === "bankruptcyRemote" && t.bankruptcyRemoteDesc}
              {trustBadgeModal === "audited" && t.auditedDesc}
            </p>
            <button
              onClick={() => setTrustBadgeModal(null)}
              className="px-6 py-2.5 bg-[#2F6F62] text-white font-semibold rounded-xl hover:bg-[#2F6F62]/80 transition-colors"
            >
              {t.close}
            </button>
          </div>
        </div>
      )}

      {/* Encumbered Breakdown Modal */}
      {showEncumberedModal && (
        <div
          className="fixed inset-0 bg-black/60 flex items-center justify-center p-6 z-50"
          onClick={() => setShowEncumberedModal(false)}
        >
          <div
            className="bg-white dark:bg-slate-900 rounded-2xl p-6 max-w-sm w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-16 h-16 rounded-full bg-orange-500/15 flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-1 text-center">{t.encumberedBreakdown}</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 text-center mb-6">{t.encumberedAssetsDesc}</p>

            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-orange-500/5 rounded-lg">
                <span className="text-sm text-slate-700 dark:text-slate-300">{t.yieldPrograms}</span>
                <span className="text-sm font-bold text-orange-500">{formatCurrency(encumberedBreakdown.yieldPrograms)}</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-orange-500/5 rounded-lg">
                <span className="text-sm text-slate-700 dark:text-slate-300">{t.pendingDelivery}</span>
                <span className="text-sm font-bold text-orange-500">{formatCurrency(encumberedBreakdown.pendingDelivery)}</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-orange-500/5 rounded-lg">
                <span className="text-sm text-slate-700 dark:text-slate-300">{t.tradeSettlement}</span>
                <span className="text-sm font-bold text-orange-500">{formatCurrency(encumberedBreakdown.tradeSettlement)}</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-slate-100 dark:bg-slate-800 rounded-lg border-t-2 border-orange-500">
                <span className="text-sm font-semibold text-slate-800 dark:text-white">Total</span>
                <span className="text-lg font-bold text-orange-500">{formatCurrency(encumberedAssetsValue)}</span>
              </div>
            </div>

            <button
              onClick={() => setShowEncumberedModal(false)}
              className="w-full mt-6 px-6 py-2.5 bg-orange-500 text-white font-semibold rounded-xl hover:bg-orange-500/80 transition-colors"
            >
              {t.close}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
