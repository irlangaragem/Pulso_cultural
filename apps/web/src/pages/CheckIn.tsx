import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '../services/api';
import { localDb } from '../services/localDb';
import { formatCPF, isValidCPF } from '../utils/cpf';
import { VisitorLayout } from '../components/VisitorLayout';
import { PulseSymbol } from '../components/PulseSymbol';
import type {
  Gender,
  Origin,
  AccessibilityNeed,
  RegisterVisitorPayload,
} from '../types/visitor';

// ── Feature flag: show accessibility section by default ──
const ENABLE_ACCESSIBILITY_FIELD = true;

// ── Static options ──
const GENEROS: { label: string; value: Gender }[] = [
  { label: 'Feminino',         value: 'FEMININO' },
  { label: 'Masculino',        value: 'MASCULINO' },
  { label: 'Não-binário',      value: 'NAO_BINARIO' },
  { label: 'Prefiro não dizer',value: 'PREFIRO_NAO_DIZER' },
];

const ORIGENS: { label: string; value: Origin }[] = [
  { label: 'Salvador',              value: 'SALVADOR' },
  { label: 'Interior da Bahia',     value: 'INTERIOR_BA' },
  { label: 'Outro estado',          value: 'OUTRO_ESTADO' },
  { label: 'Turista internacional', value: 'INTERNACIONAL' },
];

const ACESSIBILIDADES: { label: string; value: AccessibilityNeed }[] = [
  { label: 'Mobilidade reduzida',     value: 'MOBILIDADE_REDUZIDA' },
  { label: 'Baixa visão',             value: 'BAIXA_VISAO' },
  { label: 'Sensibilidade sensorial', value: 'SENSIBILIDADE_SENSORIAL' },
  { label: 'Neurodivergência',        value: 'NEURODIVERGENCIA' },
  { label: 'Outra',                   value: 'OUTRA' },
];

// ── CPF persistence key ──
const CPF_STORAGE_KEY = 'pulso:return_cpf';

// ── Progress segments ──
const STEPS = ['cpf', 'nome', 'nascimento', 'genero', 'origem', 'consentimento'];

export function CheckIn() {
  const navigate   = useNavigate();
  const location   = useLocation();
  const cpfRef     = useRef<HTMLInputElement>(null);

  // ── Form state ──
  const [cpf,           setCpf]           = useState('');
  const [nome,          setNome]          = useState('');
  const [nascimento,    setNascimento]    = useState('');
  const [genero,        setGenero]        = useState<Gender | ''>('');
  const [origem,        setOrigem]        = useState<Origin | ''>('');
  const [origemDetalhe, setOrigemDetalhe] = useState('');
  const [acessibilidades, setAcessibilidades] = useState<AccessibilityNeed[]>([]);
  const [consent,       setConsent]       = useState(false);

  // ── UI state ──
  const [cpfFocused,      setCpfFocused]      = useState(false);
  const [nameFocused,     setNameFocused]      = useState(false);
  const [birthFocused,    setBirthFocused]     = useState(false);
  const [detailFocused,   setDetailFocused]    = useState(false);
  const [error,           setError]            = useState<string | null>(null);
  const [loading,         setLoading]          = useState(false);
  const [success,         setSuccess]          = useState(false);
  const [showRedirect,    setShowRedirect]      = useState(false);

  // ── Pre-fill CPF from query params (coming from VisitorLogin) ──
  useEffect(() => {
    const params   = new URLSearchParams(location.search);
    const cpfParam = params.get('cpf');
    if (cpfParam) {
      setCpf(formatCPF(cpfParam));
    }
    // Auto-focus CPF field on mount
    cpfRef.current?.focus();
  }, [location.search]);

  // ── CPF handlers ──
  const handleCPFChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCpf(formatCPF(e.target.value));
    setError(null);
    setShowRedirect(false);
  };

  const handleNascimento = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, '').slice(0, 4);
    setNascimento(val);
  };

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Allow only letters (incl. accents) and spaces
    const value = e.target.value.replace(/[^a-zA-ZÀ-ÿ\s]/g, '');
    setNome(value);
  };

  const toggleAcessibilidade = useCallback((need: AccessibilityNeed) => {
    setAcessibilidades(prev =>
      prev.includes(need) ? prev.filter(n => n !== need) : [...prev, need]
    );
  }, []);

  // ── Progress calculation ──
  const completedSteps = [
    cpf.replace(/\D/g, '').length === 11,
    nome.trim().split(/\s+/).length >= 2,
    nascimento.length === 4,
    genero !== '',
    origem !== '' && (
      origem === 'SALVADOR' || origem === 'INTERIOR_BA'
        ? true
        : origemDetalhe.trim().length > 0
    ),
    consent,
  ].filter(Boolean).length;

  const progressPct = Math.round((completedSteps / STEPS.length) * 100);

  const isFormComplete =
    cpf.replace(/\D/g, '').length === 11 &&
    nome.trim().length > 0 &&
    nascimento.length === 4 &&
    genero !== '' &&
    origem !== '' &&
    (origem === 'SALVADOR' || origem === 'INTERIOR_BA'
      ? true
      : origemDetalhe.trim().length > 0) &&
    consent;

  // ── Submit ──
  const handleSubmit = async () => {
    if (!isFormComplete || loading) return;

    // Validate CPF algorithm
    if (!isValidCPF(cpf)) {
      setError('O CPF informado não é válido. Verifique os dígitos.');
      return;
    }

    // Validate full name (at least 2 words)
    if (nome.trim().split(/\s+/).length < 2) {
      setError('Insira seu nome completo (nome e sobrenome).');
      return;
    }

    // Validate birth year
    const currentYear = new Date().getFullYear();
    const bYear       = Number(nascimento);
    if (isNaN(bYear) || bYear < 1904 || bYear > currentYear) {
      setError('Ano de nascimento inválido.');
      return;
    }

    setLoading(true);
    setError(null);

    const rawCpf = cpf.replace(/\D/g, '');
    const isMasterKey = rawCpf === '00000000000';

    // Check for existing local record
    const localVisitor = localDb.getVisitorByCPF(rawCpf);
    if (localVisitor && !isMasterKey) {
      setError('Este CPF já está cadastrado. Use a tela de entrada.');
      setShowRedirect(true);
      setLoading(false);
      return;
    }

    // Check remote
    try {
      if (!isMasterKey) {
        const check = await api.post('/api/v1/users/identify', { cpf: rawCpf });
        if (check.data?.success) {
          setError(`CPF já registrado como ${check.data.visitor.firstName}. Use a tela de entrada.`);
          setShowRedirect(true);
          setLoading(false);
          return;
        }
      }
    } catch {
      // 404 → new user, continue
    }

    const payload: RegisterVisitorPayload = {
      cpf:               rawCpf,
      name:              nome.trim(),
      birthYear:         bYear,
      gender:            genero as Gender,
      origin:            origem as Origin,
      originDetail:      origemDetalhe.trim() || undefined,
      accessibilityNeeds: acessibilidades,
      exhibitionId:      'default-exhibition',
      channel:           'OUTRO',
    };

    try {
      // Persist locally
      localDb.saveVisitor({
        cpf:       rawCpf,
        name:      payload.name,
        birthYear: bYear,
        gender:    payload.gender,
        origin:    payload.origin,
      });

      // Persist CPF as return token
      localStorage.setItem(CPF_STORAGE_KEY, rawCpf);

      // POST to API (v1 dedicated endpoint)
      try {
        await api.post('/api/v1/users/register', payload);
      } catch {
        localDb.addToSyncQueue(payload);
      }

      setSuccess(true);
      setTimeout(() => navigate('/guide'), 1800);
    } catch {
      setError('Erro ao registrar. Tente novamente.');
      setLoading(false);
    }
  };

  // ── Success screen ──
  if (success) {
    return (
      <VisitorLayout>
        <motion.div
          className="visitor-screen"
          style={{ justifyContent: 'center', alignItems: 'center', minHeight: '100%' }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <div className="visitor-glow" />
          <motion.div
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 240, damping: 18 }}
          >
            <PulseSymbol size={80} />
          </motion.div>
          <motion.p
            className="v-cta-text"
            style={{ marginTop: 28, fontSize: 20, textAlign: 'center' }}
            initial={{ y: 16, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.25 }}
          >
            Pulso registrado! ✦
          </motion.p>
          <motion.p
            className="v-footer-note"
            style={{ marginTop: 8 }}
            initial={{ y: 10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.45 }}
          >
            Preparando seu guia cultural...
          </motion.p>
        </motion.div>
      </VisitorLayout>
    );
  }

  return (
    <VisitorLayout>
      <div className="visitor-screen" style={{ paddingTop: 20, paddingBottom: 48 }}>
        <div className="visitor-glow" />

        {/* ── Header ── */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            marginBottom: 20,
            position: 'relative',
            zIndex: 1,
          }}
          role="banner"
        >
          <PulseSymbol size={26} />
          <span style={{ fontFamily: 'Sora, sans-serif', fontWeight: 700, fontSize: 13, color: '#FFFFFF' }}>
            PULSO
          </span>
          <span style={{ fontFamily: 'Sora, sans-serif', fontWeight: 300, fontSize: 9, color: '#8C7A80', letterSpacing: 3 }}>
            CULTURAL
          </span>
        </div>

        {/* ── Progress bar ── */}
        <div
          className="v-step-bar-bg"
          role="progressbar"
          aria-valuenow={progressPct}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Progresso do cadastro"
          style={{ marginBottom: 20, position: 'relative', zIndex: 1 }}
        >
          <motion.div
            className="v-step-bar"
            animate={{ width: `${progressPct}%` }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
          />
        </div>

        {/* ── Title ── */}
        <h1 className="v-screen-title" id="checkin-heading">
          Primeiro pulso!
        </h1>
        <p className="v-screen-desc">
          Conte um pouco sobre você. Esse cadastro é único —<br />
          nas próximas visitas, basta o CPF.
        </p>

        {/* ════════════════════════════════════════════
            FIELD 1 — CPF
        ════════════════════════════════════════════ */}
        <label className="v-label" htmlFor="field-cpf">
          CPF
        </label>
        <div
          className={`v-input-sm-wrap ${cpfFocused ? 'focused' : ''}`}
          style={{ marginBottom: 14 }}
        >
          <input
            ref={cpfRef}
            id="field-cpf"
            type="tel"
            inputMode="numeric"
            placeholder="000.000.000-00"
            value={cpf}
            onChange={handleCPFChange}
            onFocus={() => setCpfFocused(true)}
            onBlur={() => setCpfFocused(false)}
            className="v-input-sm"
            autoComplete="off"
            aria-label="CPF do visitante"
            aria-required="true"
            aria-describedby={error ? 'checkin-error' : undefined}
            style={{ fontFamily: "'Space Mono', monospace", letterSpacing: 2 }}
          />
        </div>

        {/* ════════════════════════════════════════════
            FIELD 2 — Nome
        ════════════════════════════════════════════ */}
        <label className="v-label" htmlFor="field-nome">
          Nome
        </label>
        <div
          className={`v-input-sm-wrap ${nameFocused ? 'focused' : ''}`}
          style={{ marginBottom: 14 }}
        >
          <input
            id="field-nome"
            type="text"
            placeholder="Como quer ser chamado?"
            value={nome}
            onChange={handleNameChange}
            onFocus={() => setNameFocused(true)}
            onBlur={() => setNameFocused(false)}
            className="v-input-sm"
            autoComplete="name"
            aria-label="Nome completo do visitante"
            aria-required="true"
            autoCapitalize="words"
          />
        </div>

        {/* ════════════════════════════════════════════
            FIELD 3 — Ano de nascimento
        ════════════════════════════════════════════ */}
        <label className="v-label" htmlFor="field-nascimento">
          Ano de nascimento
        </label>
        <div
          className={`v-input-sm-wrap ${birthFocused ? 'focused' : ''}`}
          style={{ maxWidth: 148, marginBottom: 14 }}
        >
          <input
            id="field-nascimento"
            type="tel"
            inputMode="numeric"
            placeholder="Ex: 1992"
            value={nascimento}
            onChange={handleNascimento}
            onFocus={() => setBirthFocused(true)}
            onBlur={() => setBirthFocused(false)}
            className="v-input-sm"
            aria-label="Ano de nascimento"
            aria-required="true"
            style={{ fontFamily: "'Space Mono', monospace", letterSpacing: 2 }}
          />
        </div>

        {/* ════════════════════════════════════════════
            FIELD 4 — Identidade de gênero
        ════════════════════════════════════════════ */}
        <label className="v-label" id="label-genero">
          Identidade de gênero
        </label>
        <div
          className="v-chip-row"
          role="group"
          aria-labelledby="label-genero"
          style={{ marginBottom: 14 }}
        >
          {GENEROS.map(g => (
            <button
              key={g.value}
              type="button"
              id={`chip-gender-${g.value}`}
              className={`v-chip ${genero === g.value ? 'active' : ''}`}
              onClick={() => setGenero(g.value)}
              aria-pressed={genero === g.value}
              aria-label={`Gênero: ${g.label}`}
            >
              {g.label}
            </button>
          ))}
        </div>

        {/* ════════════════════════════════════════════
            FEATURE FLAG — Necessidades de acessibilidade
            (appears after gender chips)
        ════════════════════════════════════════════ */}
        {/* ── Accessibility field — always rendered, CSS-driven expand ── */}
        <div
          style={{
            overflow: 'hidden',
            maxHeight: ENABLE_ACCESSIBILITY_FIELD && genero !== '' ? 300 : 0,
            opacity: ENABLE_ACCESSIBILITY_FIELD && genero !== '' ? 1 : 0,
            marginBottom: ENABLE_ACCESSIBILITY_FIELD && genero !== '' ? 14 : 0,
            transition: 'max-height 0.35s ease, opacity 0.25s ease, margin-bottom 0.25s ease',
            position: 'relative',
            zIndex: 1,
          }}
          aria-hidden={!(ENABLE_ACCESSIBILITY_FIELD && genero !== '')}
        >
          <label className="v-label" id="label-acessibilidade">
            Necessidades de acessibilidade{' '}
            <span style={{ color: '#4A3A40', fontWeight: 400 }}>(opcional)</span>
          </label>
          <div
            className="v-chip-row"
            role="group"
            aria-labelledby="label-acessibilidade"
          >
            {ACESSIBILIDADES.map(a => (
              <button
                key={a.value}
                type="button"
                id={`chip-acc-${a.value}`}
                className={`v-chip ${acessibilidades.includes(a.value) ? 'active' : ''}`}
                onClick={() => toggleAcessibilidade(a.value)}
                aria-pressed={acessibilidades.includes(a.value)}
                aria-label={`Necessidade: ${a.label}`}
              >
                {a.label}
              </button>
            ))}
          </div>
        </div>

        {/* ════════════════════════════════════════════
            FIELD 5 — Origem
        ════════════════════════════════════════════ */}
        <label className="v-label" id="label-origem">
          De onde você vem?
        </label>
        <div
          className="v-chip-row"
          role="group"
          aria-labelledby="label-origem"
          style={{ marginBottom: 14 }}
        >
          {ORIGENS.map(o => (
            <button
              key={o.value}
              type="button"
              id={`chip-origin-${o.value}`}
              className={`v-chip ${origem === o.value ? 'active' : ''}`}
              onClick={() => {
                setOrigem(o.value);
                setOrigemDetalhe('');
              }}
              aria-pressed={origem === o.value}
              aria-label={`Origem: ${o.label}`}
            >
              {o.label}
            </button>
          ))}
        </div>

        {/* Origin detail — animated expansion */}
        <AnimatePresence>
          {(origem === 'OUTRO_ESTADO' || origem === 'INTERNACIONAL') && (
            <motion.div
              key="origin-detail"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.25 }}
              style={{ marginBottom: 14 }}
            >
              <label className="v-label" htmlFor="field-origem-detalhe">
                {origem === 'INTERNACIONAL' ? 'Qual país e cidade?' : 'Qual cidade / estado?'}
              </label>
              <div className={`v-input-sm-wrap ${detailFocused ? 'focused' : ''}`}>
                <input
                  id="field-origem-detalhe"
                  type="text"
                  placeholder={
                    origem === 'INTERNACIONAL'
                      ? 'Ex: Buenos Aires, Argentina'
                      : 'Ex: São Paulo, SP'
                  }
                  value={origemDetalhe}
                  onChange={e => setOrigemDetalhe(e.target.value)}
                  onFocus={() => setDetailFocused(true)}
                  onBlur={() => setDetailFocused(false)}
                  className="v-input-sm"
                  aria-label="Cidade ou país de origem"
                  aria-required="true"
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ════════════════════════════════════════════
            FIELD 6 — LGPD Consent
        ════════════════════════════════════════════ */}
        <div
          className="v-consent-row"
          onClick={() => setConsent(c => !c)}
          role="checkbox"
          aria-checked={consent}
          aria-label="Concordar com uso de dados para melhoria da experiência cultural"
          tabIndex={0}
          onKeyDown={e => { if (e.key === ' ' || e.key === 'Enter') setConsent(c => !c); }}
          style={{ marginBottom: 4 }}
        >
          <div className={`v-checkbox ${consent ? 'checked' : ''}`} aria-hidden="true">
            {consent && (
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            )}
          </div>
          <span className="v-consent-text">
            Concordo com o uso dos meus dados para melhoria da experiência cultural
            e relatórios de impacto do espaço, conforme a LGPD.
          </span>
        </div>

        {/* ── Error message ── */}
        <AnimatePresence>
          {error && (
            <motion.div
              id="checkin-error"
              role="alert"
              className="v-error"
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              style={{ marginTop: 14 }}
            >
              ⚠️ {error}
              {showRedirect && (
                <button
                  type="button"
                  onClick={() => navigate('/')}
                  className="v-btn-ghost"
                  style={{ marginTop: 8, fontSize: 12, color: '#E8554E', padding: '6px 0' }}
                  aria-label="Ir para tela de entrada"
                >
                  → Ir para a tela de entrada
                </button>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* ════════════════════════════════════════════
            CTA — Registrar e acessar guia
        ════════════════════════════════════════════ */}
        <motion.button
          type="button"
          id="btn-register"
          className="v-btn-primary"
          style={{
            marginTop: 22,
            opacity: isFormComplete && !loading ? 1 : 0.35,
          }}
          onClick={handleSubmit}
          disabled={!isFormComplete || loading}
          aria-disabled={!isFormComplete || loading}
          aria-label="Registrar e acessar guia cultural"
          whileTap={isFormComplete && !loading ? { scale: 0.97 } : {}}
        >
          {loading ? (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
              <motion.span
                style={{ display: 'inline-block', width: 14, height: 14, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%' }}
                animate={{ rotate: 360 }}
                transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
              />
              Validando...
            </span>
          ) : (
            'Registrar e acessar guia'
          )}
        </motion.button>

        {/* Bottom spacer */}
        <div style={{ height: 40 }} />
      </div>
    </VisitorLayout>
  );
}
