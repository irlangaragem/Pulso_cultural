import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '../services/api';
import { localDb } from '../services/localDb';
import { formatCPF, isValidCPF } from '../utils/cpf';
import { PulseSymbol } from '../components/PulseSymbol';
import { SmartLanguageFAB } from '../components/SmartLanguageFAB';
import { useLanguage } from '../contexts/LanguageContext';
import type {
  Gender,
  Origin,
  AccessibilityNeed,
  RegisterVisitorPayload,
} from '../types/visitor';



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

const CPF_STORAGE_KEY = 'pulso:return_cpf';
const TOTAL_STEPS = 4;

export function CheckIn() {
  const navigate = useNavigate();
  const location = useLocation();
  const cpfRef = useRef<HTMLInputElement>(null);
  const nameRef = useRef<HTMLInputElement>(null);
  const { t } = useLanguage();

  // ── Form state ──
  const [cpf,  setCpf]  = useState('');
  const [email, setEmail] = useState('');
  const [nome, setNome] = useState('');
  const [nascimento, setNascimento] = useState('');
  const [genero, setGenero] = useState<Gender | ''>('');
  const [origem, setOrigem] = useState<Origin | ''>('');
  const [origemDetalhe, setOrigemDetalhe] = useState('');
  const [acessibilidades, setAcessibilidades] = useState<AccessibilityNeed[]>([]);
  const [outraDetalhe, setOutraDetalhe] = useState('');
  const [consent, setConsent] = useState(false);

  // ── UI state ──
  const [step, setStep] = useState(1);
  const [cpfFocused, setCpfFocused] = useState(false);
  const [nameFocused, setNameFocused] = useState(false);
  const [birthFocused, setBirthFocused] = useState(false);
  const [detailFocused, setDetailFocused] = useState(false);
  const [outraFocused, setOutraFocused] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [showRedirect, setShowRedirect] = useState(false);

  // ── Pre-fill CPF from query params ──
  const params = new URLSearchParams(location.search);
  const comoParam = params.get('como');

  useEffect(() => {
    const cpfParam   = params.get('cpf');
    const emailParam = params.get('email');
    if (cpfParam)   setCpf(formatCPF(cpfParam));
    if (emailParam) setEmail(emailParam);
  }, [location.search]);

  // Derived: which identity mode was passed in?
  const identityMode: 'cpf' | 'email' = params.get('email') ? 'email' : 'cpf';

  // Focus management on step change
  useEffect(() => {
    if (step === 1 && nameRef.current) nameRef.current.focus();
    if (step === 4 && cpfRef.current) cpfRef.current.focus();
    setError(null);
  }, [step]);

  // ── Input Handlers ──
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
    const value = e.target.value.replace(/[^a-zA-ZÀ-ÿ\s]/g, '');
    setNome(value);
  };

  const toggleAcessibilidade = useCallback((need: AccessibilityNeed) => {
    setAcessibilidades(prev =>
      prev.includes(need) ? prev.filter(n => n !== need) : [...prev, need]
    );
  }, []);

  // ── Step Validation ──
  const validateName = nome.trim().split(/\s+/).length >= 2;
  const birthNumber = Number(nascimento);
  const validateBirth = nascimento.length === 4 && birthNumber >= 1904 && birthNumber <= new Date().getFullYear();
  
  const isStep1Valid = validateName && validateBirth;
  
  const isStep2Valid = 
    origem !== '' &&
    (origem === 'SALVADOR' ? true : origemDetalhe.trim().length > 0);

  const isStep3Valid = true; // Optional

  const isStep4Valid = identityMode === 'email'
    ? /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) && consent
    : cpf.replace(/\D/g, '').length === 11 && isValidCPF(cpf) && consent;

  const canAdvance = 
    (step === 1 && isStep1Valid) ||
    (step === 2 && isStep2Valid) ||
    (step === 3 && isStep3Valid) ||
    (step === 4 && isStep4Valid);

  const progressPct = Math.round((step / TOTAL_STEPS) * 100);

  // ── Step Navigation ──
  const nextStep = () => {
    if (!canAdvance) return;
    if (step < TOTAL_STEPS) {
      setStep(prev => prev + 1);
    } else {
      handleSubmit();
    }
  };

  const prevStep = () => {
    if (step > 1) {
      setStep(prev => prev - 1);
      setError(null);
    }
  };

  // ── Submit logic ──
  const handleSubmit = async () => {
    if (!isStep4Valid || loading) return;

    setLoading(true);
    setError(null);

    const rawCpf = cpf.replace(/\D/g, '');
    const isMasterKey = rawCpf === '00000000000';

    const localVisitor = await localDb.getVisitorByCPF(rawCpf);
    if (localVisitor && !isMasterKey) {
      localStorage.setItem(CPF_STORAGE_KEY, rawCpf);
      setError('Este CPF já está cadastrado. Use a tela de entrada.');
      setShowRedirect(true);
      setLoading(false);
      return;
    }

    try {
      if (!isMasterKey) {
        const identifyBody = identityMode === 'email' ? { email } : { cpf: rawCpf };
        const check = await api.post('/api/v1/users/identify', identifyBody);
        if (check.data?.success) {
          if (identityMode === 'cpf') localStorage.setItem(CPF_STORAGE_KEY, rawCpf);
          else localStorage.setItem('pulso:return_email', email);
          const who = check.data.visitor?.firstName || '';
          setError(`${identityMode === 'email' ? 'E-mail' : 'CPF'} já registrado como ${who}. Use a tela de entrada.`);
          setShowRedirect(true);
          setLoading(false);
          return;
        }
      }
    } catch {
      // 404 = valid new user
    }

    const channelMap: Record<string, string> = {
      'Redes sociais': 'REDES_SOCIAIS',
      'Indicação': 'INDICACAO',
      'Passei na frente': 'PASSOU_NA_FRENTE',
      'Jornal / TV': 'JORNAL_TV',
      'Escola / faculdade': 'ESCOLA_FACULDADE',
      'Outro': 'OUTRO',
    };

    const payload: RegisterVisitorPayload = {
      cpf: identityMode === 'email' ? undefined as any : rawCpf,
      email: identityMode === 'email' ? email : undefined,
      name: nome.trim(),
      birthYear: birthNumber,
      gender: genero as Gender,
      origin: origem as Origin,
      originDetail: origemDetalhe.trim() || undefined,
      accessibilityNeeds: acessibilidades,
      accessibilityDetail: outraDetalhe.trim() || undefined,
      exhibitionId: 'default-exhibition',
      channel: comoParam ? (channelMap[comoParam] || 'OUTRO') : 'OUTRO',
    };

    try {
      if (identityMode === 'cpf') {
        await localDb.saveVisitor({
          cpf: rawCpf,
          name: payload.name,
          birthYear: birthNumber,
          gender: payload.gender,
          origin: payload.origin,
          accessibilityNeeds: acessibilidades,
        });
        localStorage.setItem(CPF_STORAGE_KEY, rawCpf);
      } else {
        localStorage.setItem('pulso:return_email', email);
      }

      try {
        await api.post('/api/v1/users/register', payload);
      } catch {
        const saved = await localDb.getVisitorByCPF(rawCpf);
        const { cpf: _cpfFallback, ...safePayload } = payload;
        localDb.addToSyncQueue({ ...safePayload, cpfHash: saved?.cpfHash });
      }

      setSuccess(true);
      setTimeout(() => navigate('/guide'), 1800);
    } catch {
      setError('Erro ao registrar. Tente novamente.');
      setLoading(false);
    }
  };

  const getOriginPlaceholder = () => {
    switch (origem) {
      case 'INTERIOR_BA': return 'Ex: Feira de Santana';
      case 'OUTRO_ESTADO': return t('checkin.form.origem.out_placeholder');
      case 'INTERNACIONAL': return t('checkin.form.origem.tur_placeholder');
      default: return '';
    }
  };

  const getOriginLabel = () => {
    switch (origem) {
      case 'INTERIOR_BA': return 'Qual cidade?';
      case 'OUTRO_ESTADO': return t('checkin.form.origem.out_placeholder');
      case 'INTERNACIONAL': return t('checkin.form.origem.tur_placeholder');
      default: return '';
    }
  };

  // ── View Renders ──
  if (success) {
    return (
      <div style={{ background: '#0B0B0F', minHeight: '100dvh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <SmartLanguageFAB />
        <motion.div
           className="visitor-screen"
           style={{ justifyContent: 'center', alignItems: 'center', minHeight: '100%', maxWidth: 600, width: '100%', position: 'relative' }}
           initial={{ opacity: 0 }}
           animate={{ opacity: 1 }}
        >
          <div className="visitor-glow" />
          <motion.div initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', stiffness: 240, damping: 18 }}>
            <PulseSymbol size={80} />
          </motion.div>
          <motion.p className="v-cta-text" style={{ marginTop: 28, fontSize: 20, textAlign: 'center' }} initial={{ y: 16, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.25 }}>
            Pulso registrado! ✦
          </motion.p>
          <motion.p className="v-footer-note" style={{ marginTop: 8 }} initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.45 }}>
            Preparando seu guia cultural...
          </motion.p>
        </motion.div>
      </div>
    );
  }

  const framerVariants = {
    initial: { opacity: 0, x: 20 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -20 },
  };

  return (
    <div style={{ background: '#0B0B0F', minHeight: '100dvh', width: '100%', display: 'flex', justifyContent: 'center', fontFamily: "'DM Sans', sans-serif" }}>
      <SmartLanguageFAB />
      <div className="visitor-screen" style={{ paddingTop: 60, paddingBottom: 48, maxWidth: 600, width: '100%', margin: '0 auto', textAlign: 'left', position: 'relative' }}>
        <div className="visitor-glow" />

        {/* ── Brand Header ── */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }} role="banner">
            <PulseSymbol size={26} />
            <span style={{ fontFamily: 'Sora, sans-serif', fontWeight: 700, fontSize: 13, color: '#FFFFFF' }}>PULSO</span>
            <span style={{ fontFamily: 'Sora, sans-serif', fontWeight: 300, fontSize: 9, color: '#8C7A80', letterSpacing: 3 }}>CULTURAL</span>
          </div>
          {step > 1 && (
            <button onClick={prevStep} style={{ background: 'transparent', border: 'none', color: '#A8969A', cursor: 'pointer', fontSize: 13 }}>
              ← Voltar
            </button>
          )}
        </div>

        {/* ── Progress Indicators ── */}
        <div style={{ position: 'relative', zIndex: 1, marginBottom: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 13, color: '#A8969A', fontWeight: 500 }}>Passo {step} de {TOTAL_STEPS}</span>
          <span style={{ fontSize: 13, color: '#A8969A', fontFamily: 'Sora' }}>{progressPct}%</span>
        </div>
        <div className="v-step-bar-bg" role="progressbar" aria-valuenow={progressPct} aria-valuemin={0} aria-valuemax={100} style={{ marginBottom: 32, position: 'relative', zIndex: 1, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.05)' }}>
          <motion.div className="v-step-bar" animate={{ width: `${progressPct}%` }} transition={{ duration: 0.4, ease: 'easeOut' }} style={{ background: 'linear-gradient(90deg, #E05A2A, #FF7B4D)', height: '100%', borderRadius: 2 }} />
        </div>

        {/* ── Titles ── */}
        <h1 className="v-screen-title" id="checkin-heading" style={{ fontSize: 'clamp(24px, 5vw, 32px)', fontWeight: 700, marginBottom: 12 }}>
          {t('checkin.form.title')}
        </h1>
        <p className="v-screen-desc" style={{ fontSize: 16, color: '#8C7A80', marginBottom: 24, lineHeight: 1.5, fontWeight: 400 }}>
          {t('checkin.form.desc')}
        </p>

        <AnimatePresence mode="wait">
          {/* ════════════════════════════════════════════
              STEP 1 — BASIC INFO
          ════════════════════════════════════════════ */}
          {step === 1 && (
            <motion.div key="step1" variants={framerVariants} initial="initial" animate="animate" exit="exit" transition={{ duration: 0.25 }}>
              <label className="v-label" htmlFor="field-nome" style={{ fontSize: 14, fontWeight: 500, color: '#D4C6C9', marginBottom: 8, display: 'block' }}>
                {t('checkin.form.nome.label')}
              </label>
              <div className={`v-input-sm-wrap ${nameFocused ? 'focused' : ''}`} style={{ marginBottom: 20 }}>
                <input ref={nameRef} id="field-nome" type="text" placeholder={t('checkin.form.nome.placeholder')} value={nome} onChange={handleNameChange} onFocus={() => setNameFocused(true)} onBlur={() => setNameFocused(false)} className="v-input-sm" autoComplete="name" aria-label="Nome completo do visitante" />
              </div>

              <label className="v-label" htmlFor="field-nascimento" style={{ fontSize: 14, fontWeight: 500, color: '#D4C6C9', marginBottom: 8, display: 'block' }}>
                {t('checkin.form.nascimento.label')}
              </label>
              <div className={`v-input-sm-wrap ${birthFocused ? 'focused' : ''}`} style={{ maxWidth: 160, marginBottom: 14 }}>
                <input id="field-nascimento" type="tel" inputMode="numeric" placeholder={t('checkin.form.nascimento.placeholder')} value={nascimento} onChange={handleNascimento} onFocus={() => setBirthFocused(true)} onBlur={() => setBirthFocused(false)} className="v-input-sm" aria-label="Ano de nascimento" style={{ fontFamily: "'Space Mono', monospace", letterSpacing: 2 }} />
              </div>
            </motion.div>
          )}

          {/* ════════════════════════════════════════════
              STEP 2 — PROFILE
          ════════════════════════════════════════════ */}
          {step === 2 && (
            <motion.div key="step2" variants={framerVariants} initial="initial" animate="animate" exit="exit" transition={{ duration: 0.25 }}>
              <label className="v-label" id="label-origem" style={{ fontSize: 14, fontWeight: 500, color: '#D4C6C9', marginBottom: 12, display: 'block' }}>
                {t('checkin.form.origem.label')}
              </label>
              <div className="v-chip-row" role="group" aria-labelledby="label-origem" style={{ marginBottom: 16 }}>
                {ORIGENS.map(o => {
                  const orgMap: any = {
                    'SALVADOR': 'checkin.form.origem.sal',
                    'INTERIOR_BA': 'checkin.form.origem.int',
                    'OUTRO_ESTADO': 'checkin.form.origem.out',
                    'INTERNACIONAL': 'checkin.form.origem.tur',
                  };
                  return (
                    <motion.button key={o.value} type="button" whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className={`v-chip ${origem === o.value ? 'active' : ''}`} onClick={() => { setOrigem(o.value); setOrigemDetalhe(''); }} aria-pressed={origem === o.value}>
                      {t(orgMap[o.value] || o.label)}
                    </motion.button>
                  );
                })}
              </div>

              <AnimatePresence>
                {origem && origem !== 'SALVADOR' && (
                  <motion.div key="origin-detail" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.25 }} style={{ marginBottom: 24 }}>
                    <label className="v-label" htmlFor="field-origem-detalhe" style={{ color: '#A8969A', fontSize: 13 }}>
                      {getOriginLabel()}
                    </label>
                    <div className={`v-input-sm-wrap ${detailFocused ? 'focused' : ''}`} style={{ marginTop: 8 }}>
                      <input id="field-origem-detalhe" type="text" placeholder={getOriginPlaceholder()} value={origemDetalhe} onChange={e => setOrigemDetalhe(e.target.value)} onFocus={() => setDetailFocused(true)} onBlur={() => setDetailFocused(false)} className="v-input-sm" />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <label className="v-label" id="label-genero" style={{ fontSize: 14, fontWeight: 500, color: '#D4C6C9', marginBottom: 12, marginTop: origem === 'SALVADOR' ? 24 : 0, display: 'block' }}>
                {t('checkin.form.genero.label')} <span style={{ color: '#8C7A80', fontWeight: 400, marginLeft: 6 }}>(opcional)</span>
              </label>
              <div className="v-chip-row" role="group" aria-labelledby="label-genero">
                {GENEROS.map(g => {
                  const keyMap: any = {
                    'FEMININO': 'checkin.form.genero.f',
                    'MASCULINO': 'checkin.form.genero.m',
                    'NAO_BINARIO': 'checkin.form.genero.nb',
                    'PREFIRO_NAO_DIZER': 'checkin.form.genero.pnd',
                  };
                  return (
                    <motion.button key={g.value} type="button" whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className={`v-chip ${genero === g.value ? 'active' : ''}`} onClick={() => setGenero(g.value)} aria-pressed={genero === g.value}>
                      {t(keyMap[g.value] || g.label)}
                    </motion.button>
                  );
                })}
              </div>
            </motion.div>
          )}

          {/* ════════════════════════════════════════════
              STEP 3 — ACCESSIBILITY
          ════════════════════════════════════════════ */}
          {step === 3 && (
            <motion.div key="step3" variants={framerVariants} initial="initial" animate="animate" exit="exit" transition={{ duration: 0.25 }}>
              <label className="v-label" id="label-acessibilidade" style={{ fontSize: 14, fontWeight: 500, color: '#D4C6C9', marginBottom: 6, display: 'block' }}>
                {t('checkin.form.acc.label')} <span style={{ color: '#8C7A80', fontWeight: 400 }}>{t('checkin.form.acc.optional')}</span>
              </label>
              <p style={{ fontSize: 13, color: '#A8969A', marginBottom: 16 }}>
                {t('checkin.form.acc.help')}
              </p>
              <div className="v-chip-row" role="group" aria-labelledby="label-acessibilidade">
                {ACESSIBILIDADES.map(a => {
                  const accMap: any = {
                    'MOBILIDADE_REDUZIDA': 'checkin.form.acc.mob',
                    'BAIXA_VISAO': 'checkin.form.acc.vis',
                    'SENSIBILIDADE_SENSORIAL': 'checkin.form.acc.sen',
                    'NEURODIVERGENCIA': 'checkin.form.acc.neu',
                    'OUTRA': 'checkin.form.acc.outra',
                  };
                  return (
                    <motion.button key={a.value} type="button" whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className={`v-chip ${acessibilidades.includes(a.value) ? 'active' : ''}`} onClick={() => toggleAcessibilidade(a.value)} aria-pressed={acessibilidades.includes(a.value)}>
                      {t(accMap[a.value] || a.label)}
                    </motion.button>
                  );
                })}
              </div>
              <AnimatePresence>
                {acessibilidades.includes('OUTRA') && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.25 }} style={{ marginTop: 14 }}>
                    <div className={`v-input-sm-wrap ${outraFocused ? 'focused' : ''}`}>
                      <input id="field-acc-outra" type="text" placeholder={t('checkin.form.acc.outra_placeholder')} value={outraDetalhe} onChange={e => setOutraDetalhe(e.target.value)} onFocus={() => setOutraFocused(true)} onBlur={() => setOutraFocused(false)} className="v-input-sm" />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}

          {/* ════════════════════════════════════════════
              STEP 4 — CPF & CONSENT
          ════════════════════════════════════════════ */}
          {step === 4 && (
            <motion.div key="step4" variants={framerVariants} initial="initial" animate="animate" exit="exit" transition={{ duration: 0.25 }}>
              <label className="v-label" htmlFor={identityMode === 'email' ? 'field-email' : 'field-cpf'} style={{ fontSize: 14, fontWeight: 500, color: '#D4C6C9', marginBottom: 6, display: 'block' }}>
                {identityMode === 'email' ? t('identity.email') : t('checkin.form.cpf.label')}
              </label>
              <p style={{ fontSize: 13, color: '#A8969A', marginBottom: 12 }}>
                {t('checkin.form.trust')}
              </p>
              <AnimatePresence mode="wait">
                {identityMode === 'email' ? (
                  <motion.div key="email-field" initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 8 }} transition={{ duration: 0.18 }}>
                    <div className={`v-input-sm-wrap ${cpfFocused ? 'focused' : ''}`} style={{ marginBottom: 24 }}>
                      <input id="field-email" type="email" inputMode="email" placeholder={t('identity.email_placeholder')} value={email} onChange={e => setEmail(e.target.value.trim())} onFocus={() => setCpfFocused(true)} onBlur={() => setCpfFocused(false)} className="v-input-sm" autoComplete="email" style={{ letterSpacing: 0, fontSize: 15 }} />
                    </div>
                  </motion.div>
                ) : (
                  <motion.div key="cpf-field" initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -8 }} transition={{ duration: 0.18 }}>
                    <div className={`v-input-sm-wrap ${cpfFocused ? 'focused' : ''}`} style={{ maxWidth: 220, marginBottom: 24 }}>
                      <input ref={cpfRef} id="field-cpf" type="tel" inputMode="numeric" placeholder={t('checkin.form.cpf.placeholder')} value={cpf} onChange={handleCPFChange} onFocus={() => setCpfFocused(true)} onBlur={() => setCpfFocused(false)} className="v-input-sm" autoComplete="off" style={{ fontFamily: "'Space Mono', monospace", letterSpacing: 2 }} />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
              <div className="v-consent-row" style={{ display: 'flex', gap: 12, alignItems: 'flex-start', cursor: 'pointer', padding: '12px 16px', background: 'rgba(255,255,255,0.03)', borderRadius: 8, border: '1px solid rgba(255,255,255,0.06)' }}>
                <input type="checkbox" id="lgpd-consent" checked={consent} onChange={(e) => setConsent(e.target.checked)} style={{ appearance: 'none', width: 0, height: 0, opacity: 0, position: 'absolute' }} />
                <div className={`v-checkbox ${consent ? 'checked' : ''}`} aria-hidden="true" onClick={() => document.getElementById('lgpd-consent')?.click()}>
                  {consent && (<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round"><polyline points="20 6 9 17 4 12" /></svg>)}
                </div>
                <label htmlFor="lgpd-consent" className="v-consent-text" style={{ fontSize: 13, color: '#A8969A', lineHeight: 1.5, marginTop: 2, cursor: 'pointer' }}>
                  {t('checkin.form.lgpd')}
                </label>
              </div>
              <AnimatePresence>
                {error && (
                  <motion.div role="alert" initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} style={{ marginTop: 14, color: '#E8554E', fontSize: 14, display: 'flex', flexDirection: 'column' }}>
                    ⚠️ {error}
                    {showRedirect && (<button type="button" onClick={() => navigate('/')} className="v-btn-ghost" style={{ alignSelf: 'flex-start', marginTop: 8, fontSize: 13, color: '#E8554E', padding: '6px 0', fontWeight: 500 }}>→ Ir para a página de retorno</button>)}
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ════════════════════════════════════════════
            CTA AREA
        ════════════════════════════════════════════ */}
        <div style={{ marginTop: 40 }}>
          <motion.button
            type="button"
            className="v-btn-primary checkin-submit"
            style={{
              opacity: canAdvance && !loading ? 1 : 0.35,
              width: '100%',
              borderRadius: 8,
              padding: '16px 0',
              color: '#FFFFFF',
              fontSize: 16,
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8
            }}
            onClick={nextStep}
            disabled={!canAdvance || loading}
            whileTap={canAdvance && !loading ? { scale: 0.98 } : {}}
          >
            {loading ? (
              <>
                <motion.span style={{ display: 'inline-block', width: 14, height: 14, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%' }} animate={{ rotate: 360 }} transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }} />
                {t('checkin.form.validating')}
              </>
            ) : step < TOTAL_STEPS ? (
              'Avançar →'
            ) : (
              t('checkin.form.submit')
            )}
          </motion.button>
        </div>

        <div style={{ height: 40 }} />
      </div>
    </div>
  );
}
