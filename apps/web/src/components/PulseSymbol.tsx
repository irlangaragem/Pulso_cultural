interface PulseSymbolProps {
  size?: number;
}

export function PulseSymbol({ size = 120 }: PulseSymbolProps) {
  const r = size / 2;
  const uid = `ps-${size}`;
  const isSmall = size <= 32;

  // Scale params depending on size context
  const ringR     = r * (isSmall ? 0.35 : 0.5);
  const coreR     = r * (isSmall ? 0.28 : 0.16);
  const glowR     = r * (isSmall ? 0.44 : 0.30);
  const maxScale  = isSmall ? 3.2  : 2.4;
  const strokeW   = isSmall ? Math.max(0.8, size * 0.04) : Math.max(1, size * 0.022);
  const duration  = isSmall ? '2s' : '2.4s';

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      style={{ overflow: 'visible', display: 'block' }}
      aria-hidden="true"
    >
      <defs>
        <radialGradient id={`core-grad-${uid}`} cx="50%" cy="50%" r="50%">
          <stop offset="0%"   stopColor="#FFAA7A" />
          <stop offset="55%"  stopColor="#E8443A" />
          <stop offset="100%" stopColor="#B02030" />
        </radialGradient>

        {/* Core glow */}
        <filter id={`glow-${uid}`} x="-150%" y="-150%" width="400%" height="400%">
          <feGaussianBlur in="SourceGraphic" stdDeviation={isSmall ? size * 0.12 : size * 0.05} result="blurred" />
          <feMerge>
            <feMergeNode in="blurred" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>

        {/* Ring glow */}
        <filter id={`ring-glow-${uid}`} x="-80%" y="-80%" width="260%" height="260%">
          <feGaussianBlur in="SourceGraphic" stdDeviation={isSmall ? size * 0.06 : size * 0.022} result="blurred" />
          <feMerge>
            <feMergeNode in="blurred" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>

        <style>{`
          @keyframes ps-expand-${uid} {
            0%   { transform: scale(0.1); opacity: ${isSmall ? 1 : 0.85}; }
            60%  { opacity: ${isSmall ? 0.5 : 0.25}; }
            100% { transform: scale(${maxScale}); opacity: 0; }
          }

          @keyframes ps-breathe-${uid} {
            0%, 100% { transform: scale(1);    opacity: 1; }
            50%       { transform: scale(${isSmall ? 1.2 : 1.15}); opacity: 0.88; }
          }

          @keyframes ps-halo-${uid} {
            0%, 100% { transform: scale(1);   opacity: ${isSmall ? 0.5 : 0.30}; }
            50%       { transform: scale(${isSmall ? 1.3 : 1.2}); opacity: ${isSmall ? 0.75 : 0.55}; }
          }

          .ps-ring-${uid} {
            transform-box: fill-box;
            transform-origin: center;
            fill: none;
            stroke: #E8443A;
            stroke-width: ${strokeW}px;
            animation: ps-expand-${uid} ${duration} cubic-bezier(0.15, 0.5, 0.3, 1) infinite;
          }

          .ps-core-${uid} {
            transform-box: fill-box;
            transform-origin: center;
            animation: ps-breathe-${uid} ${duration} ease-in-out infinite;
          }

          .ps-halo-${uid} {
            transform-box: fill-box;
            transform-origin: center;
            animation: ps-halo-${uid} ${duration} ease-in-out infinite;
          }
        `}</style>
      </defs>

      {/* Static boundary ring — only on large sizes */}
      {!isSmall && (
        <circle
          cx={r} cy={r}
          r={r * 0.86}
          fill="none"
          stroke="#E8443A"
          strokeWidth={Math.max(0.5, size * 0.007)}
          opacity={0.10}
        />
      )}

      {/* Expanding Ring 1 — no delay */}
      <circle
        cx={r} cy={r} r={ringR}
        className={`ps-ring-${uid}`}
        filter={`url(#ring-glow-${uid})`}
        style={{ animationDelay: '0s' }}
      />

      {/* Expanding Ring 2 */}
      <circle
        cx={r} cy={r} r={ringR}
        className={`ps-ring-${uid}`}
        filter={`url(#ring-glow-${uid})`}
        style={{ animationDelay: isSmall ? '0.65s' : '0.8s' }}
      />

      {/* Expanding Ring 3 */}
      <circle
        cx={r} cy={r} r={ringR}
        className={`ps-ring-${uid}`}
        filter={`url(#ring-glow-${uid})`}
        style={{ animationDelay: isSmall ? '1.3s' : '1.6s' }}
      />

      {/* Ambient glow halo */}
      <circle
        cx={r} cy={r} r={glowR}
        fill="#E8443A"
        opacity={isSmall ? 0.5 : 0.30}
        className={`ps-halo-${uid}`}
        filter={`url(#ring-glow-${uid})`}
      />

      {/* Core dot */}
      <circle
        cx={r} cy={r} r={coreR}
        fill={`url(#core-grad-${uid})`}
        filter={`url(#glow-${uid})`}
        className={`ps-core-${uid}`}
      />
    </svg>
  );
}
