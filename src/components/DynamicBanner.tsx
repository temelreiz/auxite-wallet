"use client";

import { useState, useEffect, useRef } from "react";
import { useLanguage } from "@/components/LanguageContext";

interface Banner {
  id: string;
  title: string;
  subtitle?: string;
  backgroundColor?: string;
  textColor?: string;
  actionType: 'none' | 'link' | 'screen' | 'promo';
  actionValue?: string;
  active: boolean;
  priority: number;
}

const AUTO_SCROLL_INTERVAL = 8000;

export function DynamicBanner() {
  const { lang: language } = useLanguage();
  const [banners, setBanners] = useState<Banner[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [fade, setFade] = useState(true);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    loadBanners(language);
  }, [language]);

  const loadBanners = async (lang: string) => {
    try {
      const res = await fetch("/api/mobile/banners?active=true");
      const data = await res.json();
      
      const processedBanners = (data.banners || [])
        .filter((b: any) => b.active)
        .map((b: any) => ({
          ...b,
          title: typeof b.title === 'object' ? (b.title[lang] || b.title.en || b.title.tr) : b.title,
          subtitle: typeof b.subtitle === 'object' ? (b.subtitle[lang] || b.subtitle.en || b.subtitle.tr) : b.subtitle,
        }))
        .sort((a: Banner, b: Banner) => b.priority - a.priority);
      
      setBanners(processedBanners);
    } catch (error) {
      console.error("Banner load error:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (banners.length <= 1) return;

    timerRef.current = setInterval(() => {
      setFade(false);
      setTimeout(() => {
        setActiveIndex((prev) => (prev + 1) % banners.length);
        setFade(true);
      }, 300);
    }, AUTO_SCROLL_INTERVAL);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [banners.length]);

  const handleClick = () => {
    if (!banners.length) return;
    const currentBanner = banners[activeIndex];
    if (currentBanner.actionType === 'none') return;
    if (currentBanner.actionType === 'screen' && currentBanner.actionValue) {
      window.location.href = `/${currentBanner.actionValue}`;
    }
  };

  if (loading) {
    return (
      <div className="h-20 bg-slate-800/50 rounded-xl animate-pulse" />
    );
  }

  if (banners.length === 0) {
    return (
      <div 
        className="h-20 rounded-xl flex items-center justify-between px-5"
        style={{ backgroundColor: "#10b981" }}
      >
        <div>
          <p className="text-white font-bold text-base">Auxite&apos;e Hoş Geldiniz! 🎉</p>
          <p className="text-white/80 text-sm">Değerli metal yatırımlarınızı dijitalleştirin</p>
        </div>
      </div>
    );
  }

  const currentBanner = banners[activeIndex];
  const isClickable = currentBanner.actionType !== 'none';

  return (
    <div className="space-y-2">
      <div
        className={`h-20 rounded-xl flex items-center justify-between px-5 transition-opacity duration-300 ${fade ? 'opacity-100' : 'opacity-0'} ${isClickable ? 'cursor-pointer hover:opacity-90' : ''}`}
        style={{ backgroundColor: currentBanner.backgroundColor || "#10b981" }}
        onClick={handleClick}
      >
        <div className="flex-1">
          <p 
            className="font-bold text-base"
            style={{ color: currentBanner.textColor || "#fff" }}
          >
            {currentBanner.title}
          </p>
          {currentBanner.subtitle && (
            <p 
              className="text-sm opacity-80"
              style={{ color: currentBanner.textColor || "#fff" }}
            >
              {currentBanner.subtitle}
            </p>
          )}
        </div>
        {isClickable && (
          <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center">
            <svg className="w-4 h-4" fill="none" stroke={currentBanner.textColor || "#fff"} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </div>
        )}
      </div>
      
      {banners.length > 1 && (
        <div className="flex justify-center gap-1">
          {banners.map((_, index) => (
            <div
              key={index}
              className={`h-1.5 rounded-full transition-all ${
                activeIndex === index ? 'w-4 bg-emerald-500' : 'w-1.5 bg-slate-600'
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default DynamicBanner;
