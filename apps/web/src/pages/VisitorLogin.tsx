import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Layout, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';
import { localDb } from '../services/localDb';
import { api } from '../services/api';
import { formatCPF, isValidCPF } from '../utils/cpf';

export function VisitorLogin() {
  const [cpf, setCpf] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleCPFChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCpf(formatCPF(e.target.value));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValidCPF(cpf)) {
      setError('CPF inválido.');
      return;
    }

    // Local check
    let visitor = localDb.getVisitorByCPF(cpf);
    
    setLoading(true);
    setError('');

    try {
      if (!visitor) {
        // Fallback to backend checks
        try {
          const rawCpf = cpf.replace(/\D/g, '');
          const response = await api.get(`/checkins/verify/${rawCpf}`);
          // Backend found the user! Let's persist them locally so they are here next time
          if (response.data) {
            visitor = localDb.saveVisitor({
              cpf,
              name: response.data.name,
              birthYear: response.data.birthYear,
              gender: response.data.gender,
              origin: response.data.origin,
              email: response.data.email
            });
          }
        } catch (err) {
          // Keep visitor undefined
        }
      }

      if (visitor) {
        // Track their return checkin at the backend for dashboard analytics
        await api.post('/checkins', {
          cpf: visitor.cpf,
          name: visitor.name,
          birthYear: visitor.birthYear,
          gender: visitor.gender,
          origin: visitor.origin, // used the predefined origin
          channel: 'OUTRO_RETORNO',
          exhibitionId: 'default-exhibition',
          email: visitor.email
        }).catch(e => {
          console.warn('Backend unavailable for metrics, but access granted.', e);
        });
        
        navigate('/guide');
      } else {
        setError('Cadastro não encontrado, por favor faça seu Check-in.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4 flex items-center justify-center">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full bg-white rounded-3xl shadow-xl shadow-slate-200/50 p-8 border border-slate-100"
      >
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-primary/10 text-primary rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Layout className="w-8 h-8" />
          </div>
          <h1 className="text-3xl font-sora font-black text-slate-900 uppercase tracking-tighter">PULSO</h1>
          <p className="text-slate-500 text-sm mt-2">Acesso para visitantes</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Seu CPF</label>
            <input
              type="text"
              required
              placeholder="000.000.000-00"
              className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-4 focus:border-primary outline-none transition-all text-sm"
              value={cpf}
              onChange={handleCPFChange}
            />
          </div>


          {error && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-red-500 text-xs font-bold text-center"
            >
              {error}
            </motion.div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary text-white py-5 rounded-2xl font-black text-lg shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2"
          >
            {loading ? 'Acessando...' : 'Acessar'}
            <ArrowRight className="w-5 h-5" />
          </button>
        </form>

        <div className="mt-8 text-center border-t border-slate-100 pt-6">
           <Link to="/checkin" className="text-primary text-sm font-bold hover:underline">
             Não possuo cadastro
           </Link>
        </div>
      </motion.div>
    </div>
  );
}
