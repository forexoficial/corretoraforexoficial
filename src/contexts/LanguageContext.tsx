import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

type Language = 'pt' | 'en' | 'es';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  translations: Record<string, string>;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const useLanguageContext = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguageContext must be used within LanguageProvider');
  }
  return context;
};

// Safe version that doesn't throw - used by useTranslation
export const useSafeLanguageContext = () => {
  return useContext(LanguageContext);
};

interface LanguageProviderProps {
  children: ReactNode;
}

export const LanguageProvider = ({ children }: LanguageProviderProps) => {
  const [language, setLanguageState] = useState<Language>(() => {
    const stored = localStorage.getItem('app_language');
    
    // Verificar se existe um idioma salvo E se é válido
    if (stored && ['pt', 'en', 'es'].includes(stored)) {
      console.log('[Language] Usando idioma salvo:', stored);
      return stored as Language;
    }
    
    // Detectar idioma do navegador
    const browserLang = navigator.language || navigator.languages?.[0] || 'en';
    const langCode = browserLang.toLowerCase().split('-')[0];
    
    console.log('[Language] Detectando idioma do navegador:', browserLang, '-> código:', langCode);
    
    // Português para países de língua portuguesa
    if (langCode === 'pt') {
      console.log('[Language] Idioma detectado: Português');
      return 'pt';
    }
    
    // Espanhol para países de língua espanhola
    if (langCode === 'es') {
      console.log('[Language] Idioma detectado: Espanhol');
      return 'es';
    }
    
    // Inglês para todos os outros
    console.log('[Language] Idioma detectado: Inglês (padrão)');
    return 'en';
  });

  const [translations, setTranslations] = useState<Record<string, string>>({});

  useEffect(() => {
    const loadTranslations = async () => {
      try {
        const module = await import(`../translations/${language}.json`);
        setTranslations(module.default);
      } catch (error) {
        console.error(`Failed to load translations for ${language}:`, error);
      }
    };

    loadTranslations();
  }, [language]);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem('app_language', lang);
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, translations }}>
      {children}
    </LanguageContext.Provider>
  );
};
