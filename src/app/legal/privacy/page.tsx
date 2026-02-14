"use client";
import Link from "next/link";
import TopNav from "@/components/TopNav";
import ComplianceFooter from "@/components/ComplianceFooter";
import { useLanguage } from "@/components/LanguageContext";

const translations: Record<string, Record<string, string>> = {
  tr: {
    backToLegal: "\u2190 Yasal Belgelere D\u00f6n",
    title: "Gizlilik Politikas\u0131",
    subtitle: "Ki\u015fisel verilerin korunmas\u0131 ve m\u00fc\u015fteri gizlili\u011fine sayg\u0131",
    effective: "Y\u00fcr\u00fcrl\u00fck: 1 Ocak 2025 \u2022 G\u00fcncelleme: 14 \u015eubat 2026",
    heading1: "1. Taahh\u00fct",
    para1: "Auxite, ki\u015fisel verileri korumaya ve m\u00fc\u015fteri gizlili\u011fine sayg\u0131 g\u00f6stermeye kararl\u0131d\u0131r. Bilgileri yaln\u0131zca hizmet sunmak, yasal y\u00fck\u00fcml\u00fcl\u00fckleri yerine getirmek ve platform g\u00fcvenli\u011fini s\u00fcrd\u00fcrmek i\u00e7in gerekli oldu\u011fu durumlarda toplar ve i\u015fler.",
    heading2: "2. Toplayabilece\u011fimiz Bilgiler",
    collect1: "Kimlik bilgileri",
    collect2: "\u0130leti\u015fim bilgileri",
    collect3: "Do\u011frulama belgeleri",
    collect4: "\u0130\u015flem verileri",
    collect5: "Teknik kullan\u0131m verileri",
    heading3: "3. Bilgilerin Kullan\u0131m\u0131",
    para3: "Veriler \u015fu ama\u00e7larla i\u015flenebilir:",
    use1: "Kimlik do\u011frulama",
    use2: "Uyumluluk y\u00fck\u00fcml\u00fcl\u00fckleri",
    use3: "\u0130\u015flem i\u015fleme",
    use4: "G\u00fcvenlik izleme",
    use5: "Hizmet iyile\u015ftirme",
    heading4: "4. Veri Koruma",
    para4: "Auxite, yetkisiz eri\u015fimi, if\u015fay\u0131 veya k\u00f6t\u00fcye kullan\u0131m\u0131 \u00f6nlemek i\u00e7in tasarlanm\u0131\u015f teknik ve organizasyonel g\u00fcvenceler uygular. Veri koruma \u00f6nlemleri \u015fifreleme, eri\u015fim kontrolleri ve d\u00fczenli g\u00fcvenlik de\u011ferlendirmelerini i\u00e7erir.",
    heading5: "5. Veri Payla\u015f\u0131m\u0131",
    para5: "Bilgiler, a\u015fa\u011f\u0131dakiler i\u00e7in gerekli oldu\u011funda g\u00fcvenilir hizmet sa\u011flay\u0131c\u0131larla payla\u015f\u0131labilir:",
    share1: "Uyumluluk",
    share2: "Kimlik do\u011frulama",
    share3: "G\u00fcvenlik taramas\u0131",
    noSell: "Auxite ki\u015fisel verileri satmaz.",
    heading6: "6. Veri Saklama",
    para6: "Bilgiler yaln\u0131zca yasal, d\u00fczenleyici ve operasyonel ama\u00e7lar i\u00e7in gerekli oldu\u011fu s\u00fcrece saklan\u0131r. Saklama s\u00fcrelerinin sona ermesiyle birlikte veriler g\u00fcvenli bir \u015fekilde silinir veya anonimle\u015ftirilir.",
    heading7: "7. M\u00fc\u015fteri Haklar\u0131",
    para7: "Uygulanabilir oldu\u011funda, m\u00fc\u015fteriler yasal s\u0131n\u0131rlamalar dahilinde ki\u015fisel verilerine eri\u015fim, d\u00fczeltme veya silme talebinde bulunabilir. Talepler uyumluluk ekibimize y\u00f6nlendirilebilir.",
    heading8: "8. Uluslararas\u0131 Veri Transferleri",
    para8: "Ki\u015fisel verilerin s\u0131n\u0131r \u00f6tesi transferi gerekti\u011finde, Auxite uygulanabilir veri koruma d\u00fczenlemeleriyle tutarl\u0131 uygun g\u00fcvencelerin mevcut olmas\u0131n\u0131 sa\u011flar.",
    closing: "M\u00fc\u015fteri verilerinin korunmas\u0131, Auxite\u2019in kurumsal i\u015fletme standartlar\u0131n\u0131n temelidir.",
    contact: "Gizlilik sorular\u0131 i\u00e7in: privacy@auxite.com",
  },
  en: {
    backToLegal: "\u2190 Back to Legal",
    title: "Privacy Policy",
    subtitle: "Protecting personal data and respecting client privacy",
    effective: "Effective: January 1, 2025 \u2022 Updated: February 14, 2026",
    heading1: "1. Commitment",
    para1: "Auxite is committed to protecting personal data and respecting client privacy. We collect and process information only where necessary to deliver services, meet legal obligations, and maintain platform security.",
    heading2: "2. Information We May Collect",
    collect1: "Identity information",
    collect2: "Contact details",
    collect3: "Verification documentation",
    collect4: "Transactional data",
    collect5: "Technical usage data",
    heading3: "3. How Information Is Used",
    para3: "Data may be processed for:",
    use1: "Identity verification",
    use2: "Compliance obligations",
    use3: "Transaction processing",
    use4: "Security monitoring",
    use5: "Service improvement",
    heading4: "4. Data Protection",
    para4: "Auxite applies technical and organizational safeguards designed to prevent unauthorized access, disclosure, or misuse. Data protection measures include encryption, access controls, and regular security assessments.",
    heading5: "5. Data Sharing",
    para5: "Information may be shared with trusted service providers where necessary for:",
    share1: "Compliance",
    share2: "Identity verification",
    share3: "Security screening",
    noSell: "Auxite does not sell personal data.",
    heading6: "6. Data Retention",
    para6: "Information is retained only as long as required for legal, regulatory, and operational purposes. Upon expiration of retention periods, data is securely deleted or anonymized.",
    heading7: "7. Client Rights",
    para7: "Where applicable, clients may request access, correction, or deletion of their personal data subject to legal limitations. Requests can be directed to our compliance team.",
    heading8: "8. International Data Transfers",
    para8: "Where personal data is transferred across borders, Auxite ensures appropriate safeguards are in place consistent with applicable data protection regulations.",
    closing: "Protecting client data is fundamental to Auxite\u2019s institutional operating standards.",
    contact: "For privacy inquiries: privacy@auxite.com",
  },
  de: {
    backToLegal: "\u2190 Zur\u00fcck zu Rechtliches",
    title: "Datenschutzrichtlinie",
    subtitle: "Schutz personenbezogener Daten und Respektierung der Kundenprivatsph\u00e4re",
    effective: "G\u00fcltig ab: 1. Januar 2025 \u2022 Aktualisiert: 14. Februar 2026",
    heading1: "1. Verpflichtung",
    para1: "Auxite verpflichtet sich zum Schutz personenbezogener Daten und zur Achtung der Privatsph\u00e4re seiner Kunden. Wir erheben und verarbeiten Informationen nur dort, wo dies zur Erbringung von Dienstleistungen, zur Erf\u00fcllung gesetzlicher Pflichten und zur Aufrechterhaltung der Plattformsicherheit erforderlich ist.",
    heading2: "2. Informationen, die wir erheben k\u00f6nnen",
    collect1: "Identit\u00e4tsinformationen",
    collect2: "Kontaktdaten",
    collect3: "Verifizierungsdokumente",
    collect4: "Transaktionsdaten",
    collect5: "Technische Nutzungsdaten",
    heading3: "3. Verwendung der Informationen",
    para3: "Daten k\u00f6nnen f\u00fcr folgende Zwecke verarbeitet werden:",
    use1: "Identit\u00e4tspr\u00fcfung",
    use2: "Compliance-Verpflichtungen",
    use3: "Transaktionsverarbeitung",
    use4: "Sicherheits\u00fcberwachung",
    use5: "Serviceverbesserung",
    heading4: "4. Datenschutz",
    para4: "Auxite wendet technische und organisatorische Schutzma\u00dfnahmen an, die darauf ausgelegt sind, unbefugten Zugriff, Offenlegung oder Missbrauch zu verhindern. Datenschutzma\u00dfnahmen umfassen Verschl\u00fcsselung, Zugriffskontrollen und regelm\u00e4\u00dfige Sicherheitsbewertungen.",
    heading5: "5. Datenweitergabe",
    para5: "Informationen k\u00f6nnen bei Bedarf an vertrauensw\u00fcrdige Dienstleister weitergegeben werden f\u00fcr:",
    share1: "Compliance",
    share2: "Identit\u00e4tspr\u00fcfung",
    share3: "Sicherheits\u00fcberpr\u00fcfung",
    noSell: "Auxite verkauft keine personenbezogenen Daten.",
    heading6: "6. Datenspeicherung",
    para6: "Informationen werden nur so lange aufbewahrt, wie es f\u00fcr rechtliche, regulatorische und betriebliche Zwecke erforderlich ist. Nach Ablauf der Aufbewahrungsfristen werden Daten sicher gel\u00f6scht oder anonymisiert.",
    heading7: "7. Kundenrechte",
    para7: "Sofern anwendbar, k\u00f6nnen Kunden vorbehaltlich gesetzlicher Einschr\u00e4nkungen Zugang, Berichtigung oder L\u00f6schung ihrer personenbezogenen Daten beantragen. Anfragen k\u00f6nnen an unser Compliance-Team gerichtet werden.",
    heading8: "8. Internationale Daten\u00fcbertragungen",
    para8: "Wenn personenbezogene Daten grenz\u00fcberschreitend \u00fcbertragen werden, stellt Auxite sicher, dass angemessene Schutzma\u00dfnahmen im Einklang mit den geltenden Datenschutzvorschriften vorhanden sind.",
    closing: "Der Schutz von Kundendaten ist grundlegend f\u00fcr die institutionellen Betriebsstandards von Auxite.",
    contact: "F\u00fcr Datenschutzanfragen: privacy@auxite.com",
  },
  fr: {
    backToLegal: "\u2190 Retour aux documents l\u00e9gaux",
    title: "Politique de Confidentialit\u00e9",
    subtitle: "Protection des donn\u00e9es personnelles et respect de la vie priv\u00e9e des clients",
    effective: "En vigueur : 1er janvier 2025 \u2022 Mise \u00e0 jour : 14 f\u00e9vrier 2026",
    heading1: "1. Engagement",
    para1: "Auxite s\u2019engage \u00e0 prot\u00e9ger les donn\u00e9es personnelles et \u00e0 respecter la vie priv\u00e9e de ses clients. Nous ne collectons et ne traitons les informations que lorsque cela est n\u00e9cessaire pour fournir nos services, remplir nos obligations l\u00e9gales et maintenir la s\u00e9curit\u00e9 de la plateforme.",
    heading2: "2. Informations que nous pouvons collecter",
    collect1: "Informations d\u2019identit\u00e9",
    collect2: "Coordonn\u00e9es",
    collect3: "Documents de v\u00e9rification",
    collect4: "Donn\u00e9es transactionnelles",
    collect5: "Donn\u00e9es techniques d\u2019utilisation",
    heading3: "3. Utilisation des informations",
    para3: "Les donn\u00e9es peuvent \u00eatre trait\u00e9es pour :",
    use1: "V\u00e9rification d\u2019identit\u00e9",
    use2: "Obligations de conformit\u00e9",
    use3: "Traitement des transactions",
    use4: "Surveillance de la s\u00e9curit\u00e9",
    use5: "Am\u00e9lioration des services",
    heading4: "4. Protection des donn\u00e9es",
    para4: "Auxite applique des mesures de protection techniques et organisationnelles con\u00e7ues pour pr\u00e9venir tout acc\u00e8s non autoris\u00e9, toute divulgation ou tout usage abusif. Les mesures de protection des donn\u00e9es comprennent le chiffrement, les contr\u00f4les d\u2019acc\u00e8s et des \u00e9valuations r\u00e9guli\u00e8res de la s\u00e9curit\u00e9.",
    heading5: "5. Partage des donn\u00e9es",
    para5: "Les informations peuvent \u00eatre partag\u00e9es avec des prestataires de confiance lorsque cela est n\u00e9cessaire pour :",
    share1: "La conformit\u00e9",
    share2: "La v\u00e9rification d\u2019identit\u00e9",
    share3: "Le contr\u00f4le de s\u00e9curit\u00e9",
    noSell: "Auxite ne vend pas de donn\u00e9es personnelles.",
    heading6: "6. Conservation des donn\u00e9es",
    para6: "Les informations ne sont conserv\u00e9es que le temps n\u00e9cessaire aux fins l\u00e9gales, r\u00e9glementaires et op\u00e9rationnelles. \u00c0 l\u2019expiration des p\u00e9riodes de conservation, les donn\u00e9es sont supprim\u00e9es de mani\u00e8re s\u00e9curis\u00e9e ou anonymis\u00e9es.",
    heading7: "7. Droits des clients",
    para7: "Le cas \u00e9ch\u00e9ant, les clients peuvent demander l\u2019acc\u00e8s, la rectification ou la suppression de leurs donn\u00e9es personnelles sous r\u00e9serve des limitations l\u00e9gales. Les demandes peuvent \u00eatre adress\u00e9es \u00e0 notre \u00e9quipe de conformit\u00e9.",
    heading8: "8. Transferts internationaux de donn\u00e9es",
    para8: "Lorsque des donn\u00e9es personnelles sont transf\u00e9r\u00e9es au-del\u00e0 des fronti\u00e8res, Auxite veille \u00e0 ce que des garanties appropri\u00e9es soient en place, conform\u00e9ment aux r\u00e9glementations applicables en mati\u00e8re de protection des donn\u00e9es.",
    closing: "La protection des donn\u00e9es des clients est fondamentale pour les standards op\u00e9rationnels institutionnels d\u2019Auxite.",
    contact: "Pour les questions de confidentialit\u00e9 : privacy@auxite.com",
  },
  ar: {
    backToLegal: "\u2190 \u0627\u0644\u0639\u0648\u062f\u0629 \u0625\u0644\u0649 \u0627\u0644\u0648\u062b\u0627\u0626\u0642 \u0627\u0644\u0642\u0627\u0646\u0648\u0646\u064a\u0629",
    title: "\u0633\u064a\u0627\u0633\u0629 \u0627\u0644\u062e\u0635\u0648\u0635\u064a\u0629",
    subtitle: "\u062d\u0645\u0627\u064a\u0629 \u0627\u0644\u0628\u064a\u0627\u0646\u0627\u062a \u0627\u0644\u0634\u062e\u0635\u064a\u0629 \u0648\u0627\u062d\u062a\u0631\u0627\u0645 \u062e\u0635\u0648\u0635\u064a\u0629 \u0627\u0644\u0639\u0645\u0644\u0627\u0621",
    effective: "\u062a\u0627\u0631\u064a\u062e \u0627\u0644\u0633\u0631\u064a\u0627\u0646: 1 \u064a\u0646\u0627\u064a\u0631 2025 \u2022 \u0627\u0644\u062a\u062d\u062f\u064a\u062b: 14 \u0641\u0628\u0631\u0627\u064a\u0631 2026",
    heading1: "1. \u0627\u0644\u0627\u0644\u062a\u0632\u0627\u0645",
    para1: "\u062a\u0644\u062a\u0632\u0645 \u0623\u0648\u0643\u0633\u0627\u064a\u062a \u0628\u062d\u0645\u0627\u064a\u0629 \u0627\u0644\u0628\u064a\u0627\u0646\u0627\u062a \u0627\u0644\u0634\u062e\u0635\u064a\u0629 \u0648\u0627\u062d\u062a\u0631\u0627\u0645 \u062e\u0635\u0648\u0635\u064a\u0629 \u0627\u0644\u0639\u0645\u0644\u0627\u0621. \u0646\u062c\u0645\u0639 \u0627\u0644\u0645\u0639\u0644\u0648\u0645\u0627\u062a \u0648\u0646\u0639\u0627\u0644\u062c\u0647\u0627 \u0641\u0642\u0637 \u0639\u0646\u062f\u0645\u0627 \u064a\u0643\u0648\u0646 \u0630\u0644\u0643 \u0636\u0631\u0648\u0631\u064a\u064b\u0627 \u0644\u062a\u0642\u062f\u064a\u0645 \u0627\u0644\u062e\u062f\u0645\u0627\u062a \u0648\u0627\u0644\u0648\u0641\u0627\u0621 \u0628\u0627\u0644\u0627\u0644\u062a\u0632\u0627\u0645\u0627\u062a \u0627\u0644\u0642\u0627\u0646\u0648\u0646\u064a\u0629 \u0648\u0627\u0644\u062d\u0641\u0627\u0638 \u0639\u0644\u0649 \u0623\u0645\u0646 \u0627\u0644\u0645\u0646\u0635\u0629.",
    heading2: "2. \u0627\u0644\u0645\u0639\u0644\u0648\u0645\u0627\u062a \u0627\u0644\u062a\u064a \u0642\u062f \u0646\u062c\u0645\u0639\u0647\u0627",
    collect1: "\u0645\u0639\u0644\u0648\u0645\u0627\u062a \u0627\u0644\u0647\u0648\u064a\u0629",
    collect2: "\u0628\u064a\u0627\u0646\u0627\u062a \u0627\u0644\u0627\u062a\u0635\u0627\u0644",
    collect3: "\u0648\u062b\u0627\u0626\u0642 \u0627\u0644\u062a\u062d\u0642\u0642",
    collect4: "\u0628\u064a\u0627\u0646\u0627\u062a \u0627\u0644\u0645\u0639\u0627\u0645\u0644\u0627\u062a",
    collect5: "\u0628\u064a\u0627\u0646\u0627\u062a \u0627\u0644\u0627\u0633\u062a\u062e\u062f\u0627\u0645 \u0627\u0644\u062a\u0642\u0646\u064a\u0629",
    heading3: "3. \u0643\u064a\u0641\u064a\u0629 \u0627\u0633\u062a\u062e\u062f\u0627\u0645 \u0627\u0644\u0645\u0639\u0644\u0648\u0645\u0627\u062a",
    para3: "\u0642\u062f \u062a\u062a\u0645 \u0645\u0639\u0627\u0644\u062c\u0629 \u0627\u0644\u0628\u064a\u0627\u0646\u0627\u062a \u0644\u0644\u0623\u063a\u0631\u0627\u0636 \u0627\u0644\u062a\u0627\u0644\u064a\u0629:",
    use1: "\u0627\u0644\u062a\u062d\u0642\u0642 \u0645\u0646 \u0627\u0644\u0647\u0648\u064a\u0629",
    use2: "\u0627\u0644\u062a\u0632\u0627\u0645\u0627\u062a \u0627\u0644\u0627\u0645\u062a\u062b\u0627\u0644",
    use3: "\u0645\u0639\u0627\u0644\u062c\u0629 \u0627\u0644\u0645\u0639\u0627\u0645\u0644\u0627\u062a",
    use4: "\u0627\u0644\u0645\u0631\u0627\u0642\u0628\u0629 \u0627\u0644\u0623\u0645\u0646\u064a\u0629",
    use5: "\u062a\u062d\u0633\u064a\u0646 \u0627\u0644\u062e\u062f\u0645\u0627\u062a",
    heading4: "4. \u062d\u0645\u0627\u064a\u0629 \u0627\u0644\u0628\u064a\u0627\u0646\u0627\u062a",
    para4: "\u062a\u0637\u0628\u0642 \u0623\u0648\u0643\u0633\u0627\u064a\u062a \u0636\u0645\u0627\u0646\u0627\u062a \u062a\u0642\u0646\u064a\u0629 \u0648\u062a\u0646\u0638\u064a\u0645\u064a\u0629 \u0645\u0635\u0645\u0645\u0629 \u0644\u0645\u0646\u0639 \u0627\u0644\u0648\u0635\u0648\u0644 \u063a\u064a\u0631 \u0627\u0644\u0645\u0635\u0631\u062d \u0628\u0647 \u0623\u0648 \u0627\u0644\u0625\u0641\u0635\u0627\u062d \u0623\u0648 \u0633\u0648\u0621 \u0627\u0644\u0627\u0633\u062a\u062e\u062f\u0627\u0645. \u062a\u0634\u0645\u0644 \u062a\u062f\u0627\u0628\u064a\u0631 \u062d\u0645\u0627\u064a\u0629 \u0627\u0644\u0628\u064a\u0627\u0646\u0627\u062a \u0627\u0644\u062a\u0634\u0641\u064a\u0631 \u0648\u0636\u0648\u0627\u0628\u0637 \u0627\u0644\u0648\u0635\u0648\u0644 \u0648\u0627\u0644\u062a\u0642\u064a\u064a\u0645\u0627\u062a \u0627\u0644\u0623\u0645\u0646\u064a\u0629 \u0627\u0644\u062f\u0648\u0631\u064a\u0629.",
    heading5: "5. \u0645\u0634\u0627\u0631\u0643\u0629 \u0627\u0644\u0628\u064a\u0627\u0646\u0627\u062a",
    para5: "\u0642\u062f \u064a\u062a\u0645 \u0645\u0634\u0627\u0631\u0643\u0629 \u0627\u0644\u0645\u0639\u0644\u0648\u0645\u0627\u062a \u0645\u0639 \u0645\u0642\u062f\u0645\u064a \u062e\u062f\u0645\u0627\u062a \u0645\u0648\u062b\u0648\u0642\u064a\u0646 \u0639\u0646\u062f \u0627\u0644\u0636\u0631\u0648\u0631\u0629 \u0644\u0640:",
    share1: "\u0627\u0644\u0627\u0645\u062a\u062b\u0627\u0644",
    share2: "\u0627\u0644\u062a\u062d\u0642\u0642 \u0645\u0646 \u0627\u0644\u0647\u0648\u064a\u0629",
    share3: "\u0627\u0644\u0641\u062d\u0635 \u0627\u0644\u0623\u0645\u0646\u064a",
    noSell: "\u0644\u0627 \u062a\u0628\u064a\u0639 \u0623\u0648\u0643\u0633\u0627\u064a\u062a \u0627\u0644\u0628\u064a\u0627\u0646\u0627\u062a \u0627\u0644\u0634\u062e\u0635\u064a\u0629.",
    heading6: "6. \u0627\u0644\u0627\u062d\u062a\u0641\u0627\u0638 \u0628\u0627\u0644\u0628\u064a\u0627\u0646\u0627\u062a",
    para6: "\u064a\u062a\u0645 \u0627\u0644\u0627\u062d\u062a\u0641\u0627\u0638 \u0628\u0627\u0644\u0645\u0639\u0644\u0648\u0645\u0627\u062a \u0641\u0642\u0637 \u0637\u0627\u0644\u0645\u0627 \u0643\u0627\u0646 \u0630\u0644\u0643 \u0645\u0637\u0644\u0648\u0628\u064b\u0627 \u0644\u0644\u0623\u063a\u0631\u0627\u0636 \u0627\u0644\u0642\u0627\u0646\u0648\u0646\u064a\u0629 \u0648\u0627\u0644\u062a\u0646\u0638\u064a\u0645\u064a\u0629 \u0648\u0627\u0644\u062a\u0634\u063a\u064a\u0644\u064a\u0629. \u0639\u0646\u062f \u0627\u0646\u062a\u0647\u0627\u0621 \u0641\u062a\u0631\u0627\u062a \u0627\u0644\u0627\u062d\u062a\u0641\u0627\u0638\u060c \u064a\u062a\u0645 \u062d\u0630\u0641 \u0627\u0644\u0628\u064a\u0627\u0646\u0627\u062a \u0628\u0634\u0643\u0644 \u0622\u0645\u0646 \u0623\u0648 \u062c\u0639\u0644\u0647\u0627 \u0645\u062c\u0647\u0648\u0644\u0629 \u0627\u0644\u0647\u0648\u064a\u0629.",
    heading7: "7. \u062d\u0642\u0648\u0642 \u0627\u0644\u0639\u0645\u0644\u0627\u0621",
    para7: "\u062d\u064a\u062b\u0645\u0627 \u064a\u0646\u0637\u0628\u0642\u060c \u064a\u062c\u0648\u0632 \u0644\u0644\u0639\u0645\u0644\u0627\u0621 \u0637\u0644\u0628 \u0627\u0644\u0648\u0635\u0648\u0644 \u0625\u0644\u0649 \u0628\u064a\u0627\u0646\u0627\u062a\u0647\u0645 \u0627\u0644\u0634\u062e\u0635\u064a\u0629 \u0623\u0648 \u062a\u0635\u062d\u064a\u062d\u0647\u0627 \u0623\u0648 \u062d\u0630\u0641\u0647\u0627 \u0645\u0639 \u0645\u0631\u0627\u0639\u0627\u0629 \u0627\u0644\u0642\u064a\u0648\u062f \u0627\u0644\u0642\u0627\u0646\u0648\u0646\u064a\u0629. \u064a\u0645\u0643\u0646 \u062a\u0648\u062c\u064a\u0647 \u0627\u0644\u0637\u0644\u0628\u0627\u062a \u0625\u0644\u0649 \u0641\u0631\u064a\u0642 \u0627\u0644\u0627\u0645\u062a\u062b\u0627\u0644 \u0644\u062f\u064a\u0646\u0627.",
    heading8: "8. \u0627\u0644\u062a\u062d\u0648\u064a\u0644\u0627\u062a \u0627\u0644\u062f\u0648\u0644\u064a\u0629 \u0644\u0644\u0628\u064a\u0627\u0646\u0627\u062a",
    para8: "\u0639\u0646\u062f\u0645\u0627 \u064a\u062a\u0645 \u0646\u0642\u0644 \u0627\u0644\u0628\u064a\u0627\u0646\u0627\u062a \u0627\u0644\u0634\u062e\u0635\u064a\u0629 \u0639\u0628\u0631 \u0627\u0644\u062d\u062f\u0648\u062f\u060c \u062a\u0636\u0645\u0646 \u0623\u0648\u0643\u0633\u0627\u064a\u062a \u0648\u062c\u0648\u062f \u0636\u0645\u0627\u0646\u0627\u062a \u0645\u0646\u0627\u0633\u0628\u0629 \u0645\u062a\u0633\u0642\u0629 \u0645\u0639 \u0644\u0648\u0627\u0626\u062d \u062d\u0645\u0627\u064a\u0629 \u0627\u0644\u0628\u064a\u0627\u0646\u0627\u062a \u0627\u0644\u0645\u0639\u0645\u0648\u0644 \u0628\u0647\u0627.",
    closing: "\u062d\u0645\u0627\u064a\u0629 \u0628\u064a\u0627\u0646\u0627\u062a \u0627\u0644\u0639\u0645\u0644\u0627\u0621 \u0623\u0645\u0631 \u0623\u0633\u0627\u0633\u064a \u0641\u064a \u0645\u0639\u0627\u064a\u064a\u0631 \u0627\u0644\u062a\u0634\u063a\u064a\u0644 \u0627\u0644\u0645\u0624\u0633\u0633\u064a\u0629 \u0644\u0623\u0648\u0643\u0633\u0627\u064a\u062a.",
    contact: "\u0644\u0644\u0627\u0633\u062a\u0641\u0633\u0627\u0631\u0627\u062a \u062d\u0648\u0644 \u0627\u0644\u062e\u0635\u0648\u0635\u064a\u0629: privacy@auxite.com",
  },
  ru: {
    backToLegal: "\u2190 \u041d\u0430\u0437\u0430\u0434 \u043a \u043f\u0440\u0430\u0432\u043e\u0432\u044b\u043c \u0434\u043e\u043a\u0443\u043c\u0435\u043d\u0442\u0430\u043c",
    title: "\u041f\u043e\u043b\u0438\u0442\u0438\u043a\u0430 \u043a\u043e\u043d\u0444\u0438\u0434\u0435\u043d\u0446\u0438\u0430\u043b\u044c\u043d\u043e\u0441\u0442\u0438",
    subtitle: "\u0417\u0430\u0449\u0438\u0442\u0430 \u043f\u0435\u0440\u0441\u043e\u043d\u0430\u043b\u044c\u043d\u044b\u0445 \u0434\u0430\u043d\u043d\u044b\u0445 \u0438 \u0443\u0432\u0430\u0436\u0435\u043d\u0438\u0435 \u043a\u043e\u043d\u0444\u0438\u0434\u0435\u043d\u0446\u0438\u0430\u043b\u044c\u043d\u043e\u0441\u0442\u0438 \u043a\u043b\u0438\u0435\u043d\u0442\u043e\u0432",
    effective: "\u0412\u0441\u0442\u0443\u043f\u0430\u0435\u0442 \u0432 \u0441\u0438\u043b\u0443: 1 \u044f\u043d\u0432\u0430\u0440\u044f 2025 \u2022 \u041e\u0431\u043d\u043e\u0432\u043b\u0435\u043d\u043e: 14 \u0444\u0435\u0432\u0440\u0430\u043b\u044f 2026",
    heading1: "1. \u041e\u0431\u044f\u0437\u0430\u0442\u0435\u043b\u044c\u0441\u0442\u0432\u043e",
    para1: "Auxite \u0441\u0442\u0440\u0435\u043c\u0438\u0442\u0441\u044f \u0437\u0430\u0449\u0438\u0449\u0430\u0442\u044c \u043f\u0435\u0440\u0441\u043e\u043d\u0430\u043b\u044c\u043d\u044b\u0435 \u0434\u0430\u043d\u043d\u044b\u0435 \u0438 \u0443\u0432\u0430\u0436\u0430\u0442\u044c \u043a\u043e\u043d\u0444\u0438\u0434\u0435\u043d\u0446\u0438\u0430\u043b\u044c\u043d\u043e\u0441\u0442\u044c \u043a\u043b\u0438\u0435\u043d\u0442\u043e\u0432. \u041c\u044b \u0441\u043e\u0431\u0438\u0440\u0430\u0435\u043c \u0438 \u043e\u0431\u0440\u0430\u0431\u0430\u0442\u044b\u0432\u0430\u0435\u043c \u0438\u043d\u0444\u043e\u0440\u043c\u0430\u0446\u0438\u044e \u0442\u043e\u043b\u044c\u043a\u043e \u0442\u043e\u0433\u0434\u0430, \u043a\u043e\u0433\u0434\u0430 \u044d\u0442\u043e \u043d\u0435\u043e\u0431\u0445\u043e\u0434\u0438\u043c\u043e \u0434\u043b\u044f \u043e\u043a\u0430\u0437\u0430\u043d\u0438\u044f \u0443\u0441\u043b\u0443\u0433, \u0432\u044b\u043f\u043e\u043b\u043d\u0435\u043d\u0438\u044f \u044e\u0440\u0438\u0434\u0438\u0447\u0435\u0441\u043a\u0438\u0445 \u043e\u0431\u044f\u0437\u0430\u0442\u0435\u043b\u044c\u0441\u0442\u0432 \u0438 \u043e\u0431\u0435\u0441\u043f\u0435\u0447\u0435\u043d\u0438\u044f \u0431\u0435\u0437\u043e\u043f\u0430\u0441\u043d\u043e\u0441\u0442\u0438 \u043f\u043b\u0430\u0442\u0444\u043e\u0440\u043c\u044b.",
    heading2: "2. \u0418\u043d\u0444\u043e\u0440\u043c\u0430\u0446\u0438\u044f, \u043a\u043e\u0442\u043e\u0440\u0443\u044e \u043c\u044b \u043c\u043e\u0436\u0435\u043c \u0441\u043e\u0431\u0438\u0440\u0430\u0442\u044c",
    collect1: "\u0418\u0434\u0435\u043d\u0442\u0438\u0444\u0438\u043a\u0430\u0446\u0438\u043e\u043d\u043d\u0430\u044f \u0438\u043d\u0444\u043e\u0440\u043c\u0430\u0446\u0438\u044f",
    collect2: "\u041a\u043e\u043d\u0442\u0430\u043a\u0442\u043d\u044b\u0435 \u0434\u0430\u043d\u043d\u044b\u0435",
    collect3: "\u0414\u043e\u043a\u0443\u043c\u0435\u043d\u0442\u044b \u0434\u043b\u044f \u0432\u0435\u0440\u0438\u0444\u0438\u043a\u0430\u0446\u0438\u0438",
    collect4: "\u0422\u0440\u0430\u043d\u0437\u0430\u043a\u0446\u0438\u043e\u043d\u043d\u044b\u0435 \u0434\u0430\u043d\u043d\u044b\u0435",
    collect5: "\u0422\u0435\u0445\u043d\u0438\u0447\u0435\u0441\u043a\u0438\u0435 \u0434\u0430\u043d\u043d\u044b\u0435 \u043e\u0431 \u0438\u0441\u043f\u043e\u043b\u044c\u0437\u043e\u0432\u0430\u043d\u0438\u0438",
    heading3: "3. \u041a\u0430\u043a \u0438\u0441\u043f\u043e\u043b\u044c\u0437\u0443\u0435\u0442\u0441\u044f \u0438\u043d\u0444\u043e\u0440\u043c\u0430\u0446\u0438\u044f",
    para3: "\u0414\u0430\u043d\u043d\u044b\u0435 \u043c\u043e\u0433\u0443\u0442 \u043e\u0431\u0440\u0430\u0431\u0430\u0442\u044b\u0432\u0430\u0442\u044c\u0441\u044f \u0434\u043b\u044f:",
    use1: "\u041f\u0440\u043e\u0432\u0435\u0440\u043a\u0430 \u043b\u0438\u0447\u043d\u043e\u0441\u0442\u0438",
    use2: "\u041e\u0431\u044f\u0437\u0430\u0442\u0435\u043b\u044c\u0441\u0442\u0432\u0430 \u043f\u043e \u0441\u043e\u043e\u0442\u0432\u0435\u0442\u0441\u0442\u0432\u0438\u044e",
    use3: "\u041e\u0431\u0440\u0430\u0431\u043e\u0442\u043a\u0430 \u0442\u0440\u0430\u043d\u0437\u0430\u043a\u0446\u0438\u0439",
    use4: "\u041c\u043e\u043d\u0438\u0442\u043e\u0440\u0438\u043d\u0433 \u0431\u0435\u0437\u043e\u043f\u0430\u0441\u043d\u043e\u0441\u0442\u0438",
    use5: "\u0423\u043b\u0443\u0447\u0448\u0435\u043d\u0438\u0435 \u0441\u0435\u0440\u0432\u0438\u0441\u0430",
    heading4: "4. \u0417\u0430\u0449\u0438\u0442\u0430 \u0434\u0430\u043d\u043d\u044b\u0445",
    para4: "Auxite \u043f\u0440\u0438\u043c\u0435\u043d\u044f\u0435\u0442 \u0442\u0435\u0445\u043d\u0438\u0447\u0435\u0441\u043a\u0438\u0435 \u0438 \u043e\u0440\u0433\u0430\u043d\u0438\u0437\u0430\u0446\u0438\u043e\u043d\u043d\u044b\u0435 \u043c\u0435\u0440\u044b \u0437\u0430\u0449\u0438\u0442\u044b, \u043d\u0430\u043f\u0440\u0430\u0432\u043b\u0435\u043d\u043d\u044b\u0435 \u043d\u0430 \u043f\u0440\u0435\u0434\u043e\u0442\u0432\u0440\u0430\u0449\u0435\u043d\u0438\u0435 \u043d\u0435\u0441\u0430\u043d\u043a\u0446\u0438\u043e\u043d\u0438\u0440\u043e\u0432\u0430\u043d\u043d\u043e\u0433\u043e \u0434\u043e\u0441\u0442\u0443\u043f\u0430, \u0440\u0430\u0441\u043a\u0440\u044b\u0442\u0438\u044f \u0438\u043b\u0438 \u043d\u0435\u043f\u0440\u0430\u0432\u043e\u043c\u0435\u0440\u043d\u043e\u0433\u043e \u0438\u0441\u043f\u043e\u043b\u044c\u0437\u043e\u0432\u0430\u043d\u0438\u044f. \u041c\u0435\u0440\u044b \u0437\u0430\u0449\u0438\u0442\u044b \u0434\u0430\u043d\u043d\u044b\u0445 \u0432\u043a\u043b\u044e\u0447\u0430\u044e\u0442 \u0448\u0438\u0444\u0440\u043e\u0432\u0430\u043d\u0438\u0435, \u043a\u043e\u043d\u0442\u0440\u043e\u043b\u044c \u0434\u043e\u0441\u0442\u0443\u043f\u0430 \u0438 \u0440\u0435\u0433\u0443\u043b\u044f\u0440\u043d\u044b\u0435 \u043e\u0446\u0435\u043d\u043a\u0438 \u0431\u0435\u0437\u043e\u043f\u0430\u0441\u043d\u043e\u0441\u0442\u0438.",
    heading5: "5. \u041f\u0435\u0440\u0435\u0434\u0430\u0447\u0430 \u0434\u0430\u043d\u043d\u044b\u0445",
    para5: "\u0418\u043d\u0444\u043e\u0440\u043c\u0430\u0446\u0438\u044f \u043c\u043e\u0436\u0435\u0442 \u043f\u0435\u0440\u0435\u0434\u0430\u0432\u0430\u0442\u044c\u0441\u044f \u0434\u043e\u0432\u0435\u0440\u0435\u043d\u043d\u044b\u043c \u043f\u043e\u0441\u0442\u0430\u0432\u0449\u0438\u043a\u0430\u043c \u0443\u0441\u043b\u0443\u0433 \u043f\u0440\u0438 \u043d\u0435\u043e\u0431\u0445\u043e\u0434\u0438\u043c\u043e\u0441\u0442\u0438 \u0434\u043b\u044f:",
    share1: "\u0421\u043e\u043e\u0442\u0432\u0435\u0442\u0441\u0442\u0432\u0438\u0435 \u0442\u0440\u0435\u0431\u043e\u0432\u0430\u043d\u0438\u044f\u043c",
    share2: "\u041f\u0440\u043e\u0432\u0435\u0440\u043a\u0430 \u043b\u0438\u0447\u043d\u043e\u0441\u0442\u0438",
    share3: "\u041f\u0440\u043e\u0432\u0435\u0440\u043a\u0430 \u0431\u0435\u0437\u043e\u043f\u0430\u0441\u043d\u043e\u0441\u0442\u0438",
    noSell: "Auxite \u043d\u0435 \u043f\u0440\u043e\u0434\u0430\u0451\u0442 \u043f\u0435\u0440\u0441\u043e\u043d\u0430\u043b\u044c\u043d\u044b\u0435 \u0434\u0430\u043d\u043d\u044b\u0435.",
    heading6: "6. \u0425\u0440\u0430\u043d\u0435\u043d\u0438\u0435 \u0434\u0430\u043d\u043d\u044b\u0445",
    para6: "\u0418\u043d\u0444\u043e\u0440\u043c\u0430\u0446\u0438\u044f \u0445\u0440\u0430\u043d\u0438\u0442\u0441\u044f \u0442\u043e\u043b\u044c\u043a\u043e \u0432 \u0442\u0435\u0447\u0435\u043d\u0438\u0435 \u0441\u0440\u043e\u043a\u0430, \u043d\u0435\u043e\u0431\u0445\u043e\u0434\u0438\u043c\u043e\u0433\u043e \u0434\u043b\u044f \u044e\u0440\u0438\u0434\u0438\u0447\u0435\u0441\u043a\u0438\u0445, \u043d\u043e\u0440\u043c\u0430\u0442\u0438\u0432\u043d\u044b\u0445 \u0438 \u043e\u043f\u0435\u0440\u0430\u0446\u0438\u043e\u043d\u043d\u044b\u0445 \u0446\u0435\u043b\u0435\u0439. \u041f\u043e \u0438\u0441\u0442\u0435\u0447\u0435\u043d\u0438\u0438 \u0441\u0440\u043e\u043a\u043e\u0432 \u0445\u0440\u0430\u043d\u0435\u043d\u0438\u044f \u0434\u0430\u043d\u043d\u044b\u0435 \u0431\u0435\u0437\u043e\u043f\u0430\u0441\u043d\u043e \u0443\u0434\u0430\u043b\u044f\u044e\u0442\u0441\u044f \u0438\u043b\u0438 \u0430\u043d\u043e\u043d\u0438\u043c\u0438\u0437\u0438\u0440\u0443\u044e\u0442\u0441\u044f.",
    heading7: "7. \u041f\u0440\u0430\u0432\u0430 \u043a\u043b\u0438\u0435\u043d\u0442\u043e\u0432",
    para7: "\u0412 \u0441\u043e\u043e\u0442\u0432\u0435\u0442\u0441\u0442\u0432\u0443\u044e\u0449\u0438\u0445 \u0441\u043b\u0443\u0447\u0430\u044f\u0445 \u043a\u043b\u0438\u0435\u043d\u0442\u044b \u043c\u043e\u0433\u0443\u0442 \u0437\u0430\u043f\u0440\u043e\u0441\u0438\u0442\u044c \u0434\u043e\u0441\u0442\u0443\u043f, \u0438\u0441\u043f\u0440\u0430\u0432\u043b\u0435\u043d\u0438\u0435 \u0438\u043b\u0438 \u0443\u0434\u0430\u043b\u0435\u043d\u0438\u0435 \u0441\u0432\u043e\u0438\u0445 \u043f\u0435\u0440\u0441\u043e\u043d\u0430\u043b\u044c\u043d\u044b\u0445 \u0434\u0430\u043d\u043d\u044b\u0445 \u0441 \u0443\u0447\u0451\u0442\u043e\u043c \u044e\u0440\u0438\u0434\u0438\u0447\u0435\u0441\u043a\u0438\u0445 \u043e\u0433\u0440\u0430\u043d\u0438\u0447\u0435\u043d\u0438\u0439. \u0417\u0430\u043f\u0440\u043e\u0441\u044b \u043c\u043e\u0436\u043d\u043e \u043d\u0430\u043f\u0440\u0430\u0432\u043b\u044f\u0442\u044c \u0432 \u043d\u0430\u0448\u0443 \u043a\u043e\u043c\u0430\u043d\u0434\u0443 \u043f\u043e \u0441\u043e\u043e\u0442\u0432\u0435\u0442\u0441\u0442\u0432\u0438\u044e.",
    heading8: "8. \u041c\u0435\u0436\u0434\u0443\u043d\u0430\u0440\u043e\u0434\u043d\u044b\u0435 \u043f\u0435\u0440\u0435\u0434\u0430\u0447\u0438 \u0434\u0430\u043d\u043d\u044b\u0445",
    para8: "\u041a\u043e\u0433\u0434\u0430 \u043f\u0435\u0440\u0441\u043e\u043d\u0430\u043b\u044c\u043d\u044b\u0435 \u0434\u0430\u043d\u043d\u044b\u0435 \u043f\u0435\u0440\u0435\u0434\u0430\u044e\u0442\u0441\u044f \u0447\u0435\u0440\u0435\u0437 \u0433\u0440\u0430\u043d\u0438\u0446\u044b, Auxite \u043e\u0431\u0435\u0441\u043f\u0435\u0447\u0438\u0432\u0430\u0435\u0442 \u043d\u0430\u043b\u0438\u0447\u0438\u0435 \u043d\u0430\u0434\u043b\u0435\u0436\u0430\u0449\u0438\u0445 \u0433\u0430\u0440\u0430\u043d\u0442\u0438\u0439 \u0432 \u0441\u043e\u043e\u0442\u0432\u0435\u0442\u0441\u0442\u0432\u0438\u0438 \u0441 \u043f\u0440\u0438\u043c\u0435\u043d\u0438\u043c\u044b\u043c\u0438 \u043d\u043e\u0440\u043c\u0430\u0442\u0438\u0432\u043d\u044b\u043c\u0438 \u0430\u043a\u0442\u0430\u043c\u0438 \u043e \u0437\u0430\u0449\u0438\u0442\u0435 \u0434\u0430\u043d\u043d\u044b\u0445.",
    closing: "\u0417\u0430\u0449\u0438\u0442\u0430 \u0434\u0430\u043d\u043d\u044b\u0445 \u043a\u043b\u0438\u0435\u043d\u0442\u043e\u0432 \u044f\u0432\u043b\u044f\u0435\u0442\u0441\u044f \u043e\u0441\u043d\u043e\u0432\u043e\u0439 \u0438\u043d\u0441\u0442\u0438\u0442\u0443\u0446\u0438\u043e\u043d\u0430\u043b\u044c\u043d\u044b\u0445 \u043e\u043f\u0435\u0440\u0430\u0446\u0438\u043e\u043d\u043d\u044b\u0445 \u0441\u0442\u0430\u043d\u0434\u0430\u0440\u0442\u043e\u0432 Auxite.",
    contact: "\u041f\u043e \u0432\u043e\u043f\u0440\u043e\u0441\u0430\u043c \u043a\u043e\u043d\u0444\u0438\u0434\u0435\u043d\u0446\u0438\u0430\u043b\u044c\u043d\u043e\u0441\u0442\u0438: privacy@auxite.com",
  },
};

export default function PrivacyPolicyPage() {
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
              <li>{t.collect1}</li>
              <li>{t.collect2}</li>
              <li>{t.collect3}</li>
              <li>{t.collect4}</li>
              <li>{t.collect5}</li>
            </ul>

            <h2 className="text-xl font-bold text-slate-800 dark:text-white mt-8">{t.heading3}</h2>
            <p>{t.para3}</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>{t.use1}</li>
              <li>{t.use2}</li>
              <li>{t.use3}</li>
              <li>{t.use4}</li>
              <li>{t.use5}</li>
            </ul>

            <h2 className="text-xl font-bold text-slate-800 dark:text-white mt-8">{t.heading4}</h2>
            <p>{t.para4}</p>

            <h2 className="text-xl font-bold text-slate-800 dark:text-white mt-8">{t.heading5}</h2>
            <p>{t.para5}</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>{t.share1}</li>
              <li>{t.share2}</li>
              <li>{t.share3}</li>
            </ul>
            <div className="bg-[#BFA181]/10 dark:bg-[#BFA181]/20 border border-[#BFA181]/30 dark:border-[#BFA181]/30 rounded-lg p-4">
              <p className="text-sm font-bold text-slate-800 dark:text-white">{t.noSell}</p>
            </div>

            <h2 className="text-xl font-bold text-slate-800 dark:text-white mt-8">{t.heading6}</h2>
            <p>{t.para6}</p>

            <h2 className="text-xl font-bold text-slate-800 dark:text-white mt-8">{t.heading7}</h2>
            <p>{t.para7}</p>

            <h2 className="text-xl font-bold text-slate-800 dark:text-white mt-8">{t.heading8}</h2>
            <p>{t.para8}</p>

            <div className="bg-[#BFA181]/10 dark:bg-[#BFA181]/20 border border-[#BFA181]/30 dark:border-[#BFA181]/30 rounded-lg p-4 mt-8">
              <p className="text-sm font-semibold text-slate-800 dark:text-white">{t.closing}</p>
            </div>

            <p className="text-sm text-slate-500 mt-4">{t.contact}</p>
          </div>
        </article>
      </main>
      <ComplianceFooter />
    </div>
  );
}
