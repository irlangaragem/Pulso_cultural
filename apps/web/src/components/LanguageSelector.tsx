import { useLanguage } from '../contexts/LanguageContext';
import { useState } from 'react';

export function LanguageSelector() {
  const { language, setLanguage } = useLanguage();
  const [expanded, setExpanded] = useState(false);

  // Auto-expand if current language is es or fr
  const showExtra = expanded || language === 'es' || language === 'fr';

  return (
    <div 
      style={{
        position: 'absolute',
        top: 'calc(16px + env(safe-area-inset-top))',
        right: 16,
        display: 'flex',
        alignItems: 'center',
        background: 'rgba(255, 255, 255, 0.03)',
        padding: '2px',
        borderRadius: 30,
        backdropFilter: 'blur(8px)',
        border: '1px solid rgba(255, 255, 255, 0.05)',
        zIndex: 150,
        fontFamily: 'Sora, sans-serif',
        fontSize: 10,
        fontWeight: 600,
        letterSpacing: 1
      }}
      aria-label="Language Selector"
    >
      {[
        { code: 'pt', label: 'PT' },
        { code: 'en', label: 'EN' },
        ...(showExtra ? [{ code: 'es', label: 'ES' }, { code: 'fr', label: 'FR' }] : [])
      ].map((lang) => (
        <button
          key={lang.code}
          onClick={() => setLanguage(lang.code as any)}
          style={{
            background: 'transparent',
            color: language === lang.code ? '#FFFFFF' : 'rgba(255, 255, 255, 0.3)',
            border: 'none',
            borderRadius: 24,
            cursor: 'pointer',
            transition: 'all 0.2s',
            minWidth: 36,
            height: 28,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative'
          }}
          aria-label={lang.label}
        >
          {lang.label}
          {language === lang.code && (
            <div style={{
              position: 'absolute',
              bottom: 4,
              width: 3,
              height: 3,
              borderRadius: '50%',
              background: '#E8554E'
            }} />
          )}
        </button>
      ))}
      
      {!showExtra && (
        <button 
          onClick={() => setExpanded(true)}
          style={{
            background: 'transparent',
            border: 'none',
            minWidth: 32,
            height: 28,
            color: 'rgba(255, 255, 255, 0.2)',
            cursor: 'pointer',
            fontSize: 9,
            fontWeight: 700
          }}
        >
          +
        </button>
      )}
    </div>
  );
}
