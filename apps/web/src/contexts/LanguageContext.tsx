import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';

type Language = 'pt' | 'en' | 'es' | 'fr';

type Translations = Record<Language, Record<string, string>>;

const translations: Translations = {
  pt: {
    'venue.name': 'MAM Salvador',
    'venue.status': 'Aberto agora',
    'exhibition.label': 'EXPOSIÇÃO PRINCIPAL',
    'exhibition.title': 'Uma História da Arte Brasileira',
    'exhibition.subtitle': '80 obras do MAM Rio · Entrada gratuita',
    'exhibition.description': '80 obras do acervo do MAM Rio chegam a Salvador numa celebração da arte brasileira do século XX. De Portinari a Anita Malfatti, de Di Cavalcanti a Lygia Clark — um percurso que atravessa movimentos, gerações e visões de Brasil.',
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
    'success.redirecting': 'Redirecionando para o guia...',
    'feedback.title': 'Curtiu a visita?',
    'feedback.subtitle': 'Compartilhe que você fez a cultura pulsar hoje.',
    'feedback.placeholder': 'O que mais te marcou nessa experiência?',
    'feedback.button.send': 'Enviar avaliação',
    'feedback.button.share': 'Compartilhar meu pulso',
    'feedback.label.1': 'Pode melhorar',
    'feedback.label.2': 'Pode melhorar',
    'feedback.label.3': 'Interessante',
    'feedback.label.4': 'Muito bom',
    'feedback.label.5': 'Incrível 🔥',
    'feedback.success': '✨ Obrigado por fazer a cultura pulsar!'
  },
  en: {
    'venue.status': 'MAM SALVADOR',
    'exhibition.label': 'PRINCIPAL EXHIBITION',
    'exhibition.title': 'A History of Brazilian Art',
    'exhibition.subtitle': '80 works from MAM Rio · Free admission',
    'exhibition.description': '80 works from the MAM Rio collection arrive in Salvador in a celebration of 20th-century Brazilian art. From Portinari to Anita Malfatti, from Di Cavalcanti to Lygia Clark — a journey through movements, generations, and visions of Brazil.',
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
    'success.redirecting': 'Redirecting to the guide...',
    'feedback.title': 'Did you enjoy the visit?',
    'feedback.subtitle': 'Share that you made culture pulse today.',
    'feedback.placeholder': 'What stood out most for you?',
    'feedback.button.send': 'Send review',
    'feedback.button.share': 'Share my pulse',
    'feedback.label.1': 'Could be better',
    'feedback.label.2': 'Could be better',
    'feedback.label.3': 'Interesting',
    'feedback.label.4': 'Very good',
    'feedback.label.5': 'Amazing 🔥',
    'feedback.success': '✨ Thanks for making culture pulse!'
  },
  es: {
    'venue.status': 'MAM SALVADOR',
    'exhibition.label': 'EXPOSICIÓN PRINCIPAL',
    'exhibition.title': 'Una Historia del Arte Brasileño',
    'exhibition.subtitle': '80 obras del MAM Rio · Entrada gratuita',
    'exhibition.description': '80 obras de la colección del MAM Rio llegan a Salvador en una celebración del arte brasileño del siglo XX. De Portinari a Anita Malfatti, de Di Cavalcanti a Lygia Clark — un recorrido por movimientos, generaciones y visiones de Brasil.',
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
    'success.redirecting': 'Redirigiendo a la guía...',
    'feedback.title': '¿Te gustó la visita?',
    'feedback.subtitle': 'Comparte que hiciste pulsar la cultura hoy.',
    'feedback.placeholder': '¿Qué fue lo que más te marcó de esta experiencia?',
    'feedback.button.send': 'Enviar evaluación',
    'feedback.button.share': 'Compartir mi pulso',
    'feedback.label.1': 'Puede mejorar',
    'feedback.label.2': 'Puede mejorar',
    'feedback.label.3': 'Interesante',
    'feedback.label.4': 'Muy bueno',
    'feedback.label.5': 'Increíble 🔥',
    'feedback.success': '✨ ¡Gracias por hacer pulsar la cultura!'
  },
  fr: {
    'venue.status': 'MAM SALVADOR',
    'exhibition.label': 'EXPOSITION PRINCIPALE',
    'exhibition.title': 'Une Histoire de L\'Art Brésilien',
    'exhibition.subtitle': '80 œuvres du MAM Rio · Entrée gratuite',
    'exhibition.description': '80 œuvres de la collection du MAM Rio arrivent à Salvador pour une célébration de l\'art brésilien du XXe siècle. De Portinari à Anita Malfatti, de Di Cavalcanti à Lygia Clark — un voyage à travers les mouvements, les générations et les visions du Brésil.',
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
    'success.redirecting': 'Redirection vers le guide...',
    'feedback.title': 'Avez-vous aimé la visite ?',
    'feedback.subtitle': 'Partagez que vous avez fait vibrer la culture aujourd\'hui.',
    'feedback.placeholder': 'Qu\'est-ce qui vous a le plus marqué dans cette expérience ?',
    'feedback.button.send': 'Envoyer l\'avis',
    'feedback.button.share': 'Partager mon pouls',
    'feedback.label.1': 'Peut mieux faire',
    'feedback.label.2': 'Peut mieux faire',
    'feedback.label.3': 'Intéressant',
    'feedback.label.4': 'Très bien',
    'feedback.label.5': 'Incroyable 🔥',
    'feedback.success': '✨ Merci de faire vibrer la culture !'
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
