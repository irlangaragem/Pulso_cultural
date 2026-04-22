interface PulseSymbolProps {
  size?: number;
}

/**
 * PulseSymbol — Animated signal indicator for Pulso Cultural.
 *
 * Visual: bright red core dot + 3 staggered ripple rings expanding outward.
 * Uses CSS class-based animations defined in visitor.css for maximum
 * cross-browser reliability (no SVG transform-box quirks).
 *
 * Usage:
 *   <PulseSymbol size={26} />   — top header (small)
 *   <PulseSymbol size={48} />   — mid-page accent
 *   <PulseSymbol size={120} />  — success overlay (large)
 */
export function PulseSymbol({ size = 32 }: PulseSymbolProps) {
  const coreSize  = Math.round(size * 0.30);
  const glowBlur  = Math.round(size * 0.28);
  const glowSprd  = Math.round(size * 0.10);

  return (
    <div
      className="ps-container"
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      {/* Expanding ripple rings — staggered 0.8s each */}
      <div
        className="ps-ring"
        style={{
          background: 'rgba(232, 68, 58, 0.25)',
          animationDelay: '0s',
        }}
      />
      <div
        className="ps-ring"
        style={{
          background: 'rgba(232, 68, 58, 0.14)',
          animationDelay: '0.8s',
        }}
      />
      <div
        className="ps-ring"
        style={{
          background: 'rgba(232, 68, 58, 0.07)',
          animationDelay: '1.6s',
        }}
      />

      {/* Core glowing dot */}
      <div
        className="ps-core"
        style={{
          width: coreSize,
          height: coreSize,
          boxShadow: `0 0 ${glowBlur}px ${glowSprd}px rgba(232, 68, 58, 0.75),
                      0 0 ${glowBlur * 2}px ${glowSprd * 2}px rgba(232, 68, 58, 0.30)`,
        }}
      />
    </div>
  );
}
