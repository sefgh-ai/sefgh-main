'use client';

import { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';

const LanguageContext = createContext();

// Cache translations to avoid reloading
const translationCache = {};

const translations = {
  en: () => import('@/locales/en.json').then(m => m.default),
  es: () => import('@/locales/es.json').then(m => m.default),
  fr: () => import('@/locales/fr.json').then(m => m.default),
  de: () => import('@/locales/de.json').then(m => m.default),
  ja: () => import('@/locales/ja.json').then(m => m.default),
  zh: () => import('@/locales/zh.json').then(m => m.default),
  hi: () => import('@/locales/hi.json').then(m => m.default),
  te: () => import('@/locales/te.json').then(m => m.default),
};

const languages = [
  { code: 'en', name: 'EN', fullName: 'English' },
  { code: 'es', name: 'ES', fullName: 'Español' },
  { code: 'fr', name: 'FR', fullName: 'Français' },
  { code: 'de', name: 'DE', fullName: 'Deutsch' },
  { code: 'ja', name: 'JA', fullName: '日本語' },
  { code: 'zh', name: 'ZH', fullName: '中文' },
  { code: 'hi', name: 'HI', fullName: 'हिन्दी' },
  { code: 'te', name: 'TE', fullName: 'తెలుగు' },
];

export function LanguageProvider({ children }) {
  const [locale, setLocale] = useState('en');
  const [messages, setMessages] = useState(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Load saved language or default to 'en'
    if (typeof window !== 'undefined') {
      const savedLocale = localStorage.getItem('sefgh-language') || 'en';
      setLocale(savedLocale);
    }
  }, []);

  useEffect(() => {
    // Load translations for current locale with caching
    if (translationCache[locale]) {
      setMessages(translationCache[locale]);
    } else {
      translations[locale]().then(msgs => {
        translationCache[locale] = msgs;
        setMessages(msgs);
      });
    }
  }, [locale]);

  const changeLanguage = useCallback((newLocale) => {
    setLocale(newLocale);
    if (typeof window !== 'undefined') {
      localStorage.setItem('sefgh-language', newLocale);
    }
  }, []);

  const t = useCallback((key) => {
    if (!messages) return key;
    const keys = key.split('.');
    let value = messages;
    for (const k of keys) {
      value = value?.[k];
    }
    return value || key;
  }, [messages]);

  const value = useMemo(() => ({
    locale,
    changeLanguage,
    t,
    languages,
    messages
  }), [locale, changeLanguage, t, messages]);

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}
