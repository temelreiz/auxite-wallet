// app/under-construction/page.tsx
"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useLanguage } from "@/components/LanguageContext";

// ============================================
// TRANSLATIONS
// ============================================
const translations: Record<string, Record<string, string>> = {
  tr: {
    underConstruction: "Yapım Aşamasında",
    description: "Harika bir şey inşa ediyoruz. Tokenize edilmiş değerli metaller platformumuz yakında geliyor.",
    stayTuned: "Güncellemeler için bizi takip edin",
    launchingSoon: "Yakında Başlıyor",
    allRightsReserved: "Tüm hakları saklıdır.",
    auxiteGold: "Auxite Altın",
    auxiteSilver: "Auxite Gümüş",
    auxitePlatinum: "Auxite Platin",
    auxitePalladium: "Auxite Paladyum",
  },
  en: {
    underConstruction: "Under Construction",
    description: "We're building something amazing. Our platform for tokenized precious metals is coming soon.",
    stayTuned: "Stay tuned for updates",
    launchingSoon: "Launching Soon",
    allRightsReserved: "All rights reserved.",
    auxiteGold: "Auxite Gold",
    auxiteSilver: "Auxite Silver",
    auxitePlatinum: "Auxite Platinum",
    auxitePalladium: "Auxite Palladium",
  },
  de: {
    underConstruction: "Im Aufbau",
    description: "Wir bauen etwas Großartiges. Unsere Plattform für tokenisierte Edelmetalle kommt bald.",
    stayTuned: "Bleiben Sie auf dem Laufenden",
    launchingSoon: "Start in Kürze",
    allRightsReserved: "Alle Rechte vorbehalten.",
    auxiteGold: "Auxite Gold",
    auxiteSilver: "Auxite Silber",
    auxitePlatinum: "Auxite Platin",
    auxitePalladium: "Auxite Palladium",
  },
  fr: {
    underConstruction: "En Construction",
    description: "Nous construisons quelque chose d'incroyable. Notre plateforme de métaux précieux tokenisés arrive bientôt.",
    stayTuned: "Restez informé des mises à jour",
    launchingSoon: "Lancement Imminent",
    allRightsReserved: "Tous droits réservés.",
    auxiteGold: "Auxite Or",
    auxiteSilver: "Auxite Argent",
    auxitePlatinum: "Auxite Platine",
    auxitePalladium: "Auxite Palladium",
  },
  ar: {
    underConstruction: "قيد الإنشاء",
    description: "نحن نبني شيئاً مذهلاً. منصتنا للمعادن الثمينة المرمزة قادمة قريباً.",
    stayTuned: "تابعونا للحصول على التحديثات",
    launchingSoon: "الإطلاق قريباً",
    allRightsReserved: "جميع الحقوق محفوظة.",
    auxiteGold: "أوكسايت ذهب",
    auxiteSilver: "أوكسايت فضة",
    auxitePlatinum: "أوكسايت بلاتين",
    auxitePalladium: "أوكسايت بالاديوم",
  },
  ru: {
    underConstruction: "В Разработке",
    description: "Мы создаём нечто удивительное. Наша платформа для токенизированных драгоценных металлов скоро будет запущена.",
    stayTuned: "Следите за обновлениями",
    launchingSoon: "Скоро Запуск",
    allRightsReserved: "Все права защищены.",
    auxiteGold: "Auxite Золото",
    auxiteSilver: "Auxite Серебро",
    auxitePlatinum: "Auxite Платина",
    auxitePalladium: "Auxite Палладий",
  },
};

export default function UnderConstruction() {
  const [dots, setDots] = useState("");
  const { lang } = useLanguage();
  const t = (key: string) => translations[lang]?.[key] || translations.en[key] || key;

  useEffect(() => {
    const interval = setInterval(() => {
      setDots((prev) => (prev.length >= 3 ? "" : prev + "."));
    }, 500);
    return () => clearInterval(interval);
  }, []);

  const tokens = [
    { icon: "/auxg_icon.png", label: "AUXG", name: t("auxiteGold") },
    { icon: "/auxs_icon.png", label: "AUXS", name: t("auxiteSilver") },
    { icon: "/auxpt_icon.png", label: "AUXPT", name: t("auxitePlatinum") },
    { icon: "/auxpd_icon.png", label: "AUXPD", name: t("auxitePalladium") },
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
          🚧 {t("underConstruction")}{dots}
        </span>
      </div>

      {/* Description */}
      <p className="text-gray-400 text-center max-w-md mb-12 text-lg">
        {t("description")}
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
        <p className="text-gray-500 text-sm mb-4">{t("stayTuned")}</p>
        <div className="flex items-center justify-center gap-2 text-gray-600">
          <span className="w-2 h-2 bg-[#50C878] rounded-full animate-pulse"></span>
          <span className="text-sm">{t("launchingSoon")}</span>
        </div>
      </div>

      {/* Footer */}
      <div className="absolute bottom-8 text-gray-600 text-sm">
        &copy; 2024 Auxite. {t("allRightsReserved")}
      </div>
    </div>
  );
}
