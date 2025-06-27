import React, {
  createContext,
  useContext,
  useState,
  ReactNode,
  useEffect,
} from 'react';
import { ar } from '../locales/ar';

type Language = 'ar' | 'en';
type Translations = typeof ar | undefined;

type LanguageContextType = {
  language: Language;
  translations: Translations;
  setLanguage: (lang: Language) => void;
  direction: 'rtl' | 'ltr';
};

const LanguageContext = createContext<LanguageContextType | undefined>(
  undefined
);

export const LanguageProvider = ({ children }: { children: ReactNode }) => {
  // Get initial language with auto-detection
  const [language, setLanguage] = useState<Language>(() => {
    // First check localStorage
    const saved = localStorage.getItem('preferredLanguage');
    if (saved === 'ar' || saved === 'en') {
      return saved as Language;
    }

    // Then check browser language
    const browserLang = navigator.language.toLowerCase();

    // Match browser language to supported languages
    if (browserLang.startsWith('ar')) {
      return 'ar';
    }

    // Default to English
    return 'en';
  });

  const getTranslations = (lang: Language): Translations => {
    switch (lang) {
      case 'ar':
        return ar;
      default:
        return undefined; // No translations for English, use fallback in components
    }
  };

  const translations = getTranslations(language);
  const direction = language === 'ar' ? 'rtl' : 'ltr';

  const handleSetLanguage = (lang: Language) => {
    setLanguage(lang);
    localStorage.setItem('preferredLanguage', lang);
  };

  // Update document direction and language whenever language changes
  useEffect(() => {
    document.documentElement.lang = language;
    document.documentElement.dir = direction;
    // Add direction-specific classes to body
    document.body.classList.remove('rtl', 'ltr');
    document.body.classList.add(direction);
  }, [language, direction]);

  return (
    <LanguageContext.Provider
      value={{
        language,
        translations,
        setLanguage: handleSetLanguage,
        direction,
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};