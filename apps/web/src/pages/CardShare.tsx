import { useEffect, useRef, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { toPng } from 'html-to-image';
import { Share2, Download } from 'lucide-react';
import { VisitorLayout } from '../components/VisitorLayout';
import { analytics } from '../services/analytics';
import { api } from '../services/api';
import { useLanguage } from '../contexts/LanguageContext';
import { MUSEUM_SLUG } from '../config/museum';

const FALLBACK_EXHIBITION_ID = 'default-exhibition';

/** Build the share URL pointing back at the visitor app — the previous version
 *  hard-coded `pulsocultural.art` which doesn't resolve, so every share link
 *  led to a dead page. We use VITE_PUBLIC_URL when set (production), falling
 *  back to the current origin (dev/preview). The `?exhibition=<id>` is read
 *  by Guide.tsx to load the right exposition for visitors who arrive via the
 *  shared link. */
function buildShareUrl(exhibitionId?: string): string {
  const base = (import.meta as any).env?.VITE_PUBLIC_URL
    || (typeof window !== 'undefined' ? window.location.origin : '');
  const trimmed = base.replace(/\/$/, '');
  const exId = exhibitionId || FALLBACK_EXHIBITION_ID;
  return `${trimmed}/?exhibition=${encodeURIComponent(exId)}&utm_source=share&utm_medium=app&utm_campaign=visitor_share&utm_content=${MUSEUM_SLUG}`;
}

/** Resolve relative API uploads (/uploads/files/...) and tolerate data: URLs. */
function resolveImg(url: string | null | undefined): string {
  if (!url) return '';
  if (/^(https?:|data:|blob:)/i.test(url)) return url;
  const apiBase = (import.meta as any).env?.VITE_API_URL || '';
  return `${apiBase}${url}`;
}

export function CardShare() {
  const navigate = useNavigate();
  const location = useLocation();
  const { t, language } = useLanguage();
  const shareRef = useRef<HTMLDivElement>(null);
  const [isSharing, setIsSharing] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [exhibition, setExhibition] = useState<{
    id?: string;
    name?: string;
    coverImage?: string | null;
    museumName?: string;
  } | null>(null);
  // Hide the cover image if it 404s (legacy /uploads/files paths from before
  // the data-URL migration) and fall back to the gradient background.
  const [coverFailed, setCoverFailed] = useState(false);

  // Actual rating passed from Guide via navigate state — fallback to 5 only when absent.
  const visitorRating: number = (location.state as any)?.rating ?? 5;

  const dateStr = new Date().toLocaleDateString(language === 'pt' ? 'pt-BR' : 'en-US', {
    day: '2-digit', month: 'short', year: 'numeric'
  }).toUpperCase().replace(/ DE /g, ' DE ');

  // Pull real exhibition data so the share card shows the actual cover image
  // and exhibition title — was hard-coded to an Unsplash placeholder before.
  useEffect(() => {
    const requestedId = typeof window !== 'undefined'
      ? new URLSearchParams(window.location.search).get('exhibition')
      : null;
    const url = requestedId
      ? `/api/v1/public/exhibitions/by-id/${encodeURIComponent(requestedId)}`
      : '/api/v1/public/exhibitions/active';
    api.get(url)
      .then(res => {
        setExhibition({
          id: res.data?.id,
          name: res.data?.name,
          coverImage: res.data?.coverImage,
          museumName: res.data?.museum?.name,
        });
      })
      .catch(err => {
        console.warn('[CardShare] exhibition load failed; using fallback copy:', err?.message);
      });
  }, []);

  const exhibitionTitle = exhibition?.name || t('exhibition.title');
  const museumLabel = (exhibition?.museumName || t('venue.name')).toUpperCase();
  const cover = exhibition?.coverImage && !coverFailed ? resolveImg(exhibition.coverImage) : '';

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
    const hasRealRating = (location.state as any)?.rating !== undefined;
    analytics.track('share_completed', {
      exhibitionId: exhibition?.id || FALLBACK_EXHIBITION_ID,
      museumSlug: MUSEUM_SLUG,
      properties: { channel, ...(hasRealRating ? { rating: visitorRating } : {}) }
    });
  };

  const handleShare = async () => {
    const exId = exhibition?.id || FALLBACK_EXHIBITION_ID;
    analytics.track('share_clicked', { exhibitionId: exId, museumSlug: MUSEUM_SLUG });
    setIsSharing(true);
    const dataUrl = await generateImage();
    setIsSharing(false);

    if (!dataUrl) return;

    try {
      const blob = await (await fetch(dataUrl)).blob();
      const file = new File([blob], 'meu-pulso-cultural.png', { type: 'image/png' });
      const shareUrl = buildShareUrl(exhibition?.id);

      if (navigator.share) {
        await navigator.share({
          title: exhibitionTitle,
          text: t('share.message'),
          files: [file],
          url: shareUrl,
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
            {cover ? (
              <img
                src={cover}
                alt=""
                crossOrigin="anonymous"
                onError={() => setCoverFailed(true)}
                className="v-share-card-image"
              />
            ) : (
              // Gradient placeholder when no cover image is set or it 404s.
              // Keeps the card looking intentional rather than empty/broken.
              <div
                className="v-share-card-image"
                style={{
                  background: 'linear-gradient(135deg, #2A0E1F 0%, #1A0A14 50%, #0E0B0D 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <svg width="56" height="56" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                  <defs>
                    <radialGradient id="card-pulse-core" cx="42%" cy="38%">
                      <stop offset="0%" stopColor="#F28C38" />
                      <stop offset="100%" stopColor="#E8554E" />
                    </radialGradient>
                  </defs>
                  <circle cx="50" cy="50" r="44" fill="none" stroke="#F28C38" strokeWidth="0.8" opacity="0.3" />
                  <circle cx="50" cy="50" r="32" fill="none" stroke="#D4267E" strokeWidth="1.5" opacity="0.45" />
                  <circle cx="50" cy="50" r="20" fill="none" stroke="#E8554E" strokeWidth="2.2" opacity="0.65" />
                  <circle cx="50" cy="50" r="8" fill="url(#card-pulse-core)" />
                </svg>
              </div>
            )}
            {/* Overlay gradient so text is readable if image is bright */}
            <div style={{
              position: 'absolute', inset: 0,
              background: 'linear-gradient(to bottom, rgba(17,13,16,0) 0%, rgba(17,13,16,0.92) 100%)'
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
              <div style={{
                background: 'rgba(0,0,0,0.55)',
                backdropFilter: 'blur(4px)',
                padding: '4px 8px',
                borderRadius: 4,
                fontFamily: 'Space Mono',
                fontSize: 8,
                color: '#FFF',
                letterSpacing: 1,
                maxWidth: 160,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}>
                {museumLabel}
              </div>
            </div>
          </div>

          <div className="v-share-card-body">
            <h1 className="v-share-card-headline v-text-gradient" style={{ marginBottom: '6px' }}>
              {t('share.label')}
            </h1>

            {/* Visitor's actual rating — was hidden before, but it's the whole
                point of the card: the visitor is showing they engaged. */}
            <div
              role="img"
              aria-label={`${visitorRating} de 5 estrelas`}
              style={{
                fontSize: 14,
                letterSpacing: 2,
                color: '#E8554E',
                margin: '0 0 8px',
                fontFamily: "'DM Sans', sans-serif",
              }}
            >
              {'★'.repeat(Math.max(0, Math.min(5, visitorRating)))}
              <span style={{ color: 'rgba(232,85,78,0.25)' }}>
                {'★'.repeat(5 - Math.max(0, Math.min(5, visitorRating)))}
              </span>
            </div>

            <p className="v-share-card-date" style={{ marginBottom: '12px' }}>
              {dateStr}
            </p>
            <div className="v-share-card-expo">
              {exhibitionTitle}
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
