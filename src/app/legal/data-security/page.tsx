"use client";
import Link from "next/link";
import TopNav from "@/components/TopNav";
import ComplianceFooter from "@/components/ComplianceFooter";
import { useLanguage } from "@/components/LanguageContext";

const translations: Record<string, Record<string, string>> = {
  tr: {
    backToLegal: "\u2190 Yasal Belgelere D\u00f6n",
    title: "Veri G\u00fcvenli\u011fi",
    subtitle: "M\u00fc\u015fteri verilerini ve operasyonel sistemleri koruyan \u00e7ok katmanl\u0131 g\u00fcvenlik mimarisi.",
    effective: "Y\u00fcr\u00fcrl\u00fck: \u015eubat 2025",
    heading1: "1. Temel \u0130lkeler",
    para1: "Auxite veri g\u00fcvenli\u011fi \u00fc\u00e7 temel ilke \u00fczerine in\u015fa edilmi\u015ftir: Gizlilik, B\u00fct\u00fcnl\u00fck ve Eri\u015filebilirlik. Bu ilkeler, m\u00fc\u015fteri bilgilerinin ve operasyonel sistemlerin korunmas\u0131na y\u00f6nelik t\u00fcm politika ve kontrollerin temelini olu\u015fturur.",
    principle1: "Gizlilik",
    principle1Desc: "Bilgilere yaln\u0131zca me\u015fru operasyonel ihtiyac\u0131 olan yetkili taraflar\u0131n eri\u015fimi sa\u011flan\u0131r.",
    principle2: "B\u00fct\u00fcnl\u00fck",
    principle2Desc: "Veriler ya\u015fam d\u00f6ng\u00fcs\u00fc boyunca do\u011fru, tutarl\u0131 ve de\u011fi\u015ftirilmemi\u015f olarak korunur.",
    principle3: "Eri\u015filebilirlik",
    principle3Desc: "Sistemler ve veriler, yetkili kullan\u0131c\u0131lar i\u00e7in gerekti\u011finde g\u00fcvenilir \u015fekilde eri\u015filebilir durumda tutulur.",
    heading2: "2. Altyap\u0131 Korumas\u0131",
    para2: "Auxite, kurumsal d\u00fczeyde altyap\u0131 g\u00fcvenlik kontrolleri uygular. T\u00fcm m\u00fc\u015fteri verileri, iletim s\u0131ras\u0131nda TLS 1.2+ kullan\u0131larak ve depolamada AES-256 \u015fifreleme kullan\u0131larak korunur.",
    infra1: "\u0130letimde ve depolamada \u015fifreleme",
    infra1Desc: "T\u00fcm veri transferleri TLS 1.2 veya \u00fcst\u00fc ile \u015fifrelenir. Depolanan veriler AES-256 standartlar\u0131yla korunur.",
    infra2: "G\u00fc\u00e7lendirilmi\u015f bulut ortam\u0131",
    infra2Desc: "Altyap\u0131, end\u00fcstri g\u00fc\u00e7lendirme standartlar\u0131na g\u00f6re yap\u0131land\u0131r\u0131l\u0131r ve d\u00fczenli olarak denetlenir.",
    infra3: "A\u011f kontrolleri",
    infra3Desc: "Segmentasyon, g\u00fcvenlik duvarlar\u0131 ve izinsiz giri\u015f tespit sistemleri, yetkisiz eri\u015fim giri\u015fimlerini \u00f6nler.",
    infra4: "S\u00fcrekli izleme",
    infra4Desc: "Otomatik izleme sistemleri, anormallikleri ve potansiyel tehditleri ger\u00e7ek zamanl\u0131 olarak tespit eder.",
    heading3: "3. Eri\u015fim Kontrol\u00fc",
    para3: "T\u00fcm sistem eri\u015fimi, en az ayr\u0131cal\u0131k ilkesi uygulanarak kat\u0131 kimlik do\u011frulama ve yetkilendirme kontrolleri ile y\u00f6netilir.",
    access1: "\u00c7ok fakt\u00f6rl\u00fc kimlik do\u011frulama (MFA)",
    access1Desc: "T\u00fcm kullan\u0131c\u0131 ve y\u00f6netici eri\u015fimleri i\u00e7in \u00e7ok fakt\u00f6rl\u00fc kimlik do\u011frulama zorunludur.",
    access2: "Rol tabanl\u0131 izinler",
    access2Desc: "Eri\u015fim haklar\u0131, operasyonel sorumluluklar ve i\u015f gereksinimleri do\u011frultusunda atanm\u0131\u015f roller arac\u0131l\u0131\u011f\u0131yla verilir.",
    access3: "En az ayr\u0131cal\u0131k ilkesi",
    access3Desc: "Kullan\u0131c\u0131lara yaln\u0131zca atanm\u0131\u015f g\u00f6revlerini yerine getirmek i\u00e7in gereken minimum eri\u015fim d\u00fczeyi sa\u011flan\u0131r.",
    access4: "Oturum denetimi",
    access4Desc: "Aktif oturumlar izlenir, zaman a\u015f\u0131m\u0131 politikalar\u0131 uygulan\u0131r ve anormal oturum davran\u0131\u015flar\u0131 tespit edilir.",
    heading4: "4. Veri Koruma",
    para4: "Auxite, veri minimizasyonu ilkesini benimser ve ki\u015fisel verileri yaln\u0131zca me\u015fru operasyonel ama\u00e7lar do\u011frultusunda toplar ve i\u015fler. Veri koruma uygulamalar\u0131m\u0131z GDPR ilkeleriyle uyumludur.",
    data1: "Veri minimizasyonu",
    data1Desc: "Yaln\u0131zca tan\u0131mlanm\u0131\u015f operasyonel ama\u00e7lar i\u00e7in gerekli olan veriler toplan\u0131r ve saklan\u0131r.",
    data2: "Me\u015fru operasyonel ama\u00e7lar",
    data2Desc: "Veri i\u015fleme, yasal uyumluluk, hesap y\u00f6netimi ve platform hizmetlerinin sunumu gibi a\u00e7\u0131k\u00e7a tan\u0131mlanm\u0131\u015f gerek\u00e7elere dayanarak ger\u00e7ekle\u015ftirilir.",
    data3: "GDPR uyumu",
    data3Desc: "Veri koruma uygulamalar\u0131, Genel Veri Koruma Y\u00f6netmeli\u011fi ilkeleri ve ge\u00e7erli veri koruma d\u00fczenlemeleriyle uyumludur.",
    heading5: "5. Olay M\u00fcdahale",
    para5: "Auxite, g\u00fcvenlik olaylar\u0131n\u0131 ele almak i\u00e7in yap\u0131land\u0131r\u0131lm\u0131\u015f olay m\u00fcdahale prosed\u00fcrleri uygular. Yakla\u015f\u0131m\u0131m\u0131z \u00fc\u00e7 temel a\u015famay\u0131 kapsar.",
    incident1: "Tespit",
    incident1Desc: "Otomatik izleme ve uyar\u0131 sistemleri, potansiyel g\u00fcvenlik olaylar\u0131n\u0131 m\u00fcmk\u00fcn olan en k\u0131sa s\u00fcrede tespit eder.",
    incident2: "S\u0131n\u0131rland\u0131rma",
    incident2Desc: "Tespit edilen tehditler, etkilenen sistemlerin izole edilmesi ve daha fazla eri\u015fimin \u00f6nlenmesi yoluyla s\u0131n\u0131rland\u0131r\u0131l\u0131r.",
    incident3: "\u0130yile\u015ftirme",
    incident3Desc: "Etkilenen sistemler g\u00fcvenli duruma geri getirilir, temel neden analizi yap\u0131l\u0131r ve tekrar\u0131n\u0131 \u00f6nlemek i\u00e7in \u00f6nlemler uygulan\u0131r.",
    closing: "G\u00fcvenlik, temel bir altyap\u0131 \u00f6nceli\u011fi olarak ele al\u0131nmaktad\u0131r.",
  },
  en: {
    backToLegal: "\u2190 Back to Legal",
    title: "Data Security",
    subtitle: "Multi-layered security architecture protecting client data and operational systems.",
    effective: "Effective: February 2025",
    heading1: "1. Core Principles",
    para1: "Auxite data security is built upon three foundational principles: Confidentiality, Integrity, and Availability. These principles underpin all policies and controls governing the protection of client information and operational systems.",
    principle1: "Confidentiality",
    principle1Desc: "Information is accessible only to authorized parties with a legitimate operational need.",
    principle2: "Integrity",
    principle2Desc: "Data is maintained as accurate, consistent, and unaltered throughout its lifecycle.",
    principle3: "Availability",
    principle3Desc: "Systems and data remain reliably accessible to authorized users when required.",
    heading2: "2. Infrastructure Protection",
    para2: "Auxite implements enterprise-grade infrastructure security controls. All client data is protected using TLS 1.2+ in transit and AES-256 encryption at rest.",
    infra1: "Encryption in transit and at rest",
    infra1Desc: "All data transfers are encrypted via TLS 1.2 or above. Stored data is protected to AES-256 standards.",
    infra2: "Hardened cloud environment",
    infra2Desc: "Infrastructure is configured according to industry hardening benchmarks and audited on a regular basis.",
    infra3: "Network controls",
    infra3Desc: "Segmentation, firewalls, and intrusion detection systems prevent unauthorized access attempts.",
    infra4: "Continuous monitoring",
    infra4Desc: "Automated monitoring systems detect anomalies and potential threats in real time.",
    heading3: "3. Access Control",
    para3: "All system access is governed by strict authentication and authorization controls with enforcement of the principle of least privilege.",
    access1: "Multi-factor authentication (MFA)",
    access1Desc: "Multi-factor authentication is mandatory for all user and administrative access.",
    access2: "Role-based permissions",
    access2Desc: "Access rights are granted through assigned roles aligned to operational responsibilities and business requirements.",
    access3: "Least-privilege principle",
    access3Desc: "Users are provisioned with the minimum level of access necessary to perform their assigned functions.",
    access4: "Session oversight",
    access4Desc: "Active sessions are monitored, timeout policies are enforced, and anomalous session behavior is detected.",
    heading4: "4. Data Protection",
    para4: "Auxite adheres to the principle of data minimization and collects and processes personal data only for legitimate operational purposes. Our data protection practices are aligned with GDPR principles.",
    data1: "Data minimization",
    data1Desc: "Only data necessary for defined operational purposes is collected and retained.",
    data2: "Legitimate operational purposes",
    data2Desc: "Data processing is conducted on the basis of clearly defined justifications including regulatory compliance, account administration, and delivery of platform services.",
    data3: "GDPR alignment",
    data3Desc: "Data protection practices are aligned with General Data Protection Regulation principles and applicable data protection regulations.",
    heading5: "5. Incident Response",
    para5: "Auxite maintains structured incident response procedures for addressing security events. Our approach encompasses three core phases.",
    incident1: "Detect",
    incident1Desc: "Automated monitoring and alerting systems identify potential security incidents at the earliest opportunity.",
    incident2: "Contain",
    incident2Desc: "Identified threats are contained through isolation of affected systems and prevention of further access.",
    incident3: "Remediate",
    incident3Desc: "Affected systems are restored to a secure state, root cause analysis is performed, and measures are implemented to prevent recurrence.",
    closing: "Security is treated as a foundational infrastructure priority.",
  },
  de: {
    backToLegal: "\u2190 Zur\u00fcck zu Rechtliches",
    title: "Datensicherheit",
    subtitle: "Mehrschichtige Sicherheitsarchitektur zum Schutz von Kundendaten und Betriebssystemen.",
    effective: "G\u00fcltig ab: Februar 2025",
    heading1: "1. Grundprinzipien",
    para1: "Die Datensicherheit von Auxite basiert auf drei grundlegenden Prinzipien: Vertraulichkeit, Integrit\u00e4t und Verf\u00fcgbarkeit. Diese Prinzipien bilden die Grundlage aller Richtlinien und Kontrollen zum Schutz von Kundeninformationen und Betriebssystemen.",
    principle1: "Vertraulichkeit",
    principle1Desc: "Informationen sind nur autorisierten Parteien mit einem berechtigten betrieblichen Bedarf zug\u00e4nglich.",
    principle2: "Integrit\u00e4t",
    principle2Desc: "Daten werden w\u00e4hrend ihres gesamten Lebenszyklus als genau, konsistent und unver\u00e4ndert gepflegt.",
    principle3: "Verf\u00fcgbarkeit",
    principle3Desc: "Systeme und Daten bleiben f\u00fcr autorisierte Benutzer bei Bedarf zuverl\u00e4ssig zug\u00e4nglich.",
    heading2: "2. Infrastrukturschutz",
    para2: "Auxite implementiert Sicherheitskontrollen auf Unternehmensebene. Alle Kundendaten werden bei der \u00dcbertragung mit TLS 1.2+ und bei der Speicherung mit AES-256-Verschl\u00fcsselung gesch\u00fctzt.",
    infra1: "Verschl\u00fcsselung bei \u00dcbertragung und Speicherung",
    infra1Desc: "Alle Daten\u00fcbertragungen werden \u00fcber TLS 1.2 oder h\u00f6her verschl\u00fcsselt. Gespeicherte Daten werden nach AES-256-Standards gesch\u00fctzt.",
    infra2: "Geh\u00e4rtete Cloud-Umgebung",
    infra2Desc: "Die Infrastruktur wird gem\u00e4\u00df Branchen-H\u00e4rtungsstandards konfiguriert und regelm\u00e4\u00dfig \u00fcberpr\u00fcft.",
    infra3: "Netzwerkkontrollen",
    infra3Desc: "Segmentierung, Firewalls und Intrusion-Detection-Systeme verhindern unbefugte Zugriffsversuche.",
    infra4: "Kontinuierliche \u00dcberwachung",
    infra4Desc: "Automatisierte \u00dcberwachungssysteme erkennen Anomalien und potenzielle Bedrohungen in Echtzeit.",
    heading3: "3. Zugriffskontrolle",
    para3: "Jeder Systemzugriff unterliegt strengen Authentifizierungs- und Autorisierungskontrollen unter Durchsetzung des Prinzips der geringsten Berechtigung.",
    access1: "Multi-Faktor-Authentifizierung (MFA)",
    access1Desc: "Multi-Faktor-Authentifizierung ist f\u00fcr alle Benutzer- und Administratorzugriffe obligatorisch.",
    access2: "Rollenbasierte Berechtigungen",
    access2Desc: "Zugriffsrechte werden \u00fcber zugewiesene Rollen gew\u00e4hrt, die auf betriebliche Verantwortlichkeiten und Gesch\u00e4ftsanforderungen abgestimmt sind.",
    access3: "Prinzip der geringsten Berechtigung",
    access3Desc: "Benutzern wird nur das Mindestzugriffsniveau gew\u00e4hrt, das zur Erf\u00fcllung ihrer zugewiesenen Aufgaben erforderlich ist.",
    access4: "Sitzungs\u00fcberwachung",
    access4Desc: "Aktive Sitzungen werden \u00fcberwacht, Timeout-Richtlinien werden durchgesetzt und anomales Sitzungsverhalten wird erkannt.",
    heading4: "4. Datenschutz",
    para4: "Auxite befolgt das Prinzip der Datenminimierung und erhebt und verarbeitet personenbezogene Daten ausschlie\u00dflich f\u00fcr legitime betriebliche Zwecke. Unsere Datenschutzpraktiken sind an den DSGVO-Grunds\u00e4tzen ausgerichtet.",
    data1: "Datenminimierung",
    data1Desc: "Es werden nur Daten erhoben und gespeichert, die f\u00fcr definierte betriebliche Zwecke erforderlich sind.",
    data2: "Legitime betriebliche Zwecke",
    data2Desc: "Die Datenverarbeitung erfolgt auf der Grundlage klar definierter Begr\u00fcndungen, einschlie\u00dflich regulatorischer Compliance, Kontoverwaltung und Bereitstellung von Plattformdiensten.",
    data3: "DSGVO-Konformit\u00e4t",
    data3Desc: "Die Datenschutzpraktiken sind an den Grunds\u00e4tzen der Datenschutz-Grundverordnung und den geltenden Datenschutzvorschriften ausgerichtet.",
    heading5: "5. Reaktion auf Vorf\u00e4lle",
    para5: "Auxite unterh\u00e4lt strukturierte Verfahren zur Reaktion auf Sicherheitsvorf\u00e4lle. Unser Ansatz umfasst drei Kernphasen.",
    incident1: "Erkennung",
    incident1Desc: "Automatisierte \u00dcberwachungs- und Warnsysteme identifizieren potenzielle Sicherheitsvorf\u00e4lle zum fr\u00fchestm\u00f6glichen Zeitpunkt.",
    incident2: "Eind\u00e4mmung",
    incident2Desc: "Identifizierte Bedrohungen werden durch Isolierung betroffener Systeme und Verhinderung weiterer Zugriffe einged\u00e4mmt.",
    incident3: "Behebung",
    incident3Desc: "Betroffene Systeme werden in einen sicheren Zustand zur\u00fcckversetzt, eine Ursachenanalyse wird durchgef\u00fchrt und Ma\u00dfnahmen zur Verhinderung eines erneuten Auftretens werden implementiert.",
    closing: "Sicherheit wird als grundlegende Infrastrukturpriorit\u00e4t behandelt.",
  },
  fr: {
    backToLegal: "\u2190 Retour aux documents l\u00e9gaux",
    title: "S\u00e9curit\u00e9 des Donn\u00e9es",
    subtitle: "Architecture de s\u00e9curit\u00e9 multicouche prot\u00e9geant les donn\u00e9es clients et les syst\u00e8mes op\u00e9rationnels.",
    effective: "En vigueur : f\u00e9vrier 2025",
    heading1: "1. Principes Fondamentaux",
    para1: "La s\u00e9curit\u00e9 des donn\u00e9es d\u2019Auxite repose sur trois principes fondamentaux : Confidentialit\u00e9, Int\u00e9grit\u00e9 et Disponibilit\u00e9. Ces principes sous-tendent toutes les politiques et contr\u00f4les r\u00e9gissant la protection des informations clients et des syst\u00e8mes op\u00e9rationnels.",
    principle1: "Confidentialit\u00e9",
    principle1Desc: "Les informations ne sont accessibles qu\u2019aux parties autoris\u00e9es ayant un besoin op\u00e9rationnel l\u00e9gitime.",
    principle2: "Int\u00e9grit\u00e9",
    principle2Desc: "Les donn\u00e9es sont maintenues exactes, coh\u00e9rentes et non alt\u00e9r\u00e9es tout au long de leur cycle de vie.",
    principle3: "Disponibilit\u00e9",
    principle3Desc: "Les syst\u00e8mes et les donn\u00e9es restent accessibles de mani\u00e8re fiable aux utilisateurs autoris\u00e9s lorsque n\u00e9cessaire.",
    heading2: "2. Protection de l\u2019Infrastructure",
    para2: "Auxite met en \u0153uvre des contr\u00f4les de s\u00e9curit\u00e9 d\u2019infrastructure de niveau entreprise. Toutes les donn\u00e9es clients sont prot\u00e9g\u00e9es par TLS 1.2+ en transit et par chiffrement AES-256 au repos.",
    infra1: "Chiffrement en transit et au repos",
    infra1Desc: "Tous les transferts de donn\u00e9es sont chiffr\u00e9s via TLS 1.2 ou sup\u00e9rieur. Les donn\u00e9es stock\u00e9es sont prot\u00e9g\u00e9es selon les normes AES-256.",
    infra2: "Environnement cloud renforc\u00e9",
    infra2Desc: "L\u2019infrastructure est configur\u00e9e selon les r\u00e9f\u00e9rentiels de renforcement industriels et audit\u00e9e r\u00e9guli\u00e8rement.",
    infra3: "Contr\u00f4les r\u00e9seau",
    infra3Desc: "La segmentation, les pare-feu et les syst\u00e8mes de d\u00e9tection d\u2019intrusion emp\u00eachent les tentatives d\u2019acc\u00e8s non autoris\u00e9.",
    infra4: "Surveillance continue",
    infra4Desc: "Les syst\u00e8mes de surveillance automatis\u00e9s d\u00e9tectent les anomalies et les menaces potentielles en temps r\u00e9el.",
    heading3: "3. Contr\u00f4le d\u2019Acc\u00e8s",
    para3: "Tout acc\u00e8s au syst\u00e8me est r\u00e9gi par des contr\u00f4les stricts d\u2019authentification et d\u2019autorisation avec application du principe du moindre privil\u00e8ge.",
    access1: "Authentification multi-facteurs (MFA)",
    access1Desc: "L\u2019authentification multi-facteurs est obligatoire pour tous les acc\u00e8s utilisateurs et administratifs.",
    access2: "Autorisations bas\u00e9es sur les r\u00f4les",
    access2Desc: "Les droits d\u2019acc\u00e8s sont accord\u00e9s via des r\u00f4les assign\u00e9s align\u00e9s sur les responsabilit\u00e9s op\u00e9rationnelles et les exigences m\u00e9tier.",
    access3: "Principe du moindre privil\u00e8ge",
    access3Desc: "Les utilisateurs ne disposent que du niveau d\u2019acc\u00e8s minimum n\u00e9cessaire \u00e0 l\u2019ex\u00e9cution de leurs fonctions assign\u00e9es.",
    access4: "Supervision des sessions",
    access4Desc: "Les sessions actives sont surveill\u00e9es, les politiques d\u2019expiration sont appliqu\u00e9es et les comportements de session anormaux sont d\u00e9tect\u00e9s.",
    heading4: "4. Protection des Donn\u00e9es",
    para4: "Auxite adh\u00e8re au principe de minimisation des donn\u00e9es et ne collecte et traite les donn\u00e9es personnelles qu\u2019\u00e0 des fins op\u00e9rationnelles l\u00e9gitimes. Nos pratiques de protection des donn\u00e9es sont align\u00e9es sur les principes du RGPD.",
    data1: "Minimisation des donn\u00e9es",
    data1Desc: "Seules les donn\u00e9es n\u00e9cessaires aux objectifs op\u00e9rationnels d\u00e9finis sont collect\u00e9es et conserv\u00e9es.",
    data2: "Finalit\u00e9s op\u00e9rationnelles l\u00e9gitimes",
    data2Desc: "Le traitement des donn\u00e9es est effectu\u00e9 sur la base de justifications clairement d\u00e9finies, notamment la conformit\u00e9 r\u00e9glementaire, la gestion des comptes et la fourniture des services de la plateforme.",
    data3: "Conformit\u00e9 RGPD",
    data3Desc: "Les pratiques de protection des donn\u00e9es sont align\u00e9es sur les principes du R\u00e8glement G\u00e9n\u00e9ral sur la Protection des Donn\u00e9es et les r\u00e9glementations applicables en mati\u00e8re de protection des donn\u00e9es.",
    heading5: "5. R\u00e9ponse aux Incidents",
    para5: "Auxite maintient des proc\u00e9dures structur\u00e9es de r\u00e9ponse aux incidents pour traiter les \u00e9v\u00e9nements de s\u00e9curit\u00e9. Notre approche comprend trois phases principales.",
    incident1: "D\u00e9tection",
    incident1Desc: "Les syst\u00e8mes automatis\u00e9s de surveillance et d\u2019alerte identifient les incidents de s\u00e9curit\u00e9 potentiels dans les meilleurs d\u00e9lais.",
    incident2: "Confinement",
    incident2Desc: "Les menaces identifi\u00e9es sont contenues par l\u2019isolation des syst\u00e8mes affect\u00e9s et la pr\u00e9vention de tout acc\u00e8s suppl\u00e9mentaire.",
    incident3: "Rem\u00e9diation",
    incident3Desc: "Les syst\u00e8mes affect\u00e9s sont restaur\u00e9s dans un \u00e9tat s\u00e9curis\u00e9, une analyse des causes profondes est effectu\u00e9e et des mesures sont mises en \u0153uvre pour pr\u00e9venir toute r\u00e9currence.",
    closing: "La s\u00e9curit\u00e9 est trait\u00e9e comme une priorit\u00e9 fondamentale d\u2019infrastructure.",
  },
  ar: {
    backToLegal: "\u2190 \u0627\u0644\u0639\u0648\u062f\u0629 \u0625\u0644\u0649 \u0627\u0644\u0648\u062b\u0627\u0626\u0642 \u0627\u0644\u0642\u0627\u0646\u0648\u0646\u064a\u0629",
    title: "\u0623\u0645\u0646 \u0627\u0644\u0628\u064a\u0627\u0646\u0627\u062a",
    subtitle: "\u0628\u0646\u064a\u0629 \u0623\u0645\u0646\u064a\u0629 \u0645\u062a\u0639\u062f\u062f\u0629 \u0627\u0644\u0637\u0628\u0642\u0627\u062a \u0644\u062d\u0645\u0627\u064a\u0629 \u0628\u064a\u0627\u0646\u0627\u062a \u0627\u0644\u0639\u0645\u0644\u0627\u0621 \u0648\u0627\u0644\u0623\u0646\u0638\u0645\u0629 \u0627\u0644\u062a\u0634\u063a\u064a\u0644\u064a\u0629.",
    effective: "\u0633\u0627\u0631\u064a \u0627\u0644\u0645\u0641\u0639\u0648\u0644: \u0641\u0628\u0631\u0627\u064a\u0631 2025",
    heading1: "1. \u0627\u0644\u0645\u0628\u0627\u062f\u0626 \u0627\u0644\u0623\u0633\u0627\u0633\u064a\u0629",
    para1: "\u064a\u0642\u0648\u0645 \u0623\u0645\u0646 \u0628\u064a\u0627\u0646\u0627\u062a \u0623\u0648\u0643\u0633\u0627\u064a\u062a \u0639\u0644\u0649 \u062b\u0644\u0627\u062b\u0629 \u0645\u0628\u0627\u062f\u0626 \u062a\u0623\u0633\u064a\u0633\u064a\u0629: \u0627\u0644\u0633\u0631\u064a\u0629 \u0648\u0627\u0644\u0646\u0632\u0627\u0647\u0629 \u0648\u0627\u0644\u062a\u0648\u0627\u0641\u0631. \u062a\u0634\u0643\u0644 \u0647\u0630\u0647 \u0627\u0644\u0645\u0628\u0627\u062f\u0626 \u0623\u0633\u0627\u0633 \u062c\u0645\u064a\u0639 \u0627\u0644\u0633\u064a\u0627\u0633\u0627\u062a \u0648\u0627\u0644\u0636\u0648\u0627\u0628\u0637 \u0627\u0644\u062a\u064a \u062a\u062d\u0643\u0645 \u062d\u0645\u0627\u064a\u0629 \u0645\u0639\u0644\u0648\u0645\u0627\u062a \u0627\u0644\u0639\u0645\u0644\u0627\u0621 \u0648\u0627\u0644\u0623\u0646\u0638\u0645\u0629 \u0627\u0644\u062a\u0634\u063a\u064a\u0644\u064a\u0629.",
    principle1: "\u0627\u0644\u0633\u0631\u064a\u0629",
    principle1Desc: "\u0644\u0627 \u064a\u0645\u0643\u0646 \u0627\u0644\u0648\u0635\u0648\u0644 \u0625\u0644\u0649 \u0627\u0644\u0645\u0639\u0644\u0648\u0645\u0627\u062a \u0625\u0644\u0627 \u0644\u0644\u0623\u0637\u0631\u0627\u0641 \u0627\u0644\u0645\u0635\u0631\u062d \u0644\u0647\u0627 \u0630\u0627\u062a \u0627\u0644\u062d\u0627\u062c\u0629 \u0627\u0644\u062a\u0634\u063a\u064a\u0644\u064a\u0629 \u0627\u0644\u0645\u0634\u0631\u0648\u0639\u0629.",
    principle2: "\u0627\u0644\u0646\u0632\u0627\u0647\u0629",
    principle2Desc: "\u064a\u062a\u0645 \u0627\u0644\u062d\u0641\u0627\u0638 \u0639\u0644\u0649 \u0627\u0644\u0628\u064a\u0627\u0646\u0627\u062a \u062f\u0642\u064a\u0642\u0629 \u0648\u0645\u062a\u0633\u0642\u0629 \u0648\u063a\u064a\u0631 \u0645\u0639\u062f\u0644\u0629 \u0637\u0648\u0627\u0644 \u062f\u0648\u0631\u0629 \u062d\u064a\u0627\u062a\u0647\u0627.",
    principle3: "\u0627\u0644\u062a\u0648\u0627\u0641\u0631",
    principle3Desc: "\u062a\u0628\u0642\u0649 \u0627\u0644\u0623\u0646\u0638\u0645\u0629 \u0648\u0627\u0644\u0628\u064a\u0627\u0646\u0627\u062a \u0645\u062a\u0627\u062d\u0629 \u0628\u0634\u0643\u0644 \u0645\u0648\u062b\u0648\u0642 \u0644\u0644\u0645\u0633\u062a\u062e\u062f\u0645\u064a\u0646 \u0627\u0644\u0645\u0635\u0631\u062d \u0644\u0647\u0645 \u0639\u0646\u062f \u0627\u0644\u062d\u0627\u062c\u0629.",
    heading2: "2. \u062d\u0645\u0627\u064a\u0629 \u0627\u0644\u0628\u0646\u064a\u0629 \u0627\u0644\u062a\u062d\u062a\u064a\u0629",
    para2: "\u062a\u0637\u0628\u0642 \u0623\u0648\u0643\u0633\u0627\u064a\u062a \u0636\u0648\u0627\u0628\u0637 \u0623\u0645\u0646 \u0628\u0646\u064a\u0629 \u062a\u062d\u062a\u064a\u0629 \u0628\u0645\u0633\u062a\u0648\u0649 \u0645\u0624\u0633\u0633\u064a. \u062c\u0645\u064a\u0639 \u0628\u064a\u0627\u0646\u0627\u062a \u0627\u0644\u0639\u0645\u0644\u0627\u0621 \u0645\u062d\u0645\u064a\u0629 \u0628\u0627\u0633\u062a\u062e\u062f\u0627\u0645 TLS 1.2+ \u0623\u062b\u0646\u0627\u0621 \u0627\u0644\u0646\u0642\u0644 \u0648\u062a\u0634\u0641\u064a\u0631 AES-256 \u0623\u062b\u0646\u0627\u0621 \u0627\u0644\u062a\u062e\u0632\u064a\u0646.",
    infra1: "\u0627\u0644\u062a\u0634\u0641\u064a\u0631 \u0623\u062b\u0646\u0627\u0621 \u0627\u0644\u0646\u0642\u0644 \u0648\u0627\u0644\u062a\u062e\u0632\u064a\u0646",
    infra1Desc: "\u062c\u0645\u064a\u0639 \u0639\u0645\u0644\u064a\u0627\u062a \u0646\u0642\u0644 \u0627\u0644\u0628\u064a\u0627\u0646\u0627\u062a \u0645\u0634\u0641\u0631\u0629 \u0639\u0628\u0631 TLS 1.2 \u0623\u0648 \u0623\u0639\u0644\u0649. \u0627\u0644\u0628\u064a\u0627\u0646\u0627\u062a \u0627\u0644\u0645\u062e\u0632\u0646\u0629 \u0645\u062d\u0645\u064a\u0629 \u0628\u0645\u0639\u0627\u064a\u064a\u0631 AES-256.",
    infra2: "\u0628\u064a\u0626\u0629 \u0633\u062d\u0627\u0628\u064a\u0629 \u0645\u0639\u0632\u0632\u0629",
    infra2Desc: "\u064a\u062a\u0645 \u062a\u0643\u0648\u064a\u0646 \u0627\u0644\u0628\u0646\u064a\u0629 \u0627\u0644\u062a\u062d\u062a\u064a\u0629 \u0648\u0641\u0642\u064b\u0627 \u0644\u0645\u0639\u0627\u064a\u064a\u0631 \u0627\u0644\u062a\u0639\u0632\u064a\u0632 \u0627\u0644\u0635\u0646\u0627\u0639\u064a\u0629 \u0648\u064a\u062a\u0645 \u062a\u062f\u0642\u064a\u0642\u0647\u0627 \u0628\u0627\u0646\u062a\u0638\u0627\u0645.",
    infra3: "\u0636\u0648\u0627\u0628\u0637 \u0627\u0644\u0634\u0628\u0643\u0629",
    infra3Desc: "\u062a\u0645\u0646\u0639 \u0627\u0644\u062a\u062c\u0632\u0626\u0629 \u0648\u062c\u062f\u0631\u0627\u0646 \u0627\u0644\u062d\u0645\u0627\u064a\u0629 \u0648\u0623\u0646\u0638\u0645\u0629 \u0643\u0634\u0641 \u0627\u0644\u062a\u0633\u0644\u0644 \u0645\u062d\u0627\u0648\u0644\u0627\u062a \u0627\u0644\u0648\u0635\u0648\u0644 \u063a\u064a\u0631 \u0627\u0644\u0645\u0635\u0631\u062d \u0628\u0647\u0627.",
    infra4: "\u0627\u0644\u0645\u0631\u0627\u0642\u0628\u0629 \u0627\u0644\u0645\u0633\u062a\u0645\u0631\u0629",
    infra4Desc: "\u062a\u0643\u062a\u0634\u0641 \u0623\u0646\u0638\u0645\u0629 \u0627\u0644\u0645\u0631\u0627\u0642\u0628\u0629 \u0627\u0644\u0622\u0644\u064a\u0629 \u0627\u0644\u0634\u0630\u0648\u0630 \u0648\u0627\u0644\u062a\u0647\u062f\u064a\u062f\u0627\u062a \u0627\u0644\u0645\u062d\u062a\u0645\u0644\u0629 \u0641\u064a \u0627\u0644\u0648\u0642\u062a \u0627\u0644\u0641\u0639\u0644\u064a.",
    heading3: "3. \u0627\u0644\u062a\u062d\u0643\u0645 \u0641\u064a \u0627\u0644\u0648\u0635\u0648\u0644",
    para3: "\u064a\u062e\u0636\u0639 \u062c\u0645\u064a\u0639 \u0627\u0644\u0648\u0635\u0648\u0644 \u0625\u0644\u0649 \u0627\u0644\u0623\u0646\u0638\u0645\u0629 \u0644\u0636\u0648\u0627\u0628\u0637 \u0645\u0635\u0627\u062f\u0642\u0629 \u0648\u062a\u0641\u0648\u064a\u0636 \u0635\u0627\u0631\u0645\u0629 \u0645\u0639 \u062a\u0637\u0628\u064a\u0642 \u0645\u0628\u062f\u0623 \u0627\u0644\u062d\u062f \u0627\u0644\u0623\u062f\u0646\u0649 \u0645\u0646 \u0627\u0644\u0635\u0644\u0627\u062d\u064a\u0627\u062a.",
    access1: "\u0627\u0644\u0645\u0635\u0627\u062f\u0642\u0629 \u0645\u062a\u0639\u062f\u062f\u0629 \u0627\u0644\u0639\u0648\u0627\u0645\u0644 (MFA)",
    access1Desc: "\u0627\u0644\u0645\u0635\u0627\u062f\u0642\u0629 \u0645\u062a\u0639\u062f\u062f\u0629 \u0627\u0644\u0639\u0648\u0627\u0645\u0644 \u0625\u0644\u0632\u0627\u0645\u064a\u0629 \u0644\u062c\u0645\u064a\u0639 \u0639\u0645\u0644\u064a\u0627\u062a \u0648\u0635\u0648\u0644 \u0627\u0644\u0645\u0633\u062a\u062e\u062f\u0645\u064a\u0646 \u0648\u0627\u0644\u0645\u0633\u0624\u0648\u0644\u064a\u0646.",
    access2: "\u0627\u0644\u0623\u0630\u0648\u0646\u0627\u062a \u0627\u0644\u0642\u0627\u0626\u0645\u0629 \u0639\u0644\u0649 \u0627\u0644\u0623\u062f\u0648\u0627\u0631",
    access2Desc: "\u062a\u064f\u0645\u0646\u062d \u062d\u0642\u0648\u0642 \u0627\u0644\u0648\u0635\u0648\u0644 \u0645\u0646 \u062e\u0644\u0627\u0644 \u0623\u062f\u0648\u0627\u0631 \u0645\u0639\u064a\u0646\u0629 \u062a\u062a\u0648\u0627\u0641\u0642 \u0645\u0639 \u0627\u0644\u0645\u0633\u0624\u0648\u0644\u064a\u0627\u062a \u0627\u0644\u062a\u0634\u063a\u064a\u0644\u064a\u0629 \u0648\u0645\u062a\u0637\u0644\u0628\u0627\u062a \u0627\u0644\u0639\u0645\u0644.",
    access3: "\u0645\u0628\u062f\u0623 \u0627\u0644\u062d\u062f \u0627\u0644\u0623\u062f\u0646\u0649 \u0645\u0646 \u0627\u0644\u0635\u0644\u0627\u062d\u064a\u0627\u062a",
    access3Desc: "\u064a\u062a\u0645 \u0645\u0646\u062d \u0627\u0644\u0645\u0633\u062a\u062e\u062f\u0645\u064a\u0646 \u0627\u0644\u062d\u062f \u0627\u0644\u0623\u062f\u0646\u0649 \u0645\u0646 \u0645\u0633\u062a\u0648\u0649 \u0627\u0644\u0648\u0635\u0648\u0644 \u0627\u0644\u0644\u0627\u0632\u0645 \u0644\u0623\u062f\u0627\u0621 \u0648\u0638\u0627\u0626\u0641\u0647\u0645 \u0627\u0644\u0645\u062d\u062f\u062f\u0629.",
    access4: "\u0625\u0634\u0631\u0627\u0641 \u0627\u0644\u062c\u0644\u0633\u0627\u062a",
    access4Desc: "\u062a\u062a\u0645 \u0645\u0631\u0627\u0642\u0628\u0629 \u0627\u0644\u062c\u0644\u0633\u0627\u062a \u0627\u0644\u0646\u0634\u0637\u0629 \u0648\u062a\u0637\u0628\u064a\u0642 \u0633\u064a\u0627\u0633\u0627\u062a \u0627\u0646\u062a\u0647\u0627\u0621 \u0627\u0644\u0645\u0647\u0644\u0629 \u0648\u0643\u0634\u0641 \u0633\u0644\u0648\u0643 \u0627\u0644\u062c\u0644\u0633\u0627\u062a \u063a\u064a\u0631 \u0627\u0644\u0637\u0628\u064a\u0639\u064a.",
    heading4: "4. \u062d\u0645\u0627\u064a\u0629 \u0627\u0644\u0628\u064a\u0627\u0646\u0627\u062a",
    para4: "\u062a\u0644\u062a\u0632\u0645 \u0623\u0648\u0643\u0633\u0627\u064a\u062a \u0628\u0645\u0628\u062f\u0623 \u062a\u0642\u0644\u064a\u0644 \u0627\u0644\u0628\u064a\u0627\u0646\u0627\u062a \u0648\u062a\u062c\u0645\u0639 \u0648\u062a\u0639\u0627\u0644\u062c \u0627\u0644\u0628\u064a\u0627\u0646\u0627\u062a \u0627\u0644\u0634\u062e\u0635\u064a\u0629 \u0641\u0642\u0637 \u0644\u0623\u063a\u0631\u0627\u0636 \u062a\u0634\u063a\u064a\u0644\u064a\u0629 \u0645\u0634\u0631\u0648\u0639\u0629. \u0645\u0645\u0627\u0631\u0633\u0627\u062a\u0646\u0627 \u0644\u062d\u0645\u0627\u064a\u0629 \u0627\u0644\u0628\u064a\u0627\u0646\u0627\u062a \u0645\u062a\u0648\u0627\u0641\u0642\u0629 \u0645\u0639 \u0645\u0628\u0627\u062f\u0626 \u0627\u0644\u0644\u0627\u0626\u062d\u0629 \u0627\u0644\u0639\u0627\u0645\u0629 \u0644\u062d\u0645\u0627\u064a\u0629 \u0627\u0644\u0628\u064a\u0627\u0646\u0627\u062a.",
    data1: "\u062a\u0642\u0644\u064a\u0644 \u0627\u0644\u0628\u064a\u0627\u0646\u0627\u062a",
    data1Desc: "\u064a\u062a\u0645 \u062c\u0645\u0639 \u0648\u0627\u0644\u0627\u062d\u062a\u0641\u0627\u0638 \u0641\u0642\u0637 \u0628\u0627\u0644\u0628\u064a\u0627\u0646\u0627\u062a \u0627\u0644\u0636\u0631\u0648\u0631\u064a\u0629 \u0644\u0644\u0623\u063a\u0631\u0627\u0636 \u0627\u0644\u062a\u0634\u063a\u064a\u0644\u064a\u0629 \u0627\u0644\u0645\u062d\u062f\u062f\u0629.",
    data2: "\u0627\u0644\u0623\u063a\u0631\u0627\u0636 \u0627\u0644\u062a\u0634\u063a\u064a\u0644\u064a\u0629 \u0627\u0644\u0645\u0634\u0631\u0648\u0639\u0629",
    data2Desc: "\u062a\u062a\u0645 \u0645\u0639\u0627\u0644\u062c\u0629 \u0627\u0644\u0628\u064a\u0627\u0646\u0627\u062a \u0628\u0646\u0627\u0621\u064b \u0639\u0644\u0649 \u0645\u0628\u0631\u0631\u0627\u062a \u0645\u062d\u062f\u062f\u0629 \u0628\u0648\u0636\u0648\u062d \u0628\u0645\u0627 \u0641\u064a \u0630\u0644\u0643 \u0627\u0644\u0627\u0645\u062a\u062b\u0627\u0644 \u0627\u0644\u062a\u0646\u0638\u064a\u0645\u064a \u0648\u0625\u062f\u0627\u0631\u0629 \u0627\u0644\u062d\u0633\u0627\u0628\u0627\u062a \u0648\u062a\u0642\u062f\u064a\u0645 \u062e\u062f\u0645\u0627\u062a \u0627\u0644\u0645\u0646\u0635\u0629.",
    data3: "\u0627\u0644\u062a\u0648\u0627\u0641\u0642 \u0645\u0639 \u0627\u0644\u0644\u0627\u0626\u062d\u0629 \u0627\u0644\u0639\u0627\u0645\u0629 \u0644\u062d\u0645\u0627\u064a\u0629 \u0627\u0644\u0628\u064a\u0627\u0646\u0627\u062a",
    data3Desc: "\u062a\u062a\u0648\u0627\u0641\u0642 \u0645\u0645\u0627\u0631\u0633\u0627\u062a \u062d\u0645\u0627\u064a\u0629 \u0627\u0644\u0628\u064a\u0627\u0646\u0627\u062a \u0645\u0639 \u0645\u0628\u0627\u062f\u0626 \u0627\u0644\u0644\u0627\u0626\u062d\u0629 \u0627\u0644\u0639\u0627\u0645\u0629 \u0644\u062d\u0645\u0627\u064a\u0629 \u0627\u0644\u0628\u064a\u0627\u0646\u0627\u062a \u0648\u0644\u0648\u0627\u0626\u062d \u062d\u0645\u0627\u064a\u0629 \u0627\u0644\u0628\u064a\u0627\u0646\u0627\u062a \u0627\u0644\u0645\u0639\u0645\u0648\u0644 \u0628\u0647\u0627.",
    heading5: "5. \u0627\u0644\u0627\u0633\u062a\u062c\u0627\u0628\u0629 \u0644\u0644\u062d\u0648\u0627\u062f\u062b",
    para5: "\u062a\u062d\u062a\u0641\u0638 \u0623\u0648\u0643\u0633\u0627\u064a\u062a \u0628\u0625\u062c\u0631\u0627\u0621\u0627\u062a \u0645\u0646\u0638\u0645\u0629 \u0644\u0644\u0627\u0633\u062a\u062c\u0627\u0628\u0629 \u0644\u0644\u062d\u0648\u0627\u062f\u062b \u0644\u0645\u0639\u0627\u0644\u062c\u0629 \u0627\u0644\u0623\u062d\u062f\u0627\u062b \u0627\u0644\u0623\u0645\u0646\u064a\u0629. \u064a\u0634\u0645\u0644 \u0646\u0647\u062c\u0646\u0627 \u062b\u0644\u0627\u062b \u0645\u0631\u0627\u062d\u0644 \u0623\u0633\u0627\u0633\u064a\u0629.",
    incident1: "\u0627\u0644\u0643\u0634\u0641",
    incident1Desc: "\u062a\u062d\u062f\u062f \u0623\u0646\u0638\u0645\u0629 \u0627\u0644\u0645\u0631\u0627\u0642\u0628\u0629 \u0648\u0627\u0644\u062a\u0646\u0628\u064a\u0647 \u0627\u0644\u0622\u0644\u064a\u0629 \u0627\u0644\u062d\u0648\u0627\u062f\u062b \u0627\u0644\u0623\u0645\u0646\u064a\u0629 \u0627\u0644\u0645\u062d\u062a\u0645\u0644\u0629 \u0641\u064a \u0623\u0642\u0631\u0628 \u0641\u0631\u0635\u0629.",
    incident2: "\u0627\u0644\u0627\u062d\u062a\u0648\u0627\u0621",
    incident2Desc: "\u064a\u062a\u0645 \u0627\u062d\u062a\u0648\u0627\u0621 \u0627\u0644\u062a\u0647\u062f\u064a\u062f\u0627\u062a \u0627\u0644\u0645\u0643\u062a\u0634\u0641\u0629 \u0645\u0646 \u062e\u0644\u0627\u0644 \u0639\u0632\u0644 \u0627\u0644\u0623\u0646\u0638\u0645\u0629 \u0627\u0644\u0645\u062a\u0623\u062b\u0631\u0629 \u0648\u0645\u0646\u0639 \u0627\u0644\u0648\u0635\u0648\u0644 \u0627\u0644\u0625\u0636\u0627\u0641\u064a.",
    incident3: "\u0627\u0644\u0645\u0639\u0627\u0644\u062c\u0629",
    incident3Desc: "\u062a\u062a\u0645 \u0627\u0633\u062a\u0639\u0627\u062f\u0629 \u0627\u0644\u0623\u0646\u0638\u0645\u0629 \u0627\u0644\u0645\u062a\u0623\u062b\u0631\u0629 \u0625\u0644\u0649 \u062d\u0627\u0644\u0629 \u0622\u0645\u0646\u0629 \u0648\u064a\u062a\u0645 \u0625\u062c\u0631\u0627\u0621 \u062a\u062d\u0644\u064a\u0644 \u0627\u0644\u0633\u0628\u0628 \u0627\u0644\u062c\u0630\u0631\u064a \u0648\u062a\u0646\u0641\u064a\u0630 \u062a\u062f\u0627\u0628\u064a\u0631 \u0644\u0645\u0646\u0639 \u0627\u0644\u062a\u0643\u0631\u0627\u0631.",
    closing: "\u064a\u064f\u0639\u0627\u0645\u064e\u0644 \u0627\u0644\u0623\u0645\u0646 \u0628\u0627\u0639\u062a\u0628\u0627\u0631\u0647 \u0623\u0648\u0644\u0648\u064a\u0629 \u0623\u0633\u0627\u0633\u064a\u0629 \u0644\u0644\u0628\u0646\u064a\u0629 \u0627\u0644\u062a\u062d\u062a\u064a\u0629.",
  },
  ru: {
    backToLegal: "\u2190 \u041d\u0430\u0437\u0430\u0434 \u043a \u043f\u0440\u0430\u0432\u043e\u0432\u044b\u043c \u0434\u043e\u043a\u0443\u043c\u0435\u043d\u0442\u0430\u043c",
    title: "\u0411\u0435\u0437\u043e\u043f\u0430\u0441\u043d\u043e\u0441\u0442\u044c \u0434\u0430\u043d\u043d\u044b\u0445",
    subtitle: "\u041c\u043d\u043e\u0433\u043e\u0443\u0440\u043e\u0432\u043d\u0435\u0432\u0430\u044f \u0430\u0440\u0445\u0438\u0442\u0435\u043a\u0442\u0443\u0440\u0430 \u0431\u0435\u0437\u043e\u043f\u0430\u0441\u043d\u043e\u0441\u0442\u0438 \u0434\u043b\u044f \u0437\u0430\u0449\u0438\u0442\u044b \u0434\u0430\u043d\u043d\u044b\u0445 \u043a\u043b\u0438\u0435\u043d\u0442\u043e\u0432 \u0438 \u043e\u043f\u0435\u0440\u0430\u0446\u0438\u043e\u043d\u043d\u044b\u0445 \u0441\u0438\u0441\u0442\u0435\u043c.",
    effective: "\u0412\u0441\u0442\u0443\u043f\u0430\u0435\u0442 \u0432 \u0441\u0438\u043b\u0443: \u0444\u0435\u0432\u0440\u0430\u043b\u044c 2025",
    heading1: "1. \u041e\u0441\u043d\u043e\u0432\u043d\u044b\u0435 \u043f\u0440\u0438\u043d\u0446\u0438\u043f\u044b",
    para1: "\u0411\u0435\u0437\u043e\u043f\u0430\u0441\u043d\u043e\u0441\u0442\u044c \u0434\u0430\u043d\u043d\u044b\u0445 Auxite \u0441\u0442\u0440\u043e\u0438\u0442\u0441\u044f \u043d\u0430 \u0442\u0440\u0451\u0445 \u043e\u0441\u043d\u043e\u0432\u043e\u043f\u043e\u043b\u0430\u0433\u0430\u044e\u0449\u0438\u0445 \u043f\u0440\u0438\u043d\u0446\u0438\u043f\u0430\u0445: \u041a\u043e\u043d\u0444\u0438\u0434\u0435\u043d\u0446\u0438\u0430\u043b\u044c\u043d\u043e\u0441\u0442\u044c, \u0426\u0435\u043b\u043e\u0441\u0442\u043d\u043e\u0441\u0442\u044c \u0438 \u0414\u043e\u0441\u0442\u0443\u043f\u043d\u043e\u0441\u0442\u044c. \u042d\u0442\u0438 \u043f\u0440\u0438\u043d\u0446\u0438\u043f\u044b \u043b\u0435\u0436\u0430\u0442 \u0432 \u043e\u0441\u043d\u043e\u0432\u0435 \u0432\u0441\u0435\u0445 \u043f\u043e\u043b\u0438\u0442\u0438\u043a \u0438 \u043c\u0435\u0445\u0430\u043d\u0438\u0437\u043c\u043e\u0432 \u043a\u043e\u043d\u0442\u0440\u043e\u043b\u044f, \u0440\u0435\u0433\u0443\u043b\u0438\u0440\u0443\u044e\u0449\u0438\u0445 \u0437\u0430\u0449\u0438\u0442\u0443 \u0438\u043d\u0444\u043e\u0440\u043c\u0430\u0446\u0438\u0438 \u043a\u043b\u0438\u0435\u043d\u0442\u043e\u0432 \u0438 \u043e\u043f\u0435\u0440\u0430\u0446\u0438\u043e\u043d\u043d\u044b\u0445 \u0441\u0438\u0441\u0442\u0435\u043c.",
    principle1: "\u041a\u043e\u043d\u0444\u0438\u0434\u0435\u043d\u0446\u0438\u0430\u043b\u044c\u043d\u043e\u0441\u0442\u044c",
    principle1Desc: "\u0418\u043d\u0444\u043e\u0440\u043c\u0430\u0446\u0438\u044f \u0434\u043e\u0441\u0442\u0443\u043f\u043d\u0430 \u0442\u043e\u043b\u044c\u043a\u043e \u0443\u043f\u043e\u043b\u043d\u043e\u043c\u043e\u0447\u0435\u043d\u043d\u044b\u043c \u0441\u0442\u043e\u0440\u043e\u043d\u0430\u043c, \u0438\u043c\u0435\u044e\u0449\u0438\u043c \u043e\u0431\u043e\u0441\u043d\u043e\u0432\u0430\u043d\u043d\u0443\u044e \u043e\u043f\u0435\u0440\u0430\u0446\u0438\u043e\u043d\u043d\u0443\u044e \u043d\u0435\u043e\u0431\u0445\u043e\u0434\u0438\u043c\u043e\u0441\u0442\u044c.",
    principle2: "\u0426\u0435\u043b\u043e\u0441\u0442\u043d\u043e\u0441\u0442\u044c",
    principle2Desc: "\u0414\u0430\u043d\u043d\u044b\u0435 \u043f\u043e\u0434\u0434\u0435\u0440\u0436\u0438\u0432\u0430\u044e\u0442\u0441\u044f \u0442\u043e\u0447\u043d\u044b\u043c\u0438, \u0441\u043e\u0433\u043b\u0430\u0441\u043e\u0432\u0430\u043d\u043d\u044b\u043c\u0438 \u0438 \u043d\u0435\u0438\u0437\u043c\u0435\u043d\u0451\u043d\u043d\u044b\u043c\u0438 \u043d\u0430 \u043f\u0440\u043e\u0442\u044f\u0436\u0435\u043d\u0438\u0438 \u0432\u0441\u0435\u0433\u043e \u0438\u0445 \u0436\u0438\u0437\u043d\u0435\u043d\u043d\u043e\u0433\u043e \u0446\u0438\u043a\u043b\u0430.",
    principle3: "\u0414\u043e\u0441\u0442\u0443\u043f\u043d\u043e\u0441\u0442\u044c",
    principle3Desc: "\u0421\u0438\u0441\u0442\u0435\u043c\u044b \u0438 \u0434\u0430\u043d\u043d\u044b\u0435 \u043e\u0441\u0442\u0430\u044e\u0442\u0441\u044f \u043d\u0430\u0434\u0451\u0436\u043d\u043e \u0434\u043e\u0441\u0442\u0443\u043f\u043d\u044b\u043c\u0438 \u0434\u043b\u044f \u0443\u043f\u043e\u043b\u043d\u043e\u043c\u043e\u0447\u0435\u043d\u043d\u044b\u0445 \u043f\u043e\u043b\u044c\u0437\u043e\u0432\u0430\u0442\u0435\u043b\u0435\u0439 \u043f\u043e \u043c\u0435\u0440\u0435 \u043d\u0435\u043e\u0431\u0445\u043e\u0434\u0438\u043c\u043e\u0441\u0442\u0438.",
    heading2: "2. \u0417\u0430\u0449\u0438\u0442\u0430 \u0438\u043d\u0444\u0440\u0430\u0441\u0442\u0440\u0443\u043a\u0442\u0443\u0440\u044b",
    para2: "Auxite \u043f\u0440\u0438\u043c\u0435\u043d\u044f\u0435\u0442 \u0441\u0440\u0435\u0434\u0441\u0442\u0432\u0430 \u043a\u043e\u043d\u0442\u0440\u043e\u043b\u044f \u0431\u0435\u0437\u043e\u043f\u0430\u0441\u043d\u043e\u0441\u0442\u0438 \u0438\u043d\u0444\u0440\u0430\u0441\u0442\u0440\u0443\u043a\u0442\u0443\u0440\u044b \u043a\u043e\u0440\u043f\u043e\u0440\u0430\u0442\u0438\u0432\u043d\u043e\u0433\u043e \u0443\u0440\u043e\u0432\u043d\u044f. \u0412\u0441\u0435 \u0434\u0430\u043d\u043d\u044b\u0435 \u043a\u043b\u0438\u0435\u043d\u0442\u043e\u0432 \u0437\u0430\u0449\u0438\u0449\u0435\u043d\u044b \u0441 \u043f\u043e\u043c\u043e\u0449\u044c\u044e TLS 1.2+ \u043f\u0440\u0438 \u043f\u0435\u0440\u0435\u0434\u0430\u0447\u0435 \u0438 \u0448\u0438\u0444\u0440\u043e\u0432\u0430\u043d\u0438\u044f AES-256 \u043f\u0440\u0438 \u0445\u0440\u0430\u043d\u0435\u043d\u0438\u0438.",
    infra1: "\u0428\u0438\u0444\u0440\u043e\u0432\u0430\u043d\u0438\u0435 \u043f\u0440\u0438 \u043f\u0435\u0440\u0435\u0434\u0430\u0447\u0435 \u0438 \u0445\u0440\u0430\u043d\u0435\u043d\u0438\u0438",
    infra1Desc: "\u0412\u0441\u0435 \u043f\u0435\u0440\u0435\u0434\u0430\u0447\u0438 \u0434\u0430\u043d\u043d\u044b\u0445 \u0448\u0438\u0444\u0440\u0443\u044e\u0442\u0441\u044f \u0447\u0435\u0440\u0435\u0437 TLS 1.2 \u0438 \u0432\u044b\u0448\u0435. \u0425\u0440\u0430\u043d\u0438\u043c\u044b\u0435 \u0434\u0430\u043d\u043d\u044b\u0435 \u0437\u0430\u0449\u0438\u0449\u0435\u043d\u044b \u043f\u043e \u0441\u0442\u0430\u043d\u0434\u0430\u0440\u0442\u0430\u043c AES-256.",
    infra2: "\u0423\u043a\u0440\u0435\u043f\u043b\u0451\u043d\u043d\u0430\u044f \u043e\u0431\u043b\u0430\u0447\u043d\u0430\u044f \u0441\u0440\u0435\u0434\u0430",
    infra2Desc: "\u0418\u043d\u0444\u0440\u0430\u0441\u0442\u0440\u0443\u043a\u0442\u0443\u0440\u0430 \u043d\u0430\u0441\u0442\u0440\u043e\u0435\u043d\u0430 \u0432 \u0441\u043e\u043e\u0442\u0432\u0435\u0442\u0441\u0442\u0432\u0438\u0438 \u0441 \u043e\u0442\u0440\u0430\u0441\u043b\u0435\u0432\u044b\u043c\u0438 \u0441\u0442\u0430\u043d\u0434\u0430\u0440\u0442\u0430\u043c\u0438 \u0443\u043a\u0440\u0435\u043f\u043b\u0435\u043d\u0438\u044f \u0438 \u0440\u0435\u0433\u0443\u043b\u044f\u0440\u043d\u043e \u043f\u0440\u043e\u0432\u0435\u0440\u044f\u0435\u0442\u0441\u044f.",
    infra3: "\u0421\u0435\u0442\u0435\u0432\u044b\u0435 \u0441\u0440\u0435\u0434\u0441\u0442\u0432\u0430 \u043a\u043e\u043d\u0442\u0440\u043e\u043b\u044f",
    infra3Desc: "\u0421\u0435\u0433\u043c\u0435\u043d\u0442\u0430\u0446\u0438\u044f, \u043c\u0435\u0436\u0441\u0435\u0442\u0435\u0432\u044b\u0435 \u044d\u043a\u0440\u0430\u043d\u044b \u0438 \u0441\u0438\u0441\u0442\u0435\u043c\u044b \u043e\u0431\u043d\u0430\u0440\u0443\u0436\u0435\u043d\u0438\u044f \u0432\u0442\u043e\u0440\u0436\u0435\u043d\u0438\u0439 \u043f\u0440\u0435\u0434\u043e\u0442\u0432\u0440\u0430\u0449\u0430\u044e\u0442 \u043f\u043e\u043f\u044b\u0442\u043a\u0438 \u043d\u0435\u0441\u0430\u043d\u043a\u0446\u0438\u043e\u043d\u0438\u0440\u043e\u0432\u0430\u043d\u043d\u043e\u0433\u043e \u0434\u043e\u0441\u0442\u0443\u043f\u0430.",
    infra4: "\u041d\u0435\u043f\u0440\u0435\u0440\u044b\u0432\u043d\u044b\u0439 \u043c\u043e\u043d\u0438\u0442\u043e\u0440\u0438\u043d\u0433",
    infra4Desc: "\u0410\u0432\u0442\u043e\u043c\u0430\u0442\u0438\u0437\u0438\u0440\u043e\u0432\u0430\u043d\u043d\u044b\u0435 \u0441\u0438\u0441\u0442\u0435\u043c\u044b \u043c\u043e\u043d\u0438\u0442\u043e\u0440\u0438\u043d\u0433\u0430 \u043e\u0431\u043d\u0430\u0440\u0443\u0436\u0438\u0432\u0430\u044e\u0442 \u0430\u043d\u043e\u043c\u0430\u043b\u0438\u0438 \u0438 \u043f\u043e\u0442\u0435\u043d\u0446\u0438\u0430\u043b\u044c\u043d\u044b\u0435 \u0443\u0433\u0440\u043e\u0437\u044b \u0432 \u0440\u0435\u0430\u043b\u044c\u043d\u043e\u043c \u0432\u0440\u0435\u043c\u0435\u043d\u0438.",
    heading3: "3. \u041a\u043e\u043d\u0442\u0440\u043e\u043b\u044c \u0434\u043e\u0441\u0442\u0443\u043f\u0430",
    para3: "\u0412\u0435\u0441\u044c \u0434\u043e\u0441\u0442\u0443\u043f \u043a \u0441\u0438\u0441\u0442\u0435\u043c\u0430\u043c \u0440\u0435\u0433\u0443\u043b\u0438\u0440\u0443\u0435\u0442\u0441\u044f \u0441\u0442\u0440\u043e\u0433\u0438\u043c\u0438 \u043c\u0435\u0445\u0430\u043d\u0438\u0437\u043c\u0430\u043c\u0438 \u0430\u0443\u0442\u0435\u043d\u0442\u0438\u0444\u0438\u043a\u0430\u0446\u0438\u0438 \u0438 \u0430\u0432\u0442\u043e\u0440\u0438\u0437\u0430\u0446\u0438\u0438 \u0441 \u043f\u0440\u0438\u043c\u0435\u043d\u0435\u043d\u0438\u0435\u043c \u043f\u0440\u0438\u043d\u0446\u0438\u043f\u0430 \u043c\u0438\u043d\u0438\u043c\u0430\u043b\u044c\u043d\u044b\u0445 \u043f\u0440\u0438\u0432\u0438\u043b\u0435\u0433\u0438\u0439.",
    access1: "\u041c\u043d\u043e\u0433\u043e\u0444\u0430\u043a\u0442\u043e\u0440\u043d\u0430\u044f \u0430\u0443\u0442\u0435\u043d\u0442\u0438\u0444\u0438\u043a\u0430\u0446\u0438\u044f (MFA)",
    access1Desc: "\u041c\u043d\u043e\u0433\u043e\u0444\u0430\u043a\u0442\u043e\u0440\u043d\u0430\u044f \u0430\u0443\u0442\u0435\u043d\u0442\u0438\u0444\u0438\u043a\u0430\u0446\u0438\u044f \u043e\u0431\u044f\u0437\u0430\u0442\u0435\u043b\u044c\u043d\u0430 \u0434\u043b\u044f \u0432\u0441\u0435\u0445 \u043f\u043e\u043b\u044c\u0437\u043e\u0432\u0430\u0442\u0435\u043b\u044c\u0441\u043a\u0438\u0445 \u0438 \u0430\u0434\u043c\u0438\u043d\u0438\u0441\u0442\u0440\u0430\u0442\u0438\u0432\u043d\u044b\u0445 \u0434\u043e\u0441\u0442\u0443\u043f\u043e\u0432.",
    access2: "\u0420\u043e\u043b\u0435\u0432\u044b\u0435 \u0440\u0430\u0437\u0440\u0435\u0448\u0435\u043d\u0438\u044f",
    access2Desc: "\u041f\u0440\u0430\u0432\u0430 \u0434\u043e\u0441\u0442\u0443\u043f\u0430 \u043f\u0440\u0435\u0434\u043e\u0441\u0442\u0430\u0432\u043b\u044f\u044e\u0442\u0441\u044f \u0447\u0435\u0440\u0435\u0437 \u043d\u0430\u0437\u043d\u0430\u0447\u0435\u043d\u043d\u044b\u0435 \u0440\u043e\u043b\u0438, \u0441\u043e\u043e\u0442\u0432\u0435\u0442\u0441\u0442\u0432\u0443\u044e\u0449\u0438\u0435 \u043e\u043f\u0435\u0440\u0430\u0446\u0438\u043e\u043d\u043d\u044b\u043c \u043e\u0431\u044f\u0437\u0430\u043d\u043d\u043e\u0441\u0442\u044f\u043c \u0438 \u0431\u0438\u0437\u043d\u0435\u0441-\u0442\u0440\u0435\u0431\u043e\u0432\u0430\u043d\u0438\u044f\u043c.",
    access3: "\u041f\u0440\u0438\u043d\u0446\u0438\u043f \u043c\u0438\u043d\u0438\u043c\u0430\u043b\u044c\u043d\u044b\u0445 \u043f\u0440\u0438\u0432\u0438\u043b\u0435\u0433\u0438\u0439",
    access3Desc: "\u041f\u043e\u043b\u044c\u0437\u043e\u0432\u0430\u0442\u0435\u043b\u044f\u043c \u043f\u0440\u0435\u0434\u043e\u0441\u0442\u0430\u0432\u043b\u044f\u0435\u0442\u0441\u044f \u043c\u0438\u043d\u0438\u043c\u0430\u043b\u044c\u043d\u044b\u0439 \u0443\u0440\u043e\u0432\u0435\u043d\u044c \u0434\u043e\u0441\u0442\u0443\u043f\u0430, \u043d\u0435\u043e\u0431\u0445\u043e\u0434\u0438\u043c\u044b\u0439 \u0434\u043b\u044f \u0432\u044b\u043f\u043e\u043b\u043d\u0435\u043d\u0438\u044f \u043d\u0430\u0437\u043d\u0430\u0447\u0435\u043d\u043d\u044b\u0445 \u0444\u0443\u043d\u043a\u0446\u0438\u0439.",
    access4: "\u041a\u043e\u043d\u0442\u0440\u043e\u043b\u044c \u0441\u0435\u0441\u0441\u0438\u0439",
    access4Desc: "\u0410\u043a\u0442\u0438\u0432\u043d\u044b\u0435 \u0441\u0435\u0441\u0441\u0438\u0438 \u043e\u0442\u0441\u043b\u0435\u0436\u0438\u0432\u0430\u044e\u0442\u0441\u044f, \u043f\u0440\u0438\u043c\u0435\u043d\u044f\u044e\u0442\u0441\u044f \u043f\u043e\u043b\u0438\u0442\u0438\u043a\u0438 \u0442\u0430\u0439\u043c-\u0430\u0443\u0442\u0430, \u0430\u043d\u043e\u043c\u0430\u043b\u044c\u043d\u043e\u0435 \u043f\u043e\u0432\u0435\u0434\u0435\u043d\u0438\u0435 \u0441\u0435\u0441\u0441\u0438\u0439 \u043e\u0431\u043d\u0430\u0440\u0443\u0436\u0438\u0432\u0430\u0435\u0442\u0441\u044f.",
    heading4: "4. \u0417\u0430\u0449\u0438\u0442\u0430 \u0434\u0430\u043d\u043d\u044b\u0445",
    para4: "Auxite \u043f\u0440\u0438\u0434\u0435\u0440\u0436\u0438\u0432\u0430\u0435\u0442\u0441\u044f \u043f\u0440\u0438\u043d\u0446\u0438\u043f\u0430 \u043c\u0438\u043d\u0438\u043c\u0438\u0437\u0430\u0446\u0438\u0438 \u0434\u0430\u043d\u043d\u044b\u0445 \u0438 \u0441\u043e\u0431\u0438\u0440\u0430\u0435\u0442 \u0438 \u043e\u0431\u0440\u0430\u0431\u0430\u0442\u044b\u0432\u0430\u0435\u0442 \u043f\u0435\u0440\u0441\u043e\u043d\u0430\u043b\u044c\u043d\u044b\u0435 \u0434\u0430\u043d\u043d\u044b\u0435 \u0438\u0441\u043a\u043b\u044e\u0447\u0438\u0442\u0435\u043b\u044c\u043d\u043e \u0432 \u043b\u0435\u0433\u0438\u0442\u0438\u043c\u043d\u044b\u0445 \u043e\u043f\u0435\u0440\u0430\u0446\u0438\u043e\u043d\u043d\u044b\u0445 \u0446\u0435\u043b\u044f\u0445. \u041d\u0430\u0448\u0438 \u043f\u0440\u0430\u043a\u0442\u0438\u043a\u0438 \u0437\u0430\u0449\u0438\u0442\u044b \u0434\u0430\u043d\u043d\u044b\u0445 \u0441\u043e\u043e\u0442\u0432\u0435\u0442\u0441\u0442\u0432\u0443\u044e\u0442 \u043f\u0440\u0438\u043d\u0446\u0438\u043f\u0430\u043c \u0420\u0435\u0433\u043b\u0430\u043c\u0435\u043d\u0442\u0430 \u043e \u0437\u0430\u0449\u0438\u0442\u0435 \u043f\u0435\u0440\u0441\u043e\u043d\u0430\u043b\u044c\u043d\u044b\u0445 \u0434\u0430\u043d\u043d\u044b\u0445 (GDPR).",
    data1: "\u041c\u0438\u043d\u0438\u043c\u0438\u0437\u0430\u0446\u0438\u044f \u0434\u0430\u043d\u043d\u044b\u0445",
    data1Desc: "\u0421\u043e\u0431\u0438\u0440\u0430\u044e\u0442\u0441\u044f \u0438 \u0445\u0440\u0430\u043d\u044f\u0442\u0441\u044f \u0442\u043e\u043b\u044c\u043a\u043e \u0434\u0430\u043d\u043d\u044b\u0435, \u043d\u0435\u043e\u0431\u0445\u043e\u0434\u0438\u043c\u044b\u0435 \u0434\u043b\u044f \u043e\u043f\u0440\u0435\u0434\u0435\u043b\u0451\u043d\u043d\u044b\u0445 \u043e\u043f\u0435\u0440\u0430\u0446\u0438\u043e\u043d\u043d\u044b\u0445 \u0446\u0435\u043b\u0435\u0439.",
    data2: "\u041b\u0435\u0433\u0438\u0442\u0438\u043c\u043d\u044b\u0435 \u043e\u043f\u0435\u0440\u0430\u0446\u0438\u043e\u043d\u043d\u044b\u0435 \u0446\u0435\u043b\u0438",
    data2Desc: "\u041e\u0431\u0440\u0430\u0431\u043e\u0442\u043a\u0430 \u0434\u0430\u043d\u043d\u044b\u0445 \u043e\u0441\u0443\u0449\u0435\u0441\u0442\u0432\u043b\u044f\u0435\u0442\u0441\u044f \u043d\u0430 \u043e\u0441\u043d\u043e\u0432\u0430\u043d\u0438\u0438 \u0447\u0451\u0442\u043a\u043e \u043e\u043f\u0440\u0435\u0434\u0435\u043b\u0451\u043d\u043d\u044b\u0445 \u043e\u0431\u043e\u0441\u043d\u043e\u0432\u0430\u043d\u0438\u0439, \u0432\u043a\u043b\u044e\u0447\u0430\u044f \u0441\u043e\u0431\u043b\u044e\u0434\u0435\u043d\u0438\u0435 \u043d\u043e\u0440\u043c\u0430\u0442\u0438\u0432\u043d\u044b\u0445 \u0442\u0440\u0435\u0431\u043e\u0432\u0430\u043d\u0438\u0439, \u0443\u043f\u0440\u0430\u0432\u043b\u0435\u043d\u0438\u0435 \u0441\u0447\u0435\u0442\u0430\u043c\u0438 \u0438 \u043f\u0440\u0435\u0434\u043e\u0441\u0442\u0430\u0432\u043b\u0435\u043d\u0438\u0435 \u0443\u0441\u043b\u0443\u0433 \u043f\u043b\u0430\u0442\u0444\u043e\u0440\u043c\u044b.",
    data3: "\u0421\u043e\u043e\u0442\u0432\u0435\u0442\u0441\u0442\u0432\u0438\u0435 GDPR",
    data3Desc: "\u041f\u0440\u0430\u043a\u0442\u0438\u043a\u0438 \u0437\u0430\u0449\u0438\u0442\u044b \u0434\u0430\u043d\u043d\u044b\u0445 \u0441\u043e\u043e\u0442\u0432\u0435\u0442\u0441\u0442\u0432\u0443\u044e\u0442 \u043f\u0440\u0438\u043d\u0446\u0438\u043f\u0430\u043c \u041e\u0431\u0449\u0435\u0433\u043e \u0440\u0435\u0433\u043b\u0430\u043c\u0435\u043d\u0442\u0430 \u043f\u043e \u0437\u0430\u0449\u0438\u0442\u0435 \u0434\u0430\u043d\u043d\u044b\u0445 \u0438 \u043f\u0440\u0438\u043c\u0435\u043d\u0438\u043c\u044b\u043c \u043d\u043e\u0440\u043c\u0430\u0442\u0438\u0432\u043d\u044b\u043c \u0430\u043a\u0442\u0430\u043c \u043e \u0437\u0430\u0449\u0438\u0442\u0435 \u043f\u0435\u0440\u0441\u043e\u043d\u0430\u043b\u044c\u043d\u044b\u0445 \u0434\u0430\u043d\u043d\u044b\u0445.",
    heading5: "5. \u0420\u0435\u0430\u0433\u0438\u0440\u043e\u0432\u0430\u043d\u0438\u0435 \u043d\u0430 \u0438\u043d\u0446\u0438\u0434\u0435\u043d\u0442\u044b",
    para5: "Auxite \u043f\u043e\u0434\u0434\u0435\u0440\u0436\u0438\u0432\u0430\u0435\u0442 \u0441\u0442\u0440\u0443\u043a\u0442\u0443\u0440\u0438\u0440\u043e\u0432\u0430\u043d\u043d\u044b\u0435 \u043f\u0440\u043e\u0446\u0435\u0434\u0443\u0440\u044b \u0440\u0435\u0430\u0433\u0438\u0440\u043e\u0432\u0430\u043d\u0438\u044f \u043d\u0430 \u0438\u043d\u0446\u0438\u0434\u0435\u043d\u0442\u044b \u0434\u043b\u044f \u0443\u0441\u0442\u0440\u0430\u043d\u0435\u043d\u0438\u044f \u0443\u0433\u0440\u043e\u0437 \u0431\u0435\u0437\u043e\u043f\u0430\u0441\u043d\u043e\u0441\u0442\u0438. \u041d\u0430\u0448 \u043f\u043e\u0434\u0445\u043e\u0434 \u043e\u0445\u0432\u0430\u0442\u044b\u0432\u0430\u0435\u0442 \u0442\u0440\u0438 \u043e\u0441\u043d\u043e\u0432\u043d\u044b\u0445 \u044d\u0442\u0430\u043f\u0430.",
    incident1: "\u041e\u0431\u043d\u0430\u0440\u0443\u0436\u0435\u043d\u0438\u0435",
    incident1Desc: "\u0410\u0432\u0442\u043e\u043c\u0430\u0442\u0438\u0437\u0438\u0440\u043e\u0432\u0430\u043d\u043d\u044b\u0435 \u0441\u0438\u0441\u0442\u0435\u043c\u044b \u043c\u043e\u043d\u0438\u0442\u043e\u0440\u0438\u043d\u0433\u0430 \u0438 \u043e\u043f\u043e\u0432\u0435\u0449\u0435\u043d\u0438\u044f \u0432\u044b\u044f\u0432\u043b\u044f\u044e\u0442 \u043f\u043e\u0442\u0435\u043d\u0446\u0438\u0430\u043b\u044c\u043d\u044b\u0435 \u0438\u043d\u0446\u0438\u0434\u0435\u043d\u0442\u044b \u0431\u0435\u0437\u043e\u043f\u0430\u0441\u043d\u043e\u0441\u0442\u0438 \u043f\u0440\u0438 \u043f\u0435\u0440\u0432\u043e\u0439 \u0432\u043e\u0437\u043c\u043e\u0436\u043d\u043e\u0441\u0442\u0438.",
    incident2: "\u041b\u043e\u043a\u0430\u043b\u0438\u0437\u0430\u0446\u0438\u044f",
    incident2Desc: "\u0412\u044b\u044f\u0432\u043b\u0435\u043d\u043d\u044b\u0435 \u0443\u0433\u0440\u043e\u0437\u044b \u043b\u043e\u043a\u0430\u043b\u0438\u0437\u0443\u044e\u0442\u0441\u044f \u043f\u0443\u0442\u0451\u043c \u0438\u0437\u043e\u043b\u044f\u0446\u0438\u0438 \u0437\u0430\u0442\u0440\u043e\u043d\u0443\u0442\u044b\u0445 \u0441\u0438\u0441\u0442\u0435\u043c \u0438 \u043f\u0440\u0435\u0434\u043e\u0442\u0432\u0440\u0430\u0449\u0435\u043d\u0438\u044f \u0434\u0430\u043b\u044c\u043d\u0435\u0439\u0448\u0435\u0433\u043e \u0434\u043e\u0441\u0442\u0443\u043f\u0430.",
    incident3: "\u0423\u0441\u0442\u0440\u0430\u043d\u0435\u043d\u0438\u0435",
    incident3Desc: "\u0417\u0430\u0442\u0440\u043e\u043d\u0443\u0442\u044b\u0435 \u0441\u0438\u0441\u0442\u0435\u043c\u044b \u0432\u043e\u0441\u0441\u0442\u0430\u043d\u0430\u0432\u043b\u0438\u0432\u0430\u044e\u0442\u0441\u044f \u0434\u043e \u0431\u0435\u0437\u043e\u043f\u0430\u0441\u043d\u043e\u0433\u043e \u0441\u043e\u0441\u0442\u043e\u044f\u043d\u0438\u044f, \u043f\u0440\u043e\u0432\u043e\u0434\u0438\u0442\u0441\u044f \u0430\u043d\u0430\u043b\u0438\u0437 \u043f\u0435\u0440\u0432\u043e\u043f\u0440\u0438\u0447\u0438\u043d \u0438 \u043f\u0440\u0438\u043d\u0438\u043c\u0430\u044e\u0442\u0441\u044f \u043c\u0435\u0440\u044b \u043f\u043e \u043f\u0440\u0435\u0434\u043e\u0442\u0432\u0440\u0430\u0449\u0435\u043d\u0438\u044e \u043f\u043e\u0432\u0442\u043e\u0440\u0435\u043d\u0438\u044f.",
    closing: "\u0411\u0435\u0437\u043e\u043f\u0430\u0441\u043d\u043e\u0441\u0442\u044c \u0440\u0430\u0441\u0441\u043c\u0430\u0442\u0440\u0438\u0432\u0430\u0435\u0442\u0441\u044f \u043a\u0430\u043a \u0444\u0443\u043d\u0434\u0430\u043c\u0435\u043d\u0442\u0430\u043b\u044c\u043d\u044b\u0439 \u0438\u043d\u0444\u0440\u0430\u0441\u0442\u0440\u0443\u043a\u0442\u0443\u0440\u043d\u044b\u0439 \u043f\u0440\u0438\u043e\u0440\u0438\u0442\u0435\u0442.",
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
            <h2 className="text-xl font-bold text-slate-800 dark:text-white">{t.heading1}</h2>
            <p>{t.para1}</p>
            <div className="bg-[#BFA181]/10 dark:bg-[#BFA181]/20 border border-[#BFA181]/30 dark:border-[#BFA181]/30 rounded-lg p-4">
              <ul className="space-y-3">
                <li><strong>{t.principle1}</strong> &mdash; {t.principle1Desc}</li>
                <li><strong>{t.principle2}</strong> &mdash; {t.principle2Desc}</li>
                <li><strong>{t.principle3}</strong> &mdash; {t.principle3Desc}</li>
              </ul>
            </div>

            <h2 className="text-xl font-bold text-slate-800 dark:text-white mt-8">{t.heading2}</h2>
            <p>{t.para2}</p>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>{t.infra1}:</strong> {t.infra1Desc}</li>
              <li><strong>{t.infra2}:</strong> {t.infra2Desc}</li>
              <li><strong>{t.infra3}:</strong> {t.infra3Desc}</li>
              <li><strong>{t.infra4}:</strong> {t.infra4Desc}</li>
            </ul>

            <h2 className="text-xl font-bold text-slate-800 dark:text-white mt-8">{t.heading3}</h2>
            <p>{t.para3}</p>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>{t.access1}:</strong> {t.access1Desc}</li>
              <li><strong>{t.access2}:</strong> {t.access2Desc}</li>
              <li><strong>{t.access3}:</strong> {t.access3Desc}</li>
              <li><strong>{t.access4}:</strong> {t.access4Desc}</li>
            </ul>

            <h2 className="text-xl font-bold text-slate-800 dark:text-white mt-8">{t.heading4}</h2>
            <p>{t.para4}</p>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>{t.data1}:</strong> {t.data1Desc}</li>
              <li><strong>{t.data2}:</strong> {t.data2Desc}</li>
              <li><strong>{t.data3}:</strong> {t.data3Desc}</li>
            </ul>

            <h2 className="text-xl font-bold text-slate-800 dark:text-white mt-8">{t.heading5}</h2>
            <p>{t.para5}</p>
            <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-4">
              <ol className="list-decimal pl-6 space-y-3">
                <li><strong>{t.incident1}:</strong> {t.incident1Desc}</li>
                <li><strong>{t.incident2}:</strong> {t.incident2Desc}</li>
                <li><strong>{t.incident3}:</strong> {t.incident3Desc}</li>
              </ol>
            </div>

            <div className="mt-8 pt-6 border-t border-slate-200 dark:border-slate-700">
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400 italic">{t.closing}</p>
            </div>
          </div>
        </article>
      </main>
      <ComplianceFooter />
    </div>
  );
}