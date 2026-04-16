import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { localDb } from '../services/localDb';
import { api } from '../services/api';
import { formatCPF, isValidCPF } from '../utils/cpf';
import { VisitorLayout } from '../components/VisitorLayout';
import { PulseSymbol } from '../components/PulseSymbol';
import { useLanguage } from '../contexts/LanguageContext';
import { CreditCard, Lock } from 'lucide-react';

const CANAIS = [
  { id: 'Redes sociais', key: 'source.social' },
  { id: 'Indicação', key: 'source.referral' },
  { id: 'Passei na frente', key: 'source.walked_by' },
  { id: 'Jornal / TV', key: 'source.tv' },
  { id: 'Escola / faculdade', key: 'source.school' },
  { id: 'Outro', key: 'source.other' }
];

export function VisitorLogin() {
  const [cpf, setCpf] = useState('');
  const [como, setComo] = useState('');
  const [comoOutroText, setComoOutroText] = useState('');

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [focused, setFocused] = useState(false);
  const [returningUser, setReturningUser] = useState<string | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const { t } = useLanguage();

  useEffect(() => {
    const stored = localStorage.getItem('pulso:return_cpf');
    if (stored) {
      setCpf(formatCPF(stored));
      const visitor = localDb.getVisitorByCPF(stored);
      if (visitor) {
        setReturningUser(visitor.name.split(' ')[0]);
      }
    }
  }, []);

  const handleCPFChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCpf(formatCPF(e.target.value));
    setError(null);
  };

  const isComplete = cpf.replace(/\D/g, '').length === 11 && (como === 'Outro' ? comoOutroText.trim().length > 0 : como);

  const handleSubmit = async () => {
    if (!isComplete) return;

    if ('vibrate' in navigator) {
      navigator.vibrate([30, 20, 30]);
    }

    if (!isValidCPF(cpf)) {
      setError(t('error.invalid_cpf'));
      return;
    }

    let visitor = localDb.getVisitorByCPF(cpf);
    const rawCpf = cpf.replace(/\D/g, '');

    setLoading(true);
    setError(null);

    try {
      if (!visitor) {
        try {
          const response = await api.post('/api/v1/users/identify', { cpf: rawCpf });
          if (response.data && response.data.success) {
            const vData = response.data.visitor;
            visitor = localDb.saveVisitor({
              cpf: rawCpf,
              name: vData.name,
              birthYear: vData.birthYear,
              gender: vData.gender,
              origin: vData.origin,
              accessibilityNeeds: vData.accessibilityNeeds,
            });
          }
        } catch (err) {
          console.error('Erro na identificação remota:', err);
        }
      }

      if (visitor) {
        const channelMap: Record<string, string> = {
          'Redes sociais': 'REDES_SOCIAIS',
          'Indicação': 'INDICACAO',
          'Passei na frente': 'PASSOU_NA_FRENTE',
          'Jornal / TV': 'JORNAL_TV',
          'Escola / faculdade': 'ESCOLA_FACULDADE',
          'Outro': 'OUTRO',
        };

        const checkinData = {
          cpf: rawCpf,
          exhibitionId: 'default-exhibition',
          channel: channelMap[como] || 'OUTRO',
        };

        try {
          await api.post('/checkins', checkinData);
        } catch (e) {
          console.warn('API sync failed, adding to queue', e);
          localDb.addToSyncQueue({ ...checkinData, name: visitor.name });
        }

        setSuccess(true);
        setTimeout(() => navigate('/guide'), 1500);
      } else {
        navigate(`/checkin?cpf=${cpf}&como=${como}`);
      }
    } finally {
      if (!success) setLoading(false);
    }
  };

  return (
    <VisitorLayout>
      <div className="visitor-screen">
        <div className="visitor-glow" />

        {/* Wordmark */}
        <h1 className="v-wordmark" style={{ marginTop: 56, marginBottom: -4 }}>PULSO</h1>
        <p className="v-wordmark-sub">CULTURAL</p>

        {/* Venue tag — MAM Salvador · Aberto agora */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          margin: '14px 0 20px',
          position: 'relative',
          zIndex: 1,
          fontFamily: "'Sora', sans-serif",
          fontSize: 13
        }}>
          {/* Dot verde pulsante */}
          <span className="v-venue-dot" />
          {/* Nome do local */}
          <span style={{ color: '#F5ECE4', fontWeight: 700, fontFamily: "'Sora', sans-serif", fontSize: 13 }}>
            {t('venue.name')}
          </span>
          <span style={{ color: '#6B5A60', fontWeight: 400, fontSize: 13 }}>·</span>
          {/* Status */}
          <span style={{ color: '#48BB78', fontWeight: 400, fontFamily: "'Sora', sans-serif", fontSize: 13 }}>
            {t('venue.status')}
          </span>
        </div>

        {/* Exhibition context */}
        <p className="v-expo-label" style={{ marginBottom: 6 }}>{t('exhibition.label')}</p>
        <h2 className="v-expo-title" style={{ marginBottom: 20 }}>{t('exhibition.title')}</h2>

        {/* CTA copy */}
        <p className="v-cta-text" style={{ marginTop: 0, marginBottom: 20 }}>
          {returningUser ? (
            <motion.span
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              dangerouslySetInnerHTML={{ __html: t('checkin.cta.returning', { name: `<span style="color: #E8554E">${returningUser}</span>` }) }}
            />
          ) : (
            <>
              {t('checkin.cta')}
            </>
          )}
        </p>

        {/* Divider */}
        <div style={{
          width: '100%',
          height: '1px',
          background: 'rgba(255,255,255,0.08)',
          margin: '4px 0 0',
          position: 'relative',
          zIndex: 1,
          flexShrink: 0
        }} />

        {/* CPF Field */}
        <div className={`v-input-wrap ${focused ? 'focused' : ''}`} style={{ marginTop: 20 }}>
          <CreditCard className="v-input-icon" size={20} />
          <input
            ref={inputRef}
            type="tel"
            inputMode="numeric"
            placeholder={t('cpf.placeholder')}
            value={cpf}
            onChange={handleCPFChange}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            className="v-input"
            autoComplete="off"
          />
        </div>

        {/* Source Question */}
        <span className="v-label-text">{t('source.question')}</span>
        <div className="v-chip-grid">
          {CANAIS.map(c => (
            <button
              key={c.id}
              type="button"
              className={`v-chip ${como === c.id ? 'active' : ''}`}
              onClick={() => setComo(c.id)}
            >
              {t(c.key)}
            </button>
          ))}
        </div>

        {como === 'Outro' && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            style={{ marginBottom: 24, zIndex: 1, position: 'relative' }}
          >
            <input
              type="text"
              placeholder={t('source.other_placeholder')}
              value={comoOutroText}
              onChange={(e) => setComoOutroText(e.target.value)}
              className="v-input"
              style={{ padding: '12px 16px', fontSize: 16, border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, background: 'rgba(255,255,255,0.02)' }}
            />
          </motion.div>
        )}

        {/* Error */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="v-error"
            >
              {error}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Primary CTA — always visually active, validates on click */}
        <button
          className="v-btn-primary"
          onClick={handleSubmit}
          style={{ marginTop: 24 }}
        >
          {loading ? t('button.pulsing') : t('button.pulse')}
        </button>

        {/* Footer — GESTÃO (preservado) + LGPD */}
        <div style={{ marginTop: 24, paddingBottom: 24, width: '100%', textAlign: 'center', position: 'relative', zIndex: 10 }}>
          <button
            className="v-admin-link"
            onClick={() => navigate('/login')}
          >
            <Lock size={12} strokeWidth={2} opacity={0.5} />
            <span>GESTÃO</span>
          </button>

          <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 10, color: '#6B5A60', lineHeight: 1.6, margin: 0, fontWeight: 400 }}>
            Seus dados são protegidos pela LGPD.<br />
            Usamos apenas para melhorar sua experiência.
          </p>
        </div>

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
            <PulseSymbol size={120} />
            <p className="v-cta-text" style={{ marginTop: 24, fontSize: 18 }}>{t('success.granted')}</p>
            <p className="v-footer-note" style={{ marginTop: 8 }}>{t('success.redirecting')}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </VisitorLayout>
  );
}
