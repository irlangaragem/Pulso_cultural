import { Component, type ErrorInfo, type ReactNode } from 'react';
import { lazy, Suspense } from 'react';
import { Route, Routes } from 'react-router-dom';
import { ProtectedRoute } from './components/ProtectedRoute';
import { DashErrorBoundary } from './components/DashErrorBoundary';

const VisitorLogin = lazy(() => import('./pages/VisitorLogin').then(m => ({ default: m.VisitorLogin })));
const CheckIn = lazy(() => import('./pages/CheckIn').then(m => ({ default: m.CheckIn })));
const Dashboard = lazy(() => import('./pages/Dashboard').then(m => ({ default: m.Dashboard })));
const Guide = lazy(() => import('./pages/Guide').then(m => ({ default: m.Guide })));
const Login = lazy(() => import('./pages/Login').then(m => ({ default: m.Login })));
const CardShare = lazy(() => import('./pages/CardShare').then(m => ({ default: m.CardShare })));
const Feedback = lazy(() => import('./pages/Feedback').then(m => ({ default: m.Feedback })));

// Non-lazy PulseSymbol for Suspense fallback and 404 — must be available before chunks load
function PulseSymbolStatic() {
  const size = 48, cx = 24, cy = 24;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <defs>
        <radialGradient id="core-fb" cx="42%" cy="38%">
          <stop offset="0%" stopColor="#F28C38" />
          <stop offset="100%" stopColor="#E8554E" />
        </radialGradient>
      </defs>
      <circle cx={cx} cy={cy} r={21.12} fill="none" stroke="#F28C38" strokeWidth={0.384} opacity={0.25} />
      <circle cx={cx} cy={cy} r={15.36} fill="none" stroke="#D4267E" strokeWidth={0.72} opacity={0.35} />
      <circle cx={cx} cy={cy} r={9.6} fill="none" stroke="#E8554E" strokeWidth={1.056} opacity={0.55} />
      <circle cx={cx} cy={cy} r={3.84} fill="url(#core-fb)" />
    </svg>
  );
}



class ErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean; error?: Error }> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError(error: Error) { return { hasError: true, error }; }
  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[ErrorBoundary] Caught error:', error.message, '\n', error.stack, '\n', errorInfo.componentStack);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ background: '#0B0B0F', minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24, fontFamily: 'DM Sans, sans-serif' }}>
          <div style={{ fontSize: 32, marginBottom: 16 }}>🔴</div>
          <h1 style={{ color: '#F5ECE4', fontSize: 18, fontWeight: 700, marginBottom: 8, fontFamily: 'Sora, sans-serif', textAlign: 'center' }}>Algo deu errado</h1>
          <p style={{ color: '#6B5A60', fontSize: 13, marginBottom: 28, textAlign: 'center', maxWidth: 280, lineHeight: 1.5 }}>
            Ocorreu um problema inesperado. Tente voltar ao início.
          </p>
          <button
            onClick={() => { this.setState({ hasError: false }); window.location.href = '/'; }}
            style={{ background: 'linear-gradient(135deg, #E8554E, #D4267E)', border: 'none', borderRadius: 12, padding: '14px 28px', color: '#fff', fontFamily: 'Sora, sans-serif', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}
          >
            Voltar ao início
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

import { useSyncQueue } from './services/useSyncQueue';

function App() {
  useSyncQueue();

  return (
    <ErrorBoundary>
      <Suspense fallback={
        <div style={{
          background: '#0E0B0D',
          height: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 16,
        }}>
          <PulseSymbolStatic />
          <span style={{
            fontFamily: 'Sora, sans-serif',
            fontSize: 11,
            fontWeight: 300,
            color: '#6B5A60',
            letterSpacing: 3,
          }}>CARREGANDO...</span>
        </div>
      }>
        <Routes>
          <Route path="/" element={<VisitorLogin />} />
          <Route path="/checkin" element={<CheckIn />} />
          <Route path="/login" element={<Login />} />
          <Route path="/guide" element={<Guide />} />
          <Route path="/card" element={<CardShare />} />
          <Route path="/feedback" element={<Feedback />} />

          {/* 404 — branded recovery */}
          <Route path="*" element={
            <div style={{
              background: '#0E0B0D',
              minHeight: '100vh',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 24,
              fontFamily: 'DM Sans, sans-serif',
            }}>
              <PulseSymbolStatic />
              <h1 style={{ fontFamily: 'Sora, sans-serif', color: '#F5ECE4', fontSize: 22, fontWeight: 700, marginTop: 24, marginBottom: 8 }}>Página não encontrada</h1>
              <p style={{ color: '#6B5A60', fontSize: 13, textAlign: 'center', maxWidth: 260, lineHeight: 1.5, marginBottom: 28 }}>
                O endereço que você acessou não existe ou foi movido.
              </p>
              <button
                onClick={() => window.location.href = '/'}
                style={{ background: 'linear-gradient(135deg, #E8554E, #D4267E)', border: 'none', borderRadius: 12, padding: '14px 28px', color: '#fff', fontFamily: 'Sora, sans-serif', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}
              >
                Voltar ao início
              </button>
            </div>
          } />

          <Route element={<ProtectedRoute />}>
            <Route path="/dashboard" element={
              <DashErrorBoundary>
                <Dashboard />
              </DashErrorBoundary>
            } />
          </Route>
        </Routes>
      </Suspense>
    </ErrorBoundary>
  );
}

export default App;
