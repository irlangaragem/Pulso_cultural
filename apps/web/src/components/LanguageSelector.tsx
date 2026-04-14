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
        top: 20,
        right: 20,
        display: 'flex',
        alignItems: 'center',
        background: 'rgba(30, 25, 28, 0.6)',
        padding: '4px',
        borderRadius: 30,
        backdropFilter: 'blur(12px)',
        border: '1px solid rgba(255, 255, 255, 0.05)',
        zIndex: 50,
        fontFamily: 'Sora, sans-serif',
        fontSize: 11,
        fontWeight: 600,
        letterSpacing: 1
      }}
      aria-label="Language Selector"
    >
      <button
        onClick={() => setLanguage('pt')}
        style={{
          background: language === 'pt' ? '#F5ECE4' : 'transparent',
          color: language === 'pt' ? '#120F11' : '#A4969B',
          border: 'none',
          borderRadius: 24,
          cursor: 'pointer',
          transition: 'all 0.2s',
          minWidth: 44,
          height: 32,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
        aria-label="Português"
      >
        PT
      </button>
      <button
        onClick={() => setLanguage('en')}
        style={{
          background: language === 'en' ? '#F5ECE4' : 'transparent',
          color: language === 'en' ? '#120F11' : '#A4969B',
          border: 'none',
          borderRadius: 24,
          cursor: 'pointer',
          transition: 'all 0.2s',
          minWidth: 44,
          height: 32,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
        aria-label="English"
      >
        EN
      </button>
      
      {showExtra ? (
        <>
          <button
            onClick={() => setLanguage('es')}
            style={{
              background: language === 'es' ? '#F5ECE4' : 'transparent',
              color: language === 'es' ? '#120F11' : '#A4969B',
              border: 'none',
              borderRadius: 24,
              cursor: 'pointer',
              transition: 'all 0.2s',
              minWidth: 44,
              height: 32,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
            aria-label="Español"
          >
            ES
          </button>
          <button
            onClick={() => setLanguage('fr')}
            style={{
              background: language === 'fr' ? '#F5ECE4' : 'transparent',
              color: language === 'fr' ? '#120F11' : '#A4969B',
              border: 'none',
              borderRadius: 24,
              cursor: 'pointer',
              transition: 'all 0.2s',
              minWidth: 44,
              height: 32,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
            aria-label="Français"
          >
            FR
          </button>
        </>
      ) : (
        <button 
          onClick={() => setExpanded(true)}
          title="Ver mais idiomas"
          style={{
            background: 'transparent',
            border: 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            minWidth: 44,
            height: 32,
            color: '#6B5A60',
            cursor: 'pointer',
            fontSize: 11,
            transition: 'color 0.2s',
            fontWeight: 600,
            fontFamily: 'Sora, sans-serif'
          }}
          onMouseOver={(e) => e.currentTarget.style.color = '#A4969B'}
          onMouseOut={(e) => e.currentTarget.style.color = '#6B5A60'}
        >
          +2
        </button>
      )}
    </div>
  );
}
