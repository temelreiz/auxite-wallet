"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

// Storage keys to clear
const STORAGE_KEYS = [
  "authToken",
  "user",
  "auxite_has_wallet",
  "auxite_wallet_address",
  "auxite_wallet_mode",
  "auxite_session_unlocked",
];

export default function LogoutPage() {
  const router = useRouter();

  useEffect(() => {
    // Clear all auth-related localStorage
    STORAGE_KEYS.forEach((key) => {
      localStorage.removeItem(key);
    });

    // Clear sessionStorage
    sessionStorage.removeItem("auxite_session_unlocked");

    // Redirect to login
    router.replace("/auth/login");
  }, [router]);

  return (
    <div className="min-h-screen bg-stone-100 dark:bg-zinc-950 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin w-8 h-8 border-2 border-stone-300 dark:border-zinc-600 border-t-[#BFA181] rounded-full mx-auto mb-4"></div>
        <p className="text-slate-500 dark:text-zinc-400">Signing out...</p>
      </div>
    </div>
  );
}
