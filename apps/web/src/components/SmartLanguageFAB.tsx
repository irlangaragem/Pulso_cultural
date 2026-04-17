import { useState, useRef, useCallback, useEffect } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { motion, AnimatePresence } from 'framer-motion';

const LANGUAGES = [
  { code: 'pt', label: 'PT', flag: '🇧🇷' },
  { code: 'en', label: 'EN', flag: '🇺🇸' },
  { code: 'es', label: 'ES', flag: '🇪🇸' },
  { code: 'fr', label: 'FR', flag: '🇫🇷' },
] as const;

type LangCode = (typeof LANGUAGES)[number]['code'];

const RETRACT_DELAY = 2200;

export function SmartLanguageFAB() {
  const { language, setLanguage } = useLanguage();
  const [open, setOpen] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const currentLang = LANGUAGES.find(l => l.code === language) || LANGUAGES[0];

  // ── Cleanup on unmount ──
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  // ── Clear any pending retract ──
  const clearRetractTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  // ── Schedule auto-retract ──
  const scheduleRetract = useCallback(() => {
    clearRetractTimer();
    timerRef.current = setTimeout(() => {
      setOpen(false);
    }, RETRACT_DELAY);
  }, [clearRetractTimer]);

  // ── Toggle selector ──
  const handleToggle = useCallback(() => {
    clearRetractTimer();
    setOpen(prev => {
      const next = !prev;
      // If opening, schedule retract in case user doesn't pick
      if (next) {
        timerRef.current = setTimeout(() => setOpen(false), RETRACT_DELAY * 2);
      }
      return next;
    });
  }, [clearRetractTimer]);

  // ── Pick a language ──
  const handleSelect = useCallback((code: LangCode) => {
    setLanguage(code as any);
    // Micro-haptic feedback
    if ('vibrate' in navigator) navigator.vibrate(15);
    // Auto-retract after brief visual confirmation
    scheduleRetract();
  }, [setLanguage, scheduleRetract]);

  return (
    <div
      style={{
        position: 'fixed',
        top: 16,
        right: 16,
        zIndex: 9999,
        fontFamily: "'DM Sans', sans-serif",
      }}
    >
      <motion.div
        layout
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 0,
          background: 'rgba(14, 11, 13, 0.85)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: 100,
          padding: '4px',
          boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
          overflow: 'hidden',
          cursor: 'pointer',
        }}
        transition={{ layout: { duration: 0.28, ease: [0.4, 0, 0.2, 1] } }}
      >
        {/* ── Collapsed: show only active language ── */}
        {!open && (
          <motion.button
            key="trigger"
            onClick={handleToggle}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.18 }}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '6px 12px',
              color: '#F5ECE4',
              fontFamily: 'inherit',
              fontSize: 12,
              fontWeight: 600,
              letterSpacing: 0.5,
              whiteSpace: 'nowrap',
            }}
            aria-label={`Idioma: ${currentLang.label}. Clique para mudar.`}
          >
            <span style={{ fontSize: 14, lineHeight: 1 }}>{currentLang.flag}</span>
            <span>{currentLang.label}</span>
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none" style={{ opacity: 0.5 }}>
              <path d="M3 4L5 6L7 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </motion.button>
        )}

        {/* ── Expanded: show all languages ── */}
        <AnimatePresence>
          {open && (
            <motion.div
              key="options"
              initial={{ opacity: 0, width: 0 }}
              animate={{ opacity: 1, width: 'auto' }}
              exit={{ opacity: 0, width: 0 }}
              transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 2,
                overflow: 'hidden',
              }}
            >
              {LANGUAGES.map((lang, idx) => (
                <motion.button
                  key={lang.code}
                  onClick={() => handleSelect(lang.code)}
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.04, duration: 0.18 }}
                  whileHover={{ scale: 1.06 }}
                  whileTap={{ scale: 0.94 }}
                  style={{
                    background: language === lang.code
                      ? 'rgba(232, 85, 78, 0.18)'
                      : 'transparent',
                    border: language === lang.code
                      ? '1px solid rgba(232, 85, 78, 0.35)'
                      : '1px solid transparent',
                    borderRadius: 100,
                    padding: '6px 12px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 5,
                    color: language === lang.code ? '#F07070' : '#A8969A',
                    fontFamily: 'inherit',
                    fontSize: 11,
                    fontWeight: language === lang.code ? 700 : 500,
                    whiteSpace: 'nowrap',
                    transition: 'background 0.15s, color 0.15s, border-color 0.15s',
                    position: 'relative',
                  }}
                  aria-label={`Selecionar idioma: ${lang.label}`}
                  aria-pressed={language === lang.code}
                >
                  <span style={{ fontSize: 13, lineHeight: 1 }}>{lang.flag}</span>
                  <span>{lang.label}</span>
                </motion.button>
              ))}

              {/* Close button */}
              <motion.button
                onClick={handleToggle}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.15 }}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '4px 6px',
                  color: '#6B5A60',
                  fontSize: 14,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
                aria-label="Fechar seletor de idioma"
              >
                ✕
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
