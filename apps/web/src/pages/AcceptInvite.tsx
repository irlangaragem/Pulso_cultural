import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Eye, EyeOff, Lock } from 'lucide-react';
import { api } from '../services/api';
import { useAuthStore } from '../store/useAuthStore';

interface InviteInfo {
  email: string;
  name: string;
  museumName?: string;
  expiresAt: string;
}

const COLORS = {
  bg: '#0E0B0D',
  panel: 'rgba(255,255,255,0.03)',
  border: 'rgba(255,255,255,0.08)',
  text: '#F5ECE4',
  muted: '#A8969A',
  faint: '#6B5A60',
  brand: '#E8554E',
  brand2: '#D4267E',
  green: '#48BB78',
  red: '#E8554E',
};

function ValidationLine({ ok, children }: { ok: boolean; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, color: ok ? COLORS.green : COLORS.muted }}>
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        {ok ? (
          <polyline points="20 6 9 17 4 12" />
        ) : (
          <>
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </>
        )}
      </svg>
      <span>{children}</span>
    </div>
  );
}

export function AcceptInvite() {
  const navigate = useNavigate();
  const [search] = useSearchParams();
  const setAuth = useAuthStore(s => s.setAuth);

  const token = search.get('token') || '';

  const [info, setInfo] = useState<InviteInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [tokenError, setTokenError] = useState<string | null>(null);

  const [pwd, setPwd] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    document.title = 'Aceitar convite · Pulso Cultural';
  }, []);

  useEffect(() => {
    if (!token) {
      setTokenError('Link inválido. Solicite um novo convite ao administrador.');
      setLoading(false);
      return;
    }
    api.get('/invites/info', { params: { token } })
      .then(res => setInfo(res.data))
      .catch((err) => {
        setTokenError(err?.response?.data?.error || 'Convite inválido ou expirado. Solicite um novo.');
      })
      .finally(() => setLoading(false));
  }, [token]);

  const checks = useMemo(() => {
    const minLen = pwd.length >= 8;
    const hasLetter = /[a-zA-Z]/.test(pwd);
    const hasNumberOrSymbol = /[\d!@#$%^&*()_+\-=[\]{};:'",.<>?\/\\|`~]/.test(pwd);
    const matches = pwd !== '' && pwd === confirm;
    return { minLen, hasLetterAndNumber: hasLetter && hasNumberOrSymbol, matches };
  }, [pwd, confirm]);

  const allValid = checks.minLen && checks.hasLetterAndNumber && checks.matches;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!allValid) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await api.post('/invites/accept', { token, password: pwd });
      const { user, token: jwtToken } = res.data;
      setAuth(user, jwtToken);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err?.response?.data?.error || err?.message || 'Erro ao aceitar convite');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div style={fullScreen}>
        <p style={{ color: COLORS.muted }}>Validando convite…</p>
      </div>
    );
  }

  if (tokenError) {
    return (
      <div style={fullScreen}>
        <div style={{ ...card, maxWidth: 420, textAlign: 'center' }}>
          <h1 style={{ fontFamily: "'Sora', sans-serif", fontSize: 22, color: COLORS.text, margin: '0 0 12px' }}>
            Convite inválido
          </h1>
          <p style={{ color: COLORS.muted, fontSize: 13, lineHeight: 1.5, margin: '0 0 22px' }}>
            {tokenError}
          </p>
          <button onClick={() => navigate('/login')} style={btnPrimary}>
            Ir para o login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={fullScreen}>
      <div style={{ width: '100%', maxWidth: 460 }}>
        {/* Logo */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 28 }}>
          <span style={{
            display: 'inline-block', width: 44, height: 44, borderRadius: '50%',
            background: `radial-gradient(circle at 30% 30%, #F28C38, ${COLORS.brand})`,
            marginBottom: 12,
          }} />
          <p style={{ fontFamily: "'Sora', sans-serif", fontWeight: 700, fontSize: 18, color: COLORS.text, margin: 0, letterSpacing: 1 }}>
            PULSO
          </p>
          <p style={{ fontFamily: "'Sora', sans-serif", fontWeight: 300, fontSize: 9, color: COLORS.muted, margin: 0, letterSpacing: 4 }}>
            CULTURAL
          </p>
        </div>

        <h1 style={{
          fontFamily: "'Sora', sans-serif",
          fontSize: 24, fontWeight: 700, textAlign: 'center',
          color: COLORS.text, margin: '0 0 8px', letterSpacing: 1,
        }}>
          ACEITAR CONVITE
        </h1>
        <p style={{
          textAlign: 'center', color: COLORS.muted, fontSize: 13, margin: '0 0 24px',
        }}>
          Defina uma senha para entrar no painel{info?.museumName ? ` do ${info.museumName}` : ''}.
        </p>

        <form onSubmit={handleSubmit}>
          <div style={card}>
            {info && (
              <div style={{
                background: 'rgba(255,255,255,0.03)',
                borderRadius: 8,
                padding: '10px 12px',
                marginBottom: 16,
                fontSize: 12,
                color: COLORS.muted,
              }}>
                <strong style={{ color: COLORS.text }}>{info.name}</strong> · {info.email}
              </div>
            )}

            <label style={label}>Nova senha</label>
            <div style={{ position: 'relative', marginBottom: 16 }}>
              <Lock size={16} style={{
                position: 'absolute', left: 14, top: 14, color: COLORS.faint,
              }} />
              <input
                type={showPwd ? 'text' : 'password'}
                value={pwd}
                onChange={e => setPwd(e.target.value)}
                style={{ ...input, paddingLeft: 40, paddingRight: 44 }}
                autoComplete="new-password"
                autoFocus
              />
              <button
                type="button"
                onClick={() => setShowPwd(v => !v)}
                style={{
                  position: 'absolute', right: 8, top: 8,
                  background: 'transparent', border: 'none', color: COLORS.faint,
                  width: 32, height: 32, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
                aria-label="Mostrar senha"
              >
                {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>

            <label style={label}>Confirmar senha</label>
            <div style={{ position: 'relative', marginBottom: 16 }}>
              <Lock size={16} style={{
                position: 'absolute', left: 14, top: 14, color: COLORS.faint,
              }} />
              <input
                type={showPwd ? 'text' : 'password'}
                value={confirm}
                onChange={e => setConfirm(e.target.value)}
                style={{
                  ...input,
                  paddingLeft: 40,
                  borderColor: confirm.length > 0
                    ? (checks.matches ? COLORS.green : COLORS.red)
                    : COLORS.border,
                }}
                autoComplete="new-password"
              />
            </div>

            <div style={{
              padding: 14,
              background: 'rgba(255,255,255,0.02)',
              borderRadius: 10,
              display: 'flex', flexDirection: 'column', gap: 8,
              marginBottom: 18,
            }}>
              <ValidationLine ok={checks.minLen}>Mínimo de 8 caracteres</ValidationLine>
              <ValidationLine ok={checks.hasLetterAndNumber}>Pelo menos uma letra e um número (ou símbolo)</ValidationLine>
              <ValidationLine ok={checks.matches}>As duas senhas conferem</ValidationLine>
            </div>

            {error && (
              <div style={{
                padding: '10px 12px',
                background: 'rgba(232,85,78,0.1)',
                border: `1px solid ${COLORS.red}`,
                borderRadius: 8,
                color: '#F2A29F',
                fontSize: 13,
                marginBottom: 14,
              }}>
                ⚠️ {error}
              </div>
            )}

            <button
              type="submit"
              disabled={!allValid || submitting}
              style={{
                ...btnPrimary,
                width: '100%',
                opacity: (!allValid || submitting) ? 0.5 : 1,
                cursor: (!allValid || submitting) ? 'not-allowed' : 'pointer',
                background: allValid
                  ? `linear-gradient(135deg, ${COLORS.green}, #2F8553)`
                  : 'rgba(255,255,255,0.06)',
                color: allValid ? '#fff' : COLORS.muted,
              }}
            >
              {submitting ? 'Entrando…' : '🛡  ACEITAR CONVITE E ENTRAR'}
            </button>
          </div>
        </form>

        <p style={{ textAlign: 'center', marginTop: 22, color: COLORS.muted, fontSize: 13 }}>
          Já tem uma conta?{' '}
          <a
            onClick={(e) => { e.preventDefault(); navigate('/login'); }}
            style={{ color: COLORS.green, fontWeight: 700, cursor: 'pointer', textDecoration: 'none' }}
            href="#"
          >
            Entrar
          </a>
        </p>
      </div>
    </div>
  );
}

const fullScreen: React.CSSProperties = {
  width: '100vw',
  minHeight: '100vh',
  background: COLORS.bg,
  color: COLORS.text,
  fontFamily: "'DM Sans', sans-serif",
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: 24,
  boxSizing: 'border-box',
};

const card: React.CSSProperties = {
  background: COLORS.panel,
  border: `1px solid ${COLORS.border}`,
  borderRadius: 14,
  padding: 24,
};

const label: React.CSSProperties = {
  display: 'block',
  fontSize: 13,
  fontWeight: 700,
  color: COLORS.text,
  marginBottom: 8,
};

const input: React.CSSProperties = {
  width: '100%',
  padding: '14px 14px',
  borderRadius: 10,
  border: `1px solid ${COLORS.border}`,
  background: 'rgba(255,255,255,0.02)',
  color: COLORS.text,
  fontFamily: "'Space Mono', monospace",
  fontSize: 14,
  outline: 'none',
  boxSizing: 'border-box',
};

const btnPrimary: React.CSSProperties = {
  background: `linear-gradient(135deg, ${COLORS.brand}, ${COLORS.brand2})`,
  border: 'none',
  borderRadius: 12,
  padding: '14px 22px',
  color: '#fff',
  fontFamily: "'Sora', sans-serif",
  fontSize: 13,
  fontWeight: 700,
  letterSpacing: 1,
  cursor: 'pointer',
};
