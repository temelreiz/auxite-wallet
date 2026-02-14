"use client";
import Link from "next/link";
import TopNav from "@/components/TopNav";
import ComplianceFooter from "@/components/ComplianceFooter";
import { useLanguage } from "@/components/LanguageContext";

const translations: Record<string, Record<string, string>> = {
  tr: {
    backToLegal: "\u2190 Yasal Belgelere D\u00f6n",
    title: "Geri \u00d6deme Politikas\u0131",
    subtitle: "Fiziksel Metal Geri \u00d6deme Ko\u015fullar\u0131",
    effective: "Y\u00fcr\u00fcrl\u00fck: 1 Ocak 2025 \u2022 G\u00fcncelleme: 20 Aral\u0131k 2025",
    heading1: "1. Ama\u00e7",
    para1: "Bu politika, fiziksel olarak tahsis edilmi\u015f de\u011ferli metallerin geri \u00f6denmesi ve teslimat\u0131 ko\u015fullar\u0131n\u0131 d\u00fczenler.",
    heading2: "2. Uygunluk",
    elig1: "Tamamlanm\u0131\u015f KYC/AML do\u011frulamas\u0131",
    elig2: "Minimum geri \u00f6deme e\u015fiklerini kar\u015f\u0131lama",
    elig3: "Tahsis edilen metal Geri \u00d6denebilir durumda olmal\u0131",
    elig4: "Yasal veya uyumluluk k\u0131s\u0131tlamas\u0131 bulunmamas\u0131",
    heading3: "3. Minimum Miktarlar",
    minGold: "Alt\u0131n (AUXG):",
    minGoldDesc: "Minimum 1 k\u00fcl\u00e7e boyutu",
    minSilver: "G\u00fcm\u00fc\u015f (AUXS):",
    minSilverDesc: "Standart g\u00fcm\u00fc\u015f k\u00fcl\u00e7e",
    minPlatPal: "Platin/Paladyum:",
    minPlatPalDesc: "Stok durumuna ba\u011fl\u0131",
    heading4: "4. S\u00fcrec",
    proc1: "Geri \u00f6deme talebi g\u00f6nderin",
    proc2: "Tokenlar kilitlenir",
    proc3: "Durum Bekleyen Geri \u00d6deme olarak g\u00fcncellenir",
    proc4: "Saklama kurumu onay\u0131 al\u0131n\u0131r",
    proc5: "Metal teslim alma veya teslimat i\u00e7in haz\u0131rlan\u0131r",
    proc6: "Tokenlar tamamland\u0131\u011f\u0131nda yak\u0131l\u0131r",
    heading5: "5. \u00dccretler",
    para5: "Geri \u00f6deme \u015fu \u00fccretleri i\u00e7erebilir: kasa i\u015fleme \u00fccretleri, lojistik/sigorta maliyetleri, g\u00fcmr\u00fck masraflar\u0131. T\u00fcm \u00fccretler onay \u00f6ncesinde a\u00e7\u0131klan\u0131r.",
    heading6: "6. Sertifika Durumu",
    para6: "Ba\u015far\u0131l\u0131 geri \u00f6deme \u00fczerine sertifikalar Geri \u00d6dendi olarak i\u015faretlenir, ge\u00e7ersiz hale gelir ve tahsis kay\u0131tlar\u0131 ar\u015fivlenir.",
  },
  en: {
    backToLegal: "\u2190 Back to Legal",
    title: "Redemption Policy",
    subtitle: "Physical Metal Redemption Terms",
    effective: "Effective: January 1, 2025 \u2022 Updated: December 20, 2025",
    heading1: "1. Purpose",
    para1: "This policy governs conditions for redemption and delivery of physically allocated precious metals.",
    heading2: "2. Eligibility",
    elig1: "Completed KYC/AML verification",
    elig2: "Meets minimum redemption thresholds",
    elig3: "Allocated metal is in Redeemable status",
    elig4: "No legal or compliance restrictions",
    heading3: "3. Minimum Amounts",
    minGold: "Gold (AUXG):",
    minGoldDesc: "Minimum 1 bar size",
    minSilver: "Silver (AUXS):",
    minSilverDesc: "Standard silver bar",
    minPlatPal: "Platinum/Palladium:",
    minPlatPalDesc: "Subject to availability",
    heading4: "4. Process",
    proc1: "Submit redemption request",
    proc2: "Tokens are locked",
    proc3: "Status updated to Pending Redemption",
    proc4: "Custodian confirmation obtained",
    proc5: "Metal prepared for pickup or delivery",
    proc6: "Tokens burned upon completion",
    heading5: "5. Fees",
    para5: "Redemption may incur: vault handling fees, logistics/insurance costs, customs charges. All fees disclosed prior to confirmation.",
    heading6: "6. Certificate Status",
    para6: "Upon successful redemption, certificates are marked as Redeemed, become void, and allocation records are archived.",
  },
  de: {
    backToLegal: "\u2190 Zur\u00fcck zu Rechtliches",
    title: "R\u00fccknahmerichtlinie",
    subtitle: "Bedingungen f\u00fcr die physische Metallr\u00fccknahme",
    effective: "G\u00fcltig ab: 1. Januar 2025 \u2022 Aktualisiert: 20. Dezember 2025",
    heading1: "1. Zweck",
    para1: "Diese Richtlinie regelt die Bedingungen f\u00fcr die R\u00fccknahme und Lieferung von physisch zugeteilten Edelmetallen.",
    heading2: "2. Berechtigung",
    elig1: "Abgeschlossene KYC/AML-Verifizierung",
    elig2: "Erf\u00fcllung der Mindesteinl\u00f6seschwellen",
    elig3: "Zugeteiltes Metall hat den Status Einl\u00f6sbar",
    elig4: "Keine rechtlichen oder Compliance-Einschr\u00e4nkungen",
    heading3: "3. Mindestmengen",
    minGold: "Gold (AUXG):",
    minGoldDesc: "Mindestens 1 Barrengr\u00f6\u00dfe",
    minSilver: "Silber (AUXS):",
    minSilverDesc: "Standard-Silberbarren",
    minPlatPal: "Platin/Palladium:",
    minPlatPalDesc: "Verf\u00fcgbarkeit vorbehalten",
    heading4: "4. Verfahren",
    proc1: "R\u00fccknahmeantrag einreichen",
    proc2: "Token werden gesperrt",
    proc3: "Status wird auf Ausstehende R\u00fccknahme aktualisiert",
    proc4: "Best\u00e4tigung des Verwahrers eingeholt",
    proc5: "Metall wird f\u00fcr Abholung oder Lieferung vorbereitet",
    proc6: "Token werden nach Abschluss verbrannt",
    heading5: "5. Geb\u00fchren",
    para5: "Bei der R\u00fccknahme k\u00f6nnen anfallen: Tresorbearbeitungsgeb\u00fchren, Logistik-/Versicherungskosten, Zollgeb\u00fchren. Alle Geb\u00fchren werden vor Best\u00e4tigung offengelegt.",
    heading6: "6. Zertifikatsstatus",
    para6: "Nach erfolgreicher R\u00fccknahme werden Zertifikate als Eingel\u00f6st markiert, werden ung\u00fcltig und die Zuteilungsunterlagen werden archiviert.",
  },
  fr: {
    backToLegal: "\u2190 Retour aux documents l\u00e9gaux",
    title: "Politique de rachat",
    subtitle: "Conditions de rachat de m\u00e9taux physiques",
    effective: "En vigueur : 1er janvier 2025 \u2022 Mis \u00e0 jour : 20 d\u00e9cembre 2025",
    heading1: "1. Objet",
    para1: "Cette politique r\u00e9git les conditions de rachat et de livraison des m\u00e9taux pr\u00e9cieux physiquement allou\u00e9s.",
    heading2: "2. \u00c9ligibilit\u00e9",
    elig1: "V\u00e9rification KYC/AML compl\u00e9t\u00e9e",
    elig2: "Seuils minimaux de rachat atteints",
    elig3: "Le m\u00e9tal allou\u00e9 est en statut Rachetable",
    elig4: "Aucune restriction l\u00e9gale ou de conformit\u00e9",
    heading3: "3. Montants minimaux",
    minGold: "Or (AUXG) :",
    minGoldDesc: "Minimum 1 taille de lingot",
    minSilver: "Argent (AUXS) :",
    minSilverDesc: "Lingot d\u2019argent standard",
    minPlatPal: "Platine/Palladium :",
    minPlatPalDesc: "Sous r\u00e9serve de disponibilit\u00e9",
    heading4: "4. Processus",
    proc1: "Soumettre une demande de rachat",
    proc2: "Les jetons sont verrouill\u00e9s",
    proc3: "Le statut est mis \u00e0 jour en Rachat en attente",
    proc4: "Confirmation du d\u00e9positaire obtenue",
    proc5: "Le m\u00e9tal est pr\u00e9par\u00e9 pour le retrait ou la livraison",
    proc6: "Les jetons sont br\u00fbl\u00e9s \u00e0 la fin du processus",
    heading5: "5. Frais",
    para5: "Le rachat peut entra\u00eener : des frais de manutention du coffre, des co\u00fbts de logistique/assurance, des frais de douane. Tous les frais sont divulgu\u00e9s avant confirmation.",
    heading6: "6. Statut du certificat",
    para6: "Apr\u00e8s un rachat r\u00e9ussi, les certificats sont marqu\u00e9s comme Rachet\u00e9s, deviennent nuls et les registres d\u2019allocation sont archiv\u00e9s.",
  },
  ar: {
    backToLegal: "\u2190 \u0627\u0644\u0639\u0648\u062f\u0629 \u0625\u0644\u0649 \u0627\u0644\u0648\u062b\u0627\u0626\u0642 \u0627\u0644\u0642\u0627\u0646\u0648\u0646\u064a\u0629",
    title: "\u0633\u064a\u0627\u0633\u0629 \u0627\u0644\u0627\u0633\u062a\u0631\u062f\u0627\u062f",
    subtitle: "\u0634\u0631\u0648\u0637 \u0627\u0633\u062a\u0631\u062f\u0627\u062f \u0627\u0644\u0645\u0639\u0627\u062f\u0646 \u0627\u0644\u0645\u0627\u062f\u064a\u0629",
    effective: "\u0633\u0627\u0631\u064a \u0627\u0644\u0645\u0641\u0639\u0648\u0644: 1 \u064a\u0646\u0627\u064a\u0631 2025 \u2022 \u0645\u064f\u062d\u062f\u0651\u062b: 20 \u062f\u064a\u0633\u0645\u0628\u0631 2025",
    heading1: "1. \u0627\u0644\u063a\u0631\u0636",
    para1: "\u062a\u0646\u0638\u0645 \u0647\u0630\u0647 \u0627\u0644\u0633\u064a\u0627\u0633\u0629 \u0634\u0631\u0648\u0637 \u0627\u0633\u062a\u0631\u062f\u0627\u062f \u0648\u062a\u0633\u0644\u064a\u0645 \u0627\u0644\u0645\u0639\u0627\u062f\u0646 \u0627\u0644\u062b\u0645\u064a\u0646\u0629 \u0627\u0644\u0645\u062e\u0635\u0635\u0629 \u0641\u0639\u0644\u064a\u064b\u0627.",
    heading2: "2. \u0627\u0644\u0623\u0647\u0644\u064a\u0629",
    elig1: "\u0625\u0643\u0645\u0627\u0644 \u0627\u0644\u062a\u062d\u0642\u0642 \u0645\u0646 KYC/AML",
    elig2: "\u0627\u0633\u062a\u064a\u0641\u0627\u0621 \u0627\u0644\u062d\u062f \u0627\u0644\u0623\u062f\u0646\u0649 \u0644\u0644\u0627\u0633\u062a\u0631\u062f\u0627\u062f",
    elig3: "\u0627\u0644\u0645\u0639\u062f\u0646 \u0627\u0644\u0645\u062e\u0635\u0635 \u0641\u064a \u062d\u0627\u0644\u0629 \u0642\u0627\u0628\u0644 \u0644\u0644\u0627\u0633\u062a\u0631\u062f\u0627\u062f",
    elig4: "\u0639\u062f\u0645 \u0648\u062c\u0648\u062f \u0642\u064a\u0648\u062f \u0642\u0627\u0646\u0648\u0646\u064a\u0629 \u0623\u0648 \u062a\u0646\u0638\u064a\u0645\u064a\u0629",
    heading3: "3. \u0627\u0644\u062d\u062f \u0627\u0644\u0623\u062f\u0646\u0649 \u0644\u0644\u0643\u0645\u064a\u0627\u062a",
    minGold: "\u0627\u0644\u0630\u0647\u0628 (AUXG):",
    minGoldDesc: "\u0627\u0644\u062d\u062f \u0627\u0644\u0623\u062f\u0646\u0649 \u0633\u0628\u064a\u0643\u0629 \u0648\u0627\u062d\u062f\u0629",
    minSilver: "\u0627\u0644\u0641\u0636\u0629 (AUXS):",
    minSilverDesc: "\u0633\u0628\u064a\u0643\u0629 \u0641\u0636\u0629 \u0642\u064a\u0627\u0633\u064a\u0629",
    minPlatPal: "\u0627\u0644\u0628\u0644\u0627\u062a\u064a\u0646/\u0627\u0644\u0628\u0627\u0644\u0627\u062f\u064a\u0648\u0645:",
    minPlatPalDesc: "\u062d\u0633\u0628 \u0627\u0644\u062a\u0648\u0641\u0631",
    heading4: "4. \u0627\u0644\u0639\u0645\u0644\u064a\u0629",
    proc1: "\u062a\u0642\u062f\u064a\u0645 \u0637\u0644\u0628 \u0627\u0644\u0627\u0633\u062a\u0631\u062f\u0627\u062f",
    proc2: "\u064a\u062a\u0645 \u0642\u0641\u0644 \u0627\u0644\u0631\u0645\u0648\u0632",
    proc3: "\u064a\u062a\u0645 \u062a\u062d\u062f\u064a\u062b \u0627\u0644\u062d\u0627\u0644\u0629 \u0625\u0644\u0649 \u0627\u0633\u062a\u0631\u062f\u0627\u062f \u0645\u0639\u0644\u0642",
    proc4: "\u0627\u0644\u062d\u0635\u0648\u0644 \u0639\u0644\u0649 \u062a\u0623\u0643\u064a\u062f \u0623\u0645\u064a\u0646 \u0627\u0644\u062d\u0641\u0638",
    proc5: "\u062a\u062c\u0647\u064a\u0632 \u0627\u0644\u0645\u0639\u062f\u0646 \u0644\u0644\u0627\u0633\u062a\u0644\u0627\u0645 \u0623\u0648 \u0627\u0644\u062a\u0648\u0635\u064a\u0644",
    proc6: "\u064a\u062a\u0645 \u062d\u0631\u0642 \u0627\u0644\u0631\u0645\u0648\u0632 \u0639\u0646\u062f \u0627\u0644\u0627\u0643\u062a\u0645\u0627\u0644",
    heading5: "5. \u0627\u0644\u0631\u0633\u0648\u0645",
    para5: "\u0642\u062f \u064a\u062a\u0631\u062a\u0628 \u0639\u0644\u0649 \u0627\u0644\u0627\u0633\u062a\u0631\u062f\u0627\u062f: \u0631\u0633\u0648\u0645 \u0645\u0639\u0627\u0644\u062c\u0629 \u0627\u0644\u062e\u0632\u0646\u0629\u060c \u062a\u0643\u0627\u0644\u064a\u0641 \u0627\u0644\u0644\u0648\u062c\u0633\u062a\u064a\u0627\u062a/\u0627\u0644\u062a\u0623\u0645\u064a\u0646\u060c \u0631\u0633\u0648\u0645 \u062c\u0645\u0631\u0643\u064a\u0629. \u064a\u062a\u0645 \u0627\u0644\u0625\u0641\u0635\u0627\u062d \u0639\u0646 \u062c\u0645\u064a\u0639 \u0627\u0644\u0631\u0633\u0648\u0645 \u0642\u0628\u0644 \u0627\u0644\u062a\u0623\u0643\u064a\u062f.",
    heading6: "6. \u062d\u0627\u0644\u0629 \u0627\u0644\u0634\u0647\u0627\u062f\u0629",
    para6: "\u0639\u0646\u062f \u0627\u0644\u0627\u0633\u062a\u0631\u062f\u0627\u062f \u0627\u0644\u0646\u0627\u062c\u062d\u060c \u064a\u062a\u0645 \u062a\u0645\u064a\u064a\u0632 \u0627\u0644\u0634\u0647\u0627\u062f\u0627\u062a \u0639\u0644\u0649 \u0623\u0646\u0647\u0627 \u0645\u064f\u0633\u062a\u0631\u062f\u0629\u060c \u0648\u062a\u0635\u0628\u062d \u0644\u0627\u063a\u064a\u0629\u060c \u0648\u064a\u062a\u0645 \u0623\u0631\u0634\u0641\u0629 \u0633\u062c\u0644\u0627\u062a \u0627\u0644\u062a\u062e\u0635\u064a\u0635.",
  },
  ru: {
    backToLegal: "\u2190 \u041d\u0430\u0437\u0430\u0434 \u043a \u043f\u0440\u0430\u0432\u043e\u0432\u044b\u043c \u0434\u043e\u043a\u0443\u043c\u0435\u043d\u0442\u0430\u043c",
    title: "\u041f\u043e\u043b\u0438\u0442\u0438\u043a\u0430 \u043f\u043e\u0433\u0430\u0448\u0435\u043d\u0438\u044f",
    subtitle: "\u0423\u0441\u043b\u043e\u0432\u0438\u044f \u043f\u043e\u0433\u0430\u0448\u0435\u043d\u0438\u044f \u0444\u0438\u0437\u0438\u0447\u0435\u0441\u043a\u0438\u0445 \u043c\u0435\u0442\u0430\u043b\u043b\u043e\u0432",
    effective: "\u0414\u0435\u0439\u0441\u0442\u0432\u0443\u0435\u0442 \u0441: 1 \u044f\u043d\u0432\u0430\u0440\u044f 2025 \u2022 \u041e\u0431\u043d\u043e\u0432\u043b\u0435\u043d\u043e: 20 \u0434\u0435\u043a\u0430\u0431\u0440\u044f 2025",
    heading1: "1. \u041d\u0430\u0437\u043d\u0430\u0447\u0435\u043d\u0438\u0435",
    para1: "\u041d\u0430\u0441\u0442\u043e\u044f\u0449\u0430\u044f \u043f\u043e\u043b\u0438\u0442\u0438\u043a\u0430 \u0440\u0435\u0433\u0443\u043b\u0438\u0440\u0443\u0435\u0442 \u0443\u0441\u043b\u043e\u0432\u0438\u044f \u043f\u043e\u0433\u0430\u0448\u0435\u043d\u0438\u044f \u0438 \u0434\u043e\u0441\u0442\u0430\u0432\u043a\u0438 \u0444\u0438\u0437\u0438\u0447\u0435\u0441\u043a\u0438 \u0440\u0430\u0441\u043f\u0440\u0435\u0434\u0435\u043b\u0451\u043d\u043d\u044b\u0445 \u0434\u0440\u0430\u0433\u043e\u0446\u0435\u043d\u043d\u044b\u0445 \u043c\u0435\u0442\u0430\u043b\u043b\u043e\u0432.",
    heading2: "2. \u041f\u0440\u0430\u0432\u043e \u043d\u0430 \u043f\u043e\u0433\u0430\u0448\u0435\u043d\u0438\u0435",
    elig1: "\u0417\u0430\u0432\u0435\u0440\u0448\u0451\u043d\u043d\u0430\u044f \u0432\u0435\u0440\u0438\u0444\u0438\u043a\u0430\u0446\u0438\u044f KYC/AML",
    elig2: "\u0421\u043e\u043e\u0442\u0432\u0435\u0442\u0441\u0442\u0432\u0438\u0435 \u043c\u0438\u043d\u0438\u043c\u0430\u043b\u044c\u043d\u044b\u043c \u043f\u043e\u0440\u043e\u0433\u0430\u043c \u043f\u043e\u0433\u0430\u0448\u0435\u043d\u0438\u044f",
    elig3: "\u0420\u0430\u0441\u043f\u0440\u0435\u0434\u0435\u043b\u0451\u043d\u043d\u044b\u0439 \u043c\u0435\u0442\u0430\u043b\u043b \u0432 \u0441\u0442\u0430\u0442\u0443\u0441\u0435 \u0414\u043e\u0441\u0442\u0443\u043f\u0435\u043d \u0434\u043b\u044f \u043f\u043e\u0433\u0430\u0448\u0435\u043d\u0438\u044f",
    elig4: "\u041e\u0442\u0441\u0443\u0442\u0441\u0442\u0432\u0438\u0435 \u044e\u0440\u0438\u0434\u0438\u0447\u0435\u0441\u043a\u0438\u0445 \u0438\u043b\u0438 \u043d\u043e\u0440\u043c\u0430\u0442\u0438\u0432\u043d\u044b\u0445 \u043e\u0433\u0440\u0430\u043d\u0438\u0447\u0435\u043d\u0438\u0439",
    heading3: "3. \u041c\u0438\u043d\u0438\u043c\u0430\u043b\u044c\u043d\u044b\u0435 \u043e\u0431\u044a\u0451\u043c\u044b",
    minGold: "\u0417\u043e\u043b\u043e\u0442\u043e (AUXG):",
    minGoldDesc: "\u041c\u0438\u043d\u0438\u043c\u0443\u043c 1 \u0441\u043b\u0438\u0442\u043e\u043a",
    minSilver: "\u0421\u0435\u0440\u0435\u0431\u0440\u043e (AUXS):",
    minSilverDesc: "\u0421\u0442\u0430\u043d\u0434\u0430\u0440\u0442\u043d\u044b\u0439 \u0441\u0435\u0440\u0435\u0431\u0440\u044f\u043d\u044b\u0439 \u0441\u043b\u0438\u0442\u043e\u043a",
    minPlatPal: "\u041f\u043b\u0430\u0442\u0438\u043d\u0430/\u041f\u0430\u043b\u043b\u0430\u0434\u0438\u0439:",
    minPlatPalDesc: "\u0412 \u0437\u0430\u0432\u0438\u0441\u0438\u043c\u043e\u0441\u0442\u0438 \u043e\u0442 \u043d\u0430\u043b\u0438\u0447\u0438\u044f",
    heading4: "4. \u041f\u0440\u043e\u0446\u0435\u0441\u0441",
    proc1: "\u041f\u043e\u0434\u0430\u0442\u044c \u0437\u0430\u044f\u0432\u043a\u0443 \u043d\u0430 \u043f\u043e\u0433\u0430\u0448\u0435\u043d\u0438\u0435",
    proc2: "\u0422\u043e\u043a\u0435\u043d\u044b \u0431\u043b\u043e\u043a\u0438\u0440\u0443\u044e\u0442\u0441\u044f",
    proc3: "\u0421\u0442\u0430\u0442\u0443\u0441 \u043e\u0431\u043d\u043e\u0432\u043b\u044f\u0435\u0442\u0441\u044f \u043d\u0430 \u041e\u0436\u0438\u0434\u0430\u043d\u0438\u0435 \u043f\u043e\u0433\u0430\u0448\u0435\u043d\u0438\u044f",
    proc4: "\u041f\u043e\u043b\u0443\u0447\u0435\u043d\u043e \u043f\u043e\u0434\u0442\u0432\u0435\u0440\u0436\u0434\u0435\u043d\u0438\u0435 \u0445\u0440\u0430\u043d\u0438\u0442\u0435\u043b\u044f",
    proc5: "\u041c\u0435\u0442\u0430\u043b\u043b \u043f\u043e\u0434\u0433\u043e\u0442\u043e\u0432\u043b\u0435\u043d \u0434\u043b\u044f \u043f\u043e\u043b\u0443\u0447\u0435\u043d\u0438\u044f \u0438\u043b\u0438 \u0434\u043e\u0441\u0442\u0430\u0432\u043a\u0438",
    proc6: "\u0422\u043e\u043a\u0435\u043d\u044b \u0441\u0436\u0438\u0433\u0430\u044e\u0442\u0441\u044f \u043f\u043e \u0437\u0430\u0432\u0435\u0440\u0448\u0435\u043d\u0438\u0438",
    heading5: "5. \u041a\u043e\u043c\u0438\u0441\u0441\u0438\u0438",
    para5: "\u041f\u043e\u0433\u0430\u0448\u0435\u043d\u0438\u0435 \u043c\u043e\u0436\u0435\u0442 \u0432\u043a\u043b\u044e\u0447\u0430\u0442\u044c: \u043a\u043e\u043c\u0438\u0441\u0441\u0438\u044e \u0437\u0430 \u043e\u0431\u0440\u0430\u0431\u043e\u0442\u043a\u0443 \u0432 \u0445\u0440\u0430\u043d\u0438\u043b\u0438\u0449\u0435, \u043b\u043e\u0433\u0438\u0441\u0442\u0438\u0447\u0435\u0441\u043a\u0438\u0435/\u0441\u0442\u0440\u0430\u0445\u043e\u0432\u044b\u0435 \u0440\u0430\u0441\u0445\u043e\u0434\u044b, \u0442\u0430\u043c\u043e\u0436\u0435\u043d\u043d\u044b\u0435 \u0441\u0431\u043e\u0440\u044b. \u0412\u0441\u0435 \u043a\u043e\u043c\u0438\u0441\u0441\u0438\u0438 \u0440\u0430\u0441\u043a\u0440\u044b\u0432\u0430\u044e\u0442\u0441\u044f \u0434\u043e \u043f\u043e\u0434\u0442\u0432\u0435\u0440\u0436\u0434\u0435\u043d\u0438\u044f.",
    heading6: "6. \u0421\u0442\u0430\u0442\u0443\u0441 \u0441\u0435\u0440\u0442\u0438\u0444\u0438\u043a\u0430\u0442\u0430",
    para6: "\u041f\u043e\u0441\u043b\u0435 \u0443\u0441\u043f\u0435\u0448\u043d\u043e\u0433\u043e \u043f\u043e\u0433\u0430\u0448\u0435\u043d\u0438\u044f \u0441\u0435\u0440\u0442\u0438\u0444\u0438\u043a\u0430\u0442\u044b \u043e\u0442\u043c\u0435\u0447\u0430\u044e\u0442\u0441\u044f \u043a\u0430\u043a \u041f\u043e\u0433\u0430\u0448\u0435\u043d\u043d\u044b\u0435, \u0441\u0442\u0430\u043d\u043e\u0432\u044f\u0442\u0441\u044f \u043d\u0435\u0434\u0435\u0439\u0441\u0442\u0432\u0438\u0442\u0435\u043b\u044c\u043d\u044b\u043c\u0438, \u0430 \u0437\u0430\u043f\u0438\u0441\u0438 \u043e \u0440\u0430\u0441\u043f\u0440\u0435\u0434\u0435\u043b\u0435\u043d\u0438\u0438 \u0430\u0440\u0445\u0438\u0432\u0438\u0440\u0443\u044e\u0442\u0441\u044f.",
  },
};

export default function RedemptionPage() {
  const { lang } = useLanguage();
  const t = translations[lang] || translations.en;

  return (
    <div className="min-h-screen bg-stone-100 dark:bg-slate-950">
      <TopNav />
      <main className="max-w-4xl mx-auto px-4 py-8">
        <Link href="/legal" className="inline-flex items-center gap-2 text-[#2F6F62] hover:underline mb-6">
          {t.backToLegal}
        </Link>
        <article className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-8 md:p-12">
          <header className="mb-8 pb-8 border-b border-slate-200 dark:border-slate-700">
            <h1 className="text-3xl font-bold text-slate-800 dark:text-white mb-2">{t.title}</h1>
            <p className="text-lg text-slate-600 dark:text-slate-400">{t.subtitle}</p>
            <p className="text-sm text-slate-500 mt-2">{t.effective}</p>
          </header>
          <div className="prose prose-slate dark:prose-invert max-w-none space-y-6 text-slate-600 dark:text-slate-300">
            <h2 className="text-xl font-bold text-slate-800 dark:text-white">{t.heading1}</h2>
            <p>{t.para1}</p>

            <h2 className="text-xl font-bold text-slate-800 dark:text-white mt-8">{t.heading2}</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>{t.elig1}</li>
              <li>{t.elig2}</li>
              <li>{t.elig3}</li>
              <li>{t.elig4}</li>
            </ul>

            <h2 className="text-xl font-bold text-slate-800 dark:text-white mt-8">{t.heading3}</h2>
            <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-4">
              <ul className="space-y-2">
                <li><strong>{t.minGold}</strong> {t.minGoldDesc}</li>
                <li><strong>{t.minSilver}</strong> {t.minSilverDesc}</li>
                <li><strong>{t.minPlatPal}</strong> {t.minPlatPalDesc}</li>
              </ul>
            </div>

            <h2 className="text-xl font-bold text-slate-800 dark:text-white mt-8">{t.heading4}</h2>
            <ol className="list-decimal pl-6 space-y-2">
              <li>{t.proc1}</li>
              <li>{t.proc2}</li>
              <li>{t.proc3}</li>
              <li>{t.proc4}</li>
              <li>{t.proc5}</li>
              <li>{t.proc6}</li>
            </ol>

            <h2 className="text-xl font-bold text-slate-800 dark:text-white mt-8">{t.heading5}</h2>
            <p>{t.para5}</p>

            <h2 className="text-xl font-bold text-slate-800 dark:text-white mt-8">{t.heading6}</h2>
            <p>{t.para6}</p>
          </div>
        </article>
      </main>
      <ComplianceFooter />
    </div>
  );
}
