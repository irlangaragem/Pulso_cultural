import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { localDb } from '../services/localDb';
import { api } from '../services/api';
import { formatCPF, isValidCPF } from '../utils/cpf';
import { VisitorLayout } from '../components/VisitorLayout';
import { PulseSymbol } from '../components/PulseSymbol';
import { useLanguage } from '../contexts/LanguageContext';
import { CreditCard, Mail, Lock } from 'lucide-react';

const CANAIS = [
  { id: 'Redes sociais',    key: 'source.social' },
  { id: 'Indicação',        key: 'source.referral' },
  { id: 'Passei na frente', key: 'source.walked_by' },
  { id: 'Jornal / TV',      key: 'source.tv' },
  { id: 'Escola / faculdade', key: 'source.school' },
  { id: 'Outro',            key: 'source.other' },
];

const CHANNEL_MAP: Record<string, string> = {
  'Redes sociais': 'REDES_SOCIAIS',
  'Indicação': 'INDICACAO',
  'Passei na frente': 'PASSOU_NA_FRENTE',
  'Jornal / TV': 'JORNAL_TV',
  'Escola / faculdade': 'ESCOLA_FACULDADE',
  'Outro': 'OUTRO',
};

type IdentityMode = 'cpf' | 'email';

function isValidEmail(email: string) {
  const v = email.trim();
  return /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*\.[a-zA-Z]{2,}$/.test(v);
}

export function VisitorLogin() {
  const navigate = useNavigate();
  const { t, language } = useLanguage();

  const [identityMode, setIdentityMode] = useState<IdentityMode>(
    language === 'pt' ? 'cpf' : 'email'
  );

  const [userChoseIdentity, setUserChoseIdentity] = useState(false);
  useEffect(() => {
    if (!userChoseIdentity) {
      setIdentityMode(language === 'pt' ? 'cpf' : 'email');
    }
  }, [language, userChoseIdentity]);

  const [cpf,           setCpf]          = useState('');
  const [email,         setEmail]        = useState('');
  const [como,          setComo]         = useState('');
  const [comoOutroText, setComoOutroText] = useState('');

  const [error,         setError]        = useState<string | null>(null);
  const [loading,       setLoading]      = useState(false);
  const [success,       setSuccess]      = useState(false);
  const [focused,       setFocused]      = useState(false);
  const [returningUser, setReturningUser] = useState<string | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);

  // Returning visitor recognition uses a local-only SHA-256 hash of the CPF
  // ("this device has seen this person"). The hash is never sent to the API.
  useEffect(() => {
    const storedHash = localStorage.getItem('pulso:local_dedup_hash');
    if (storedHash) {
      setIdentityMode('cpf');
      const visitors = localDb.getVisitors();
      const visitor = visitors.find(v => v.cpfHash === storedHash);
      if (visitor) setReturningUser(visitor.name.split(' ')[0]);
    }
    const storedEHash = localStorage.getItem('pulso:local_dedup_ehash');
    if (storedEHash && !storedHash) {
      setIdentityMode('email');
    }
  }, []);

  const handleCPFChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCpf(formatCPF(e.target.value));
    setError(null);
  };

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEmail(e.target.value.trim());
    setError(null);
  };

  const handleIdentitySwitch = (mode: IdentityMode) => {
    setIdentityMode(mode);
    setUserChoseIdentity(true);
    setError(null);
    if (mode === 'cpf') setEmail('');
    if (mode === 'email') setCpf('');
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  const rawCpf = cpf.replace(/\D/g, '');

  const identifierReady = identityMode === 'cpf'
    ? rawCpf.length === 11
    : isValidEmail(email);

  const newVisitorComplete = identifierReady &&
    (como === 'Outro' ? comoOutroText.trim().length > 0 : como !== '');

  const isComplete = returningUser ? identifierReady : newVisitorComplete;

  const handleSubmit = async () => {
    if (!isComplete) return;

    if (identityMode === 'cpf' && !isValidCPF(cpf)) {
      if ('vibrate' in navigator) navigator.vibrate([30, 20, 30]);
      setError(t('error.invalid_cpf'));
      return;
    }
    if (identityMode === 'email' && !isValidEmail(email)) {
      if ('vibrate' in navigator) navigator.vibrate([30, 20, 30]);
      setError(t('error.invalid_email'));
      return;
    }

    if ('vibrate' in navigator) navigator.vibrate(50);
    setLoading(true);
    setError(null);
    let currentSuccess = false;

    try {
      if (identityMode === 'cpf') {
        let visitor = await localDb.getVisitorByCPF(rawCpf);

        if (!visitor) {
          try {
            const response = await api.post('/api/v1/users/identify', { cpf: rawCpf });
            if (response.data?.success) {
              const vData = response.data.visitor;
              visitor = await localDb.saveVisitor({
                cpf: rawCpf,
                name: vData.name,
                birthYear: vData.birthYear,
                gender: vData.gender,
                origin: vData.origin,
                accessibilityNeeds: vData.accessibilityNeeds,
              });
            }
          } catch { /* 404 = new user — continue to checkin */ }
        }

        if (visitor) {
          const channel = CHANNEL_MAP[como] || 'OUTRO';
          const checkinPayload = { cpf: rawCpf, exhibitionId: 'default-exhibition', channel };
          let posted = false;
          try {
            await api.post('/checkins', checkinPayload);
            posted = true;
          } catch {
            // Offline — enqueue with raw cpf so the backend can hash it on retry.
            localDb.addToSyncQueue({
              cpf: rawCpf,
              name: visitor.name,
              birthYear: visitor.birthYear,
              gender: visitor.gender,
              origin: visitor.origin,
              exhibitionId: 'default-exhibition',
              channel,
            });
          }
          if (visitor.cpfHash) localStorage.setItem('pulso:local_dedup_hash', visitor.cpfHash);
          currentSuccess = true;
          setSuccess(true);
          if (!posted) {
            // tell the user we will sync later, but still proceed
            setTimeout(() => navigate('/guide'), 1500);
          } else {
            setTimeout(() => navigate('/guide'), 1500);
          }
        } else {
          navigate('/checkin', { state: { cpf: rawCpf, como, comoOutroText } });
        }
      } else {
        let found = false;
        try {
          const res = await api.post('/api/v1/users/identify', { email });
          if (res.data?.success) {
            found = true;
            currentSuccess = true;
            crypto.subtle.digest('SHA-256', new TextEncoder().encode(email.trim().toLowerCase()))
              .then(buf => {
                const hash = Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
                localStorage.setItem('pulso:local_dedup_ehash', hash);
              }).catch(() => {});
            const channel = CHANNEL_MAP[como] || 'OUTRO';
            try {
              await api.post('/checkins', { email, exhibitionId: 'default-exhibition', channel });
            } catch {
              localDb.addToSyncQueue({ email, exhibitionId: 'default-exhibition', channel });
            }
            setSuccess(true);
            setTimeout(() => navigate('/guide'), 1500);
          }
        } catch { /* 404 — new user */ }

        if (!found) {
          navigate('/checkin', { state: { email, como } });
        }
      }
    } catch (err) {
      console.error('[VisitorLogin] submit error:', err);
      setError('Ocorreu um erro inesperado. Tente novamente.');
    } finally {
      if (!currentSuccess) setLoading(false);
    }
  };

  return (
    <VisitorLayout>
      <div className="visitor-screen">
        <div className="visitor-glow" />

        {/* Pulse symbol + wordmark */}
        <div style={{
          width: '100%',
          display: 'flex',
          justifyContent: 'center',
          marginTop: 20,
          marginBottom: 10,
          position: 'relative',
          zIndex: 5,
        }}>
          <PulseSymbol size={48} />
        </div>

        <h1 className="v-wordmark" style={{ marginTop: 0, marginBottom: -4 }}>PULSO</h1>
        <p className="v-wordmark-sub">CULTURAL</p>

        {/* Venue line: "MAM Salvador · Aberto agora" */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          margin: '14px 0 20px',
          position: 'relative',
          zIndex: 1,
          fontFamily: "'Sora', sans-serif",
          fontSize: 13,
        }}>
          <span className="v-venue-dot" />
          <span style={{ color: '#F5ECE4', fontWeight: 700 }}>{t('venue.name')}</span>
          <span style={{ color: '#6B5A60' }}>·</span>
          <span style={{ color: '#48BB78', fontWeight: 400 }}>{t('venue.status')}</span>
        </div>

        <p className="v-expo-label" style={{ marginBottom: 6 }}>{t('exhibition.label')}</p>
        <h2 className="v-expo-title" style={{ marginBottom: 20 }}>{t('exhibition.title')}</h2>

        <p className="v-cta-text" style={{ marginTop: 0, marginBottom: 20 }}>
          {returningUser ? (
            <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              Bem-vindo de volta,{' '}
              <span style={{ color: '#E8554E' }}>{returningUser}</span>! 👋{' '}
              Dê seu pulso e acesse o guia.
            </motion.span>
          ) : t('checkin.cta')}
        </p>

        <div style={{ width: '100%', height: 1, background: 'rgba(255,255,255,0.08)', margin: '4px 0 20px', zIndex: 1 }} />

        <AnimatePresence>
          {(true || userChoseIdentity) && (
            <motion.div
              key="identity-selector"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.25 }}
              style={{ marginBottom: 16 }}
            >
              <span className="v-label-text" style={{ marginBottom: 10 }}>
                {t('identity.question')}
              </span>
              <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                <button
                  type="button"
                  onClick={() => handleIdentitySwitch('cpf')}
                  aria-pressed={identityMode === 'cpf'}
                  style={{
                    flex: 1,
                    padding: '10px 12px',
                    borderRadius: 10,
                    border: `1px solid ${identityMode === 'cpf' ? 'rgba(232,85,78,0.45)' : 'rgba(255,255,255,0.08)'}`,
                    background: identityMode === 'cpf' ? 'rgba(232,85,78,0.1)' : 'rgba(255,255,255,0.02)',
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'all 0.18s ease',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                    <CreditCard size={13} color={identityMode === 'cpf' ? '#F07070' : '#6B5A60'} />
                    <span style={{ fontSize: 12, fontWeight: 700, color: identityMode === 'cpf' ? '#F07070' : '#D4C6C9', fontFamily: 'Sora, sans-serif' }}>
                      {t('identity.cpf')}
                    </span>
                  </div>
                  <span style={{ fontSize: 10, color: '#6B5A60', lineHeight: 1.4, display: 'block', fontFamily: 'DM Sans, sans-serif' }}>
                    {t('identity.cpf_hint')}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => handleIdentitySwitch('email')}
                  aria-pressed={identityMode === 'email'}
                  style={{
                    flex: 1,
                    padding: '10px 12px',
                    borderRadius: 10,
                    border: `1px solid ${identityMode === 'email' ? 'rgba(232,85,78,0.45)' : 'rgba(255,255,255,0.08)'}`,
                    background: identityMode === 'email' ? 'rgba(232,85,78,0.1)' : 'rgba(255,255,255,0.02)',
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'all 0.18s ease',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                    <Mail size={13} color={identityMode === 'email' ? '#F07070' : '#6B5A60'} />
                    <span style={{ fontSize: 12, fontWeight: 700, color: identityMode === 'email' ? '#F07070' : '#D4C6C9', fontFamily: 'Sora, sans-serif' }}>
                      {t('identity.email')}
                    </span>
                  </div>
                  <span style={{ fontSize: 10, color: '#6B5A60', lineHeight: 1.4, display: 'block', fontFamily: 'DM Sans, sans-serif' }}>
                    {t('identity.email_hint')}
                  </span>
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence mode="wait">
          {identityMode === 'cpf' ? (
            <motion.div
              key="cpf-input"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.2 }}
            >
              <div className={`v-input-wrap ${focused ? 'focused' : ''}`}>
                <CreditCard className="v-input-icon" size={20} />
                <input
                  ref={inputRef}
                  type="tel"
                  inputMode="numeric"
                  placeholder={t('identity.cpf_placeholder')}
                  value={cpf}
                  onChange={handleCPFChange}
                  onFocus={() => setFocused(true)}
                  onBlur={() => setFocused(false)}
                  className="v-input"
                  autoComplete="off"
                />
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="email-input"
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              transition={{ duration: 0.2 }}
            >
              <div className={`v-input-wrap ${focused ? 'focused' : ''}`}>
                <Mail className="v-input-icon" size={20} />
                <input
                  ref={inputRef}
                  type="email"
                  inputMode="email"
                  placeholder={t('identity.email_placeholder')}
                  value={email}
                  onChange={handleEmailChange}
                  onFocus={() => setFocused(true)}
                  onBlur={() => setFocused(false)}
                  className="v-input"
                  autoComplete="email"
                  style={{ letterSpacing: 0, fontSize: 16 }}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {!returningUser && (
          <>
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
            <AnimatePresence>
              {como === 'Outro' && (
                <motion.div
                  key="outro-text"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  style={{ marginBottom: 24, zIndex: 1, position: 'relative' }}
                >
                  <input
                    type="text"
                    placeholder={t('source.other_placeholder')}
                    value={comoOutroText}
                    onChange={(e) => setComoOutroText(e.target.value)}
                    className="v-input"
                    style={{ padding: '12px 16px', fontSize: 16, border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, background: 'rgba(255,255,255,0.02)', width: '100%' }}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </>
        )}

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

        <button
          className="v-btn-primary"
          onClick={handleSubmit}
          disabled={!isComplete || loading}
          style={{ marginTop: 24, opacity: (!isComplete || loading) ? 0.38 : 1 }}
        >
          {loading ? t('button.pulsing') : t('button.pulse')}
        </button>

        <div style={{ marginTop: 24, paddingBottom: 24, width: '100%', textAlign: 'center', position: 'relative', zIndex: 10 }}>
          <button className="v-admin-link" onClick={() => navigate('/login')}>
            <Lock size={12} strokeWidth={2} opacity={0.5} />
            <span>GESTÃO</span>
          </button>
          <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 10, color: '#6B5A60', lineHeight: 1.6, margin: 0, fontWeight: 400 }}>
            {language === 'pt'
              ? 'Seus dados são protegidos pela LGPD.\nUsamos apenas para melhorar sua experiência.'
              : t('footer.lgpd.link')
            }
          </p>
        </div>
      </div>

      <AnimatePresence>
        {success && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="v-success-overlay"
          >
            <PulseSymbol size={80} animated={true} />
            <p className="v-cta-text" style={{ marginTop: 24, fontSize: 18 }}>{t('success.granted')}</p>
            <p className="v-footer-note" style={{ marginTop: 8 }}>{t('success.redirecting')}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </VisitorLayout>
  );
}
