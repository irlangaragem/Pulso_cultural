import { useState, useEffect, useRef } from 'react';
import { Play, Pause } from 'lucide-react';
import { Howl } from 'howler';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { VisitorLayout } from '../components/VisitorLayout';
import { PulseSymbol } from '../components/PulseSymbol';

interface Work {
  id: string;
  title: string;
  artist: string;
  year?: string;
  room?: string;
  description?: string;
  audioUrl?: string;
  hasAudio?: boolean;
}

// Fallback data — exactly 6 works
const FALLBACK_WORKS: Work[] = [
  { id: '1', artist: 'Cândido Portinari', title: 'Retirantes', year: '1944', room: 'Sala 1', description: 'Óleo sobre tela que retrata a migração nordestina. Uma das obras mais emblemáticas da arte social brasileira.', hasAudio: true },
  { id: '2', artist: 'Anita Malfatti', title: 'A Boba', year: '1915–16', room: 'Sala 2', description: 'Obra-chave do modernismo brasileiro. A deformação expressionista causou escândalo na exposição de 1917.', hasAudio: true },
  { id: '3', artist: 'Di Cavalcanti', title: 'Cinco Moças de Guaratinguetá', year: '1930', room: 'Sala 2', description: 'Mulatas em cores tropicais — a brasilidade celebrada com sensualidade e vigor.', hasAudio: false },
  { id: '4', artist: 'Lygia Clark', title: 'Bicho', year: '1960', room: 'Sala 3', description: 'Escultura articulada em metal que convida à participação. O espectador se torna coautor da forma.', hasAudio: true },
  { id: '5', artist: 'Alfredo Volpi', title: 'Bandeirinhas', year: 'c. 1960', room: 'Sala 3', description: 'Têmpera sobre tela com o motivo que se tornou assinatura de Volpi. Geometria popular, cor vibrante.', hasAudio: false },
  { id: '6', artist: 'Iberê Camargo', title: 'Núcleo', year: '1963', room: 'Sala 4', description: 'Expressionismo abstrato carregado de matéria e tensão. Camadas densas de tinta criam profundidade emocional.', hasAudio: true },
];

const OTHER_EXPOS = [
  { name: 'Walter Smetak: Imprevisto e Invenção', room: 'Galeria 2' },
  { name: 'Xiló: Gravura Popular Nordestina', room: 'Espaço Educativo' },
  { name: 'Acervo de Arte Popular', room: 'Ala Sul' },
];

export function Guide() {
  const navigate = useNavigate();
  const [works, setWorks] = useState<Work[]>(FALLBACK_WORKS.slice(0, 6));
  const [activeWork, setActiveWork] = useState<string | null>(null);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const soundRef = useRef<Howl | null>(null);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    api.get('/exhibitions/default-exhibition').then(res => {
      if (res.data.works && res.data.works.length > 0) {
        setWorks(res.data.works.slice(0, 6));
      }
    }).catch(() => {
      // Use fallback data
    });
  }, []);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (soundRef.current && playingId) {
      interval = setInterval(() => {
        const s = soundRef.current;
        if (!s) return;
        const current = s.seek() as number;
        const duration = s.duration();
        if (duration > 0) setProgress((current / duration) * 100);
      }, 500);
    }
    return () => clearInterval(interval!);
  }, [playingId]);

  // Inactivity timeout
  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout>;
    const resetTimer = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        if (soundRef.current) soundRef.current.stop();
        navigate('/');
      }, 12 * 60 * 1000);
    };
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'touchmove'];
    events.forEach(e => window.addEventListener(e, resetTimer));
    resetTimer();
    return () => {
      clearTimeout(timeoutId);
      events.forEach(e => window.removeEventListener(e, resetTimer));
    };
  }, [navigate]);

  useEffect(() => {
    return () => { if (soundRef.current) soundRef.current.stop(); };
  }, []);

  const togglePlay = (work: Work) => {
    if (playingId === work.id) {
      soundRef.current?.pause();
      setPlayingId(null);
    } else {
      soundRef.current?.stop();
      const url = work.audioUrl || 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3';
      const newSound = new Howl({
        src: [url],
        html5: true,
        onend: () => { setPlayingId(null); setProgress(0); },
      });
      newSound.play();
      soundRef.current = newSound;
      setPlayingId(work.id);
    }
  };

  return (
    <VisitorLayout>
      <div style={{ minHeight: '100%' }}>
        {/* Hero header */}
        <div className="v-guide-hero">
          <div className="visitor-glow" />
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, position: 'relative', zIndex: 1 }}>
            <PulseSymbol size={22} />
            <span style={{ fontFamily: 'Sora, sans-serif', fontWeight: 700, fontSize: 12, color: '#F5ECE4' }}>PULSO</span>
            <span style={{ fontFamily: 'Sora, sans-serif', fontWeight: 300, fontSize: 8, color: '#A8969A', letterSpacing: 2 }}>CULTURAL</span>
            <div style={{ flex: 1 }} />
            <div className="v-live-tag">
              <span className="v-live-dot" />AO VIVO
            </div>
          </div>
          <p style={{ fontFamily: "'Space Mono', monospace", fontSize: 9, color: '#E8554E', letterSpacing: 3, marginBottom: 6, position: 'relative', zIndex: 1 }}>
            EXPOSIÇÃO PRINCIPAL
          </p>
          <h1 className="v-guide-title">Uma História da Arte Brasileira</h1>
          <p className="v-guide-subtitle">80 obras do MAM Rio · Entrada gratuita</p>
          <p className="v-guide-meta">Ter a Dom · 13h às 18h</p>
        </div>

        {/* Description */}
        <div style={{ padding: '0 20px' }}>
          <p style={{ fontSize: 13, color: '#A8969A', lineHeight: 1.7 }}>
            80 obras do acervo do MAM Rio chegam a Salvador numa celebração da arte brasileira do século XX.
            De Portinari a Anita Malfatti, de Di Cavalcanti a Lygia Clark — um percurso que atravessa movimentos, gerações e visões de Brasil.
          </p>

          {/* Works */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 28, marginBottom: 14 }}>
            <h2 className="v-section-title">Destaques</h2>
            <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 9, color: '#6B5A60' }}>{works.length} OBRAS</span>
          </div>

          {works.map((w) => (
            <div
              key={w.id}
              className="v-work-card"
              onClick={() => setActiveWork(activeWork === w.id ? null : w.id)}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                {w.room && <div className="v-work-room">{w.room}</div>}
                <div style={{ flex: 1 }}>
                  <p className="v-work-title">{w.title}</p>
                  <p className="v-work-artist">{w.artist}{w.year ? ` · ${w.year}` : ''}</p>
                </div>
                {(w.hasAudio || w.audioUrl) && (
                  <button
                    className="v-audio-btn"
                    onClick={(e) => { e.stopPropagation(); togglePlay(w); }}
                  >
                    {playingId === w.id ? (
                      <Pause size={16} fill="#E8554E" stroke="none" />
                    ) : (
                      <Play size={16} fill="#E8554E" stroke="none" />
                    )}
                  </button>
                )}
              </div>

              {playingId === w.id && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10, paddingTop: 10, borderTop: '1px solid rgba(255,255,255,0.04)' }}>
                  <div style={{ flex: 1, height: 3, background: 'rgba(255,255,255,0.06)', borderRadius: 2, overflow: 'hidden' }}>
                    <div style={{ width: `${progress}%`, height: '100%', background: 'linear-gradient(90deg, #E8554E, #D4267E)', borderRadius: 2, transition: 'width 0.5s' }} />
                  </div>
                  <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 9, color: '#6B5A60' }}>
                    {Math.floor(progress / 100 * 180)}s
                  </span>
                </div>
              )}

              {activeWork === w.id && w.description && (
                <p className="v-work-desc">{w.description}</p>
              )}
            </div>
          ))}

          {/* Other exhibitions */}
          <h2 className="v-section-title" style={{ marginTop: 32, marginBottom: 14 }}>Também em cartaz</h2>
          {OTHER_EXPOS.map((ex, i) => (
            <div
              key={i}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '12px 0',
                borderBottom: '1px solid rgba(255,255,255,0.04)',
              }}
            >
              <span style={{ fontSize: 12, fontWeight: 500, color: '#A8969A', flex: 1 }}>{ex.name}</span>
              <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 9, color: '#6B5A60', letterSpacing: 0.5, flexShrink: 0, marginLeft: 12 }}>{ex.room}</span>
            </div>
          ))}

          {/* Share CTA */}
          <div className="v-share-cta">
            <PulseSymbol size={28} />
            <p style={{ color: '#F5ECE4', fontSize: 14, fontFamily: 'Sora, sans-serif', fontWeight: 600, margin: '12px 0 4px' }}>Curtiu a visita?</p>
            <p style={{ color: '#A8969A', fontSize: 12, marginBottom: 16 }}>Compartilhe que você fez a cultura pulsar hoje.</p>
            <button
              className="v-btn-primary"
              onClick={() => navigate('/card')}
            >
              Compartilhar meu pulso
            </button>
          </div>

          <div style={{ height: 40 }} />
        </div>
      </div>
    </VisitorLayout>
  );
}
