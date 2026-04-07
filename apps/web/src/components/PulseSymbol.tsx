interface PulseSymbolProps {
  size?: number;
  animated?: boolean;
}

export function PulseSymbol({ size = 48 }: PulseSymbolProps) {
  const r = size / 2;
  const uid = `ps-${size}`;

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ overflow: 'visible' }}>
      <defs>
        <radialGradient id={`core-${uid}`} cx="42%" cy="38%">
          <stop offset="0%" stopColor="#F28C38" />
          <stop offset="100%" stopColor="#E8554E" />
        </radialGradient>
        <style>{`
          @keyframes pulse-breathe-${uid} {
            0%, 100% { transform: scale(1); opacity: 1; }
            50% { transform: scale(1.08); opacity: 0.85; }
          }
          @keyframes pulse-ring-${uid} {
            0% { opacity: 0.6; r: ${r * 0.22}px; }
            100% { opacity: 0; r: ${r * 0.92}px; }
          }
          .pulse-root-${uid} {
            animation: pulse-breathe-${uid} 2.4s ease-in-out infinite;
            transform-origin: center;
          }
          .pulse-wave1-${uid} { animation: pulse-ring-${uid} 2.8s ease-out infinite; transform-origin: center; }
          .pulse-wave2-${uid} { animation: pulse-ring-${uid} 2.8s ease-out infinite 0.9s; transform-origin: center; }
          .pulse-wave3-${uid} { animation: pulse-ring-${uid} 2.8s ease-out infinite 1.8s; transform-origin: center; }
        `}</style>
      </defs>
      <g className={`pulse-root-${uid}`}>
        {/* Outer rings */}
        <circle cx={r} cy={r} r={r * 0.88} fill="none" stroke="#F28C38" strokeWidth={size * 0.008} opacity="0.2" />
        <circle cx={r} cy={r} r={r * 0.64} fill="none" stroke="#D4267E" strokeWidth={size * 0.015} opacity="0.3" />
        <circle cx={r} cy={r} r={r * 0.40} fill="none" stroke="#E8554E" strokeWidth={size * 0.022} opacity="0.5" />
        {/* Radiating waves */}
        <circle cx={r} cy={r} r={r * 0.22} fill="none" stroke="#E8554E" strokeWidth={size * 0.02} className={`pulse-wave1-${uid}`} />
        <circle cx={r} cy={r} r={r * 0.22} fill="none" stroke="#D4267E" strokeWidth={size * 0.015} className={`pulse-wave2-${uid}`} />
        <circle cx={r} cy={r} r={r * 0.22} fill="none" stroke="#F28C38" strokeWidth={size * 0.01} className={`pulse-wave3-${uid}`} />
        {/* Core */}
        <circle cx={r} cy={r} r={r * 0.16} fill={`url(#core-${uid})`} />
      </g>
    </svg>
  );
}
