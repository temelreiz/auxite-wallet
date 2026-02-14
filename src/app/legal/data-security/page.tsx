"use client";
import Link from "next/link";
import TopNav from "@/components/TopNav";
import { useLanguage } from "@/components/LanguageContext";

const translations: Record<string, Record<string, string>> = {
  tr: {
    backToLegal: "\u2190 Yasal Belgelere D\u00f6n",
    title: "Veri G\u00fcvenli\u011fi",
    subtitle: "M\u00fc\u015fteri verilerini ve operasyonel sistemleri koruyan \u00e7ok katmanl\u0131 g\u00fcvenlik mimarisi",
    effective: "Y\u00fcr\u00fcrl\u00fck: \u015eubat 2025",

    h1: "G\u00fcvenlik \u0130lkeleri",
    p1: "Auxite, m\u00fc\u015fteri verilerini, i\u015flem kay\u0131tlar\u0131n\u0131 ve operasyonel sistemleri korumak i\u00e7in tasarlanm\u0131\u015f \u00e7ok katmanl\u0131 bir g\u00fcvenlik mimarisi s\u00fcrd\u00fcrmektedir. G\u00fcvenlik ilkeleri \u015funlara odaklan\u0131r:",
    p1_1: "Gizlilik",
    p1_2: "B\u00fct\u00fcnl\u00fck",
    p1_3: "Eri\u015filebilirlik",

    h2: "Altyap\u0131 Korumas\u0131",
    p2: "G\u00fcvenlik \u00f6nlemleri \u015funlar\u0131 i\u00e7erir:",
    p2_1: "\u0130letim halinde ve depolamada \u015fifreleme",
    p2_2: "G\u00fc\u00e7lendirilmi\u015f bulut mimarisi",
    p2_3: "A\u011f eri\u015fim kontrolleri",
    p2_4: "S\u00fcrekli izleme",
    p2_5: "Da\u011f\u0131t\u0131lm\u0131\u015f hizmet reddi korumas\u0131",

    h3: "Eri\u015fim Kontrol\u00fc",
    p3: "Hassas sistemler \u015funlarla korunmaktad\u0131r:",
    p3_1: "\u00c7ok fakt\u00f6rl\u00fc kimlik do\u011frulama",
    p3_2: "Rol tabanl\u0131 izinler",
    p3_3: "En az ayr\u0131cal\u0131k eri\u015fim modeli",
    p3_4: "Oturum g\u00f6zetimi ve y\u00f6netimi",

    h4: "Veri Koruma \u0130lkeleri",
    p4: "Auxite, veri minimizasyonu uygulamalar\u0131n\u0131 takip eder ve bilgileri yaln\u0131zca me\u015fru operasyonel ama\u00e7lar i\u00e7in i\u015fler. Uygulanabilir oldu\u011funda, veri uygulamalar\u0131 GDPR ilkeleri gibi k\u00fcresel olarak tan\u0131nan gizlilik standartlar\u0131yla uyumludur.",

    h5: "Olay M\u00fcdahalesi",
    p5: "Auxite, g\u00fcvenlik olaylar\u0131n\u0131 tespit etmek, kontrol alt\u0131na almak ve d\u00fczeltmek i\u00e7in tasarlanm\u0131\u015f yap\u0131land\u0131r\u0131lm\u0131\u015f prosed\u00fcrler s\u00fcrd\u00fcrmektedir. M\u00fcdahale protokolleri; tespit, s\u0131n\u0131rlama, ortadan kald\u0131rma ve kurtarma a\u015famalar\u0131n\u0131 i\u00e7erir.",

    h6: "\u00dc\u00e7\u00fcnc\u00fc Taraf G\u00fcvenli\u011fi",
    p6: "Tedarik\u00e7i ve i\u015f orta\u011f\u0131 ili\u015fkileri g\u00fcvenlik de\u011ferlendirmelerine tabidir. Auxite, hizmet sa\u011flay\u0131c\u0131lar\u0131n g\u00fcvenlik duru\u015funu ba\u011flant\u0131 kurmadan \u00f6nce de\u011ferlendirir ve g\u00fcvenlik gereksinimlerine uyumu s\u00fcrekli olarak izler.",

    closing: "G\u00fcvenlik, temel bir altyap\u0131 \u00f6nceli\u011fi olarak ele al\u0131nmaktad\u0131r.",
    contact: "G\u00fcvenlik sorular\u0131 i\u00e7in: security@auxite.com",
  },
  en: {
    backToLegal: "\u2190 Back to Legal",
    title: "Data Security",
    subtitle: "Multi-layered security architecture protecting client data and operational systems",
    effective: "Effective: February 2025",

    h1: "Security Principles",
    p1: "Auxite maintains a multi-layered security architecture designed to protect client data, transactional records, and operational systems. Security principles focus on:",
    p1_1: "Confidentiality",
    p1_2: "Integrity",
    p1_3: "Availability",

    h2: "Infrastructure Protection",
    p2: "Security measures include:",
    p2_1: "Encryption in transit and at rest",
    p2_2: "Hardened cloud architecture",
    p2_3: "Network access controls",
    p2_4: "Continuous monitoring",
    p2_5: "Distributed denial-of-service protection",

    h3: "Access Control",
    p3: "Sensitive systems are protected through:",
    p3_1: "Multi-factor authentication",
    p3_2: "Role-based permissions",
    p3_3: "Least-privilege access model",
    p3_4: "Session oversight and management",

    h4: "Data Protection Principles",
    p4: "Auxite follows data minimization practices and processes information solely for legitimate operational purposes. Where applicable, data practices align with globally recognized privacy standards such as GDPR principles.",

    h5: "Incident Response",
    p5: "Auxite maintains structured procedures designed to detect, contain, and remediate security incidents. Response protocols include identification, containment, eradication, and recovery phases.",

    h6: "Third-Party Security",
    p6: "Vendor and partner relationships are subject to security assessments. Auxite evaluates the security posture of service providers before engagement and monitors compliance with security requirements on an ongoing basis.",

    closing: "Security is treated as a foundational infrastructure priority.",
    contact: "For security inquiries: security@auxite.com",
  },
  de: {
    backToLegal: "\u2190 Zur\u00fcck zu Rechtliches",
    title: "Datensicherheit",
    subtitle: "Mehrschichtige Sicherheitsarchitektur zum Schutz von Kundendaten und Betriebssystemen",
    effective: "G\u00fcltig ab: Februar 2025",

    h1: "Sicherheitsprinzipien",
    p1: "Auxite betreibt eine mehrschichtige Sicherheitsarchitektur zum Schutz von Kundendaten, Transaktionsaufzeichnungen und Betriebssystemen. Die Sicherheitsprinzipien konzentrieren sich auf:",
    p1_1: "Vertraulichkeit",
    p1_2: "Integrit\u00e4t",
    p1_3: "Verf\u00fcgbarkeit",

    h2: "Infrastrukturschutz",
    p2: "Sicherheitsma\u00dfnahmen umfassen:",
    p2_1: "Verschl\u00fcsselung bei \u00dcbertragung und Speicherung",
    p2_2: "Geh\u00e4rtete Cloud-Architektur",
    p2_3: "Netzwerkzugriffskontrollen",
    p2_4: "Kontinuierliche \u00dcberwachung",
    p2_5: "Schutz vor verteilten Dienstverweigerungsangriffen",

    h3: "Zugriffskontrolle",
    p3: "Sensible Systeme werden gesch\u00fctzt durch:",
    p3_1: "Multi-Faktor-Authentifizierung",
    p3_2: "Rollenbasierte Berechtigungen",
    p3_3: "Zugangsmodell mit minimalen Rechten",
    p3_4: "Sitzungs\u00fcberwachung und -verwaltung",

    h4: "Datenschutzprinzipien",
    p4: "Auxite folgt dem Prinzip der Datenminimierung und verarbeitet Informationen ausschlie\u00dflich f\u00fcr legitime betriebliche Zwecke. Soweit anwendbar, entsprechen die Datenpraktiken weltweit anerkannten Datenschutzstandards wie den DSGVO-Grunds\u00e4tzen.",

    h5: "Reaktion auf Sicherheitsvorf\u00e4lle",
    p5: "Auxite unterh\u00e4lt strukturierte Verfahren zur Erkennung, Eind\u00e4mmung und Behebung von Sicherheitsvorf\u00e4llen. Die Reaktionsprotokolle umfassen Identifikation, Eind\u00e4mmung, Beseitigung und Wiederherstellungsphasen.",

    h6: "Sicherheit von Drittanbietern",
    p6: "Lieferanten- und Partnerbeziehungen unterliegen Sicherheitsbewertungen. Auxite bewertet die Sicherheitslage von Dienstleistern vor der Zusammenarbeit und \u00fcberwacht die Einhaltung der Sicherheitsanforderungen fortlaufend.",

    closing: "Sicherheit wird als grundlegende Infrastrukturpriorit\u00e4t behandelt.",
    contact: "F\u00fcr Sicherheitsanfragen: security@auxite.com",
  },
  fr: {
    backToLegal: "\u2190 Retour aux documents l\u00e9gaux",
    title: "S\u00e9curit\u00e9 des Donn\u00e9es",
    subtitle: "Architecture de s\u00e9curit\u00e9 multicouche prot\u00e9geant les donn\u00e9es clients et les syst\u00e8mes op\u00e9rationnels",
    effective: "En vigueur : f\u00e9vrier 2025",

    h1: "Principes de S\u00e9curit\u00e9",
    p1: "Auxite maintient une architecture de s\u00e9curit\u00e9 multicouche con\u00e7ue pour prot\u00e9ger les donn\u00e9es des clients, les enregistrements transactionnels et les syst\u00e8mes op\u00e9rationnels. Les principes de s\u00e9curit\u00e9 se concentrent sur :",
    p1_1: "Confidentialit\u00e9",
    p1_2: "Int\u00e9grit\u00e9",
    p1_3: "Disponibilit\u00e9",

    h2: "Protection de l\u2019Infrastructure",
    p2: "Les mesures de s\u00e9curit\u00e9 comprennent :",
    p2_1: "Chiffrement en transit et au repos",
    p2_2: "Architecture cloud renforc\u00e9e",
    p2_3: "Contr\u00f4les d\u2019acc\u00e8s r\u00e9seau",
    p2_4: "Surveillance continue",
    p2_5: "Protection contre les attaques par d\u00e9ni de service distribu\u00e9",

    h3: "Contr\u00f4le d\u2019Acc\u00e8s",
    p3: "Les syst\u00e8mes sensibles sont prot\u00e9g\u00e9s par :",
    p3_1: "Authentification multi-facteurs",
    p3_2: "Permissions bas\u00e9es sur les r\u00f4les",
    p3_3: "Mod\u00e8le d\u2019acc\u00e8s \u00e0 privil\u00e8ges minimaux",
    p3_4: "Supervision et gestion des sessions",

    h4: "Principes de Protection des Donn\u00e9es",
    p4: "Auxite suit des pratiques de minimisation des donn\u00e9es et traite les informations uniquement \u00e0 des fins op\u00e9rationnelles l\u00e9gitimes. Le cas \u00e9ch\u00e9ant, les pratiques en mati\u00e8re de donn\u00e9es sont conformes aux normes de confidentialit\u00e9 mondialement reconnues telles que les principes du RGPD.",

    h5: "R\u00e9ponse aux Incidents",
    p5: "Auxite maintient des proc\u00e9dures structur\u00e9es con\u00e7ues pour d\u00e9tecter, contenir et rem\u00e9dier aux incidents de s\u00e9curit\u00e9. Les protocoles de r\u00e9ponse comprennent les phases d\u2019identification, de confinement, d\u2019\u00e9radication et de r\u00e9cup\u00e9ration.",

    h6: "S\u00e9curit\u00e9 des Tiers",
    p6: "Les relations avec les fournisseurs et partenaires sont soumises \u00e0 des \u00e9valuations de s\u00e9curit\u00e9. Auxite \u00e9value la posture de s\u00e9curit\u00e9 des prestataires de services avant tout engagement et surveille le respect des exigences de s\u00e9curit\u00e9 de mani\u00e8re continue.",

    closing: "La s\u00e9curit\u00e9 est trait\u00e9e comme une priorit\u00e9 fondamentale de l\u2019infrastructure.",
    contact: "Pour les questions de s\u00e9curit\u00e9 : security@auxite.com",
  },
  ar: {
    backToLegal: "\u2190 \u0627\u0644\u0639\u0648\u062f\u0629 \u0625\u0644\u0649 \u0627\u0644\u0648\u062b\u0627\u0626\u0642 \u0627\u0644\u0642\u0627\u0646\u0648\u0646\u064a\u0629",
    title: "\u0623\u0645\u0646 \u0627\u0644\u0628\u064a\u0627\u0646\u0627\u062a",
    subtitle: "\u0628\u0646\u064a\u0629 \u0623\u0645\u0646\u064a\u0629 \u0645\u062a\u0639\u062f\u062f\u0629 \u0627\u0644\u0637\u0628\u0642\u0627\u062a \u0644\u062d\u0645\u0627\u064a\u0629 \u0628\u064a\u0627\u0646\u0627\u062a \u0627\u0644\u0639\u0645\u0644\u0627\u0621 \u0648\u0627\u0644\u0623\u0646\u0638\u0645\u0629 \u0627\u0644\u062a\u0634\u063a\u064a\u0644\u064a\u0629",
    effective: "\u0633\u0627\u0631\u064a \u0627\u0644\u0645\u0641\u0639\u0648\u0644: \u0641\u0628\u0631\u0627\u064a\u0631 2025",

    h1: "\u0645\u0628\u0627\u062f\u0626 \u0627\u0644\u0623\u0645\u0646",
    p1: "\u062a\u062d\u0627\u0641\u0638 Auxite \u0639\u0644\u0649 \u0628\u0646\u064a\u0629 \u0623\u0645\u0646\u064a\u0629 \u0645\u062a\u0639\u062f\u062f\u0629 \u0627\u0644\u0637\u0628\u0642\u0627\u062a \u0645\u0635\u0645\u0645\u0629 \u0644\u062d\u0645\u0627\u064a\u0629 \u0628\u064a\u0627\u0646\u0627\u062a \u0627\u0644\u0639\u0645\u0644\u0627\u0621 \u0648\u0633\u062c\u0644\u0627\u062a \u0627\u0644\u0645\u0639\u0627\u0645\u0644\u0627\u062a \u0648\u0627\u0644\u0623\u0646\u0638\u0645\u0629 \u0627\u0644\u062a\u0634\u063a\u064a\u0644\u064a\u0629. \u062a\u0631\u0643\u0632 \u0645\u0628\u0627\u062f\u0626 \u0627\u0644\u0623\u0645\u0646 \u0639\u0644\u0649:",
    p1_1: "\u0627\u0644\u0633\u0631\u064a\u0629",
    p1_2: "\u0627\u0644\u0633\u0644\u0627\u0645\u0629",
    p1_3: "\u0627\u0644\u062a\u0648\u0641\u0631",

    h2: "\u062d\u0645\u0627\u064a\u0629 \u0627\u0644\u0628\u0646\u064a\u0629 \u0627\u0644\u062a\u062d\u062a\u064a\u0629",
    p2: "\u062a\u0634\u0645\u0644 \u0627\u0644\u062a\u062f\u0627\u0628\u064a\u0631 \u0627\u0644\u0623\u0645\u0646\u064a\u0629:",
    p2_1: "\u0627\u0644\u062a\u0634\u0641\u064a\u0631 \u0623\u062b\u0646\u0627\u0621 \u0627\u0644\u0646\u0642\u0644 \u0648\u0641\u064a \u062d\u0627\u0644\u0629 \u0627\u0644\u0633\u0643\u0648\u0646",
    p2_2: "\u0628\u0646\u064a\u0629 \u0633\u062d\u0627\u0628\u064a\u0629 \u0645\u0639\u0632\u0632\u0629",
    p2_3: "\u0636\u0648\u0627\u0628\u0637 \u0627\u0644\u0648\u0635\u0648\u0644 \u0625\u0644\u0649 \u0627\u0644\u0634\u0628\u0643\u0629",
    p2_4: "\u0627\u0644\u0645\u0631\u0627\u0642\u0628\u0629 \u0627\u0644\u0645\u0633\u062a\u0645\u0631\u0629",
    p2_5: "\u0627\u0644\u062d\u0645\u0627\u064a\u0629 \u0645\u0646 \u0647\u062c\u0645\u0627\u062a \u0631\u0641\u0636 \u0627\u0644\u062e\u062f\u0645\u0629 \u0627\u0644\u0645\u0648\u0632\u0639\u0629",

    h3: "\u0627\u0644\u062a\u062d\u0643\u0645 \u0641\u064a \u0627\u0644\u0648\u0635\u0648\u0644",
    p3: "\u062a\u064f\u062d\u0645\u0649 \u0627\u0644\u0623\u0646\u0638\u0645\u0629 \u0627\u0644\u062d\u0633\u0627\u0633\u0629 \u0645\u0646 \u062e\u0644\u0627\u0644:",
    p3_1: "\u0627\u0644\u0645\u0635\u0627\u062f\u0642\u0629 \u0645\u062a\u0639\u062f\u062f\u0629 \u0627\u0644\u0639\u0648\u0627\u0645\u0644",
    p3_2: "\u0627\u0644\u0623\u0630\u0648\u0646\u0627\u062a \u0627\u0644\u0642\u0627\u0626\u0645\u0629 \u0639\u0644\u0649 \u0627\u0644\u0623\u062f\u0648\u0627\u0631",
    p3_3: "\u0646\u0645\u0648\u0630\u062c \u0627\u0644\u0648\u0635\u0648\u0644 \u0628\u0623\u0642\u0644 \u0627\u0644\u0627\u0645\u062a\u064a\u0627\u0632\u0627\u062a",
    p3_4: "\u0627\u0644\u0625\u0634\u0631\u0627\u0641 \u0639\u0644\u0649 \u0627\u0644\u062c\u0644\u0633\u0627\u062a \u0648\u0625\u062f\u0627\u0631\u062a\u0647\u0627",

    h4: "\u0645\u0628\u0627\u062f\u0626 \u062d\u0645\u0627\u064a\u0629 \u0627\u0644\u0628\u064a\u0627\u0646\u0627\u062a",
    p4: "\u062a\u062a\u0628\u0639 Auxite \u0645\u0645\u0627\u0631\u0633\u0627\u062a \u062a\u0642\u0644\u064a\u0644 \u0627\u0644\u0628\u064a\u0627\u0646\u0627\u062a \u0648\u062a\u0639\u0627\u0644\u062c \u0627\u0644\u0645\u0639\u0644\u0648\u0645\u0627\u062a \u0641\u0642\u0637 \u0644\u0623\u063a\u0631\u0627\u0636 \u062a\u0634\u063a\u064a\u0644\u064a\u0629 \u0645\u0634\u0631\u0648\u0639\u0629. \u0639\u0646\u062f \u0627\u0644\u0627\u0642\u062a\u0636\u0627\u0621\u060c \u062a\u062a\u0648\u0627\u0641\u0642 \u0645\u0645\u0627\u0631\u0633\u0627\u062a \u0627\u0644\u0628\u064a\u0627\u0646\u0627\u062a \u0645\u0639 \u0645\u0639\u0627\u064a\u064a\u0631 \u0627\u0644\u062e\u0635\u0648\u0635\u064a\u0629 \u0627\u0644\u0645\u0639\u062a\u0631\u0641 \u0628\u0647\u0627 \u0639\u0627\u0644\u0645\u064a\u064b\u0627 \u0645\u062b\u0644 \u0645\u0628\u0627\u062f\u0626 GDPR.",

    h5: "\u0627\u0644\u0627\u0633\u062a\u062c\u0627\u0628\u0629 \u0644\u0644\u062d\u0648\u0627\u062f\u062b",
    p5: "\u062a\u062d\u0627\u0641\u0638 Auxite \u0639\u0644\u0649 \u0625\u062c\u0631\u0627\u0621\u0627\u062a \u0645\u0646\u0638\u0645\u0629 \u0645\u0635\u0645\u0645\u0629 \u0644\u0644\u0643\u0634\u0641 \u0639\u0646 \u0627\u0644\u062d\u0648\u0627\u062f\u062b \u0627\u0644\u0623\u0645\u0646\u064a\u0629 \u0648\u0627\u062d\u062a\u0648\u0627\u0626\u0647\u0627 \u0648\u0645\u0639\u0627\u0644\u062c\u062a\u0647\u0627. \u062a\u0634\u0645\u0644 \u0628\u0631\u0648\u062a\u0648\u0643\u0648\u0644\u0627\u062a \u0627\u0644\u0627\u0633\u062a\u062c\u0627\u0628\u0629 \u0645\u0631\u0627\u062d\u0644 \u0627\u0644\u062a\u062d\u062f\u064a\u062f \u0648\u0627\u0644\u0627\u062d\u062a\u0648\u0627\u0621 \u0648\u0627\u0644\u0625\u0632\u0627\u0644\u0629 \u0648\u0627\u0644\u0627\u0633\u062a\u0631\u062f\u0627\u062f.",

    h6: "\u0623\u0645\u0646 \u0627\u0644\u0623\u0637\u0631\u0627\u0641 \u0627\u0644\u062b\u0627\u0644\u062b\u0629",
    p6: "\u062a\u062e\u0636\u0639 \u0639\u0644\u0627\u0642\u0627\u062a \u0627\u0644\u0645\u0648\u0631\u062f\u064a\u0646 \u0648\u0627\u0644\u0634\u0631\u0643\u0627\u0621 \u0644\u062a\u0642\u064a\u064a\u0645\u0627\u062a \u0623\u0645\u0646\u064a\u0629. \u062a\u0642\u064a\u0651\u0645 Auxite \u0627\u0644\u0648\u0636\u0639 \u0627\u0644\u0623\u0645\u0646\u064a \u0644\u0645\u0642\u062f\u0645\u064a \u0627\u0644\u062e\u062f\u0645\u0627\u062a \u0642\u0628\u0644 \u0627\u0644\u062a\u0639\u0627\u0642\u062f \u0648\u062a\u0631\u0627\u0642\u0628 \u0627\u0644\u0627\u0645\u062a\u062b\u0627\u0644 \u0644\u0645\u062a\u0637\u0644\u0628\u0627\u062a \u0627\u0644\u0623\u0645\u0646 \u0628\u0634\u0643\u0644 \u0645\u0633\u062a\u0645\u0631.",

    closing: "\u064a\u064f\u0639\u0627\u0645\u064e\u0644 \u0627\u0644\u0623\u0645\u0646 \u0628\u0627\u0639\u062a\u0628\u0627\u0631\u0647 \u0623\u0648\u0644\u0648\u064a\u0629 \u0628\u0646\u064a\u0629 \u062a\u062d\u062a\u064a\u0629 \u0623\u0633\u0627\u0633\u064a\u0629.",
    contact: "\u0644\u0627\u0633\u062a\u0641\u0633\u0627\u0631\u0627\u062a \u0627\u0644\u0623\u0645\u0646: security@auxite.com",
  },
  ru: {
    backToLegal: "\u2190 \u041d\u0430\u0437\u0430\u0434 \u043a \u043f\u0440\u0430\u0432\u043e\u0432\u044b\u043c \u0434\u043e\u043a\u0443\u043c\u0435\u043d\u0442\u0430\u043c",
    title: "\u0411\u0435\u0437\u043e\u043f\u0430\u0441\u043d\u043e\u0441\u0442\u044c \u0434\u0430\u043d\u043d\u044b\u0445",
    subtitle: "\u041c\u043d\u043e\u0433\u043e\u0443\u0440\u043e\u0432\u043d\u0435\u0432\u0430\u044f \u0430\u0440\u0445\u0438\u0442\u0435\u043a\u0442\u0443\u0440\u0430 \u0431\u0435\u0437\u043e\u043f\u0430\u0441\u043d\u043e\u0441\u0442\u0438 \u0434\u043b\u044f \u0437\u0430\u0449\u0438\u0442\u044b \u0434\u0430\u043d\u043d\u044b\u0445 \u043a\u043b\u0438\u0435\u043d\u0442\u043e\u0432 \u0438 \u043e\u043f\u0435\u0440\u0430\u0446\u0438\u043e\u043d\u043d\u044b\u0445 \u0441\u0438\u0441\u0442\u0435\u043c",
    effective: "\u0414\u0435\u0439\u0441\u0442\u0432\u0443\u0435\u0442 \u0441: \u0444\u0435\u0432\u0440\u0430\u043b\u044f 2025",

    h1: "\u041f\u0440\u0438\u043d\u0446\u0438\u043f\u044b \u0431\u0435\u0437\u043e\u043f\u0430\u0441\u043d\u043e\u0441\u0442\u0438",
    p1: "Auxite \u043f\u043e\u0434\u0434\u0435\u0440\u0436\u0438\u0432\u0430\u0435\u0442 \u043c\u043d\u043e\u0433\u043e\u0443\u0440\u043e\u0432\u043d\u0435\u0432\u0443\u044e \u0430\u0440\u0445\u0438\u0442\u0435\u043a\u0442\u0443\u0440\u0443 \u0431\u0435\u0437\u043e\u043f\u0430\u0441\u043d\u043e\u0441\u0442\u0438, \u043f\u0440\u0435\u0434\u043d\u0430\u0437\u043d\u0430\u0447\u0435\u043d\u043d\u0443\u044e \u0434\u043b\u044f \u0437\u0430\u0449\u0438\u0442\u044b \u0434\u0430\u043d\u043d\u044b\u0445 \u043a\u043b\u0438\u0435\u043d\u0442\u043e\u0432, \u0442\u0440\u0430\u043d\u0437\u0430\u043a\u0446\u0438\u043e\u043d\u043d\u044b\u0445 \u0437\u0430\u043f\u0438\u0441\u0435\u0439 \u0438 \u043e\u043f\u0435\u0440\u0430\u0446\u0438\u043e\u043d\u043d\u044b\u0445 \u0441\u0438\u0441\u0442\u0435\u043c. \u041f\u0440\u0438\u043d\u0446\u0438\u043f\u044b \u0431\u0435\u0437\u043e\u043f\u0430\u0441\u043d\u043e\u0441\u0442\u0438 \u0441\u043e\u0441\u0440\u0435\u0434\u043e\u0442\u043e\u0447\u0435\u043d\u044b \u043d\u0430:",
    p1_1: "\u041a\u043e\u043d\u0444\u0438\u0434\u0435\u043d\u0446\u0438\u0430\u043b\u044c\u043d\u043e\u0441\u0442\u044c",
    p1_2: "\u0426\u0435\u043b\u043e\u0441\u0442\u043d\u043e\u0441\u0442\u044c",
    p1_3: "\u0414\u043e\u0441\u0442\u0443\u043f\u043d\u043e\u0441\u0442\u044c",

    h2: "\u0417\u0430\u0449\u0438\u0442\u0430 \u0438\u043d\u0444\u0440\u0430\u0441\u0442\u0440\u0443\u043a\u0442\u0443\u0440\u044b",
    p2: "\u041c\u0435\u0440\u044b \u0431\u0435\u0437\u043e\u043f\u0430\u0441\u043d\u043e\u0441\u0442\u0438 \u0432\u043a\u043b\u044e\u0447\u0430\u044e\u0442:",
    p2_1: "\u0428\u0438\u0444\u0440\u043e\u0432\u0430\u043d\u0438\u0435 \u043f\u0440\u0438 \u043f\u0435\u0440\u0435\u0434\u0430\u0447\u0435 \u0438 \u0445\u0440\u0430\u043d\u0435\u043d\u0438\u0438",
    p2_2: "\u0423\u043a\u0440\u0435\u043f\u043b\u0451\u043d\u043d\u0430\u044f \u043e\u0431\u043b\u0430\u0447\u043d\u0430\u044f \u0430\u0440\u0445\u0438\u0442\u0435\u043a\u0442\u0443\u0440\u0430",
    p2_3: "\u041a\u043e\u043d\u0442\u0440\u043e\u043b\u044c \u0441\u0435\u0442\u0435\u0432\u043e\u0433\u043e \u0434\u043e\u0441\u0442\u0443\u043f\u0430",
    p2_4: "\u041d\u0435\u043f\u0440\u0435\u0440\u044b\u0432\u043d\u044b\u0439 \u043c\u043e\u043d\u0438\u0442\u043e\u0440\u0438\u043d\u0433",
    p2_5: "\u0417\u0430\u0449\u0438\u0442\u0430 \u043e\u0442 \u0440\u0430\u0441\u043f\u0440\u0435\u0434\u0435\u043b\u0451\u043d\u043d\u044b\u0445 \u0430\u0442\u0430\u043a \u0442\u0438\u043f\u0430 \u00ab\u043e\u0442\u043a\u0430\u0437 \u0432 \u043e\u0431\u0441\u043b\u0443\u0436\u0438\u0432\u0430\u043d\u0438\u0438\u00bb",

    h3: "\u041a\u043e\u043d\u0442\u0440\u043e\u043b\u044c \u0434\u043e\u0441\u0442\u0443\u043f\u0430",
    p3: "\u041a\u043e\u043d\u0444\u0438\u0434\u0435\u043d\u0446\u0438\u0430\u043b\u044c\u043d\u044b\u0435 \u0441\u0438\u0441\u0442\u0435\u043c\u044b \u0437\u0430\u0449\u0438\u0449\u0435\u043d\u044b \u0441 \u043f\u043e\u043c\u043e\u0449\u044c\u044e:",
    p3_1: "\u041c\u043d\u043e\u0433\u043e\u0444\u0430\u043a\u0442\u043e\u0440\u043d\u0430\u044f \u0430\u0443\u0442\u0435\u043d\u0442\u0438\u0444\u0438\u043a\u0430\u0446\u0438\u044f",
    p3_2: "\u0420\u043e\u043b\u0435\u0432\u044b\u0435 \u0440\u0430\u0437\u0440\u0435\u0448\u0435\u043d\u0438\u044f",
    p3_3: "\u041c\u043e\u0434\u0435\u043b\u044c \u0434\u043e\u0441\u0442\u0443\u043f\u0430 \u0441 \u043c\u0438\u043d\u0438\u043c\u0430\u043b\u044c\u043d\u044b\u043c\u0438 \u043f\u0440\u0438\u0432\u0438\u043b\u0435\u0433\u0438\u044f\u043c\u0438",
    p3_4: "\u041d\u0430\u0434\u0437\u043e\u0440 \u0438 \u0443\u043f\u0440\u0430\u0432\u043b\u0435\u043d\u0438\u0435 \u0441\u0435\u0441\u0441\u0438\u044f\u043c\u0438",

    h4: "\u041f\u0440\u0438\u043d\u0446\u0438\u043f\u044b \u0437\u0430\u0449\u0438\u0442\u044b \u0434\u0430\u043d\u043d\u044b\u0445",
    p4: "Auxite \u0441\u043b\u0435\u0434\u0443\u0435\u0442 \u043f\u0440\u0430\u043a\u0442\u0438\u043a\u0430\u043c \u043c\u0438\u043d\u0438\u043c\u0438\u0437\u0430\u0446\u0438\u0438 \u0434\u0430\u043d\u043d\u044b\u0445 \u0438 \u043e\u0431\u0440\u0430\u0431\u0430\u0442\u044b\u0432\u0430\u0435\u0442 \u0438\u043d\u0444\u043e\u0440\u043c\u0430\u0446\u0438\u044e \u0438\u0441\u043a\u043b\u044e\u0447\u0438\u0442\u0435\u043b\u044c\u043d\u043e \u0434\u043b\u044f \u0437\u0430\u043a\u043e\u043d\u043d\u044b\u0445 \u043e\u043f\u0435\u0440\u0430\u0446\u0438\u043e\u043d\u043d\u044b\u0445 \u0446\u0435\u043b\u0435\u0439. \u0413\u0434\u0435 \u044d\u0442\u043e \u043f\u0440\u0438\u043c\u0435\u043d\u0438\u043c\u043e, \u043f\u0440\u0430\u043a\u0442\u0438\u043a\u0438 \u0440\u0430\u0431\u043e\u0442\u044b \u0441 \u0434\u0430\u043d\u043d\u044b\u043c\u0438 \u0441\u043e\u043e\u0442\u0432\u0435\u0442\u0441\u0442\u0432\u0443\u044e\u0442 \u0432\u0441\u0435\u043c\u0438\u0440\u043d\u043e \u043f\u0440\u0438\u0437\u043d\u0430\u043d\u043d\u044b\u043c \u0441\u0442\u0430\u043d\u0434\u0430\u0440\u0442\u0430\u043c \u043a\u043e\u043d\u0444\u0438\u0434\u0435\u043d\u0446\u0438\u0430\u043b\u044c\u043d\u043e\u0441\u0442\u0438, \u0442\u0430\u043a\u0438\u043c \u043a\u0430\u043a \u043f\u0440\u0438\u043d\u0446\u0438\u043f\u044b GDPR.",

    h5: "\u0420\u0435\u0430\u0433\u0438\u0440\u043e\u0432\u0430\u043d\u0438\u0435 \u043d\u0430 \u0438\u043d\u0446\u0438\u0434\u0435\u043d\u0442\u044b",
    p5: "Auxite \u043f\u043e\u0434\u0434\u0435\u0440\u0436\u0438\u0432\u0430\u0435\u0442 \u0441\u0442\u0440\u0443\u043a\u0442\u0443\u0440\u0438\u0440\u043e\u0432\u0430\u043d\u043d\u044b\u0435 \u043f\u0440\u043e\u0446\u0435\u0434\u0443\u0440\u044b, \u043f\u0440\u0435\u0434\u043d\u0430\u0437\u043d\u0430\u0447\u0435\u043d\u043d\u044b\u0435 \u0434\u043b\u044f \u043e\u0431\u043d\u0430\u0440\u0443\u0436\u0435\u043d\u0438\u044f, \u043b\u043e\u043a\u0430\u043b\u0438\u0437\u0430\u0446\u0438\u0438 \u0438 \u0443\u0441\u0442\u0440\u0430\u043d\u0435\u043d\u0438\u044f \u0438\u043d\u0446\u0438\u0434\u0435\u043d\u0442\u043e\u0432 \u0431\u0435\u0437\u043e\u043f\u0430\u0441\u043d\u043e\u0441\u0442\u0438. \u041f\u0440\u043e\u0442\u043e\u043a\u043e\u043b\u044b \u0440\u0435\u0430\u0433\u0438\u0440\u043e\u0432\u0430\u043d\u0438\u044f \u0432\u043a\u043b\u044e\u0447\u0430\u044e\u0442 \u044d\u0442\u0430\u043f\u044b \u0438\u0434\u0435\u043d\u0442\u0438\u0444\u0438\u043a\u0430\u0446\u0438\u0438, \u043b\u043e\u043a\u0430\u043b\u0438\u0437\u0430\u0446\u0438\u0438, \u0443\u0441\u0442\u0440\u0430\u043d\u0435\u043d\u0438\u044f \u0438 \u0432\u043e\u0441\u0441\u0442\u0430\u043d\u043e\u0432\u043b\u0435\u043d\u0438\u044f.",

    h6: "\u0411\u0435\u0437\u043e\u043f\u0430\u0441\u043d\u043e\u0441\u0442\u044c \u0442\u0440\u0435\u0442\u044c\u0438\u0445 \u0441\u0442\u043e\u0440\u043e\u043d",
    p6: "\u041e\u0442\u043d\u043e\u0448\u0435\u043d\u0438\u044f \u0441 \u043f\u043e\u0441\u0442\u0430\u0432\u0449\u0438\u043a\u0430\u043c\u0438 \u0438 \u043f\u0430\u0440\u0442\u043d\u0451\u0440\u0430\u043c\u0438 \u043f\u043e\u0434\u043b\u0435\u0436\u0430\u0442 \u043e\u0446\u0435\u043d\u043a\u0435 \u0431\u0435\u0437\u043e\u043f\u0430\u0441\u043d\u043e\u0441\u0442\u0438. Auxite \u043e\u0446\u0435\u043d\u0438\u0432\u0430\u0435\u0442 \u0443\u0440\u043e\u0432\u0435\u043d\u044c \u0431\u0435\u0437\u043e\u043f\u0430\u0441\u043d\u043e\u0441\u0442\u0438 \u043f\u043e\u0441\u0442\u0430\u0432\u0449\u0438\u043a\u043e\u0432 \u0443\u0441\u043b\u0443\u0433 \u043f\u0435\u0440\u0435\u0434 \u0441\u043e\u0442\u0440\u0443\u0434\u043d\u0438\u0447\u0435\u0441\u0442\u0432\u043e\u043c \u0438 \u043e\u0441\u0443\u0449\u0435\u0441\u0442\u0432\u043b\u044f\u0435\u0442 \u043f\u043e\u0441\u0442\u043e\u044f\u043d\u043d\u044b\u0439 \u043c\u043e\u043d\u0438\u0442\u043e\u0440\u0438\u043d\u0433 \u0441\u043e\u0431\u043b\u044e\u0434\u0435\u043d\u0438\u044f \u0442\u0440\u0435\u0431\u043e\u0432\u0430\u043d\u0438\u0439 \u0431\u0435\u0437\u043e\u043f\u0430\u0441\u043d\u043e\u0441\u0442\u0438.",

    closing: "\u0411\u0435\u0437\u043e\u043f\u0430\u0441\u043d\u043e\u0441\u0442\u044c \u0440\u0430\u0441\u0441\u043c\u0430\u0442\u0440\u0438\u0432\u0430\u0435\u0442\u0441\u044f \u043a\u0430\u043a \u0444\u0443\u043d\u0434\u0430\u043c\u0435\u043d\u0442\u0430\u043b\u044c\u043d\u044b\u0439 \u043f\u0440\u0438\u043e\u0440\u0438\u0442\u0435\u0442 \u0438\u043d\u0444\u0440\u0430\u0441\u0442\u0440\u0443\u043a\u0442\u0443\u0440\u044b.",
    contact: "\u041f\u043e \u0432\u043e\u043f\u0440\u043e\u0441\u0430\u043c \u0431\u0435\u0437\u043e\u043f\u0430\u0441\u043d\u043e\u0441\u0442\u0438: security@auxite.com",
  },
};

export default function DataSecurityPage() {
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

            {/* 1. Security Principles */}
            <h2 className="text-xl font-bold text-slate-800 dark:text-white">{t.h1}</h2>
            <p>{t.p1}</p>
            <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-4 space-y-2">
              <p><span className="inline-block w-3 h-3 rounded-full bg-emerald-500 mr-2" />{t.p1_1}</p>
              <p><span className="inline-block w-3 h-3 rounded-full bg-amber-500 mr-2" />{t.p1_2}</p>
              <p><span className="inline-block w-3 h-3 rounded-full bg-blue-500 mr-2" />{t.p1_3}</p>
            </div>

            {/* 2. Infrastructure Protection */}
            <h2 className="text-xl font-bold text-slate-800 dark:text-white mt-8">{t.h2}</h2>
            <p>{t.p2}</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>{t.p2_1}</li>
              <li>{t.p2_2}</li>
              <li>{t.p2_3}</li>
              <li>{t.p2_4}</li>
              <li>{t.p2_5}</li>
            </ul>

            {/* 3. Access Control */}
            <h2 className="text-xl font-bold text-slate-800 dark:text-white mt-8">{t.h3}</h2>
            <p>{t.p3}</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>{t.p3_1}</li>
              <li>{t.p3_2}</li>
              <li>{t.p3_3}</li>
              <li>{t.p3_4}</li>
            </ul>

            {/* 4. Data Protection Principles */}
            <h2 className="text-xl font-bold text-slate-800 dark:text-white mt-8">{t.h4}</h2>
            <p>{t.p4}</p>

            {/* 5. Incident Response */}
            <h2 className="text-xl font-bold text-slate-800 dark:text-white mt-8">{t.h5}</h2>
            <p>{t.p5}</p>

            {/* 6. Third-Party Security */}
            <h2 className="text-xl font-bold text-slate-800 dark:text-white mt-8">{t.h6}</h2>
            <p>{t.p6}</p>

            {/* Closing */}
            <div className="bg-[#BFA181]/10 border border-[#BFA181]/30 rounded-lg p-4 mt-8">
              <p className="font-semibold text-slate-800 dark:text-white text-lg">{t.closing}</p>
            </div>

            <div className="mt-8 pt-8 border-t border-slate-200 dark:border-slate-700">
              <p className="mt-4 text-sm text-slate-500">{t.contact}</p>
            </div>
          </div>
        </article>
      </main>
    </div>
  );
}
