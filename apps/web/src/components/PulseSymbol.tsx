interface PulseSymbolProps {
  size?: number;
  animated?: boolean;
}

export function PulseSymbol({ size = 120 }: PulseSymbolProps) {
  const r = size / 2;
  const uid = `ps-${size}`;

  const ringR = r * 0.5;       // rings originate at 50% radius
  const coreR = r * 0.16;      // core dot radius
  const glowR = r * 0.30;      // ambient glow halo

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

        {/* Core dot glow */}
        <filter id={`glow-${uid}`} x="-120%" y="-120%" width="340%" height="340%">
          <feGaussianBlur in="SourceGraphic" stdDeviation={size * 0.05} result="blurred" />
          <feMerge>
            <feMergeNode in="blurred" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>

        {/* Ring soft glow */}
        <filter id={`ring-glow-${uid}`} x="-60%" y="-60%" width="220%" height="220%">
          <feGaussianBlur in="SourceGraphic" stdDeviation={size * 0.022} result="blurred" />
          <feMerge>
            <feMergeNode in="blurred" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>

        <style>{`
          @keyframes ps-expand-${uid} {
            0%   { transform: scale(0.1); opacity: 0.85; }
            70%  { opacity: 0.25; }
            100% { transform: scale(2.4); opacity: 0; }
          }

          @keyframes ps-breathe-${uid} {
            0%, 100% { transform: scale(1);    opacity: 1; }
            50%       { transform: scale(1.15); opacity: 0.88; }
          }

          @keyframes ps-halo-${uid} {
            0%, 100% { transform: scale(1);   opacity: 0.30; }
            50%       { transform: scale(1.2); opacity: 0.55; }
          }

          .ps-ring-${uid} {
            transform-box: fill-box;
            transform-origin: center;
            fill: none;
            stroke: #E8443A;
            stroke-width: ${Math.max(1, size * 0.022)}px;
            animation: ps-expand-${uid} 2.4s cubic-bezier(0.15, 0.5, 0.3, 1) infinite;
          }

          .ps-core-${uid} {
            transform-box: fill-box;
            transform-origin: center;
            animation: ps-breathe-${uid} 2.4s ease-in-out infinite;
          }

          .ps-halo-${uid} {
            transform-box: fill-box;
            transform-origin: center;
            animation: ps-halo-${uid} 2.4s ease-in-out infinite;
          }
        `}</style>
      </defs>

      {/* Static boundary ring */}
      <circle
        cx={r} cy={r}
        r={r * 0.86}
        fill="none"
        stroke="#E8443A"
        strokeWidth={Math.max(0.5, size * 0.007)}
        opacity={0.10}
      />

      {/* Expanding Ring 1 — no delay */}
      <circle
        cx={r} cy={r} r={ringR}
        className={`ps-ring-${uid}`}
        filter={`url(#ring-glow-${uid})`}
        style={{ animationDelay: '0s' }}
      />

      {/* Expanding Ring 2 — ⅓ offset */}
      <circle
        cx={r} cy={r} r={ringR}
        className={`ps-ring-${uid}`}
        filter={`url(#ring-glow-${uid})`}
        style={{ animationDelay: '0.8s' }}
      />

      {/* Expanding Ring 3 — ⅔ offset */}
      <circle
        cx={r} cy={r} r={ringR}
        className={`ps-ring-${uid}`}
        filter={`url(#ring-glow-${uid})`}
        style={{ animationDelay: '1.6s' }}
      />

      {/* Ambient glow halo behind core */}
      <circle
        cx={r} cy={r} r={glowR}
        fill="#E8443A"
        opacity={0.30}
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
