'use client';

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

type SystemLanguage = 'zh-CN' | 'en';

interface SystemLanguageContextValue {
  language: SystemLanguage;
  setLanguage: (language: SystemLanguage) => void;
  toggleLanguage: () => void;
  t: (zh: string, en: string) => string;
}

const STORAGE_KEY = 'system_language';
const DEFAULT_LANGUAGE: SystemLanguage = 'zh-CN';

const SystemLanguageContext = createContext<SystemLanguageContextValue | null>(null);

function normalizeLanguage(input: unknown): SystemLanguage | null {
  if (input === 'zh-CN' || input === 'zh') {
    return 'zh-CN';
  }
  if (input === 'en' || input === 'en-US') {
    return 'en';
  }
  return null;
}

async function persistLanguage(language: SystemLanguage) {
  try {
    await fetch('/api/user/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ language }),
    });
  } catch {
    // Ignore network errors; local storage still preserves preference.
  }
}

export function SystemLanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<SystemLanguage>(DEFAULT_LANGUAGE);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const stored = normalizeLanguage(localStorage.getItem(STORAGE_KEY));
    if (stored) {
      setLanguageState(stored);
      setHydrated(true);
      return;
    }

    fetch('/api/user/settings', { cache: 'no-store' })
      .then(async (response) => {
        const payload = await response.json();
        if (payload?.code === 0) {
          const serverLanguage = normalizeLanguage(payload?.data?.language);
          if (serverLanguage) {
            setLanguageState(serverLanguage);
          }
        }
      })
      .catch(() => {
        // Keep default language when endpoint is unavailable.
      })
      .finally(() => {
        setHydrated(true);
      });
  }, []);

  useEffect(() => {
    if (!hydrated) {
      return;
    }
    localStorage.setItem(STORAGE_KEY, language);
    document.documentElement.lang = language;
  }, [hydrated, language]);

  const setLanguage = (nextLanguage: SystemLanguage) => {
    setLanguageState(nextLanguage);
    void persistLanguage(nextLanguage);
  };

  const toggleLanguage = () => {
    setLanguage(language === 'zh-CN' ? 'en' : 'zh-CN');
  };

  const value = useMemo<SystemLanguageContextValue>(
    () => ({
      language,
      setLanguage,
      toggleLanguage,
      t: (zh, en) => (language === 'zh-CN' ? zh : en),
    }),
    [language]
  );

  return (
    <SystemLanguageContext.Provider value={value}>{children}</SystemLanguageContext.Provider>
  );
}

export function useSystemLanguage() {
  const context = useContext(SystemLanguageContext);
  if (!context) {
    throw new Error('useSystemLanguage must be used within SystemLanguageProvider');
  }
  return context;
}
