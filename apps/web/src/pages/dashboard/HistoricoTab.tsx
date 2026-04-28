import { useEffect, useState } from 'react';
import {
  ResponsiveContainer, LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  PieChart, Pie, Cell,
} from 'recharts';
import { api } from '../../services/api';
import { useRealtimeUpdates } from '../../services/useRealtimeUpdates';
import { card, COLORS, sectionTitle, sectionMeta } from './styles';

interface HistoricoDia {
  data: string;
  entradas: number;
  saidas: number;
  checkins: number;
}

interface Acumulado {
  camera: number;
  checkins: number;
  retorno: number;
  multiplicador: string | number;
}

interface Recorrencia {
  total_visitors_com_checkin: number;
  primeira_visita: number;
  retorno: number;
  taxa_retorno_pct: number;
  total_checkins: number;
}

interface ComparacaoMensal {
  pulsos_mes_atual: number;
  pulsos_mesmo_periodo_mes_anterior: number;
  pulsos_pct_vs_mes_anterior: number | null;
  checkins_mes_atual: number;
}

interface Props {
  exhibitionId: string;
}

function StatHero({ value, label, color, hint, hintColor }: {
  value: React.ReactNode;
  label: string;
  color?: string;
  hint?: string | null;
  hintColor?: string;
}) {
  return (
    <div style={{ ...card, padding: 22 }}>
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
      <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: COLORS.muted, margin: '12px 0 0' }}>
        {label}
      </p>
      {hint && (
        <p style={{
          fontFamily: "'Space Mono', monospace",
          fontSize: 10,
          color: hintColor || COLORS.green,
          margin: '6px 0 0',
        }}>
          {hint}
        </p>
      )}
    </div>
  );
}

// Group 30-day data into 4 weeks for "Evolução semanal"
function aggregateByWeek(historico: HistoricoDia[]): { week: string; camera: number; checkins: number }[] {
  if (historico.length === 0) return [];
  // Reverse: oldest first
  const ordered = historico.slice().reverse();
  const buckets: { week: string; camera: number; checkins: number }[] = [];
  for (let i = 0; i < 4; i++) {
    const slice = ordered.slice(i * 7, (i + 1) * 7);
    const camera = slice.reduce((s, d) => s + d.entradas, 0);
    const checkins = slice.reduce((s, d) => s + d.checkins, 0);
    buckets.push({ week: `Sem ${i + 1}`, camera, checkins });
  }
  return buckets;
}

export function HistoricoTab({ exhibitionId: _ }: Props) {
  const [historico30, setHistorico30] = useState<HistoricoDia[]>([]);
  const [acumulado, setAcumulado] = useState<Acumulado | null>(null);
  const [recorrencia, setRecorrencia] = useState<Recorrencia | null>(null);
  const [mensal, setMensal] = useState<ComparacaoMensal | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = () => Promise.all([
    api.get('/resumo/historico?days=30'),
    api.get('/historico'),
    api.get('/resumo/recorrencia'),
    api.get('/resumo/comparacao-mensal'),
  ])
    .then(([h, a, r, m]) => {
      setHistorico30(h.data || []);
      setAcumulado(a.data);
      setRecorrencia(r.data);
      setMensal(m.data);
      setError(null);
    })
    .catch(err => setError(err?.response?.data?.error || err?.message || 'Falha ao carregar'));

  useEffect(() => { refresh(); }, []);
  useRealtimeUpdates(refresh);

  const weekly = aggregateByWeek(historico30);
  // Daily series: oldest → newest, with day index 1..30
  const daily = historico30.slice().reverse().map((d, i) => ({
    day: i + 1,
    camera: d.entradas,
    checkins: d.checkins,
  }));

  const livroEstimado = acumulado && Number(acumulado.multiplicador) > 0
    ? Math.round(acumulado.camera / Number(acumulado.multiplicador))
    : null;

  const recurrenceDonut = recorrencia
    ? [
        { name: '1ª visita', value: recorrencia.primeira_visita },
        { name: 'Retorno',   value: recorrencia.retorno },
      ]
    : [];

  return (
    <div>
      {error && (
        <div style={{ ...card, borderColor: 'rgba(232,85,78,0.3)', background: 'rgba(232,85,78,0.08)', color: '#F2A29F', marginBottom: 20 }}>
          ⚠️ {error}
        </div>
      )}

      {/* 4 hero stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 16, marginBottom: 24 }}>
        <StatHero
          value={mensal?.pulsos_mes_atual?.toLocaleString('pt-BR') ?? '—'}
          label="Total de pulsos no mês"
          color={COLORS.text}
          hint={mensal?.pulsos_pct_vs_mes_anterior !== null && mensal?.pulsos_pct_vs_mes_anterior !== undefined
            ? `${mensal.pulsos_pct_vs_mes_anterior >= 0 ? '↑' : '↓'} ${Math.abs(mensal.pulsos_pct_vs_mes_anterior)}% vs. mês anterior`
            : null}
          hintColor={(mensal?.pulsos_pct_vs_mes_anterior ?? 0) >= 0 ? COLORS.green : COLORS.brand}
        />
        <StatHero
          value={mensal?.checkins_mes_atual?.toLocaleString('pt-BR') ?? '—'}
          label="Check-ins no mês"
          color={COLORS.orange}
        />
        <StatHero
          value={recorrencia?.taxa_retorno_pct !== undefined ? `${recorrencia.taxa_retorno_pct}%` : '—'}
          label="Taxa de retorno"
          color={COLORS.green}
          hint="Visitantes que voltaram"
          hintColor={COLORS.green}
        />
        <StatHero
          value={acumulado ? `${acumulado.multiplicador}×` : '—'}
          label="Câmera vs. Livro"
          color={COLORS.brand}
          hint={livroEstimado !== null ? `Estimativa livro: ~${livroEstimado.toLocaleString('pt-BR')}` : null}
          hintColor={COLORS.green}
        />
      </div>

      {/* Recorrência donut + Evolução semanal */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(380px,1fr))', gap: 16, marginBottom: 24 }}>
        <div style={{ ...card, padding: 22 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', marginBottom: 18 }}>
            <h3 style={{ ...sectionTitle, margin: 0, flex: 1 }}>Recorrência</h3>
          </div>
          {recurrenceDonut.length === 0 || recorrencia?.total_visitors_com_checkin === 0 ? (
            <div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', color: COLORS.faint }}>
              Sem dados ainda
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
              <div style={{ width: 160, height: 160, flexShrink: 0 }}>
                <ResponsiveContainer>
                  <PieChart>
                    <Pie data={recurrenceDonut} dataKey="value" nameKey="name" innerRadius={48} outerRadius={75} paddingAngle={2} isAnimationActive={false}>
                      <Cell fill={COLORS.brand} stroke="none" />
                      <Cell fill={COLORS.green} stroke="none" />
                    </Pie>
                    <Tooltip contentStyle={{ background: '#1C1620', border: `1px solid ${COLORS.border}`, borderRadius: 8 }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                  <span style={{ width: 10, height: 10, borderRadius: 3, background: COLORS.brand }} />
                  <span style={{ flex: 1, color: COLORS.text, fontSize: 13 }}>1ª visita</span>
                  <span style={{ color: COLORS.text, fontWeight: 700 }}>
                    {recorrencia ? Math.round((recorrencia.primeira_visita / Math.max(recorrencia.total_visitors_com_checkin, 1)) * 100) : 0}%
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ width: 10, height: 10, borderRadius: 3, background: COLORS.green }} />
                  <span style={{ flex: 1, color: COLORS.text, fontSize: 13 }}>Retorno</span>
                  <span style={{ color: COLORS.text, fontWeight: 700 }}>{recorrencia?.taxa_retorno_pct ?? 0}%</span>
                </div>
                {recorrencia && recorrencia.total_visitors_com_checkin > 0 && (
                  <p style={{ fontSize: 12, color: COLORS.muted, marginTop: 14, marginBottom: 0 }}>
                    De {recorrencia.total_visitors_com_checkin} visitantes com check-in,{' '}
                    {recorrencia.retorno} retornaram pelo menos uma vez.
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        <div style={{ ...card, padding: 22 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', marginBottom: 18 }}>
            <h3 style={{ ...sectionTitle, margin: 0, flex: 1 }}>Evolução semanal</h3>
            <span style={sectionMeta}>CÂMERA VS CHECK-IN</span>
          </div>
          {weekly.length === 0 || weekly.every(w => w.camera + w.checkins === 0) ? (
            <div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', color: COLORS.faint }}>
              Sem dados ainda
            </div>
          ) : (
            <div style={{ height: 200 }}>
              <ResponsiveContainer>
                <LineChart data={weekly} margin={{ top: 10, right: 10, bottom: 0, left: -10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
                  <XAxis dataKey="week" stroke={COLORS.faint} fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis stroke={COLORS.faint} fontSize={10} tickLine={false} axisLine={false} />
                  <Tooltip cursor={{ stroke: 'rgba(255,255,255,0.1)' }} contentStyle={{ background: '#1C1620', border: `1px solid ${COLORS.border}`, borderRadius: 8 }} />
                  <Line type="monotone" dataKey="camera" name="Câmera" stroke={COLORS.brand} strokeWidth={2} dot={{ fill: COLORS.brand, r: 4 }} isAnimationActive={false} />
                  <Line type="monotone" dataKey="checkins" name="Check-in" stroke={COLORS.orange} strokeWidth={2} dot={{ fill: COLORS.orange, r: 4 }} isAnimationActive={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>

      {/* 30-day daily area chart */}
      <div style={{ ...card, padding: 22 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', marginBottom: 18 }}>
          <h3 style={{ ...sectionTitle, margin: 0, flex: 1 }}>Visitantes por dia (últimos 30 dias)</h3>
          <span style={sectionMeta}>CÂMERA</span>
        </div>
        {daily.length === 0 || daily.every(d => d.camera + d.checkins === 0) ? (
          <div style={{ height: 240, display: 'flex', alignItems: 'center', justifyContent: 'center', color: COLORS.faint }}>
            Sem dados ainda
          </div>
        ) : (
          <div style={{ height: 280 }}>
            <ResponsiveContainer>
              <AreaChart data={daily} margin={{ top: 10, right: 10, bottom: 0, left: -10 }}>
                <defs>
                  <linearGradient id="cameraArea" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={COLORS.brand} stopOpacity={0.6} />
                    <stop offset="100%" stopColor={COLORS.brand} stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="checkinArea" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={COLORS.orange} stopOpacity={0.5} />
                    <stop offset="100%" stopColor={COLORS.orange} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
                <XAxis dataKey="day" stroke={COLORS.faint} fontSize={10} tickLine={false} axisLine={false} />
                <YAxis stroke={COLORS.faint} fontSize={10} tickLine={false} axisLine={false} />
                <Tooltip cursor={{ stroke: 'rgba(255,255,255,0.1)' }} contentStyle={{ background: '#1C1620', border: `1px solid ${COLORS.border}`, borderRadius: 8 }} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Area type="monotone" dataKey="camera" name="Câmera" stroke={COLORS.brand} strokeWidth={2} fill="url(#cameraArea)" isAnimationActive={false} />
                <Area type="monotone" dataKey="checkins" name="Check-in" stroke={COLORS.orange} strokeWidth={2} fill="url(#checkinArea)" isAnimationActive={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
}
