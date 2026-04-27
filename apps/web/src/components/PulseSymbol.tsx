// ============================================================
// PulseSymbol — implementação canônica
// Geometria exata: Brand Guide Pulso Cultural, Seção 08
//
// SÍMBOLO COMPLETO — viewBox 0 0 100 100
//   outer  r=44  stroke=#F28C38  sw=0.8  op=0.25
//   mid    r=32  stroke=#D4267E  sw=1.5  op=0.35
//   inner  r=20  stroke=#E8554E  sw=2.2  op=0.55
//   core   r=8   fill radialGradient cx=42% cy=38%
//
// SÍMBOLO MÍNIMO — viewBox 0 0 32 32 (favicon / ícone)
//   inner  r=12  stroke=#E8554E  sw=2.5  op=0.50
//   core   r=5   fill radialGradient cx=42% cy=38%
//
// LOCKUP H — viewBox 0 0 240 56 (texto SVG nativo)
//   símbolo em cx=28,cy=28 com rings escalados
//   texto "PULSO" + "CULTURAL" em Sora
//
// ÁREA DE PROTEÇÃO: padding mínimo = 1× diâmetro do core
//   100x100: core diam = 16 viewBox units ≈ 16% do tamanho renderizado
//   32x32:   core diam = 10 viewBox units ≈ 31% do tamanho renderizado
//
// TAMANHO MÍNIMO:
//   PulseSymbol        → min 32px
//   PulseSymbolMinimal → min 16px
//   PulseLockupH       → min 120px largura
//   PulseLockupV       → min 64px largura
// ============================================================

import { useRef } from 'react';

// ── Unique ID per instance (avoids gradient collision em múltiplas instâncias) ──
let _uid = 0;
function useUid() {
  const ref = useRef<number | null>(null);
  if (ref.current === null) ref.current = ++_uid;
  return ref.current;
}

// ── Types ─────────────────────────────────────────────────────────────────────
export interface PulseSymbolProps {
  /** Tamanho renderizado em px. Mínimo aplicado automaticamente. */
  size?: number;
  /** Ativa a animação de ripple. */
  animated?: boolean;
  /** Rótulo acessível. Sem rótulo → aria-hidden. */
  label?: string;
  className?: string;
  style?: React.CSSProperties;
}

export interface PulseLockupProps {
  /** Largura total em px. Mínimo: 120px (H) / 64px (V). */
  width?: number;
  animated?: boolean;
  /** Cor do wordmark. Padrão: #F5ECE4 */
  color?: string;
  className?: string;
  style?: React.CSSProperties;
}

// ══════════════════════════════════════════════════════════════════════════════
// PulseSymbol — símbolo completo 3 anéis (min 32px)
// viewBox 0 0 100 100 | geometria spec seção 08
// ══════════════════════════════════════════════════════════════════════════════
export function PulseSymbol({
  size = 48,
  animated = true,
  label,
  className,
  style,
}: PulseSymbolProps) {
  const id = useUid();
  const px  = Math.max(32, size);

  const gradId  = `pc-core-${id}`;
  const kfName  = `pc-pulse-${id}`;
  const clsA    = `pc-rw-${id}-a`;
  const clsB    = `pc-rw-${id}-b`;
  const clsC    = `pc-rw-${id}-c`;

  // Ripple: r=8 (core edge) → r=44 (outer ring edge)
  const rippleCSS = animated ? `
    @keyframes ${kfName} {
      0%   { opacity: 0.65; r: 8px;  }
      100% { opacity: 0;    r: 44px; }
    }
    .${clsA} { animation: ${kfName} 2400ms ease-out infinite    0ms; }
    .${clsB} { animation: ${kfName} 2400ms ease-out infinite  800ms; }
    .${clsC} { animation: ${kfName} 2400ms ease-out infinite 1600ms; }
    @media (prefers-reduced-motion: reduce) {
      .${clsA}, .${clsB}, .${clsC} { animation: none; }
    }
  ` : '';

  return (
    <svg
      width={px} height={px}
      viewBox="0 0 100 100"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden={label ? undefined : true}
      aria-label={label}
      role={label ? 'img' : undefined}
      className={className}
      style={style}
    >
      <defs>
        <radialGradient id={gradId} cx="42%" cy="38%">
          <stop offset="0%"   stopColor="#F28C38" />
          <stop offset="100%" stopColor="#E8554E" />
        </radialGradient>
        {animated && <style>{rippleCSS}</style>}
      </defs>

      {/* Ripples — abaixo dos anéis estáticos */}
      {animated && <>
        <circle cx={50} cy={50} r={8} fill="none" stroke="#E8554E" strokeWidth={2.0} className={clsA} />
        <circle cx={50} cy={50} r={8} fill="none" stroke="#D4267E" strokeWidth={1.5} className={clsB} />
        <circle cx={50} cy={50} r={8} fill="none" stroke="#F28C38" strokeWidth={1.0} className={clsC} />
      </>}

      {/* Anel externo */}
      <circle cx={50} cy={50} r={44} fill="none" stroke="#F28C38" strokeWidth={0.8} opacity={0.25} />
      {/* Anel médio */}
      <circle cx={50} cy={50} r={32} fill="none" stroke="#D4267E" strokeWidth={1.5} opacity={0.35} />
      {/* Anel interno */}
      <circle cx={50} cy={50} r={20} fill="none" stroke="#E8554E" strokeWidth={2.2} opacity={0.55} />
      {/* Core */}
      <circle cx={50} cy={50} r={8}  fill={`url(#${gradId})`} />
    </svg>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// PulseSymbolMinimal — 1 anel + core (min 16px) — favicon / ícone app
// viewBox 0 0 32 32 | geometria spec seção 08
// ══════════════════════════════════════════════════════════════════════════════
export function PulseSymbolMinimal({
  size = 32,
  animated = false,
  label,
  className,
  style,
}: PulseSymbolProps) {
  const id = useUid();
  const px = Math.max(16, size);

  const gradId = `pc-core-min-${id}`;
  const kfName = `pc-pulse-min-${id}`;
  const clsA   = `pc-rmw-${id}-a`;

  const rippleCSS = animated ? `
    @keyframes ${kfName} {
      0%   { opacity: 0.65; r: 5px;  }
      100% { opacity: 0;    r: 12px; }
    }
    .${clsA} { animation: ${kfName} 2400ms ease-out infinite 0ms; }
  ` : '';

  return (
    <svg
      width={px} height={px}
      viewBox="0 0 32 32"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden={label ? undefined : true}
      aria-label={label}
      role={label ? 'img' : undefined}
      className={className}
      style={style}
    >
      <defs>
        <radialGradient id={gradId} cx="42%" cy="38%">
          <stop offset="0%"   stopColor="#F28C38" />
          <stop offset="100%" stopColor="#E8554E" />
        </radialGradient>
        {animated && <style>{rippleCSS}</style>}
      </defs>

      {/* Ripple */}
      {animated && (
        <circle cx={16} cy={16} r={5} fill="none" stroke="#E8554E" strokeWidth={2.5} className={clsA} />
      )}

      {/* Anel interno */}
      <circle cx={16} cy={16} r={12} fill="none" stroke="#E8554E" strokeWidth={2.5} opacity={0.5} />
      {/* Core */}
      <circle cx={16} cy={16} r={5}  fill={`url(#${gradId})`} />
    </svg>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// PulseLockupH — lockup horizontal em SVG puro (min 120px)
// viewBox 0 0 240 56 | geometria spec seção 08
// ══════════════════════════════════════════════════════════════════════════════
export function PulseLockupH({
  width = 240,
  animated = false,
  className,
  style,
}: PulseLockupProps) {
  const id    = useUid();
  const scale = Math.max(120, width) / 240; // escala proporcional
  const px    = Math.round(240 * scale);
  const py    = Math.round(56  * scale);

  const gradId = `pc-core-lk-${id}`;
  const kfName = `pc-pulse-lk-${id}`;
  const clsA   = `pc-lkw-${id}-a`;
  const clsB   = `pc-lkw-${id}-b`;

  const rippleCSS = animated ? `
    @keyframes ${kfName} {
      0%   { opacity: 0.6; r: 4.5px; }
      100% { opacity: 0;   r: 22px;  }
    }
    .${clsA} { animation: ${kfName} 2400ms ease-out infinite    0ms; }
    .${clsB} { animation: ${kfName} 2400ms ease-out infinite  800ms; }
  ` : '';

  return (
    <svg
      width={px} height={py}
      viewBox="0 0 240 56"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="Pulso Cultural"
      role="img"
      className={className}
      style={style}
    >
      <defs>
        <radialGradient id={gradId} cx="42%" cy="38%">
          <stop offset="0%"   stopColor="#F28C38" />
          <stop offset="100%" stopColor="#E8554E" />
        </radialGradient>
        {animated && <style>{rippleCSS}</style>}
      </defs>

      {/* Ripples */}
      {animated && <>
        <circle cx={28} cy={28} r={4.5} fill="none" stroke="#E8554E" strokeWidth={1.7} className={clsA} />
        <circle cx={28} cy={28} r={4.5} fill="none" stroke="#D4267E" strokeWidth={1.1} className={clsB} />
      </>}

      {/* Símbolo — cx=28, cy=28, rings escalados */}
      <circle cx={28} cy={28} r={22}  fill="none" stroke="#F28C38" strokeWidth={0.7} opacity={0.20} />
      <circle cx={28} cy={28} r={16}  fill="none" stroke="#D4267E" strokeWidth={1.1} opacity={0.30} />
      <circle cx={28} cy={28} r={10}  fill="none" stroke="#E8554E" strokeWidth={1.7} opacity={0.50} />
      <circle cx={28} cy={28} r={4.5} fill={`url(#${gradId})`} />

      {/* Wordmark */}
      <text x={62} y={26}
        fontFamily="Sora, sans-serif"
        fontWeight={700}
        fontSize={19}
        fill="#F5ECE4"
        letterSpacing={0.5}
      >
        PULSO
      </text>
      <text x={62} y={42}
        fontFamily="Sora, sans-serif"
        fontWeight={300}
        fontSize={9.5}
        fill="#A8969A"
        letterSpacing={3.5}
      >
        CULTURAL
      </text>
    </svg>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// PulseLockupV — lockup empilhado (min 64px)
// Usa SVG puro para garantir fontes do brand guide
// ══════════════════════════════════════════════════════════════════════════════
export function PulseLockupV({
  width = 100,
  animated = false,
  className,
  style,
}: PulseLockupProps) {
  const id    = useUid();
  const scale = Math.max(64, width) / 100;
  const px    = Math.round(100 * scale);
  const py    = Math.round(120 * scale);

  const gradId = `pc-core-lkv-${id}`;
  const kfName = `pc-pulse-lkv-${id}`;
  const clsA   = `pc-lkvw-${id}-a`;

  const rippleCSS = animated ? `
    @keyframes ${kfName} {
      0%   { opacity: 0.6; r: 8px;  }
      100% { opacity: 0;   r: 44px; }
    }
    .${clsA} { animation: ${kfName} 2400ms ease-out infinite 0ms; }
  ` : '';

  return (
    <svg
      width={px} height={py}
      viewBox="0 0 100 120"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="Pulso Cultural"
      role="img"
      className={className}
      style={style}
    >
      <defs>
        <radialGradient id={gradId} cx="42%" cy="38%">
          <stop offset="0%"   stopColor="#F28C38" />
          <stop offset="100%" stopColor="#E8554E" />
        </radialGradient>
        {animated && <style>{rippleCSS}</style>}
      </defs>

      {/* Ripple */}
      {animated && (
        <circle cx={50} cy={50} r={8} fill="none" stroke="#E8554E" strokeWidth={2.0} className={clsA} />
      )}

      {/* Símbolo completo centrado em cy=50 */}
      <circle cx={50} cy={50} r={44} fill="none" stroke="#F28C38" strokeWidth={0.8} opacity={0.25} />
      <circle cx={50} cy={50} r={32} fill="none" stroke="#D4267E" strokeWidth={1.5} opacity={0.35} />
      <circle cx={50} cy={50} r={20} fill="none" stroke="#E8554E" strokeWidth={2.2} opacity={0.55} />
      <circle cx={50} cy={50} r={8}  fill={`url(#${gradId})`} />

      {/* Wordmark — abaixo do símbolo */}
      <text x={50} y={104}
        fontFamily="Sora, sans-serif"
        fontWeight={700}
        fontSize={14}
        fill="#F5ECE4"
        letterSpacing={0.5}
        textAnchor="middle"
      >
        PULSO
      </text>
      <text x={50} y={116}
        fontFamily="Sora, sans-serif"
        fontWeight={300}
        fontSize={7}
        fill="#A8969A"
        letterSpacing={3}
        textAnchor="middle"
      >
        CULTURAL
      </text>
    </svg>
  );
}
