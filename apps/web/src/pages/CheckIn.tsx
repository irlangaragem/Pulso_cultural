import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { localDb } from '../services/localDb';
import { ClipboardCheck, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export function CheckIn() {
  const [formData, setFormData] = useState({
    cpf: '',
    name: '',
    birthYear: '',
    gender: 'PREFIRO_NAO_DIZER',
    origin: 'INDICAÇÃO',
    channel: 'OUTRO',
    exhibitionId: 'default-exhibition', // For MVP simplification
    email: ''
  });
  const [showEmail, setShowEmail] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();

  const handleCPFChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, '');
    if (value.length > 11) value = value.slice(0, 11);
    
    value = value.replace(/(\d{3})(\d)/, '$1.$2');
    value = value.replace(/(\d{3})(\d)/, '$1.$2');
    value = value.replace(/(\d{3})(\d{1,2})$/, '$1-$2');
    
    setFormData({ ...formData, cpf: value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const currentYear = new Date().getFullYear();
    const bYear = Number(formData.birthYear);
    if (isNaN(bYear) || bYear > currentYear || currentYear - bYear > 120 || bYear < 1000) {
      alert(`Ano de nascimento inválido. Por favor, insira um ano entre ${currentYear - 120} e ${currentYear}.`);
      return;
    }

    if (formData.cpf.length < 14) {
      setError('Por favor, insira um CPF válido com 11 dígitos.');
      return;
    }

    if (!formData.name.trim() || formData.name.trim().split(' ').length < 2) {
      setError('Por favor, insira seu nome completo.');
      return;
    }

    const checkinData = {
      ...formData,
      name: formData.name.trim(),
      birthYear: bYear,
      gender: formData.gender,
      origin: formData.origin,
      channel: 'TOTEM_PRESENCIAL',
      exhibitionId: 'default-exhibition'
    };

    setLoading(true);
    try {
      try {
        // Save locally first
        localDb.saveVisitor(checkinData);
      } catch (e) {
        console.warn('Falha ao salvar no banco local (possível limite de cota).', e);
      }

      await api.post('/checkins', checkinData);
      navigate('/guide');
    } catch (error) {
      console.error('Checkin failed, saving for sync:', error);
      localDb.addToSyncQueue(checkinData);
      setSuccess(true);
      setTimeout(() => navigate('/guide'), 1500);
    } finally {
      // Keep loading false, success might be true
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
          <h1 className="text-3xl font-sora font-black text-slate-900 uppercase">PULSO</h1>
          <div className="flex items-center justify-center gap-2 mt-2">
            <div className="px-2 py-1 bg-primary/10 rounded-md">
              <span className="text-[10px] font-black text-primary uppercase">Cadastro Único</span>
            </div>
            <p className="text-slate-400 text-xs font-medium">Finalize para liberar o Guia</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <div className={showEmail ? 'hidden' : 'block'}>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">CPF</label>
              <div className="relative">
                <input
                  type="text"
                  required={!showEmail}
                  placeholder="000.000.000-00"
                  className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-4 focus:border-primary outline-none transition-all"
                  value={formData.cpf}
                  onChange={handleCPFChange}
                />
              </div>
            </div>

            <label className={`${showEmail ? '' : 'mt-4'} flex items-center gap-3 cursor-pointer group w-fit`}>
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
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="p-4 bg-red-50 border border-red-100 rounded-2xl text-red-600 text-xs font-bold"
            >
              ⚠️ {error}
            </motion.div>
          )}

          <div className="pt-4">
            <motion.button 
              type="submit"
              disabled={loading || success}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
              className={`w-full bg-slate-900 text-white p-5 rounded-3xl font-black uppercase text-sm tracking-widest flex items-center justify-center gap-2 shadow-2xl transition-all ${loading || success ? 'opacity-70 cursor-not-allowed' : 'active:scale-[0.98]'}`}
            >
              {loading ? 'Processando...' : success ? 'Sucesso!' : 'Confirmar Check-in'}
              <ChevronRight size={18} />
            </motion.button>
          </div>
        </form>

        <AnimatePresence>
          {success && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-white/90 backdrop-blur-sm flex flex-col items-center justify-center rounded-3xl z-50 p-8 text-center"
            >
              <motion.div 
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 200, damping: 15 }}
                className="w-20 h-20 bg-green-500 text-white rounded-full flex items-center justify-center mb-6 shadow-xl shadow-green-200"
              >
                <ClipboardCheck size={40} />
              </motion.div>
              <h2 className="text-2xl font-sora font-black text-slate-900 uppercase">Check-in Realizado!</h2>
              <p className="text-slate-500 mt-2">Bem-vindo ao Pulso Cultural. Redirecionando para o guia...</p>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
