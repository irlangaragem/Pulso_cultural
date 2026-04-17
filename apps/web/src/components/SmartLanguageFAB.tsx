import { useState, useRef, useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useLanguage } from '../contexts/LanguageContext';
import { motion, AnimatePresence } from 'framer-motion';

const LANGUAGES = [
  { code: 'pt', label: 'PT', flag: '🇧🇷' },
  { code: 'en', label: 'EN', flag: '🇺🇸' },
  { code: 'es', label: 'ES', flag: '🇪🇸' },
  { code: 'fr', label: 'FR', flag: '🇫🇷' },
] as const;

type LangCode = (typeof LANGUAGES)[number]['code'];

const RETRACT_AFTER_SELECT_MS = 2000;
const RETRACT_AFTER_OPEN_MS   = 5000; // auto-close if user doesn't pick

export function SmartLanguageFAB() {
  const { language, setLanguage } = useLanguage();
  const [open, setOpen] = useState(false);

  // useRef so timers survive re-renders without stale closures
  const selectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const openTimerRef   = useRef<ReturnType<typeof setTimeout> | null>(null);

  const currentLang = LANGUAGES.find(l => l.code === language) ?? LANGUAGES[0];

  // ── Cleanup on unmount ──
  useEffect(() => {
    return () => {
      if (selectTimerRef.current) clearTimeout(selectTimerRef.current);
      if (openTimerRef.current)   clearTimeout(openTimerRef.current);
    };
  }, []);

  // ── Open selector ──
  const handleOpen = useCallback(() => {
    // Cancel any pending retract
    if (selectTimerRef.current) { clearTimeout(selectTimerRef.current); selectTimerRef.current = null; }
    if (openTimerRef.current)   { clearTimeout(openTimerRef.current);   openTimerRef.current   = null; }

    setOpen(true);

    // Auto-close if user opens but doesn't pick anything
    openTimerRef.current = setTimeout(() => {
      setOpen(false);
    }, RETRACT_AFTER_OPEN_MS);
  }, []);

  // ── Close selector ──
  const handleClose = useCallback(() => {
    if (openTimerRef.current)   { clearTimeout(openTimerRef.current);   openTimerRef.current   = null; }
    if (selectTimerRef.current) { clearTimeout(selectTimerRef.current); selectTimerRef.current = null; }
    setOpen(false);
  }, []);

  // ── Toggle ──
  const handleToggle = useCallback(() => {
    if (open) {
      handleClose();
    } else {
      handleOpen();
    }
  }, [open, handleOpen, handleClose]);

  // ── Select a language ──
  const handleSelect = useCallback((code: LangCode) => {
    setLanguage(code as any);
    if ('vibrate' in navigator) navigator.vibrate(15);

    // Cancel the open-idle timer
    if (openTimerRef.current) { clearTimeout(openTimerRef.current); openTimerRef.current = null; }
    // Cancel any previous select timer
    if (selectTimerRef.current) { clearTimeout(selectTimerRef.current); selectTimerRef.current = null; }

    // Schedule retract after selection
    selectTimerRef.current = setTimeout(() => {
      setOpen(false);
      selectTimerRef.current = null;
    }, RETRACT_AFTER_SELECT_MS);
  }, [setLanguage]);

  // ── Render via portal — avoids being clipped by ANY ancestor ──
  const fab = (
    <div
      style={{
        position: 'fixed',
        top: 16,
        right: 16,
        zIndex: 99999,
        fontFamily: "'DM Sans', sans-serif",
        pointerEvents: 'auto',
      }}
    >
      <motion.div
        layout
        style={{
          display: 'flex',
          alignItems: 'center',
          background: 'rgba(14, 11, 13, 0.9)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          border: '1px solid rgba(255, 255, 255, 0.09)',
          borderRadius: 100,
          padding: '4px',
          boxShadow: '0 4px 24px rgba(0,0,0,0.5)',
          overflow: 'hidden',
        }}
        transition={{ layout: { duration: 0.26, ease: [0.4, 0, 0.2, 1] } }}
      >
        {/* ── COLLAPSED: only show active language ── */}
        {!open && (
          <motion.button
            key="trigger"
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.85 }}
            transition={{ duration: 0.16 }}
            onClick={handleToggle}
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
            aria-label={`Language: ${currentLang.label}. Tap to change.`}
            aria-expanded={false}
          >
            <span style={{ fontSize: 14, lineHeight: 1 }}>{currentLang.flag}</span>
            <span>{currentLang.label}</span>
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none" style={{ opacity: 0.45 }}>
              <path d="M3 4L5 6L7 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </motion.button>
        )}

        {/* ── EXPANDED: all options ── */}
        <AnimatePresence>
          {open && (
            <motion.div
              key="options"
              initial={{ opacity: 0, width: 0 }}
              animate={{ opacity: 1, width: 'auto' }}
              exit={{ opacity: 0, width: 0 }}
              transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }}
              style={{ display: 'flex', alignItems: 'center', gap: 2, overflow: 'hidden' }}
              role="group"
              aria-label="Select language"
            >
              {LANGUAGES.map((lang, idx) => (
                <motion.button
                  key={lang.code}
                  onClick={() => handleSelect(lang.code)}
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.04, duration: 0.16 }}
                  whileHover={{ scale: 1.07 }}
                  whileTap={{ scale: 0.93 }}
                  style={{
                    background: language === lang.code ? 'rgba(232,85,78,0.18)' : 'transparent',
                    border: `1px solid ${language === lang.code ? 'rgba(232,85,78,0.4)' : 'transparent'}`,
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
                    transition: 'background 0.12s, color 0.12s, border-color 0.12s',
                  }}
                  aria-pressed={language === lang.code}
                  aria-label={lang.label}
                >
                  <span style={{ fontSize: 13, lineHeight: 1 }}>{lang.flag}</span>
                  <span>{lang.label}</span>
                </motion.button>
              ))}

              {/* Close button */}
              <motion.button
                onClick={handleClose}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.14 }}
                whileHover={{ scale: 1.15 }}
                whileTap={{ scale: 0.9 }}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '4px 8px',
                  color: '#6B5A60',
                  fontSize: 13,
                  display: 'flex',
                  alignItems: 'center',
                  flexShrink: 0,
                }}
                aria-label="Close language selector"
              >
                ✕
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );

  // Render into document.body — bypasses ALL ancestor overflow/transform constraints
  return createPortal(fab, document.body);
}
