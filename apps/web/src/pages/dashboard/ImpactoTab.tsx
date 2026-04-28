import { useEffect, useState } from 'react';
import { jsPDF } from 'jspdf';
import { api } from '../../services/api';
import { card, COLORS, btnPrimary, btnGhost, sectionTitle, sectionMeta } from './styles';

interface Acumulado {
  camera: number;
  checkins: number;
  retorno: number;
  multiplicador: string | number;
}

interface HistoricoDia {
  data: string;
  entradas: number;
  saidas: number;
  checkins: number;
}

interface Demographics {
  gender: { name: string; value: number }[];
  origin: { name: string; value: number }[];
  ages: { faixa: string; v: number }[];
}

interface Insights {
  avgExperienceScore: number;
  satisfactionByOrigin: Record<string, number>;
  topSegment: string;
}

interface TrendPoint {
  hour: string;
  entries: number;
  exits: number;
  checkins: number;
}

interface Recorrencia {
  total_visitors_com_checkin: number;
  primeira_visita: number;
  retorno: number;
  taxa_retorno_pct: number;
}

interface Props {
  exhibitionId: string;
  museumId?: string;
}

interface Finding {
  title: string;
  body: string;
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

const DOW_FULL = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];

function findPeakDays(historico: HistoricoDia[]): string[] {
  if (historico.length < 3) return [];
  const byDow: Record<number, number> = {};
  for (const d of historico) {
    const dow = new Date(d.data).getDay();
    byDow[dow] = (byDow[dow] || 0) + d.entradas;
  }
  return Object.entries(byDow)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 2)
    .filter(([, v]) => v > 0)
    .map(([k]) => DOW_FULL[Number(k)]);
}

function findPeakHours(trends: TrendPoint[]): string | null {
  if (trends.length < 3) return null;
  const max = Math.max(...trends.map(t => t.entries));
  if (max === 0) return null;
  const peakHours = trends.filter(t => t.entries >= max * 0.85).map(t => t.hour);
  if (peakHours.length === 0) return null;
  if (peakHours.length === 1) return peakHours[0];
  return `${peakHours[0]}–${peakHours[peakHours.length - 1]}`;
}

function StatCard({ value, label, color }: { value: React.ReactNode; label: string; color?: string }) {
  return (
    <div style={{ ...card, padding: 20 }}>
      <p style={{
        fontFamily: "'Sora', sans-serif",
        fontSize: 30,
        fontWeight: 700,
        margin: 0,
        color: color || COLORS.text,
        lineHeight: 1,
      }}>
        {value}
      </p>
      <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: COLORS.muted, margin: '12px 0 0' }}>
        {label}
      </p>
    </div>
  );
}

function ProfileBars({
  data,
  colors,
  labelMap,
}: {
  data: { name: string; value: number }[];
  colors: string[];
  labelMap: Record<string, string>;
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {data.map((d, i) => (
        <div key={d.name} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{
            width: 8, height: 8, borderRadius: 2,
            background: colors[i % colors.length], flexShrink: 0,
          }} />
          <span style={{ minWidth: 110, color: COLORS.text, fontSize: 13 }}>
            {labelMap[d.name] || d.name}
          </span>
          <div style={{ flex: 1, height: 8, background: 'rgba(255,255,255,0.05)', borderRadius: 100, overflow: 'hidden' }}>
            <div style={{
              width: `${d.value}%`,
              height: '100%',
              background: colors[i % colors.length],
              borderRadius: 100,
            }} />
          </div>
          <span style={{ minWidth: 40, textAlign: 'right', color: COLORS.text, fontSize: 13, fontWeight: 700 }}>
            {d.value}%
          </span>
        </div>
      ))}
    </div>
  );
}

const GENDER_COLORS = [COLORS.brand2, COLORS.brand, COLORS.orange, '#6B5A60'];
const ORIGIN_COLORS = [COLORS.brand, COLORS.brand2, COLORS.orange, '#F5C147'];

export function ImpactoTab({ exhibitionId, museumId }: Props) {
  const [acc, setAcc] = useState<Acumulado | null>(null);
  const [historico, setHistorico] = useState<HistoricoDia[]>([]);
  const [demo, setDemo] = useState<Demographics | null>(null);
  const [insights, setInsights] = useState<Insights | null>(null);
  const [trends, setTrends] = useState<TrendPoint[]>([]);
  const [recorrencia, setRecorrencia] = useState<Recorrencia | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.get('/historico').then(r => setAcc(r.data)).catch(e => setError(e?.message));
    api.get('/resumo/historico?days=30').then(r => setHistorico(r.data || [])).catch(() => {});
    api.get('/resumo/recorrencia').then(r => setRecorrencia(r.data)).catch(() => {});
  }, []);

  useEffect(() => {
    if (!exhibitionId) return;
    api.get(`/analytics/demographics/${exhibitionId}`).then(r => setDemo(r.data)).catch(() => {});
    api.get(`/analytics/trends/${exhibitionId}`).then(r => setTrends(r.data || [])).catch(() => {});
  }, [exhibitionId]);

  useEffect(() => {
    if (!museumId) return;
    api.get(`/recommendations/museum/${museumId}/insights`).then(r => setInsights(r.data?.insights ?? null)).catch(() => {});
  }, [museumId]);

  // ─── Build the findings from REAL data ───────────────────────────────
  const findings: Finding[] = [];

  if (acc && acc.camera > 0 && acc.checkins > 0) {
    const mult = Number(acc.multiplicador);
    if (Number.isFinite(mult) && mult > 1) {
      const livroEstimado = Math.round(acc.camera / mult);
      findings.push({
        title: `O livro de assinatura subestimava o público em ${mult.toFixed(1)}×`,
        body: `A câmera registrou ${acc.camera.toLocaleString('pt-BR')} visitantes reais enquanto o livro estimaria cerca de ${livroEstimado.toLocaleString('pt-BR')} no mesmo período.`,
      });
    }
    const adesao = Math.round((acc.checkins / acc.camera) * 100);
    findings.push({
      title: `${adesao}% dos visitantes fizeram check-in voluntariamente`,
      body: adesao >= 30
        ? `O guia digital como incentivo superou a meta de 30%. O conteúdo da exposição é o melhor motivador.`
        : `Abaixo da meta inicial de 30%. Vale revisar a chamada visual do QR code na entrada.`,
    });
  }

  if (acc && acc.retorno > 0) {
    findings.push({
      title: `${acc.retorno}% dos visitantes retornaram ao espaço`,
      body: `Dado inédito para o MAM. Antes, não havia como saber se alguém voltava.`,
    });
  }

  if (demo && demo.ages.length > 0 && demo.gender.length > 0 && demo.origin.length > 0) {
    const topAge = demo.ages.slice().sort((a, b) => b.v - a.v)[0];
    const topGender = demo.gender.slice().sort((a, b) => b.value - a.value)[0];
    const topOrigin = demo.origin.slice().sort((a, b) => b.value - a.value)[0];
    findings.push({
      title: `Perfil predominante: ${topAge?.faixa}, ${(GENDER_LABEL[topGender?.name] || topGender?.name).toLowerCase()}, ${(ORIGIN_LABEL[topOrigin?.name] || topOrigin?.name).toLowerCase()}`,
      body: `${topAge?.v}% na faixa ${topAge?.faixa}; ${topGender?.value}% se identificam como ${(GENDER_LABEL[topGender?.name] || topGender?.name).toLowerCase()}; ${topOrigin?.value}% vieram de ${ORIGIN_LABEL[topOrigin?.name] || topOrigin?.name}.`,
    });
  }

  const peakDays = findPeakDays(historico);
  const peakHours = findPeakHours(trends);
  if (peakDays.length > 0 || peakHours) {
    const dayPart = peakDays.length === 0
      ? null
      : peakDays.length === 1
        ? peakDays[0]
        : `${peakDays[0]}s e ${peakDays[1]}s`;
    const titleParts: string[] = [];
    if (dayPart) titleParts.push(dayPart);
    if (peakHours) titleParts.push(peakHours);
    findings.push({
      title: `Pico de visitação: ${titleParts.join(', ')}`,
      body: `Dados de fluxo permitem otimizar equipe de mediação e programação de atividades.`,
    });
  }

  if (insights && insights.avgExperienceScore > 0) {
    findings.push({
      title: `Experience Score geral: ${insights.avgExperienceScore.toFixed(2)} (escala 0–1)`,
      body: insights.topSegment ? `${insights.topSegment} é o segmento com maior satisfação.` : `Combinação de rating com análise de sentimento dos comentários.`,
    });
  }

  if (findings.length === 0) {
    findings.push({
      title: 'Coletando dados',
      body: 'Os principais achados aparecem aqui automaticamente quando houver volume mínimo de checkins, contagens da câmera e avaliações.',
    });
  }

  const livroEstimado = acc && Number(acc.multiplicador) > 0
    ? Math.round(acc.camera / Number(acc.multiplicador))
    : null;

  // ─── Export handlers ─────────────────────────────────────────────────
  const handleExportCsv = async () => {
    if (!exhibitionId) return;
    try {
      const res = await api.get(`/analytics/export/${exhibitionId}`, { responseType: 'blob' });
      const blob = new Blob([res.data], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `pulso-impacto-${exhibitionId}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err: any) {
      setError(err?.response?.data?.error || err?.message || 'Falha ao exportar');
    }
  };

  const handleExportPdf = () => {
    const doc = new jsPDF({ unit: 'pt', format: 'a4' });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 44;
    const contentWidth = pageWidth - margin * 2;

    // ── Top header band (red gradient simulated by filled rects) ─────────────
    doc.setFillColor(232, 85, 78);
    doc.rect(0, 0, pageWidth, 6, 'F');

    let y = margin + 8;

    // Logo dot + brand line
    doc.setFillColor(232, 85, 78);
    doc.circle(margin + 5, y + 4, 5, 'F');
    doc.setFillColor(242, 140, 56);
    doc.circle(margin + 4, y + 3, 2.5, 'F');
    doc.setTextColor(232, 85, 78);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text('PULSO CULTURAL · RELATÓRIO DE IMPACTO', margin + 18, y + 6);
    y += 28;

    // Title
    doc.setTextColor(30, 30, 30);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(26);
    doc.text('Relatório de impacto', margin, y);
    y += 22;

    // Metadata line
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(140, 140, 140);
    const today = new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
    doc.text(`Gerado em ${today}`, margin, y);
    y += 28;

    // ── Hero metric box ───────────────────────────────────────────────────────
    if (acc) {
      const heroHeight = 100;
      doc.setFillColor(252, 240, 240);
      doc.setDrawColor(232, 85, 78);
      doc.setLineWidth(0.8);
      doc.roundedRect(margin, y, contentWidth, heroHeight, 12, 12, 'FD');

      doc.setTextColor(232, 85, 78);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(48);
      doc.text(`${acc.multiplicador}×`, margin + 24, y + 56);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(11);
      doc.setTextColor(60, 60, 60);
      const heroText = 'mais visitantes reais do que o\nlivro de assinatura registrou';
      doc.text(heroText, margin + 130, y + 38);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(140, 140, 140);
      const livro = livroEstimado ?? '—';
      doc.text(
        `Câmera: ${acc.camera.toLocaleString('pt-BR')}  ·  Livro estimado: ~${typeof livro === 'number' ? livro.toLocaleString('pt-BR') : livro}  ·  Período: 30 dias`,
        margin + 130, y + 80
      );
      y += heroHeight + 24;
    }

    // ── Stat boxes (3 per row) ────────────────────────────────────────────────
    if (acc) {
      doc.setTextColor(30, 30, 30);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.text('Métricas consolidadas', margin, y);
      y += 18;

      const adesao = acc.camera > 0 ? Math.round((acc.checkins / acc.camera) * 100) : 0;
      const stats: { label: string; value: string; color: [number, number, number] }[] = [
        { label: 'Visitantes (câmera)', value: acc.camera.toLocaleString('pt-BR'),    color: [232, 85, 78] },
        { label: 'Check-ins',          value: acc.checkins.toLocaleString('pt-BR'), color: [242, 140, 56] },
        { label: 'Taxa de adesão',     value: `${adesao}%`,                          color: [72, 187, 120] },
        { label: 'Taxa de retorno',    value: `${acc.retorno}%`,                     color: [72, 187, 120] },
        { label: 'Multiplicador',      value: `${acc.multiplicador}×`,               color: [232, 85, 78] },
        { label: 'Recorrentes',        value: (recorrencia?.retorno ?? 0).toLocaleString('pt-BR'), color: [212, 38, 126] },
      ];

      const cardW = (contentWidth - 16) / 3;
      const cardH = 56;
      stats.forEach((s, i) => {
        const col = i % 3;
        const row = Math.floor(i / 3);
        const cx = margin + col * (cardW + 8);
        const cy = y + row * (cardH + 8);
        doc.setDrawColor(220, 220, 220);
        doc.setFillColor(252, 252, 252);
        doc.roundedRect(cx, cy, cardW, cardH, 8, 8, 'FD');
        doc.setTextColor(s.color[0], s.color[1], s.color[2]);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(20);
        doc.text(s.value, cx + 12, cy + 30);
        doc.setTextColor(120, 120, 120);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        doc.text(s.label, cx + 12, cy + 46);
      });
      y += Math.ceil(stats.length / 3) * (cardH + 8) + 24;
    }

    // ── Audience profile (bars) ───────────────────────────────────────────────
    if (demo && (demo.gender.length > 0 || demo.origin.length > 0)) {
      if (y > pageHeight - margin - 220) {
        doc.addPage();
        y = margin;
      }
      doc.setTextColor(30, 30, 30);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.text('Perfil do público', margin, y);
      y += 18;

      const drawBars = (
        title: string,
        data: { name: string; value: number }[],
        labelMap: Record<string, string>,
        color: [number, number, number],
        startY: number
      ): number => {
        let by = startY;
        doc.setTextColor(80, 80, 80);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        doc.text(title, margin, by);
        by += 12;
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        const labelW = 100;
        const barMaxW = contentWidth - labelW - 50;
        for (const d of data) {
          doc.setTextColor(60, 60, 60);
          doc.text(labelMap[d.name] || d.name, margin, by + 7);
          doc.setFillColor(240, 240, 240);
          doc.roundedRect(margin + labelW, by + 1, barMaxW, 9, 2, 2, 'F');
          doc.setFillColor(color[0], color[1], color[2]);
          doc.roundedRect(margin + labelW, by + 1, barMaxW * (d.value / 100), 9, 2, 2, 'F');
          doc.setTextColor(60, 60, 60);
          doc.setFont('helvetica', 'bold');
          doc.text(`${d.value}%`, margin + contentWidth, by + 7, { align: 'right' });
          doc.setFont('helvetica', 'normal');
          by += 14;
        }
        return by + 8;
      };

      if (demo.gender.length > 0) {
        y = drawBars('Gênero', demo.gender, GENDER_LABEL, [212, 38, 126], y);
      }
      if (demo.origin.length > 0) {
        y = drawBars('Origem', demo.origin, ORIGIN_LABEL, [232, 85, 78], y);
      }
      y += 8;
    }

    // ── Findings ──────────────────────────────────────────────────────────────
    if (y > pageHeight - margin - 80) {
      doc.addPage();
      y = margin;
    }
    doc.setTextColor(30, 30, 30);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.text('Principais achados', margin, y);
    y += 20;

    findings.forEach((f, i) => {
      if (y > pageHeight - margin - 70) {
        doc.addPage();
        y = margin;
      }
      doc.setTextColor(232, 85, 78);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.text(String(i + 1).padStart(2, '0'), margin, y);
      doc.setTextColor(20, 20, 20);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      const titleLines = doc.splitTextToSize(f.title, contentWidth - 28);
      doc.text(titleLines, margin + 26, y);
      y += titleLines.length * 13 + 4;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9.5);
      doc.setTextColor(85, 85, 85);
      const bodyLines = doc.splitTextToSize(f.body, contentWidth - 28);
      doc.text(bodyLines, margin + 26, y);
      y += bodyLines.length * 11.5 + 14;
      if (i < findings.length - 1) {
        doc.setDrawColor(232, 232, 232);
        doc.setLineWidth(0.5);
        doc.line(margin + 26, y - 6, pageWidth - margin, y - 6);
        y += 4;
      }
    });

    // ── Page footer ───────────────────────────────────────────────────────────
    const totalPages = (doc as any).internal.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      // bottom band
      doc.setFillColor(232, 85, 78);
      doc.rect(0, pageHeight - 4, pageWidth, 4, 'F');
      doc.setFontSize(8);
      doc.setTextColor(150, 150, 150);
      doc.text(
        `${i} / ${totalPages}  ·  Pulso Cultural  ·  Dados agregados conforme LGPD Art. 12`,
        pageWidth / 2, pageHeight - 14, { align: 'center' }
      );
    }

    const dateStr = new Date().toISOString().split('T')[0];
    doc.save(`pulso-relatorio-impacto-${dateStr}.pdf`);
  };

  return (
    <div>
      {error && (
        <div style={{ ...card, borderColor: 'rgba(232,85,78,0.3)', background: 'rgba(232,85,78,0.08)', color: '#F2A29F', marginBottom: 20 }}>
          ⚠️ {error}
        </div>
      )}

      {/* HERO: Dado central do piloto */}
      <div style={{
        ...card,
        background: 'linear-gradient(135deg, rgba(232,85,78,0.08), rgba(212,38,126,0.06))',
        border: `1px solid rgba(232,85,78,0.3)`,
        padding: 36,
        marginBottom: 24,
        textAlign: 'center',
      }}>
        <p style={{
          fontFamily: "'Space Mono', monospace",
          fontSize: 11,
          letterSpacing: 3,
          color: COLORS.brand,
          margin: 0,
        }}>
          DADO CENTRAL DO PILOTO
        </p>
        <p style={{
          fontFamily: "'Sora', sans-serif",
          fontSize: 64,
          fontWeight: 700,
          margin: '14px 0 8px',
          background: `linear-gradient(135deg, ${COLORS.brand}, ${COLORS.brand2})`,
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
          letterSpacing: -2,
          lineHeight: 1,
        }}>
          {acc ? `${acc.multiplicador}×` : '—'}
        </p>
        <p style={{
          fontFamily: "'Sora', sans-serif",
          fontSize: 18,
          fontWeight: 500,
          color: COLORS.text,
          margin: '0 0 12px',
        }}>
          mais visitantes reais do que o livro de assinatura registrou
        </p>
        {acc && livroEstimado !== null && (
          <p style={{
            fontFamily: "'DM Sans', sans-serif",
            fontSize: 13,
            color: COLORS.muted,
            margin: 0,
          }}>
            Câmera: {acc.camera.toLocaleString('pt-BR')} · Livro (estimado): ~{livroEstimado.toLocaleString('pt-BR')} · Período: 30 dias
          </p>
        )}
      </div>

      {/* Métricas consolidadas — 6 cards */}
      <div style={{ display: 'flex', alignItems: 'baseline', marginBottom: 14 }}>
        <h3 style={{ ...sectionTitle, margin: 0, flex: 1 }}>Métricas consolidadas</h3>
        <span style={sectionMeta}>30 DIAS DE PILOTO</span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(170px,1fr))', gap: 12, marginBottom: 28 }}>
        <StatCard value={acc?.camera?.toLocaleString('pt-BR') ?? '—'} label="Visitantes reais (câmera)" color={COLORS.brand} />
        <StatCard value={acc?.checkins?.toLocaleString('pt-BR') ?? '—'} label="Check-ins realizados" color={COLORS.orange} />
        <StatCard
          value={acc && acc.camera > 0 ? `${Math.round((acc.checkins / acc.camera) * 100)}%` : '—'}
          label="Taxa de adesão ao check-in"
          color={COLORS.green}
        />
        <StatCard value={acc ? `${acc.retorno}%` : '—'} label="Retornaram ao espaço" color={COLORS.green} />
        <StatCard value="—" label="Permanência média" color={COLORS.faint} />
        <StatCard
          value={recorrencia?.retorno?.toLocaleString('pt-BR') ?? '—'}
          label="Visitantes recorrentes"
          color={COLORS.brand2}
        />
      </div>

      {/* Perfil do público */}
      <h3 style={{ ...sectionTitle, marginBottom: 14 }}>Perfil do público</h3>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(380px,1fr))', gap: 16, marginBottom: 28 }}>
        <div style={{ ...card, padding: 22 }}>
          <h4 style={{ ...sectionTitle, fontSize: 14, marginBottom: 16 }}>Gênero</h4>
          {!demo?.gender?.length ? (
            <div style={{ height: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', color: COLORS.faint }}>
              Sem dados ainda
            </div>
          ) : (
            <ProfileBars data={demo.gender} colors={GENDER_COLORS} labelMap={GENDER_LABEL} />
          )}
        </div>
        <div style={{ ...card, padding: 22 }}>
          <h4 style={{ ...sectionTitle, fontSize: 14, marginBottom: 16 }}>Origem</h4>
          {!demo?.origin?.length ? (
            <div style={{ height: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', color: COLORS.faint }}>
              Sem dados ainda
            </div>
          ) : (
            <ProfileBars data={demo.origin} colors={ORIGIN_COLORS} labelMap={ORIGIN_LABEL} />
          )}
        </div>
      </div>

      {/* Principais achados */}
      <div style={{ ...card, marginBottom: 24, padding: 28 }}>
        <h3 style={{ ...sectionTitle, marginBottom: 18, fontSize: 18 }}>Principais achados</h3>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {findings.map((f, i) => (
            <div
              key={i}
              style={{
                display: 'flex',
                gap: 22,
                padding: '20px 0',
                borderBottom: i < findings.length - 1 ? `1px solid ${COLORS.border}` : 'none',
              }}
            >
              <span style={{
                fontFamily: "'Space Mono', monospace",
                fontSize: 12,
                color: COLORS.brand,
                fontWeight: 700,
                minWidth: 28,
              }}>
                {String(i + 1).padStart(2, '0')}
              </span>
              <div style={{ flex: 1 }}>
                <h4 style={{
                  fontFamily: "'Sora', sans-serif",
                  fontSize: 15,
                  color: COLORS.text,
                  margin: '0 0 6px',
                  fontWeight: 700,
                }}>
                  {f.title}
                </h4>
                <p style={{
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: 13,
                  color: COLORS.muted,
                  margin: 0,
                  lineHeight: 1.5,
                }}>
                  {f.body}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <button onClick={handleExportPdf} style={{ ...btnPrimary, padding: '18px', fontSize: 14 }}>
          Exportar relatório em PDF
        </button>
        <button onClick={handleExportCsv} style={{ ...btnGhost, padding: '18px', fontSize: 14 }} disabled={!exhibitionId}>
          Exportar dados em CSV
        </button>
      </div>

      <p style={{ marginTop: 14, fontSize: 11, color: COLORS.faint, textAlign: 'center' }}>
        CSV agrega por (data, faixa etária, gênero, origem, canal) e suprime células com menos de 5 ocorrências (k-anonymity, LGPD Art. 12).
      </p>
    </div>
  );
}
