"use client";
import Link from "next/link";
import TopNav from "@/components/TopNav";
import { useLanguage } from "@/components/LanguageContext";

const legalDocs = [
  {
    title: "Terms of Service",
    titleTr: "Kullanım Koşulları",
    description: "Platform usage terms, token and certificate definitions, liability limitations",
    href: "/legal/terms",
    icon: "📜",
    updated: "December 20, 2025",
  },
  {
    title: "Redemption Policy",
    titleTr: "Geri Ödeme Politikası",
    description: "Physical metal redemption terms, eligibility, fees, and delivery process",
    href: "/legal/redemption",
    icon: "📦",
    updated: "December 20, 2025",
  },
];

export default function LegalPage() {
  const { lang } = useLanguage();
  const isTr = lang === 'tr';

  return (
    <div className="min-h-screen bg-stone-100 dark:bg-slate-950">
      <TopNav />
      <main className="max-w-4xl mx-auto px-4 py-8">
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-slate-800 dark:text-white mb-2">
            {isTr ? 'Yasal Belgeler' : 'Legal Documents'}
          </h1>
          <p className="text-slate-600 dark:text-slate-400">
            {isTr ? 'Auxite platform politikaları ve yasal belgeler' : 'Auxite platform policies and legal documentation'}
          </p>
        </header>
        <div className="grid gap-4">
          {legalDocs.map((doc) => (
            <Link key={doc.href} href={doc.href} className="block bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 hover:border-[#2F6F62] hover:shadow-lg transition-all">
              <div className="flex items-start gap-4">
                <span className="text-3xl">{doc.icon}</span>
                <div className="flex-1">
                  <h2 className="text-lg font-semibold text-slate-800 dark:text-white">{isTr ? doc.titleTr : doc.title}</h2>
                  <p className="text-slate-600 dark:text-slate-400 text-sm mt-1">{doc.description}</p>
                  <p className="text-xs text-slate-400 mt-2">Updated: {doc.updated}</p>
                </div>
                <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </Link>
          ))}
        </div>
      </main>
    </div>
  );
}
