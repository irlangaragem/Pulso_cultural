import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { localDb } from '../services/localDb';
import { api } from '../services/api';
import { formatCPF, isValidCPF } from '../utils/cpf';

export function VisitorLogin() {
  const [cpf, setCpf] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();

  const handleCPFChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCpf(formatCPF(e.target.value));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValidCPF(cpf)) {
      setError('O CPF informado não parece válido. Verifique os números.');
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
          if (response.data && response.data.success) {
            visitor = localDb.saveVisitor({
              cpf: rawCpf,
              name: response.data.name,
              birthYear: response.data.birthYear,
              gender: response.data.gender,
              origin: response.data.origin,
              email: response.data.email
            });
          }
        } catch (err) {
          console.warn('Busca remota falhou ou não existe', err);
        }
      }

      if (visitor) {
        const checkinData = {
          cpf: visitor.cpf,
          name: visitor.name,
          birthYear: visitor.birthYear,
          gender: visitor.gender,
          origin: visitor.origin,
          channel: 'OUTRO_RETORNO',
          exhibitionId: 'default-exhibition',
          email: visitor.email
        };

        // Track their return checkin at the backend for dashboard analytics
        try {
          await api.post('/checkins', checkinData);
        } catch (e) {
          console.warn('API sync failed, adding to queue', e);
          localDb.addToSyncQueue(checkinData);
        }
        
        setSuccess(true);
        setTimeout(() => navigate('/guide'), 1200);
      } else {
        setError('CPF não encontrado. Por favor, crie um novo cadastro abaixo.');
      }
    } finally {
      if (!success) setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4 flex items-center justify-center overflow-hidden relative">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full bg-white rounded-3xl shadow-xl shadow-slate-200/50 p-8 border border-slate-100 relative overflow-hidden"
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
              className="text-red-500 text-xs font-bold text-center p-3 bg-red-50 rounded-xl"
            >
              ⚠️ {error}
            </motion.div>
          )}

          <motion.button 
            type="submit"
            disabled={loading || success}
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.98 }}
            className={`w-full bg-slate-900 text-white p-5 rounded-3xl font-black uppercase text-sm tracking-widest flex items-center justify-center gap-2 shadow-2xl transition-all ${loading || success ? 'opacity-70 cursor-not-allowed' : 'active:scale-[0.98]'}`}
          >
            {loading ? 'Validando...' : success ? 'Bem-vindo!' : 'Acessar Guia Digital'}
            <ChevronRight size={18} />
          </motion.button>

          <div className="text-center">
            <button 
              type="button"
              onClick={() => navigate('/checkin')}
              className="text-primary font-bold text-sm hover:underline underline-offset-4"
            >
              Criar novo cadastro
            </button>
          </div>
        </form>

        <AnimatePresence>
          {success && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-white/95 backdrop-blur-sm flex flex-col items-center justify-center z-50 p-8 text-center"
            >
              <motion.div 
                initial={{ scale: 0, rotate: -20 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: "spring", stiffness: 200, damping: 15 }}
                className="w-20 h-20 bg-primary text-white rounded-full flex items-center justify-center mb-6 shadow-xl shadow-primary/30"
              >
                <div className="bg-white/20 p-3 rounded-2xl">
                  <Layout size={32} />
                </div>
              </motion.div>
              <h2 className="text-2xl font-sora font-black text-slate-900 uppercase">Acesso Liberado</h2>
              <p className="text-slate-500 mt-2">Identificamos seu perfil. Redirecionando...</p>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
