"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to vault page
    router.replace("/vault");
  }, [router]);

  // Loading while redirecting
  return (
    <div className="min-h-screen bg-stone-100 dark:bg-zinc-950 flex items-center justify-center">
      <div className="text-center">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-[#BFA181]/20 flex items-center justify-center">
          <svg className="w-8 h-8 text-[#BFA181] animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        </div>
        <div className="animate-spin w-6 h-6 border-2 border-stone-300 dark:border-zinc-600 border-t-[#BFA181] rounded-full mx-auto"></div>
      </div>
    </div>
  );
}
