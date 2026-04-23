import { createPortal } from 'react-dom';
import { useLanguage } from '../contexts/LanguageContext';

/**
 * Compact PT / EN pill — top-right corner.
 * Uses createPortal + position:fixed so it is NEVER clipped by
 * any ancestor overflow, scroll container, or stacking context.
 */
export function LanguageSelector() {
  const { language, setLanguage } = useLanguage();

  const pill = (
    <div
      aria-label="Language Selector"
      style={{
        position: 'fixed',
        top: 'calc(14px + env(safe-area-inset-top))',
        right: 16,
        zIndex: 99999,
        display: 'flex',
        alignItems: 'center',
        gap: 2,
        background: 'rgba(14, 11, 13, 0.75)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        border: '1px solid rgba(255, 255, 255, 0.10)',
        borderRadius: 100,
        padding: '3px 3px',
        fontFamily: "'Sora', sans-serif",
        fontSize: 10,
        fontWeight: 700,
        letterSpacing: 1,
        boxShadow: '0 2px 12px rgba(0,0,0,0.4)',
        pointerEvents: 'auto',
      }}
    >
      {(['pt', 'en', 'es', 'fr'] as const).map((code) => {
        const active = language === code;
        return (
          <button
            key={code}
            onClick={() => setLanguage(code)}
            aria-pressed={active}
            aria-label={code.toUpperCase()}
            style={{
              background: active ? 'rgba(255,255,255,0.12)' : 'transparent',
              color: active ? '#FFFFFF' : 'rgba(255, 255, 255, 0.32)',
              border: 'none',
              borderRadius: 100,
              cursor: 'pointer',
              transition: 'all 0.18s ease',
              minWidth: 34,
              height: 26,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              position: 'relative',
              padding: 0,
            }}
          >
            {code.toUpperCase()}
            {/* Active indicator dot */}
            {active && (
              <span
                style={{
                  position: 'absolute',
                  bottom: 3,
                  left: '50%',
                  transform: 'translateX(-50%)',
                  width: 3,
                  height: 3,
                  borderRadius: '50%',
                  background: '#E8554E',
                  display: 'block',
                }}
              />
            )}
          </button>
        );
      })}
    </div>
  );

  // Portal renders into document.body — bypasses ALL ancestor
  // overflow / transform / stacking-context constraints.
  return createPortal(pill, document.body);
}
