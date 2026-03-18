import React, { useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { api } from '../services/api';
import { BarChart3, Users, Activity, TrendingUp, Clock, Layout } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from '../store/useAuthStore';
import { useNavigate } from 'react-router-dom';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts';

const socket = io(import.meta.env.VITE_API_URL || 'http://localhost:3333');

export function Dashboard() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [time, setTime] = useState(new Date());
  const [isBackendConnected, setIsBackendConnected] = useState(false);

  useEffect(() => {
    const checkHealth = async () => {
      try {
        await api.get('/health');
        setIsBackendConnected(true);
      } catch {
        setIsBackendConnected(false);
      }
    };
    checkHealth();
    const interval = setInterval(checkHealth, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
        setIsFullscreen(false);
      }
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const exportToPDF = () => {
    const data = JSON.stringify({ stats, trends, timestamp: new Date() }, null, 2);
    const blob = new Blob([data], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `relatorio-mam-${new Date().toLocaleDateString()}.pdf`;
    link.click();
    alert('Relatório gerado com sucesso! (Simulado)');
  };

  const [stats, setStats] = useState({
    totalCheckins: 0,
    currentOccupancy: 0,
    entries: 0,
    exits: 0
  });

  const [trends, setTrends] = useState<any[]>([]);
  const [recentEvents, setRecentEvents] = useState<any[]>([]);

  const fetchTrendData = () => {
    api.get('/analytics/trends/default-exhibition').then(res => {
      setTrends(res.data);
    });
  };

  useEffect(() => {
    // Initial fetch
    api.get('/checkins/stats/default-exhibition').then(res => {
      setStats(res.data);
    });
    fetchTrendData();

    // Listen for updates
    socket.on('occupancy_update', (data) => {
      setRecentEvents(prev => [data, ...prev].slice(0, 10));
      
      // Re-fetch stats and trends on update
      api.get('/checkins/stats/default-exhibition').then(res => {
        setStats(res.data);
      });
      fetchTrendData();
    });

    return () => {
      socket.off('occupancy_update');
    };
  }, []);

  return (
    <div className={`min-h-screen bg-slate-950 text-white p-8 font-sans transition-all ${isFullscreen ? 'p-12' : 'p-8'}`}>
      <header className="max-w-[1800px] mx-auto flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-16">
        <div>
          <div className="flex items-center gap-4 mb-2">
             <div className="bg-primary p-2 rounded-xl shadow-lg shadow-primary/20">
               <BarChart3 className="text-white w-6 h-6" />
             </div>
             <h1 className="text-4xl font-sora font-black tracking-tighter text-white uppercase italic">
                Painel Gestor <span className="text-slate-500 not-italic font-light">| MAM</span>
             </h1>
          </div>
          <p className="text-slate-500 font-medium tracking-wide">Salvador, BA — Monitoramento Multimodal em Tempo Real</p>
        </div>

          <div className="bg-slate-900 rounded-full px-4 py-2 flex items-center gap-2 border border-slate-800">
            <div className={`w-2 h-2 rounded-full ${isBackendConnected ? 'bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)]' : 'bg-red-500 animate-pulse'}`} />
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
              {isBackendConnected ? 'Backend: Online' : 'Backend: Offline'}
            </span>
          </div>

          <div className="flex items-center gap-8 bg-slate-900/50 p-4 rounded-[2rem] border border-slate-800/50 backdrop-blur-md">
          <div className="text-center px-4 border-r border-slate-800">
             <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 mb-1">Hora Local</p>
             <p className="text-xl font-mono font-bold text-primary">{time.toLocaleTimeString()}</p>
          </div>

          <div className="flex items-center gap-6 px-4">
            <div className="text-right hidden sm:block">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">Responsável</p>
              <p className="text-sm font-bold text-white">{user?.name || 'Administrador'}</p>
            </div>
            
            <button 
              onClick={toggleFullscreen}
              className={`p-3 rounded-2xl transition-all flex items-center gap-2 font-bold text-xs uppercase tracking-widest ${isFullscreen ? 'bg-primary text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}
            >
              <TrendingUp className="w-4 h-4" />
              {isFullscreen ? 'Sair do Modo Monitor' : 'Modo Monitor'}
            </button>

            <button 
              onClick={handleLogout}
              className="p-3 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white rounded-2xl transition-all"
              title="Encerrar Sessão"
            >
              <Activity className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-[1800px] mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-16">
        <StatCard title="Ocupação Atual" value={stats.currentOccupancy} icon={<Activity className="text-primary" />} trend="+4/min" description="Visitantes no local agora" />
        <StatCard title="Check-ins Totais" value={stats.totalCheckins} icon={<Users className="text-primary" />} trend="+12%" description="Registros realizados via QR" />
        <StatCard title="Entradas Detectadas" value={stats.entries} icon={<TrendingUp className="text-green-500" />} description="Fluxo total via Computer Vision" />
        <StatCard title="Saídas Detectadas" value={stats.exits} icon={<Clock className="text-slate-400" />} description="Fluxo de saída monitorado" />
      </main>

      <section className="max-w-[1800px] mx-auto grid xl:grid-cols-3 gap-10">
        <div className="xl:col-span-2 bg-slate-900/30 rounded-[3rem] p-10 border border-slate-800/50 backdrop-blur-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none">
             <BarChart3 size={200} />
          </div>
          
          <div className="flex justify-between items-center mb-10">
            <h2 className="text-2xl font-sora font-black text-white uppercase tracking-tighter flex items-center gap-4">
               <div className="w-2 h-8 bg-primary rounded-full" />
               Live Activity Feed
            </h2>
            <div className="flex items-center gap-2">
               <div className="w-3 h-3 bg-green-500 rounded-full animate-ping" />
               <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Fluxo em tempo real</span>
            </div>
          </div>

          <div className="space-y-4 max-h-[500px] overflow-y-auto pr-4 custom-scrollbar">
            <AnimatePresence initial={false}>
              {recentEvents.map((event, i) => (
                <motion.div 
                   key={event.timestamp + i}
                   initial={{ opacity: 0, y: 20 }}
                   animate={{ opacity: 1, y: 0 }}
                   className="bg-slate-900/80 p-5 rounded-[2rem] flex justify-between items-center border border-slate-800 hover:border-primary/30 transition-all hover:translate-x-2"
                >
                  <div className="flex items-center gap-5">
                    <div className={`p-4 rounded-2xl ${event.type === 'checkin' ? 'bg-primary/20 text-primary' : 'bg-green-500/20 text-green-500'}`}>
                      {event.type === 'checkin' ? <Users size={22} /> : <Activity size={22} />}
                    </div>
                    <div>
                      <p className="text-base font-black text-white uppercase tracking-tight">
                        {event.type === 'checkin' ? 'Check-in Visitante' : `Fluxo: ${event.countType}`}
                      </p>
                      <p className="text-xs text-slate-500 font-medium">Evento processado às {new Date(event.timestamp).toLocaleTimeString()}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] font-black text-slate-600 uppercase tracking-[0.2em] block mb-1">Status</span>
                    <span className="bg-slate-800 text-slate-400 px-3 py-1 rounded-full text-[10px] font-bold uppercase">Validado</span>
                  </div>
                </motion.div>
              ))}
              {recentEvents.length === 0 && (
                <div className="text-center py-24">
                   <div className="w-20 h-20 bg-slate-900 rounded-full flex items-center justify-center mx-auto mb-6 border border-slate-800">
                      <Activity className="text-slate-700 w-10 h-10 animate-pulse" />
                   </div>
                   <p className="text-slate-600 font-medium italic">Aguardando eventos dos módulos de IA e Totens...</p>
                </div>
              )}
            </AnimatePresence>
          </div>
        </div>

        <div className="space-y-8">
          <div className="bg-slate-900/40 p-10 rounded-[3rem] border border-slate-800/50 backdrop-blur-sm h-full flex flex-col">
            <div className="flex justify-between items-start mb-10">
              <div>
                <h2 className="text-2xl font-sora font-black text-white uppercase tracking-tighter mb-2">Fluxo de Hoje</h2>
                <p className="text-slate-500 text-xs font-medium">Análise das últimas 12 horas</p>
              </div>
              <div className="p-3 bg-primary/10 rounded-2xl">
                 <TrendingUp className="text-primary w-5 h-5" />
              </div>
            </div>

            <div className="flex-1 min-h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trends}>
                  <defs>
                    <linearGradient id="colorEntries" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                  <XAxis 
                    dataKey="hour" 
                    stroke="#475569" 
                    fontSize={10} 
                    tickLine={false} 
                    axisLine={false} 
                  />
                  <YAxis 
                    stroke="#475569" 
                    fontSize={10} 
                    tickLine={false} 
                    axisLine={false} 
                  />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '1rem' }}
                    itemStyle={{ color: '#fff', fontSize: '10px', fontWeight: 'bold' }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="entries" 
                    stroke="#3b82f6" 
                    strokeWidth={4}
                    fillOpacity={1} 
                    fill="url(#colorEntries)" 
                  />
                  <Area 
                    type="monotone" 
                    dataKey="checkins" 
                    stroke="#10b981" 
                    strokeWidth={2}
                    fill="transparent" 
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            <div className="mt-8 pt-8 border-t border-slate-800/50 grid grid-cols-2 gap-4">
               <button className="flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-300 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all">
                  <Layout size={14} />
                  Sumário Geral
               </button>
               <button 
                  onClick={exportToPDF}
                  className="flex items-center justify-center gap-2 bg-primary text-white py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg shadow-primary/20"
               >
                  <BarChart3 size={14} />
                  Exportar PDF
               </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function StatCard({ title, value, icon, trend, description }: any) {
  return (
    <div className="bg-slate-900/50 p-8 rounded-[2.5rem] border border-slate-800/50 hover:border-primary/50 transition-all hover:bg-slate-900 group">
      <div className="flex justify-between items-start mb-8">
        <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 group-hover:scale-110 transition-transform">
          {icon}
        </div>
        {trend && (
          <div className="flex flex-col items-end">
            <span className="text-[10px] font-black py-1 px-3 bg-primary/10 rounded-full text-primary border border-primary/10">{trend}</span>
          </div>
        )}
      </div>
      <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.3em] mb-2">{title}</p>
      <p className="text-6xl font-sora font-black tracking-tighter mb-4 tabular-nums">{value}</p>
      <p className="text-slate-600 text-[10px] font-bold uppercase tracking-widest">{description}</p>
    </div>
  );
}
