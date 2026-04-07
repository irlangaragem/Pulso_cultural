import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { localDb } from '../services/localDb';
import { api } from '../services/api';
import { formatCPF, isValidCPF } from '../utils/cpf';
import { VisitorLayout } from '../components/VisitorLayout';
import { PulseSymbol } from '../components/PulseSymbol';

const CANAIS = ['Redes sociais', 'Indicação', 'Passei na frente', 'Jornal / TV', 'Escola / faculdade', 'Outro'];

export function VisitorLogin() {
  const [cpf, setCpf] = useState('');
  const [como, setComo] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [focused, setFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  const handleCPFChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCpf(formatCPF(e.target.value));
    setError(null);
  };

  const isComplete = cpf.replace(/\D/g, '').length === 11 && como;

  const handleSubmit = async () => {
    if (!isComplete) return;
    if (!isValidCPF(cpf)) {
      setError('O CPF informado não parece válido.');
      return;
    }

    let visitor = localDb.getVisitorByCPF(cpf);
    const rawCpf = cpf.replace(/\D/g, '');

    setLoading(true);
    setError(null);

    try {
      if (!visitor) {
        try {
          const response = await api.get(`/checkins/verify/${rawCpf}`);
          if (response.data && response.data.success) {
            visitor = localDb.saveVisitor({
              cpf: rawCpf,
              name: response.data.name,
              birthYear: response.data.birthYear,
              gender: response.data.gender,
              origin: response.data.origin,
              email: response.data.email
            });
          }
        } catch (err) {
          console.error('Erro na verificação remota:', err);
        }
      }

      if (visitor) {
        const originMap: Record<string, string> = {
          'Redes sociais': 'REDES_SOCIAIS',
          'Indicação': 'INDICAÇÃO',
          'Passei na frente': 'PASSEI_EM_FRENTE',
          'Jornal / TV': 'DIVULGACAO',
          'Escola / faculdade': 'ESCOLA',
          'Outro': 'OUTRO',
        };

        const checkinData = {
          cpf: visitor.cpf,
          name: visitor.name,
          birthYear: visitor.birthYear,
          gender: visitor.gender,
          origin: originMap[como] || 'OUTRO',
          channel: 'OUTRO_RETORNO',
          exhibitionId: 'default-exhibition',
        };

        try {
          await api.post('/checkins', checkinData);
        } catch (e) {
          console.warn('API sync failed, adding to queue', e);
          localDb.addToSyncQueue(checkinData);
        }

        setSuccess(true);
        setTimeout(() => navigate('/guide'), 1500);
      } else {
        // SILENT REDIRECT FOR NEW USERS
        navigate(`/checkin?cpf=${cpf}`);
      }
    } finally {
      if (!success) setLoading(false);
    }
  };

  return (
    <VisitorLayout>
      <div className="visitor-screen">
        {/* Glow */}
        <div className="visitor-glow" />

        {/* Symbol */}
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: '6vh', position: 'relative', zIndex: 1 }}>
          <PulseSymbol size={64} />
        </div>

        {/* Wordmark */}
        <h1 className="v-wordmark">PULSO</h1>
        <p className="v-wordmark-sub">CULTURAL</p>

        {/* Venue tag */}
        <div className="v-venue-tag">
          <span className="v-venue-dot" />
          MAM Salvador · Aberto agora
        </div>

        {/* Exhibition name */}
        <div className="v-expo-tag">
          <p style={{ fontFamily: "'Space Mono', monospace", fontSize: 8, color: '#E8554E', letterSpacing: 3, marginBottom: 4 }}>
            EXPOSIÇÃO EM CARTAZ
          </p>
          <p style={{ fontFamily: 'Sora, sans-serif', fontSize: 14, fontWeight: 600, color: '#F5ECE4', lineHeight: 1.3 }}>
            Uma História da Arte Brasileira
          </p>
        </div>

        {/* CTA */}
        <p className="v-cta-text">
          Dê seu pulso e acesse<br />o guia da exposição
        </p>

        {/* CPF field */}
        <div className={`v-input-wrap ${focused ? 'focused' : ''}`}>
          <span style={{ flexShrink: 0, display: 'flex' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#6B5A60" strokeWidth="2" strokeLinecap="round">
              <rect x="3" y="4" width="18" height="16" rx="2" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
          </span>
          <input
            ref={inputRef}
            type="tel"
            inputMode="numeric"
            placeholder="000.000.000-00"
            value={cpf}
            onChange={handleCPFChange}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            className="v-input"
            autoComplete="off"
          />
        </div>

        {/* Como soube */}
        <label className="v-label" style={{ marginTop: 8 }}>Como soube desta exposição?</label>
        <div className="v-chip-row" style={{ marginBottom: 16 }}>
          {CANAIS.map(c => (
            <button
              key={c}
              type="button"
              className={`v-chip ${como === c ? 'active' : ''}`}
              onClick={() => setComo(c)}
            >
              {c}
            </button>
          ))}
        </div>

        {/* Error */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="v-error"
            >
              ⚠️ {error}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Button */}
        <button
          className="v-btn-primary"
          style={{ opacity: isComplete && !loading ? 1 : 0.4 }}
          onClick={handleSubmit}
          disabled={!isComplete || loading}
        >
          {loading ? 'Validando...' : 'Pulsar'}
        </button>

        {/* Footer */}
        <p className="v-footer-note" style={{ marginTop: 24 }}>
          Seus dados são protegidos pela LGPD.<br />Usamos apenas para melhorar sua experiência.
        </p>

        <div style={{ height: 24 }} />
      </div>

      {/* Success overlay */}
      <AnimatePresence>
        {success && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="v-success-overlay"
          >
            <PulseSymbol size={80} />
            <p className="v-cta-text" style={{ marginTop: 24, fontSize: 18 }}>Acesso liberado!</p>
            <p className="v-footer-note" style={{ marginTop: 8 }}>Redirecionando para o guia...</p>
          </motion.div>
        )}
      </AnimatePresence>
    </VisitorLayout>
  );
}
