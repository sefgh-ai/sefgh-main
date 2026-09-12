"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useMemo,
  useCallback,
} from "react";

import en from "@/locales/en.json";

const LanguageContext = createContext(null);

const translationCache = { en };

const translations = {
  en: () => Promise.resolve(en),
  es: () => import("@/locales/es.json").then((m) => m.default),
  fr: () => import("@/locales/fr.json").then((m) => m.default),
  de: () => import("@/locales/de.json").then((m) => m.default),
  ja: () => import("@/locales/ja.json").then((m) => m.default),
  zh: () => import("@/locales/zh.json").then((m) => m.default),
  hi: () => import("@/locales/hi.json").then((m) => m.default),
  te: () => import("@/locales/te.json").then((m) => m.default),
};

const languages = [
  { code: "en", name: "EN", fullName: "English" },
  { code: "es", name: "ES", fullName: "Español" },
  { code: "fr", name: "FR", fullName: "Français" },
  { code: "de", name: "DE", fullName: "Deutsch" },
  { code: "ja", name: "JA", fullName: "日本語" },
  { code: "zh", name: "ZH", fullName: "中文" },
  { code: "hi", name: "HI", fullName: "हिन्दी" },
  { code: "te", name: "TE", fullName: "తెలుగు" },
];

const DEFAULT_LOCALE = "en";
const STORAGE_KEY = "sefgh-language";

function isSupported(locale) {
  return Object.prototype.hasOwnProperty.call(translations, locale);
}

export function LanguageProvider({ children }) {
  const [locale, setLocale] = useState(DEFAULT_LOCALE);
  // English ships in the initial bundle, so there is never a null-messages
  // window. The landing page used to render a blocking "Loading..." spinner
  // until a dynamic import resolved.
  const [messages, setMessages] = useState(en);

  useEffect(() => {
    let saved;
    try {
      saved = localStorage.getItem(STORAGE_KEY);
    } catch {
      // Private mode / blocked storage.
      return;
    }
    // An unrecognised value (a stale key, a region code like "en-US") used to
    // reach translations[locale]() and throw "is not a function" from inside an
    // effect, which tore down the whole provider tree.
    if (saved && isSupported(saved) && saved !== DEFAULT_LOCALE) {
      setLocale(saved);
    }
  }, []);

  useEffect(() => {
    if (!isSupported(locale)) {
      setLocale(DEFAULT_LOCALE);
      return;
    }

    const cached = translationCache[locale];
    if (cached) {
      setMessages(cached);
      return;
    }

    let active = true;
    translations[locale]()
      .then((loaded) => {
        translationCache[locale] = loaded;
        if (active) setMessages(loaded);
      })
      .catch((error) => {
        console.error(`[i18n] failed to load "${locale}", using English:`, error);
        if (active) setMessages(en);
      });

    return () => {
      active = false;
    };
  }, [locale]);

  const changeLanguage = useCallback((next) => {
    if (!isSupported(next)) return;
    setLocale(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Non-fatal: the choice just won't persist.
    }
  }, []);

  const t = useCallback(
    (key) => {
      const value = key
        .split(".")
        .reduce((acc, part) => acc?.[part], messages);
      // Fall back to English before falling back to the raw key, so a partial
      // translation never leaves dotted paths on screen.
      if (value !== undefined && value !== null) return value;
      const fallback = key.split(".").reduce((acc, part) => acc?.[part], en);
      return fallback ?? key;
    },
    [messages]
  );

  const value = useMemo(
    () => ({ locale, changeLanguage, t, languages, messages }),
    [locale, changeLanguage, t, messages]
  );

  return (
    <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
}
