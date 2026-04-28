import { useEffect, useState } from 'react';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  PieChart, Pie, Cell,
} from 'recharts';
import { api } from '../../services/api';
import { card, COLORS, sectionTitle, sectionMeta } from './styles';

interface Demographics {
  gender: { name: string; value: number }[];
  origin: { name: string; value: number }[];
  ages: { faixa: string; v: number }[];
}

interface ChannelItem {
  channel: string;
  count: number;
  pct: number;
}

interface Props {
  exhibitionId: string;
  museumId?: string;
}

const GENDER_LABEL: Record<string, string> = {
  FEMININO: 'Feminino',
  MASCULINO: 'Masculino',
  NAO_BINARIO: 'Não-binário',
  PREFIRO_NAO_DIZER: 'Não informado',
};

const ORIGIN_LABEL: Record<string, string> = {
  SALVADOR: 'Salvador',
  INTERIOR_BA: 'Interior BA',
  OUTRO_ESTADO: 'Outro estado',
  INTERNACIONAL: 'Internacional',
};

const CHANNEL_LABEL: Record<string, string> = {
  REDES_SOCIAIS: 'Redes sociais',
  INDICACAO: 'Indicação',
  PASSOU_NA_FRENTE: 'Passou na frente',
  JORNAL_TV: 'Jornal / TV',
  ESCOLA_FACULDADE: 'Escola / faculdade',
  OUTRO: 'Outro',
};

const GENDER_COLORS = [COLORS.brand2, COLORS.brand, COLORS.orange, '#6B5A60'];
const ORIGIN_COLORS = [COLORS.brand, COLORS.brand2, COLORS.orange, '#F5C147'];

function StatHero({ value, label, color, hint, hintColor }: {
  value: React.ReactNode;
  label: string;
  color?: string;
  hint?: string | null;
  hintColor?: string;
}) {
  return (
    <div style={{ ...card, padding: 24 }}>
      <p style={{
        fontFamily: "'Sora', sans-serif",
        fontSize: 40,
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
        fontSize: 13,
        color: COLORS.muted,
        margin: '14px 0 0',
      }}>
        {label}
      </p>
      {hint && (
        <p style={{
          fontFamily: "'Space Mono', monospace",
          fontSize: 10,
          color: hintColor || COLORS.green,
          margin: '6px 0 0',
          letterSpacing: 0.5,
        }}>
          {hint}
        </p>
      )}
    </div>
  );
}

function DonutLegend({
  data, colors,
}: {
  data: { name: string; value: number }[];
  colors: string[];
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 32 }}>
      <div style={{ width: 160, height: 160, flexShrink: 0 }}>
        <ResponsiveContainer>
          <PieChart>
            <Pie data={data} dataKey="value" nameKey="name" innerRadius={48} outerRadius={75} paddingAngle={2} isAnimationActive={false}>
              {data.map((_, i) => <Cell key={i} fill={colors[i % colors.length]} stroke="none" />)}
            </Pie>
            <Tooltip contentStyle={{ background: '#1C1620', border: `1px solid ${COLORS.border}`, borderRadius: 8 }} />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 10 }}>
        {data.map((d, i) => (
          <div key={d.name} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{
              width: 10, height: 10, borderRadius: 3,
              background: colors[i % colors.length], flexShrink: 0,
            }} />
            <span style={{ flex: 1, color: COLORS.text, fontSize: 13 }}>{d.name}</span>
            <span style={{ color: COLORS.text, fontWeight: 700, fontSize: 13 }}>{d.value}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function PublicoTab({ exhibitionId }: Props) {
  const [demo, setDemo] = useState<Demographics | null>(null);
  const [acumulado, setAcumulado] = useState<{ checkins: number } | null>(null);
  const [hoje, setHoje] = useState<{ entradas_hoje: number; checkins_hoje: number } | null>(null);
  const [median, setMedian] = useState<{ median: number | null; total: number } | null>(null);
  const [channels, setChannels] = useState<ChannelItem[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!exhibitionId) return;
    api.get(`/analytics/demographics/${exhibitionId}`)
      .then(r => setDemo(r.data))
      .catch(err => setError(err?.response?.data?.error || err?.message || 'Falha ao carregar demografia'));
    api.get(`/analytics/median-age/${exhibitionId}`)
      .then(r => setMedian(r.data))
      .catch(() => {});
    api.get(`/analytics/channels/${exhibitionId}`)
      .then(r => setChannels(r.data?.items || []))
      .catch(() => {});
  }, [exhibitionId]);

  useEffect(() => {
    api.get('/historico').then(r => setAcumulado(r.data)).catch(() => {});
    api.get('/resumo/hoje').then(r => setHoje(r.data)).catch(() => {});
  }, []);

  // Map raw demographic enum names to friendly labels
  const genderData = (demo?.gender || []).map(g => ({
    name: GENDER_LABEL[g.name] || g.name,
    value: g.value,
  }));
  const originData = (demo?.origin || []).map(o => ({
    name: ORIGIN_LABEL[o.name] || o.name,
    value: o.value,
  }));

  const totalProfiles = acumulado?.checkins ?? null;
  const adesao = hoje && hoje.entradas_hoje > 0
    ? Math.round((hoje.checkins_hoje / hoje.entradas_hoje) * 100)
    : null;

  return (
    <div>
      {error && (
        <div style={{ ...card, borderColor: 'rgba(232,85,78,0.3)', background: 'rgba(232,85,78,0.08)', color: '#F2A29F', marginBottom: 20 }}>
          ⚠️ {error}
        </div>
      )}

      {/* Hero stats — 3 cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(280px,1fr))', gap: 16, marginBottom: 24 }}>
        <StatHero
          value={totalProfiles?.toLocaleString('pt-BR') ?? '—'}
          label="Visitantes com perfil"
          color={COLORS.text}
        />
        <StatHero
          value={adesao !== null ? `${adesao}%` : '—'}
          label="Taxa de adesão ao check-in"
          color={COLORS.green}
          hint={adesao !== null && adesao >= 30 ? 'Meta: >30% ✓' : 'Meta: >30%'}
          hintColor={adesao !== null && adesao >= 30 ? COLORS.green : COLORS.muted}
        />
        <StatHero
          value={median?.median !== null && median?.median !== undefined ? `${median.median} anos` : '—'}
          label="Idade mediana"
          color={COLORS.orange}
        />
      </div>

      {/* Two donuts: gender + origin */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(380px,1fr))', gap: 16, marginBottom: 24 }}>
        <div style={{ ...card, padding: 22 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', marginBottom: 18 }}>
            <h3 style={{ ...sectionTitle, margin: 0, flex: 1 }}>Identidade de gênero</h3>
          </div>
          {genderData.length === 0 ? (
            <div style={{ height: 160, display: 'flex', alignItems: 'center', justifyContent: 'center', color: COLORS.faint }}>
              Sem dados ainda
            </div>
          ) : (
            <DonutLegend data={genderData} colors={GENDER_COLORS} />
          )}
        </div>

        <div style={{ ...card, padding: 22 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', marginBottom: 18 }}>
            <h3 style={{ ...sectionTitle, margin: 0, flex: 1 }}>Origem do visitante</h3>
          </div>
          {originData.length === 0 ? (
            <div style={{ height: 160, display: 'flex', alignItems: 'center', justifyContent: 'center', color: COLORS.faint }}>
              Sem dados ainda
            </div>
          ) : (
            <DonutLegend data={originData} colors={ORIGIN_COLORS} />
          )}
        </div>
      </div>

      {/* Age bar chart */}
      <div style={{ ...card, marginBottom: 24, padding: 22 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', marginBottom: 18 }}>
          <h3 style={{ ...sectionTitle, margin: 0, flex: 1 }}>Distribuição por idade</h3>
          <span style={sectionMeta}>ANO DE NASCIMENTO AGRUPADO</span>
        </div>
        <div style={{ height: 240 }}>
          {!demo?.ages?.length ? (
            <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: COLORS.faint }}>
              Sem dados ainda
            </div>
          ) : (
            <ResponsiveContainer>
              <BarChart data={demo.ages}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
                <XAxis dataKey="faixa" stroke={COLORS.faint} fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke={COLORS.faint} fontSize={10} tickLine={false} axisLine={false} unit="%" />
                <Tooltip cursor={{ fill: 'rgba(255,255,255,0.04)' }} contentStyle={{ background: '#1C1620', border: `1px solid ${COLORS.border}`, borderRadius: 8 }} />
                <Bar dataKey="v" fill={COLORS.brand2} radius={[6, 6, 0, 0]} isAnimationActive={false} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Channels — Como soube da exposição */}
      <div style={{ ...card, padding: 22 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', marginBottom: 18 }}>
          <h3 style={{ ...sectionTitle, margin: 0, flex: 1 }}>Como soube da exposição</h3>
          <span style={sectionMeta}>PERGUNTA POR VISITA</span>
        </div>
        {channels.length === 0 ? (
          <div style={{ padding: 16, color: COLORS.faint, fontSize: 13 }}>
            Sem respostas ainda.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {channels.map(c => (
              <div key={c.channel} style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <span style={{ minWidth: 200, color: COLORS.text, fontSize: 13 }}>
                  {CHANNEL_LABEL[c.channel] || c.channel}
                </span>
                <div style={{ flex: 1, height: 12, background: 'rgba(255,255,255,0.05)', borderRadius: 100, overflow: 'hidden' }}>
                  <div style={{
                    width: `${c.pct}%`,
                    height: '100%',
                    background: `linear-gradient(90deg, ${COLORS.orange}, ${COLORS.amber})`,
                    borderRadius: 100,
                  }} />
                </div>
                <span style={{ minWidth: 50, textAlign: 'right', color: COLORS.text, fontSize: 13, fontWeight: 700 }}>
                  {c.pct}%
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
