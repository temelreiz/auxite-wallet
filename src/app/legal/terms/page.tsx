"use client";
import Link from "next/link";
import TopNav from "@/components/TopNav";

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-stone-100 dark:bg-slate-950">
      <TopNav />
      <main className="max-w-4xl mx-auto px-4 py-8">
        <Link href="/legal" className="inline-flex items-center gap-2 text-emerald-600 hover:underline mb-6">
          ← Back to Legal
        </Link>
        <article className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-8 md:p-12">
          <header className="mb-8 pb-8 border-b border-slate-200 dark:border-slate-700">
            <h1 className="text-3xl font-bold text-slate-800 dark:text-white mb-2">Auxite Platform Terms of Service</h1>
            <p className="text-sm text-slate-500">Effective: January 1, 2025 • Updated: December 20, 2025</p>
          </header>
          <div className="prose prose-slate dark:prose-invert max-w-none space-y-6 text-slate-600 dark:text-slate-300">
            <p>By accessing or using the Auxite platform, you agree to these Terms of Service.</p>
            
            <h2 className="text-xl font-bold text-slate-800 dark:text-white mt-8">1. Definitions</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>"Certificate"</strong> - Digital Allocated Metal Certificate issued by Auxite</li>
              <li><strong>"Tokens"</strong> - Digital assets representing allocated metal ownership</li>
              <li><strong>"Physical Metal"</strong> - Actual bullion bars stored by Auxite custodians</li>
              <li><strong>"Holder"</strong> - User to whom a Certificate is issued</li>
            </ul>

            <h2 className="text-xl font-bold text-slate-800 dark:text-white mt-8">2. Nature of Certificates and Tokens</h2>
            <p>Certificates and Tokens represent an allocation of physical metal. They are NOT securities, investment contracts, deposit accounts, or electronic money.</p>

            <h2 className="text-xl font-bold text-slate-800 dark:text-white mt-8">3. Certificate Validity & Allocation Records</h2>
            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
              <p className="text-sm">Digital Certificates are informational records evidencing allocation. The authoritative record is the Auxite internal ledger and custodian records.</p>
              <p className="text-sm mt-2">Auxite may replace, consolidate, or void certificates in the event of reallocation, consolidation, redemption, or custody changes.</p>
            </div>

            <h2 className="text-xl font-bold text-slate-800 dark:text-white mt-8">4. Custody and Audit</h2>
            <p>Physical metal is stored with Approved Custodians under fully allocated, segregated custody. Auxite engages third-party auditors at regular intervals.</p>

            <h2 className="text-xl font-bold text-slate-800 dark:text-white mt-8">5. Redemption</h2>
            <p>Redemption requests must comply with Auxite's redemption policies. Physical delivery is subject to logistical and regulatory requirements.</p>

            <h2 className="text-xl font-bold text-slate-800 dark:text-white mt-8">6. Limitation of Liability</h2>
            <p>Auxite's total liability shall not exceed the amount paid for related Tokens or Certificates. Auxite is not liable for indirect or consequential damages.</p>

            <h2 className="text-xl font-bold text-slate-800 dark:text-white mt-8">7. Amendments</h2>
            <p>Auxite may update these ToS. Updates are effective upon posting. Continued use constitutes acceptance.</p>
          </div>
        </article>
      </main>
    </div>
  );
}
