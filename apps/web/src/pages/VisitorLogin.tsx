import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { localDb } from '../services/localDb';
import { api } from '../services/api';
import { formatCPF, isValidCPF } from '../utils/cpf';
import { VisitorLayout } from '../components/VisitorLayout';
import { PulseSymbol } from '../components/PulseSymbol';
import { useLanguage } from '../contexts/LanguageContext';

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
          localDb.addToSyncQueue({ ...checkinData, name: visitor.name }); // add name for legacy local record
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
          {t('venue.status')}
        </div>

        {/* Exhibition name */}
        <div className="v-expo-tag">
          <p style={{ fontFamily: "'Space Mono', monospace", fontSize: 8, color: '#E8554E', letterSpacing: 3, marginBottom: 4 }}>
            {t('exhibition.label')}
          </p>
          <p style={{ fontFamily: 'Sora, sans-serif', fontSize: 14, fontWeight: 600, color: '#F5ECE4', lineHeight: 1.3 }}>
            {t('exhibition.title')}
          </p>
        </div>

        {/* CTA */}
        <p className="v-cta-text">
          {returningUser ? (
            <motion.span
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              dangerouslySetInnerHTML={{ __html: t('checkin.cta.returning', { name: `<span style="color: #E8554E">${returningUser}</span>` }) }}
            />
          ) : (
            <span dangerouslySetInnerHTML={{ __html: t('checkin.cta').replace(' e ', ' e<br/>').replace(' and ', ' and<br/>') }} />
          )}
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
            placeholder={t('cpf.placeholder')}
            value={cpf}
            onChange={handleCPFChange}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            className="v-input"
            autoComplete="off"
          />
        </div>

        {/* Como soube */}
        <label className="v-label" style={{ marginTop: 8 }}>{t('source.question')}</label>
        <div className="v-chip-row" style={{ marginBottom: como === 'Outro' ? 8 : 16 }}>
          {CANAIS.map(c => (
            <button
              key={c.id}
              type="button"
              className={`v-chip ${como === c.id ? 'active' : ''}`}
              onClick={() => {
                setComo(c.id);
                if (c.id !== 'Outro') setComoOutroText('');
              }}
            >
              {t(c.key)}
            </button>
          ))}
        </div>

        {como === 'Outro' && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            style={{ marginBottom: 16 }}
          >
            <input
              type="text"
              placeholder={t('source.other_placeholder')}
              value={comoOutroText}
              onChange={(e) => setComoOutroText(e.target.value)}
              className="v-input"
              style={{ padding: '12px 16px', fontSize: 13, border: '1px solid rgba(255,255,255,0.1)' }}
            />
          </motion.div>
        )}


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

        <button
          className="v-btn-primary"
          style={{ opacity: isComplete && !loading ? 1 : 0.4 }}
          onClick={handleSubmit}
          disabled={!isComplete || loading}
        >
          {loading ? t('button.pulsing') : t('button.pulse')}
        </button>

        {/* Footer */}
        <div style={{ height: 24 }} />

        {/* Admin trap / Easy access */}
        <button 
          onClick={() => navigate('/login')}
          className="v-admin-link"
          aria-label="Acesso Gestão"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
          {t('login.admin')}
        </button>


        {/* LGPD Footer */}
        <div style={{ marginTop: 'auto', padding: '24px 0', textAlign: 'center' }}>
          <p style={{ fontSize: 10, color: '#6B5A60', lineHeight: 1.5, margin: 0 }} dangerouslySetInnerHTML={{ __html: t('footer.lgpd').replace('. ', '.<br />') }} />
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
            <PulseSymbol size={80} />
            <p className="v-cta-text" style={{ marginTop: 24, fontSize: 18 }}>{t('success.granted')}</p>
            <p className="v-footer-note" style={{ marginTop: 8 }}>{t('success.redirecting')}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </VisitorLayout>
  );
}
