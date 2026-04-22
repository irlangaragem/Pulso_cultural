interface PulseSymbolProps {
  size?: number;
  animated?: boolean;
}

/**
 * PulseSymbol — Pixel-perfect SVG-native implementation.
 *
 * All geometry is a ratio of r = size / 2.
 * Layer stack (bottom → top in DOM order):
 *   1. Outer ring  — r×0.88, stroke #F28C38, opacity 0.25 (static)
 *   2. Mid ring    — r×0.64, stroke #D4267E, opacity 0.35 (static)
 *   3. Inner ring  — r×0.40, stroke #E8554E, opacity 0.55 (static)
 *   4. Ripple A    — r×0.24→0.88, stroke #E8554E (animated only)
 *   5. Ripple B    — r×0.24→0.88, stroke #D4267E (animated only, +800 ms)
 *   6. Ripple C    — r×0.24→0.88, stroke #F28C38 (animated only, +1600 ms)
 *   7. Core dot    — r×0.16, fill radialGradient cx=42% cy=38%
 *
 * Animation drives the SVG `r` attribute directly — NOT transform:scale.
 * Duration: 2400 ms, easing: ease-out, stagger: 0 / 800 / 1600 ms.
 */
export function PulseSymbol({ size = 48, animated = false }: PulseSymbolProps) {
  const cx = size / 2;
  const cy = size / 2;

  // Geometry ratios (all relative to r = size/2)
  const r = size / 2;
  const outerR    = r * 0.88;   // outer static ring
  const midR      = r * 0.64;   // mid static ring
  const innerR    = r * 0.40;   // inner static ring
  const rippleR0  = r * 0.24;   // ripple start radius
  const rippleR1  = r * 0.88;   // ripple end radius (= outer ring)
  const coreR     = r * 0.16;   // core dot

  // StrokeWidth ratios
  const outerSW   = size * 0.008;
  const midSW     = size * 0.015;
  const innerSW   = size * 0.022;
  const rippleASW = size * 0.020;
  const rippleBSW = size * 0.015;
  const rippleCSW = size * 0.010;

  // Unique gradient / keyframe IDs per size to avoid collisions
  const gradId    = `core-${size}${animated ? 'a' : ''}`;
  const kfName    = `pe${size}${animated ? 'a' : ''}`;
  const pa1Class  = `pa1-${size}${animated ? 'a' : ''}`;
  const pa2Class  = `pa2-${size}${animated ? 'a' : ''}`;
  const pa3Class  = `pa3-${size}${animated ? 'a' : ''}`;

  const animatedStyle = animated
    ? `
      @keyframes ${kfName} {
        0%   { opacity: 0.7; r: ${rippleR0}; }
        100% { opacity: 0;   r: ${rippleR1}; }
      }
      .${pa1Class} {
        animation: ${kfName} 2400ms ease-out infinite 0ms;
        transform-origin: center;
      }
      .${pa2Class} {
        animation: ${kfName} 2400ms ease-out infinite 800ms;
        transform-origin: center;
      }
      .${pa3Class} {
        animation: ${kfName} 2400ms ease-out infinite 1600ms;
        transform-origin: center;
      }
    `
    : '';

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <defs>
        <radialGradient id={gradId} cx="42%" cy="38%">
          <stop offset="0%"   stopColor="#F28C38" />
          <stop offset="100%" stopColor="#E8554E" />
        </radialGradient>
        {animated && <style>{animatedStyle}</style>}
      </defs>

      {/* Layer 1 — Outer ring (static) */}
      <circle
        cx={cx} cy={cy}
        r={outerR}
        fill="none"
        stroke="#F28C38"
        strokeWidth={outerSW}
        opacity={0.25}
      />

      {/* Layer 2 — Mid ring (static) */}
      <circle
        cx={cx} cy={cy}
        r={midR}
        fill="none"
        stroke="#D4267E"
        strokeWidth={midSW}
        opacity={0.35}
      />

      {/* Layer 3 — Inner ring (static) */}
      <circle
        cx={cx} cy={cy}
        r={innerR}
        fill="none"
        stroke="#E8554E"
        strokeWidth={innerSW}
        opacity={0.55}
      />

      {/* Ripple layers — only when animated=true */}
      {animated && (
        <>
          {/* Ripple A — coral-red, no delay */}
          <circle
            cx={cx} cy={cy}
            r={rippleR0}
            fill="none"
            stroke="#E8554E"
            strokeWidth={rippleASW}
            className={pa1Class}
          />

          {/* Ripple B — magenta-pink, 800 ms delay */}
          <circle
            cx={cx} cy={cy}
            r={rippleR0}
            fill="none"
            stroke="#D4267E"
            strokeWidth={rippleBSW}
            className={pa2Class}
          />

          {/* Ripple C — amber-orange, 1600 ms delay */}
          <circle
            cx={cx} cy={cy}
            r={rippleR0}
            fill="none"
            stroke="#F28C38"
            strokeWidth={rippleCSW}
            className={pa3Class}
          />
        </>
      )}

      {/* Layer 4 — Core dot (topmost) */}
      <circle
        cx={cx} cy={cy}
        r={coreR}
        fill={`url(#${gradId})`}
      />
    </svg>
  );
}
