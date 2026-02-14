"use client";
import Link from "next/link";
import TopNav from "@/components/TopNav";
import ComplianceFooter from "@/components/ComplianceFooter";
import { useLanguage } from "@/components/LanguageContext";

const translations: Record<string, Record<string, string>> = {
  tr: {
    backToLegal: "\u2190 Yasal Belgelere D\u00f6n",
    title: "Saklama \u00c7er\u00e7evesi",
    subtitle: "M\u00fc\u015fteri varl\u0131klar\u0131n\u0131 korumak i\u00e7in tasarlanm\u0131\u015f saklama \u00f6ncelikli altyap\u0131",
    effective: "Y\u00fcr\u00fcrl\u00fck: \u015eubat 2025",

    h1: "Tahsisli M\u00fclkiyet",
    p1: "Her m\u00fc\u015fteri, \u00f6zel olarak tahsis edilmi\u015f fiziksel metallerin faydalanma hakk\u0131na sahiptir. Auxite, k\u0131smi kar\u015f\u0131l\u0131k sistemi i\u015fletmemektedir.",

    h2: "Varl\u0131k Ayr\u0131m\u0131",
    p2: "M\u00fc\u015fteri metalleri:",
    p2_1: "Tamamen tahsisli",
    p2_2: "Hukuki olarak ayr\u0131lm\u0131\u015f",
    p2_3: "Kurumsal bilan\u00e7olar\u0131n d\u0131\u015f\u0131nda tutulur",
    p2_highlight: "M\u00fc\u015fteri varl\u0131klar\u0131 asla kurumsal fonlarla kar\u0131\u015ft\u0131r\u0131lmaz.",

    h3: "Ba\u011f\u0131ms\u0131z Kasalama",
    p3: "Metaller, k\u00fcresel g\u00fcvenlik standartlar\u0131n\u0131 kar\u015f\u0131layacak \u015fekilde tasarlanm\u0131\u015f profesyonel kasa tesislerinde depolan\u0131r. Kasa operat\u00f6rleri titiz bir durum tespiti ile se\u00e7ilir ve uluslararas\u0131 kabul g\u00f6rm\u00fc\u015f sertifikalara sahiptir.",

    h4: "Yeniden Rehin Yasa\u011f\u0131",
    p4: "Auxite, m\u00fc\u015fterinin a\u00e7\u0131k izni olmadan m\u00fc\u015fteri metallerini \u00f6d\u00fcn\u00e7 vermez, rehin koymaz veya ba\u015fka herhangi bir \u015fekilde ipotek alt\u0131na almaz.",

    h5: "Sigorta",
    p5: "Kasa operat\u00f6rleri genellikle sekt\u00f6r uygulamalar\u0131yla tutarl\u0131 sigorta kapsam\u0131 sa\u011flar. Kapsam detaylar\u0131 talep \u00fczerine sunulabilir.",

    h6: "Operasyonel B\u00fct\u00fcnl\u00fck",
    p6: "Kay\u0131tl\u0131 m\u00fclkiyet ile fiziksel varl\u0131klar aras\u0131ndaki uyumu sa\u011flamak i\u00e7in d\u00fczenli mutabakat pros\u00e9d\u00fcrleri uygulan\u0131r. Auxite, \u015feffaf raporlama standartlar\u0131n\u0131 s\u00fcrd\u00fcr\u00fcr.",

    closing: "Saklama, temel finansal altyap\u0131 olarak ele al\u0131n\u0131r \u2014 ikincil bir hizmet olarak de\u011fil.",
    contact: "Saklama sorular\u0131 i\u00e7in: custody@auxite.com",
  },
  en: {
    backToLegal: "\u2190 Back to Legal",
    title: "Custody Framework",
    subtitle: "Custody-first infrastructure designed to safeguard client assets",
    effective: "Effective: February 2025",

    h1: "Allocated Ownership",
    p1: "Each client holds beneficial ownership of specifically allocated physical metals. Auxite does not operate fractional reserves.",

    h2: "Asset Segregation",
    p2: "Client metals are:",
    p2_1: "Fully allocated",
    p2_2: "Legally segregated",
    p2_3: "Held off corporate balance sheets",
    p2_highlight: "Client assets are never commingled with corporate funds.",

    h3: "Independent Vaulting",
    p3: "Metals are stored within professional vault facilities designed to meet global security standards. Vault operators are selected through rigorous due diligence and maintain internationally recognized certifications.",

    h4: "No Rehypothecation",
    p4: "Auxite does not lend, pledge, or otherwise encumber client metals without explicit client authorization.",

    h5: "Insurance",
    p5: "Vault operators typically maintain insurance coverage consistent with industry practices. Coverage details are available upon request.",

    h6: "Operational Integrity",
    p6: "Regular reconciliation procedures are performed to ensure alignment between recorded ownership and physical holdings. Auxite maintains transparent reporting standards.",

    closing: "Custody is treated as core financial infrastructure \u2014 not a secondary service.",
    contact: "For custody inquiries: custody@auxite.com",
  },
  de: {
    backToLegal: "\u2190 Zur\u00fcck zu Rechtliches",
    title: "Verwahrungsrahmenwerk",
    subtitle: "Verwahrungsorientierte Infrastruktur zum Schutz von Kundenverm\u00f6gen",
    effective: "G\u00fcltig ab: Februar 2025",

    h1: "Zugewiesenes Eigentum",
    p1: "Jeder Kunde h\u00e4lt das wirtschaftliche Eigentum an spezifisch zugewiesenen physischen Metallen. Auxite betreibt kein Teilreservesystem.",

    h2: "Verm\u00f6genstrennung",
    p2: "Kundenmetalle sind:",
    p2_1: "Vollst\u00e4ndig zugewiesen",
    p2_2: "Rechtlich getrennt",
    p2_3: "Au\u00dferhalb der Unternehmensbilanzen gehalten",
    p2_highlight: "Kundenverm\u00f6gen wird niemals mit Unternehmensmitteln vermischt.",

    h3: "Unabh\u00e4ngige Verwahrung",
    p3: "Metalle werden in professionellen Tresoreinrichtungen gelagert, die darauf ausgelegt sind, globale Sicherheitsstandards zu erf\u00fcllen. Tresorbetreiber werden durch sorgf\u00e4ltige Pr\u00fcfung ausgew\u00e4hlt und verf\u00fcgen \u00fcber international anerkannte Zertifizierungen.",

    h4: "Keine Weiterverpf\u00e4ndung",
    p4: "Auxite verleiht, verpf\u00e4ndet oder belastet Kundenmetalle nicht ohne ausdr\u00fcckliche Genehmigung des Kunden.",

    h5: "Versicherung",
    p5: "Tresorbetreiber unterhalten in der Regel einen Versicherungsschutz, der den Branchenstandards entspricht. Einzelheiten zur Deckung sind auf Anfrage erh\u00e4ltlich.",

    h6: "Operative Integrit\u00e4t",
    p6: "Es werden regelm\u00e4\u00dfige Abstimmungsverfahren durchgef\u00fchrt, um die \u00dcbereinstimmung zwischen erfasstem Eigentum und physischen Best\u00e4nden sicherzustellen. Auxite pflegt transparente Berichtsstandards.",

    closing: "Verwahrung wird als zentrale Finanzinfrastruktur behandelt \u2014 nicht als sekund\u00e4re Dienstleistung.",
    contact: "F\u00fcr Verwahrungsanfragen: custody@auxite.com",
  },
  fr: {
    backToLegal: "\u2190 Retour aux documents l\u00e9gaux",
    title: "Cadre de Conservation",
    subtitle: "Infrastructure ax\u00e9e sur la conservation pour prot\u00e9ger les actifs des clients",
    effective: "En vigueur : F\u00e9vrier 2025",

    h1: "Propri\u00e9t\u00e9 Allou\u00e9e",
    p1: "Chaque client d\u00e9tient la propri\u00e9t\u00e9 effective de m\u00e9taux physiques sp\u00e9cifiquement allou\u00e9s. Auxite ne fonctionne pas avec des r\u00e9serves fractionnaires.",

    h2: "S\u00e9gr\u00e9gation des Actifs",
    p2: "Les m\u00e9taux des clients sont :",
    p2_1: "Enti\u00e8rement allou\u00e9s",
    p2_2: "Juridiquement s\u00e9par\u00e9s",
    p2_3: "D\u00e9tenus hors des bilans de l\u2019entreprise",
    p2_highlight: "Les actifs des clients ne sont jamais m\u00e9lang\u00e9s avec les fonds de l\u2019entreprise.",

    h3: "Entreposage Ind\u00e9pendant",
    p3: "Les m\u00e9taux sont stock\u00e9s dans des installations de coffre-fort professionnelles con\u00e7ues pour r\u00e9pondre aux normes de s\u00e9curit\u00e9 mondiales. Les op\u00e9rateurs de coffre-fort sont s\u00e9lectionn\u00e9s par une diligence raisonnable rigoureuse et d\u00e9tiennent des certifications internationalement reconnues.",

    h4: "Aucune R\u00e9hypoth\u00e9cation",
    p4: "Auxite ne pr\u00eate, ne met en gage ni ne gr\u00e8ve autrement les m\u00e9taux des clients sans autorisation explicite du client.",

    h5: "Assurance",
    p5: "Les op\u00e9rateurs de coffre-fort maintiennent g\u00e9n\u00e9ralement une couverture d\u2019assurance conforme aux pratiques du secteur. Les d\u00e9tails de la couverture sont disponibles sur demande.",

    h6: "Int\u00e9grit\u00e9 Op\u00e9rationnelle",
    p6: "Des proc\u00e9dures de rapprochement r\u00e9guli\u00e8res sont effectu\u00e9es pour garantir la concordance entre la propri\u00e9t\u00e9 enregistr\u00e9e et les avoirs physiques. Auxite maintient des normes de reporting transparentes.",

    closing: "La conservation est trait\u00e9e comme une infrastructure financi\u00e8re fondamentale \u2014 pas comme un service secondaire.",
    contact: "Pour les questions de conservation : custody@auxite.com",
  },
  ar: {
    backToLegal: "\u2190 \u0627\u0644\u0639\u0648\u062f\u0629 \u0625\u0644\u0649 \u0627\u0644\u0648\u062b\u0627\u0626\u0642 \u0627\u0644\u0642\u0627\u0646\u0648\u0646\u064a\u0629",
    title: "\u0625\u0637\u0627\u0631 \u0627\u0644\u062d\u0641\u0638",
    subtitle: "\u0628\u0646\u064a\u0629 \u062a\u062d\u062a\u064a\u0629 \u062a\u0631\u0643\u0632 \u0639\u0644\u0649 \u0627\u0644\u062d\u0641\u0638 \u0645\u0635\u0645\u0645\u0629 \u0644\u062d\u0645\u0627\u064a\u0629 \u0623\u0635\u0648\u0644 \u0627\u0644\u0639\u0645\u0644\u0627\u0621",
    effective: "\u0633\u0627\u0631\u064a \u0627\u0644\u0645\u0641\u0639\u0648\u0644: \u0641\u0628\u0631\u0627\u064a\u0631 2025",

    h1: "\u0627\u0644\u0645\u0644\u0643\u064a\u0629 \u0627\u0644\u0645\u062e\u0635\u0635\u0629",
    p1: "\u064a\u062d\u062a\u0641\u0638 \u0643\u0644 \u0639\u0645\u064a\u0644 \u0628\u0627\u0644\u0645\u0644\u0643\u064a\u0629 \u0627\u0644\u0627\u0646\u062a\u0641\u0627\u0639\u064a\u0629 \u0644\u0644\u0645\u0639\u0627\u062f\u0646 \u0627\u0644\u0645\u0627\u062f\u064a\u0629 \u0627\u0644\u0645\u062e\u0635\u0635\u0629 \u062a\u062d\u062f\u064a\u062f\u064b\u0627. \u0644\u0627 \u062a\u0639\u0645\u0644 Auxite \u0628\u0646\u0638\u0627\u0645 \u0627\u0644\u0627\u062d\u062a\u064a\u0627\u0637\u064a \u0627\u0644\u062c\u0632\u0626\u064a.",

    h2: "\u0641\u0635\u0644 \u0627\u0644\u0623\u0635\u0648\u0644",
    p2: "\u0645\u0639\u0627\u062f\u0646 \u0627\u0644\u0639\u0645\u0644\u0627\u0621:",
    p2_1: "\u0645\u062e\u0635\u0635\u0629 \u0628\u0627\u0644\u0643\u0627\u0645\u0644",
    p2_2: "\u0645\u0641\u0635\u0648\u0644\u0629 \u0642\u0627\u0646\u0648\u0646\u064a\u064b\u0627",
    p2_3: "\u0645\u062d\u062a\u0641\u0638 \u0628\u0647\u0627 \u062e\u0627\u0631\u062c \u0627\u0644\u0645\u064a\u0632\u0627\u0646\u064a\u0627\u062a \u0627\u0644\u0639\u0645\u0648\u0645\u064a\u0629 \u0644\u0644\u0634\u0631\u0643\u0629",
    p2_highlight: "\u0644\u0627 \u064a\u062a\u0645 \u062e\u0644\u0637 \u0623\u0635\u0648\u0644 \u0627\u0644\u0639\u0645\u0644\u0627\u0621 \u0623\u0628\u062f\u064b\u0627 \u0645\u0639 \u0623\u0645\u0648\u0627\u0644 \u0627\u0644\u0634\u0631\u0643\u0629.",

    h3: "\u062a\u062e\u0632\u064a\u0646 \u0645\u0633\u062a\u0642\u0644",
    p3: "\u064a\u062a\u0645 \u062a\u062e\u0632\u064a\u0646 \u0627\u0644\u0645\u0639\u0627\u062f\u0646 \u0641\u064a \u0645\u0646\u0634\u0622\u062a \u062e\u0632\u0627\u0626\u0646 \u0627\u062d\u062a\u0631\u0627\u0641\u064a\u0629 \u0645\u0635\u0645\u0645\u0629 \u0644\u062a\u0644\u0628\u064a\u0629 \u0645\u0639\u0627\u064a\u064a\u0631 \u0627\u0644\u0623\u0645\u0627\u0646 \u0627\u0644\u0639\u0627\u0644\u0645\u064a\u0629. \u064a\u062a\u0645 \u0627\u062e\u062a\u064a\u0627\u0631 \u0645\u0634\u063a\u0644\u064a \u0627\u0644\u062e\u0632\u0627\u0626\u0646 \u0645\u0646 \u062e\u0644\u0627\u0644 \u0627\u0644\u0639\u0646\u0627\u064a\u0629 \u0627\u0644\u0648\u0627\u062c\u0628\u0629 \u0627\u0644\u0635\u0627\u0631\u0645\u0629 \u0648\u064a\u062d\u0645\u0644\u0648\u0646 \u0634\u0647\u0627\u062f\u0627\u062a \u0645\u0639\u062a\u0631\u0641 \u0628\u0647\u0627 \u062f\u0648\u0644\u064a\u064b\u0627.",

    h4: "\u0639\u062f\u0645 \u0625\u0639\u0627\u062f\u0629 \u0627\u0644\u0631\u0647\u0646",
    p4: "\u0644\u0627 \u062a\u0642\u0648\u0645 Auxite \u0628\u0625\u0642\u0631\u0627\u0636 \u0623\u0648 \u0631\u0647\u0646 \u0623\u0648 \u062a\u062d\u0645\u064a\u0644 \u0645\u0639\u0627\u062f\u0646 \u0627\u0644\u0639\u0645\u0644\u0627\u0621 \u0628\u0623\u064a \u0634\u0643\u0644 \u0622\u062e\u0631 \u062f\u0648\u0646 \u0625\u0630\u0646 \u0635\u0631\u064a\u062d \u0645\u0646 \u0627\u0644\u0639\u0645\u064a\u0644.",

    h5: "\u0627\u0644\u062a\u0623\u0645\u064a\u0646",
    p5: "\u064a\u062d\u062a\u0641\u0638 \u0645\u0634\u063a\u0644\u0648 \u0627\u0644\u062e\u0632\u0627\u0626\u0646 \u0639\u0627\u062f\u0629\u064b \u0628\u062a\u063a\u0637\u064a\u0629 \u062a\u0623\u0645\u064a\u0646\u064a\u0629 \u0645\u062a\u0648\u0627\u0641\u0642\u0629 \u0645\u0639 \u0645\u0645\u0627\u0631\u0633\u0627\u062a \u0627\u0644\u0635\u0646\u0627\u0639\u0629. \u062a\u0641\u0627\u0635\u064a\u0644 \u0627\u0644\u062a\u063a\u0637\u064a\u0629 \u0645\u062a\u0627\u062d\u0629 \u0639\u0646\u062f \u0627\u0644\u0637\u0644\u0628.",

    h6: "\u0627\u0644\u0646\u0632\u0627\u0647\u0629 \u0627\u0644\u062a\u0634\u063a\u064a\u0644\u064a\u0629",
    p6: "\u064a\u062a\u0645 \u062a\u0646\u0641\u064a\u0630 \u0625\u062c\u0631\u0627\u0621\u0627\u062a \u0645\u0637\u0627\u0628\u0642\u0629 \u0645\u0646\u062a\u0638\u0645\u0629 \u0644\u0636\u0645\u0627\u0646 \u0627\u0644\u062a\u0648\u0627\u0641\u0642 \u0628\u064a\u0646 \u0627\u0644\u0645\u0644\u0643\u064a\u0629 \u0627\u0644\u0645\u0633\u062c\u0644\u0629 \u0648\u0627\u0644\u062d\u064a\u0627\u0632\u0627\u062a \u0627\u0644\u0645\u0627\u062f\u064a\u0629. \u062a\u062d\u0627\u0641\u0638 Auxite \u0639\u0644\u0649 \u0645\u0639\u0627\u064a\u064a\u0631 \u062a\u0642\u0627\u0631\u064a\u0631 \u0634\u0641\u0627\u0641\u0629.",

    closing: "\u064a\u064f\u0639\u0627\u0645\u064e\u0644 \u0627\u0644\u062d\u0641\u0638 \u0643\u0628\u0646\u064a\u0629 \u062a\u062d\u062a\u064a\u0629 \u0645\u0627\u0644\u064a\u0629 \u0623\u0633\u0627\u0633\u064a\u0629 \u2014 \u0648\u0644\u064a\u0633 \u0643\u062e\u062f\u0645\u0629 \u062b\u0627\u0646\u0648\u064a\u0629.",
    contact: "\u0644\u0627\u0633\u062a\u0641\u0633\u0627\u0631\u0627\u062a \u0627\u0644\u062d\u0641\u0638: custody@auxite.com",
  },
  ru: {
    backToLegal: "\u2190 \u041d\u0430\u0437\u0430\u0434 \u043a \u043f\u0440\u0430\u0432\u043e\u0432\u044b\u043c \u0434\u043e\u043a\u0443\u043c\u0435\u043d\u0442\u0430\u043c",
    title: "\u0421\u0438\u0441\u0442\u0435\u043c\u0430 \u0445\u0440\u0430\u043d\u0435\u043d\u0438\u044f",
    subtitle: "\u0418\u043d\u0444\u0440\u0430\u0441\u0442\u0440\u0443\u043a\u0442\u0443\u0440\u0430 \u0445\u0440\u0430\u043d\u0435\u043d\u0438\u044f, \u0440\u0430\u0437\u0440\u0430\u0431\u043e\u0442\u0430\u043d\u043d\u0430\u044f \u0434\u043b\u044f \u0437\u0430\u0449\u0438\u0442\u044b \u0430\u043a\u0442\u0438\u0432\u043e\u0432 \u043a\u043b\u0438\u0435\u043d\u0442\u043e\u0432",
    effective: "\u0414\u0435\u0439\u0441\u0442\u0432\u0443\u0435\u0442 \u0441: \u0424\u0435\u0432\u0440\u0430\u043b\u044c 2025",

    h1: "\u0420\u0430\u0441\u043f\u0440\u0435\u0434\u0435\u043b\u0451\u043d\u043d\u043e\u0435 \u0432\u043b\u0430\u0434\u0435\u043d\u0438\u0435",
    p1: "\u041a\u0430\u0436\u0434\u044b\u0439 \u043a\u043b\u0438\u0435\u043d\u0442 \u044f\u0432\u043b\u044f\u0435\u0442\u0441\u044f \u0431\u0435\u043d\u0435\u0444\u0438\u0446\u0438\u0430\u0440\u043d\u044b\u043c \u0432\u043b\u0430\u0434\u0435\u043b\u044c\u0446\u0435\u043c \u0441\u043f\u0435\u0446\u0438\u0430\u043b\u044c\u043d\u043e \u0440\u0430\u0441\u043f\u0440\u0435\u0434\u0435\u043b\u0451\u043d\u043d\u044b\u0445 \u0444\u0438\u0437\u0438\u0447\u0435\u0441\u043a\u0438\u0445 \u043c\u0435\u0442\u0430\u043b\u043b\u043e\u0432. Auxite \u043d\u0435 \u0438\u0441\u043f\u043e\u043b\u044c\u0437\u0443\u0435\u0442 \u0441\u0438\u0441\u0442\u0435\u043c\u0443 \u0447\u0430\u0441\u0442\u0438\u0447\u043d\u043e\u0433\u043e \u0440\u0435\u0437\u0435\u0440\u0432\u0438\u0440\u043e\u0432\u0430\u043d\u0438\u044f.",

    h2: "\u0420\u0430\u0437\u0434\u0435\u043b\u0435\u043d\u0438\u0435 \u0430\u043a\u0442\u0438\u0432\u043e\u0432",
    p2: "\u041c\u0435\u0442\u0430\u043b\u043b\u044b \u043a\u043b\u0438\u0435\u043d\u0442\u043e\u0432:",
    p2_1: "\u041f\u043e\u043b\u043d\u043e\u0441\u0442\u044c\u044e \u0440\u0430\u0441\u043f\u0440\u0435\u0434\u0435\u043b\u0435\u043d\u044b",
    p2_2: "\u042e\u0440\u0438\u0434\u0438\u0447\u0435\u0441\u043a\u0438 \u043e\u0431\u043e\u0441\u043e\u0431\u043b\u0435\u043d\u044b",
    p2_3: "\u0425\u0440\u0430\u043d\u044f\u0442\u0441\u044f \u0432\u043d\u0435 \u043a\u043e\u0440\u043f\u043e\u0440\u0430\u0442\u0438\u0432\u043d\u044b\u0445 \u0431\u0430\u043b\u0430\u043d\u0441\u043e\u0432",
    p2_highlight: "\u0410\u043a\u0442\u0438\u0432\u044b \u043a\u043b\u0438\u0435\u043d\u0442\u043e\u0432 \u043d\u0438\u043a\u043e\u0433\u0434\u0430 \u043d\u0435 \u0441\u043c\u0435\u0448\u0438\u0432\u0430\u044e\u0442\u0441\u044f \u0441 \u043a\u043e\u0440\u043f\u043e\u0440\u0430\u0442\u0438\u0432\u043d\u044b\u043c\u0438 \u0441\u0440\u0435\u0434\u0441\u0442\u0432\u0430\u043c\u0438.",

    h3: "\u041d\u0435\u0437\u0430\u0432\u0438\u0441\u0438\u043c\u043e\u0435 \u0445\u0440\u0430\u043d\u0438\u043b\u0438\u0449\u0435",
    p3: "\u041c\u0435\u0442\u0430\u043b\u043b\u044b \u0445\u0440\u0430\u043d\u044f\u0442\u0441\u044f \u0432 \u043f\u0440\u043e\u0444\u0435\u0441\u0441\u0438\u043e\u043d\u0430\u043b\u044c\u043d\u044b\u0445 \u0445\u0440\u0430\u043d\u0438\u043b\u0438\u0449\u0430\u0445, \u0441\u043f\u0440\u043e\u0435\u043a\u0442\u0438\u0440\u043e\u0432\u0430\u043d\u043d\u044b\u0445 \u0434\u043b\u044f \u0441\u043e\u043e\u0442\u0432\u0435\u0442\u0441\u0442\u0432\u0438\u044f \u043c\u0438\u0440\u043e\u0432\u044b\u043c \u0441\u0442\u0430\u043d\u0434\u0430\u0440\u0442\u0430\u043c \u0431\u0435\u0437\u043e\u043f\u0430\u0441\u043d\u043e\u0441\u0442\u0438. \u041e\u043f\u0435\u0440\u0430\u0442\u043e\u0440\u044b \u0445\u0440\u0430\u043d\u0438\u043b\u0438\u0449 \u043e\u0442\u0431\u0438\u0440\u0430\u044e\u0442\u0441\u044f \u043f\u043e\u0441\u0440\u0435\u0434\u0441\u0442\u0432\u043e\u043c \u0442\u0449\u0430\u0442\u0435\u043b\u044c\u043d\u043e\u0439 \u043f\u0440\u043e\u0432\u0435\u0440\u043a\u0438 \u0438 \u0438\u043c\u0435\u044e\u0442 \u043c\u0435\u0436\u0434\u0443\u043d\u0430\u0440\u043e\u0434\u043d\u043e \u043f\u0440\u0438\u0437\u043d\u0430\u043d\u043d\u044b\u0435 \u0441\u0435\u0440\u0442\u0438\u0444\u0438\u043a\u0430\u0442\u044b.",

    h4: "\u0417\u0430\u043f\u0440\u0435\u0442 \u043f\u0435\u0440\u0435\u0437\u0430\u043b\u043e\u0433\u0430",
    p4: "Auxite \u043d\u0435 \u043f\u0440\u0435\u0434\u043e\u0441\u0442\u0430\u0432\u043b\u044f\u0435\u0442 \u0432 \u0437\u0430\u0451\u043c, \u043d\u0435 \u0437\u0430\u043a\u043b\u0430\u0434\u044b\u0432\u0430\u0435\u0442 \u0438 \u043d\u0435 \u043e\u0431\u0440\u0435\u043c\u0435\u043d\u044f\u0435\u0442 \u0438\u043d\u044b\u043c \u043e\u0431\u0440\u0430\u0437\u043e\u043c \u043c\u0435\u0442\u0430\u043b\u043b\u044b \u043a\u043b\u0438\u0435\u043d\u0442\u043e\u0432 \u0431\u0435\u0437 \u044f\u0432\u043d\u043e\u0433\u043e \u0440\u0430\u0437\u0440\u0435\u0448\u0435\u043d\u0438\u044f \u043a\u043b\u0438\u0435\u043d\u0442\u0430.",

    h5: "\u0421\u0442\u0440\u0430\u0445\u043e\u0432\u0430\u043d\u0438\u0435",
    p5: "\u041e\u043f\u0435\u0440\u0430\u0442\u043e\u0440\u044b \u0445\u0440\u0430\u043d\u0438\u043b\u0438\u0449 \u043e\u0431\u044b\u0447\u043d\u043e \u043f\u043e\u0434\u0434\u0435\u0440\u0436\u0438\u0432\u0430\u044e\u0442 \u0441\u0442\u0440\u0430\u0445\u043e\u0432\u043e\u0435 \u043f\u043e\u043a\u0440\u044b\u0442\u0438\u0435, \u0441\u043e\u043e\u0442\u0432\u0435\u0442\u0441\u0442\u0432\u0443\u044e\u0449\u0435\u0435 \u043e\u0442\u0440\u0430\u0441\u043b\u0435\u0432\u044b\u043c \u043f\u0440\u0430\u043a\u0442\u0438\u043a\u0430\u043c. \u041f\u043e\u0434\u0440\u043e\u0431\u043d\u043e\u0441\u0442\u0438 \u043f\u043e\u043a\u0440\u044b\u0442\u0438\u044f \u043f\u0440\u0435\u0434\u043e\u0441\u0442\u0430\u0432\u043b\u044f\u044e\u0442\u0441\u044f \u043f\u043e \u0437\u0430\u043f\u0440\u043e\u0441\u0443.",

    h6: "\u041e\u043f\u0435\u0440\u0430\u0446\u0438\u043e\u043d\u043d\u0430\u044f \u0446\u0435\u043b\u043e\u0441\u0442\u043d\u043e\u0441\u0442\u044c",
    p6: "\u0420\u0435\u0433\u0443\u043b\u044f\u0440\u043d\u044b\u0435 \u043f\u0440\u043e\u0446\u0435\u0434\u0443\u0440\u044b \u0441\u0432\u0435\u0440\u043a\u0438 \u0432\u044b\u043f\u043e\u043b\u043d\u044f\u044e\u0442\u0441\u044f \u0434\u043b\u044f \u043e\u0431\u0435\u0441\u043f\u0435\u0447\u0435\u043d\u0438\u044f \u0441\u043e\u043e\u0442\u0432\u0435\u0442\u0441\u0442\u0432\u0438\u044f \u043c\u0435\u0436\u0434\u0443 \u0437\u0430\u0440\u0435\u0433\u0438\u0441\u0442\u0440\u0438\u0440\u043e\u0432\u0430\u043d\u043d\u044b\u043c \u0432\u043b\u0430\u0434\u0435\u043d\u0438\u0435\u043c \u0438 \u0444\u0438\u0437\u0438\u0447\u0435\u0441\u043a\u0438\u043c\u0438 \u0437\u0430\u043f\u0430\u0441\u0430\u043c\u0438. Auxite \u043f\u043e\u0434\u0434\u0435\u0440\u0436\u0438\u0432\u0430\u0435\u0442 \u043f\u0440\u043e\u0437\u0440\u0430\u0447\u043d\u044b\u0435 \u0441\u0442\u0430\u043d\u0434\u0430\u0440\u0442\u044b \u043e\u0442\u0447\u0451\u0442\u043d\u043e\u0441\u0442\u0438.",

    closing: "\u0425\u0440\u0430\u043d\u0435\u043d\u0438\u0435 \u0440\u0430\u0441\u0441\u043c\u0430\u0442\u0440\u0438\u0432\u0430\u0435\u0442\u0441\u044f \u043a\u0430\u043a \u043e\u0441\u043d\u043e\u0432\u043d\u0430\u044f \u0444\u0438\u043d\u0430\u043d\u0441\u043e\u0432\u0430\u044f \u0438\u043d\u0444\u0440\u0430\u0441\u0442\u0440\u0443\u043a\u0442\u0443\u0440\u0430 \u2014 \u0430 \u043d\u0435 \u0432\u0442\u043e\u0440\u043e\u0441\u0442\u0435\u043f\u0435\u043d\u043d\u0430\u044f \u0443\u0441\u043b\u0443\u0433\u0430.",
    contact: "\u041f\u043e \u0432\u043e\u043f\u0440\u043e\u0441\u0430\u043c \u0445\u0440\u0430\u043d\u0435\u043d\u0438\u044f: custody@auxite.com",
  },
};

export default function CustodyFrameworkPage() {
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

            {/* 1. Allocated Ownership */}
            <h2 className="text-xl font-bold text-slate-800 dark:text-white">{t.h1}</h2>
            <p>{t.p1}</p>

            {/* 2. Asset Segregation */}
            <h2 className="text-xl font-bold text-slate-800 dark:text-white mt-8">{t.h2}</h2>
            <p>{t.p2}</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>{t.p2_1}</li>
              <li>{t.p2_2}</li>
              <li>{t.p2_3}</li>
            </ul>
            <div className="bg-[#BFA181]/10 border border-[#BFA181]/30 rounded-lg p-4">
              <p className="font-semibold text-slate-800 dark:text-white">{t.p2_highlight}</p>
            </div>

            {/* 3. Independent Vaulting */}
            <h2 className="text-xl font-bold text-slate-800 dark:text-white mt-8">{t.h3}</h2>
            <p>{t.p3}</p>

            {/* 4. No Rehypothecation */}
            <h2 className="text-xl font-bold text-slate-800 dark:text-white mt-8">{t.h4}</h2>
            <p>{t.p4}</p>

            {/* 5. Insurance */}
            <h2 className="text-xl font-bold text-slate-800 dark:text-white mt-8">{t.h5}</h2>
            <p>{t.p5}</p>

            {/* 6. Operational Integrity */}
            <h2 className="text-xl font-bold text-slate-800 dark:text-white mt-8">{t.h6}</h2>
            <p>{t.p6}</p>

            {/* Closing */}
            <div className="mt-8 pt-8 border-t border-slate-200 dark:border-slate-700">
              <div className="bg-[#BFA181]/10 border border-[#BFA181]/30 rounded-lg p-4">
                <p className="font-semibold text-slate-800 dark:text-white text-lg">{t.closing}</p>
              </div>
              <p className="mt-4 text-sm text-slate-500">{t.contact}</p>
            </div>
          </div>
        </article>
      </main>
      <ComplianceFooter />
    </div>
  );
}
