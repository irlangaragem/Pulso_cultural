import { useEffect, useMemo, useRef, useState } from 'react';
import QRCode from 'qrcode';
import { toPng } from 'html-to-image';
import { jsPDF } from 'jspdf';
import { COLORS, btnPrimary, btnGhost, btnSecondary } from './styles';

interface Exhibition {
  id: string;
  name: string;
  subtitle?: string | null;
  startDate: string;
  endDate: string;
  coverImage?: string | null;
}

interface MuseumInfo {
  name: string;
  shortName?: string;
  city: string;
  address: string;
  openingHours?: { tue_sun?: string; mon?: string };
}

interface Props {
  exhibition: Exhibition;
  museum: MuseumInfo;
  open: boolean;
  onClose: () => void;
}

const POSTER_W = 595;
const POSTER_H = 842;

function formatDateBR(iso: string): string {
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
}

/** Convert "10:00-18:00" → "10h - 18h"; leave other formats as-is. */
function formatHours(raw: string | undefined): string {
  if (!raw) return '10h - 18h';
  const m = raw.match(/^(\d{1,2}):?(\d{2})?\s*-\s*(\d{1,2}):?(\d{2})?$/);
  if (!m) return raw;
  return `${parseInt(m[1], 10)}h - ${parseInt(m[3], 10)}h`;
}

function buildVisitorUrl(exhibitionId: string): string {
  const base = (import.meta as any).env?.VITE_PUBLIC_URL
    || (typeof window !== 'undefined' ? window.location.origin : '');
  return `${base.replace(/\/$/, '')}/?exhibition=${exhibitionId}`;
}

/** Resolve a relative upload URL (e.g. "/uploads/files/abc.jpg") against the
 *  API host so html-to-image can fetch it for the PNG/PDF export. */
function resolveImg(url: string | null | undefined): string {
  if (!url) return '';
  if (/^(https?:|data:|blob:)/i.test(url)) return url;
  const apiBase = (import.meta as any).env?.VITE_API_URL || '';
  return `${apiBase}${url}`;
}

function isLocalhostUrl(url: string): boolean {
  return /^(https?:\/\/)?(localhost|127\.0\.0\.1|0\.0\.0\.0|::1|192\.168\.|10\.|172\.(1[6-9]|2\d|3[01])\.)/.test(url);
}

export function PosterPreview({ exhibition, museum, open, onClose }: Props) {
  const posterRef = useRef<HTMLDivElement>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [qrReady, setQrReady] = useState(false);
  const [downloading, setDownloading] = useState<'png' | 'pdf' | null>(null);
  // The cover image lives on the API container's ephemeral disk; if Railway
  // recycles the container the file 404s. Falling back to the gradient bg
  // keeps the poster from showing a broken-image icon.
  const [coverFailed, setCoverFailed] = useState(false);

  const visitorUrl = useMemo(() => buildVisitorUrl(exhibition.id), [exhibition.id]);
  const isLocal = useMemo(() => isLocalhostUrl(visitorUrl), [visitorUrl]);

  useEffect(() => {
    if (!open) return;
    setQrReady(false);
    QRCode.toDataURL(visitorUrl, {
      errorCorrectionLevel: 'H',
      margin: 1,
      width: 480,
      color: { dark: '#0E0B0D', light: '#F5ECE4' },
    })
      .then(url => { setQrDataUrl(url); setQrReady(true); })
      .catch(err => console.error('[poster] QR error:', err));
  }, [open, visitorUrl]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  const renderPosterImage = async (): Promise<string> => {
    if (!posterRef.current) throw new Error('poster not mounted');
    if (!qrReady) throw new Error('QR ainda carregando, aguarde 1s');
    // Force exact dimensions so html-to-image doesn't crop content that overflows
    // beyond the fixed 595×842 frame, and doesn't include any modal padding.
    return toPng(posterRef.current, {
      cacheBust: true,
      pixelRatio: 2,
      backgroundColor: '#1A0A14',
      width: POSTER_W,
      height: POSTER_H,
      canvasWidth: POSTER_W * 2,
      canvasHeight: POSTER_H * 2,
      style: {
        transform: 'translate(0,0)',
        transformOrigin: 'top left',
        margin: '0',
      },
    });
  };

  const handleDownloadPng = async () => {
    setDownloading('png');
    try {
      const dataUrl = await renderPosterImage();
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = `cartaz-${exhibition.id}.png`;
      a.click();
    } catch (err: any) {
      console.error('[poster] PNG export error:', err);
      alert(`Falha ao gerar PNG: ${err?.message || err}`);
    } finally {
      setDownloading(null);
    }
  };

  const handleDownloadPdf = async () => {
    setDownloading('pdf');
    try {
      const dataUrl = await renderPosterImage();
      const pdf = new jsPDF({ unit: 'pt', format: 'a4' });
      const pageW = pdf.internal.pageSize.getWidth();
      const pageH = pdf.internal.pageSize.getHeight();
      const ratio = Math.min(pageW / POSTER_W, pageH / POSTER_H);
      const renderW = POSTER_W * ratio;
      const renderH = POSTER_H * ratio;
      const x = (pageW - renderW) / 2;
      const y = (pageH - renderH) / 2;
      pdf.addImage(dataUrl, 'PNG', x, y, renderW, renderH);
      pdf.save(`cartaz-${exhibition.id}.pdf`);
    } catch (err: any) {
      console.error('[poster] PDF export error:', err);
      alert(`Falha ao gerar PDF: ${err?.message || err}`);
    } finally {
      setDownloading(null);
    }
  };

  const handlePrint = async () => {
    setDownloading('pdf');
    try {
      const dataUrl = await renderPosterImage();
      const w = window.open('', '_blank');
      if (!w) return;
      w.document.write(`
        <html><head><title>Cartaz · ${exhibition.name}</title>
        <style>
          @page { size: A4; margin: 0; }
          body { margin: 0; background: #0E0B0D; }
          img { width: 100%; height: auto; display: block; }
          @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
        </style>
        </head><body><img src="${dataUrl}" /></body></html>
      `);
      w.document.close();
      setTimeout(() => w.print(), 500);
    } catch (err: any) {
      console.error('[poster] print error:', err);
      alert(`Falha ao imprimir: ${err?.message || err}`);
    } finally {
      setDownloading(null);
    }
  };

  if (!open) return null;

  const dateRange = `${formatDateBR(exhibition.startDate)} a ${formatDateBR(exhibition.endDate)}`;
  const hours = formatHours(museum.openingHours?.tue_sun);
  const dow = 'TER · DOM';
  const downloadDisabled = !qrReady || !!downloading;

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.85)',
        backdropFilter: 'blur(8px)',
        zIndex: 1000,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Scroll area: poster + warning */}
      <div
        onClick={e => e.stopPropagation()}
        style={{
          flex: 1,
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 18,
          padding: '24px 24px 16px',
        }}
      >
        {/* Localhost warning */}
        {isLocal && (
          <div style={{
            background: 'rgba(245,193,71,0.12)',
            border: '1px solid rgba(245,193,71,0.4)',
            color: '#F5C147',
            padding: '10px 16px',
            borderRadius: 10,
            fontSize: 12,
            maxWidth: POSTER_W,
            textAlign: 'center',
          }}>
            ⚠️ O QR aponta para <strong>{visitorUrl}</strong> — só vai funcionar nesta máquina.
            Configure <code>VITE_PUBLIC_URL=https://seu-dominio.com</code> no <code>.env.local</code> do web pra gerar QR de produção.
          </div>
        )}

        {/* The poster — fixed 595×842 (A4 @ 72dpi) with overflow:hidden so no
            child can push the visible bounds and cause cropping in PDF/PNG. */}
        <div
          ref={posterRef}
          style={{
            width: POSTER_W,
            height: POSTER_H,
            minHeight: POSTER_H,
            maxHeight: POSTER_H,
            overflow: 'hidden',
            background: 'linear-gradient(180deg, #2A0E1F 0%, #1A0A14 40%, #0E0B0D 100%)',
            borderRadius: 14,
            padding: '46px 48px 32px',
            boxSizing: 'border-box',
            color: COLORS.text,
            fontFamily: "'DM Sans', -apple-system, sans-serif",
            position: 'relative',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 40px 80px rgba(0,0,0,0.5)',
          }}
        >
          {/* Cover image as a tinted backdrop — gives the poster the personality
              of the exhibition while keeping all the text + QR clearly readable
              thanks to the dark gradient overlay above it. */}
          {exhibition.coverImage && !coverFailed && (
            <>
              <img
                src={resolveImg(exhibition.coverImage)}
                alt=""
                crossOrigin="anonymous"
                onError={() => setCoverFailed(true)}
                style={{
                  position: 'absolute',
                  inset: 0,
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  opacity: 0.32,
                  zIndex: 0,
                }}
              />
              <div style={{
                position: 'absolute',
                inset: 0,
                background: 'linear-gradient(180deg, rgba(26,10,20,0.72) 0%, rgba(14,11,13,0.92) 100%)',
                zIndex: 0,
              }} />
            </>
          )}

          {/* All content sits above the backdrop. Using flex:1 (instead of
              height:100%) so this wrapper becomes a regular flex child of the
              poster — guarantees the footer doesn't spill past the 842px
              bottom edge in the exported PNG/PDF. minHeight:0 lets the
              wrapper shrink correctly inside the parent flex column. */}
          <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
          {/* Logo */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 18 }}>
            <PosterPulseSymbol size={54} />
            <p style={{ fontFamily: "'Sora', sans-serif", fontWeight: 800, fontSize: 20, color: COLORS.text, margin: '10px 0 0', letterSpacing: 2 }}>
              PULSO
            </p>
            <p style={{ fontFamily: "'Sora', sans-serif", fontWeight: 300, fontSize: 9, color: COLORS.muted, margin: '2px 0 0', letterSpacing: 6 }}>
              CULTURAL
            </p>
          </div>

          {/* Museum tag */}
          <p style={{ fontFamily: "'Space Mono', monospace", fontSize: 11, color: COLORS.brand, textAlign: 'center', letterSpacing: 4, margin: 0 }}>
            {(museum.shortName || museum.name).toUpperCase()}
          </p>

          {/* Title */}
          <h1 style={{
            fontFamily: "'Sora', sans-serif",
            fontWeight: 800,
            fontSize: 34,
            color: COLORS.text,
            textAlign: 'center',
            margin: '10px 0 10px',
            lineHeight: 1.1,
            letterSpacing: -0.5,
          }}>
            {exhibition.name}
          </h1>

          {/* Subtitle */}
          {exhibition.subtitle && (
            <p style={{ color: COLORS.brand, fontSize: 13, textAlign: 'center', margin: '0 0 20px', fontWeight: 500 }}>
              {exhibition.subtitle}
            </p>
          )}

          {/* QR card */}
          <div style={{
            background: 'rgba(255,255,255,0.04)',
            border: `1px solid ${COLORS.border}`,
            borderRadius: 16,
            padding: '18px 22px 22px',
            margin: '0 auto 18px',
            width: '100%',
            maxWidth: 420,
            textAlign: 'center',
            boxSizing: 'border-box',
          }}>
            <p style={{ fontFamily: "'Sora', sans-serif", fontSize: 17, fontWeight: 700, color: COLORS.text, margin: '0 0 4px' }}>
              Escaneie e acesse o guia
            </p>
            <p style={{ color: COLORS.brand, fontSize: 11, margin: '0 0 12px' }}>
              Gratuito · Sem instalar nada · 30 segundos
            </p>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 12,
              background: '#F5ECE4',
              borderRadius: 12,
              margin: '0 auto',
              width: 200,
              height: 200,
              boxSizing: 'border-box',
            }}>
              {qrDataUrl ? (
                <img src={qrDataUrl} alt="QR code" style={{ width: '100%', height: '100%', display: 'block' }} crossOrigin="anonymous" />
              ) : (
                <span style={{ color: '#0E0B0D', fontSize: 11 }}>Gerando QR…</span>
              )}
            </div>
          </div>

          {/* Manifesto block */}
          <div style={{
            background: 'rgba(255,255,255,0.03)',
            border: `1px solid ${COLORS.border}`,
            borderRadius: 14,
            padding: '16px 24px',
            margin: '0 0 16px',
            textAlign: 'center',
          }}>
            <p style={{ color: COLORS.orange, fontFamily: "'Sora', sans-serif", fontSize: 15, fontWeight: 700, margin: '0 0 6px' }}>
              Seu pulso importa.
            </p>
            <p style={{ color: COLORS.muted, fontSize: 11, lineHeight: 1.5, margin: 0 }}>
              Quando você faz a cultura pulsar, conseguimos comprovar o impacto gerado — e assim é possível que exposições gratuitas como esta continuem existindo.
            </p>
          </div>

          {/* Feature chips */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
            {[
              'Áudio guia no celular',
              'História de cada obra',
              'Compartilhe sua visita',
            ].map(label => (
              <div key={label} style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '7px 12px',
                borderRadius: 100,
                border: `1px solid ${COLORS.border}`,
                background: 'rgba(255,255,255,0.02)',
                fontSize: 10,
                color: COLORS.muted,
              }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: COLORS.brand, display: 'inline-block' }} />
                {label}
              </div>
            ))}
          </div>

          {/* Footer info */}
          <div style={{ flex: 1 }} />
          <div style={{
            borderTop: `1px solid ${COLORS.border}`,
            paddingTop: 16,
            textAlign: 'center',
          }}>
            <p style={{ fontFamily: "'Space Mono', monospace", fontSize: 9, color: COLORS.faint, letterSpacing: 1, margin: 0 }}>
              ENTRADA GRATUITA · {dow} · {hours} · {dateRange}
            </p>
            <p style={{ fontFamily: "'Space Mono', monospace", fontSize: 8, color: COLORS.faint, margin: '6px 0 0' }}>
              {museum.address}, {museum.city}
            </p>
          </div>
        </div>

          </div>
      </div>

      {/* Action bar — fixed footer of the modal, never overlaps the poster */}
      <div
        onClick={e => e.stopPropagation()}
        style={{
          flexShrink: 0,
          padding: '14px 24px',
          background: 'rgba(10,7,9,0.96)',
          borderTop: `1px solid ${COLORS.border}`,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 8,
        }}
      >
        {!qrReady && (
          <p style={{ color: COLORS.faint, fontSize: 11, margin: 0, fontFamily: "'Space Mono', monospace", letterSpacing: 1 }}>
            QR ainda carregando — aguarde para baixar
          </p>
        )}
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center' }}>
          <button onClick={onClose} className="pulso-btn" style={btnGhost}>Fechar</button>
          <button onClick={handlePrint} disabled={downloadDisabled} className="pulso-btn" style={{ ...btnSecondary, opacity: downloadDisabled ? 0.4 : 1 }}>
            🖨  Imprimir
          </button>
          <button onClick={handleDownloadPng} disabled={downloadDisabled} className="pulso-btn" style={{ ...btnSecondary, opacity: downloadDisabled ? 0.4 : 1 }}>
            {downloading === 'png' ? 'Gerando PNG…' : '🖼  Baixar PNG'}
          </button>
          <button onClick={handleDownloadPdf} disabled={downloadDisabled} className="pulso-btn" style={{ ...btnPrimary, opacity: downloadDisabled ? 0.4 : 1 }}>
            {downloading === 'pdf' ? 'Gerando PDF…' : '📄 Baixar PDF (A4)'}
          </button>
        </div>
      </div>
    </div>
  );
}

/** Inline pulse logo — pure SVG without runtime gradient defs (more html-to-image friendly). */
function PosterPulseSymbol({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="poster-core" cx="42%" cy="38%">
          <stop offset="0%" stopColor="#F28C38" />
          <stop offset="100%" stopColor="#E8554E" />
        </radialGradient>
      </defs>
      <circle cx={50} cy={50} r={44} fill="none" stroke="#F28C38" strokeWidth={0.8} opacity={0.25} />
      <circle cx={50} cy={50} r={32} fill="none" stroke="#D4267E" strokeWidth={1.5} opacity={0.4} />
      <circle cx={50} cy={50} r={20} fill="none" stroke="#E8554E" strokeWidth={2.2} opacity={0.6} />
      <circle cx={50} cy={50} r={8} fill="url(#poster-core)" />
    </svg>
  );
}
