"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    // If user is already logged in, redirect to vault
    const token = localStorage.getItem("authToken");
    if (token) {
      setIsLoggedIn(true);
      router.replace("/vault");
    } else {
      setChecked(true);
    }
  }, [router]);

  // Show loading while checking auth
  if (!checked && !isLoggedIn) {
    return (
      <div className="min-h-screen bg-stone-100 dark:bg-zinc-950 flex items-center justify-center">
        <div className="animate-spin w-6 h-6 border-2 border-stone-300 dark:border-zinc-600 border-t-[#BFA181] rounded-full" />
      </div>
    );
  }

  // If logged in, show loading (redirecting)
  if (isLoggedIn) {
    return (
      <div className="min-h-screen bg-stone-100 dark:bg-zinc-950 flex items-center justify-center">
        <div className="animate-spin w-6 h-6 border-2 border-stone-300 dark:border-zinc-600 border-t-[#BFA181] rounded-full" />
      </div>
    );
  }

  // Public landing page for non-authenticated users
  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      {/* Navigation */}
      <nav className="flex items-center justify-between px-6 py-5 max-w-6xl mx-auto">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#BFA181]/15 flex items-center justify-center">
            <svg className="w-5 h-5 text-[#BFA181]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
          <span className="text-xl font-bold text-[#BFA181] tracking-widest">AUXITE</span>
        </div>
        <div className="flex items-center gap-4">
          <Link
            href="/auth/login"
            className="text-sm text-slate-400 hover:text-white transition-colors"
          >
            Sign In
          </Link>
          <Link
            href="/auth/register"
            className="text-sm bg-[#BFA181] text-black font-semibold px-5 py-2.5 rounded-xl hover:bg-[#BFA181]/90 transition-colors"
          >
            Get Started
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="max-w-6xl mx-auto px-6 pt-20 pb-16 text-center">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#BFA181]/10 border border-[#BFA181]/20 mb-8">
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-sm text-[#BFA181]">Secure Digital Asset Custody</span>
        </div>

        <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold leading-tight mb-6">
          Tokenized Precious Metals,{" "}
          <span className="text-[#BFA181]">Secured in Your Vault</span>
        </h1>

        <p className="text-lg text-slate-400 max-w-2xl mx-auto mb-10 leading-relaxed">
          Auxite is a digital asset custody platform for tokenized precious metals.
          Buy, sell, and securely hold digital tokens backed by physical gold, silver,
          platinum, and palladium stored in audited vaults.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            href="/auth/register"
            className="w-full sm:w-auto px-8 py-4 bg-[#BFA181] text-black font-bold rounded-xl hover:bg-[#BFA181]/90 transition-colors text-base"
          >
            Open Your Vault
          </Link>
          <Link
            href="/auth/login"
            className="w-full sm:w-auto px-8 py-4 bg-zinc-900 border border-zinc-800 text-white font-semibold rounded-xl hover:bg-zinc-800 transition-colors text-base"
          >
            Client Sign In
          </Link>
        </div>
      </section>

      {/* Features Grid */}
      <section className="max-w-6xl mx-auto px-6 py-16">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Feature 1 */}
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6">
            <div className="w-12 h-12 rounded-xl bg-amber-500/10 flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold mb-2">Physical Metal Backed</h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              Every token is backed by allocated physical precious metals stored in secure, audited vaults.
            </p>
          </div>

          {/* Feature 2 */}
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold mb-2">Institutional Custody</h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              Enterprise-grade security with multi-signature wallets, 2FA authentication, and encrypted storage.
            </p>
          </div>

          {/* Feature 3 */}
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6">
            <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold mb-2">Trade 24/7</h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              Buy, sell, and exchange tokenized gold, silver, platinum, and palladium around the clock.
            </p>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="max-w-6xl mx-auto px-6 py-16">
        <h2 className="text-2xl font-bold text-center mb-12">How Auxite Works</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {[
            { step: "1", title: "Create Account", desc: "Sign up with email or Google and complete identity verification." },
            { step: "2", title: "Fund Your Vault", desc: "Deposit funds via bank transfer, crypto, or supported payment methods." },
            { step: "3", title: "Buy Metals", desc: "Purchase tokenized gold, silver, platinum, or palladium at live market prices." },
            { step: "4", title: "Hold or Redeem", desc: "Securely hold tokens in your vault or request physical metal delivery." },
          ].map((item) => (
            <div key={item.step} className="text-center">
              <div className="w-10 h-10 rounded-full bg-[#BFA181]/20 text-[#BFA181] font-bold flex items-center justify-center mx-auto mb-4">
                {item.step}
              </div>
              <h3 className="font-semibold mb-2">{item.title}</h3>
              <p className="text-sm text-slate-400">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-zinc-800 mt-16">
        <div className="max-w-6xl mx-auto px-6 py-10">
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
              <Link href="/privacy" className="hover:text-white transition-colors">
                Privacy Policy
              </Link>
              <Link href="/legal" className="hover:text-white transition-colors">
                Legal
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
