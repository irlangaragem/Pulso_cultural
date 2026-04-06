import { useState, useEffect, useCallback } from 'react';

const HEALTH_INTERVAL = 30_000; // 30s probe

type HealthStatus = 'online' | 'degraded' | 'offline' | 'checking';

interface HealthData {
  services?: {
    api: string;
    database: string;
    upstream: string;
  };
  timestamp?: string;
}

const STATUS_CONFIG: Record<HealthStatus, { color: string; bg: string; label: string; pulse: boolean }> = {
  online:   { color: '#48BB78', bg: 'rgba(72,187,120,0.12)', label: 'Sistemas online',    pulse: true  },
  degraded: { color: '#F2B63C', bg: 'rgba(242,182,60,0.12)', label: 'Upstream instável',  pulse: true  },
  offline:  { color: '#E8554E', bg: 'rgba(232,85,78,0.12)',  label: 'API indisponível',   pulse: false },
  checking: { color: '#A8969A', bg: 'rgba(168,150,154,0.08)', label: 'Verificando...',     pulse: false },
};

interface SystemHealthProps {
  apiBaseUrl: string;
}

export function SystemHealth({ apiBaseUrl }: SystemHealthProps) {
  const [status, setStatus] = useState<HealthStatus>('checking');
  const [details, setDetails] = useState<HealthData | null>(null);

  const checkHealth = useCallback(async () => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);

      const res = await fetch(`${apiBaseUrl}/health`, { signal: controller.signal });
      clearTimeout(timeoutId);

      if (!res.ok) {
        setStatus('offline');
        setDetails(null);
        return;
      }

      const data: HealthData = await res.json();
      setDetails(data);

      if (data.services?.upstream === 'down') {
        setStatus('degraded');
      } else {
        setStatus('online');
      }
    } catch {
      setStatus('offline');
      setDetails(null);
    }
  }, [apiBaseUrl]);

  useEffect(() => {
    checkHealth();
    const interval = setInterval(checkHealth, HEALTH_INTERVAL);
    return () => clearInterval(interval);
  }, [checkHealth]);

  const cfg = STATUS_CONFIG[status];

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '6px 14px',
        borderRadius: 100,
        background: cfg.bg,
        cursor: 'pointer',
        transition: 'all 0.3s ease',
        position: 'relative',
      }}
      title={details ? `API: ${details.services?.api} | DB: ${details.services?.database} | Upstream: ${details.services?.upstream}` : 'Verificando conexão...'}
      onClick={checkHealth}
    >
      {/* Dot */}
      <span
        style={{
          width: 7,
          height: 7,
          borderRadius: '50%',
          background: cfg.color,
          display: 'inline-block',
          boxShadow: cfg.pulse ? `0 0 6px ${cfg.color}` : 'none',
          animation: cfg.pulse ? 'healthPulse 2s ease-in-out infinite' : 'none',
        }}
      />
      {/* Label */}
      <span
        style={{
          fontFamily: "'Space Mono', monospace",
          fontSize: 9,
          fontWeight: 700,
          color: cfg.color,
          letterSpacing: 1,
          textTransform: 'uppercase',
        }}
      >
        {cfg.label}
      </span>

      {/* Inline keyframe via style tag */}
      <style>{`
        @keyframes healthPulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(1.3); }
        }
      `}</style>
    </div>
  );
}
