import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Star, MessageSquare, Send, CheckCircle2, ChevronLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export function Feedback() {
  const navigate = useNavigate();
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (rating === 0) return;

    setIsSubmitting(true);
    try {
      // Simulate API call for premium feel
      await new Promise(resolve => setTimeout(resolve, 1500));
      setIsSubmitted(true);
    } catch (error) {
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center p-8 text-center">
        <motion.div 
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="w-24 h-24 bg-green-100 text-green-500 rounded-full flex items-center justify-center mb-8"
        >
          <CheckCircle2 size={48} />
        </motion.div>
        <h1 className="text-3xl font-sora font-black uppercase tracking-tighter text-slate-900 mb-4">Obrigado!</h1>
        <p className="text-slate-500 font-medium mb-12 max-w-xs mx-auto">
          Sua avaliação ajuda o MAM Salvador a criar experiências cada vez melhores.
        </p>
        <motion.button 
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => navigate('/')}
          className="bg-slate-900 text-white px-12 py-5 rounded-2xl font-black uppercase text-sm tracking-widest shadow-xl transition-all"
        >
          Voltar ao Início
        </motion.button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans p-6">
      <header className="max-w-2xl mx-auto mb-12 flex items-center gap-4">
         <button onClick={() => navigate('/guide')} className="p-3 bg-white rounded-xl shadow-sm border border-slate-100 hover:bg-slate-50 transition-colors">
           <ChevronLeft size={20} className="text-slate-900" />
         </button>
         <div>
           <h1 className="text-xl font-sora font-black uppercase tracking-tighter text-slate-900 leading-none">Avaliação</h1>
           <p className="text-[10px] font-bold text-primary uppercase tracking-widest mt-1">Sua opinião é fundamental</p>
         </div>
      </header>

      <main className="max-w-2xl mx-auto">
        <div className="bg-white p-10 rounded-[3rem] border border-slate-100 shadow-xl shadow-slate-200/50">
          <form onSubmit={handleSubmit} className="space-y-12">
            <section className="text-center">
              <h2 className="text-lg font-bold text-slate-800 mb-6 uppercase tracking-tight">Como foi sua experiência?</h2>
              <div className="flex justify-center gap-3">
                {[1, 2, 3, 4, 5].map((star) => (
                  <motion.button
                    key={star}
                    type="button"
                    whileHover={{ scale: 1.2, rotate: 10 }}
                    whileTap={{ scale: 0.8 }}
                    onMouseEnter={() => setHoverRating(star)}
                    onMouseLeave={() => setHoverRating(0)}
                    onClick={() => setRating(star)}
                    className="p-1 transition-transform"
                  >
                    <Star 
                      size={40} 
                      className={`transition-colors ${
                        star <= (hoverRating || rating) ? 'text-yellow-400 fill-yellow-400' : 'text-slate-200'
                      }`} 
                    />
                  </motion.button>
                ))}
              </div>
            </section>

            <section className="space-y-4">
              <div className="flex items-center gap-2 mb-2">
                 <MessageSquare size={16} className="text-primary" />
                 <label className="text-xs font-black uppercase tracking-widest text-slate-500">Deixe um comentário (opcional)</label>
              </div>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="O que você mais gostou na exposição?"
                className="w-full h-32 bg-slate-50 border border-slate-100 rounded-2xl p-6 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all resize-none"
              />
            </section>

            <motion.button
              type="submit"
              disabled={rating === 0 || isSubmitting}
              whileHover={rating > 0 ? { scale: 1.01 } : {}}
              whileTap={rating > 0 ? { scale: 0.98 } : {}}
              className={`w-full p-6 rounded-2xl font-black uppercase text-sm tracking-widest flex items-center justify-center gap-3 transition-all ${
                rating === 0 
                  ? 'bg-slate-100 text-slate-300 cursor-not-allowed' 
                  : 'bg-primary text-white shadow-xl shadow-primary/30'
              }`}
            >
              {isSubmitting ? (
                <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  Concluir e Enviar Feedback
                  <Send size={18} />
                </>
              )}
            </motion.button>
          </form>
        </div>

        <p className="text-center mt-12 text-[10px] font-black uppercase tracking-[0.3em] text-slate-300">
          MAM Salvador x Pulso Cultural
        </p>
      </main>
    </div>
  );
}
