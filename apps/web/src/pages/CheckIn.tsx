import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { api } from '../services/api';
import { localDb } from '../services/localDb';
import { motion, AnimatePresence } from 'framer-motion';
import { isValidCPF } from '../utils/cpf';
import { VisitorLayout } from '../components/VisitorLayout';
import { PulseSymbol } from '../components/PulseSymbol';

const GENEROS = ['Feminino', 'Masculino', 'Não-binário', 'Prefiro não dizer'];
const ORIGENS = ['Salvador', 'Bahia (Interior)', 'Outro Estado', 'Internacional'];

const GENDER_MAP: Record<string, string> = {
  'Feminino': 'FEMININO',
  'Masculino': 'MASCULINO',
  'Não-binário': 'NAO_BINARIO',
  'Prefiro não dizer': 'PREFIRO_NAO_DIZER',
};

export function CheckIn() {
  const [animatingSuccess, setAnimatingSuccess] = useState(false);

  const [form, setForm] = useState({
    cpf: '',
    nome: '',
    nascimento: '',
    genero: '',
    origem: '',
    origemDetalhe: '',
  });

  const [consent, setConsent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showLoginRedirect, setShowLoginRedirect] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();

  // Handle pre-filled CPF from query params
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const cpfParam = params.get('cpf');
    if (cpfParam) {
      setForm(prev => ({ ...prev, cpf: cpfParam }));
    }
  }, [location.search]);

  const formatCPF = (val: string) => {
    const nums = val.replace(/\D/g, '').slice(0, 11);
    if (nums.length <= 3) return nums;
    if (nums.length <= 6) return `${nums.slice(0, 3)}.${nums.slice(3)}`;
    if (nums.length <= 9) return `${nums.slice(0, 3)}.${nums.slice(3, 6)}.${nums.slice(6)}`;
    return `${nums.slice(0, 3)}.${nums.slice(3, 6)}.${nums.slice(6, 9)}-${nums.slice(9)}`;
  };

  const handleCPFChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, cpf: formatCPF(e.target.value) });
    setShowLoginRedirect(false);
    setError('');
  };

  const handleNascimento = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, '').slice(0, 4);
    setForm({ ...form, nascimento: val });
  };

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Allows letters (including accents) and spaces only
    const value = e.target.value.replace(/[^a-zA-ZÀ-ÿ\s]/g, '');
    setForm({ ...form, nome: value });
  };

  const isFormComplete = 
    form.cpf.replace(/\D/g, '').length === 11 &&
    form.nome.trim().length > 0 &&
    form.nascimento.length === 4 &&
    form.genero &&
    form.origem &&
    (form.origem === 'Salvador' || form.origem === 'Bahia (Interior)' ? true : form.origemDetalhe.trim().length > 0) &&
    consent;

  const handleSubmit = async () => {
    if (!isFormComplete) return;

    if (!isValidCPF(form.cpf)) {
      setError('Por favor, insira um CPF válido.');
      return;
    }
    if (form.nome.trim().split(' ').length < 2) {
      setError('Insira seu nome completo.');
      return;
    }
    const currentYear = new Date().getFullYear();
    const bYear = Number(form.nascimento);
    if (isNaN(bYear) || bYear > currentYear || currentYear - bYear > 120 || bYear < 1000) {
      setError('Ano de nascimento inválido.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Check if CPF already exists locally
      const rawCpf = form.cpf.replace(/\D/g, '');
      const localVisitor = localDb.getVisitorByCPF(rawCpf);
      if (localVisitor) {
        setError('Você já possui uma conta! Use a tela de Check-in.');
        setShowLoginRedirect(true);
        setLoading(false);
        return;
      }

      // Check if CPF already exists on server
      try {
        const response = await api.get(`/checkins/verify/${rawCpf}`);
        if (response.data && response.data.success) {
          setError(`CPF já registrado como ${response.data.firstName}. Use o Check-in.`);
          setShowLoginRedirect(true);
          setLoading(false);
          return;
        }
      } catch {
        // 404 = doesn't exist, which is what we want
      }

      const checkinData = {
        cpf: rawCpf,
        name: form.nome.trim(),
        birthYear: bYear,
        gender: GENDER_MAP[form.genero] || 'PREFIRO_NAO_DIZER',
        origin: form.origem === 'Salvador' || form.origem === 'Bahia (Interior)' 
          ? form.origem 
          : `${form.origem}: ${form.origemDetalhe}`,
        channel: 'TOTEM_PRESENCIAL',
        exhibitionId: 'default-exhibition',
      };

      try {
        localDb.saveVisitor(checkinData);
      } catch (e) {
        console.warn('LocalDB error', e);
      }

      try {
        await api.post('/checkins', checkinData);
      } catch {
        localDb.addToSyncQueue(checkinData);
      }

      setAnimatingSuccess(true);
      setTimeout(() => navigate('/guide'), 1800);
    } catch {
      setLoading(false);
    }
  };

  // Success animation screen
  if (animatingSuccess) {
    return (
      <VisitorLayout>
        <div className="visitor-screen" style={{ justifyContent: 'center', alignItems: 'center', minHeight: '100%' }}>
          <div className="visitor-glow" />
          <PulseSymbol size={80} />
          <p className="v-cta-text" style={{ marginTop: 24, fontSize: 18 }}>Pulso registrado!</p>
          <p className="v-footer-note" style={{ marginTop: 8 }}>Preparando seu guia...</p>
        </div>
      </VisitorLayout>
    );
  }

  return (
    <VisitorLayout>
      <div className="visitor-screen" style={{ paddingTop: 24 }}>
        <div className="visitor-glow" />

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16, position: 'relative', zIndex: 1 }}>
          <PulseSymbol size={28} />
          <span style={{ fontFamily: 'Sora, sans-serif', fontWeight: 700, fontSize: 14, color: '#F5ECE4' }}>PULSO</span>
          <span style={{ fontFamily: 'Sora, sans-serif', fontWeight: 300, fontSize: 9, color: '#A8969A', letterSpacing: 3 }}>CULTURAL</span>
        </div>

        {/* Title */}
        <h2 className="v-screen-title">Primeiro pulso!</h2>
        <p className="v-screen-desc">
          Conte um pouco sobre você. Esse cadastro é único — nas próximas visitas, basta o CPF.
        </p>

        {/* CPF */}
        <label className="v-label">CPF</label>
        <div className="v-input-sm-wrap">
          <input
            type="tel"
            inputMode="numeric"
            placeholder="000.000.000-00"
            value={form.cpf}
            onChange={handleCPFChange}
            className="v-input-sm"
            style={{ fontFamily: "'Space Mono', monospace", letterSpacing: 2 }}
          />
        </div>

        {/* Name */}
        <label className="v-label">Nome</label>
        <div className="v-input-sm-wrap">
          <input
            type="text"
            placeholder="Como quer ser chamado?"
            value={form.nome}
            onChange={handleNameChange}
            className="v-input-sm"
          />
        </div>

        {/* Birth year */}
        <label className="v-label">Ano de nascimento</label>
        <div className="v-input-sm-wrap" style={{ maxWidth: 140 }}>
          <input
            type="tel"
            inputMode="numeric"
            placeholder="Ex: 1992"
            value={form.nascimento}
            onChange={handleNascimento}
            className="v-input-sm"
            style={{ fontFamily: "'Space Mono', monospace", letterSpacing: 2 }}
          />
        </div>

        {/* Gender */}
        <label className="v-label">Identidade de gênero</label>
        <div className="v-chip-row">
          {GENEROS.map(g => (
            <button
              key={g}
              type="button"
              className={`v-chip ${form.genero === g ? 'active' : ''}`}
              onClick={() => setForm({ ...form, genero: g })}
            >
              {g}
            </button>
          ))}
        </div>

        {/* Origin */}
        <label className="v-label">De onde você vem?</label>
        <div className="v-chip-row">
          {ORIGENS.map(o => (
            <button
              key={o}
              type="button"
              className={`v-chip ${form.origem === o ? 'active' : ''}`}
              onClick={() => setForm({ ...form, origem: o })}
            >
              {o}
            </button>
          ))}
        </div>

        {/* Origin Detail (City/Country) */}
        {(form.origem === 'Outro Estado' || form.origem === 'Internacional') && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            style={{ marginTop: 12 }}
          >
            <label className="v-label">Qual cidade ou país?</label>
            <div className="v-input-sm-wrap">
              <input
                type="text"
                placeholder={form.origem === 'Internacional' ? "Ex: Buenos Aires, Argentina" : "Ex: São Paulo, SP"}
                value={form.origemDetalhe}
                onChange={(e) => setForm({ ...form, origemDetalhe: e.target.value })}
                className="v-input-sm"
              />
            </div>
          </motion.div>
        )}

        {/* Consent */}
        <div className="v-consent-row" onClick={() => setConsent(!consent)}>
          <div className={`v-checkbox ${consent ? 'checked' : ''}`}>
            {consent && (
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            )}
          </div>
          <span className="v-consent-text">
            Concordo com o uso dos meus dados para melhoria da experiência cultural e relatórios de impacto do espaço.
          </span>
        </div>

        {/* Error */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="v-error"
              style={{ marginTop: 12 }}
            >
              ⚠️ {error}
              {showLoginRedirect && (
                <button
                  type="button"
                  onClick={() => navigate('/')}
                  className="v-btn-primary"
                  style={{ marginTop: 10, fontSize: 12, padding: '10px 16px' }}
                >
                  Ir para Check-in
                </button>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Submit */}
        <button
          className="v-btn-primary"
          style={{
            marginTop: 18,
            opacity: isFormComplete && !loading ? 1 : 0.35,
          }}
          onClick={handleSubmit}
          disabled={!isFormComplete || loading}
        >
          {loading ? 'Validando...' : 'Registrar e acessar guia'}
        </button>

        <div style={{ height: 40 }} />
      </div>
    </VisitorLayout>
  );
}
