import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '../services/api';
import { localDb } from '../services/localDb';
import { formatCPF, isValidCPF } from '../utils/cpf';
import { VisitorLayout } from '../components/VisitorLayout';
import { PulseSymbol } from '../components/PulseSymbol';
import { useLanguage } from '../contexts/LanguageContext';
import type { Gender, Origin, AccessibilityNeed, RegisterVisitorPayload } from '../types/visitor';

const CPF_LOCAL_HASH_KEY = 'pulso:local_dedup_hash';
const EMAIL_LOCAL_HASH_KEY = 'pulso:local_dedup_ehash';

const GENEROS: { key: string; value: Gender }[] = [
  { key: 'checkin.form.genero.f',   value: 'FEMININO' },
  { key: 'checkin.form.genero.m',   value: 'MASCULINO' },
  { key: 'checkin.form.genero.nb',  value: 'NAO_BINARIO' },
  { key: 'checkin.form.genero.pnd', value: 'PREFIRO_NAO_DIZER' },
];

const ORIGENS: { key: string; value: Origin }[] = [
  { key: 'checkin.form.origem.sal', value: 'SALVADOR' },
  { key: 'checkin.form.origem.int', value: 'INTERIOR_BA' },
  { key: 'checkin.form.origem.out', value: 'OUTRO_ESTADO' },
  { key: 'checkin.form.origem.tur', value: 'INTERNACIONAL' },
];

const ACESSIBILIDADES: { key: string; value: AccessibilityNeed }[] = [
  { key: 'checkin.form.acc.mob',   value: 'MOBILIDADE_REDUZIDA' },
  { key: 'checkin.form.acc.vis',   value: 'BAIXA_VISAO' },
  { key: 'checkin.form.acc.sen',   value: 'SENSIBILIDADE_SENSORIAL' },
  { key: 'checkin.form.acc.neu',   value: 'NEURODIVERGENCIA' },
  { key: 'checkin.form.acc.outra', value: 'OUTRA' },
];

const CHANNEL_MAP: Record<string, string> = {
  'Redes sociais': 'REDES_SOCIAIS',
  'Indicação': 'INDICACAO',
  'Passei na frente': 'PASSOU_NA_FRENTE',
  'Jornal / TV': 'JORNAL_TV',
  'Escola / faculdade': 'ESCOLA_FACULDADE',
  'Outro': 'OUTRO',
};

const CANAIS: { id: string; key: string }[] = [
  { id: 'Redes sociais',      key: 'source.social' },
  { id: 'Indicação',          key: 'source.referral' },
  { id: 'Passei na frente',   key: 'source.walked_by' },
  { id: 'Jornal / TV',        key: 'source.tv' },
  { id: 'Escola / faculdade', key: 'source.school' },
  { id: 'Outro',              key: 'source.other' },
];

function Chip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        padding: '9px 16px',
        borderRadius: 100,
        border: `1px solid ${active ? 'transparent' : 'rgba(255,255,255,0.12)'}`,
        background: active ? 'linear-gradient(135deg, #E8554E, #D4267E)' : 'rgba(255,255,255,0.04)',
        color: active ? '#fff' : '#A8969A',
        fontFamily: "'DM Sans', sans-serif",
        fontSize: 13,
        fontWeight: active ? 600 : 400,
        cursor: 'pointer',
        transition: 'all 0.15s ease',
        whiteSpace: 'nowrap',
      }}
    >
      {label}
    </button>
  );
}

function FieldLabel({ children, optional }: { children: React.ReactNode; optional?: string }) {
  return (
    <p style={{
      fontFamily: "'DM Sans', sans-serif",
      fontSize: 13,
      color: '#A8969A',
      marginBottom: 10,
      marginTop: 0,
      fontWeight: 500,
    }}>
      {children}
      {optional && <span style={{ color: '#6B5A60', marginLeft: 6, fontWeight: 400 }}>{optional}</span>}
    </p>
  );
}

function TextInput({
  id, value, onChange, placeholder, type = 'text', inputMode, readOnly, style,
  monospace,
}: {
  id?: string; value: string; onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string; type?: string; inputMode?: React.HTMLAttributes<HTMLInputElement>['inputMode'];
  readOnly?: boolean; style?: React.CSSProperties; monospace?: boolean;
}) {
  const [focused, setFocused] = useState(false);
  return (
    <input
      id={id}
      type={type}
      inputMode={inputMode}
      value={value}
      onChange={onChange}
      readOnly={readOnly}
      placeholder={placeholder}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      style={{
        width: '100%',
        padding: '14px 16px',
        borderRadius: 12,
        border: `1px solid ${focused ? 'rgba(232,85,78,0.5)' : 'rgba(255,255,255,0.1)'}`,
        background: 'rgba(255,255,255,0.04)',
        color: '#F5ECE4',
        fontFamily: monospace ? "'Space Mono', monospace" : "'DM Sans', sans-serif",
        fontSize: 15,
        outline: 'none',
        boxSizing: 'border-box',
        transition: 'border-color 0.18s',
        letterSpacing: monospace ? 1.5 : 0,
        ...style,
      }}
      autoComplete="off"
    />
  );
}

interface NavState {
  cpf?: string;
  email?: string;
  como?: string;
  comoOutroText?: string;
}

export function CheckIn() {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useLanguage();

  // Read identity & channel from router state (preferred) — fall back to query
  // string only for backwards compatibility with old links. CPF is never put
  // into a URL we generate (SEC-16).
  const navState = (location.state as NavState | undefined) || {};
  const params = new URLSearchParams(location.search);
  const cpfParam   = navState.cpf   ?? params.get('cpf')   ?? '';
  const emailParam = navState.email ?? params.get('email') ?? '';
  const comoParam  = navState.como  ?? params.get('como')  ?? '';
  const identityMode: 'cpf' | 'email' = emailParam ? 'email' : 'cpf';

  const [cpf,            setCpf]           = useState(cpfParam ? formatCPF(cpfParam) : '');
  const [email]                            = useState(emailParam);
  const [nome,           setNome]          = useState('');
  const [nascimento,     setNascimento]    = useState('');
  const [genero,         setGenero]        = useState<Gender | ''>('');
  const [origem,         setOrigem]        = useState<Origin | ''>('');
  const [origemDetalhe,  setOrigemDetalhe] = useState('');
  const [acessibilidades, setAcess]        = useState<AccessibilityNeed[]>([]);
  const [outraDetalhe,   setOutraDetalhe]  = useState('');
  const [como,           setComo]          = useState<string>(comoParam || '');
  const [comoOutroText,  setComoOutroText] = useState<string>(navState.comoOutroText || '');
  const [consent,        setConsent]       = useState(false);

  const [error,        setError]       = useState<string | null>(null);
  const [loading,      setLoading]     = useState(false);
  const [success,      setSuccess]     = useState(false);
  const [showRedirect, setShowRedirect] = useState(false);

  useEffect(() => {
    if (cpfParam) setCpf(formatCPF(cpfParam));
  }, [cpfParam]);

  const rawCpf      = cpf.replace(/\D/g, '');
  const birthNum    = Number(nascimento);

  const needsOriginDetail = origem === 'INTERIOR_BA' || origem === 'OUTRO_ESTADO' || origem === 'INTERNACIONAL';

  const getOriginPlaceholder = () => {
    if (origem === 'INTERIOR_BA')   return t('checkin.form.origem.out_placeholder');
    if (origem === 'OUTRO_ESTADO')  return t('checkin.form.origem.out_placeholder');
    if (origem === 'INTERNACIONAL') return t('checkin.form.origem.tur_placeholder');
    return '';
  };

  const getOriginDetailLabel = () => {
    if (origem === 'INTERNACIONAL') return t('checkin.form.origem.detail_country');
    return t('checkin.form.origem.detail_city');
  };

  const isFormValid =
    nome.trim().split(/\s+/).length >= 2 &&
    nascimento.length === 4 && birthNum >= 1904 && birthNum <= new Date().getFullYear() &&
    origem !== '' &&
    (!needsOriginDetail || origemDetalhe.trim().length > 0) &&
    (identityMode === 'email' || (rawCpf.length === 11 && isValidCPF(cpf))) &&
    (identityMode === 'cpf' || email.trim().length > 0) &&
    como !== '' &&
    (como !== 'Outro' || comoOutroText.trim().length > 0) &&
    consent;

  const toggleAcess = (need: AccessibilityNeed) =>
    setAcess(prev => prev.includes(need) ? prev.filter(n => n !== need) : [...prev, need]);

  const handleSubmit = async () => {
    if (!isFormValid || loading) return;
    setLoading(true);
    setError(null);
    let currentSuccess = false;

    try {
      if (identityMode === 'cpf') {
        try {
          const check = await api.post('/api/v1/users/identify', { cpf: rawCpf });
          if (check.data?.success) {
            const existing = await localDb.getVisitorByCPF(rawCpf);
            if (existing?.cpfHash) localStorage.setItem(CPF_LOCAL_HASH_KEY, existing.cpfHash);
            setError(t('checkin.form.already_registered'));
            setShowRedirect(true);
            setLoading(false);
            return;
          }
        } catch { /* 404 = new user */ }
      }

      const channel = como ? (CHANNEL_MAP[como] || 'OUTRO') : 'OUTRO';

      const payload: RegisterVisitorPayload = {
        cpf: identityMode === 'cpf' ? rawCpf : undefined,
        email: identityMode === 'email' ? email : undefined,
        name: nome.trim(),
        birthYear: birthNum,
        gender: genero as Gender,
        origin: origem as Origin,
        originDetail: origemDetalhe.trim() || undefined,
        accessibilityNeeds: acessibilidades,
        accessibilityDetail: outraDetalhe.trim() || undefined,
        exhibitionId: 'default-exhibition',
        channel,
      };

      let registered = false;
      try {
        await api.post('/api/v1/users/register', payload);
        registered = true;
      } catch (err) {
        // Offline: enqueue full visitor data so the batch endpoint can create
        // the visitor on the next sync attempt.
        localDb.addToSyncQueue({
          cpf: rawCpf || undefined,
          email: email || undefined,
          name: payload.name,
          birthYear: payload.birthYear,
          gender: payload.gender,
          origin: payload.origin,
          exhibitionId: payload.exhibitionId,
          channel: payload.channel,
        });
      }

      if (registered) {
        try {
          await api.post('/checkins', {
            cpf: rawCpf || undefined,
            email: email || undefined,
            exhibitionId: payload.exhibitionId,
            channel: payload.channel,
          });
        } catch {
          // Initial registration succeeded but checkin POST failed — enqueue.
          localDb.addToSyncQueue({
            cpf: rawCpf || undefined,
            email: email || undefined,
            exhibitionId: payload.exhibitionId,
            channel: payload.channel,
          });
        }
      }

      if (identityMode === 'cpf') {
        const saved = await localDb.saveVisitor({
          cpf: rawCpf,
          name: payload.name,
          birthYear: birthNum,
          gender: payload.gender,
          origin: payload.origin,
          accessibilityNeeds: acessibilidades,
        });
        if (saved?.cpfHash) localStorage.setItem(CPF_LOCAL_HASH_KEY, saved.cpfHash);
      } else if (identityMode === 'email') {
        try {
          const buf = await crypto.subtle.digest(
            'SHA-256',
            new TextEncoder().encode(email.trim().toLowerCase())
          );
          const hash = Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
          localStorage.setItem(EMAIL_LOCAL_HASH_KEY, hash);
        } catch { /* hashing for local dedup is best-effort */ }
      }

      currentSuccess = true;
      setSuccess(true);
      setTimeout(() => navigate('/guide'), 1500);
    } catch (err) {
      console.error('[CheckIn] submit error:', err);
      setError(t('checkin.form.unexpected_error'));
    } finally {
      if (!currentSuccess) setLoading(false);
    }
  };

  const sectionStyle: React.CSSProperties = { marginBottom: 24 };

  return (
    <VisitorLayout>
      <div style={{ padding: '28px 20px 48px', minHeight: '100%' }}>
        <div style={{ marginBottom: 28 }}>
          <p style={{
            fontFamily: "'Space Mono', monospace",
            fontSize: 11,
            letterSpacing: 3,
            color: '#E8554E',
            margin: '0 0 6px',
            fontWeight: 700,
          }}>
            {t('exhibition.label')}
          </p>
          <h1 style={{
            fontFamily: "'Sora', sans-serif",
            fontSize: 26,
            fontWeight: 800,
            color: '#F5ECE4',
            margin: '0 0 10px',
            lineHeight: 1.15,
          }}>
            {t('exhibition.title')}
          </h1>
          <p style={{
            fontFamily: "'DM Sans', sans-serif",
            fontSize: 14,
            color: '#A8969A',
            lineHeight: 1.5,
            margin: 0,
          }}>
            {t('checkin.cta')}
          </p>
        </div>

        <div style={sectionStyle}>
          <FieldLabel>
            {identityMode === 'email' ? t('checkin.form.email_label') : t('checkin.form.cpf.label')}
          </FieldLabel>
          {identityMode === 'email' ? (
            <TextInput
              id="field-email"
              value={email}
              placeholder={t('identity.email_placeholder')}
              readOnly
              style={{ color: '#D4C6C9' }}
            />
          ) : (
            <TextInput
              id="field-cpf"
              value={cpf}
              onChange={e => { setCpf(formatCPF(e.target.value)); setError(null); setShowRedirect(false); }}
              placeholder={t('checkin.form.cpf.placeholder')}
              type="tel"
              inputMode="numeric"
              monospace
            />
          )}
        </div>

        <div style={sectionStyle}>
          <FieldLabel>{t('checkin.form.nome.label')}</FieldLabel>
          <TextInput
            id="field-nome"
            value={nome}
            onChange={e => setNome(e.target.value.replace(/[^a-zA-ZÀ-ÿ\s]/g, ''))}
            placeholder={t('checkin.form.nome.placeholder')}
          />
        </div>

        <div style={sectionStyle}>
          <FieldLabel>{t('checkin.form.nascimento.label')}</FieldLabel>
          <TextInput
            id="field-nasc"
            value={nascimento}
            onChange={e => setNascimento(e.target.value.replace(/\D/g, '').slice(0, 4))}
            placeholder={t('checkin.form.nascimento.placeholder')}
            type="tel"
            inputMode="numeric"
            monospace
            style={{ maxWidth: 140 }}
          />
        </div>

        <div style={sectionStyle}>
          <FieldLabel>{t('checkin.form.genero.label')}</FieldLabel>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {GENEROS.map(g => (
              <Chip
                key={g.value}
                label={t(g.key)}
                active={genero === g.value}
                onClick={() => setGenero(prev => prev === g.value ? '' : g.value)}
              />
            ))}
          </div>
        </div>

        <div style={sectionStyle}>
          <FieldLabel optional={t('checkin.form.acc.optional')}>
            {t('checkin.form.acc.label')}
          </FieldLabel>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {ACESSIBILIDADES.map(a => (
              <Chip
                key={a.value}
                label={t(a.key)}
                active={acessibilidades.includes(a.value)}
                onClick={() => toggleAcess(a.value)}
              />
            ))}
          </div>
          <AnimatePresence>
            {acessibilidades.includes('OUTRA') && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                style={{ marginTop: 12 }}
              >
                <TextInput
                  id="field-outra-acc"
                  value={outraDetalhe}
                  onChange={e => setOutraDetalhe(e.target.value)}
                  placeholder={t('checkin.form.acc.outra_placeholder')}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div style={sectionStyle}>
          <FieldLabel>{t('checkin.form.origem.label')}</FieldLabel>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {ORIGENS.map(o => (
              <Chip
                key={o.value}
                label={t(o.key)}
                active={origem === o.value}
                onClick={() => { setOrigem(prev => prev === o.value ? '' : o.value); setOrigemDetalhe(''); }}
              />
            ))}
          </div>
          <AnimatePresence>
            {needsOriginDetail && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                style={{ marginTop: 12 }}
              >
                <FieldLabel>
                  {getOriginDetailLabel()}
                </FieldLabel>
                <TextInput
                  id="field-origem-detalhe"
                  value={origemDetalhe}
                  onChange={e => setOrigemDetalhe(e.target.value)}
                  placeholder={getOriginPlaceholder()}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ── Como soube da exposição ───────────────────────────────── */}
        <div style={sectionStyle}>
          <FieldLabel>{t('source.question')}</FieldLabel>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {CANAIS.map(c => (
              <Chip
                key={c.id}
                label={t(c.key)}
                active={como === c.id}
                onClick={() => setComo(prev => prev === c.id ? '' : c.id)}
              />
            ))}
          </div>
          <AnimatePresence>
            {como === 'Outro' && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                style={{ marginTop: 12 }}
              >
                <TextInput
                  id="field-como-outro"
                  value={comoOutroText}
                  onChange={e => setComoOutroText(e.target.value)}
                  placeholder={t('source.other_placeholder')}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div style={{
          display: 'flex', gap: 12, alignItems: 'flex-start',
          padding: '14px 16px',
          background: 'rgba(255,255,255,0.03)',
          borderRadius: 10,
          border: '1px solid rgba(255,255,255,0.07)',
          marginBottom: 24,
          cursor: 'pointer',
        }}
          onClick={() => setConsent(v => !v)}
        >
          <div style={{
            width: 18, height: 18, borderRadius: 5, flexShrink: 0, marginTop: 1,
            border: `1.5px solid ${consent ? '#E8554E' : 'rgba(255,255,255,0.2)'}`,
            background: consent ? '#E8554E' : 'transparent',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'all 0.15s',
          }}>
            {consent && (
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3.5" strokeLinecap="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            )}
          </div>
          <p style={{
            fontFamily: "'DM Sans', sans-serif",
            fontSize: 12,
            color: '#A8969A',
            lineHeight: 1.5,
            margin: 0,
          }}>
            {t('checkin.form.lgpd')}
          </p>
        </div>

        <AnimatePresence>
          {error && (
            <motion.div
              role="alert"
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              style={{ color: '#E8554E', fontSize: 13, marginBottom: 16, display: 'flex', flexDirection: 'column' }}
            >
              ⚠️ {error}
              {showRedirect && (
                <button
                  type="button"
                  onClick={() => navigate('/')}
                  style={{ alignSelf: 'flex-start', marginTop: 8, fontSize: 13, color: '#E8554E', background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontWeight: 600 }}
                >
                  {t('checkin.form.go_to_login')}
                </button>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        <button
          className="v-btn-primary"
          onClick={handleSubmit}
          disabled={!isFormValid || loading}
          style={{ opacity: (!isFormValid || loading) ? 0.38 : 1 }}
        >
          {loading ? t('checkin.form.creating') : t('checkin.form.create_profile')}
        </button>
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
