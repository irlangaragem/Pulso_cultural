import { useState, useEffect } from "react";
import { BarChart, Bar, AreaChart, Area, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { SystemHealth } from "../components/SystemHealth";

const API_BASE_URL = import.meta.env.VITE_API_URL || "https://pulsocultural-production.up.railway.app";

// --- TELEMETRY ---
function sendTelemetry(event: string, data?: Record<string, unknown>) {
  fetch(`${API_BASE_URL}/telemetry`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type: 'info', event, data, timestamp: new Date().toISOString() }),
  }).catch(() => { /* silent fail — telemetry is best-effort */ });
}

function sendTelemetryError(event: string, error: unknown) {
  fetch(`${API_BASE_URL}/telemetry`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      type: 'error',
      event,
      error: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString(),
    }),
  }).catch(() => {});
}
// ============================================================
// PULSO CULTURAL — Dashboard do Gestor
// MAM Bahia · Protótipo
// ============================================================

// ============================================================
// PULSO CULTURAL — Dashboard do Gestor
// MAM Bahia · Protótipo
// ============================================================

// --- COLORS ---
const C = {
  coral: "#E8554E", magenta: "#D4267E", laranja: "#F28C38", amber: "#F2B63C",
  green: "#48BB78", bgDeep: "#110D10", bgSurface: "#1C1620", bgCard: "#1E1924",
  bgElevated: "#261F2C", border: "rgba(255,255,255,0.04)", borderAccent: "rgba(232,85,78,0.12)",
  text1: "#F5ECE4", text2: "#A8969A", text3: "#6B5A60",
};

// --- TOOLTIP ---
// --- TOOLTIP ---
interface TooltipPayload {
  name: string;
  value: number;
  color?: string;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: TooltipPayload[];
  label?: string;
}

const CustomTooltip = ({ active, payload, label }: CustomTooltipProps) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: C.bgElevated, border: `1px solid ${C.border}`, borderRadius: 8, padding: "8px 12px" }}>
      <p style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: C.text3, margin: 0 }}>{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ fontFamily: "Sora, sans-serif", fontSize: 13, fontWeight: 600, color: p.color || C.coral, margin: "2px 0 0" }}>
          {p.name}: {p.value.toLocaleString("pt-BR")}
        </p>
      ))}
    </div>
  );
};

// --- COMPONENTS ---
// --- COMPONENTS ---
interface MetricCardProps {
  value: string | number;
  label: string;
  sub?: string;
  color?: string;
  large?: boolean;
}

function MetricCard({ value, label, sub, color = C.coral, large = false }: MetricCardProps) {
  return (
    <div style={s.metricCard}>
      <p style={{ fontFamily: "Sora, sans-serif", fontSize: large ? 36 : 28, fontWeight: 700, color, margin: 0, lineHeight: 1 }}>{value}</p>
      <p style={{ fontSize: 12, color: C.text2, margin: "6px 0 0" }}>{label}</p>
      {sub && <p style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: C.green, margin: "4px 0 0" }}>{sub}</p>}
    </div>
  );
}

interface SectionTitleProps {
  children: React.ReactNode;
  right?: string;
}

function SectionTitle({ children, right }: SectionTitleProps) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", margin: "32px 0 16px" }}>
      <h3 style={{ fontFamily: "Sora, sans-serif", fontSize: 16, fontWeight: 700, color: C.text1, margin: 0 }}>{children}</h3>
      {right && <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 9, color: C.text3, letterSpacing: 2 }}>{right}</span>}
    </div>
  );
}

interface ChartCardProps {
  title: string;
  tag?: string;
  children: React.ReactNode;
  minH?: number;
}

function ChartCard({ title, tag, children, minH = 220 }: ChartCardProps) {
  return (
    <div style={{ ...s.card, minHeight: minH }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <p style={{ fontFamily: "Sora, sans-serif", fontSize: 13, fontWeight: 600, color: C.text1, margin: 0 }}>{title}</p>
        {tag && <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 8, color: C.text3, letterSpacing: 2, textTransform: "uppercase" }}>{tag}</span>}
      </div>
      {children}
    </div>
  );
}

interface PieData {
  name?: string;
  label?: string;
  value: number;
  color: string;
}

interface PieLegendProps {
  data: PieData[];
}

function PieLegend({ data }: PieLegendProps) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      {data.map((d, i) => (
        <div key={i} style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 10, height: 10, borderRadius: 3, background: d.color, flexShrink: 0 }} />
          <span style={{ fontSize: 12, color: C.text2, flex: 1 }}>{d.name || d.label}</span>
          <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 12, fontWeight: 700, color: C.text1 }}>{d.value}%</span>
        </div>
      ))}
    </div>
  );
}

// ============================================================
// TAB: TEMPO REAL
// ============================================================
interface StreamData {
  ocupacao_atual?: number;
  entradas_hoje?: number;
  saidas_hoje?: number;
  ocupacao_pico?: number;
}

interface ResumoHoje {
  pessoasNoEspaco?: number;
  entradasHoje?: number;
  saidas_hoje?: number;
  ocupacao_pico?: number;
}

interface TrendData {
  h: string;
  v: number;
  sensor: number;
}

function TabRealTime() {
  const [streamData, setStreamData] = useState<StreamData | null>(null);
  const [resumoHoje, setResumoHoje] = useState<ResumoHoje | null>(null);
  const [trends, setTrends] = useState<TrendData[]>([]);

  useEffect(() => {
    fetch(`${API_BASE_URL}/resumo/hoje`)
      .then(res => res.json())
      .then(data => {
        setResumoHoje(data);
        sendTelemetry('fetch_resumo_hoje_success');
      })
      .catch(err => {
        console.error("Erro resumo/hoje:", err);
        sendTelemetryError('fetch_resumo_hoje_error', err);
      });

    fetch(`${API_BASE_URL}/analytics/trends/default-exhibition`)
      .then(res => res.json())
      .then(data => {
        setTrends(data.map((d: { hour: string; entries: number }) => ({ 
          h: d.hour, 
          v: d.entries,
          sensor: Math.round(d.entries * (1.8 + Math.random() * 1.5)) // Simulated camera flux
        })));
        sendTelemetry('fetch_trends_success');
      })
      .catch(err => {
        console.error("Erro trends:", err);
        sendTelemetryError('fetch_trends_error', err);
      });

    const eventSource = new EventSource(`${API_BASE_URL}/stream`);
    
    eventSource.onopen = () => sendTelemetry('sse_stream_connected');
    eventSource.onerror = (err) => sendTelemetryError('sse_stream_error', err);

    eventSource.onmessage = (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data);
        setStreamData(data);
      } catch {
        // Ignore parse errors from stream
      }
    };

    return () => {
      eventSource.close();
    };
  }, []);

  const metric1 = streamData?.ocupacao_atual ?? resumoHoje?.pessoasNoEspaco ?? 0;
  const metric2 = streamData?.entradas_hoje ?? resumoHoje?.entradasHoje ?? 0;
  const metric3 = streamData?.saidas_hoje ?? resumoHoje?.saidas_hoje ?? 0;
  const metric4 = streamData?.ocupacao_pico ?? resumoHoje?.ocupacao_pico ?? 0;

  return (
    <>
      <div style={s.metricsRow}>
        <MetricCard value={metric1} label="Ocupação atual" color={C.coral} large />
        <MetricCard value={metric2} label="Entradas hoje" color={C.text1} large />
        <MetricCard value={metric3} label="Saídas hoje" color={C.laranja} large />
        <MetricCard value={metric4 || "-"} label="Ocupação pico" color={C.text2} large />
      </div>

      <ChartCard title="Fluxo de visitantes por hora" tag="CÂMERA VS CHECK-IN (PULSO)" minH={260}>
        <ResponsiveContainer width="100%" height={200}>
          <AreaChart data={trends}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" vertical={false} />
            <XAxis dataKey="h" tick={{ fontSize: 10, fill: C.text3, fontFamily: "'Space Mono', monospace" }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 10, fill: C.text3, fontFamily: "'Space Mono', monospace" }} axisLine={false} tickLine={false} width={35} />
            <Tooltip content={<CustomTooltip />} />
            <Area type="monotone" dataKey="sensor" name="Fluxo Câmera" stroke={C.text3} fill="rgba(107, 90, 96, 0.1)" strokeDasharray="5 5" />
            <Area type="monotone" dataKey="v" name="Pulsos (Check-in)" stroke={C.coral} fill="url(#barGrad)" fillOpacity={0.4} strokeWidth={3} />
            <defs>
              <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={C.coral} />
                <stop offset="100%" stopColor={C.magenta} />
              </linearGradient>
            </defs>
          </AreaChart>
        </ResponsiveContainer>
        <p style={{ fontFamily: "'Space Mono', monospace", fontSize: 9, color: C.text3, textAlign: 'center', marginTop: 12 }}>
          ▲ TAXA DE ADESÃO MÉDIA: {trends.length > 0 ? Math.round((trends.reduce((a,b)=>a+b.v,0)/trends.reduce((a,b)=>a+b.sensor,0))*100) : 0}%
        </p>
      </ChartCard>
    </>
  );
}

// ============================================================
// TAB: PERFIL DO PÚBLICO
// ============================================================
interface DemoData {
  gender: { name: string; value: number }[];
  ages: { faixa: string; v: number }[];
  origin: { name: string; value: number }[];
  total: number;
}

function TabProfile() {
  const [demoData, setDemoData] = useState<DemoData>({ gender: [], ages: [], origin: [], total: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API_BASE_URL}/analytics/demographics/default-exhibition`)
      .then(res => res.json())
      .then(data => {
        setDemoData(data);
        setLoading(false);
        sendTelemetry('fetch_demographics_success');
      })
      .catch(err => {
        console.error("Erro demographics:", err);
        setLoading(false);
        sendTelemetryError('fetch_demographics_error', err);
      });
  }, []);

  if (loading) {
    return <div className="text-slate-400 py-12 text-center">Carregando dados demográficos...</div>;
  }

  const GENDER_COLORS = ["#D4267E", "#E8554E", "#F28C38", "#3D3240"];
  const ORIGIN_COLORS = ["#E8554E", "#D4267E", "#F28C38", "#F2B63C", "#48BB78"];

  const genderWithColors = demoData.gender.map((g, i) => ({
    ...g,
    color: GENDER_COLORS[i % GENDER_COLORS.length]
  }));

  const originWithColors = demoData.origin.map((o, i) => ({
    ...o,
    color: ORIGIN_COLORS[i % ORIGIN_COLORS.length]
  }));

  return (
    <>
      <div style={{ ...s.metricsRow, gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))" }}>
        <MetricCard value={demoData.total || 0} label="Visitantes cadastrados" color={C.text1} />
        <MetricCard value="46%" label="Taxa de adesão ao check-in" sub="Meta: >30% ✓" color={C.green} />
        <MetricCard value="29 anos" label="Idade mediana" color={C.laranja} />
      </div>

      <div style={s.twoCol}>
        <ChartCard title="Identidade de gênero" minH={200}>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <div style={{ width: 120, height: 120, flexShrink: 0 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={genderWithColors} dataKey="value" cx="50%" cy="50%" innerRadius={30} outerRadius={55} stroke="none" paddingAngle={2}>
                    {genderWithColors.map((d: any, i: number) => <Cell key={i} fill={d.color} />)}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>
            <PieLegend data={genderWithColors} />
          </div>
        </ChartCard>

        <ChartCard title="Origem do visitante" minH={200}>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <div style={{ width: 120, height: 120, flexShrink: 0 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={originWithColors} dataKey="value" cx="50%" cy="50%" innerRadius={30} outerRadius={55} stroke="none" paddingAngle={2}>
                    {originWithColors.map((d: any, i: number) => <Cell key={i} fill={d.color} />)}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>
            <PieLegend data={originWithColors} />
          </div>
        </ChartCard>
      </div>

      <ChartCard title="Distribuição por idade" tag="ANO DE NASCIMENTO AGRUPADO">
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={demoData.ages} barCategoryGap="30%">
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" vertical={false} />
            <XAxis dataKey="faixa" tick={{ fontSize: 10, fill: C.text3, fontFamily: "'Space Mono', monospace" }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 10, fill: C.text3 }} axisLine={false} tickLine={false} width={30} unit="%" />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="v" name="%" radius={[4, 4, 0, 0]} fill={C.magenta} opacity={0.75} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard title="Como soube da exposição" tag="PERGUNTA NA ENTRADA">
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={originWithColors.map((o: { name: string; value: number }) => ({ canal: o.name, v: o.value }))} layout="vertical" barCategoryGap="20%">
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" horizontal={false} />
            <XAxis type="number" tick={{ fontSize: 10, fill: C.text3 }} axisLine={false} tickLine={false} unit="%" />
            <YAxis dataKey="canal" type="category" tick={{ fontSize: 11, fill: C.text2 }} axisLine={false} tickLine={false} width={110} />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="v" name="%" radius={[0, 4, 4, 0]} fill={C.laranja} opacity={0.7} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>
    </>
  );
}

// ============================================================
// TAB: HISTÓRICO & RECORRÊNCIA
// ============================================================
interface StatusResumo {
  camera: number;
  checkins: number;
  retorno: number;
  multiplicador: number;
}

interface HistoricoDiario {
  dia: string;
  entradas: number;
  saidas: number;
}

function TabHistory() {
  const [historicoDiario, setHistoricoDiario] = useState<HistoricoDiario[]>([]);
  const [resumo, setResumo] = useState<StatusResumo | null>(null);

  useEffect(() => {
    fetch(`${API_BASE_URL}/historico`)
      .then(res => res.json())
      .then(data => {
        setResumo(data);
        sendTelemetry('fetch_historico_success');
      })
      .catch(err => {
        console.error(err);
        sendTelemetryError('fetch_historico_error', err);
      });

    fetch(`${API_BASE_URL}/resumo/historico`)
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          const formatado = data.map((d: { data: string; entradas: number; saidas: number }) => {
            const dateParts = d.data.split('-');
            const dateStr = dateParts.length === 3 ? `${dateParts[2]}/${dateParts[1]}` : d.data;
            return { dia: dateStr, entradas: d.entradas, saidas: d.saidas };
          });
          setHistoricoDiario(formatado.reverse());
          sendTelemetry('fetch_resumo_historico_success');
        }
      })
      .catch(err => {
        console.error(err);
        sendTelemetryError('fetch_resumo_historico_error', err);
      });
  }, []);

  const recurrenceData = [
    { label: "1ª visita", value: 100 - (resumo?.retorno || 0), color: "#E8554E" },
    { label: "Retorno", value: resumo?.retorno || 0, color: "#48BB78" },
  ];

  return (
    <>
      <div style={s.metricsRow}>
        <MetricCard value={resumo?.camera || 0} label="Total de pulsos históricos" sub="Pelo sensor de entrada" color={C.text1} large />
        <MetricCard value={resumo?.checkins || 0} label="Check-ins realizados" color={C.laranja} large />
        <MetricCard value={`${resumo?.retorno || 0}%`} label="Taxa de recorrência" sub="Visitantes que retornaram" color={C.green} large />
        <MetricCard value={`${resumo?.multiplicador || 0}×`} label="Câmera vs. Check-in" sub="Fator de amostragem" color={C.coral} />
      </div>

      <div style={s.twoCol}>
        <ChartCard title="Recorrência" minH={200}>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <div style={{ width: 120, height: 120, flexShrink: 0 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={recurrenceData} dataKey="value" cx="50%" cy="50%" innerRadius={30} outerRadius={55} stroke="none" paddingAngle={3}>
                    {recurrenceData.map((d, i) => <Cell key={i} fill={d.color} />)}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div>
              <PieLegend data={recurrenceData} />
              <p style={{ fontSize: 11, color: C.text3, marginTop: 10, lineHeight: 1.5 }}>
                No total acumulado de {resumo?.checkins || 0} check-ins, {resumo?.retorno || 0}% correspondem a visitantes que voltaram ao museu.
              </p>
            </div>
          </div>
        </ChartCard>
      </div>

      <ChartCard title="Fluxo por período" tag="ENTRADAS VS SAÍDAS" minH={260}>
        <ResponsiveContainer width="100%" height={200}>
          <AreaChart data={historicoDiario}>
            <defs>
              <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={C.coral} stopOpacity={0.3} />
                <stop offset="100%" stopColor={C.coral} stopOpacity={0} />
              </linearGradient>
              <linearGradient id="areaGrad2" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={C.laranja} stopOpacity={0.2} />
                <stop offset="100%" stopColor={C.laranja} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" vertical={false} />
            <XAxis dataKey="dia" tick={{ fontSize: 9, fill: C.text3 }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
            <YAxis tick={{ fontSize: 10, fill: C.text3 }} axisLine={false} tickLine={false} width={40} />
            <Tooltip content={<CustomTooltip />} />
            <Area type="monotone" dataKey="entradas" name="Entradas" stroke={C.coral} strokeLinecap={"round"} strokeWidth={2} fill="url(#areaGrad)" />
            <Area type="monotone" dataKey="saidas" name="Saídas" stroke={C.laranja} strokeLinecap={"round"} strokeWidth={1.5} fill="url(#areaGrad2)" />
          </AreaChart>
        </ResponsiveContainer>
      </ChartCard>
    </>
  );
}

// ============================================================
// TAB: CADASTRO DE EXPOSIÇÃO
// ============================================================
function TabExposition() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [expo, setExpo] = useState<any>({
    id: "default-exhibition",
    nome: "",
    subtitulo: "",
    inicio: "",
    fim: "",
    descricao: "",
    status: "ativa",
  });

  const [obras, setObras] = useState<any[]>([]);

  useEffect(() => {
    fetch(`${API_BASE_URL}/exhibitions/default-exhibition`)
      .then(res => res.json())
      .then(data => {
        setExpo({
          id: data.id,
          nome: data.name,
          subtitulo: data.subtitle,
          inicio: data.startDate.split('T')[0],
          fim: data.endDate.split('T')[0],
          descricao: data.description,
          status: data.status,
          museumId: data.museumId
        });
        setObras(data.works || []);
        setLoading(false);
      })
      .catch(err => {
        console.error("Erro ao carregar exposição:", err);
        setLoading(false);
      });
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const response = await fetch(`${API_BASE_URL}/exhibitions/${expo.id}`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('pulso-cultural-auth') ? JSON.parse(localStorage.getItem('pulso-cultural-auth')!).state.token : ''}`
        },
        body: JSON.stringify({
          ...expo,
          name: expo.nome,
          subtitle: expo.subtitulo,
          startDate: expo.inicio,
          endDate: expo.fim,
          works: obras
        })
      });

      if (response.ok) {
        alert("Exposição salva com sucesso!");
      } else {
        alert("Erro ao salvar exposição.");
      }
    } catch (err) {
      console.error(err);
      alert("Erro de conexão.");
    } finally {
      setSaving(false);
    }
  };


  // const [outras, setOutras] = useState([
  //   { id: 1, nome: "Walter Smetak", sala: "Galeria 2" },
  //   { id: 2, nome: "Xiló", sala: "Espaço Educativo" },
  // ]);

  const [editingObra, setEditingObra] = useState<number | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [showPoster, setShowPoster] = useState(false);

  // const statusColors: any = { ativa: C.green, programada: C.amber, encerrada: C.text3 };

  if (showPreview) {
    return (
      <>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 20, marginBottom: 16 }}>
          <h3 style={{ fontFamily: "Sora, sans-serif", fontSize: 16, fontWeight: 700, color: C.text1, margin: 0 }}>Preview do guia</h3>
          <button style={s.btnSecondary} onClick={() => setShowPreview(false)}>← Voltar ao cadastro</button>
        </div>
        <div style={{ display: "flex", justifyContent: "center" }}>
          <div style={{ width: 375, background: "#110D10", borderRadius: 36, border: "2px solid rgba(255,255,255,0.06)", overflow: "hidden", boxShadow: "0 20px 60px rgba(0,0,0,0.5)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "14px 28px 8px", color: C.text1, fontSize: 11, fontWeight: 600 }}>
              <span>14:32</span>
              <span style={{ fontSize: 10, color: C.text3 }}>●●●●○</span>
            </div>
            <div style={{ padding: "0 20px 20px", borderBottom: `1px solid ${C.border}` }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
                <span style={{ fontFamily: "Sora, sans-serif", fontWeight: 700, fontSize: 11, color: C.text1 }}>PULSO</span>
                <span style={{ fontFamily: "Sora, sans-serif", fontWeight: 300, fontSize: 7, color: C.text3, letterSpacing: 2 }}>CULTURAL</span>
              </div>
              <h2 style={{ fontFamily: "Sora, sans-serif", fontSize: 18, fontWeight: 700, color: C.text1, lineHeight: 1.25, margin: "0 0 6px" }}>{expo.nome}</h2>
              <p style={{ fontSize: 12, color: C.text2 }}>{expo.subtitulo}</p>
            </div>
            <div style={{ padding: "16px 20px 24px" }}>
              <p style={{ fontSize: 12, color: C.text2, lineHeight: 1.7, marginBottom: 16 }}>{expo.descricao}</p>
              {obras.slice(0, 3).map(w => (
                <div key={w.id} style={{ background: "rgba(255,255,255,0.03)", border: `1px solid ${C.border}`, borderRadius: 10, padding: 12, marginBottom: 6 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div>
                      <p style={{ fontFamily: "Sora, sans-serif", fontSize: 12, fontWeight: 600, color: C.text1, margin: 0 }}>{w.titulo}</p>
                      <p style={{ fontSize: 10, color: C.text3, margin: "1px 0 0" }}>{w.artista}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </>
    );
  }

  if (showPoster) {
    return (
      <>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 20, marginBottom: 16 }}>
          <h3 style={{ fontFamily: "Sora, sans-serif", fontSize: 16, fontWeight: 700, color: C.text1, margin: 0 }}>Cartaz para impressão</h3>
          <button style={s.btnSecondary} onClick={() => setShowPoster(false)}>← Voltar</button>
        </div>
        <div style={{ display: "flex", justifyContent: "center" }}>
          <div style={{ width: 400, height: 560, background: "#110D10", borderRadius: 12, padding: 40, border: "1px solid rgba(255,255,255,0.06)", textAlign: "center" }}>
            <h2 style={{ fontFamily: "Sora, sans-serif", fontSize: 24, fontWeight: 800, color: C.text1, marginBottom: 8 }}>{expo.nome}</h2>
            <p style={{ color: C.text2, marginBottom: 32 }}>{expo.subtitulo}</p>
            <div style={{ width: 160, height: 160, background: "white", margin: "0 auto 32px", borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <span style={{ color: "black", fontSize: 12 }}>QR CODE</span>
            </div>
            <p style={{ fontFamily: "Sora, sans-serif", fontSize: 18, fontWeight: 700 }}>Escaneie para acessar o guia</p>
          </div>
        </div>
      </>
    );
  }

  if (loading) {
    return <div style={{ color: C.text3, padding: "40px 0", textAlign: 'center' }}>Carregando dados da exposição...</div>;
  }

  return (
    <>
      <SectionTitle right="DADOS GERAIS">Exposição principal</SectionTitle>
      <div style={s.card}>
        <div style={s.formGrid}>
          <div style={s.formGroup}>
            <label style={s.formLabel}>Nome</label>
            <input style={s.formInput} value={expo.nome} onChange={e => setExpo({...expo, nome: e.target.value})} />
          </div>
          <div style={s.formGroup}>
            <label style={s.formLabel}>Data Início</label>
            <input style={s.formInput} type="date" value={expo.inicio} onChange={e => setExpo({...expo, inicio: e.target.value})} />
          </div>
        </div>
        <div style={{ marginTop: 16 }}>
          <label style={s.formLabel}>Descrição</label>
          <textarea style={{ ...s.formInput, minHeight: 60 }} value={expo.descricao} onChange={e => setExpo({...expo, descricao: e.target.value})} />
        </div>
        <div style={{ marginTop: 16, display: 'flex', justifyContent: 'flex-end' }}>
          <button style={s.btnPrimary} onClick={handleSave} disabled={saving}>
            {saving ? "Salvando..." : "Salvar Alterações"}
          </button>
        </div>
      </div>

      <SectionTitle right={`${obras.length} OBRAS`}>Obras</SectionTitle>
      {obras.map((w, idx) => (
        <div key={w.id} style={{ ...s.card, marginBottom: 8, padding: editingObra === w.id ? 20 : 12 }}>
          {editingObra === w.id ? (
            <div>
              <div style={s.formGrid}>
                <div style={s.formGroup}>
                  <label style={s.formLabel}>Título</label>
                  <input style={s.formInput} value={w.titulo} onChange={e => { const n = [...obras]; n[idx] = {...w, titulo: e.target.value}; setObras(n); }} />
                </div>
                <div style={s.formGroup}>
                  <label style={s.formLabel}>Artista</label>
                  <input style={s.formInput} value={w.artista} onChange={e => { const n = [...obras]; n[idx] = {...w, artista: e.target.value}; setObras(n); }} />
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                <button style={{ ...s.btnPrimary, padding: "6px 16px", fontSize: 12 }} onClick={() => setEditingObra(null)}>Salvar</button>
                <button style={{ ...s.btnSecondary, padding: "6px 16px", fontSize: 12, borderColor: 'rgba(232,85,78,0.2)' }} onClick={() => {
                  if (confirm("Excluir obra?")) setObras(obras.filter(o => o.id !== w.id));
                }}>Excluir</button>
              </div>
            </div>
          ) : (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div>
                <span style={{ color: C.text1, fontSize: 14, fontWeight: 600 }}>{w.titulo}</span>
                <span style={{ color: C.text3, fontSize: 12, marginLeft: 8 }}>— {w.artista}</span>
              </div>
              <button onClick={() => setEditingObra(w.id)} style={{ background: "none", border: "none", cursor: "pointer", color: C.coral, fontWeight: 600, fontSize: 12 }}>Editar</button>
            </div>
          )}
        </div>
      ))}

      <button 
        style={{ ...s.btnSecondary, width: '100%', marginTop: 8, borderStyle: 'dashed', borderColor: C.text3, color: C.text3 }}
        onClick={() => {
          const newId = Math.max(0, ...obras.map(o => Number(o.id))) + 1;
          setObras([...obras, { id: newId, artista: "Novo Artista", titulo: "Nova Obra", ano: "2024", sala: "Sala 1", desc: "", audio: false }]);
          setEditingObra(newId);
        }}
      >
        + Adicionar Obra
      </button>

      <div style={{ display: "flex", gap: 12, marginTop: 24 }}>
        <button style={s.btnPrimary} onClick={() => setShowPreview(true)}>👁 Ver Guia</button>
        <button style={s.btnSecondary} onClick={() => setShowPoster(true)}>🖨 Ver Cartaz</button>
      </div>
    </>
  );
}

// ============================================================
// TAB: RELATÓRIO DE IMPACTO
// ============================================================
function TabReport() {
  const highlights = [
    { label: "Taxa de Adesão", value: "48%", sub: "Meta: 30%", color: C.green },
    { label: "Visitantes Únicos", value: "1,240", sub: "Mês atual", color: C.coral },
    { label: "Tempo Médio", value: "42 min", sub: "+12 min vs. papel", color: C.amber },
    { label: "Taxa Retorno", value: "32%", sub: "Pessoas que voltaram", color: C.magenta },
  ];

  return (
    <>
      <div style={{ ...s.card, background: "linear-gradient(135deg, rgba(232,85,78,0.1), rgba(212,38,126,0.1))", textAlign: "center", padding: 40, border: `1px solid ${C.coral}33` }}>
        <p style={{ color: C.coral, fontWeight: 800, fontSize: 48, margin: 0, letterSpacing: -1 }}>2.4×</p>
        <p style={{ fontSize: 16, fontWeight: 600, color: C.text1 }}>Mais engajamento que no livro de papel</p>
        <p style={{ fontSize: 12, color: C.text2, marginTop: 8, maxWidth: 400, margin: '8px auto 0' }}>
          O sistema digital capturou {highlights[0].value} do fluxo total de visitantes, gerando dados valiosos para prestação de contas.
        </p>
      </div>
      
      <SectionTitle right="RESUMO DE IMPACTO">Destaques do Período</SectionTitle>
      <div style={s.metricsRow}>
        {highlights.map((h, i) => (
          <div key={i} style={s.metricCard}>
             <p style={{ fontSize: 11, color: C.text2, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1 }}>{h.label}</p>
             <p style={{ fontSize: 28, fontWeight: 700, color: h.color, margin: 0 }}>{h.value}</p>
             <p style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: C.text3, marginTop: 4 }}>{h.sub}</p>
          </div>
        ))}
      </div>

      <div style={{ ...s.card, marginTop: 24, padding: 24 }}>
        <h4 style={{ fontFamily: 'Sora', fontSize: 14, fontWeight: 700, color: C.text1, marginBottom: 16 }}>Próximos Passos Sugeridos</h4>
        <ul style={{ paddingLeft: 20, margin: 0, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <li style={{ fontSize: 13, color: C.text2 }}>Expandir o conteúdo da <strong>Sala 3</strong>, que concentra o maior tempo de permanência.</li>
          <li style={{ fontSize: 13, color: C.text2 }}>Implementar notificação de retorno para visitantes do último semestre.</li>
          <li style={{ fontSize: 13, color: C.text2 }}>Gerar relatório para prestadores de serviços de acessibilidade.</li>
        </ul>
      </div>
    </>
  );
}

// ============================================================
// MAIN DASHBOARD
// ============================================================
export function Dashboard() {
  const [tab, setTab] = useState("realtime");
  const tabs = [
    { id: "realtime", label: "Tempo real", icon: "⚡" },
    { id: "profile", label: "Público", icon: "👥" },
    { id: "history", label: "Histórico", icon: "📊" },
    { id: "expo", label: "Exposição", icon: "🖼" },
    { id: "report", label: "Impacto", icon: "📋" },
  ];

  return (
    <div style={s.root}>
      <nav style={s.nav}>
        <div style={s.navBrand}>
          <span style={{ fontFamily: "Sora, sans-serif", fontWeight: 700, fontSize: 14, color: C.text1 }}>PULSO</span>
          <span style={{ fontFamily: "Sora, sans-serif", fontWeight: 300, fontSize: 8, color: C.text3, letterSpacing: 2, marginLeft: 4 }}>CULTURAL</span>
        </div>
        <div style={s.navTabs}>
          {tabs.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} style={tab === t.id ? s.navTabActive : s.navTab}>
              <span style={{ fontSize: 14 }}>{t.icon}</span>
              <span>{t.label}</span>
            </button>
          ))}
        </div>
      </nav>

      <main style={s.main}>
        <header style={s.header}>
          <h1 style={s.pageTitle}>{tabs.find(t => t.id === tab)?.label}</h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <SystemHealth apiBaseUrl={API_BASE_URL} />
            <div style={s.liveTag}><span style={s.liveDot} /><span>AO VIVO</span></div>
          </div>
        </header>

        <div style={s.content}>
          {tab === "realtime" && <TabRealTime />}
          {tab === "profile" && <TabProfile />}
          {tab === "history" && <TabHistory />}
          {tab === "expo" && <TabExposition />}
          {tab === "report" && <TabReport />}
        </div>
      </main>
    </div>
  );
}

// ============================================================
// STYLES
// ============================================================
const s: Record<string, React.CSSProperties> = {
  root: { display: "flex", minHeight: "100vh", background: C.bgDeep, color: C.text1 },
  nav: { 
    width: "200px", background: C.bgSurface, borderRight: `1px solid ${C.border}`, 
    display: "flex", flexDirection: "column", padding: "20px 0" 
  },
  navBrand: { padding: "0 20px 24px", borderBottom: `1px solid ${C.border}`, marginBottom: "16px" },
  navTabs: { display: "flex", flexDirection: "column", gap: 4, padding: "0 10px" },
  navTab: { 
    display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", borderRadius: 10, 
    background: "none", border: "none", color: C.text3, cursor: "pointer", textAlign: "left" 
  },
  navTabActive: { 
    display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", borderRadius: 10, 
    background: "rgba(232,85,78,0.1)", border: "none", color: C.coral, fontWeight: 600, textAlign: "left" 
  },
  main: { flex: 1, display: "flex", flexDirection: "column" },
  header: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "24px 32px", borderBottom: `1px solid ${C.border}` },
  pageTitle: { fontFamily: "Sora, sans-serif", fontSize: 24, fontWeight: 700, margin: 0 },
  liveTag: { display: "flex", alignItems: "center", gap: 6, padding: "6px 12px", borderRadius: 100, background: "rgba(232,85,78,0.1)", color: C.coral, fontSize: 10, fontWeight: 700 },
  liveDot: { width: 6, height: 6, borderRadius: "50%", background: C.coral },
  content: { padding: "24px 32px", flex: 1, overflowY: "auto" },
  metricsRow: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 16 },
  metricCard: { background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 14, padding: "20px" },
  card: { background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 14, padding: 20, marginTop: 16 },
  twoCol: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 16 },
  btnPrimary: { background: "linear-gradient(135deg, #E8554E, #D4267E)", border: "none", borderRadius: 12, padding: "14px 24px", color: "white", fontWeight: 600, cursor: "pointer" },
  btnSecondary: { background: "transparent", border: "1.5px solid rgba(232,85,78,0.5)", borderRadius: 12, padding: "14px 24px", color: C.coral, fontWeight: 600, cursor: "pointer" },
  formGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 },
  formGroup: { display: "flex", flexDirection: "column", gap: 4 },
  formLabel: { fontSize: 11, color: C.text3 },
  formInput: { background: "rgba(255,255,255,0.05)", border: `1px solid rgba(255,255,255,0.1)`, borderRadius: 8, padding: "10px", color: C.text1, width: "100%", marginBottom: "8px" }
};
