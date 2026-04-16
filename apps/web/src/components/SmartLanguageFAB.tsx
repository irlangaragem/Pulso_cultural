import { useState, useEffect } from 'react';
import { motion, AnimatePresence, useAnimation } from 'framer-motion';
import { useLanguage } from '../contexts/LanguageContext';
import { Globe, Languages } from 'lucide-react';

const STORAGE_KEY = 'pulso:fab_position_v2';
const LANGUAGES = [
  { code: 'pt', label: 'Português', flag: '🇧🇷' },
  { code: 'en', label: 'English', flag: '🇺🇸' },
  { code: 'es', label: 'Español', flag: '🇪🇸' },
  { code: 'fr', label: 'Français', flag: '🇫🇷' }
];

export function SmartLanguageFAB() {
  const { language, setLanguage } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const controls = useAnimation();

  // Initial position: Bottom Right
  const defaultPos = { x: window.innerWidth - 80, y: window.innerHeight - 150 };

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const pos = JSON.parse(saved);
        controls.set(pos);
      } catch (e) {
        controls.set(defaultPos);
      }
    } else {
      controls.set(defaultPos);
    }
  }, [controls]);

  const onDragEnd = (_: any, info: any) => {
    setIsDragging(false);
    const screenWidth = window.innerWidth;
    const finalX = info.point.x;
    const isLeftSide = finalX < screenWidth / 2;
    
    // Snap to left or right padding
    const snapX = isLeftSide ? 20 - (info.point.x - info.offset.x) : (screenWidth - 76) - (info.point.x - info.offset.x);
    
    controls.start({
      x: snapX,
      transition: { type: 'spring', stiffness: 250, damping: 25 }
    });

    localStorage.setItem(STORAGE_KEY, JSON.stringify({ x: snapX, y: info.offset.y }));
  };

  return (
    <motion.div
      drag
      dragMomentum={false}
      animate={controls}
      onDragStart={() => {
        setIsDragging(true);
        setIsOpen(false);
      }}
      onDragEnd={onDragEnd}
      style={{
        position: 'fixed',
        zIndex: 9999,
        left: 0,
        top: 0,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        touchAction: 'none',
        pointerEvents: 'auto'
      }}
    >
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 10 }}
            style={{
              background: 'rgba(28, 22, 32, 0.98)',
              backdropFilter: 'blur(20px)',
              borderRadius: 20,
              padding: '8px',
              marginBottom: 12,
              border: '1px solid rgba(255,255,255,0.1)',
              boxShadow: '0 10px 40px rgba(0,0,0,0.6)',
              display: 'flex',
              flexDirection: 'column',
              gap: 2,
              width: 170
            }}
          >
            {LANGUAGES.map((lang) => (
              <button
                key={lang.code}
                onClick={(e) => {
                  e.stopPropagation();
                  console.log(`Setting language to ${lang.code}`);
                  setLanguage(lang.code as any);
                  setIsOpen(false);
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '12px 16px',
                  background: language === lang.code ? 'rgba(232, 85, 78, 0.2)' : 'transparent',
                  border: 'none',
                  borderRadius: 14,
                  color: language === lang.code ? '#F5ECE4' : '#A8969A',
                  fontSize: 14,
                  fontWeight: language === lang.code ? 700 : 500,
                  cursor: 'pointer',
                  textAlign: 'left'
                }}
              >
                <span>{lang.flag}</span>
                <span style={{ flex: 1 }}>{lang.label}</span>
                {language === lang.code && <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#E8554E' }} />}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        onClick={(e) => {
          e.stopPropagation();
          if (!isDragging) setIsOpen(!isOpen);
        }}
        animate={{ 
          scale: isOpen ? 1.1 : 1,
          backgroundColor: isOpen ? 'rgba(232, 85, 78, 0.2)' : 'rgba(255, 255, 255, 0.1)' 
        }}
        style={{
          width: 58,
          height: 58,
          borderRadius: 29,
          backdropFilter: 'blur(12px)',
          border: '1px solid rgba(255, 255, 255, 0.2)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#F5ECE4',
          boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
          cursor: isDragging ? 'grabbing' : 'grab',
          position: 'relative'
        }}
      >
        {isOpen ? <Languages size={26} color="#E8554E" /> : <Globe size={26} />}
        {!isOpen && (
          <span style={{ 
            position: 'absolute', 
            bottom: -4, 
            right: -4, 
            fontSize: 14,
            background: 'rgba(232, 85, 78, 1)',
            borderRadius: '50%',
            width: 22,
            height: 22,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: '2px solid #1C1620'
          }}>
            {LANGUAGES.find(l => l.code === language)?.flag}
          </span>
        )}
      </motion.button>
    </motion.div>
  );
}
