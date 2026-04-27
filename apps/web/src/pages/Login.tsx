import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, Lock, ArrowRight, ShieldCheck } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '../services/api';
import { useAuthStore } from '../store/useAuthStore';
import { VisitorLayout } from '../components/VisitorLayout';
import { PulseSymbol } from '../components/PulseSymbol';

export function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [focusedField, setFocusedField] = useState<string | null>(null);
  
  const setAuth = useAuthStore((state) => state.setAuth);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await api.post('/auth/signin', { email, password });
      const { user, token } = response.data;
      
      setAuth(user, token);
      navigate('/dashboard');
    } catch (err: any) {
      const message = err.response?.data?.error;
      setError(message || 'Erro ao realizar login. Verifique suas credenciais.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <VisitorLayout hideLanguage>
      <div className="visitor-screen" style={{ paddingTop: '5vh' }}>
        <div className="visitor-glow" />
        
        {/* Icon Alignment - Identical to Visitor Icon */}
        <div style={{ 
          display: 'flex', 
          justifyContent: 'center', 
          marginBottom: '3vh',
          position: 'relative',
          zIndex: 1
        }}>
          <PulseSymbol size={80} />
        </div>

        {/* Identity Alignment */}
        <div className="text-center mb-10" style={{ position: 'relative', zIndex: 1 }}>
          <h1 className="v-wordmark">GESTÃO</h1>
          <p className="v-wordmark-sub" style={{ color: '#E8554E', fontWeight: 800 }}>PULSO</p>
          <p style={{ 
            fontSize: 13, 
            color: 'rgba(255,255,255,0.4)', 
            marginTop: 12,
            fontFamily: 'DM Sans, sans-serif'
          }}>
            Acesso restrito para administradores
          </p>
        </div>

        {/* Form Aligned with Visitor Component Language */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          style={{ position: 'relative', zIndex: 1 }}
        >
          <form onSubmit={handleSubmit}>
            <div className="mb-6">
              <label 
                className="v-label-text" 
                style={{ 
                  fontSize: 10, 
                  fontWeight: 800, 
                  letterSpacing: 2, 
                  textTransform: 'uppercase',
                  color: '#6B5A60',
                  marginBottom: 12,
                  marginLeft: 4
                }}
              >
                E-mail Corporativo
              </label>
              <div className={`v-input-wrap ${focusedField === 'email' ? 'focused' : ''}`}>
                <Mail className="v-input-icon" size={20} />
                <input
                  type="email"
                  required
                  placeholder="admin@mam.ba.gov.br"
                  className="v-input"
                  style={{ fontSize: 16 }}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onFocus={() => setFocusedField('email')}
                  onBlur={() => setFocusedField(null)}
                />
              </div>
            </div>

            <div className="mb-8">
              <label 
                className="v-label-text" 
                style={{ 
                  fontSize: 10, 
                  fontWeight: 800, 
                  letterSpacing: 2, 
                  textTransform: 'uppercase',
                  color: '#6B5A60',
                  marginBottom: 12,
                  marginLeft: 4
                }}
              >
                Senha de Acesso
              </label>
              <div className={`v-input-wrap ${focusedField === 'password' ? 'focused' : ''}`}>
                <Lock className="v-input-icon" size={20} />
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  className="v-input"
                  style={{ fontSize: 16 }}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onFocus={() => setFocusedField('password')}
                  onBlur={() => setFocusedField(null)}
                />
              </div>
            </div>

            <AnimatePresence>
              {error && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  className="v-error"
                >
                  <ShieldCheck size={18} style={{ marginRight: 8 }} />
                  {error}
                </motion.div>
              )}
            </AnimatePresence>

            <button
              type="submit"
              disabled={loading}
              className="v-btn-primary"
              style={{ padding: '20px', borderRadius: 16 }}
            >
              {loading ? 'Validando...' : (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
                  Entrar no Painel
                  <ArrowRight size={20} />
                </div>
              )}
            </button>
          </form>
        </motion.div>

        {/* Support Section */}
        <div className="mt-10 text-center" style={{ position: 'relative', zIndex: 1, paddingBottom: 40 }}>
           <p className="v-footer-note" style={{ fontSize: 11, color: '#4A3F44' }}>
             Esqueceu sua senha? <span style={{ color: '#E8554E', cursor: 'pointer', fontWeight: 700 }}>Contate o suporte TI.</span>
           </p>
        </div>
      </div>
    </VisitorLayout>
  );
}
