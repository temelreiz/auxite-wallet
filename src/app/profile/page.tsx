"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { useAccount } from "wagmi";
import { ConnectKitButton } from "connectkit";
import { KYCVerification } from "@/components/KYCVerification";

const STORAGE_KEYS = {
  WALLET_ADDRESS: "auxite_wallet_address",
  WALLET_MODE: "auxite_wallet_mode",
  SESSION_UNLOCKED: "auxite_session_unlocked",
  LANGUAGE: "auxite_language",
};

export default function ProfilePage() {
  const [lang, setLang] = useState<"tr" | "en">("tr");
  const [activeTab, setActiveTab] = useState<"profile" | "kyc" | "notifications">("profile");
  
  // Wallet states
  const { isConnected: isExternalConnected, address: externalAddress } = useAccount();
  const [localWalletAddress, setLocalWalletAddress] = useState<string | null>(null);
  const [walletMode, setWalletMode] = useState<string | null>(null);
  const [isSessionUnlocked, setIsSessionUnlocked] = useState(false);
  
  // Notification preferences
  const [notifPrefs, setNotifPrefs] = useState({
    priceAlerts: true,
    transactions: true,
    security: true,
    marketing: false,
    email: true,
    push: true,
  });

  useEffect(() => {
    const savedLang = localStorage.getItem(STORAGE_KEYS.LANGUAGE) as "tr" | "en" | null;
    const savedMode = localStorage.getItem(STORAGE_KEYS.WALLET_MODE);
    const localAddress = localStorage.getItem(STORAGE_KEYS.WALLET_ADDRESS);
    const sessionUnlocked = sessionStorage.getItem(STORAGE_KEYS.SESSION_UNLOCKED);

    if (savedLang) setLang(savedLang);
    setWalletMode(savedMode);
    if (localAddress) setLocalWalletAddress(localAddress);
    if (sessionUnlocked === "true") setIsSessionUnlocked(true);
  }, []);

  const handleLanguageChange = (newLang: "tr" | "en") => {
    setLang(newLang);
    localStorage.setItem(STORAGE_KEYS.LANGUAGE, newLang);
  };

  const currentAddress = walletMode === "local" ? localWalletAddress : externalAddress;
  const isWalletConnected = 
    (walletMode === "local" && !!localWalletAddress && isSessionUnlocked) || 
    (walletMode === "external" && isExternalConnected);

  const tabs = [
    { id: "profile", label: lang === "tr" ? "Profil" : "Profile" },
    { id: "kyc", label: lang === "tr" ? "Kimlik Doğrulama" : "KYC Verification" },
    { id: "notifications", label: lang === "tr" ? "Bildirimler" : "Notifications" },
  ];

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      {/* Top Navigation */}
      <div className="border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            {/* Left Side - Logo + Navigation */}
            <div className="flex items-center gap-5">
              <Link href="/">
                <Image
                  src="/auxite-wallet-logo.png"
                  alt="Auxite"
                  width={160}
                  height={40}
                  className="h-12 w-auto"
                />
              </Link>
              <div className="flex gap-2">
                <Link
                  href="/"
                  className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium text-sm transition-colors"
                >
                  {lang === "tr" ? "Piyasalar" : "Markets"}
                </Link>
                <Link
                  href="/earn"
                  className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium text-sm transition-colors"
                >
                  {lang === "tr" ? "Kazan" : "Earn"}
                </Link>
                <Link
                  href="/wallet"
                  className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium text-sm transition-colors"
                >
                  {lang === "tr" ? "Cüzdan" : "Wallet"}
                </Link>
                <Link
                  href="/profile"
                  className="px-4 py-1.5 rounded-lg bg-emerald-500 text-white font-medium text-sm"
                >
                  {lang === "tr" ? "Profil" : "Profile"}
                </Link>
              </div>
            </div>

            {/* Right Side */}
            <div className="flex items-center gap-3">
              <div className="flex gap-0.5 bg-slate-800 rounded-lg p-0.5">
                <button
                  onClick={() => handleLanguageChange("tr")}
                  className={`px-2.5 py-1 rounded text-sm font-medium transition-colors ${
                    lang === "tr" ? "bg-emerald-500 text-white" : "text-slate-400 hover:text-slate-300"
                  }`}
                >
                  TR
                </button>
                <button
                  onClick={() => handleLanguageChange("en")}
                  className={`px-2.5 py-1 rounded text-sm font-medium transition-colors ${
                    lang === "en" ? "bg-emerald-500 text-white" : "text-slate-400 hover:text-slate-300"
                  }`}
                >
                  EN
                </button>
              </div>
              {walletMode === "local" && localWalletAddress && isSessionUnlocked ? (
                <div className="flex items-center gap-2 px-3 py-2 bg-slate-800 rounded-lg border border-slate-700">
                  <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                  <span className="text-sm text-slate-300 font-mono">
                    {localWalletAddress.slice(0, 6)}...{localWalletAddress.slice(-4)}
                  </span>
                </div>
              ) : (
                <ConnectKitButton />
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Page Header */}
      <div className="border-b border-slate-800 bg-slate-900/30">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <h2 className="text-lg font-semibold text-slate-100 mb-1">
            {lang === "tr" ? "Hesap Ayarları" : "Account Settings"}
          </h2>
          <p className="text-sm text-slate-400">
            {lang === "tr"
              ? "Profil, kimlik doğrulama ve bildirim ayarlarınızı yönetin."
              : "Manage your profile, verification and notification settings."}
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        {!isWalletConnected ? (
          <div className="text-center py-20">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-slate-800 flex items-center justify-center">
              <svg className="w-8 h-8 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-slate-200 mb-2">
              {lang === "tr" ? "Cüzdan Bağlayın" : "Connect Wallet"}
            </h3>
            <p className="text-slate-400 mb-6">
              {lang === "tr"
                ? "Profil ayarlarınıza erişmek için cüzdanınızı bağlayın."
                : "Connect your wallet to access profile settings."}
            </p>
            <ConnectKitButton />
          </div>
        ) : (
          <div className="grid grid-cols-12 gap-6">
            {/* Sidebar */}
            <div className="col-span-3">
              <div className="bg-slate-900 rounded-xl border border-slate-800 p-4">
                <div className="space-y-1">
                  {tabs.map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id as typeof activeTab)}
                      className={`w-full text-left px-4 py-3 rounded-lg transition-colors ${
                        activeTab === tab.id
                          ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                          : "text-slate-400 hover:bg-slate-800 hover:text-slate-200"
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="col-span-9">
              {/* Profile Tab */}
              {activeTab === "profile" && (
                <div className="bg-slate-900 rounded-xl border border-slate-800 p-6">
                  <h3 className="text-lg font-semibold text-white mb-6">
                    {lang === "tr" ? "Profil Bilgileri" : "Profile Information"}
                  </h3>
                  
                  {/* Wallet Address */}
                  <div className="mb-6">
                    <label className="block text-sm text-slate-400 mb-2">
                      {lang === "tr" ? "Cüzdan Adresi" : "Wallet Address"}
                    </label>
                    <div className="flex items-center gap-3">
                      <div className="flex-1 bg-slate-800 rounded-lg px-4 py-3 font-mono text-sm text-slate-200">
                        {currentAddress}
                      </div>
                      <button
                        onClick={() => navigator.clipboard.writeText(currentAddress || "")}
                        className="px-4 py-3 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-400 hover:text-white transition-colors"
                      >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                      </button>
                    </div>
                  </div>

                  {/* Account Stats */}
                  <div className="grid grid-cols-3 gap-4 mb-6">
                    <div className="bg-slate-800/50 rounded-lg p-4">
                      <p className="text-xs text-slate-500 mb-1">
                        {lang === "tr" ? "Hesap Durumu" : "Account Status"}
                      </p>
                      <p className="text-sm font-medium text-emerald-400">
                        {lang === "tr" ? "Aktif" : "Active"}
                      </p>
                    </div>
                    <div className="bg-slate-800/50 rounded-lg p-4">
                      <p className="text-xs text-slate-500 mb-1">
                        {lang === "tr" ? "KYC Durumu" : "KYC Status"}
                      </p>
                      <p className="text-sm font-medium text-amber-400">
                        {lang === "tr" ? "Beklemede" : "Pending"}
                      </p>
                    </div>
                    <div className="bg-slate-800/50 rounded-lg p-4">
                      <p className="text-xs text-slate-500 mb-1">
                        {lang === "tr" ? "Güvenlik Seviyesi" : "Security Level"}
                      </p>
                      <p className="text-sm font-medium text-blue-400">
                        {lang === "tr" ? "Orta" : "Medium"}
                      </p>
                    </div>
                  </div>

                  {/* Quick Links */}
                  <div className="border-t border-slate-800 pt-6">
                    <h4 className="text-sm font-medium text-slate-300 mb-4">
                      {lang === "tr" ? "Hızlı Erişim" : "Quick Access"}
                    </h4>
                    <div className="grid grid-cols-2 gap-3">
                      <Link
                        href="/wallet"
                        className="flex items-center gap-3 p-3 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors"
                      >
                        <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center">
                          <svg className="w-5 h-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                          </svg>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-white">
                            {lang === "tr" ? "Cüzdanım" : "My Wallet"}
                          </p>
                          <p className="text-xs text-slate-500">
                            {lang === "tr" ? "Varlıklarını yönet" : "Manage assets"}
                          </p>
                        </div>
                      </Link>
                      <Link
                        href="/earn"
                        className="flex items-center gap-3 p-3 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors"
                      >
                        <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center">
                          <svg className="w-5 h-5 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-white">
                            {lang === "tr" ? "Kazan" : "Earn"}
                          </p>
                          <p className="text-xs text-slate-500">
                            {lang === "tr" ? "Pasif gelir elde et" : "Earn passive income"}
                          </p>
                        </div>
                      </Link>
                    </div>
                  </div>
                </div>
              )}

              {/* KYC Tab */}
              {activeTab === "kyc" && (
                <KYCVerification walletAddress={currentAddress || ""} lang={lang} />
              )}

              {/* Notifications Tab */}
              {activeTab === "notifications" && (
                <div className="bg-slate-900 rounded-xl border border-slate-800 p-6">
                  <h3 className="text-lg font-semibold text-white mb-6">
                    {lang === "tr" ? "Bildirim Tercihleri" : "Notification Preferences"}
                  </h3>

                  {/* Notification Types */}
                  <div className="space-y-4 mb-8">
                    <h4 className="text-sm font-medium text-slate-400">
                      {lang === "tr" ? "Bildirim Türleri" : "Notification Types"}
                    </h4>
                    
                    {[
                      { key: "priceAlerts", label: lang === "tr" ? "Fiyat Uyarıları" : "Price Alerts", desc: lang === "tr" ? "Belirlediğiniz fiyat hedeflerine ulaşıldığında" : "When your price targets are reached" },
                      { key: "transactions", label: lang === "tr" ? "İşlem Bildirimleri" : "Transaction Updates", desc: lang === "tr" ? "Yatırma, çekme ve transfer işlemleri" : "Deposits, withdrawals and transfers" },
                      { key: "security", label: lang === "tr" ? "Güvenlik Uyarıları" : "Security Alerts", desc: lang === "tr" ? "Yeni cihaz girişleri ve güvenlik olayları" : "New device logins and security events" },
                      { key: "marketing", label: lang === "tr" ? "Pazarlama" : "Marketing", desc: lang === "tr" ? "Kampanyalar ve yeni özellikler" : "Promotions and new features" },
                    ].map((item) => (
                      <div key={item.key} className="flex items-center justify-between p-4 bg-slate-800/50 rounded-lg">
                        <div>
                          <p className="text-sm font-medium text-white">{item.label}</p>
                          <p className="text-xs text-slate-500">{item.desc}</p>
                        </div>
                        <button
                          onClick={() => setNotifPrefs(prev => ({ ...prev, [item.key]: !prev[item.key as keyof typeof prev] }))}
                          className={`w-12 h-6 rounded-full transition-colors ${
                            notifPrefs[item.key as keyof typeof notifPrefs] ? "bg-emerald-500" : "bg-slate-700"
                          }`}
                        >
                          <div className={`w-5 h-5 rounded-full bg-white transform transition-transform ${
                            notifPrefs[item.key as keyof typeof notifPrefs] ? "translate-x-6" : "translate-x-0.5"
                          }`} />
                        </button>
                      </div>
                    ))}
                  </div>

                  {/* Delivery Methods */}
                  <div className="space-y-4 border-t border-slate-800 pt-6">
                    <h4 className="text-sm font-medium text-slate-400">
                      {lang === "tr" ? "Bildirim Kanalları" : "Delivery Methods"}
                    </h4>
                    
                    {[
                      { key: "email", label: "Email", icon: "📧" },
                      { key: "push", label: lang === "tr" ? "Push Bildirimleri" : "Push Notifications", icon: "🔔" },
                    ].map((item) => (
                      <div key={item.key} className="flex items-center justify-between p-4 bg-slate-800/50 rounded-lg">
                        <div className="flex items-center gap-3">
                          <span className="text-xl">{item.icon}</span>
                          <p className="text-sm font-medium text-white">{item.label}</p>
                        </div>
                        <button
                          onClick={() => setNotifPrefs(prev => ({ ...prev, [item.key]: !prev[item.key as keyof typeof prev] }))}
                          className={`w-12 h-6 rounded-full transition-colors ${
                            notifPrefs[item.key as keyof typeof notifPrefs] ? "bg-emerald-500" : "bg-slate-700"
                          }`}
                        >
                          <div className={`w-5 h-5 rounded-full bg-white transform transition-transform ${
                            notifPrefs[item.key as keyof typeof notifPrefs] ? "translate-x-6" : "translate-x-0.5"
                          }`} />
                        </button>
                      </div>
                    ))}
                  </div>

                  {/* Save Button */}
                  <div className="mt-6 pt-6 border-t border-slate-800">
                    <button className="px-6 py-3 bg-emerald-500 hover:bg-emerald-600 rounded-lg text-white font-semibold transition-colors">
                      {lang === "tr" ? "Tercihleri Kaydet" : "Save Preferences"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
