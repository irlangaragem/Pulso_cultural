import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';

type Language = 'pt' | 'en' | 'es' | 'fr';

type Translations = Record<Language, Record<string, string>>;

const translations: Translations = {
  pt: {
    'venue.name': 'MAM Salvador',
    'venue.status': 'Aberto agora',
    'exhibition.label': 'Exposição em cartaz',
    'exhibition.title': 'Uma História da Arte Brasileira',
    'checkin.cta': 'Dê seu pulso e acesse o guia da exposição',
    'checkin.cta.returning': 'Bem-vindo de volta, {name}! 👋 Dê seu pulso e acesse o guia.',
    'cpf.label': 'Seu CPF',
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
    'button.pulsing': 'Pulsando...',
    'button.accessing': 'Acessando...',
    'error.invalid_cpf': 'CPF inválido.',
    'footer.lgpd.checkbox': 'Concordo com os termos de uso e privacidade',
    'footer.lgpd.link': 'Seus dados estão protegidos pela LGPD',
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
  },
  es: {
    'venue.status': 'MAM SALVADOR',
    'exhibition.label': 'Exposición actual',
    'exhibition.title': 'Una Historia del Arte Brasileño',
    'checkin.cta': 'Su guía comienza por su pulso.',
    'checkin.cta.returning': '¡Bienvenido de nuevo, {name}! 👋 Su guía comienza por su pulso.',
    'cpf.label': 'Tu RUT/DNI — tu identidad en el espacio',
    'cpf.placeholder': 'Documento de Identidad',
    'source.question': '¿Cómo te enteraste de esta exposición?',
    'source.social': 'Redes sociales',
    'source.referral': 'Indicación',
    'source.walked_by': 'Pasando por la calle',
    'source.tv': 'Periódico / TV',
    'source.school': 'Escuela / Universidad',
    'source.other': 'Otro',
    'source.other_placeholder': '¿Cuál?',
    'button.pulse': 'Pulsar',
    'button.pulsing': 'Buscando su pulso...',
    'button.accessing': 'Accediendo...',
    'error.invalid_cpf': 'El documento ingresado no parece válido.',
    'footer.lgpd.checkbox': 'Acepto el uso de mis datos para mejorar la experiencia cultural',
    'footer.lgpd.link': 'Protegido por la LGPD',
    'login.admin': 'Gestión',
    'success.granted': '¡Acceso liberado!',
    'success.redirecting': 'Redirigiendo a la guía...'
  },
  fr: {
    'venue.status': 'MAM SALVADOR',
    'exhibition.label': 'Exposition actuelle',
    'exhibition.title': 'Une Histoire de L\'Art Brésilien',
    'checkin.cta': 'Votre guide commence par votre pouls.',
    'checkin.cta.returning': 'Content de vous revoir, {name}! 👋 Votre guide commence par votre pouls.',
    'cpf.label': 'Votre pièce d\'identité — votre pass d\'accès',
    'cpf.placeholder': 'Numéro d\'identité',
    'source.question': 'Comment avez-vous entendu parler de cette exposition?',
    'source.social': 'Réseaux sociaux',
    'source.referral': 'Recommandation',
    'source.walked_by': 'En passant par là',
    'source.tv': 'Journal / TV',
    'source.school': 'École / Université',
    'source.other': 'Autre',
    'source.other_placeholder': 'Lequel?',
    'button.pulse': 'Pulser',
    'button.pulsing': 'Recherche de votre pouls...',
    'button.accessing': 'Accès en cours...',
    'error.invalid_cpf': 'Le document fourni ne semble pas valide.',
    'footer.lgpd.checkbox': 'J\'accepte l\'utilisation de mes données pour améliorer l\'expérience culturelle',
    'footer.lgpd.link': 'Protégé par la LGPD',
    'login.admin': 'Gestion',
    'success.granted': 'Accès accordé!',
    'success.redirecting': 'Redirection vers le guide...'
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
    if (savedLang && ['pt', 'en', 'es', 'fr'].includes(savedLang)) {
      setLanguageState(savedLang);
    } else {
      // Auto-detect browser language
      const browserLang = navigator.language.split('-')[0] as Language;
      if (['pt', 'en', 'es', 'fr'].includes(browserLang)) {
        setLanguageState(browserLang);
      } else {
        setLanguageState('pt'); // Default fallback
      }
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
