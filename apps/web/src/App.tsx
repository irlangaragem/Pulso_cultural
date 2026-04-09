import { Component, type ErrorInfo, type ReactNode } from 'react';
import { Route, Routes } from 'react-router-dom';
import { CheckIn } from './pages/CheckIn';
import { Dashboard } from './pages/Dashboard';
import { Guide } from './pages/Guide';
import { Login } from './pages/Login';
import { VisitorLogin } from './pages/VisitorLogin';
import { CardShare } from './pages/CardShare';
import { Feedback } from './pages/Feedback';
import { ProtectedRoute } from './components/ProtectedRoute';
import { DashErrorBoundary } from './components/DashErrorBoundary';




class ErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean }> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError(_error: Error) { return { hasError: true }; }
  componentDidCatch(error: Error, errorInfo: ErrorInfo) { console.error('React Error:', error, errorInfo); }
  render() {
    if (this.state.hasError) return <div className="p-20 text-center"><h1>Algo deu errado. Verifique o console.</h1></div>;
    return this.props.children;
  }
}

import { useSyncQueue } from './services/useSyncQueue';

function App() {
  useSyncQueue();

  return (
    <ErrorBoundary>
      <Routes>
        <Route path="/" element={<VisitorLogin />} />
        <Route path="/checkin" element={<CheckIn />} />
        <Route path="/login" element={<Login />} />
        <Route path="/guide" element={<Guide />} />
        <Route path="/card" element={<CardShare />} />
        <Route path="/feedback" element={<Feedback />} />

        <Route element={<ProtectedRoute />}>
          <Route path="/dashboard" element={
            <DashErrorBoundary>
              <Dashboard />
            </DashErrorBoundary>
          } />
        </Route>
      </Routes>
    </ErrorBoundary>
  );
}

export default App;
