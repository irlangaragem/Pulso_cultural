import { useState, useEffect, useRef } from 'react';
import { Play, Pause } from 'lucide-react';
import { Howl } from 'howler';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { analytics } from '../services/analytics';
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
  { id: '1', artist: 'Cândido Portinari', title: 'Retirantes', year: '1944', room: 'Sala 1', description: 'Óleo sobre tela que retrata a migração nordestina. Uma das obras mais emblemáticas da arte social brasileira, mostrando a força e o sofrimento do povo em êxodo.', hasAudio: true },
  { id: '2', artist: 'Anita Malfatti', title: 'A Boba', year: '1915–16', room: 'Sala 2', description: 'Obra-chave do modernismo brasileiro. A deformação expressionista dos traços causou escândalo na exposição de 1917 e abriu caminho para a Semana de 22.', hasAudio: true },
  { id: '3', artist: 'Di Cavalcanti', title: 'Cinco Moças de Guaratinguetá', year: '1930', room: 'Sala 2', description: 'Mulatas em cores tropicais — a brasilidade celebrada com sensualidade e vigor. Di Cavalcanti traduz o povo em forma e cor.', hasAudio: false },
  { id: '4', artist: 'Lygia Clark', title: 'Bicho', year: '1960', room: 'Sala 3', description: 'Escultura articulada em metal que convida à participação. O espectador se torna coautor da forma — arte como experiência viva.', hasAudio: true },
  { id: '5', artist: 'Alfredo Volpi', title: 'Bandeirinhas', year: 'c. 1960', room: 'Sala 3', description: 'Têmpera sobre tela com o motivo que se tornou assinatura de Volpi. Geometria popular, cor vibrante, simplicidade que é sofisticação.', hasAudio: false },
  { id: '6', artist: 'Iberê Camargo', title: 'Núcleo', year: '1963', room: 'Sala 4', description: 'Expressionismo abstrato carregado de matéria e tensão. Camargo construía suas telas com camadas densas de tinta, criando profundidade emocional.', hasAudio: true },
];

const OTHER_EXPOS = [
  { name: 'Walter Smetak: Imprevisto e Invenção', room: 'Galeria 2' },
  { name: 'Xiló: Gravura Popular Nordestina', room: 'Espaço Educativo' },
  { name: 'Acervo de Arte Popular', room: 'Ala Sul' },
];

const EXHIBITION_ID = 'default-exhibition';

export function Guide() {
  const navigate = useNavigate();
  const [exhibition, setExhibition] = useState<any>(null);
  const [works] = useState<Work[]>(FALLBACK_WORKS.slice(0, 6));
  const [activeWork, setActiveWork] = useState<string | null>('6'); // default: Núcleo open
  const [playingId, setPlayingId] = useState<string | null>(null);
  const soundRef = useRef<Howl | null>(null);
  const [progress, setProgress] = useState(0);

  const [showTimeoutWarning, setShowTimeoutWarning] = useState(false);
  const warningTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const logoutTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Feedback states
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [feedbackComment, setFeedbackComment] = useState('');
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);
  const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(false);

  const feedbackLabels: Record<number, string> = {
    1: "Pode melhorar",
    2: "Pode melhorar",
    3: "Interessante",
    4: "Muito bom",
    5: "Incrível 🔥"
  };

  const handleSubmitFeedback = async () => {
    if (rating === 0) return;
    setIsSubmittingFeedback(true);
    try {
      const cpf = localStorage.getItem('pulso:return_cpf');
      
      if (cpf) {
        await api.post('/evaluations', {
          cpf,
          exhibitionId: EXHIBITION_ID,
          rating,
          comment: feedbackComment || undefined,
        });
      }

      // Track the event even if cpf is missing
      analytics.track('rating_submitted', {
        exhibitionId: EXHIBITION_ID,
        properties: { rating, hasComment: !!feedbackComment }
      });

      setFeedbackSubmitted(true);
    } catch (err) {
      console.error(err);
      // Still mark as submitted for UX
      setFeedbackSubmitted(true);
    } finally {
      setIsSubmittingFeedback(false);
    }
  };

  // Track guide view on mount
  useEffect(() => {
    analytics.track('guide_viewed', { exhibitionId: EXHIBITION_ID });
  }, []);

  useEffect(() => {
    api.get('/exhibitions/default-exhibition').then(res => {
      setExhibition(res.data);
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
    const resetTimer = () => {
      if (warningTimeoutRef.current) clearTimeout(warningTimeoutRef.current);
      if (logoutTimeoutRef.current) clearTimeout(logoutTimeoutRef.current);
      setShowTimeoutWarning(false);

      warningTimeoutRef.current = setTimeout(() => {
        setShowTimeoutWarning(true);
      }, 11 * 60 * 1000); // 11 minutes

      logoutTimeoutRef.current = setTimeout(() => {
        if (soundRef.current) soundRef.current.stop();
        navigate('/');
      }, 12 * 60 * 1000); // 12 minutes
    };

    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'touchmove'];
    events.forEach(e => window.addEventListener(e, resetTimer));
    resetTimer();

    return () => {
      if (warningTimeoutRef.current) clearTimeout(warningTimeoutRef.current);
      if (logoutTimeoutRef.current) clearTimeout(logoutTimeoutRef.current);
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
              <span className="v-live-dot" />MAM
            </div>
          </div>
          <p style={{ fontFamily: "'Space Mono', monospace", fontSize: 9, color: '#E8554E', letterSpacing: 3, marginBottom: 6, position: 'relative', zIndex: 1 }}>
            EXPOSIÇÃO PRINCIPAL
          </p>
          <h1 className="v-guide-title">{exhibition?.name || 'Uma História da Arte Brasileira'}</h1>
          <p className="v-guide-subtitle">{exhibition?.subtitle || '80 obras do MAM Rio · Entrada gratuita'}</p>
          <p className="v-guide-meta">Ter a Dom · 10h às 18h</p>
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

          {works.map((w) => {
            const isActive = activeWork === w.id;
            return (
              <div
                key={w.id}
                className="v-work-card"
                style={{
                  borderColor: isActive ? 'rgba(232, 85, 78, 0.25)' : undefined,
                  background: isActive ? 'rgba(232, 85, 78, 0.04)' : undefined,
                }}
                onClick={() => setActiveWork(isActive ? null : w.id)}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  {w.room && <div className="v-work-room">{w.room}</div>}
                  <div style={{ flex: 1 }}>
                    <p className="v-work-title">
                      {w.title}
                    </p>
                    <p className="v-work-artist">{w.artist}{w.year ? ` · ${w.year}` : ''}</p>
                  </div>
                  {(w.hasAudio || w.audioUrl) && (
                    <button
                      className="v-audio-btn"
                      onClick={(e) => { e.stopPropagation(); togglePlay(w); }}
                      aria-label={`Áudio-guia: ${w.title}`}
                    >
                      {playingId === w.id ? (
                        <Pause size={16} fill="#E8554E" stroke="none" />
                      ) : (
                        <Play size={16} fill="#E8554E" stroke="none" />
                      )}
                    </button>
                  )}
                </div>

                {/* Audio progress bar */}
                {playingId === w.id && (
                  <div style={{ marginTop: 12, padding: '12px', background: 'rgba(232, 85, 78, 0.05)', borderRadius: 10, border: '1px solid rgba(232, 85, 78, 0.1)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div className="v-live-dot" style={{ width: 6, height: 6, backgroundColor: '#E8554E' }} />
                      <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 9, color: '#E8554E', letterSpacing: 1 }}>OUVINDO ÁUDIO-GUIA</span>
                      <div style={{ flex: 1 }} />
                      <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 9, color: '#6B5A60' }}>
                        {Math.floor(progress / 100 * 180)}s / 180s
                      </span>
                    </div>
                    <div style={{ flex: 1, height: 4, background: 'rgba(255,255,255,0.06)', borderRadius: 2, overflow: 'hidden', marginTop: 8 }}>
                      <div style={{ width: `${progress}%`, height: '100%', background: 'linear-gradient(90deg, #E8554E, #D4267E)', borderRadius: 2, transition: 'width 0.3s linear' }} />
                    </div>
                  </div>
                )}

                {/* Expandable description — inline, below work info */}
                {isActive && w.description && (
                  <p className="v-work-desc">
                    {w.description}
                  </p>
                )}
              </div>
            );
          })}

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
            {!feedbackSubmitted ? (
              <>
                <p style={{ color: '#A8969A', fontSize: 12 }}>Compartilhe que você fez a cultura pulsar hoje.</p>

                {/* Stars Rating */}
                <div className="v-feedback-stars">
                  {[1, 2, 3, 4, 5].map((val) => (
                    <span
                      key={val}
                      className={`v-feedback-star ${val <= (hoverRating || rating) ? 'active' : ''}`}
                      onMouseEnter={() => setHoverRating(val)}
                      onMouseLeave={() => setHoverRating(0)}
                      onClick={() => setRating(val)}
                    >
                      ★
                    </span>
                  ))}
                </div>

                <div className="v-feedback-label">
                  {(hoverRating || rating) > 0 ? feedbackLabels[hoverRating || rating] : ''}
                </div>

                {rating > 0 && (
                  <>
                    <textarea
                      className="v-feedback-textarea"
                      placeholder="O que mais te marcou nessa experiência?"
                      value={feedbackComment}
                      onChange={(e) => setFeedbackComment(e.target.value)}
                      rows={3}
                    />
                    <button
                      className="v-feedback-submit"
                      disabled={isSubmittingFeedback}
                      onClick={handleSubmitFeedback}
                    >
                      {isSubmittingFeedback ? 'Enviando...' : 'Enviar avaliação'}
                    </button>
                  </>
                )}

                <button
                  className="v-btn-primary"
                  onClick={() => navigate('/card')}
                >
                  Compartilhar meu pulso
                </button>
              </>
            ) : (
              <div className="v-feedback-success">
                ✨ Obrigado por fazer a cultura pulsar!
              </div>
            )}
          </div>

        </div>

        {/* Timeout Warning Modal */}
        {showTimeoutWarning && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 30 }}>
            <div style={{ background: '#1C1620', border: '1px solid rgba(232,85,78,0.2)', borderRadius: 20, padding: 30, textAlign: 'center', maxWidth: 300 }}>
              <PulseSymbol size={48} />
              <h3 style={{ fontFamily: 'Sora', color: '#F5ECE4', marginTop: 20, marginBottom: 10 }}>Ainda aí?</h3>
              <p style={{ fontSize: 13, color: '#A8969A', marginBottom: 24, lineHeight: 1.5 }}>
                O guia será reiniciado em 1 minuto por inatividade para economizar bateria e proteger seus dados.
              </p>
              <button 
                className="v-btn-primary" 
                onClick={() => {
                  // Any interaction resets the timer via the window event listeners
                  setShowTimeoutWarning(false);
                }}
              >
                Continuar lendo
              </button>
            </div>
          </div>
        )}
      </div>
    </VisitorLayout>
  );
}

