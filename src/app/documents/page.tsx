"use client";

import { useState } from "react";
import TopNav from "@/components/TopNav";
import { useLanguage } from "@/components/LanguageContext";

// ============================================
// DOCUMENT VAULT - Private Bank Grade
// Allocation certificates, custody statements, etc.
// ============================================

const translations: Record<string, Record<string, string>> = {
  tr: {
    title: "Belge Kasası",
    subtitle: "Tahsis sertifikaları, saklama özetleri ve yasal belgeler",
    categories: "Kategoriler",
    all: "Tümü",
    allocationCertificates: "Tahsis Sertifikaları",
    custodyStatements: "Saklama Özetleri",
    yieldContracts: "Getiri Sözleşmeleri",
    taxDocuments: "Vergi Belgeleri",
    auditLetters: "Denetim Mektupları",
    preview: "Önizleme",
    download: "İndir",
    noDocuments: "Henüz belge yok",
    generated: "Oluşturulma",
    fileSize: "Boyut",
    documentType: "Belge Türü",
  },
  en: {
    title: "Document Vault",
    subtitle: "Allocation certificates, custody statements, and legal documents",
    categories: "Categories",
    all: "All",
    allocationCertificates: "Allocation Certificates",
    custodyStatements: "Custody Statements",
    yieldContracts: "Yield Contracts",
    taxDocuments: "Tax Documents",
    auditLetters: "Audit Letters",
    preview: "Preview",
    download: "Download",
    noDocuments: "No documents yet",
    generated: "Generated",
    fileSize: "Size",
    documentType: "Document Type",
  },
};

const mockDocuments = [
  {
    id: "DOC-2026-001",
    type: "allocationCertificates",
    name: "Gold Allocation Certificate - February 2026",
    date: "2026-02-07",
    size: "245 KB",
    format: "PDF",
  },
  {
    id: "DOC-2026-002",
    type: "custodyStatements",
    name: "Monthly Custody Statement - January 2026",
    date: "2026-02-01",
    size: "512 KB",
    format: "PDF",
  },
  {
    id: "DOC-2026-003",
    type: "yieldContracts",
    name: "Yield Program Agreement - Q1 2026",
    date: "2026-01-15",
    size: "128 KB",
    format: "PDF",
  },
  {
    id: "DOC-2025-004",
    type: "taxDocuments",
    name: "Annual Tax Statement - 2025",
    date: "2026-01-10",
    size: "892 KB",
    format: "PDF",
  },
  {
    id: "DOC-2025-005",
    type: "auditLetters",
    name: "Independent Audit Confirmation - 2025",
    date: "2025-12-15",
    size: "156 KB",
    format: "PDF",
  },
];

export default function DocumentsPage() {
  const { lang } = useLanguage();
  const t = translations[lang] || translations.en;

  const [filter, setFilter] = useState("all");
  const [selectedDoc, setSelectedDoc] = useState<string | null>(null);

  const categories = [
    { key: "all", label: t.all, icon: "📁" },
    { key: "allocationCertificates", label: t.allocationCertificates, icon: "📜" },
    { key: "custodyStatements", label: t.custodyStatements, icon: "📊" },
    { key: "yieldContracts", label: t.yieldContracts, icon: "📝" },
    { key: "taxDocuments", label: t.taxDocuments, icon: "🧾" },
    { key: "auditLetters", label: t.auditLetters, icon: "✅" },
  ];

  const filteredDocs = filter === "all"
    ? mockDocuments
    : mockDocuments.filter((doc) => doc.type === filter);

  const getCategoryLabel = (type: string) => {
    const cat = categories.find((c) => c.key === type);
    return cat ? cat.label : type;
  };

  return (
    <div className="min-h-screen bg-stone-100 dark:bg-slate-950">
      <TopNav />

      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-slate-800 dark:text-white mb-2">{t.title}</h1>
          <p className="text-slate-600 dark:text-slate-400">{t.subtitle}</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sidebar - Categories */}
          <div className="lg:col-span-1">
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-stone-200 dark:border-slate-800 p-4 sticky top-4">
              <h3 className="text-xs font-semibold text-slate-500 mb-4">{t.categories}</h3>
              <div className="space-y-1">
                {categories.map((cat) => (
                  <button
                    key={cat.key}
                    onClick={() => setFilter(cat.key)}
                    className={`w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                      filter === cat.key
                        ? "bg-amber-500/20 text-amber-600 dark:text-amber-400"
                        : "text-slate-600 dark:text-slate-400 hover:bg-stone-100 dark:hover:bg-slate-800"
                    }`}
                  >
                    <span>{cat.icon}</span>
                    <span>{cat.label}</span>
                    <span className={`ml-auto text-xs ${filter === cat.key ? "text-amber-500" : "text-slate-400"}`}>
                      {cat.key === "all"
                        ? mockDocuments.length
                        : mockDocuments.filter((d) => d.type === cat.key).length}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Main - Documents Grid */}
          <div className="lg:col-span-3">
            {filteredDocs.length === 0 ? (
              <div className="bg-white dark:bg-slate-900 rounded-xl border border-stone-200 dark:border-slate-800 p-12 text-center">
                <svg className="w-16 h-16 text-slate-300 dark:text-slate-600 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <p className="text-slate-500 dark:text-slate-400">{t.noDocuments}</p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredDocs.map((doc) => (
                  <div
                    key={doc.id}
                    className="bg-white dark:bg-slate-900 rounded-xl border border-stone-200 dark:border-slate-800 p-4 hover:border-amber-500/50 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      {/* Document Icon */}
                      <div className="w-12 h-12 rounded-lg bg-red-500/10 flex items-center justify-center flex-shrink-0">
                        <svg className="w-6 h-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </div>

                      {/* Document Info */}
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-semibold text-slate-800 dark:text-white truncate">{doc.name}</h4>
                        <div className="flex items-center gap-4 mt-1">
                          <span className="text-xs text-slate-500">{t.documentType}: {getCategoryLabel(doc.type)}</span>
                          <span className="text-xs text-slate-500">{t.generated}: {doc.date}</span>
                          <span className="text-xs text-slate-500">{t.fileSize}: {doc.size}</span>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setSelectedDoc(doc.id)}
                          className="px-3 py-2 text-sm font-medium text-slate-600 dark:text-slate-400 bg-stone-100 dark:bg-slate-800 rounded-lg hover:bg-stone-200 dark:hover:bg-slate-700 transition-colors"
                        >
                          {t.preview}
                        </button>
                        <button className="px-3 py-2 text-sm font-medium text-white bg-amber-500 rounded-lg hover:bg-amber-600 transition-colors flex items-center gap-1">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                          </svg>
                          {t.download}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Preview Modal */}
      {selectedDoc && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-3xl w-full max-h-[80vh] overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-stone-200 dark:border-slate-800">
              <h3 className="font-semibold text-slate-800 dark:text-white">Document Preview</h3>
              <button
                onClick={() => setSelectedDoc(null)}
                className="p-2 hover:bg-stone-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
              >
                <svg className="w-5 h-5 text-slate-600 dark:text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-8 flex items-center justify-center min-h-[400px]">
              <div className="text-center">
                <svg className="w-16 h-16 text-slate-300 dark:text-slate-600 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <p className="text-slate-500 dark:text-slate-400">Document preview would appear here</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
