"use client";
import React from "react";

import { useState, useEffect } from "react";
import { useAccount, useDisconnect } from "wagmi";
import TopNav from "@/components/TopNav";
import { useLanguage } from "@/components/LanguageContext";
import { WhitelistManager } from "@/components/WhitelistManager";

type MenuSection = "personal" | "security" | "notifications" | "referral" | "preferences" | "danger";

export default function ProfilePage() {
  const { t, lang } = useLanguage();
  const { isConnected, address } = useAccount();
  const { disconnect } = useDisconnect();
  const [mounted, setMounted] = useState(false);
  const [activeSection, setActiveSection] = useState<MenuSection>("personal");
  
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [pushNotifications, setPushNotifications] = useState(true);
  const [priceAlertNotifications, setPriceAlertNotifications] = useState(true);
  const [transactionNotifications, setTransactionNotifications] = useState(true);
  
  // Editable user data
  const [userData, setUserData] = useState({
    email: "user@example.com",
    phone: "+90 555 123 4567",
    country: "Turkey",
    timezone: "Europe/Istanbul",
    referralCode: "AUX-" + (address?.slice(2, 8).toUpperCase() || "XXXXXX"),
    totalReferrals: 12,
    totalEarnings: 450.25,
  });

  // Modal states
  const [editModal, setEditModal] = useState<"email" | "phone" | "country" | "timezone" | "password" | "currency" | null>(null);
  const [editValue, setEditValue] = useState("");
  const [displayCurrency, setDisplayCurrency] = useState("USD");
  const [copySuccess, setCopySuccess] = useState(false);
  const [shareSuccess, setShareSuccess] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  // Update referral code when address changes
  useEffect(() => {
    if (address) {
      setUserData(prev => ({
        ...prev,
        referralCode: "AUX-" + address.slice(2, 8).toUpperCase()
      }));
    }
  }, [address]);

  if (!mounted) {
    return (
      <div className="min-h-screen bg-stone-100 dark:bg-zinc-950 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-stone-300 dark:border-zinc-600 border-t-emerald-500 rounded-full"></div>
      </div>
    );
  }

  // Copy to clipboard with feedback
  const handleCopy = async (text: string, type: "referral" | "wallet" = "referral") => {
    try {
      await navigator.clipboard.writeText(text);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (err) {
      console.error("Copy failed:", err);
    }
  };

  // Share referral code
  const handleShare = async () => {
    const shareData = {
      title: "Auxite Referral",
      text: lang === "tr" 
        ? `Auxite'a katılın ve kripto yatırımlarınızdan kazanın! Referans kodum: ${userData.referralCode}` 
        : `Join Auxite and earn from your crypto investments! My referral code: ${userData.referralCode}`,
      url: `https://auxite.com/register?ref=${userData.referralCode}`,
    };

    if (navigator.share && navigator.canShare && navigator.canShare(shareData)) {
      try {
        await navigator.share(shareData);
        setShareSuccess(true);
        setTimeout(() => setShareSuccess(false), 2000);
      } catch (err) {
        // User cancelled or error
        console.log("Share cancelled or failed");
      }
    } else {
      // Fallback: copy referral link
      await handleCopy(`https://auxite.com/register?ref=${userData.referralCode}`, "referral");
    }
  };

  // Export data
  const handleExportData = (format: "csv" | "json") => {
    const exportData = {
      email: userData.email,
      phone: userData.phone,
      country: userData.country,
      timezone: userData.timezone,
      referralCode: userData.referralCode,
      totalReferrals: userData.totalReferrals,
      totalEarnings: userData.totalEarnings,
      walletAddress: address || "Not connected",
      exportDate: new Date().toISOString(),
    };

    let content: string;
    let mimeType: string;
    let filename: string;

    if (format === "json") {
      content = JSON.stringify(exportData, null, 2);
      mimeType = "application/json";
      filename = "auxite-profile-data.json";
    } else {
      const headers = Object.keys(exportData).join(",");
      const values = Object.values(exportData).join(",");
      content = `${headers}\n${values}`;
      mimeType = "text/csv";
      filename = "auxite-profile-data.csv";
    }

    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Save edit
  const handleSaveEdit = () => {
    if (!editModal || !editValue.trim()) return;

    setUserData(prev => ({
      ...prev,
      [editModal]: editValue,
    }));
    setEditModal(null);
    setEditValue("");
  };

  // Open edit modal
  const openEditModal = (field: "email" | "phone" | "country" | "timezone" | "password") => {
    setEditModal(field);
    if (field !== "password") {
      setEditValue(userData[field as keyof typeof userData] as string);
    } else {
      setEditValue("");
    }
  };

  const Toggle = ({ enabled, onChange }: { enabled: boolean; onChange: () => void }) => (
    <button
      onClick={onChange}
      className={`relative w-12 h-7 rounded-full transition-all duration-300 ${
        enabled ? "bg-emerald-500 shadow-lg shadow-emerald-500/30" : "bg-stone-300 dark:bg-zinc-700"
      }`}
    >
      <span className={`absolute top-1 left-1 w-5 h-5 bg-white rounded-full shadow-md transition-transform duration-300 ${enabled ? "translate-x-5" : "translate-x-0"}`} />
    </button>
  );

  const menuItems = [
    { id: "personal" as const, label: t("personalInfo"), color: "emerald", icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg> },
    { id: "security" as const, label: t("securitySettings"), color: "amber", icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg> },
    { id: "notifications" as const, label: t("notifications"), color: "blue", icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg> },
    { id: "referral" as const, label: t("referralProgram"), color: "purple", icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg> },
    { id: "preferences" as const, label: t("preferences"), color: "teal", icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg> },
    { id: "danger" as const, label: t("deleteAccount"), color: "red", icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg> },
  ];

  const InfoCard = ({ icon, label, value, action, actionLabel }: { icon: JSX.Element; label: string; value: string; action?: () => void; actionLabel?: string }) => (
    <div className="group p-4 rounded-xl bg-white dark:bg-zinc-800/50 border border-stone-200 dark:border-zinc-700/50 hover:border-stone-300 dark:hover:border-zinc-600 transition-all shadow-sm dark:shadow-none">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-stone-100 dark:bg-zinc-700/50 flex items-center justify-center text-slate-500 dark:text-zinc-400">{icon}</div>
          <div>
            <p className="text-xs text-slate-500 dark:text-zinc-500 mb-0.5">{label}</p>
            <p className="text-sm font-medium text-slate-800 dark:text-zinc-200">{value}</p>
          </div>
        </div>
        {action && <button onClick={action} className="px-3 py-1.5 text-xs font-medium rounded-lg bg-stone-100 dark:bg-zinc-700/50 hover:bg-stone-200 dark:hover:bg-zinc-600 text-slate-600 dark:text-zinc-300 transition-colors">{actionLabel || t("edit")}</button>}
      </div>
    </div>
  );

  const renderContent = () => {
    switch (activeSection) {
      case "personal":
        return (
          <div className="space-y-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center">
                <svg className="w-5 h-5 text-emerald-500 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-slate-800 dark:text-white">{t("personalInfo")}</h3>
                <p className="text-sm text-slate-500 dark:text-zinc-500">{lang === "tr" ? "Hesap bilgilerinizi yönetin" : "Manage your account information"}</p>
              </div>
            </div>
            {isConnected && address && (
              <div className="p-5 rounded-2xl bg-gradient-to-br from-emerald-500/10 via-teal-500/5 to-transparent border border-emerald-500/20">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center shadow-lg shadow-emerald-500/20">
                      <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg>
                    </div>
                    <div>
                      <p className="text-xs text-emerald-600 dark:text-emerald-400/80 font-medium mb-1">{lang === "tr" ? "Bağlı Cüzdan" : "Connected Wallet"}</p>
                      <p className="font-mono text-lg text-slate-800 dark:text-white">{address.slice(0, 8)}····{address.slice(-6)}</p>
                    </div>
                  </div>
                  <button onClick={() => handleCopy(address, "wallet")} className="px-4 py-2 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-sm font-medium transition-colors">
                    {copySuccess ? "✓" : t("copy")}
                  </button>
                </div>
              </div>
            )}
            <div className="grid gap-3">
              <InfoCard icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>} label={t("email")} value={userData.email} action={() => openEditModal("email")} />
              <InfoCard icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>} label={t("phone")} value={userData.phone} action={() => openEditModal("phone")} />
              <InfoCard icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>} label={t("country")} value={userData.country} action={() => openEditModal("country")} />
              <InfoCard icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>} label={t("timezone")} value={userData.timezone} action={() => openEditModal("timezone")} />
            </div>
          </div>
        );
      case "security":
        return (
          <div className="space-y-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center">
                <svg className="w-5 h-5 text-amber-500 dark:text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-slate-800 dark:text-white">{t("securitySettings")}</h3>
                <p className="text-sm text-slate-500 dark:text-zinc-500">{lang === "tr" ? "Hesap güvenliğinizi koruyun" : "Protect your account security"}</p>
              </div>
            </div>
            <div className="p-5 rounded-2xl bg-gradient-to-br from-amber-500/10 via-orange-500/5 to-transparent border border-amber-500/20">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center shadow-lg shadow-amber-500/20">
                    <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                  </div>
                  <div>
                    <p className="font-medium text-slate-800 dark:text-white">{t("twoFactorAuth")}</p>
                    <p className="text-sm text-slate-500 dark:text-zinc-400">{twoFactorEnabled ? (lang === "tr" ? "Hesabınız korunuyor" : "Your account is protected") : (lang === "tr" ? "Ek güvenlik katmanı ekleyin" : "Add an extra layer of security")}</p>
                  </div>
                </div>
                <Toggle enabled={twoFactorEnabled} onChange={() => setTwoFactorEnabled(!twoFactorEnabled)} />
              </div>
            </div>
            <div className="p-4 rounded-xl bg-white dark:bg-zinc-800/50 border border-stone-200 dark:border-zinc-700/50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-stone-100 dark:bg-zinc-700/50 flex items-center justify-center text-slate-500 dark:text-zinc-400">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" /></svg>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-800 dark:text-zinc-200">{t("changePassword")}</p>
                    <p className="text-xs text-slate-500 dark:text-zinc-500">••••••••••••</p>
                  </div>
                </div>
                <button onClick={() => openEditModal("password")} className="px-4 py-2 rounded-xl bg-stone-100 dark:bg-zinc-700/50 hover:bg-stone-200 dark:hover:bg-zinc-600 text-slate-600 dark:text-zinc-300 text-sm font-medium transition-colors">{t("edit")}</button>
              </div>
            </div>

            {/* Whitelist Manager - Withdrawal Addresses */}
            {isConnected && address && (
              <div className="mt-6 pt-6 border-t border-stone-200 dark:border-zinc-700">
                <WhitelistManager 
                  walletAddress={address} 
                  lang={lang as "tr" | "en" | "de" | "fr" | "ar" | "ru"} 
                />
              </div>
            )}
          </div>
        );
      case "notifications":
        return (
          <div className="space-y-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center">
                <svg className="w-5 h-5 text-blue-500 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-slate-800 dark:text-white">{t("notifications")}</h3>
                <p className="text-sm text-slate-500 dark:text-zinc-500">{lang === "tr" ? "Bildirim tercihlerinizi ayarlayın" : "Manage your notification preferences"}</p>
              </div>
            </div>
            <div className="space-y-3">
              {[
                { label: t("emailNotifications"), desc: lang === "tr" ? "E-posta ile bildirim al" : "Receive notifications via email", enabled: emailNotifications, toggle: () => setEmailNotifications(!emailNotifications), icon: "📧" },
                { label: t("pushNotifications"), desc: lang === "tr" ? "Anlık bildirimler" : "Real-time push notifications", enabled: pushNotifications, toggle: () => setPushNotifications(!pushNotifications), icon: "🔔" },
                { label: t("priceAlertNotifications"), desc: lang === "tr" ? "Fiyat uyarıları" : "Price change alerts", enabled: priceAlertNotifications, toggle: () => setPriceAlertNotifications(!priceAlertNotifications), icon: "📈" },
                { label: t("transactionNotifications"), desc: lang === "tr" ? "İşlem bildirimleri" : "Transaction updates", enabled: transactionNotifications, toggle: () => setTransactionNotifications(!transactionNotifications), icon: "💳" },
              ].map((item, i) => (
                <div key={i} className="p-4 rounded-xl bg-white dark:bg-zinc-800/50 border border-stone-200 dark:border-zinc-700/50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <span className="text-2xl">{item.icon}</span>
                      <div>
                        <p className="text-sm font-medium text-slate-800 dark:text-zinc-200">{item.label}</p>
                        <p className="text-xs text-slate-500 dark:text-zinc-500">{item.desc}</p>
                      </div>
                    </div>
                    <Toggle enabled={item.enabled} onChange={item.toggle} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      case "referral":
        return (
          <div className="space-y-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center">
                <svg className="w-5 h-5 text-purple-500 dark:text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-slate-800 dark:text-white">{t("referralProgram")}</h3>
                <p className="text-sm text-slate-500 dark:text-zinc-500">{lang === "tr" ? "Arkadaşlarınızı davet edin, kazanın" : "Invite friends and earn rewards"}</p>
              </div>
            </div>
            <div className="p-6 rounded-2xl bg-gradient-to-br from-purple-500/10 via-pink-500/5 to-transparent border border-purple-500/20">
              <p className="text-xs text-purple-600 dark:text-purple-400/80 font-medium mb-3">{t("yourReferralCode")}</p>
              <code className="block w-full px-5 py-4 bg-white/50 dark:bg-zinc-800/80 rounded-xl font-mono text-2xl text-purple-600 dark:text-purple-400 tracking-wider text-center border border-purple-200 dark:border-transparent mb-4">{userData.referralCode}</code>
              <div className="flex gap-3">
                <button 
                  onClick={() => handleCopy(userData.referralCode, "referral")} 
                  className="flex-1 py-3 rounded-xl bg-white/50 dark:bg-zinc-700/50 hover:bg-white dark:hover:bg-zinc-600 text-slate-700 dark:text-zinc-300 font-medium transition-colors border border-stone-200 dark:border-transparent flex items-center justify-center gap-2"
                >
                  {copySuccess ? (
                    <>
                      <svg className="w-4 h-4 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                      {lang === "tr" ? "Kopyalandı!" : "Copied!"}
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                      {t("copy")}
                    </>
                  )}
                </button>
                <button 
                  onClick={handleShare}
                  className="flex-1 py-3 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-400 hover:to-pink-400 text-white font-medium shadow-lg shadow-purple-500/20 flex items-center justify-center gap-2"
                >
                  {shareSuccess ? (
                    <>
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                      {lang === "tr" ? "Paylaşıldı!" : "Shared!"}
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" /></svg>
                      {t("share")}
                    </>
                  )}
                </button>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-5 rounded-xl bg-white dark:bg-zinc-800/50 border border-stone-200 dark:border-zinc-700/50">
                <p className="text-sm text-slate-500 dark:text-zinc-500 mb-1">{t("totalReferrals")}</p>
                <p className="text-3xl font-bold text-slate-800 dark:text-white">{userData.totalReferrals}</p>
              </div>
              <div className="p-5 rounded-xl bg-white dark:bg-zinc-800/50 border border-stone-200 dark:border-zinc-700/50">
                <p className="text-sm text-slate-500 dark:text-zinc-500 mb-1">{t("totalEarnings")}</p>
                <p className="text-3xl font-bold text-emerald-500 dark:text-emerald-400">${userData.totalEarnings}</p>
              </div>
            </div>
          </div>
        );
      case "preferences":
        return (
          <div className="space-y-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-teal-500/20 flex items-center justify-center">
                <svg className="w-5 h-5 text-teal-500 dark:text-teal-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-slate-800 dark:text-white">{t("preferences")}</h3>
                <p className="text-sm text-slate-500 dark:text-zinc-500">{lang === "tr" ? "Uygulama tercihlerinizi özelleştirin" : "Customize your app preferences"}</p>
              </div>
            </div>
            <div className="space-y-3">
              {/* Display Currency */}
              <div className="p-4 rounded-xl bg-white dark:bg-zinc-800/50 border border-stone-200 dark:border-zinc-700/50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-stone-100 dark:bg-zinc-700/50 flex items-center justify-center">
                      <span className="text-lg">💵</span>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 dark:text-zinc-500 mb-0.5">{t("displayCurrency")}</p>
                      <p className="text-sm font-medium text-slate-800 dark:text-zinc-200">{displayCurrency} ({displayCurrency === "USD" ? "$" : displayCurrency === "EUR" ? "€" : displayCurrency === "TRY" ? "₺" : displayCurrency === "GBP" ? "£" : "$"})</p>
                    </div>
                  </div>
                  <select
                    value={displayCurrency}
                    onChange={(e) => setDisplayCurrency(e.target.value)}
                    className="px-3 py-1.5 text-sm font-medium rounded-lg bg-stone-100 dark:bg-zinc-700/50 hover:bg-stone-200 dark:hover:bg-zinc-600 text-slate-600 dark:text-zinc-300 transition-colors border-none focus:outline-none focus:ring-2 focus:ring-teal-500"
                  >
                    <option value="USD">USD ($)</option>
                    <option value="EUR">EUR (€)</option>
                    <option value="TRY">TRY (₺)</option>
                    <option value="GBP">GBP (£)</option>
                  </select>
                </div>
              </div>

              {/* Export Data */}
              <div className="p-4 rounded-xl bg-white dark:bg-zinc-800/50 border border-stone-200 dark:border-zinc-700/50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-stone-100 dark:bg-zinc-700/50 flex items-center justify-center">
                      <span className="text-lg">📊</span>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 dark:text-zinc-500 mb-0.5">{t("exportData")}</p>
                      <p className="text-sm font-medium text-slate-800 dark:text-zinc-200">CSV, JSON</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => handleExportData("csv")}
                      className="px-3 py-1.5 text-xs font-medium rounded-lg bg-stone-100 dark:bg-zinc-700/50 hover:bg-stone-200 dark:hover:bg-zinc-600 text-slate-600 dark:text-zinc-300 transition-colors"
                    >
                      CSV
                    </button>
                    <button 
                      onClick={() => handleExportData("json")}
                      className="px-3 py-1.5 text-xs font-medium rounded-lg bg-teal-500/20 hover:bg-teal-500/30 text-teal-600 dark:text-teal-400 transition-colors"
                    >
                      JSON
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      case "danger":
        return (
          <div className="space-y-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-red-500/20 flex items-center justify-center">
                <svg className="w-5 h-5 text-red-500 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-red-500 dark:text-red-400">{lang === "tr" ? "Tehlikeli Bölge" : "Danger Zone"}</h3>
                <p className="text-sm text-slate-500 dark:text-zinc-500">{lang === "tr" ? "Geri alınamaz işlemler" : "Irreversible actions"}</p>
              </div>
            </div>
            <div className="p-6 rounded-2xl bg-gradient-to-br from-red-500/10 via-rose-500/5 to-transparent border border-red-500/20">
              <p className="text-sm text-slate-600 dark:text-zinc-400 mb-6">{lang === "tr" ? "Hesabınızı silmek geri alınamaz bir işlemdir. Tüm verileriniz kalıcı olarak silinecektir." : "Deleting your account is irreversible. All your data will be permanently deleted."}</p>
              <div className="space-y-3">
                {isConnected && <button onClick={() => disconnect()} className="w-full py-3.5 rounded-xl bg-white/50 dark:bg-zinc-700/50 hover:bg-white dark:hover:bg-zinc-600 text-slate-700 dark:text-zinc-300 font-medium transition-colors border border-stone-200 dark:border-transparent">{t("logout2")}</button>}
                <button className="w-full py-3.5 rounded-xl bg-red-500/20 border border-red-500/30 text-red-500 dark:text-red-400 font-medium hover:bg-red-500/30 transition-colors">{t("deleteAccount")}</button>
              </div>
            </div>
          </div>
        );
      default: return null;
    }
  };

  const getMenuItemStyle = (item: typeof menuItems[0], isActive: boolean) => {
    if (isActive) {
      const colorMap: Record<string, string> = {
        emerald: "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30",
        amber: "bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30",
        blue: "bg-blue-500/20 text-blue-600 dark:text-blue-400 border border-blue-500/30",
        purple: "bg-purple-500/20 text-purple-600 dark:text-purple-400 border border-purple-500/30",
        teal: "bg-teal-500/20 text-teal-600 dark:text-teal-400 border border-teal-500/30",
        red: "bg-red-500/20 text-red-500 dark:text-red-400 border border-red-500/30",
      };
      return colorMap[item.color] || colorMap.emerald;
    }
    return "text-slate-600 dark:text-zinc-400 hover:bg-stone-100 dark:hover:bg-zinc-800/50 hover:text-slate-800 dark:hover:text-zinc-200 border border-transparent";
  };

  // Edit modal labels
  const getModalTitle = () => {
    switch (editModal) {
      case "email": return lang === "tr" ? "E-posta Düzenle" : "Edit Email";
      case "phone": return lang === "tr" ? "Telefon Düzenle" : "Edit Phone";
      case "country": return lang === "tr" ? "Ülke Düzenle" : "Edit Country";
      case "timezone": return lang === "tr" ? "Saat Dilimi Düzenle" : "Edit Timezone";
      case "password": return lang === "tr" ? "Şifre Değiştir" : "Change Password";
      default: return "";
    }
  };

  return (
    <main className="min-h-screen bg-stone-100 dark:bg-zinc-950 text-slate-900 dark:text-white">
      <TopNav />
      <div className="border-b border-stone-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/30">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <h2 className="text-lg font-semibold text-slate-800 dark:text-zinc-100 mb-1">{t("profileTitle")}</h2>
          <p className="text-sm text-slate-500 dark:text-zinc-400">{t("accountSettings")}</p>
        </div>
      </div>
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex flex-col lg:flex-row gap-6">
          <div className="lg:w-72 flex-shrink-0">
            <div className="sticky top-6 space-y-2">
              {menuItems.map((item) => (
                <button key={item.id} onClick={() => setActiveSection(item.id)} className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-left transition-all ${getMenuItemStyle(item, activeSection === item.id)}`}>
                  {item.icon}
                  <span className="font-medium">{item.label}</span>
                </button>
              ))}
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <div className="p-6 rounded-2xl bg-white dark:bg-zinc-900/50 border border-stone-200 dark:border-zinc-800 shadow-sm dark:shadow-none">{renderContent()}</div>
          </div>
        </div>
      </div>

      {/* Edit Modal */}
      {editModal && (
        <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-stone-200 dark:border-zinc-700 max-w-md w-full p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-slate-800 dark:text-white mb-4">{getModalTitle()}</h3>
            
            {editModal === "password" ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-slate-600 dark:text-zinc-400 mb-2">
                    {lang === "tr" ? "Mevcut Şifre" : "Current Password"}
                  </label>
                  <input
                    type="password"
                    className="w-full px-4 py-3 rounded-xl bg-stone-100 dark:bg-zinc-800 border border-stone-200 dark:border-zinc-700 text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    placeholder="••••••••"
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-600 dark:text-zinc-400 mb-2">
                    {lang === "tr" ? "Yeni Şifre" : "New Password"}
                  </label>
                  <input
                    type="password"
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-stone-100 dark:bg-zinc-800 border border-stone-200 dark:border-zinc-700 text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    placeholder="••••••••"
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-600 dark:text-zinc-400 mb-2">
                    {lang === "tr" ? "Yeni Şifre (Tekrar)" : "Confirm New Password"}
                  </label>
                  <input
                    type="password"
                    className="w-full px-4 py-3 rounded-xl bg-stone-100 dark:bg-zinc-800 border border-stone-200 dark:border-zinc-700 text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    placeholder="••••••••"
                  />
                </div>
              </div>
            ) : editModal === "timezone" ? (
              <select
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-stone-100 dark:bg-zinc-800 border border-stone-200 dark:border-zinc-700 text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="Europe/Istanbul">Europe/Istanbul (GMT+3)</option>
                <option value="Europe/London">Europe/London (GMT+0)</option>
                <option value="Europe/Berlin">Europe/Berlin (GMT+1)</option>
                <option value="America/New_York">America/New_York (GMT-5)</option>
                <option value="America/Los_Angeles">America/Los_Angeles (GMT-8)</option>
                <option value="Asia/Dubai">Asia/Dubai (GMT+4)</option>
                <option value="Asia/Singapore">Asia/Singapore (GMT+8)</option>
                <option value="Asia/Tokyo">Asia/Tokyo (GMT+9)</option>
              </select>
            ) : editModal === "country" ? (
              <select
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-stone-100 dark:bg-zinc-800 border border-stone-200 dark:border-zinc-700 text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="Turkey">🇹🇷 Turkey</option>
                <option value="United States">🇺🇸 United States</option>
                <option value="United Kingdom">🇬🇧 United Kingdom</option>
                <option value="Germany">🇩🇪 Germany</option>
                <option value="France">🇫🇷 France</option>
                <option value="Switzerland">🇨🇭 Switzerland</option>
                <option value="United Arab Emirates">🇦🇪 United Arab Emirates</option>
                <option value="Singapore">🇸🇬 Singapore</option>
              </select>
            ) : (
              <input
                type={editModal === "email" ? "email" : "text"}
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-stone-100 dark:bg-zinc-800 border border-stone-200 dark:border-zinc-700 text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                placeholder={editModal === "email" ? "email@example.com" : editModal === "phone" ? "+90 555 123 4567" : ""}
              />
            )}

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setEditModal(null);
                  setEditValue("");
                }}
                className="flex-1 py-3 rounded-xl bg-stone-200 dark:bg-zinc-700 text-slate-700 dark:text-zinc-300 font-medium hover:bg-stone-300 dark:hover:bg-zinc-600 transition-colors"
              >
                {t("cancel")}
              </button>
              <button
                onClick={handleSaveEdit}
                className="flex-1 py-3 rounded-xl bg-emerald-500 text-white font-medium hover:bg-emerald-600 transition-colors"
              >
                {t("save")}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
