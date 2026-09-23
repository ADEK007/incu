import { useLanguageStore } from '../store/languageStore';
import { translations } from '../locales/translations';

export const useTranslation = () => {
  const { language, setLanguage, toggleLanguage } = useLanguageStore();
  const t = translations[language] || translations.bn;

  return {
    language,
    setLanguage,
    toggleLanguage,
    t,
  };
};
