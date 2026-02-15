"use client";

import { useState, useEffect } from "react";

export function SecurityBanner() {
  const [visible, setVisible] = useState(false);
  const [isSecure, setIsSecure] = useState(true);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const hostname = window.location.hostname;
    const protocol = window.location.protocol;

    // Check if we're on the official domain with HTTPS
    const officialDomains = ["vault.auxite.io", "localhost", "127.0.0.1"];
    const onOfficialDomain = officialDomains.includes(hostname);
    const isHttps = protocol === "https:" || hostname === "localhost" || hostname === "127.0.0.1";

    if (!onOfficialDomain || !isHttps) {
      setIsSecure(false);
      setVisible(true);
    }

    // Show secure banner briefly on first visit
    const bannerDismissed = sessionStorage.getItem("security_banner_dismissed");
    if (!bannerDismissed && onOfficialDomain && isHttps) {
      setVisible(true);
      // Auto-hide after 5 seconds
      const timer = setTimeout(() => setVisible(false), 5000);
      return () => clearTimeout(timer);
    }
  }, []);

  const dismiss = () => {
    setVisible(false);
    if (isSecure) {
      sessionStorage.setItem("security_banner_dismissed", "1");
    }
  };

  if (!visible) return null;

  if (!isSecure) {
    return (
      <div className="fixed top-0 left-0 right-0 z-[9999] bg-red-600 text-white px-4 py-2 text-center text-sm font-medium flex items-center justify-center gap-2">
        <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.072 16.5c-.77.833.192 2.5 1.732 2.5z" />
        </svg>
        <span>
          WARNING: You are not on the official Auxite domain. The only official URL is{" "}
          <strong>vault.auxite.io</strong>. Do not enter any credentials on this site.
        </span>
      </div>
    );
  }

  return (
    <div
      className="fixed top-0 left-0 right-0 z-[9999] bg-emerald-700/95 text-white px-4 py-1.5 text-center text-xs flex items-center justify-center gap-2 backdrop-blur-sm cursor-pointer"
      onClick={dismiss}
    >
      <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
      </svg>
      <span>
        Secure connection to <strong>vault.auxite.io</strong> verified
      </span>
    </div>
  );
}
