import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Star, Send } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { VisitorLayout } from '../components/VisitorLayout';
import { PulseSymbol } from '../components/PulseSymbol';

export function Feedback() {
  const navigate = useNavigate();
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (rating === 0) return;

    setIsSubmitting(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1500));
      setIsSubmitted(true);
    } catch (error) {
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSubmitted) {
    return (
      <VisitorLayout>
        <div className="visitor-screen" style={{ justifyContent: 'center', alignItems: 'center', minHeight: '100%' }}>
          <div className="visitor-glow" />
          <PulseSymbol size={80} animated />
          <h1 className="v-screen-title" style={{ textAlign: 'center', marginTop: 24 }}>Obrigado!</h1>
          <p style={{ color: '#A8969A', fontSize: 13, textAlign: 'center', maxWidth: 260, lineHeight: 1.5, marginBottom: 32 }}>
            Sua avaliação ajuda o MAM Salvador a criar experiências cada vez melhores.
          </p>

          {/* Share card preview */}
          <div style={{
            width: '100%',
            maxWidth: 280,
            borderRadius: 20,
            overflow: 'hidden',
            background: '#1C1620',
            border: '1px solid rgba(232,85,78,0.1)',
            marginBottom: 24,
          }}>
            <div style={{ padding: '20px 24px', textAlign: 'center' }}>
              <PulseSymbol size={24} />
              <h2 style={{ fontFamily: 'Sora, sans-serif', fontSize: 18, fontWeight: 700, color: '#F5ECE4', lineHeight: 1.3, margin: '12px 0 0' }}>
                Eu fiz a cultura<br />pulsar hoje.
              </h2>
              <p style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: '#6B5A60', letterSpacing: 1, marginTop: 8 }}>
                {new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase()}
              </p>
              <div style={{
                marginTop: 14,
                padding: '6px 14px',
                borderRadius: 100,
                background: 'rgba(232,85,78,0.08)',
                border: '1px solid rgba(232,85,78,0.15)',
                display: 'inline-block',
              }}>
                <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 10, fontWeight: 500, color: '#E8554E' }}>
                  Uma História da Arte Brasileira
                </span>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 12, width: '100%', maxWidth: 280 }}>
            <button className="v-btn-primary" style={{ flex: 1 }} onClick={() => alert('Compartilhar via sistema nativo')}>
              Compartilhar
            </button>
          </div>

          <button className="v-btn-ghost" style={{ marginTop: 16 }} onClick={() => navigate('/')}>
            ← Voltar ao início
          </button>
        </div>
      </VisitorLayout>
    );
  }

  return (
    <VisitorLayout>
      <div className="visitor-screen" style={{ paddingTop: 24 }}>
        <div className="visitor-glow" />

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6, position: 'relative', zIndex: 1 }}>
          <PulseSymbol size={28} />
          <span style={{ fontFamily: 'Sora, sans-serif', fontWeight: 700, fontSize: 14, color: '#F5ECE4' }}>PULSO</span>
          <span style={{ fontFamily: 'Sora, sans-serif', fontWeight: 300, fontSize: 9, color: '#A8969A', letterSpacing: 3 }}>CULTURAL</span>
        </div>

        <h2 className="v-screen-title">Avaliação</h2>
        <p className="v-screen-desc">Sua opinião é fundamental para melhorar a experiência cultural.</p>

        <form onSubmit={handleSubmit}>
          {/* Stars */}
          <label className="v-label">Como foi sua experiência?</label>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 8, padding: '16px 0', position: 'relative', zIndex: 1 }}>
            {[1, 2, 3, 4, 5].map((star) => (
              <motion.button
                key={star}
                type="button"
                whileHover={{ scale: 1.2 }}
                whileTap={{ scale: 0.8 }}
                onMouseEnter={() => setHoverRating(star)}
                onMouseLeave={() => setHoverRating(0)}
                onClick={() => setRating(star)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}
              >
                <Star
                  size={36}
                  style={{
                    transition: 'all 0.15s',
                    color: star <= (hoverRating || rating) ? '#F28C38' : '#3A2E34',
                    fill: star <= (hoverRating || rating) ? '#F28C38' : 'none',
                  }}
                />
              </motion.button>
            ))}
          </div>

          {rating > 0 && (
            <p style={{
              textAlign: 'center',
              fontFamily: "'Space Mono', monospace",
              fontSize: 10,
              color: '#E8554E',
              letterSpacing: 2,
              marginBottom: 16,
            }}>
              {rating <= 2 ? 'PRECISA MELHORAR' : rating <= 3 ? 'REGULAR' : rating <= 4 ? 'BOA EXPERIÊNCIA' : 'EXCELENTE!'}
            </p>
          )}

          {/* Comment */}
          <label className="v-label">Deixe um comentário (opcional)</label>
          <div className="v-input-sm-wrap" style={{ marginBottom: 20 }}>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="O que você mais gostou na exposição?"
              rows={4}
              style={{
                background: 'none',
                border: 'none',
                outline: 'none',
                fontFamily: "'DM Sans', sans-serif",
                fontSize: 14,
                color: '#F5ECE4',
                width: '100%',
                resize: 'none',
              }}
            />
          </div>

          {/* Submit */}
          <button
            type="submit"
            className="v-btn-primary"
            disabled={rating === 0 || isSubmitting}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
          >
            {isSubmitting ? (
              <div style={{
                width: 18, height: 18,
                border: '2px solid rgba(255,255,255,0.2)',
                borderTop: '2px solid white',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite',
              }} />
            ) : (
              <>
                Concluir e Enviar
                <Send size={16} />
              </>
            )}
          </button>
        </form>

        {/* Back */}
        <button className="v-btn-ghost" style={{ marginTop: 12 }} onClick={() => navigate('/guide')}>
          ← Voltar ao guia
        </button>

        <div style={{ height: 40 }} />
      </div>
    </VisitorLayout>
  );
}
