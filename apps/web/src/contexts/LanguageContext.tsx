import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';

type Language = 'pt' | 'en';

type Translations = Record<Language, Record<string, string>>;

const translations: Translations = {
  pt: {
    'venue.status': 'MAM SALVADOR',
    'exhibition.label': 'Exposição atual',
    'exhibition.title': 'Uma História da Arte Brasileira',
    'checkin.cta': 'Seu guia começa pelo seu pulso.',
    'checkin.cta.returning': 'Bem-vindo de volta, {name}! 👋 Seu guia começa pelo seu pulso.',
    'cpf.label': 'Seu CPF — sua identidade no espaço',
    'cpf.placeholder': '000.000.000-00',
    'source.question': 'Como soube desta exposição?',
    'source.social': 'Redes sociais',
    'source.referral': 'Indicação',
    'source.walked_by': 'Passando pela rua',
    'source.tv': 'Jornal / TV',
    'source.school': 'Escola / faculdade',
    'source.other': 'Outro',
    'source.other_placeholder': 'Qual?',
    'button.pulse': 'Pulsar',
    'button.pulsing': 'Buscando seu pulso...',
    'button.accessing': 'Acessando...',
    'error.invalid_cpf': 'O CPF informado não parece válido.',
    'footer.lgpd.checkbox': 'Concordo com o uso dos meus dados para melhoria da experiência cultural',
    'footer.lgpd.link': 'Protegido pela LGPD',
    'login.admin': 'Gestão',
    'success.granted': 'Acesso liberado!',
    'success.redirecting': 'Redirecionando para o guia...'
  },
  en: {
    'venue.status': 'MAM SALVADOR',
    'exhibition.label': 'Current exhibition',
    'exhibition.title': 'A History of Brazilian Art',
    'checkin.cta': 'Your guide starts with your pulse.',
    'checkin.cta.returning': 'Welcome back, {name}! 👋 Your guide starts with your pulse.',
    'cpf.label': 'Your Tax ID — your identity in our space',
    'cpf.placeholder': '000.000.000-00',
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
    'footer.lgpd.checkbox': 'I agree to the use of my data to improve the cultural experience',
    'footer.lgpd.link': 'Protected by LGPD',
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

export const LanguageProvider = ({ children }: { children: ReactNode }) => {
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
