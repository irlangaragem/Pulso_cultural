import { useRef, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toPng } from 'html-to-image';
import { Share2, Download } from 'lucide-react';
import { VisitorLayout } from '../components/VisitorLayout';
import { useAuthStore } from '../store/useAuthStore';
import { localDb } from '../services/localDb';

export function CardShare() {
  const navigate = useNavigate();
  const shareRef = useRef<HTMLDivElement>(null);
  const [isSharing, setIsSharing] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [visitorName, setVisitorName] = useState('Visitante');

  const user = useAuthStore(state => state.user);

  useEffect(() => {
    // Try to get name from AuthStore, then from LocalDB (last registered)
    if (user?.name) {
      setVisitorName(user.name);
    } else {
      const visitors = localDb.getVisitors();
      if (visitors.length > 0) {
        setVisitorName(visitors[visitors.length - 1].name);
      }
    }
  }, [user]);

  const firstName = visitorName.split(' ')[0];
  const dateStr = new Date().toLocaleDateString('pt-BR', { 
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

  const handleShare = async () => {
    setIsSharing(true);
    const dataUrl = await generateImage();
    setIsSharing(false);

    if (!dataUrl) return;

    try {
      const blob = await (await fetch(dataUrl)).blob();
      const file = new File([blob], 'meu-pulso-cultural.png', { type: 'image/png' });

      if (navigator.share) {
        await navigator.share({
          title: 'Meu Pulso Cultural',
          text: 'Fiz a cultura pulsar no MAM Bahia hoje!',
          files: [file],
        });
      } else {
        // Fallback if Web Share API not supported
        handleDownload(dataUrl);
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
    }
  };

  return (
    <VisitorLayout>
      <div className="v-card-screen">
        <div className="visitor-glow" />

        <p className="v-card-label">I made culture pulse today.</p>

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
              Eu fiz a cultura pulsar hoje.
            </h1>
            <p className="v-share-card-date" style={{ marginBottom: '12px' }}>
              {dateStr}
            </p>
            <div className="v-share-card-expo">
              Uma História da Arte Brasileira
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
            {isSharing ? 'Gerando...' : 'Compartilhar'}
          </button>
          
          <button 
            className="v-btn-secondary" 
            onClick={() => handleDownload()}
            disabled={isSharing || isDownloading}
            style={{ color: '#F5ECE4', borderColor: 'rgba(255,255,255,0.2)' }}
          >
            <Download size={16} />
            {isDownloading ? 'Salvando...' : 'Salvar'}
          </button>
        </div>

        <button 
          className="v-btn-ghost" 
          style={{ marginTop: 24, padding: '8px 24px' }}
          onClick={() => navigate('/guide')}
        >
          ← Voltar ao guia
        </button>

      </div>
    </VisitorLayout>
  );
}
