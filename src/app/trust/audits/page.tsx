"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import TopNav from "@/components/TopNav";
import { useLanguage } from "@/components/LanguageContext";

const translations = {
  tr: {
    title: "Denetim Raporları",
    subtitle: "Güvenlik ve rezerv denetimlerinin durumu",
    backToTrust: "Güven Merkezine Dön",
    upcomingAudits: "Planlanan Denetimler",
    completedAudits: "Tamamlanan Denetimler",
    auditor: "Denetçi",
    scope: "Kapsam",
    status: "Durum",
    date: "Tarih",
    viewReport: "Raporu Görüntüle",
    launchPhaseNotice: "Launch Phase Bildirimi",
    launchPhaseDesc: "Platform şu anda launch aşamasındadır. İlk denetimler canlı yayına geçtikten sonra planlanacaktır.",
    scheduled: "Planlandı",
    inProgress: "Devam Ediyor",
    completed: "Tamamlandı",
    reserveAudit: "Rezerv Denetimi",
    securityAudit: "Güvenlik Denetimi",
    smartContractAudit: "Akıllı Sözleşme Denetimi",
    complianceAudit: "Uyumluluk Denetimi",
    noReportsYet: "Henüz denetim raporu bulunmamaktadır",
    tbd: "Henüz atanmadı",
    plannedNote: "Aşağıdaki denetimler planlanmıştır. Hiçbir denetim firması henüz görevlendirilmemiş veya sözleşme imzalamamıştır; firma adları sözleşme imzalandığında yayınlanacaktır.",
    comingSoon: "Yakında",
  },
  en: {
    title: "Audit Reports",
    subtitle: "Status of security and reserve audits",
    backToTrust: "Back to Trust Center",
    upcomingAudits: "Upcoming Audits",
    completedAudits: "Completed Audits",
    auditor: "Auditor",
    scope: "Scope",
    status: "Status",
    date: "Date",
    viewReport: "View Report",
    launchPhaseNotice: "Launch Phase Notice",
    launchPhaseDesc: "Platform is currently in launch phase. First audits will be scheduled once we go live.",
    scheduled: "Scheduled",
    inProgress: "In Progress",
    completed: "Completed",
    reserveAudit: "Reserve Audit",
    securityAudit: "Security Audit",
    smartContractAudit: "Smart Contract Audit",
    complianceAudit: "Compliance Audit",
    noReportsYet: "No audit reports available yet",
    tbd: "Not yet appointed",
    plannedNote: "The audits below are planned. No audit firm has been engaged or signed an agreement to date; firm names will be published once an engagement is executed.",
    comingSoon: "Coming Soon",
  },
};

const plannedAudits = [
  { auditor: "tbd", scope: "reserveAudit", status: "scheduled", date: "Q2 2026" },
  { auditor: "tbd", scope: "smartContractAudit", status: "scheduled", date: "Q2 2026" },
  { auditor: "tbd", scope: "securityAudit", status: "scheduled", date: "Q3 2026" },
  { auditor: "tbd", scope: "complianceAudit", status: "scheduled", date: "Q3 2026" },
];


export default function AuditsPage() {
  const { lang } = useLanguage();
  const t = translations[lang as keyof typeof translations] || translations.en;

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed": return "bg-[#2F6F62]/10 text-[#2F6F62] dark:text-[#2F6F62]";
      case "inProgress": return "bg-blue-500/10 text-blue-600 dark:text-blue-400";
      case "scheduled": return "bg-[#BFA181]/10 text-[#BFA181] dark:text-[#BFA181]";
      default: return "bg-slate-500/10 text-slate-600 dark:text-slate-400";
    }
  };

  return (
    <div className="min-h-screen bg-stone-100 dark:bg-slate-950">
      <TopNav />
      
      <main className="max-w-6xl mx-auto px-4 py-8">
        {/* Back Link */}
        <Link href="/trust-center" className="inline-flex items-center gap-2 text-[#2F6F62] dark:text-[#2F6F62] hover:underline mb-6">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          {t.backToTrust}
        </Link>

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-800 dark:text-white mb-2">{t.title}</h1>
          <p className="text-slate-600 dark:text-slate-400">{t.subtitle}</p>
        </div>

        {/* Launch Phase Notice */}
        <div className="bg-[#BFA181]/10 border border-[#BFA181]/30 rounded-xl p-6 mb-8">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-full bg-[#BFA181]/20 flex items-center justify-center flex-shrink-0">
              <svg className="w-6 h-6 text-[#BFA181]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <h3 className="font-semibold text-[#BFA181] dark:text-[#BFA181] mb-1">{t.launchPhaseNotice}</h3>
              <p className="text-[#BFA181] dark:text-[#BFA181] text-sm">{t.launchPhaseDesc}</p>
            </div>
          </div>
        </div>

        {/* Upcoming Audits */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-slate-800 dark:text-white mb-2">{t.upcomingAudits}</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-4 max-w-3xl">{t.plannedNote}</p>
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-stone-200 dark:border-slate-800 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-stone-50 dark:bg-slate-800/50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">{t.auditor}</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">{t.scope}</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">{t.status}</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">{t.date}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-200 dark:divide-slate-800">
                  {plannedAudits.map((audit, idx) => (
                    <tr key={idx}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="font-medium text-slate-800 dark:text-white">{t[audit.auditor as keyof typeof t] ?? audit.auditor}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-slate-600 dark:text-slate-400">{t[audit.scope as keyof typeof t]}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${getStatusColor(audit.status)}`}>
                          {t[audit.status as keyof typeof t]}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-slate-600 dark:text-slate-400">
                        {audit.date}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Completed Audits */}
        <div>
          <h2 className="text-xl font-semibold text-slate-800 dark:text-white mb-4">{t.completedAudits}</h2>
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-stone-200 dark:border-slate-800 p-8 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
              <svg className="w-8 h-8 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-slate-800 dark:text-white mb-2">{t.noReportsYet}</h3>
            <p className="text-slate-500 dark:text-slate-400 text-sm max-w-md mx-auto">
              {t.launchPhaseDesc}
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
