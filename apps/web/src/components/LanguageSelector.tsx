import { useLanguage } from '../contexts/LanguageContext';

export function LanguageSelector() {
  const { language, setLanguage } = useLanguage();

  return (
    <div 
      style={{
        position: 'absolute',
        top: 24,
        right: 24,
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        background: 'rgba(255, 255, 255, 0.05)',
        padding: '4px 8px',
        borderRadius: 20,
        backdropFilter: 'blur(8px)',
        zIndex: 50,
        fontFamily: 'Sora, sans-serif',
        fontSize: 12,
        fontWeight: 600,
        letterSpacing: 1
      }}
      aria-label="Language Selector"
    >
      <button
        onClick={() => setLanguage('pt')}
        style={{
          background: 'none',
          border: 'none',
          color: language === 'pt' ? '#F5ECE4' : '#6B5A60',
          cursor: 'pointer',
          transition: 'color 0.2s',
          padding: '4px 8px',
        }}
        aria-label="Português"
      >
        PT
      </button>
      <span style={{ color: '#6B5A60' }}>|</span>
      <button
        onClick={() => setLanguage('en')}
        style={{
          background: 'none',
          border: 'none',
          color: language === 'en' ? '#F5ECE4' : '#6B5A60',
          cursor: 'pointer',
          transition: 'color 0.2s',
          padding: '4px 8px',
        }}
        aria-label="English"
      >
        EN
      </button>
    </div>
  );
}
