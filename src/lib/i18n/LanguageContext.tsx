// lib/i18n/LanguageContext.tsx
"use client";

import { createContext, useContext, ReactNode } from "react";

interface LanguageContextType {
  // Context sadece provider wrapper için
}

const LanguageContext = createContext<LanguageContextType>({});

export function LanguageProvider({ children }: { children: ReactNode }) {
  // TopNav kendi language state'ini yönetiyor
  // Bu provider sadece layout.tsx'de import için
  return (
    <LanguageContext.Provider value={{}}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}

// Export for compatibility
export const LanguageSelector = () => null;
