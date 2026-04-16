import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, useAnimation } from 'framer-motion';
import { useLanguage } from '../contexts/LanguageContext';
import { Globe, Languages } from 'lucide-react';

const STORAGE_KEY = 'pulso:fab_position';
const LANGUAGES = [
  { code: 'pt', label: 'Português', flag: '🇧🇷' },
  { code: 'en', label: 'English', flag: '🇺🇸' },
  { code: 'es', label: 'Español', flag: '🇪🇸' },
  { code: 'fr', label: 'Français', flag: '🇫🇷' }
];

export function SmartLanguageFAB({ defaultPosition = { x: window.innerWidth - 80, y: window.innerHeight - 180 } }: { defaultPosition?: { x: number, y: number } }) {
  const { language, setLanguage } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const controls = useAnimation();
  const containerRef = useRef<HTMLDivElement>(null);

  // Load position
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const { x, y } = JSON.parse(saved);
        controls.set({ x, y });
      } catch (e) {
        controls.set(defaultPosition);
      }
    } else {
      controls.set(defaultPosition);
    }
  }, [controls, defaultPosition]);

  // Handle Snap to Edges
  const handleDragEnd = (_event: any, info: any) => {
    setIsDragging(false);
    const screenWidth = window.innerWidth;
    const finalX = info.point.x;
    
    // Determine near side
    const isLeftSide = finalX < screenWidth / 2;
    // Account for padding and FAB size
    const snapX = isLeftSide ? 20 - (screenWidth/2 - info.point.x) + info.offset.x : (screenWidth - 74) - (screenWidth/2 - info.point.x) + info.offset.x;
    
    // Simplest way with framer: calculate target check current position
    const targetX = finalX < screenWidth / 2 ? 0 : screenWidth - 60;
    
    // Use the offset to calculate new target
    const currentOffset = info.offset;
    const padding = 20;
    
    // We want the final absolute X to be 20 or screenWidth - 74
    // info.point.x is the absolute position on screen
    const xToSnap = isLeftSide ? currentOffset.x - (info.point.x - padding) : currentOffset.x + (screenWidth - padding - 54 - info.point.x);
    
    controls.start({ 
      x: xToSnap, 
      transition: { type: 'spring', stiffness: 300, damping: 30 } 
    }).then(() => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ x: xToSnap, y: info.offset.y }));
    });
  };

  return (
    <div 
      style={{ 
        position: 'fixed', 
        inset: 0, 
        pointerEvents: 'none', 
        zIndex: 9999 
      }}
      ref={containerRef}
    >
      <motion.div
        drag
        dragMomentum={false}
        dragConstraints={{ left: 10, right: window.innerWidth - 60, top: 50, bottom: window.innerHeight - 150 }}
        animate={controls}
        onDragStart={() => {
          setIsDragging(true);
          setIsOpen(false);
        }}
        onDragEnd={handleDragEnd}
        className="fab-container"
        style={{
          position: 'absolute',
          pointerEvents: 'auto',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.8, y: 10 }}
              style={{
                background: 'rgba(28, 22, 32, 0.95)',
                backdropFilter: 'blur(16px)',
                borderRadius: 20,
                padding: '8px',
                marginBottom: 12,
                border: '1px solid rgba(255,255,255,0.08)',
                boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
                display: 'flex',
                flexDirection: 'column',
                gap: 4,
                minWidth: 140
              }}
            >
              {LANGUAGES.map((lang) => (
                <button
                  key={lang.code}
                  onClick={() => {
                    setLanguage(lang.code as any);
                    setIsOpen(false);
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    padding: '10px 16px',
                    background: language === lang.code ? 'rgba(232, 85, 78, 0.15)' : 'transparent',
                    border: 'none',
                    borderRadius: 12,
                    color: language === lang.code ? '#F5ECE4' : '#A8969A',
                    fontSize: 13,
                    fontWeight: language === lang.code ? 700 : 500,
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'all 0.2s'
                  }}
                >
                  <span style={{ fontSize: 16 }}>{lang.flag}</span>
                  <span>{lang.label}</span>
                  {language === lang.code && (
                    <div style={{ marginLeft: 'auto', width: 4, height: 4, borderRadius: '50%', background: '#E8554E' }} />
                  )}
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        <motion.button
          onClick={() => !isDragging && setIsOpen(!isOpen)}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          animate={{ 
            opacity: isDragging || isOpen ? 1 : 0.6,
            boxShadow: isOpen ? '0 0 20px rgba(232, 85, 78, 0.3)' : '0 4px 12px rgba(0,0,0,0.3)'
          }}
          style={{
            width: 54,
            height: 54,
            borderRadius: '50%',
            background: 'rgba(255, 255, 255, 0.08)',
            backdropFilter: 'blur(12px)',
            border: '1px solid rgba(255, 255, 255, 0.12)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#F5ECE4',
            cursor: isDragging ? 'grabbing' : 'grab',
            touchAction: 'none'
          }}
        >
          {isOpen ? (
            <Languages size={24} style={{ color: '#E8554E' }} />
          ) : (
            <Globe size={24} />
          )}
        </motion.button>
      </motion.div>
    </div>
  );
}
