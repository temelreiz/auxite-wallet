"use client";
import Link from "next/link";
import TopNav from "@/components/TopNav";

export default function RedemptionPage() {
  return (
    <div className="min-h-screen bg-stone-100 dark:bg-slate-950">
      <TopNav />
      <main className="max-w-4xl mx-auto px-4 py-8">
        <Link href="/legal" className="inline-flex items-center gap-2 text-emerald-600 hover:underline mb-6">
          ← Back to Legal
        </Link>
        <article className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-8 md:p-12">
          <header className="mb-8 pb-8 border-b border-slate-200 dark:border-slate-700">
            <h1 className="text-3xl font-bold text-slate-800 dark:text-white mb-2">Redemption Policy</h1>
            <p className="text-lg text-slate-600 dark:text-slate-400">Physical Metal Redemption Terms</p>
            <p className="text-sm text-slate-500 mt-2">Effective: January 1, 2025 • Updated: December 20, 2025</p>
          </header>
          <div className="prose prose-slate dark:prose-invert max-w-none space-y-6 text-slate-600 dark:text-slate-300">
            <h2 className="text-xl font-bold text-slate-800 dark:text-white">1. Purpose</h2>
            <p>This policy governs conditions for redemption and delivery of physically allocated precious metals.</p>

            <h2 className="text-xl font-bold text-slate-800 dark:text-white mt-8">2. Eligibility</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>Completed KYC/AML verification</li>
              <li>Meets minimum redemption thresholds</li>
              <li>Allocated metal is in Redeemable status</li>
              <li>No legal or compliance restrictions</li>
            </ul>

            <h2 className="text-xl font-bold text-slate-800 dark:text-white mt-8">3. Minimum Amounts</h2>
            <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-4">
              <ul className="space-y-2">
                <li><strong>Gold (AUXG):</strong> Minimum 1 bar size</li>
                <li><strong>Silver (AUXS):</strong> Standard silver bar</li>
                <li><strong>Platinum/Palladium:</strong> Subject to availability</li>
              </ul>
            </div>

            <h2 className="text-xl font-bold text-slate-800 dark:text-white mt-8">4. Process</h2>
            <ol className="list-decimal pl-6 space-y-2">
              <li>Submit redemption request</li>
              <li>Tokens are locked</li>
              <li>Status updated to Pending Redemption</li>
              <li>Custodian confirmation obtained</li>
              <li>Metal prepared for pickup or delivery</li>
              <li>Tokens burned upon completion</li>
            </ol>

            <h2 className="text-xl font-bold text-slate-800 dark:text-white mt-8">5. Fees</h2>
            <p>Redemption may incur: vault handling fees, logistics/insurance costs, customs charges. All fees disclosed prior to confirmation.</p>

            <h2 className="text-xl font-bold text-slate-800 dark:text-white mt-8">6. Certificate Status</h2>
            <p>Upon successful redemption, certificates are marked as Redeemed, become void, and allocation records are archived.</p>
          </div>
        </article>
      </main>
    </div>
  );
}
