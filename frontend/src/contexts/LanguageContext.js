import React, { createContext, useContext, useState, useEffect } from 'react';
import { translations } from '../i18n/translations';
import { LOCALE_MAP } from '../utils/chatHelpers';

const LanguageContext = createContext();

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};

export const LanguageProvider = ({ children }) => {
  const [currentLanguage, setCurrentLanguage] = useState('he');
  const [direction, setDirection] = useState('rtl');

  useEffect(() => {
    // Load saved language from localStorage
    const savedLanguage = localStorage.getItem('language') || 'he';
    changeLanguage(savedLanguage);
  }, []);

  const changeLanguage = (langCode) => {
    const lang = translations[langCode];
    if (lang) {
      setCurrentLanguage(langCode);
      setDirection(lang.dir);
      document.documentElement.setAttribute('dir', lang.dir);
      document.documentElement.setAttribute('lang', langCode);
      if (lang.footer?.pageTitle) {
        document.title = lang.footer.pageTitle;
      }
      localStorage.setItem('language', langCode);
    }
  };

  const t = translations[currentLanguage];
  const locale = LOCALE_MAP[currentLanguage] || 'he-IL';

  return (
    <LanguageContext.Provider
      value={{
        currentLanguage,
        direction,
        locale,
        changeLanguage,
        t,
        isRTL: direction === 'rtl'
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
};
