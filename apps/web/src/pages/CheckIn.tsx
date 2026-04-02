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
  const [step, setStep] = useState(1);
  const navigate = useNavigate();

  const handleCPFChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, '');
    if (value.length > 11) value = value.slice(0, 11);
    
    value = value.replace(/(\d{3})(\d)/, '$1.$2');
    value = value.replace(/(\d{3})(\d)/, '$1.$2');
    value = value.replace(/(\d{3})(\d{1,2})$/, '$1-$2');
    
    setFormData({ ...formData, cpf: value });
  };

  const validateStep1 = () => {
    if (formData.cpf.length < 14) {
      setError('Por favor, insira um CPF válido com 11 dígitos.');
      return false;
    }
    if (!formData.name.trim() || formData.name.trim().split(' ').length < 2) {
      setError('Por favor, insira seu nome completo.');
      return false;
    }
    const currentYear = new Date().getFullYear();
    const bYear = Number(formData.birthYear);
    if (isNaN(bYear) || bYear > currentYear || currentYear - bYear > 120 || bYear < 1000) {
      setError(`Ano de nascimento inválido (entre ${currentYear - 120} e ${currentYear}).`);
      return false;
    }
    setError('');
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (step === 1) {
      if (validateStep1()) setStep(2);
      return;
    }

    const checkinData = {
      ...formData,
      name: formData.name.trim(),
      birthYear: Number(formData.birthYear),
      gender: formData.gender,
      origin: formData.origin,
      channel: 'TOTEM_PRESENCIAL',
      exhibitionId: 'default-exhibition'
    };

    setLoading(true);
    try {
      try {
        localDb.saveVisitor(checkinData);
      } catch (e) {
        console.warn('LocalDB error', e);
      }

      await api.post('/checkins', checkinData);
      setSuccess(true);
      setTimeout(() => navigate('/guide'), 1500);
    } catch (error) {
      console.error('Checkin failed, syncing...', error);
      localDb.addToSyncQueue(checkinData);
      setSuccess(true);
      setTimeout(() => navigate('/guide'), 1500);
    } finally {
      // setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4 flex items-center justify-center relative overflow-hidden">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full bg-white rounded-3xl shadow-xl shadow-slate-200/50 p-8 border border-slate-100 relative overflow-hidden"
      >
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-primary/10 text-primary rounded-2xl flex items-center justify-center mx-auto mb-4">
            <ClipboardCheck className="w-8 h-8" />
          </div>
          <h1 className="text-3xl font-sora font-black text-slate-900 uppercase">PULSO</h1>
          
          <div className="flex items-center justify-center gap-2 mt-4">
             <div className={`h-1.5 rounded-full transition-all duration-500 ${step === 1 ? 'w-12 bg-primary' : 'w-6 bg-green-500'}`} />
             <div className={`h-1.5 rounded-full transition-all duration-500 ${step === 2 ? 'w-12 bg-primary' : 'w-6 bg-slate-100'}`} />
          </div>
          <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mt-2">
             Passo {step} de 2
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <AnimatePresence mode="wait">
            {step === 1 ? (
              <motion.div
                key="step1"
                initial={{ x: -20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: 20, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="space-y-5"
              >
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 font-sora">CPF</label>
                  <input
                    type="text"
                    required
                    placeholder="000.000.000-00"
                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-4 focus:border-primary outline-none transition-all font-medium"
                    value={formData.cpf}
                    onChange={handleCPFChange}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 font-sora">Nome Completo</label>
                  <input
                    type="text"
                    required
                    placeholder="Seu nome"
                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-4 focus:border-primary outline-none transition-all font-medium"
                    value={formData.name}
                    onChange={e => setFormData({...formData, name: e.target.value})}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 font-sora">Nascimento</label>
                    <input
                      type="number"
                      required
                      placeholder="Ex: 1990"
                      className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-4 focus:border-primary outline-none transition-all font-medium"
                      value={formData.birthYear}
                      onChange={e => setFormData({...formData, birthYear: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 font-sora">Gênero</label>
                    <select
                      className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-4 focus:border-primary outline-none transition-all appearance-none font-medium text-sm"
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
              </motion.div>
            ) : (
              <motion.div
                key="step2"
                initial={{ x: 20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: -20, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="space-y-5"
              >
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 font-sora">Como nos conheceu?</label>
                  <select
                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-4 focus:border-primary outline-none transition-all appearance-none font-medium text-sm"
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

                <div className="pt-2">
                  <label className="flex items-center gap-3 cursor-pointer group w-fit">
                    <div className="relative flex items-center justify-center w-5 h-5">
                      <input
                        type="checkbox"
                        className="peer appearance-none w-5 h-5 border-2 border-slate-200 rounded bg-white checked:bg-primary checked:border-primary transition-all"
                        checked={showEmail}
                        onChange={(e) => setShowEmail(e.target.checked)}
                      />
                      <svg className="absolute w-3.5 h-3.5 text-white opacity-0 peer-checked:opacity-100 pointer-events-none transition-opacity" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <span className="text-sm font-semibold text-slate-500">Desejo informar meu e-mail</span>
                  </label>

                  <AnimatePresence>
                    {showEmail && (
                      <motion.div 
                        initial={{ opacity: 0, height: 0, marginTop: 0 }}
                        animate={{ opacity: 1, height: 'auto', marginTop: 12 }}
                        exit={{ opacity: 0, height: 0, marginTop: 0 }}
                        className="overflow-hidden"
                      >
                        <input
                          type="email"
                          required={showEmail}
                          placeholder="seu@email.com"
                          className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-4 focus:border-primary outline-none transition-all font-medium"
                          value={formData.email}
                          onChange={e => setFormData({...formData, email: e.target.value})}
                        />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {error && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="p-4 bg-red-50 border border-red-100 rounded-2xl text-red-600 text-[10px] font-black uppercase tracking-widest text-center"
            >
              ⚠️ {error}
            </motion.div>
          )}

          <div className="flex gap-3 pt-4">
            {step === 2 && (
              <motion.button 
                type="button"
                onClick={() => setStep(1)}
                whileTap={{ scale: 0.95 }}
                className="flex-1 bg-slate-50 text-slate-400 p-5 rounded-3xl font-black uppercase text-sm tracking-widest border-2 border-slate-100"
              >
                Voltar
              </motion.button>
            )}
            <motion.button 
              type="submit"
              disabled={loading || success}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
              className={`flex-[2] bg-slate-900 text-white p-5 rounded-3xl font-black uppercase text-sm tracking-widest flex items-center justify-center gap-2 shadow-2xl transition-all ${loading || success ? 'opacity-70 cursor-not-allowed' : ''}`}
            >
              {loading ? 'Validando...' : success ? 'Bem-vindo!' : step === 1 ? 'Continuar' : 'Liberar Guia Digital'}
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
              className="absolute inset-0 bg-white/95 backdrop-blur-sm flex flex-col items-center justify-center z-50 p-8 text-center rounded-3xl"
            >
              <motion.div 
                initial={{ scale: 0, rotate: -20 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: "spring", stiffness: 200, damping: 15 }}
                className="w-20 h-20 bg-primary text-white rounded-full flex items-center justify-center mb-6 shadow-xl shadow-primary/30"
              >
                <div className="bg-white/20 p-3 rounded-2xl">
                  <ClipboardCheck size={32} />
                </div>
              </motion.div>
              <h2 className="text-2xl font-sora font-black text-slate-900 uppercase">Check-in Realizado</h2>
              <p className="text-slate-500 mt-2 font-medium">Acesso liberado. Redirecionando...</p>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
