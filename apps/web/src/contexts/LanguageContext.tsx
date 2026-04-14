import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

type Language = 'pt' | 'en';

type Translations = Record<Language, Record<string, string>>;

const translations: Translations = {
  pt: {
    'venue.status': 'MAM Salvador · Aberto agora',
    'exhibition.label': 'EXPOSIÇÃO EM CARTAZ',
    'exhibition.title': 'Uma História da Arte Brasileira',
    'checkin.cta': 'Dê seu pulso e acesse o guia da exposição',
    'checkin.cta.returning': 'Bem-vindo de volta, {name}! 👋 Siga para o guia da exposição',
    'cpf.placeholder': '000.000.000-00',
    'source.question': 'Como soube desta exposição?',
    'source.social': 'Redes sociais',
    'source.referral': 'Indicação',
    'source.walked_by': 'Passei na frente',
    'source.tv': 'Jornal / TV',
    'source.school': 'Escola / faculdade',
    'source.other': 'Outro',
    'source.other_placeholder': 'Qual?',
    'button.pulse': 'Pulsar',
    'button.pulsing': 'Buscando seu pulso...',
    'button.accessing': 'Acessando...',
    'error.invalid_cpf': 'O CPF informado não parece válido.',
    'footer.lgpd': 'Seus dados são protegidos pela LGPD. Usamos apenas para melhorar sua experiência.',
    'login.admin': 'Gestão',
    'success.granted': 'Acesso liberado!',
    'success.redirecting': 'Redirecionando para o guia...'
  },
  en: {
    'venue.status': 'MAM Salvador · Open now',
    'exhibition.label': 'CURRENT EXHIBITION',
    'exhibition.title': 'A History of Brazilian Art',
    'checkin.cta': 'Give your pulse and access the exhibition guide',
    'checkin.cta.returning': 'Welcome back, {name}! 👋 Proceed to the exhibition guide',
    'cpf.placeholder': 'Tax ID (CPF)',
    'source.question': 'How did you hear about this exhibition?',
    'source.social': 'Social media',
    'source.referral': 'Referral',
    'source.walked_by': 'Walked by',
    'source.tv': 'Newspaper / TV',
    'source.school': 'School / College',
    'source.other': 'Other',
    'source.other_placeholder': 'Which one?',
    'button.pulse': 'Pulse',
    'button.pulsing': 'Finding your pulse...',
    'button.accessing': 'Accessing...',
    'error.invalid_cpf': 'The provided Tax ID does not seem valid.',
    'footer.lgpd': 'Your data is protected by the LGPD. We only use it to improve your experience.',
    'login.admin': 'Management',
    'success.granted': 'Access granted!',
    'success.redirecting': 'Redirecting to the guide...'
  }
};

interface LanguageContextProps {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string, variables?: Record<string, string>) => string;
}

const LanguageContext = createContext<LanguageContextProps | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>('pt');

  useEffect(() => {
    const savedLang = localStorage.getItem('pulso:lang') as Language;
    if (savedLang && (savedLang === 'pt' || savedLang === 'en')) {
      setLanguageState(savedLang);
    }
  }, []);

  const setLanguage = (lang: Language) => {
    localStorage.setItem('pulso:lang', lang);
    setLanguageState(lang);
  };

  const t = (key: string, variables?: Record<string, string>): string => {
    let text = translations[language][key] || translations['pt'][key] || key;
    
    if (variables) {
      Object.keys(variables).forEach((varKey) => {
        text = text.replace(`{${varKey}}`, variables[varKey]);
      });
    }
    
    return text;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = (): LanguageContextProps => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
