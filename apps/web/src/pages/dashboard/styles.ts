// Shared design tokens for the dashboard tabs.
import type React from 'react';

export const COLORS = {
  bg: '#0B0710',
  panel: '#1E1924',
  panelAlt: '#251F2C',
  border: 'rgba(255,255,255,0.04)',
  borderInput: 'rgba(255,255,255,0.06)',
  borderActive: 'rgba(240,66,106,0.35)',
  text: '#F5F0EA',
  muted: '#8A7E8E',
  faint: '#5C5263',
  // Brand: pink → coral → orange → amber
  brand: '#F0426A',     // pink (primary)
  brand2: '#FF5E5B',    // coral
  orange: '#F59E42',    // orange
  amber: '#E8A33D',     // amber
  green: '#48BB78',
  purple: '#9B59B6',
  blue: '#3B82F6',
};

// Brand gradient — used in metric numbers, QR card, primary buttons.
export const GRADIENT_PULSE = 'linear-gradient(135deg, #F0426A 0%, #FF5E5B 50%, #F59E42 100%)';
// Vertical bar gradient — used in chart bars.
export const GRADIENT_BAR   = 'linear-gradient(180deg, #F0426A 0%, #FF5E5B 60%, #F59E42 100%)';

export const card: React.CSSProperties = {
  background: COLORS.panel,
  border: `1px solid ${COLORS.border}`,
  borderRadius: 14,
  padding: 20,
};

export const sectionTitle: React.CSSProperties = {
  fontFamily: "'Sora', sans-serif",
  fontSize: 14,
  color: COLORS.text,
  margin: '0 0 12px',
  fontWeight: 600,
};

export const sectionMeta: React.CSSProperties = {
  fontFamily: "'Space Mono', monospace",
  fontSize: 9.5,
  letterSpacing: 2,
  color: COLORS.faint,
};

export const inputBase: React.CSSProperties = {
  width: '100%',
  padding: '10px 12px',
  borderRadius: 10,
  border: `1px solid ${COLORS.borderInput}`,
  background: COLORS.bg,
  color: COLORS.text,
  fontFamily: "'DM Sans', sans-serif",
  fontSize: 13,
  outline: 'none',
  boxSizing: 'border-box',
};

export const labelStyle: React.CSSProperties = {
  display: 'block',
  fontFamily: "'DM Sans', sans-serif",
  fontSize: 11.5,
  color: COLORS.muted,
  marginBottom: 6,
};

export const btnPrimary: React.CSSProperties = {
  background: GRADIENT_PULSE,
  border: 'none',
  borderRadius: 10,
  padding: '10px 18px',
  color: '#fff',
  fontFamily: "'Sora', sans-serif",
  fontSize: 12.5,
  fontWeight: 600,
  cursor: 'pointer',
};

export const btnGhost: React.CSSProperties = {
  background: 'transparent',
  border: `1px solid ${COLORS.brand}`,
  borderRadius: 10,
  padding: '10px 18px',
  color: COLORS.brand,
  fontFamily: "'Sora', sans-serif",
  fontSize: 12.5,
  fontWeight: 600,
  cursor: 'pointer',
};

export const btnSecondary: React.CSSProperties = {
  background: 'transparent',
  border: `1px solid ${COLORS.border}`,
  borderRadius: 10,
  padding: '9px 14px',
  color: COLORS.text,
  fontFamily: "'Sora', sans-serif",
  fontSize: 11.5,
  cursor: 'pointer',
};

export const btnDanger: React.CSSProperties = {
  background: 'transparent',
  border: '1px solid rgba(232,85,78,0.4)',
  borderRadius: 10,
  padding: '9px 14px',
  color: '#F2A29F',
  fontFamily: "'Sora', sans-serif",
  fontSize: 11.5,
  cursor: 'pointer',
};

export const aoVivoPill: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 8,
  padding: '6px 14px',
  borderRadius: 100,
  border: `1px solid ${COLORS.brand}`,
  background: 'rgba(232,85,78,0.08)',
  color: COLORS.brand,
  fontFamily: "'Space Mono', monospace",
  fontSize: 10,
  letterSpacing: 2,
};

export function statusColor(s: string): string {
  if (s === 'ACTIVE') return COLORS.green;
  if (s === 'DRAFT') return COLORS.muted;
  return COLORS.faint;
}

export const STATUS_LABEL: Record<string, string> = {
  ACTIVE: 'Ativa',
  DRAFT: 'Programada',
  ENDED: 'Encerrada',
};

export function pulseDot(): React.CSSProperties {
  return {
    display: 'inline-block',
    width: 8,
    height: 8,
    borderRadius: '50%',
    background: COLORS.brand,
    boxShadow: `0 0 8px ${COLORS.brand}`,
    animation: 'pulse 1.5s infinite ease-in-out',
  };
}

export const pulseKeyframes = `@keyframes pulse { 0% { opacity: 1; transform: scale(1); } 50% { opacity: 0.5; transform: scale(1.3); } 100% { opacity: 1; transform: scale(1); } }`;

/**
 * Hover/active interactivity for any button rendered with one of the helper styles
 * (btnPrimary / btnGhost / btnSecondary / btnDanger). Add className="pulso-btn"
 * to opt in. Inline styles can't express :hover; we lift it to a stylesheet block
 * injected once at the dashboard root.
 */
/**
 * Sweeping hover/active behaviour for all interactive elements inside the
 * dashboard's <main>. Buttons that are inline-styled get a transform + filter
 * lift; sidebar nav items get a background tint; table rows get a subtle hover.
 * The `.pulso-btn` class is also accepted as an explicit opt-in.
 */
export const dashboardCss = `
  .pulso-dashboard button:not(:disabled),
  .pulso-btn:not(:disabled) {
    transition: transform 0.12s ease, box-shadow 0.18s ease, filter 0.18s ease, background 0.18s ease, border-color 0.18s ease, color 0.18s ease;
  }
  .pulso-dashboard button:not(:disabled):hover,
  .pulso-btn:not(:disabled):hover {
    filter: brightness(1.08);
    transform: translateY(-1px);
  }
  .pulso-dashboard button:not(:disabled):active,
  .pulso-btn:not(:disabled):active {
    transform: translateY(0);
    filter: brightness(0.92);
  }
  .pulso-dashboard button:disabled { cursor: not-allowed; }

  .pulso-dashboard select,
  .pulso-dashboard input,
  .pulso-dashboard textarea {
    transition: border-color 0.15s ease, background 0.15s ease;
  }
  /* Native <option> dropdowns inherit OS styling on Chrome/Edge — force the
     dark panel background + readable text so options aren't white-on-white. */
  .pulso-dashboard select option {
    background: ${COLORS.panel};
    color: ${COLORS.text};
  }
  .pulso-dashboard input:hover,
  .pulso-dashboard textarea:hover,
  .pulso-dashboard select:hover {
    border-color: rgba(255,255,255,0.18) !important;
  }
  .pulso-dashboard input:focus,
  .pulso-dashboard textarea:focus,
  .pulso-dashboard select:focus {
    border-color: ${COLORS.brand} !important;
    background: rgba(232,85,78,0.04) !important;
  }

  .pulso-card-clickable {
    transition: transform 0.15s ease, border-color 0.18s ease, background 0.18s ease;
  }
  .pulso-card-clickable:hover {
    transform: translateY(-2px);
    border-color: rgba(232,85,78,0.35) !important;
    background: rgba(255,255,255,0.06) !important;
  }

  .pulso-dashboard table tbody tr {
    transition: background 0.15s ease;
  }
  .pulso-dashboard table tbody tr:hover {
    background: rgba(232,85,78,0.04);
  }

  .pulso-tab-item {
    transition: background 0.15s ease, color 0.15s ease, border-left-color 0.15s ease;
  }
  .pulso-tab-item:not(.active):hover {
    background: rgba(255,255,255,0.03);
    color: ${COLORS.text};
  }

  .pulso-dashboard .recharts-bar-rectangle {
    transition: opacity 0.15s ease;
  }
  .pulso-dashboard .recharts-bar-rectangle:hover {
    opacity: 0.85;
  }
`;

