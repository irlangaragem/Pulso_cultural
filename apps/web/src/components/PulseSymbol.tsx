interface PulseSymbolProps {
  size?: number;
}

/**
 * PulseSymbol — Animated heartbeat signal for Pulso Cultural.
 *
 * 4-layer structure (inside → out):
 *   Core  — bright red glowing dot (breathes gently)
 *   L1    — thin static inner ring (subtle, always visible)
 *   L2    — intermediate expanding ring (ripple #1)
 *   L3    — outer expanding ring (ripple #2, staggered)
 *
 * All animation is CSS-only via classes in visitor.css.
 */
export function PulseSymbol({ size = 48 }: PulseSymbolProps) {
  // Core sizes relative to container
  const coreD   = Math.round(size * 0.22);    // ~22% — bright dot
  const ringInR = Math.round(size * 0.32);    // ~32% — static inner ring radius
  const glowR   = Math.round(size * 0.15);    // glow spread

  return (
    <div
      className="ps-wrap"
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      {/* Layer 3 — outer ripple (delayed) */}
      <div className="ps-ripple" style={{ animationDelay: '0s' }} />

      {/* Layer 2 — intermediate ripple */}
      <div className="ps-ripple" style={{ animationDelay: '1.2s' }} />

      {/* Layer 1 — static inner ring */}
      <div
        className="ps-inner-ring"
        style={{
          width: ringInR * 2,
          height: ringInR * 2,
        }}
      />

      {/* Core — bright glowing dot */}
      <div
        className="ps-dot"
        style={{
          width: coreD,
          height: coreD,
          boxShadow:
            `0 0 ${glowR}px ${Math.round(glowR * 0.5)}px rgba(255,45,85,0.85),
             0 0 ${glowR * 3}px ${glowR}px rgba(255,45,85,0.30)`,
        }}
      />
    </div>
  );
}
