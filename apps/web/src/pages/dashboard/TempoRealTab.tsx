import { useEffect, useState } from 'react';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend,
} from 'recharts';
import { api } from '../../services/api';
import { card, COLORS, sectionTitle, sectionMeta } from './styles';

interface ResumoHoje {
  entradas_hoje: number;
  saidas_hoje: number;
  checkins_hoje: number;
  ocupacao_atual: number;
  ocupacao_pico: number | null;
  atualizado_em: string;
}

interface HistoricoDia {
  data: string;
  entradas: number;
  saidas: number;
  checkins: number;
}

interface TrendPoint {
  hour: string;
  entries: number;
  exits: number;
  checkins: number;
}

interface Comparacao {
  ocupacao_vs_mesma_hora_ontem: number | null;
  entradas_vs_ontem: number | null;
}

interface Props {
  exhibitionId: string;
}

const DOW_SHORT = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

function pctLabel(pct: number | null | undefined, suffix: string): string | null {
  if (pct === null || pct === undefined) return null;
  if (pct === 0) return `→ estável ${suffix}`;
  const arrow = pct > 0 ? '↑' : '↓';
  return `${arrow} ${Math.abs(pct)}% ${suffix}`;
}

function StatBig({
  value,
  label,
  color,
  hint,
  hintColor,
}: {
  value: React.ReactNode;
  label: string;
  color?: string;
  hint?: string | null;
  hintColor?: string;
}) {
  return (
    <div style={{ ...card, padding: 20 }}>
      <p style={{
        fontFamily: "'Sora', sans-serif",
        fontSize: 36,
        fontWeight: 700,
        margin: 0,
        color: color || COLORS.text,
        lineHeight: 1,
        letterSpacing: -1,
      }}>
        {value}
      </p>
      <p style={{
        fontFamily: "'DM Sans', sans-serif",
        fontSize: 12.5,
        color: COLORS.muted,
        margin: '12px 0 6px',
      }}>
        {label}
      </p>
      {hint && (
        <p style={{
          fontFamily: "'Space Mono', monospace",
          fontSize: 10,
          color: hintColor || COLORS.green,
          margin: 0,
          letterSpacing: 0.5,
        }}>
          {hint}
        </p>
      )}
    </div>
  );
}

export function TempoRealTab({ exhibitionId }: Props) {
  const [hoje, setHoje] = useState<ResumoHoje | null>(null);
  const [trends, setTrends] = useState<TrendPoint[]>([]);
  const [historico, setHistorico] = useState<HistoricoDia[]>([]);
  const [comparacao, setComparacao] = useState<Comparacao | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = async () => {
    try {
      const promises: Promise<any>[] = [
        api.get('/resumo/hoje'),
        api.get('/resumo/historico'),
        api.get('/resumo/comparacao'),
      ];
      if (exhibitionId) promises.push(api.get(`/analytics/trends/${exhibitionId}`));

      const results = await Promise.all(promises);
      setHoje(results[0].data);
      setHistorico((results[1].data as HistoricoDia[]).slice().reverse());
      setComparacao(results[2].data);
      if (exhibitionId) setTrends(results[3].data || []);
      setError(null);
    } catch (err: any) {
      setError(err?.response?.data?.error || err?.message || 'Falha ao carregar');
    }
  };

  useEffect(() => {
    refresh();
    const id = setInterval(refresh, 30_000);
    return () => clearInterval(id);
  }, [exhibitionId]);

  // Weekly comparison: camera entries vs check-ins per day
  const weekly = historico.map(d => {
    const date = new Date(d.data);
    const dow = DOW_SHORT[date.getDay()];
    return { day: dow, camera: d.entradas, checkins: d.checkins };
  });

  const adesao = hoje && hoje.entradas_hoje > 0
    ? Math.round((hoje.checkins_hoje / hoje.entradas_hoje) * 100)
    : null;

  const ocupHint = pctLabel(comparacao?.ocupacao_vs_mesma_hora_ontem, 'vs. mesma hora ontem');
  const ocupHintColor = (comparacao?.ocupacao_vs_mesma_hora_ontem ?? 0) >= 0 ? COLORS.green : COLORS.brand;

  const pulsosHint = pctLabel(comparacao?.entradas_vs_ontem, 'vs. ontem');
  const pulsosHintColor = (comparacao?.entradas_vs_ontem ?? 0) >= 0 ? COLORS.green : COLORS.brand;

  return (
    <div>
      {error && (
        <div style={{ ...card, borderColor: 'rgba(232,85,78,0.3)', background: 'rgba(232,85,78,0.08)', color: '#F2A29F', marginBottom: 20 }}>
          ⚠️ {error}
        </div>
      )}

      {/* Stat row — pixel close to mockup */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 16, marginBottom: 24 }}>
        <StatBig
          value={hoje?.ocupacao_atual ?? '—'}
          label="Pessoas no espaço agora"
          color={COLORS.brand}
          hint={ocupHint}
          hintColor={ocupHintColor}
        />
        <StatBig
          value={hoje?.entradas_hoje?.toLocaleString('pt-BR') ?? '—'}
          label="Pulsos hoje"
          color={COLORS.text}
          hint={pulsosHint}
          hintColor={pulsosHintColor}
        />
        <StatBig
          value={hoje?.checkins_hoje?.toLocaleString('pt-BR') ?? '—'}
          label="Check-ins hoje"
          color={COLORS.orange}
          hint={adesao !== null ? `${adesao}% de adesão` : null}
          hintColor={COLORS.orange}
        />
        <StatBig
          value="—"
          label="Tempo médio no espaço"
          color={COLORS.faint}
          hint="Sem dwell tracking"
          hintColor={COLORS.faint}
        />
      </div>

      {/* Hourly flow — fixed Y scale 0/70/140/210/280 + pulse gradient bars */}
      <div style={{ ...card, marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', marginBottom: 20 }}>
          <h3 style={{ ...sectionTitle, margin: 0, flex: 1, fontSize: 15 }}>Fluxo de visitantes por hora</h3>
          <span style={sectionMeta}>HOJE</span>
        </div>
        {trends.length === 0 ? (
          <div style={{ height: 220, display: 'flex', alignItems: 'center', justifyContent: 'center', color: COLORS.faint }}>
            Sem dados ainda
          </div>
        ) : (
          <div style={{ width: '100%', height: 240 }}>
            <ResponsiveContainer>
              <BarChart data={trends.map(t => ({ hour: t.hour, value: t.entries }))} margin={{ top: 10, right: 6, bottom: 0, left: -16 }} barCategoryGap={12}>
                <defs>
                  <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%"   stopColor="#F0426A" stopOpacity={1} />
                    <stop offset="60%"  stopColor="#FF5E5B" stopOpacity={1} />
                    <stop offset="100%" stopColor="#F59E42" stopOpacity={1} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="hour" stroke={COLORS.faint} fontSize={10} tickLine={false} axisLine={{ stroke: COLORS.border }} />
                <YAxis stroke={COLORS.faint} fontSize={10} tickLine={false} axisLine={false} ticks={[0, 70, 140, 210, 280]} domain={[0, 280]} />
                <Tooltip
                  cursor={{ fill: 'rgba(255,255,255,0.04)' }}
                  contentStyle={{ background: COLORS.panelAlt, border: `1px solid ${COLORS.border}`, borderRadius: 8 }}
                  labelFormatter={label => `Hora: ${label}`}
                />
                <Bar dataKey="value" radius={[6, 6, 2, 2]} fill="url(#barGradient)" maxBarSize={36} isAnimationActive={false} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Weekly comparison — paired bars (pulse + amber) with fixed Y 0/200/400/600/800 */}
      <div style={card}>
        <div style={{ display: 'flex', alignItems: 'baseline', marginBottom: 20 }}>
          <h3 style={{ ...sectionTitle, margin: 0, flex: 1, fontSize: 15 }}>Comparativo semanal</h3>
          <span style={sectionMeta}>CÂMERA VS CHECK-IN</span>
        </div>
        {weekly.length === 0 ? (
          <div style={{ height: 220, display: 'flex', alignItems: 'center', justifyContent: 'center', color: COLORS.faint }}>
            Sem dados ainda
          </div>
        ) : (
          <div style={{ width: '100%', height: 240 }}>
            <ResponsiveContainer>
              <BarChart data={weekly} margin={{ top: 10, right: 6, bottom: 0, left: -16 }} barCategoryGap={12} barGap={4}>
                <defs>
                  <linearGradient id="weeklyPulse" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%"   stopColor="#F0426A" />
                    <stop offset="60%"  stopColor="#FF5E5B" />
                    <stop offset="100%" stopColor="#F59E42" />
                  </linearGradient>
                  <linearGradient id="weeklyAmber" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%"   stopColor="#E8A33D" />
                    <stop offset="100%" stopColor="#B97826" />
                  </linearGradient>
                </defs>
                <XAxis dataKey="day" stroke={COLORS.faint} fontSize={10} tickLine={false} axisLine={{ stroke: COLORS.border }} />
                <YAxis stroke={COLORS.faint} fontSize={10} tickLine={false} axisLine={false} ticks={[0, 200, 400, 600, 800]} domain={[0, 800]} />
                <Tooltip
                  cursor={{ fill: 'rgba(255,255,255,0.04)' }}
                  contentStyle={{ background: COLORS.panelAlt, border: `1px solid ${COLORS.border}`, borderRadius: 8 }}
                />
                <Legend
                  wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
                  iconType="circle"
                  iconSize={8}
                  formatter={(value) => (
                    <span style={{ color: COLORS.muted, fontSize: 12, fontFamily: "'DM Sans', sans-serif" }}>{value}</span>
                  )}
                />
                <Bar dataKey="camera"   name="Câmera (total)"        fill="url(#weeklyPulse)" radius={[5, 5, 2, 2]} maxBarSize={18} isAnimationActive={false} />
                <Bar dataKey="checkins" name="Check-in (voluntário)" fill="url(#weeklyAmber)" radius={[5, 5, 2, 2]} maxBarSize={18} isAnimationActive={false} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
}
