import { useLanguage } from '../contexts/LanguageContext';

export function LanguageSelector() {
  const { language, setLanguage } = useLanguage();

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
      
      {/* Indicador +2 (Mock para escalabilidade FR/ES exigida no UX) */}
      <div 
        title="Mais idiomas em breve"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minWidth: 44,
          height: 32,
          color: '#6B5A60',
          cursor: 'not-allowed',
          fontSize: 11
        }}
      >
        +2
      </div>
    </div>
  );
}
