import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { ClipboardCheck, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';

export function CheckIn() {
  const [formData, setFormData] = useState({
    cpf: '',
    name: '',
    birthYear: '',
    gender: 'PREFIRO_NAO_DIZER',
    origin: 'SALVADOR',
    channel: 'OUTRO',
    exhibitionId: 'default-exhibition', // For MVP simplification
    email: ''
  });
  const [showEmail, setShowEmail] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post('/checkins', {
        ...formData,
        birthYear: Number(formData.birthYear)
      });
      alert('Check-in realizado com sucesso!');
      navigate('/');
    } catch (error) {
      alert('Erro ao realizar check-in. Tente novamente.');
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
            <ClipboardCheck className="w-8 h-8" />
          </div>
          <h1 className="text-3xl font-sora font-black text-slate-900 uppercase">Check-in</h1>
          <p className="text-slate-500 text-sm mt-2">Identificação para acesso e guia digital</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">CPF</label>
            <div className="relative">
              <input
                type="text"
                required
                placeholder="000.000.000-00"
                className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-4 focus:border-primary outline-none transition-all"
                value={formData.cpf}
                onChange={e => setFormData({...formData, cpf: e.target.value})}
              />
            </div>

            <label className="mt-4 flex items-center gap-3 cursor-pointer group w-fit">
              <div className="relative flex items-center justify-center w-5 h-5">
                <input
                  type="checkbox"
                  className="peer appearance-none w-5 h-5 border-2 border-slate-200 rounded bg-white checked:bg-primary checked:border-primary transition-all cursor-pointer"
                  checked={showEmail}
                  onChange={(e) => {
                    setShowEmail(e.target.checked);
                    if (!e.target.checked) {
                      setFormData(prev => ({ ...prev, email: '' }));
                    }
                  }}
                />
                <svg
                  className="absolute w-3.5 h-3.5 text-white opacity-0 peer-checked:opacity-100 pointer-events-none transition-opacity"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth="3"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <span className="text-sm font-semibold text-slate-500 group-hover:text-slate-700 transition-colors">
                Desejo informar meu e-mail
              </span>
            </label>

            {showEmail && (
              <motion.div 
                initial={{ opacity: 0, height: 0, marginTop: 0 }}
                animate={{ opacity: 1, height: 'auto', marginTop: 16 }}
                className="overflow-hidden"
              >
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">E-mail</label>
                <input
                  type="email"
                  required={showEmail}
                  placeholder="seu@email.com"
                  className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-4 focus:border-primary outline-none transition-all"
                  value={formData.email}
                  onChange={e => setFormData({...formData, email: e.target.value})}
                />
              </motion.div>
            )}
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Nome Completo</label>
            <input
              type="text"
              required
              placeholder="Seu nome"
              className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-4 focus:border-primary outline-none transition-all"
              value={formData.name}
              onChange={e => setFormData({...formData, name: e.target.value})}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Ano de Nascimento</label>
              <input
                type="number"
                required
                placeholder="Ex: 1990"
                className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-4 focus:border-primary outline-none transition-all"
                value={formData.birthYear}
                onChange={e => setFormData({...formData, birthYear: e.target.value})}
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Gênero</label>
              <select
                className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-4 focus:border-primary outline-none transition-all appearance-none"
                value={formData.gender}
                onChange={e => setFormData({...formData, gender: e.target.value})}
              >
                <option value="FEMININO">Feminino</option>
                <option value="MASCULINO">Masculino</option>
                <option value="NAO_BINARIO">Não-binário</option>
                <option value="PREFIRO_NAO_DIZER">Não dizer</option>
              </select>
            </div>
          </div>

          <div>
             <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Origem</label>
             <select
                className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-4 focus:border-primary outline-none transition-all appearance-none"
                value={formData.origin}
                onChange={e => setFormData({...formData, origin: e.target.value})}
              >
                <option value="SALVADOR">Salvador</option>
                <option value="INTERIOR_BA">Interior da Bahia</option>
                <option value="OUTRO_ESTADO">Outro Estado</option>
                <option value="INTERNACIONAL">Internacional</option>
              </select>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary text-white py-5 rounded-2xl font-black text-lg shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 mt-4"
          >
            {loading ? 'Processando...' : (
              <>
                Finalizar Check-in
                <ArrowRight className="w-5 h-5" />
              </>
            )}
          </button>
        </form>
      </motion.div>
    </div>
  );
}
