import { useRef, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { toPng } from 'html-to-image';
import { Share2, Download } from 'lucide-react';
import { VisitorLayout } from '../components/VisitorLayout';
import { analytics } from '../services/analytics';
import { useLanguage } from '../contexts/LanguageContext';
import { MUSEUM_SLUG } from '../config/museum';

const EXHIBITION_ID = 'default-exhibition';

export function CardShare() {
  const navigate = useNavigate();
  const location = useLocation();
  const { t, language } = useLanguage();
  const shareRef = useRef<HTMLDivElement>(null);
  const [isSharing, setIsSharing] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  // Actual rating passed from Guide via navigate state — fallback to 5 only when absent
  const visitorRating: number = (location.state as any)?.rating ?? 5;
  const dateStr = new Date().toLocaleDateString(language === 'pt' ? 'pt-BR' : 'en-US', {
    day: '2-digit', month: 'short', year: 'numeric'
  }).toUpperCase().replace(/ DE /g, ' DE ');

  const generateImage = async () => {
    if (!shareRef.current) return null;
    try {
      await new Promise(resolve => setTimeout(resolve, 100)); // Ensure render
      const dataUrl = await toPng(shareRef.current, {
        cacheBust: true,
        backgroundColor: '#110D10',
        style: { transform: 'scale(1)', margin: '0' }
      });
      return dataUrl;
    } catch (err) {
      console.error('Error generating image:', err);
      return null;
    }
  };

  const recordShareChannel = (channel: string) => {
    // Only include rating in analytics if it was explicitly set (not default 5)
    const hasRealRating = (location.state as any)?.rating !== undefined;

    analytics.track('share_completed', {
      exhibitionId: EXHIBITION_ID,
      museumSlug: MUSEUM_SLUG,
      properties: { channel, ...(hasRealRating ? { rating: visitorRating } : {}) }
    });

    // Persisting an evaluation requires the raw CPF, which is no longer kept
    // in localStorage (LGPD). Backed by analytics for now; full evaluation
    // submit returns once visitor tokens are wired up.
  };

  const handleShare = async () => {
    analytics.track('share_clicked', { exhibitionId: EXHIBITION_ID, museumSlug: MUSEUM_SLUG });
    setIsSharing(true);
    const dataUrl = await generateImage();
    setIsSharing(false);

    if (!dataUrl) return;

    try {
      const blob = await (await fetch(dataUrl)).blob();
      const file = new File([blob], 'meu-pulso-cultural.png', { type: 'image/png' });

      if (navigator.share) {
        await navigator.share({
          title: t('venue.name'),
          text: t('share.message'),
          files: [file],
          url: `https://pulsocultural.art/?utm_source=share&utm_medium=app&utm_campaign=visitor_share&utm_content=${MUSEUM_SLUG}`
        });
        recordShareChannel('native_share');
      } else {
        handleDownload(dataUrl);
        recordShareChannel('download');
      }
    } catch (err) {
      console.error('Share failed:', err);
    }
  };

  const handleDownload = async (preGeneratedDataUrl?: string) => {
    setIsDownloading(true);
    const dataUrl = preGeneratedDataUrl || await generateImage();
    setIsDownloading(false);

    if (dataUrl) {
      const link = document.createElement('a');
      link.download = 'meu-pulso-cultural.png';
      link.href = dataUrl;
      link.click();
      if (!preGeneratedDataUrl) recordShareChannel('download');
    }
  };

  return (
    <VisitorLayout>
      <div className="v-card-screen">
        <div className="visitor-glow" />

        <p className="v-card-label">{t('share.label')}</p>

        {/* The Card to be shared / exported */}
        <div className="v-share-card" ref={shareRef}>
          <div style={{ position: 'relative' }}>
            <img 
              src="https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?q=80&w=600&auto=format&fit=crop" 
              alt="Obra de Arte" 
              className="v-share-card-image" 
            />
            {/* Overlay gradient so text is readable if image is bright */}
            <div style={{
              position: 'absolute', inset: 0, 
              background: 'linear-gradient(to bottom, rgba(17,13,16,0) 0%, rgba(17,13,16,1) 100%)'
            }} />
            
            {/* Header info over image */}
            <div style={{ position: 'absolute', top: 16, left: 16, right: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#E8554E" strokeWidth="2">
                  <circle cx="12" cy="12" r="6" />
                  <circle cx="12" cy="12" r="2" fill="#E8554E" />
                </svg>
                <div style={{ display: 'flex', gap: 4 }}>
                  <span style={{ fontFamily: 'Sora', fontWeight: 700, fontSize: 10, color: '#FFF' }}>PULSO</span>
                  <span style={{ fontFamily: 'Sora', fontWeight: 300, fontSize: 10, color: '#FFF', opacity: 0.7 }}>CULTURAL</span>
                </div>
              </div>
              <div style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', padding: '4px 8px', borderRadius: 4, fontFamily: 'Space Mono', fontSize: 8, color: '#FFF' }}>
                MAM SALVADOR
              </div>
            </div>
          </div>

          <div className="v-share-card-body">
            <h1 className="v-share-card-headline v-text-gradient" style={{ marginBottom: '8px' }}>
              {t('share.label')}
            </h1>
            <p className="v-share-card-date" style={{ marginBottom: '12px' }}>
              {dateStr}
            </p>
            <div className="v-share-card-expo">
              {t('exhibition.title')}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="v-card-actions">
          <button 
            className="v-btn-primary" 
            onClick={handleShare}
            disabled={isSharing || isDownloading}
          >
            <Share2 size={16} />
            {isSharing ? t('share.button.generate') : t('share.button.share')}
          </button>
          
          <button 
            className="v-btn-secondary" 
            onClick={() => handleDownload()}
            disabled={isSharing || isDownloading}
            style={{ color: '#F5ECE4', borderColor: 'rgba(255,255,255,0.2)' }}
          >
            <Download size={16} />
            {isDownloading ? t('share.button.saving') : t('share.button.save')}
          </button>
        </div>

        <button 
          className="v-btn-ghost" 
          style={{ marginTop: 24, padding: '8px 24px' }}
          onClick={() => navigate('/guide')}
        >
          {t('share.back')}
        </button>

      </div>
    </VisitorLayout>
  );
}
