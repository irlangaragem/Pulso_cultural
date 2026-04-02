import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Layout, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';
import { localDb } from '../services/localDb';

export function VisitorLogin() {
  const [cpf, setCpf] = useState('');
  const [origin, setOrigin] = useState('INDICAÇÃO');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleCPFChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, '');
    if (value.length > 11) value = value.slice(0, 11);
    
    value = value.replace(/(\d{3})(\d)/, '$1.$2');
    value = value.replace(/(\d{3})(\d)/, '$1.$2');
    value = value.replace(/(\d{3})(\d{1,2})$/, '$1-$2');
    
    setCpf(value);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (cpf.length < 14) {
      setError('CPF incompleto ou inválido.');
      return;
    }

    const visitor = localDb.getVisitorByCPF(cpf);
    if (visitor) {
      // update origin and keep going
      localDb.saveVisitor({
        ...visitor,
        origin
      });
      navigate('/guide');
    } else {
      setError('Cadastro não encontrado.');
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

          <div>
             <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Origem</label>
              <select
                className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-4 focus:border-primary outline-none transition-all appearance-none text-sm"
                value={origin}
                onChange={e => setOrigin(e.target.value)}
              >
                <option value="INDICAÇÃO">Indicação de alguém</option>
                <option value="ESCOLA">Escola ou excursão</option>
                <option value="REDES_SOCIAIS">Redes sociais / internet</option>
                <option value="PASSEI_EM_FRENTE">Passei em frente</option>
                <option value="EVENTO">Evento ou atividade</option>
                <option value="TURISMO">Turismo / viagem</option>
                <option value="DIVULGACAO">Divulgação (TV, cartaz, mídia)</option>
                <option value="OUTRO">Outro</option>
              </select>
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
            className="w-full bg-primary text-white py-5 rounded-2xl font-black text-lg shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2"
          >
            Acessar
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
