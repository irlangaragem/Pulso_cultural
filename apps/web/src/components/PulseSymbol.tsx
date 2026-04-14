interface PulseSymbolProps {
  size?: number;
}

export function PulseSymbol({ size = 120 }: PulseSymbolProps) {
  const r = size / 2;
  const uid = `ps-${size}`;

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ overflow: 'visible' }}>
      <defs>
        <filter id={`glow-${uid}`} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation={size * 0.05} result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
        <radialGradient id={`core-grad-${uid}`}>
          <stop offset="0%" stopColor="#FB923C" />
          <stop offset="100%" stopColor="#E11D48" />
        </radialGradient>
        <style>{`
          @keyframes pulse-ring-${uid} {
            0% { transform: scale(0.8); opacity: 0; }
            50% { opacity: 0.15; }
            100% { transform: scale(1.1); opacity: 0; }
          }
          @keyframes pulse-core-${uid} {
            0%, 100% { transform: scale(1); filter: brightness(1); }
            50% { transform: scale(1.05); filter: brightness(1.2); }
          }
          .pulse-ring-${uid} {
            animation: pulse-ring-${uid} 4s ease-out infinite;
            transform-origin: center;
          }
          .pulse-core-${uid} {
            animation: pulse-core-${uid} 3s ease-in-out infinite;
            transform-origin: center;
          }
        `}</style>
      </defs>
      
      {/* Outer Glow Ring */}
      <circle 
        cx={r} cy={r} r={r * 0.9} 
        fill="none" 
        stroke="#E11D48" 
        strokeWidth="1" 
        opacity="0.1" 
      />
      
      {/* Animated Rings */}
      <circle 
        cx={r} cy={r} r={r * 0.8} 
        fill="none" 
        stroke="#E11D48" 
        strokeWidth="2" 
        className={`pulse-ring-${uid}`}
      />
      
      {/* Middle Ring */}
      <circle 
        cx={r} cy={r} r={r * 0.45} 
        fill="none" 
        stroke="#E11D48" 
        strokeWidth="1" 
        opacity="0.2"
      />

      {/* Core Dot with Glow */}
      <circle 
        cx={r} cy={r} r={r * 0.15} 
        fill={`url(#core-grad-${uid})`}
        filter={`url(#glow-${uid})`}
        className={`pulse-core-${uid}`}
      />
    </svg>
  );
}
