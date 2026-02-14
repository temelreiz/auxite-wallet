"use client";
import Link from "next/link";
import TopNav from "@/components/TopNav";
import ComplianceFooter from "@/components/ComplianceFooter";
import { useLanguage } from "@/components/LanguageContext";

const translations: Record<string, Record<string, string>> = {
  tr: {
    backToLegal: "\u2190 Yasal Belgelere Dön",
    title: "AML ve CFT Politikası",
    subtitle: "Auxite Uyumluluk Çerçevesi",
    effective: "Yürürlük: 1 Ocak 2025 \u2022 Güncelleme: 14 Şubat 2026",

    h1: "Politika Beyanı",
    p1: "Auxite, mali suç önleme ve düzenleyici bütünlük konusunda en yüksek standartları korumaya kararlıdır. Şirket, altyapısının yasadışı faaliyetler için kötüye kullanılmasını önlemek amacıyla risk tabanlı bir Kara Para Aklama (AML) ve Terörizmin Finansmanının Önlenmesi (CFT) programı oluşturmuştur.",
    p1b: "Auxite, uluslararası kabul görmüş standartlar ve en iyi uygulamalarla uyumlu iç kontroller, durum tespiti prosedürleri ve sürekli izleme uygulamaları uygulamaktadır.",

    h2: "Düzenleyici Uyum",
    p2: "Auxite'in uyumluluk çerçevesi, küresel olarak tanınan ilkelerden yararlanmaktadır:",
    p2_1: "Mali Eylem Görev Gücü (FATF) Tavsiyeleri",
    p2_2: "Wolfsberg Grubu İlkeleri",
    p2_3: "Basel AML Kılavuzları",
    p2_4: "Uygulanabilir uluslararası yaptırım rejimleri",
    p2_post: "Auxite, gelişen düzenleyici beklentilerle uyumlu kalmak için politikalarını sürekli olarak değerlendirmektedir.",

    h3: "Risk Tabanlı Yaklaşım",
    p3: "Auxite, birden fazla boyutta risk değerlendirmesi yapan risk tabanlı bir uyumluluk modeli işletmektedir:",
    p3_1: "Müşteri riski",
    p3_2: "Yargı yetkisi riski",
    p3_3: "İşlemsel davranış",
    p3_4: "Ürün riski",
    p3_5: "Karşı taraf riski",
    p3_post: "Yüksek risk faktörleri tespit edildiğinde Geliştirilmiş Durum Tespiti (EDD) önlemleri uygulanır.",

    h4: "Müşteri Durum Tespiti (KYC)",
    p4: "Auxite, işlem yeteneklerini etkinleştirmeden önce Müşterini Tanı (KYC) prosedürleri uygular.",
    h4a: "Bireysel Müşteriler",
    p4a: "Doğrulama önlemleri şunları içerebilir:",
    p4a_1: "Devlet tarafından verilen kimlik doğrulaması",
    p4a_2: "Adres doğrulaması",
    p4a_3: "Fon kaynağı doğrulaması",
    p4a_4: "Siyasi Açıdan Korunan Kişi (PEP) taraması",
    p4a_5: "Yaptırım kontrolleri",
    h4b: "Kurumsal Müşteriler",
    p4b: "Ek kontroller şunları içerebilir:",
    p4b_1: "Ticaret sicil belgeleri",
    p4b_2: "Nihai Fayda Sahibi (UBO) tespiti",
    p4b_3: "Yetkili imza sahibi doğrulaması",
    p4b_4: "İş faaliyeti doğrulaması",
    p4_post: "Auxite, gerekli gördüğünde ek belge talep etme hakkını saklı tutar.",

    h5: "Yaptırım Taraması",
    p5: "Auxite, müşterileri ve ilgili işlemleri başlıca küresel yaptırım listelerine karşı tarar:",
    p5_1: "ABD Yabancı Varlık Kontrolü Ofisi (OFAC)",
    p5_2: "Avrupa Birliği Konsolide Listesi",
    p5_3: "Birleşik Krallık HM Hazinesi",
    p5_4: "Birleşmiş Milletler Yaptırımları",
    p5_post: "Eşleşmeler, kayıt reddi, hesap kısıtlaması veya daha fazla inceleme için eskalasyonla sonuçlanabilir.",

    h6: "İşlem İzleme",
    p6: "Auxite, olağandışı veya şüpheli faaliyetleri tespit etmek için tasarlanmış izleme kontrolleri sürdürmektedir.",
    p6_intro: "Risk göstergeleri şunları içerebilir:",
    p6_1: "Olağandışı işlem hacimleri",
    p6_2: "Düzensiz fonlama kalıpları",
    p6_3: "Yüksek riskli yargı yetkileri",
    p6_4: "Yapılandırma davranışları",
    p6_post: "Uygun görüldüğünde, faaliyet geçerli yükümlülüklere uygun olarak incelenebilir, kısıtlanabilir veya raporlanabilir.",

    h7: "Kayıt Saklama",
    p7: "Auxite, müşteri ve işlem kayıtlarını geçerli yasal ve operasyonel gereksinimlere uygun olarak saklar.",

    h8: "Yönetişim ve Gözetim",
    p8: "Uyumluluk, Auxite içinde temel bir operasyonel işlev olarak ele alınmaktadır. Uyumluluk çerçevesi, düzenleyici gelişmeleri ve operasyonel büyümeyi yansıtmak üzere periyodik olarak gözden geçirilir ve iyileştirilir.",

    h9: "Eğitim ve Farkındalık",
    p9: "İlgili personelin, mali suç risklerinin farkında olması ve firmanın AML/CFT hedeflerini desteklemek üzere tasarlanmış iç prosedürlere uyması beklenmektedir.",

    h10: "Kurumsal Standartlara Bağlılık",
    p10: "Auxite, kurumsal karşı taraflar ve küresel mali piyasa katılımcıları tarafından beklenen uyumluluk standartlarında faaliyet göstermeye kararlıdır.",
    p10b: "Şirket, platform geliştikçe uyumluluk altyapısını güçlendirmeye devam etmektedir.",

    closing: "Auxite, mali suçlara karşı sıfır tolerans yaklaşımı benimsemekte ve tüm platform katılımcıları için güvenli ve güvenilir bir ortam sağlamaya kendini adamaktadır.",
    contact: "Uyumluluk soruları için: compliance@auxite.com",
  },
  en: {
    backToLegal: "\u2190 Back to Legal",
    title: "AML & CFT Policy",
    subtitle: "Auxite Compliance Framework",
    effective: "Effective: January 1, 2025 \u2022 Updated: February 14, 2026",

    h1: "Policy Statement",
    p1: "Auxite is committed to maintaining the highest standards of financial crime prevention and regulatory integrity. The company has established a risk-based Anti-Money Laundering (AML) and Counter-Terrorist Financing (CFT) program designed to prevent the misuse of its infrastructure for illicit activities.",
    p1b: "Auxite applies internal controls, due diligence procedures, and ongoing monitoring practices aligned with internationally recognized standards and best practices.",

    h2: "Regulatory Alignment",
    p2: "Auxite's compliance framework is informed by globally recognized principles, including:",
    p2_1: "Financial Action Task Force (FATF) Recommendations",
    p2_2: "Wolfsberg Group Principles",
    p2_3: "Basel AML Guidelines",
    p2_4: "Applicable international sanctions regimes",
    p2_post: "Auxite continuously evaluates its policies to remain aligned with evolving regulatory expectations.",

    h3: "Risk-Based Approach",
    p3: "Auxite operates a risk-based compliance model that assesses exposure across multiple dimensions, including:",
    p3_1: "Client risk",
    p3_2: "Jurisdictional risk",
    p3_3: "Transactional behavior",
    p3_4: "Product risk",
    p3_5: "Counterparty risk",
    p3_post: "Enhanced Due Diligence (EDD) measures are applied where elevated risk factors are identified.",

    h4: "Client Due Diligence (KYC)",
    p4: "Auxite conducts Know-Your-Client (KYC) procedures prior to enabling transactional capabilities.",
    h4a: "Individual Clients",
    p4a: "Verification measures may include:",
    p4a_1: "Government-issued identification",
    p4a_2: "Proof of address",
    p4a_3: "Source of funds verification",
    p4a_4: "Politically Exposed Person (PEP) screening",
    p4a_5: "Sanctions checks",
    h4b: "Corporate Clients",
    p4b: "Additional controls may include:",
    p4b_1: "Corporate registration documents",
    p4b_2: "Ultimate Beneficial Owner (UBO) identification",
    p4b_3: "Authorized signatory verification",
    p4b_4: "Business activity validation",
    p4_post: "Auxite reserves the right to request supplementary documentation where necessary.",

    h5: "Sanctions Screening",
    p5: "Auxite screens clients and relevant transactions against major global sanctions lists, including:",
    p5_1: "U.S. Office of Foreign Assets Control (OFAC)",
    p5_2: "European Union Consolidated List",
    p5_3: "UK HM Treasury",
    p5_4: "United Nations Sanctions",
    p5_post: "Matches may result in onboarding rejection, account restriction, or escalation for further review.",

    h6: "Transaction Monitoring",
    p6: "Auxite maintains monitoring controls designed to identify unusual or suspicious activity.",
    p6_intro: "Risk indicators may include:",
    p6_1: "Unusual transaction volumes",
    p6_2: "Irregular funding patterns",
    p6_3: "High-risk jurisdictions",
    p6_4: "Structuring behaviors",
    p6_post: "Where appropriate, activity may be reviewed, restricted, or reported in accordance with applicable obligations.",

    h7: "Record Retention",
    p7: "Auxite maintains client and transaction records in accordance with applicable legal and operational requirements.",

    h8: "Governance and Oversight",
    p8: "Compliance is treated as a core operational function within Auxite. The compliance framework is periodically reviewed and enhanced to reflect regulatory developments and operational growth.",

    h9: "Training and Awareness",
    p9: "Relevant personnel are expected to maintain awareness of financial crime risks and comply with internal procedures designed to support the firm's AML/CFT objectives.",

    h10: "Commitment to Institutional Standards",
    p10: "Auxite is committed to operating at the compliance standards expected by institutional counterparties and global financial market participants.",
    p10b: "The company continues to strengthen its compliance infrastructure as the platform evolves.",

    closing: "Auxite maintains a zero-tolerance approach toward financial crime and is dedicated to providing a secure and trusted environment for all platform participants.",
    contact: "For compliance inquiries: compliance@auxite.com",
  },
  de: {
    backToLegal: "\u2190 Zurück zu Rechtliches",
    title: "AML- und CFT-Richtlinie",
    subtitle: "Auxite Compliance-Rahmenwerk",
    effective: "Gültig ab: 1. Januar 2025 \u2022 Aktualisiert: 14. Februar 2026",

    h1: "Grundsatzerklärung",
    p1: "Auxite verpflichtet sich, die höchsten Standards der Finanzkriminalitätsprävention und regulatorischen Integrität aufrechtzuerhalten. Das Unternehmen hat ein risikobasiertes Programm zur Bekämpfung von Geldwäsche (AML) und Terrorismusfinanzierung (CFT) eingerichtet, um den Missbrauch seiner Infrastruktur für illegale Aktivitäten zu verhindern.",
    p1b: "Auxite wendet interne Kontrollen, Sorgfaltspflichtverfahren und laufende Überwachungspraktiken an, die mit international anerkannten Standards und Best Practices übereinstimmen.",

    h2: "Regulatorische Ausrichtung",
    p2: "Das Compliance-Rahmenwerk von Auxite orientiert sich an weltweit anerkannten Prinzipien, darunter:",
    p2_1: "Empfehlungen der Financial Action Task Force (FATF)",
    p2_2: "Wolfsberg-Gruppen-Prinzipien",
    p2_3: "Baseler AML-Richtlinien",
    p2_4: "Anwendbare internationale Sanktionsregime",
    p2_post: "Auxite bewertet seine Richtlinien kontinuierlich, um mit den sich entwickelnden regulatorischen Erwartungen in Einklang zu bleiben.",

    h3: "Risikobasierter Ansatz",
    p3: "Auxite betreibt ein risikobasiertes Compliance-Modell, das die Exposition über mehrere Dimensionen bewertet:",
    p3_1: "Kundenrisiko",
    p3_2: "Jurisdiktionsrisiko",
    p3_3: "Transaktionsverhalten",
    p3_4: "Produktrisiko",
    p3_5: "Kontrahentenrisiko",
    p3_post: "Verstärkte Sorgfaltspflichtmaßnahmen (EDD) werden angewendet, wenn erhöhte Risikofaktoren identifiziert werden.",

    h4: "Kunden-Sorgfaltspflicht (KYC)",
    p4: "Auxite führt Know-Your-Client (KYC) Verfahren durch, bevor Transaktionsfähigkeiten aktiviert werden.",
    h4a: "Einzelkunden",
    p4a: "Verifizierungsmaßnahmen können umfassen:",
    p4a_1: "Amtliche Ausweisdokumente",
    p4a_2: "Adressnachweis",
    p4a_3: "Mittelherkunftsnachweis",
    p4a_4: "Politisch exponierte Person (PEP) Screening",
    p4a_5: "Sanktionsprüfungen",
    h4b: "Unternehmenskunden",
    p4b: "Zusätzliche Kontrollen können umfassen:",
    p4b_1: "Handelsregisterauszüge",
    p4b_2: "Identifizierung des wirtschaftlich Berechtigten (UBO)",
    p4b_3: "Verifizierung bevollmächtigter Unterzeichner",
    p4b_4: "Validierung der Geschäftstätigkeit",
    p4_post: "Auxite behält sich das Recht vor, bei Bedarf ergänzende Dokumentation anzufordern.",

    h5: "Sanktions-Screening",
    p5: "Auxite überprüft Kunden und relevante Transaktionen gegen wichtige globale Sanktionslisten:",
    p5_1: "U.S. Office of Foreign Assets Control (OFAC)",
    p5_2: "Konsolidierte Liste der Europäischen Union",
    p5_3: "UK HM Treasury",
    p5_4: "Vereinte Nationen Sanktionen",
    p5_post: "Übereinstimmungen können zur Ablehnung des Onboardings, Kontobeschränkung oder Eskalation zur weiteren Überprüfung führen.",

    h6: "Transaktionsüberwachung",
    p6: "Auxite unterhält Überwachungskontrollen zur Erkennung ungewöhnlicher oder verdächtiger Aktivitäten.",
    p6_intro: "Risikoindikatoren können umfassen:",
    p6_1: "Ungewöhnliche Transaktionsvolumen",
    p6_2: "Irreguläre Finanzierungsmuster",
    p6_3: "Hochrisiko-Jurisdiktionen",
    p6_4: "Strukturierungsverhalten",
    p6_post: "Gegebenenfalls kann die Aktivität in Übereinstimmung mit geltenden Verpflichtungen überprüft, eingeschränkt oder gemeldet werden.",

    h7: "Aufbewahrungspflichten",
    p7: "Auxite bewahrt Kunden- und Transaktionsaufzeichnungen gemäß den geltenden rechtlichen und betrieblichen Anforderungen auf.",

    h8: "Governance und Aufsicht",
    p8: "Compliance wird innerhalb von Auxite als zentrale betriebliche Funktion behandelt. Das Compliance-Rahmenwerk wird regelmäßig überprüft und verbessert, um regulatorische Entwicklungen und operatives Wachstum widerzuspiegeln.",

    h9: "Schulung und Bewusstsein",
    p9: "Von relevantem Personal wird erwartet, dass es sich der Risiken der Finanzkriminalität bewusst ist und die internen Verfahren einhält, die zur Unterstützung der AML/CFT-Ziele des Unternehmens entwickelt wurden.",

    h10: "Verpflichtung zu institutionellen Standards",
    p10: "Auxite verpflichtet sich, die Compliance-Standards zu erfüllen, die von institutionellen Gegenparteien und globalen Finanzmarktteilnehmern erwartet werden.",
    p10b: "Das Unternehmen stärkt weiterhin seine Compliance-Infrastruktur, während sich die Plattform weiterentwickelt.",

    closing: "Auxite verfolgt einen Null-Toleranz-Ansatz gegenüber Finanzkriminalität und ist der Bereitstellung einer sicheren und vertrauenswürdigen Umgebung für alle Plattformteilnehmer verpflichtet.",
    contact: "Für Compliance-Anfragen: compliance@auxite.com",
  },
  fr: {
    backToLegal: "\u2190 Retour aux documents légaux",
    title: "Politique AML et CFT",
    subtitle: "Cadre de Conformité Auxite",
    effective: "En vigueur : 1er janvier 2025 \u2022 Mis à jour : 14 février 2026",

    h1: "Déclaration de politique",
    p1: "Auxite s'engage à maintenir les plus hauts standards de prévention de la criminalité financière et d'intégrité réglementaire. L'entreprise a établi un programme anti-blanchiment (AML) et de lutte contre le financement du terrorisme (CFT) basé sur les risques, conçu pour prévenir l'utilisation abusive de son infrastructure à des fins illicites.",
    p1b: "Auxite applique des contrôles internes, des procédures de diligence raisonnable et des pratiques de surveillance continue conformes aux normes et meilleures pratiques internationalement reconnues.",

    h2: "Alignement réglementaire",
    p2: "Le cadre de conformité d'Auxite s'appuie sur des principes mondialement reconnus, notamment :",
    p2_1: "Recommandations du Groupe d'action financière (GAFI)",
    p2_2: "Principes du Groupe de Wolfsberg",
    p2_3: "Lignes directrices AML de Bâle",
    p2_4: "Régimes de sanctions internationales applicables",
    p2_post: "Auxite évalue continuellement ses politiques pour rester alignée avec les attentes réglementaires en évolution.",

    h3: "Approche basée sur les risques",
    p3: "Auxite exploite un modèle de conformité basé sur les risques qui évalue l'exposition sur plusieurs dimensions :",
    p3_1: "Risque client",
    p3_2: "Risque juridictionnel",
    p3_3: "Comportement transactionnel",
    p3_4: "Risque produit",
    p3_5: "Risque de contrepartie",
    p3_post: "Des mesures de diligence renforcée (EDD) sont appliquées lorsque des facteurs de risque élevés sont identifiés.",

    h4: "Diligence Client (KYC)",
    p4: "Auxite effectue des procédures KYC avant d'activer les capacités transactionnelles.",
    h4a: "Clients individuels",
    p4a: "Les mesures de vérification peuvent inclure :",
    p4a_1: "Pièce d'identité délivrée par le gouvernement",
    p4a_2: "Justificatif de domicile",
    p4a_3: "Vérification de l'origine des fonds",
    p4a_4: "Filtrage des personnes politiquement exposées (PEP)",
    p4a_5: "Contrôles de sanctions",
    h4b: "Clients entreprises",
    p4b: "Des contrôles supplémentaires peuvent inclure :",
    p4b_1: "Documents d'immatriculation de l'entreprise",
    p4b_2: "Identification du bénéficiaire effectif ultime (UBO)",
    p4b_3: "Vérification du signataire autorisé",
    p4b_4: "Validation de l'activité commerciale",
    p4_post: "Auxite se réserve le droit de demander des documents complémentaires si nécessaire.",

    h5: "Filtrage des sanctions",
    p5: "Auxite filtre les clients et les transactions pertinentes contre les principales listes de sanctions mondiales :",
    p5_1: "Bureau du contrôle des avoirs étrangers des États-Unis (OFAC)",
    p5_2: "Liste consolidée de l'Union européenne",
    p5_3: "Trésorerie HM du Royaume-Uni",
    p5_4: "Sanctions des Nations Unies",
    p5_post: "Les correspondances peuvent entraîner le rejet de l'intégration, la restriction du compte ou l'escalade pour examen approfondi.",

    h6: "Surveillance des transactions",
    p6: "Auxite maintient des contrôles de surveillance conçus pour identifier les activités inhabituelles ou suspectes.",
    p6_intro: "Les indicateurs de risque peuvent inclure :",
    p6_1: "Volumes de transactions inhabituels",
    p6_2: "Schémas de financement irréguliers",
    p6_3: "Juridictions à haut risque",
    p6_4: "Comportements de structuration",
    p6_post: "Le cas échéant, l'activité peut être examinée, restreinte ou signalée conformément aux obligations applicables.",

    h7: "Conservation des documents",
    p7: "Auxite conserve les dossiers clients et transactionnels conformément aux exigences légales et opérationnelles applicables.",

    h8: "Gouvernance et supervision",
    p8: "La conformité est traitée comme une fonction opérationnelle centrale au sein d'Auxite. Le cadre de conformité est périodiquement revu et amélioré pour refléter les évolutions réglementaires et la croissance opérationnelle.",

    h9: "Formation et sensibilisation",
    p9: "Le personnel concerné est tenu de maintenir une connaissance des risques de criminalité financière et de se conformer aux procédures internes conçues pour soutenir les objectifs AML/CFT de l'entreprise.",

    h10: "Engagement envers les standards institutionnels",
    p10: "Auxite s'engage à opérer aux standards de conformité attendus par les contreparties institutionnelles et les participants des marchés financiers mondiaux.",
    p10b: "L'entreprise continue de renforcer son infrastructure de conformité à mesure que la plateforme évolue.",

    closing: "Auxite maintient une approche de tolérance zéro envers la criminalité financière et se consacre à fournir un environnement sûr et fiable pour tous les participants de la plateforme.",
    contact: "Pour les questions de conformité : compliance@auxite.com",
  },
  ar: {
    backToLegal: "\u2190 العودة إلى الوثائق القانونية",
    title: "سياسة مكافحة غسل الأموال وتمويل الإرهاب",
    subtitle: "إطار الامتثال لدى Auxite",
    effective: "ساري المفعول: 1 يناير 2025 \u2022 محدث: 14 فبراير 2026",

    h1: "بيان السياسة",
    p1: "تلتزم Auxite بالحفاظ على أعلى معايير منع الجرائم المالية والنزاهة التنظيمية. أنشأت الشركة برنامجًا قائمًا على المخاطر لمكافحة غسل الأموال (AML) وتمويل الإرهاب (CFT) مصممًا لمنع إساءة استخدام بنيتها التحتية للأنشطة غير المشروعة.",
    p1b: "تطبق Auxite ضوابط داخلية وإجراءات العناية الواجبة وممارسات المراقبة المستمرة المتوافقة مع المعايير الدولية المعترف بها وأفضل الممارسات.",

    h2: "التوافق التنظيمي",
    p2: "يستند إطار الامتثال لدى Auxite إلى مبادئ معترف بها عالميًا، بما في ذلك:",
    p2_1: "توصيات مجموعة العمل المالي (FATF)",
    p2_2: "مبادئ مجموعة وولفسبيرغ",
    p2_3: "إرشادات بازل لمكافحة غسل الأموال",
    p2_4: "أنظمة العقوبات الدولية المعمول بها",
    p2_post: "تقوم Auxite بتقييم سياساتها باستمرار لتبقى متوافقة مع التوقعات التنظيمية المتطورة.",

    h3: "النهج القائم على المخاطر",
    p3: "تدير Auxite نموذج امتثال قائم على المخاطر يقيّم التعرض عبر أبعاد متعددة:",
    p3_1: "مخاطر العميل",
    p3_2: "مخاطر الولاية القضائية",
    p3_3: "السلوك المعاملاتي",
    p3_4: "مخاطر المنتج",
    p3_5: "مخاطر الطرف المقابل",
    p3_post: "تُطبق إجراءات العناية الواجبة المعززة (EDD) عند تحديد عوامل خطر مرتفعة.",

    h4: "العناية الواجبة للعميل (KYC)",
    p4: "تجري Auxite إجراءات اعرف عميلك (KYC) قبل تمكين القدرات المعاملاتية.",
    h4a: "العملاء الأفراد",
    p4a: "قد تشمل إجراءات التحقق:",
    p4a_1: "إثبات الهوية الصادر عن الحكومة",
    p4a_2: "إثبات العنوان",
    p4a_3: "التحقق من مصدر الأموال",
    p4a_4: "فحص الأشخاص المعرضين سياسيًا (PEP)",
    p4a_5: "فحوصات العقوبات",
    h4b: "العملاء من الشركات",
    p4b: "قد تشمل الضوابط الإضافية:",
    p4b_1: "وثائق تسجيل الشركة",
    p4b_2: "تحديد المستفيد النهائي (UBO)",
    p4b_3: "التحقق من المفوض بالتوقيع",
    p4b_4: "التحقق من النشاط التجاري",
    p4_post: "تحتفظ Auxite بالحق في طلب وثائق تكميلية عند الضرورة.",

    h5: "فحص العقوبات",
    p5: "تقوم Auxite بفحص العملاء والمعاملات ذات الصلة مقابل قوائم العقوبات العالمية الرئيسية:",
    p5_1: "مكتب مراقبة الأصول الأجنبية الأمريكي (OFAC)",
    p5_2: "القائمة الموحدة للاتحاد الأوروبي",
    p5_3: "خزانة صاحبة الجلالة في المملكة المتحدة",
    p5_4: "عقوبات الأمم المتحدة",
    p5_post: "قد تؤدي المطابقات إلى رفض التسجيل أو تقييد الحساب أو التصعيد لمزيد من المراجعة.",

    h6: "مراقبة المعاملات",
    p6: "تحتفظ Auxite بضوابط مراقبة مصممة لتحديد النشاط غير المعتاد أو المشبوه.",
    p6_intro: "قد تشمل مؤشرات المخاطر:",
    p6_1: "أحجام معاملات غير معتادة",
    p6_2: "أنماط تمويل غير منتظمة",
    p6_3: "ولايات قضائية عالية المخاطر",
    p6_4: "سلوكيات الهيكلة",
    p6_post: "عند الاقتضاء، قد يتم مراجعة النشاط أو تقييده أو الإبلاغ عنه وفقًا للالتزامات المعمول بها.",

    h7: "الاحتفاظ بالسجلات",
    p7: "تحتفظ Auxite بسجلات العملاء والمعاملات وفقًا للمتطلبات القانونية والتشغيلية المعمول بها.",

    h8: "الحوكمة والإشراف",
    p8: "يُعامل الامتثال كوظيفة تشغيلية أساسية داخل Auxite. يتم مراجعة إطار الامتثال وتحسينه دوريًا ليعكس التطورات التنظيمية والنمو التشغيلي.",

    h9: "التدريب والتوعية",
    p9: "يُتوقع من الموظفين المعنيين الحفاظ على الوعي بمخاطر الجرائم المالية والامتثال للإجراءات الداخلية المصممة لدعم أهداف AML/CFT للشركة.",

    h10: "الالتزام بالمعايير المؤسسية",
    p10: "تلتزم Auxite بالعمل وفق معايير الامتثال المتوقعة من الأطراف المقابلة المؤسسية والمشاركين في الأسواق المالية العالمية.",
    p10b: "تواصل الشركة تعزيز بنيتها التحتية للامتثال مع تطور المنصة.",

    closing: "تتبنى Auxite نهج عدم التسامح المطلق تجاه الجرائم المالية وتكرس نفسها لتوفير بيئة آمنة وموثوقة لجميع المشاركين في المنصة.",
    contact: "لاستفسارات الامتثال: compliance@auxite.com",
  },
  ru: {
    backToLegal: "\u2190 Назад к правовым документам",
    title: "Политика AML и CFT",
    subtitle: "Система соответствия Auxite",
    effective: "Действует с: 1 января 2025 \u2022 Обновлено: 14 февраля 2026",

    h1: "Заявление о политике",
    p1: "Auxite стремится поддерживать наивысшие стандарты предотвращения финансовых преступлений и нормативной целостности. Компания разработала программу противодействия отмыванию денег (AML) и финансированию терроризма (CFT) на основе рисков, направленную на предотвращение злоупотребления её инфраструктурой в незаконных целях.",
    p1b: "Auxite применяет внутренние механизмы контроля, процедуры должной осмотрительности и практики непрерывного мониторинга, соответствующие международно признанным стандартам и лучшим практикам.",

    h2: "Нормативное соответствие",
    p2: "Система соответствия Auxite основана на глобально признанных принципах, включая:",
    p2_1: "Рекомендации Группы разработки финансовых мер борьбы с отмыванием денег (FATF)",
    p2_2: "Принципы Вольфсбергской группы",
    p2_3: "Базельские рекомендации по AML",
    p2_4: "Применимые международные санкционные режимы",
    p2_post: "Auxite постоянно оценивает свои политики для соответствия меняющимся нормативным ожиданиям.",

    h3: "Риск-ориентированный подход",
    p3: "Auxite применяет риск-ориентированную модель соответствия, оценивающую риски по нескольким направлениям:",
    p3_1: "Клиентский риск",
    p3_2: "Юрисдикционный риск",
    p3_3: "Транзакционное поведение",
    p3_4: "Продуктовый риск",
    p3_5: "Контрагентский риск",
    p3_post: "Меры усиленной проверки (EDD) применяются при выявлении повышенных факторов риска.",

    h4: "Проверка клиентов (KYC)",
    p4: "Auxite проводит процедуры «Знай своего клиента» (KYC) до активации транзакционных возможностей.",
    h4a: "Физические лица",
    p4a: "Меры верификации могут включать:",
    p4a_1: "Удостоверение личности государственного образца",
    p4a_2: "Подтверждение адреса",
    p4a_3: "Проверка источника средств",
    p4a_4: "Скрининг политически значимых лиц (PEP)",
    p4a_5: "Проверки по санкционным спискам",
    h4b: "Корпоративные клиенты",
    p4b: "Дополнительные проверки могут включать:",
    p4b_1: "Документы о регистрации компании",
    p4b_2: "Идентификация конечного бенефициарного владельца (UBO)",
    p4b_3: "Верификация уполномоченных подписантов",
    p4b_4: "Подтверждение деловой активности",
    p4_post: "Auxite оставляет за собой право запрашивать дополнительную документацию при необходимости.",

    h5: "Скрининг санкций",
    p5: "Auxite проверяет клиентов и соответствующие транзакции по основным мировым санкционным спискам:",
    p5_1: "Управление по контролю за иностранными активами США (OFAC)",
    p5_2: "Консолидированный список Европейского Союза",
    p5_3: "Казначейство Её Величества Великобритании",
    p5_4: "Санкции Организации Объединённых Наций",
    p5_post: "Совпадения могут привести к отказу в регистрации, ограничению счёта или эскалации для дополнительной проверки.",

    h6: "Мониторинг транзакций",
    p6: "Auxite поддерживает механизмы мониторинга, предназначенные для выявления необычной или подозрительной активности.",
    p6_intro: "Индикаторы риска могут включать:",
    p6_1: "Необычные объёмы транзакций",
    p6_2: "Нерегулярные модели финансирования",
    p6_3: "Юрисдикции высокого риска",
    p6_4: "Поведение структурирования",
    p6_post: "При необходимости деятельность может быть проверена, ограничена или сообщена в соответствии с применимыми обязательствами.",

    h7: "Хранение записей",
    p7: "Auxite хранит записи о клиентах и транзакциях в соответствии с применимыми правовыми и операционными требованиями.",

    h8: "Управление и надзор",
    p8: "Соответствие рассматривается как основная операционная функция в Auxite. Система соответствия периодически пересматривается и совершенствуется с учётом нормативных изменений и операционного роста.",

    h9: "Обучение и осведомлённость",
    p9: "От соответствующего персонала ожидается осведомлённость о рисках финансовых преступлений и соблюдение внутренних процедур, разработанных для поддержки целей AML/CFT компании.",

    h10: "Приверженность институциональным стандартам",
    p10: "Auxite стремится работать в соответствии со стандартами соответствия, ожидаемыми институциональными контрагентами и участниками глобальных финансовых рынков.",
    p10b: "Компания продолжает укреплять свою инфраструктуру соответствия по мере развития платформы.",

    closing: "Auxite придерживается подхода нулевой терпимости к финансовым преступлениям и стремится обеспечить безопасную и надёжную среду для всех участников платформы.",
    contact: "По вопросам соответствия: compliance@auxite.com",
  },
};

export default function AMLPage() {
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

            {/* 1. Policy Statement */}
            <h2 className="text-xl font-bold text-slate-800 dark:text-white">{t.h1}</h2>
            <p>{t.p1}</p>
            <p>{t.p1b}</p>

            {/* 2. Regulatory Alignment */}
            <h2 className="text-xl font-bold text-slate-800 dark:text-white mt-8">{t.h2}</h2>
            <p>{t.p2}</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>{t.p2_1}</li>
              <li>{t.p2_2}</li>
              <li>{t.p2_3}</li>
              <li>{t.p2_4}</li>
            </ul>
            <p className="text-sm italic text-slate-500 dark:text-slate-400">{t.p2_post}</p>

            {/* 3. Risk-Based Approach */}
            <h2 className="text-xl font-bold text-slate-800 dark:text-white mt-8">{t.h3}</h2>
            <p>{t.p3}</p>
            <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-4 space-y-2">
              <p><span className="inline-block w-3 h-3 rounded-full bg-emerald-500 mr-2" />{t.p3_1}</p>
              <p><span className="inline-block w-3 h-3 rounded-full bg-amber-500 mr-2" />{t.p3_2}</p>
              <p><span className="inline-block w-3 h-3 rounded-full bg-red-500 mr-2" />{t.p3_3}</p>
              <p><span className="inline-block w-3 h-3 rounded-full bg-blue-500 mr-2" />{t.p3_4}</p>
              <p><span className="inline-block w-3 h-3 rounded-full bg-purple-500 mr-2" />{t.p3_5}</p>
            </div>
            <p>{t.p3_post}</p>

            {/* 4. Client Due Diligence (KYC) */}
            <h2 className="text-xl font-bold text-slate-800 dark:text-white mt-8">{t.h4}</h2>
            <p>{t.p4}</p>

            <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-200 mt-4">{t.h4a}</h3>
            <p>{t.p4a}</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>{t.p4a_1}</li>
              <li>{t.p4a_2}</li>
              <li>{t.p4a_3}</li>
              <li>{t.p4a_4}</li>
              <li>{t.p4a_5}</li>
            </ul>

            <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-200 mt-4">{t.h4b}</h3>
            <p>{t.p4b}</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>{t.p4b_1}</li>
              <li>{t.p4b_2}</li>
              <li>{t.p4b_3}</li>
              <li>{t.p4b_4}</li>
            </ul>
            <p className="text-sm italic text-slate-500 dark:text-slate-400">{t.p4_post}</p>

            {/* 5. Sanctions Screening */}
            <h2 className="text-xl font-bold text-slate-800 dark:text-white mt-8">{t.h5}</h2>
            <p>{t.p5}</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>{t.p5_1}</li>
              <li>{t.p5_2}</li>
              <li>{t.p5_3}</li>
              <li>{t.p5_4}</li>
            </ul>
            <p>{t.p5_post}</p>

            {/* 6. Transaction Monitoring */}
            <h2 className="text-xl font-bold text-slate-800 dark:text-white mt-8">{t.h6}</h2>
            <p>{t.p6}</p>
            <p>{t.p6_intro}</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>{t.p6_1}</li>
              <li>{t.p6_2}</li>
              <li>{t.p6_3}</li>
              <li>{t.p6_4}</li>
            </ul>
            <p>{t.p6_post}</p>

            {/* 7. Record Retention */}
            <h2 className="text-xl font-bold text-slate-800 dark:text-white mt-8">{t.h7}</h2>
            <p>{t.p7}</p>

            {/* 8. Governance and Oversight */}
            <h2 className="text-xl font-bold text-slate-800 dark:text-white mt-8">{t.h8}</h2>
            <p>{t.p8}</p>

            {/* 9. Training and Awareness */}
            <h2 className="text-xl font-bold text-slate-800 dark:text-white mt-8">{t.h9}</h2>
            <p>{t.p9}</p>

            {/* 10. Commitment to Institutional Standards */}
            <h2 className="text-xl font-bold text-slate-800 dark:text-white mt-8">{t.h10}</h2>
            <div className="bg-[#BFA181]/10 border border-[#BFA181]/30 rounded-lg p-4">
              <p className="font-semibold text-slate-800 dark:text-white">{t.p10}</p>
              <p className="mt-2">{t.p10b}</p>
            </div>

            {/* Closing */}
            <div className="mt-8 pt-8 border-t border-slate-200 dark:border-slate-700">
              <p className="font-semibold text-slate-800 dark:text-white text-lg">{t.closing}</p>
              <p className="mt-4 text-sm text-slate-500">{t.contact}</p>
            </div>
          </div>
        </article>
      </main>
      <ComplianceFooter />
    </div>
  );
}
