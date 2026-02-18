"use client";
import Link from "next/link";
import TopNav from "@/components/TopNav";
import ComplianceFooter from "@/components/ComplianceFooter";
import { useLanguage } from "@/components/LanguageContext";

const translations: Record<string, Record<string, string>> = {
  tr: {
    title: "Hesap Silme",
    subtitle: "Hesabınızı ve ilişkili verilerinizi silme talebi",
    intro:
      "Auxite Vault hesabınızı ve ilişkili tüm verilerinizi silmek istiyorsanız aşağıdaki adımları takip edin.",
    heading1: "1. Hesap Silme Talebi",
    para1:
      "Hesabınızı silmek için destek ekibimize e-posta gönderin. Talebiniz 30 iş günü içinde işleme alınacaktır.",
    heading2: "2. Silinecek Veriler",
    data1: "Kişisel bilgiler (ad, e-posta adresi)",
    data2: "Cüzdan adresleri ve bağlantıları",
    data3: "Push bildirim token'ları",
    data4: "Cihaz bilgileri ve oturum verileri",
    data5: "Uygulama tercihleri ve ayarları",
    heading3: "3. Saklanan Veriler",
    para3:
      "Yasal düzenlemeler (AML/KYC) gereği aşağıdaki veriler yasal saklama süresi boyunca muhafaza edilebilir:",
    retain1: "İşlem geçmişi kayıtları",
    retain2: "Kimlik doğrulama belgeleri",
    retain3: "Finansal uyum kayıtları",
    heading4: "4. İletişim",
    para4: "Hesap silme talebinizi aşağıdaki adrese gönderin:",
    email: "support@auxite.io",
    emailSubject: "Konu: Hesap Silme Talebi",
    note: "Not: Hesap silme işlemi geri alınamaz. Hesabınızdaki tüm varlıkları silme talebinden önce çekmenizi öneririz.",
  },
  en: {
    title: "Account Deletion",
    subtitle: "Request deletion of your account and associated data",
    intro:
      "If you wish to delete your Auxite Vault account and all associated data, please follow the steps below.",
    heading1: "1. Deletion Request",
    para1:
      "To delete your account, send an email to our support team. Your request will be processed within 30 business days.",
    heading2: "2. Data to be Deleted",
    data1: "Personal information (name, email address)",
    data2: "Wallet addresses and connections",
    data3: "Push notification tokens",
    data4: "Device information and session data",
    data5: "Application preferences and settings",
    heading3: "3. Retained Data",
    para3:
      "Due to legal regulations (AML/KYC), the following data may be retained for the legally required period:",
    retain1: "Transaction history records",
    retain2: "Identity verification documents",
    retain3: "Financial compliance records",
    heading4: "4. Contact",
    para4: "Send your account deletion request to:",
    email: "support@auxite.io",
    emailSubject: "Subject: Account Deletion Request",
    note: "Note: Account deletion is irreversible. We recommend withdrawing all assets from your account before submitting a deletion request.",
  },
};

export default function AccountDeletionPage() {
  const { lang } = useLanguage();
  const t = translations[lang] || translations.en;

  return (
    <div className="min-h-screen bg-[#0B1420] text-white">
      <TopNav />
      <main className="max-w-3xl mx-auto px-6 py-12">
        <Link
          href="/"
          className="text-[#BFA181] hover:underline text-sm mb-6 inline-block"
        >
          ← {lang === "tr" ? "Ana Sayfa" : "Home"}
        </Link>

        <h1 className="text-3xl font-bold mb-2">{t.title}</h1>
        <p className="text-gray-400 mb-8">{t.subtitle}</p>
        <p className="text-gray-300 mb-8">{t.intro}</p>

        {/* Section 1 */}
        <h2 className="text-xl font-semibold text-[#BFA181] mb-3">
          {t.heading1}
        </h2>
        <p className="text-gray-300 mb-6">{t.para1}</p>

        {/* Section 2 */}
        <h2 className="text-xl font-semibold text-[#BFA181] mb-3">
          {t.heading2}
        </h2>
        <ul className="list-disc list-inside text-gray-300 space-y-1 mb-6">
          <li>{t.data1}</li>
          <li>{t.data2}</li>
          <li>{t.data3}</li>
          <li>{t.data4}</li>
          <li>{t.data5}</li>
        </ul>

        {/* Section 3 */}
        <h2 className="text-xl font-semibold text-[#BFA181] mb-3">
          {t.heading3}
        </h2>
        <p className="text-gray-300 mb-3">{t.para3}</p>
        <ul className="list-disc list-inside text-gray-300 space-y-1 mb-6">
          <li>{t.retain1}</li>
          <li>{t.retain2}</li>
          <li>{t.retain3}</li>
        </ul>

        {/* Section 4 */}
        <h2 className="text-xl font-semibold text-[#BFA181] mb-3">
          {t.heading4}
        </h2>
        <p className="text-gray-300 mb-3">{t.para4}</p>
        <a
          href="mailto:support@auxite.io?subject=Account%20Deletion%20Request"
          className="inline-block bg-[#BFA181] text-[#0B1420] font-semibold px-6 py-3 rounded-lg hover:bg-[#D4B896] transition mb-3"
        >
          {t.email}
        </a>
        <p className="text-gray-500 text-sm mb-6">{t.emailSubject}</p>

        <div className="bg-yellow-900/20 border border-yellow-700/30 rounded-lg p-4">
          <p className="text-yellow-200 text-sm">⚠️ {t.note}</p>
        </div>
      </main>
      <ComplianceFooter />
    </div>
  );
}
