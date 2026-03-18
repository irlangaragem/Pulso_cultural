import { Component, type ErrorInfo, type ReactNode } from 'react';
import { Routes, Route, Link } from 'react-router-dom';
import { Layout, Users, QrCode, ClipboardCheck, BarChart3, Headphones, ArrowRight } from 'lucide-react';
import { CheckIn } from './pages/CheckIn';
import { Dashboard } from './pages/Dashboard';
import { Guide } from './pages/Guide';
import { Feedback } from './pages/Feedback';
import { Login } from './pages/Login';
import { ProtectedRoute } from './components/ProtectedRoute';

console.log('App loading...');

class ErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean }> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError(_: Error) { return { hasError: true }; }
  componentDidCatch(error: Error, errorInfo: ErrorInfo) { console.error('React Error:', error, errorInfo); }
  render() {
    if (this.state.hasError) return <div className="p-20 text-center"><h1>Algo deu errado. Verifique o console.</h1></div>;
    return this.props.children;
  }
}

function Home() {
  return (
    <div className="min-h-screen font-sans selection:bg-primary/20 selection:text-primary">
      {/* Navigation */}
      <nav className="border-b bg-white/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center gap-2">
              <div className="bg-primary p-1.5 rounded-lg shadow-sm">
                <Layout className="w-6 h-6 text-white" />
              </div>
              <span className="text-xl font-sora font-bold tracking-tight text-slate-800">
                PULSO <span className="text-primary font-black">CULTURAL</span>
              </span>
            </div>
            <div className="hidden md:flex items-center gap-8">
              <a href="#about" className="text-sm font-medium text-slate-600 hover:text-primary transition-colors">Sobre</a>
              <Link to="/dashboard" className="bg-slate-900 text-white px-5 py-2 rounded-full text-sm font-semibold hover:bg-slate-800 transition-all shadow-sm">
                Acessar Dashboard
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <header className="relative py-24 overflow-hidden bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center">
            <h1 className="text-5xl md:text-7xl font-sora font-black tracking-tight text-slate-900 mb-6 uppercase">
              O Ritmo da <span className="text-primary">Cultura</span> em Tempo Real
            </h1>
            <p className="max-w-2xl mx-auto text-lg md:text-xl text-slate-600 mb-10 leading-relaxed">
              Sistema inteligente de monitoramento e engajamento para museus. 
              Piloto MAM — Salvador/BA.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link 
                to="/checkin"
                className="w-full sm:w-auto px-8 py-4 bg-primary text-white rounded-2xl font-bold text-lg hover:bg-primary/90 transition-all shadow-lg shadow-primary/20 flex items-center justify-center gap-2"
              >
                <QrCode className="w-5 h-5" />
                Fazer Check-in (visitante)
              </Link>
              <Link 
                to="/guide"
                className="w-full sm:w-auto px-8 py-4 bg-white border-2 border-slate-200 text-slate-700 rounded-2xl font-bold text-lg hover:bg-slate-50 transition-all flex items-center justify-center gap-2 text-center"
              >
                <Headphones className="w-5 h-5" />
                Acessar Guia Digital
              </Link>
            </div>
          </div>
        </div>
        
        {/* Background blobs */}
        <div className="absolute top-1/2 left-1/4 -translate-y-1/2 w-64 h-64 bg-primary/10 rounded-full blur-3xl -z-10 animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl -z-10 animate-pulse"></div>
      </header>

      {/* Features Grid */}
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-3 gap-8">
            <div className="p-8 rounded-3xl bg-slate-50 border border-slate-100 hover:shadow-xl transition-all group">
              <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center border border-slate-100 mb-6 shadow-sm group-hover:scale-110 transition-transform">
                <Users className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-xl font-sora font-bold mb-3">Fluxo de Visitantes</h3>
              <p className="text-slate-600 leading-relaxed">
                Visão computacional via YOLOv8 para contagem precisa de entradas e saídas no MAM.
              </p>
            </div>

            <div className="p-8 rounded-3xl bg-slate-50 border border-slate-100 hover:shadow-xl transition-all group">
              <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center border border-slate-100 mb-6 shadow-sm group-hover:scale-110 transition-transform">
                <ClipboardCheck className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-xl font-sora font-bold mb-3">Check-in Digital</h3>
              <p className="text-slate-600 leading-relaxed">
                Identificação rápida via QR Code e coleta de dados LGPD para enriquecer o perfil do público.
              </p>
            </div>

            <div className="p-8 rounded-3xl bg-slate-50 border border-slate-100 hover:shadow-xl transition-all group">
              <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center border border-slate-100 mb-6 shadow-sm group-hover:scale-110 transition-transform">
                <Headphones className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-xl font-sora font-bold mb-3">Guia Digital</h3>
              <p className="text-slate-600 leading-relaxed">
                Acesso imediato a informações das obras e áudio-guia integrado no smartphone.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Dashboard Preview */}
      <section className="py-24 bg-slate-900 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col lg:flex-row items-center gap-16">
            <div className="flex-1 text-white">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/20 text-primary rounded-full text-sm font-bold border border-primary/20 mb-8">
                <BarChart3 className="w-4 h-4" />
                PARA GESTORES
              </div>
              <h2 className="text-4xl md:text-5xl font-sora font-black mb-6 leading-tight text-white uppercase">
                Decisões guiadas <br /> por <span className="text-primary tracking-widest">DADOS</span>
              </h2>
              <p className="text-slate-400 text-lg mb-8 leading-relaxed">
                Dashboard administrativo em tempo real via WebSockets. Monitore a ocupação atual, 
                tempo médio de permanência e engajamento com as exposições de forma visual.
              </p>
              <Link to="/dashboard" className="px-8 py-4 bg-primary text-white rounded-2xl font-bold inline-flex items-center gap-2 hover:bg-primary/90 transition-all">
                Ver Painel ao Vivo
                <ArrowRight size={18} />
              </Link>
            </div>
            <div className="flex-1 relative">
              <div className="bg-slate-800 rounded-3xl p-4 border border-slate-700 shadow-2xl relative z-10">
                <div className="flex gap-2 mb-4">
                  <div className="w-3 h-3 bg-red-500 rounded-full" />
                  <div className="w-3 h-3 bg-amber-500 rounded-full" />
                  <div className="w-3 h-3 bg-green-500 rounded-full" />
                </div>
                <div className="h-64 bg-slate-900 rounded-xl relative overflow-hidden flex items-center justify-center">
                   <div className="text-center">
                     <div className="text-4xl font-black text-primary mb-2">42</div>
                     <div className="text-slate-500 text-xs font-bold tracking-widest uppercase">Visitantes no Local</div>
                   </div>
                   <div className="absolute inset-0 grid grid-cols-10 grid-rows-5 opacity-10">
                     {[...Array(50)].map((_, i) => (
                       <div key={i} className="border border-slate-400" />
                     ))}
                   </div>
                </div>
              </div>
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-primary/20 blur-[100px] -z-10"></div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 bg-slate-50 border-t border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-slate-500 text-sm">
            © 2026 Pulso Cultural. Desenvolvido para o Museu de Arte Moderna da Bahia.
          </p>
        </div>
      </footer>
    </div>
  );
}

function App() {
  console.log('Rendering App component');
  return (
    <ErrorBoundary>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/checkin" element={<CheckIn />} />
        <Route path="/login" element={<Login />} />
        <Route path="/guide" element={<Guide />} />
        <Route path="/feedback" element={<Feedback />} />
        <Route element={<ProtectedRoute />}>
          <Route path="/dashboard" element={<Dashboard />} />
        </Route>
      </Routes>
    </ErrorBoundary>
  );
}

export default App;
