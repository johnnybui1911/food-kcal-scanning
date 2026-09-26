import { getLocales } from "expo-localization";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { getLocale, setLocale as persistLocale, type Locale } from "./storage";
import { strings, type Strings } from "./strings";

export type { Locale };

export function detectLocale(): Locale {
  return getLocales()[0]?.languageCode === "vi" ? "vi" : "en";
}

type I18n = { locale: Locale; setLocale: (l: Locale) => void; t: Strings };

const I18nContext = createContext<I18n | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale | null>(null);

  useEffect(() => {
    getLocale().then((saved) => setLocaleState(saved ?? detectLocale()));
  }, []);

  useEffect(() => {
    if (locale && typeof document !== "undefined") document.documentElement.lang = locale;
  }, [locale]);

  // Render nothing until the locale is known so strings don't flash.
  if (!locale) return null;

  const setLocale = (l: Locale) => {
    setLocaleState(l);
    persistLocale(l);
  };

  return (
    <I18nContext.Provider value={{ locale, setLocale, t: strings[locale] }}>{children}</I18nContext.Provider>
  );
}

export function useI18n(): I18n {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used inside I18nProvider");
  return ctx;
}
