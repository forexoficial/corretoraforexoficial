import { useLanguageContext } from '@/contexts/LanguageContext';

export const useTranslation = () => {
  const { translations, language } = useLanguageContext();

  const t = (key: string, fallback?: string): string => {
    return translations[key] || fallback || key;
  };

  return { t, language };
};
