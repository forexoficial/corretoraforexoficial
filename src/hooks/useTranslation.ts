import { useSafeLanguageContext } from '@/contexts/LanguageContext';

export const useTranslation = () => {
  const context = useSafeLanguageContext();
  
  const translations = context?.translations || {};
  const language = context?.language || 'en';

  const t = (key: string, fallback?: string): string => {
    return translations[key] || fallback || key;
  };

  return { t, language };
};
