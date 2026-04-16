import { useLanguage } from '../contexts/LanguageContext';
import { motion } from 'framer-motion';

const LANGUAGES = [
  { code: 'pt', label: 'PT' },
  { code: 'en', label: 'EN' },
  { code: 'es', label: 'ES' },
  { code: 'fr', label: 'FR' }
];

export function SmartLanguageFAB() {
  const { language, setLanguage } = useLanguage();

  return (
    <div
      style={{
        position: 'absolute',
        top: 24,
        right: 24,
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        fontFamily: "'DM Sans', sans-serif",
        fontSize: '12px',
        color: '#6B5A60',
        background: 'rgba(28, 22, 32, 0.6)',
        padding: '8px 16px',
        borderRadius: '100px',
        border: '1px solid rgba(255, 255, 255, 0.08)'
      }}
    >
      {LANGUAGES.map((lang, idx) => (
        <span key={lang.code} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            onClick={() => setLanguage(lang.code as any)}
            style={{
              background: 'none',
              border: 'none',
              padding: 0,
              cursor: 'pointer',
              color: language === lang.code ? '#E05A2A' : '#A8969A',
              fontWeight: language === lang.code ? 700 : 500,
              fontFamily: 'inherit',
              fontSize: 'inherit',
              transition: 'all 0.2s ease',
              position: 'relative'
            }}
          >
            {lang.label}
            {language === lang.code && (
              <motion.div
                layoutId="activeLang"
                style={{
                  position: 'absolute',
                  bottom: -4,
                  left: '50%',
                  transform: 'translateX(-50%)',
                  width: '4px',
                  height: '4px',
                  borderRadius: '50%',
                  background: '#E05A2A'
                }}
              />
            )}
          </button>
          {idx < LANGUAGES.length - 1 && <span style={{ opacity: 0.3 }}>|</span>}
        </span>
      ))}
    </div>
  );
}
