import { useState, useEffect } from "react";
import { BarChart, Bar, LineChart, Line, AreaChart, Area, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

const API_BASE_URL = import.meta.env.VITE_API_URL || "https://pulsocultural-production.up.railway.app";
// ============================================================
// PULSO CULTURAL — Dashboard do Gestor
// MAM Bahia · Protótipo
// ============================================================

// --- MOCK DATA ---
const FLOW_TODAY = [
  { h: "8h", v: 12 }, { h: "9h", v: 34 }, { h: "10h", v: 78 }, { h: "11h", v: 145 },
  { h: "12h", v: 186 }, { h: "13h", v: 163 }, { h: "14h", v: 231 }, { h: "15h", v: 278 },
  { h: "16h", v: 245 }, { h: "17h", v: 167 }, { h: "18h", v: 42 },
];

const WEEKLY = [
  { d: "Seg", v: 0, c: 0 }, { d: "Ter", v: 412, c: 186 }, { d: "Qua", v: 389, c: 162 },
  { d: "Qui", v: 445, c: 201 }, { d: "Sex", v: 523, v_checkin: 245 }, { d: "Sáb", v: 687, c: 342 }, { d: "Dom", v: 612, c: 298 },
];

const MONTHLY = [
  { w: "Sem 1", cam: 2834, checkin: 1287 }, { w: "Sem 2", cam: 3102, checkin: 1456 },
  { w: "Sem 3", cam: 3456, checkin: 1689 }, { w: "Sem 4", cam: 3210, checkin: 1534 },
];


const CHANNELS = [
  { canal: "Redes sociais", v: 34 }, { canal: "Indicação", v: 24 },
  { canal: "Passei na frente", v: 19 }, { canal: "Jornal / TV", v: 12 },
  { canal: "Escola", v: 8 }, { canal: "Outro", v: 3 },
];

const RECURRENCE = [
  { label: "1ª visita", value: 68, color: "#E8554E" },
  { label: "Retorno", value: 32, color: "#48BB78" },
];

const DAILY_HISTORY = Array.from({ length: 30 }, (_, i) => ({
  dia: `${i + 1}`,
  cam: Math.floor(250 + Math.random() * 500 + (i > 14 ? 150 : 0)),
  checkin: Math.floor(100 + Math.random() * 250 + (i > 14 ? 80 : 0)),
}));

// --- COLORS ---
const C = {
  coral: "#E8554E", magenta: "#D4267E", laranja: "#F28C38", amber: "#F2B63C",
  green: "#48BB78", bgDeep: "#110D10", bgSurface: "#1C1620", bgCard: "#1E1924",
  bgElevated: "#261F2C", border: "rgba(255,255,255,0.04)", borderAccent: "rgba(232,85,78,0.12)",
  text1: "#F5ECE4", text2: "#A8969A", text3: "#6B5A60",
};

// --- TOOLTIP ---
const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: C.bgElevated, border: `1px solid ${C.border}`, borderRadius: 8, padding: "8px 12px" }}>
      <p style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: C.text3, margin: 0 }}>{label}</p>
      {payload.map((p: any, i: number) => (
        <p key={i} style={{ fontFamily: "Sora, sans-serif", fontSize: 13, fontWeight: 600, color: p.color || C.coral, margin: "2px 0 0" }}>
          {p.name}: {p.value.toLocaleString("pt-BR")}
        </p>
      ))}
    </div>
  );
};

// --- COMPONENTS ---
function MetricCard({ value, label, sub, color = C.coral, large = false }: any) {
  return (
    <div style={s.metricCard}>
      <p style={{ fontFamily: "Sora, sans-serif", fontSize: large ? 36 : 28, fontWeight: 700, color, margin: 0, lineHeight: 1 }}>{value}</p>
      <p style={{ fontSize: 12, color: C.text2, margin: "6px 0 0" }}>{label}</p>
      {sub && <p style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: C.green, margin: "4px 0 0" }}>{sub}</p>}
    </div>
  );
}

function SectionTitle({ children, right }: any) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", margin: "32px 0 16px" }}>
      <h3 style={{ fontFamily: "Sora, sans-serif", fontSize: 16, fontWeight: 700, color: C.text1, margin: 0 }}>{children}</h3>
      {right && <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 9, color: C.text3, letterSpacing: 2 }}>{right}</span>}
    </div>
  );
}

function ChartCard({ title, tag, children, minH = 220 }: any) {
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

function PieLegend({ data }: any) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      {data.map((d: any, i: number) => (
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
function TabRealTime() {
  const [streamData, setStreamData] = useState<any>(null);
  const [resumoHoje, setResumoHoje] = useState<any>(null);

  useEffect(() => {
    fetch(`${API_BASE_URL}/resumo/hoje`)
      .then(res => res.json())
      .then(data => setResumoHoje(data))
      .catch(err => console.error("Erro resumo/hoje:", err));

    const eventSource = new EventSource(`${API_BASE_URL}/stream`);
    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        setStreamData(data);
      } catch (err) {}
    };

    return () => {
      eventSource.close();
    };
  }, []);

  const metric1 = streamData?.ocupacao_atual ?? resumoHoje?.ocupacao_atual ?? 0;
  const metric2 = streamData?.entradas_hoje ?? resumoHoje?.entradas_hoje ?? 0;
  const metric3 = streamData?.saidas_hoje ?? resumoHoje?.saidas_hoje ?? 0;
  const metric4 = streamData?.ocupacao_pico ?? resumoHoje?.ocupacao_pico ?? 0;

  return (
    <>
      <div style={s.metricsRow}>
        <MetricCard value={metric1} label="Ocupação atual" color={C.coral} large />
        <MetricCard value={metric2} label="Entradas hoje" color={C.text1} large />
        <MetricCard value={metric3} label="Saídas hoje" color={C.laranja} large />
        <MetricCard value={metric4} label="Ocupação pico" color={C.text2} large />
      </div>

      <ChartCard title="Fluxo de visitantes por hora" tag="HOJE" minH={260}>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={FLOW_TODAY} barCategoryGap="20%">
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" vertical={false} />
            <XAxis dataKey="h" tick={{ fontSize: 10, fill: C.text3, fontFamily: "'Space Mono', monospace" }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 10, fill: C.text3, fontFamily: "'Space Mono', monospace" }} axisLine={false} tickLine={false} width={35} />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="v" name="Visitantes" radius={[4, 4, 0, 0]} fill="url(#barGrad)" />
            <defs>
              <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={C.coral} />
                <stop offset="100%" stopColor={C.magenta} />
              </linearGradient>
            </defs>
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard title="Comparativo semanal" tag="CÂMERA VS CHECK-IN" minH={260}>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={WEEKLY} barCategoryGap="25%">
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" vertical={false} />
            <XAxis dataKey="d" tick={{ fontSize: 10, fill: C.text3, fontFamily: "'Space Mono', monospace" }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 10, fill: C.text3, fontFamily: "'Space Mono', monospace" }} axisLine={false} tickLine={false} width={35} />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="v" name="Câmera" radius={[4, 4, 0, 0]} fill={C.coral} opacity={0.7} />
            <Bar dataKey="c" name="Check-in" radius={[4, 4, 0, 0]} fill={C.laranja} opacity={0.7} />
          </BarChart>
        </ResponsiveContainer>
        <div style={{ display: "flex", gap: 20, marginTop: 8 }}>
          <span style={{ fontSize: 11, color: C.text3 }}><span style={{ display: "inline-block", width: 10, height: 10, borderRadius: 2, background: C.coral, marginRight: 6, verticalAlign: "middle", opacity: 0.7 }} />Câmera (total)</span>
          <span style={{ fontSize: 11, color: C.text3 }}><span style={{ display: "inline-block", width: 10, height: 10, borderRadius: 2, background: C.laranja, marginRight: 6, verticalAlign: "middle", opacity: 0.7 }} />Check-in (voluntário)</span>
        </div>
      </ChartCard>
    </>
  );
}

// ============================================================
// TAB: PERFIL DO PÚBLICO
// ============================================================
function TabProfile() {
  const [demoData, setDemoData] = useState<any>({ gender: [], ages: [], origin: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API_BASE_URL}/analytics/demographics/default-exhibition`)
      .then(res => res.json())
      .then(data => {
        setDemoData(data);
        setLoading(false);
      })
      .catch(err => {
        console.error("Erro demographics:", err);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return <div className="text-slate-400 py-12 text-center">Carregando dados demográficos...</div>;
  }

  const GENDER_COLORS = ["#D4267E", "#E8554E", "#F28C38", "#3D3240"];
  const ORIGIN_COLORS = ["#E8554E", "#D4267E", "#F28C38", "#F2B63C", "#48BB78"];

  const genderWithColors = demoData.gender.map((g: any, i: number) => ({
    ...g,
    color: GENDER_COLORS[i % GENDER_COLORS.length]
  }));

  const originWithColors = demoData.origin.map((o: any, i: number) => ({
    ...o,
    color: ORIGIN_COLORS[i % ORIGIN_COLORS.length]
  }));

  return (
    <>
      <div style={{ ...s.metricsRow, gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))" }}>
        <MetricCard value={demoData.total || "---"} label="Visitantes com perfil" color={C.text1} />
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

      <ChartCard title="Como soube da exposição" tag="PERGUNTA POR VISITA">
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={CHANNELS} layout="vertical" barCategoryGap="20%">
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
function TabHistory() {
  const [historicoDiario, setHistoricoDiario] = useState<any[]>(DAILY_HISTORY);

  useEffect(() => {
    fetch(`${API_BASE_URL}/resumo/historico`)
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          const formatado = data.map((d: any) => {
            const dateParts = d.data.split('-');
            const dateStr = dateParts.length === 3 ? `${dateParts[2]}/${dateParts[1]}` : d.data;
            return { dia: dateStr, entradas: d.entradas, saidas: d.saidas };
          });
          setHistoricoDiario(formatado.reverse());
        }
      })
      .catch(err => console.error(err));
  }, []);

  return (
    <>
      <div style={s.metricsRow}>
        <MetricCard value="12.602" label="Total de pulsos no mês" sub="↑ 15% vs. mês anterior" color={C.text1} large />
        <MetricCard value="5.966" label="Check-ins no mês" color={C.laranja} large />
        <MetricCard value="32%" label="Taxa de retorno" sub="Visitantes que voltaram" color={C.green} large />
        <MetricCard value="2.4×" label="Câmera vs. Livro" sub="Estimativa livro: ~5.200" color={C.coral} />
      </div>

      <div style={s.twoCol}>
        <ChartCard title="Recorrência" minH={200}>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <div style={{ width: 120, height: 120, flexShrink: 0 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={RECURRENCE} dataKey="value" cx="50%" cy="50%" innerRadius={30} outerRadius={55} stroke="none" paddingAngle={3}>
                    {RECURRENCE.map((d: any, i: number) => <Cell key={i} fill={d.color} />)}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div>
              <PieLegend data={RECURRENCE} />
              <p style={{ fontSize: 11, color: C.text3, marginTop: 10, lineHeight: 1.5 }}>De 847 visitantes com check-in, 271 retornaram pelo menos uma vez.</p>
            </div>
          </div>
        </ChartCard>

        <ChartCard title="Evolução semanal" tag="CÂMERA VS CHECK-IN" minH={200}>
          <ResponsiveContainer width="100%" height={150}>
            <LineChart data={MONTHLY}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" />
              <XAxis dataKey="w" tick={{ fontSize: 10, fill: C.text3, fontFamily: "'Space Mono', monospace" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: C.text3 }} axisLine={false} tickLine={false} width={40} />
              <Tooltip content={<CustomTooltip />} />
              <Line type="monotone" dataKey="cam" name="Câmera" stroke={C.coral} strokeWidth={2.5} dot={{ r: 4, fill: C.coral }} />
              <Line type="monotone" dataKey="checkin" name="Check-in" stroke={C.laranja} strokeWidth={2.5} dot={{ r: 4, fill: C.laranja }} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      <ChartCard title="Visitantes por dia" tag="CÂMERA" minH={260}>
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
  const [expo, setExpo] = useState({
    nome: "Uma História da Arte Brasileira",
    subtitulo: "Coleções MAM Rio",
    inicio: "2026-03-11",
    fim: "2026-06-28",
    descricao: "80 obras do acervo do MAM Rio chegam a Salvador numa celebração da arte brasileira do século XX. De Portinari a Anita Malfatti, de Di Cavalcanti a Lygia Clark — um percurso que atravessa movimentos, gerações e visões de Brasil.",
    patrocinador: "Banco do Brasil",
    status: "ativa",
  });

  const [obras, setObras] = useState([
    { id: 1, artista: "Cândido Portinari", titulo: "Retirantes", ano: "1944", sala: "Sala 1", desc: "Óleo sobre tela que retrata a migração nordestina.", audio: true },
    { id: 2, artista: "Anita Malfatti", titulo: "A Boba", ano: "1915–16", sala: "Sala 2", desc: "Obra-chave do modernismo brasileiro.", audio: true },
    { id: 3, artista: "Di Cavalcanti", titulo: "Cinco Moças", ano: "1930", sala: "Sala 2", desc: "Mulatas em cores tropicais.", audio: false },
    { id: 4, artista: "Lygia Clark", titulo: "Bicho", ano: "1960", sala: "Sala 3", desc: "Escultura articulada em metal.", audio: true },
    { id: 5, artista: "Alfredo Volpi", titulo: "Bandeirinhas", ano: "c. 1960", sala: "Sala 3", desc: "Têmpera sobre tela.", audio: false },
    { id: 6, artista: "Iberê Camargo", titulo: "Núcleo", ano: "1963", sala: "Sala 4", desc: "Expressionismo abstrato.", audio: true },
  ]);

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
      </div>

      <SectionTitle right={`${obras.length} OBRAS`}>Obras</SectionTitle>
      {obras.map((w, idx) => (
        <div key={w.id} style={{ ...s.card, marginBottom: 8, padding: editingObra === w.id ? 20 : 12 }}>
          {editingObra === w.id ? (
            <div>
              <input style={s.formInput} value={w.titulo} onChange={e => { const n = [...obras]; n[idx] = {...w, titulo: e.target.value}; setObras(n); }} />
              <button style={{ ...s.btnSecondary, marginTop: 8, padding: "4px 12px" }} onClick={() => setEditingObra(null)}>Ok</button>
            </div>
          ) : (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ color: C.text1, fontSize: 14 }}>{idx + 1}. {w.titulo}</span>
              <button onClick={() => setEditingObra(w.id)} style={{ background: "none", border: "none", cursor: "pointer", color: C.text3 }}>Editar</button>
            </div>
          )}
        </div>
      ))}

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
  return (
    <>
      <div style={{ ...s.card, background: "linear-gradient(135deg, rgba(232,85,78,0.1), rgba(212,38,126,0.1))", textAlign: "center", padding: 40 }}>
        <p style={{ color: C.coral, fontWeight: 800, fontSize: 48, margin: 0 }}>2.4×</p>
        <p style={{ fontSize: 16, fontWeight: 500 }}>mais visitantes que o livro de assinaturas</p>
      </div>
      
      <SectionTitle>Destaques</SectionTitle>
      <div style={s.card}>
        {[
          "46% dos visitantes usaram o guia digital.",
          "32% retornaram ao espaço no mesmo mês.",
          "O tempo médio de visita aumentou em 12 min."
        ].map((t, i) => (
          <p key={i} style={{ fontSize: 14, color: C.text2, marginBottom: 12 }}>• {t}</p>
        ))}
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
          <div style={s.liveTag}><span style={s.liveDot} /><span>AO VIVO</span></div>
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
const s: any = {
  root: { display: "flex", minHeight: "100vh", background: C.bgDeep, color: C.text1 },
  nav: { 
    width: 200, background: C.bgSurface, borderRight: `1px solid ${C.border}`, 
    display: "flex", flexDirection: "column", padding: "20px 0" 
  },
  navBrand: { padding: "0 20px 24px", borderBottom: `1px solid ${C.border}`, marginBottom: 16 },
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
  formInput: { background: "rgba(255,255,255,0.05)", border: `1px solid rgba(255,255,255,0.1)`, borderRadius: 8, padding: "10px", color: C.text1, width: "100%", marginBottom: 8 }
};
