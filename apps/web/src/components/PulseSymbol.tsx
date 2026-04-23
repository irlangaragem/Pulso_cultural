// ============================================================
// PulseSymbol — Canonical implementation
// Spec: viewBox 0 0 100 100 | rings 1:1.6:2.2 from core
//
// Geometry (all in viewBox units, cx=cy=50):
//   core  r=8   fill radialGradient cx=42% cy=38%
//   inner r=20  stroke #E8554E  sw=2.2  opacity=0.55
//   mid   r=32  stroke #D4267E  sw=1.5  opacity=0.35
//   outer r=44  stroke #F28C38  sw=0.8  opacity=0.25
//
// Ripple animation drives SVG `r` attribute (NOT CSS transform).
// Three waves: stagger 0ms / 800ms / 1600ms, duration 2400ms.
//
// Exports:
//   PulseSymbol        — full 3-ring symbol (min 32px)
//   PulseSymbolMinimal — 1-ring + core       (min 16px, favicon)
//   PulseLockupH       — horizontal lockup   (min 120px wide)
//   PulseLockupV       — stacked lockup      (min 64px wide)
// ============================================================

// ── Gradient ID must be unique per instance to avoid SVG collisions ────────
let _uid = 0;
function uid() { return ++_uid; }

// ── Geometry constants (viewBox 0 0 100 100) ──────────────────────────────
const CX = 50;
const CY = 50;

const OUTER_R  = 44;  // 8 × 5.5  — outer ring
const MID_R    = 32;  // 8 × 4.0  — mid ring
const INNER_R  = 20;  // 8 × 2.5  — inner ring
const CORE_R   =  8;  // base unit

const OUTER_SW = 0.8;
const MID_SW   = 1.5;
const INNER_SW = 2.2;

const OUTER_OP = 0.25;
const MID_OP   = 0.35;
const INNER_OP = 0.55;

const OUTER_COLOR  = '#F28C38';
const MID_COLOR    = '#D4267E';
const INNER_COLOR  = '#E8554E';
const CORE_START   = '#F28C38';
const CORE_END     = '#E8554E';

// Ripple: starts at core edge, expands to outer ring edge
const RIPPLE_R0 = CORE_R;
const RIPPLE_R1 = OUTER_R;

// ── Types ─────────────────────────────────────────────────────────────────
export interface PulseSymbolProps {
  /** Rendered pixel size. Minimum enforced: 32px for full, 16px for minimal. */
  size?: number;
  /** Enables pulsing ripple animation. */
  animated?: boolean;
  /** Accessible label. Defaults to aria-hidden. */
  label?: string;
}

// ── Core SVG layers ───────────────────────────────────────────────────────
interface RingsProps {
  gradId: string;
  variant: 'full' | 'minimal';
}
function Rings({ gradId, variant }: RingsProps) {
  return (
    <>
      {/* Outer ring — only in full variant */}
      {variant === 'full' && (
        <circle
          cx={CX} cy={CY} r={OUTER_R}
          fill="none"
          stroke={OUTER_COLOR}
          strokeWidth={OUTER_SW}
          opacity={OUTER_OP}
        />
      )}

      {/* Mid ring — only in full variant */}
      {variant === 'full' && (
        <circle
          cx={CX} cy={CY} r={MID_R}
          fill="none"
          stroke={MID_COLOR}
          strokeWidth={MID_SW}
          opacity={MID_OP}
        />
      )}

      {/* Inner ring — present in both variants */}
      <circle
        cx={CX} cy={CY} r={INNER_R}
        fill="none"
        stroke={INNER_COLOR}
        strokeWidth={INNER_SW}
        opacity={INNER_OP}
      />

      {/* Core — topmost */}
      <circle
        cx={CX} cy={CY} r={CORE_R}
        fill={`url(#${gradId})`}
      />
    </>
  );
}

// ── Ripple layers (animated only) ─────────────────────────────────────────
interface RipplesProps {
  kfName: string;
  cls: [string, string, string];
}
function Ripples({ kfName, cls }: RipplesProps) {
  return (
    <>
      {/* Wave A — coral, no delay */}
      <circle
        cx={CX} cy={CY} r={RIPPLE_R0}
        fill="none"
        stroke={INNER_COLOR}
        strokeWidth={2.0}
        className={cls[0]}
      />
      {/* Wave B — magenta, +800ms */}
      <circle
        cx={CX} cy={CY} r={RIPPLE_R0}
        fill="none"
        stroke={MID_COLOR}
        strokeWidth={1.5}
        className={cls[1]}
      />
      {/* Wave C — amber, +1600ms */}
      <circle
        cx={CX} cy={CY} r={RIPPLE_R0}
        fill="none"
        stroke={OUTER_COLOR}
        strokeWidth={1.0}
        className={cls[2]}
      />
    </>
  );
}

// ── Shared <defs> ─────────────────────────────────────────────────────────
interface DefsProps {
  gradId: string;
  animated: boolean;
  kfName: string;
  cls: [string, string, string];
}
function Defs({ gradId, animated, kfName, cls }: DefsProps) {
  const css = animated ? `
    @keyframes ${kfName} {
      0%   { opacity: 0.65; r: ${RIPPLE_R0}px; }
      100% { opacity: 0;    r: ${RIPPLE_R1}px; }
    }
    .${cls[0]} { animation: ${kfName} 2400ms ease-out infinite    0ms; }
    .${cls[1]} { animation: ${kfName} 2400ms ease-out infinite  800ms; }
    .${cls[2]} { animation: ${kfName} 2400ms ease-out infinite 1600ms; }
  ` : '';

  return (
    <defs>
      <radialGradient id={gradId} cx="42%" cy="38%">
        <stop offset="0%"   stopColor={CORE_START} />
        <stop offset="100%" stopColor={CORE_END}   />
      </radialGradient>
      {animated && <style>{css}</style>}
    </defs>
  );
}

// ── PulseSymbol — full 3-ring (min 32px) ─────────────────────────────────
import { useRef } from 'react';

export function PulseSymbol({ size = 48, animated = false, label }: PulseSymbolProps) {
  const idRef = useRef<number | null>(null);
  if (idRef.current === null) idRef.current = uid();
  const id = idRef.current;

  const px = Math.max(32, size); // enforce minimum
  const gradId = `coreGrad-${id}`;
  const kfName = `pulse-${id}`;
  const cls: [string, string, string] = [`pw-${id}-a`, `pw-${id}-b`, `pw-${id}-c`];

  return (
    <svg
      width={px}
      height={px}
      viewBox="0 0 100 100"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden={label ? undefined : true}
      aria-label={label}
      role={label ? 'img' : undefined}
    >
      <Defs gradId={gradId} animated={animated} kfName={kfName} cls={cls} />
      {/* Ripples render below static rings so rings stay visible on top */}
      {animated && <Ripples kfName={kfName} cls={cls} />}
      <Rings gradId={gradId} variant="full" />
    </svg>
  );
}

// ── PulseSymbolMinimal — 1-ring + core (min 16px, use for favicon) ────────
export function PulseSymbolMinimal({
  size = 16,
  animated = false,
  label,
}: PulseSymbolProps) {
  const idRef = useRef<number | null>(null);
  if (idRef.current === null) idRef.current = uid();
  const id = idRef.current;

  const px = Math.max(16, size);
  const gradId = `coreGrad-min-${id}`;
  const kfName = `pulse-min-${id}`;
  const cls: [string, string, string] = [`pw-min-${id}-a`, `pw-min-${id}-b`, `pw-min-${id}-c`];

  return (
    <svg
      width={px}
      height={px}
      viewBox="0 0 100 100"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden={label ? undefined : true}
      aria-label={label}
      role={label ? 'img' : undefined}
    >
      <Defs gradId={gradId} animated={animated} kfName={kfName} cls={cls} />
      {animated && <Ripples kfName={kfName} cls={cls} />}
      <Rings gradId={gradId} variant="minimal" />
    </svg>
  );
}

// ── PulseLockupH — horizontal: symbol + wordmark (min 120px wide) ─────────
export interface PulseLockupProps {
  /** Total width. Min 120px for H, min 64px for V. */
  width?: number;
  animated?: boolean;
  /** Text color for wordmark. Defaults to #F5ECE4 */
  color?: string;
}

export function PulseLockupH({ width = 120, animated = false, color = '#F5ECE4' }: PulseLockupProps) {
  const w = Math.max(120, width);
  // Symbol occupies ~25% of total width, min 32px
  const symbolSize = Math.max(32, Math.round(w * 0.25));
  const gap = Math.round(symbolSize * 0.3);
  const textH = symbolSize;

  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap,
        width: w,
        minWidth: 120,
        userSelect: 'none',
      }}
    >
      <PulseSymbol size={symbolSize} animated={animated} />
      <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', lineHeight: 1 }}>
        <span style={{
          fontFamily: "'Sora', sans-serif",
          fontWeight: 700,
          fontSize: Math.round(textH * 0.35),
          color,
          letterSpacing: 1,
        }}>
          PULSO
        </span>
        <span style={{
          fontFamily: "'Sora', sans-serif",
          fontWeight: 300,
          fontSize: Math.round(textH * 0.18),
          color: 'rgba(168,150,154,0.7)',
          letterSpacing: 3,
          marginTop: 2,
        }}>
          CULTURAL
        </span>
      </div>
    </div>
  );
}

// ── PulseLockupV — stacked: symbol above wordmark (min 64px wide) ─────────
export function PulseLockupV({ width = 64, animated = false, color = '#F5ECE4' }: PulseLockupProps) {
  const w = Math.max(64, width);
  const symbolSize = Math.max(32, Math.round(w * 0.55));

  return (
    <div
      style={{
        display: 'inline-flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: Math.round(symbolSize * 0.18),
        width: w,
        minWidth: 64,
        userSelect: 'none',
      }}
    >
      <PulseSymbol size={symbolSize} animated={animated} />
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', lineHeight: 1 }}>
        <span style={{
          fontFamily: "'Sora', sans-serif",
          fontWeight: 700,
          fontSize: Math.round(symbolSize * 0.24),
          color,
          letterSpacing: 1,
        }}>
          PULSO
        </span>
        <span style={{
          fontFamily: "'Sora', sans-serif",
          fontWeight: 300,
          fontSize: Math.round(symbolSize * 0.13),
          color: 'rgba(168,150,154,0.7)',
          letterSpacing: 3,
          marginTop: 2,
        }}>
          CULTURAL
        </span>
      </div>
    </div>
  );
}
