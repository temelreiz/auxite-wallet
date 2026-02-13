"use client";

import Link from "next/link";

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      {/* Navigation */}
      <nav className="flex items-center justify-between px-6 py-5 max-w-4xl mx-auto">
        <Link href="/" className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#BFA181]/15 flex items-center justify-center">
            <svg className="w-5 h-5 text-[#BFA181]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
          <span className="text-xl font-bold text-[#BFA181] tracking-widest">AUXITE</span>
        </Link>
        <Link
          href="/"
          className="text-sm text-slate-400 hover:text-white transition-colors"
        >
          &larr; Home
        </Link>
      </nav>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-6 py-12">
        <h1 className="text-3xl font-bold mb-2">Privacy Policy</h1>
        <p className="text-sm text-slate-400 mb-10">Effective: January 1, 2025 &bull; Last Updated: February 2025</p>

        <div className="space-y-8 text-slate-300 leading-relaxed">
          {/* 1 */}
          <section>
            <h2 className="text-xl font-semibold text-white mb-3">1. Introduction</h2>
            <p>
              Auxite (&quot;we&quot;, &quot;our&quot;, or &quot;the Platform&quot;) is committed to protecting the privacy of
              our users. This Privacy Policy explains how we collect, use, disclose, and safeguard your
              information when you use the Auxite digital asset custody platform.
            </p>
          </section>

          {/* 2 */}
          <section>
            <h2 className="text-xl font-semibold text-white mb-3">2. Information We Collect</h2>
            <p className="mb-3">We may collect the following types of information:</p>
            <ul className="list-disc list-inside space-y-2 text-sm">
              <li><strong className="text-white">Account Information:</strong> Name, email address, phone number, and authentication credentials when you create an account.</li>
              <li><strong className="text-white">Identity Verification:</strong> Government-issued identification documents and related data as required by KYC (Know Your Customer) regulations.</li>
              <li><strong className="text-white">Transaction Data:</strong> Records of purchases, sales, transfers, and other transactions conducted on the platform.</li>
              <li><strong className="text-white">Device Information:</strong> Device type, operating system, browser type, and IP address for security purposes.</li>
              <li><strong className="text-white">Usage Data:</strong> How you interact with our platform, including pages visited and features used.</li>
            </ul>
          </section>

          {/* 3 */}
          <section>
            <h2 className="text-xl font-semibold text-white mb-3">3. How We Use Your Information</h2>
            <ul className="list-disc list-inside space-y-2 text-sm">
              <li>To create and manage your account and digital vault.</li>
              <li>To process transactions and maintain accurate records.</li>
              <li>To comply with legal and regulatory requirements, including KYC and AML obligations.</li>
              <li>To protect the security of your account and the platform.</li>
              <li>To communicate with you about your account, transactions, and platform updates.</li>
              <li>To improve our services and user experience.</li>
            </ul>
          </section>

          {/* 4 */}
          <section>
            <h2 className="text-xl font-semibold text-white mb-3">4. Data Sharing and Disclosure</h2>
            <p className="mb-3">We do not sell your personal information. We may share information with:</p>
            <ul className="list-disc list-inside space-y-2 text-sm">
              <li><strong className="text-white">Custodians and Auditors:</strong> To verify metal allocations and conduct required audits.</li>
              <li><strong className="text-white">Regulatory Authorities:</strong> When required by law or regulation.</li>
              <li><strong className="text-white">Service Providers:</strong> Third-party services that help us operate the platform (e.g., email delivery, identity verification), under strict data protection agreements.</li>
            </ul>
          </section>

          {/* 5 */}
          <section>
            <h2 className="text-xl font-semibold text-white mb-3">5. Data Security</h2>
            <p>
              We implement industry-standard security measures including encryption, secure data storage,
              two-factor authentication, and regular security audits to protect your information. Despite our
              efforts, no method of transmission over the Internet is 100% secure, and we cannot guarantee
              absolute security.
            </p>
          </section>

          {/* 6 */}
          <section>
            <h2 className="text-xl font-semibold text-white mb-3">6. Data Retention</h2>
            <p>
              We retain your personal information for as long as your account is active and as required by
              applicable laws and regulations. Transaction records may be retained for extended periods as
              required by financial regulations.
            </p>
          </section>

          {/* 7 */}
          <section>
            <h2 className="text-xl font-semibold text-white mb-3">7. Your Rights</h2>
            <p className="mb-3">Depending on your jurisdiction, you may have the right to:</p>
            <ul className="list-disc list-inside space-y-2 text-sm">
              <li>Access the personal data we hold about you.</li>
              <li>Request correction of inaccurate data.</li>
              <li>Request deletion of your data, subject to legal retention requirements.</li>
              <li>Object to or restrict certain processing of your data.</li>
              <li>Request a copy of your data in a portable format.</li>
            </ul>
          </section>

          {/* 8 */}
          <section>
            <h2 className="text-xl font-semibold text-white mb-3">8. Cookies and Tracking</h2>
            <p>
              We use essential cookies for authentication and security purposes. We do not use third-party
              advertising or tracking cookies. Analytics data is collected in an anonymized form to help
              improve our platform.
            </p>
          </section>

          {/* 9 */}
          <section>
            <h2 className="text-xl font-semibold text-white mb-3">9. Changes to This Policy</h2>
            <p>
              We may update this Privacy Policy from time to time. Changes will be posted on this page with
              an updated effective date. Continued use of the platform after changes constitutes acceptance
              of the updated policy.
            </p>
          </section>

          {/* 10 */}
          <section>
            <h2 className="text-xl font-semibold text-white mb-3">10. Contact Us</h2>
            <p>
              If you have questions about this Privacy Policy or your personal data, please contact us
              at <a href="mailto:support@auxite.io" className="text-[#BFA181] hover:underline">support@auxite.io</a>.
            </p>
          </section>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-zinc-800 mt-16">
        <div className="max-w-4xl mx-auto px-6 py-10">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-[#BFA181]/15 flex items-center justify-center">
                <svg className="w-4 h-4 text-[#BFA181]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <span className="font-bold text-[#BFA181] tracking-widest text-sm">AUXITE</span>
            </div>

            <div className="flex items-center gap-6 text-sm text-slate-400">
              <Link href="/legal/terms" className="hover:text-white transition-colors">
                Terms of Service
              </Link>
              <Link href="/privacy-policy" className="hover:text-white transition-colors">
                Privacy Policy
              </Link>
              <Link href="/" className="hover:text-white transition-colors">
                Home
              </Link>
            </div>

            <p className="text-xs text-slate-500">
              &copy; {new Date().getFullYear()} Auxite. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
