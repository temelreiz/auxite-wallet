// app/under-construction/page.tsx
"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

export default function UnderConstruction() {
  const [dots, setDots] = useState("");

  useEffect(() => {
    const interval = setInterval(() => {
      setDots((prev) => (prev.length >= 3 ? "" : prev + "."));
    }, 500);
    return () => clearInterval(interval);
  }, []);

  const tokens = [
    { icon: "/gold-favicon-32x32.png", label: "AUXG", name: "Gold" },
    { icon: "/silver-favicon-32x32.png", label: "AUXS", name: "Silver" },
    { icon: "/platinum-favicon-32x32.png", label: "AUXPT", name: "Platinum" },
    { icon: "/palladium-favicon-32x32.png", label: "AUXPD", name: "Palladium" },
  ];

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex flex-col items-center justify-center p-4">
      {/* Logo */}
      <div className="mb-8">
        <Image
          src="/auxite-wallet-logo.png"
          alt="Auxite Wallet"
          width={120}
          height={120}
          className="drop-shadow-lg"
          priority
        />
      </div>

      {/* Title */}
      <h1 className="text-4xl md:text-5xl font-bold text-white mb-4 text-center">
        Auxite Wallet
      </h1>

      {/* Under Construction Badge */}
      <div className="bg-[#50C878]/10 border border-[#50C878]/30 rounded-full px-6 py-2 mb-8">
        <span className="text-[#50C878] font-medium">
          🚧 Under Construction{dots}
        </span>
      </div>

      {/* Description */}
      <p className="text-gray-400 text-center max-w-md mb-12 text-lg">
        We&apos;re building something amazing. Our platform for tokenized precious metals is coming soon.
      </p>

      {/* Token Icons */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-12">
        {tokens.map((token) => (
          <div
            key={token.label}
            className="bg-[#111] border border-[#222] rounded-xl p-6 text-center hover:border-[#50C878]/30 transition-all hover:scale-105 cursor-default"
          >
            <div className="flex justify-center mb-3">
              <Image
                src={token.icon}
                alt={token.label}
                width={48}
                height={48}
                className="drop-shadow-md"
              />
            </div>
            <div className="text-white font-semibold mb-1">{token.label}</div>
            <div className="text-gray-500 text-sm">{token.name}</div>
          </div>
        ))}
      </div>

      {/* Coming Soon */}
      <div className="text-center">
        <p className="text-gray-500 text-sm mb-4">Stay tuned for updates</p>
        <div className="flex items-center justify-center gap-2 text-gray-600">
          <span className="w-2 h-2 bg-[#50C878] rounded-full animate-pulse"></span>
          <span className="text-sm">Launching Soon</span>
        </div>
      </div>

      {/* Footer */}
      <div className="absolute bottom-8 text-gray-600 text-sm">
        © 2024 Auxite. All rights reserved.
      </div>
    </div>
  );
}
