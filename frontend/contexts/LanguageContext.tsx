import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { translations, Language } from '../utils/translations';

interface LanguageContextType {
  lang: Language;
  setLang: (lang: Language) => void;
  t: typeof translations.kk;
}

const LanguageContext = createContext<LanguageContextType>({
  lang: 'kk',
  setLang: () => {},
  t: translations.kk,
});

export const LanguageProvider = ({ children }: { children: React.ReactNode }) => {
  const [lang, setLangState] = useState<Language>('kk');

  useEffect(() => {
    AsyncStorage.getItem('app_language').then((stored) => {
      if (stored === 'kk' || stored === 'ru') setLangState(stored);
    });
  }, []);

  const setLang = async (newLang: Language) => {
    setLangState(newLang);
    await AsyncStorage.setItem('app_language', newLang);
  };

  return (
    <LanguageContext.Provider value={{ lang, setLang, t: translations[lang] }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => useContext(LanguageContext);
