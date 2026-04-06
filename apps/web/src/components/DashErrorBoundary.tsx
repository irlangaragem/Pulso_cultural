import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class DashErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error in Dashboard:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="p-12 text-center bg-slate-900/50 rounded-[2.5rem] border border-red-500/10 backdrop-blur-xl">
          <div className="w-20 h-20 bg-red-500/10 text-red-500 rounded-3xl flex items-center justify-center mx-auto mb-6">
            <AlertTriangle className="w-10 h-10" />
          </div>
          <h2 className="text-2xl font-sora font-black text-white uppercase tracking-tighter mb-4">
            Painel temporariamente <span className="text-red-500">indisponível</span>
          </h2>
          <p className="text-slate-500 font-medium mb-8 max-w-sm mx-auto">
            Houve uma falha na comunicação com a API de métricas. 
            Nossa equipe técnica já foi notificada.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="inline-flex items-center gap-3 bg-slate-800 text-white px-8 py-4 rounded-2xl font-black text-sm hover:bg-slate-700 transition-all"
          >
            <RefreshCw className="w-5 h-5" />
            Tentar Novamente
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
