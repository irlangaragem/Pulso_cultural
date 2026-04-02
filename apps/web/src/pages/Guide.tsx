import { useState, useEffect } from 'react';
import { Headphones, Play, Pause, ChevronRight, Info, BarChart3 } from 'lucide-react';
import { motion } from 'framer-motion';
import { Howl } from 'howler';
import { useNavigate } from 'react-router-dom';
// @ts-ignore
import { api } from '../services/api';

export function Guide() {
  const navigate = useNavigate();
  const [works, setWorks] = useState<any[]>([]);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [sound, setSound] = useState<Howl | null>(null);
  const [progress, setProgress] = useState(0);
  const [isBuffering, setIsBuffering] = useState(false);

  useEffect(() => {
    api.get('/exhibitions/default-exhibition').then(res => {
      setWorks(res.data.works || []);
    });
  }, []);

  useEffect(() => {
    let interval: any;
    if (sound && playingId) {
      interval = setInterval(() => {
        const current = sound.seek() as number;
        const duration = sound.duration();
        setProgress((current / duration) * 100);
      }, 500);
    }
    return () => clearInterval(interval);
  }, [sound, playingId]);

  // cognitive maintenance: suicide interface upon 12m inactivity
  useEffect(() => {
    let timeoutId: any;
    const resetTimer = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        if (sound) sound.stop();
        navigate('/');
      }, 12 * 60 * 1000); // 12 minutes
    };

    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'touchmove'];
    events.forEach(e => window.addEventListener(e, resetTimer));
    resetTimer();

    return () => {
      clearTimeout(timeoutId);
      events.forEach(e => window.removeEventListener(e, resetTimer));
    };
  }, [navigate, sound]);

  // cleanup sound on unmount
  useEffect(() => {
    return () => {
      if (sound) sound.stop();
    };
  }, [sound]);

  const togglePlay = (work: any) => {
    if (playingId === work.id) {
      sound?.pause();
      setPlayingId(null);
    } else {
      sound?.stop();
      setIsBuffering(true);
      const url = work.audioUrl || 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3';
      const newSound = new Howl({
        src: [url],
        html5: true,
        onload: () => setIsBuffering(false),
        onplay: () => setIsBuffering(false),
        onend: () => {
          setPlayingId(null);
          setProgress(0);
        },
        onloaderror: () => {
          setIsBuffering(false);
          alert('Erro ao carregar áudio. Verifique sua conexão.');
        }
      });
      newSound.play();
      setSound(newSound);
      setPlayingId(work.id);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      <header className="bg-white border-b sticky top-0 z-50 p-6 flex items-center justify-between">
         <div className="flex items-center gap-3">
           <div className="bg-primary p-2 rounded-xl">
             <Headphones className="text-white w-5 h-5" />
           </div>
           <div>
             <h1 className="text-lg font-sora font-black uppercase text-slate-900 leading-none">Guia Digital</h1>
             <p className="text-[10px] font-bold text-primary uppercase tracking-widest mt-1">Exposição: Horizonte Local</p>
           </div>
         </div>
      </header>

      <main className="p-6 max-w-2xl mx-auto space-y-4">
        <div className="bg-primary/5 p-6 rounded-3xl border border-primary/10 mb-8">
           <div className="flex gap-4 items-start">
             <Info className="text-primary w-6 h-6 flex-shrink-0" />
             <p className="text-sm text-slate-600 leading-relaxed font-medium">
                Toque nos itens abaixo para ouvir a descrição de cada obra. 
                Use fones de ouvido para uma experiência mais imersiva.
             </p>
           </div>
        </div>

        {works.map((work, index) => (
          <motion.div 
             key={work.id}
             whileTap={{ scale: 0.98 }}
             className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex items-center justify-between group"
          >
           <div className="flex-1">
             <div className="flex items-center gap-6">
                <div className="text-2xl font-sora font-black text-slate-200 group-hover:text-primary/20 transition-colors">0{index + 1}</div>
                <div className="flex-1">
                  <h3 className="font-sora font-bold text-slate-800">{work.title}</h3>
                  <p className="text-xs text-slate-500 font-medium">{work.artist}</p>
                </div>
                
                <button 
                   onClick={() => togglePlay(work)}
                   className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all ${playingId === work.id ? 'bg-primary text-white shadow-lg shadow-primary/30' : 'bg-slate-50 text-slate-400 hover:bg-slate-100'}`}
                >
                  {isBuffering && playingId === work.id ? (
                    <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                  ) : (
                    playingId === work.id ? <Pause fill="white" /> : <Play fill="currentColor" className="ml-1" />
                  )}
                </button>
             </div>

             {playingId === work.id && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="mt-4 pl-12"
                >
                  <div className="h-1 bg-slate-100 rounded-full overflow-hidden">
                    <motion.div 
                      className="h-full bg-primary"
                      animate={{ width: `${progress}%` }}
                      transition={{ type: 'spring', bounce: 0, duration: 0.5 }}
                    />
                  </div>
                </motion.div>
             )}
           </div>
          </motion.div>
        ))}

        {works.length === 0 && (
          <div className="text-center py-12 text-slate-400 italic">Nenhuma obra cadastrada para esta exposição.</div>
        )}

        <div className="pt-12 text-center opacity-30">
           <BarChart3 className="mx-auto w-12 h-12 mb-4" />
           <p className="text-[8px] font-black uppercase tracking-[0.3em]">MAM Salvador x Pulso Cultural</p>
        </div>
      </main>

      <footer className="fixed bottom-0 left-0 w-full p-6 pointer-events-none">
         <div className="max-w-2xl mx-auto pointer-events-auto">
            <button 
              onClick={() => navigate('/feedback')}
              className="w-full bg-slate-900 text-white p-5 rounded-2xl font-black uppercase text-sm tracking-widest flex items-center justify-center gap-2 shadow-2xl active:scale-[0.98] transition-transform"
            >
               Concluir Experiência
               <ChevronRight size={18} />
            </button>
         </div>
      </footer>
    </div>
  );
}
