import { useEffect, useState } from 'react';
import { jsPDF } from 'jspdf';
import { api } from '../../services/api';
import { useRealtimeUpdates } from '../../services/useRealtimeUpdates';
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
  const [hoje, setHoje] = useState<{ tempo_medio_min: number | null } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = () => {
    api.get('/historico').then(r => setAcc(r.data)).catch(e => setError(e?.message));
    api.get('/resumo/historico?days=30').then(r => setHistorico(r.data || [])).catch(() => {});
    api.get('/resumo/recorrencia').then(r => setRecorrencia(r.data)).catch(() => {});
    api.get('/resumo/hoje').then(r => setHoje(r.data)).catch(() => {});
    if (exhibitionId) {
      api.get(`/analytics/demographics/${exhibitionId}`).then(r => setDemo(r.data)).catch(() => {});
      api.get(`/analytics/trends/${exhibitionId}`).then(r => setTrends(r.data || [])).catch(() => {});
    }
    if (museumId) {
      api.get(`/recommendations/museum/${museumId}/insights`).then(r => setInsights(r.data?.insights ?? null)).catch(() => {});
    }
  };

  useEffect(() => { refresh(); /* eslint-disable-line react-hooks/exhaustive-deps */ }, [exhibitionId, museumId]);
  useRealtimeUpdates(refresh);

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

    // Brand palette — matches the dashboard's `COLORS` and gradient.
    const brand: [number, number, number] = [240, 66, 106];   // pink (primary)
    const brand2: [number, number, number] = [255, 94, 91];   // coral
    const brandOrange: [number, number, number] = [245, 158, 66];
    const ink: [number, number, number] = [25, 18, 28];
    const inkSoft: [number, number, number] = [80, 75, 90];
    const inkFaint: [number, number, number] = [140, 135, 150];
    const surface: [number, number, number] = [250, 248, 246];
    const ruleSoft: [number, number, number] = [228, 224, 232];

    // Helpers ─────────────────────────────────────────────────────────────────
    const setFill = (c: [number, number, number]) => doc.setFillColor(c[0], c[1], c[2]);
    const setStroke = (c: [number, number, number]) => doc.setDrawColor(c[0], c[1], c[2]);
    const setText = (c: [number, number, number]) => doc.setTextColor(c[0], c[1], c[2]);

    /** Brand gradient strip (3 colored rects, gives a magazine feel without raster). */
    const drawBrandStrip = (yPos: number, height = 4) => {
      const w = pageWidth / 3;
      setFill(brand);       doc.rect(0,         yPos, w, height, 'F');
      setFill(brand2);      doc.rect(w,         yPos, w, height, 'F');
      setFill(brandOrange); doc.rect(w * 2,     yPos, w, height, 'F');
    };

    /** Pulso ring logo — 3 concentric rings + filled core. Drawn in pure jsPDF primitives. */
    const drawPulseLogo = (cx: number, cy: number, size = 14) => {
      const r = size / 2;
      doc.setLineWidth(0.7);
      setStroke(brand);       doc.circle(cx, cy, r,         'S');
      setStroke(brand2);      doc.circle(cx, cy, r * 0.72,  'S');
      setStroke(brandOrange); doc.circle(cx, cy, r * 0.44,  'S');
      setFill(brand);         doc.circle(cx, cy, r * 0.20,  'F');
    };

    /** Title block of a content section: pill + title + accent rule. */
    const drawSectionHeader = (yPos: number, kicker: string, title: string): number => {
      // Small kicker pill
      doc.setFontSize(7);
      const kickerWidth = doc.getTextWidth(kicker) + 14;
      setFill(brand);
      doc.roundedRect(margin, yPos - 8, kickerWidth, 12, 6, 6, 'F');
      doc.setFont('helvetica', 'bold');
      setText([255, 255, 255]);
      doc.text(kicker, margin + 7, yPos);
      // Title
      setText(ink);
      doc.setFontSize(15);
      doc.setFont('helvetica', 'bold');
      doc.text(title, margin, yPos + 18);
      // Accent rule
      setStroke(ruleSoft);
      doc.setLineWidth(0.5);
      doc.line(margin, yPos + 26, pageWidth - margin, yPos + 26);
      return yPos + 38;
    };

    /** Page-break helper — adds a new page when content would overflow. */
    const ensureSpace = (need: number, currentY: number): number => {
      if (currentY + need > pageHeight - margin - 24) {
        doc.addPage();
        return margin + 12;
      }
      return currentY;
    };

    // ─── Cover header ─────────────────────────────────────────────────────────
    drawBrandStrip(0, 6);
    let y = margin + 8;

    // Brand row: logo + wordmark
    drawPulseLogo(margin + 8, y + 6, 16);
    setText(ink);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text('PULSO', margin + 28, y + 4);
    setText(inkFaint);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text('CULTURAL', margin + 28, y + 14);

    // Right-aligned date stamp
    setText(inkFaint);
    doc.setFontSize(8);
    const today = new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
    doc.text(today.toUpperCase(), pageWidth - margin, y + 4, { align: 'right' });
    doc.text('RELATÓRIO DE IMPACTO', pageWidth - margin, y + 14, { align: 'right' });
    // Big gap before the headline so the 30pt-tall title doesn't crash into
    // the rings logo / brand row above it.
    y += 56;

    // Big title block
    setText(ink);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(30);
    doc.text('Relatório de impacto', margin, y);
    y += 20;
    setText(brand);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.text('Pilotando a régua real de público num museu cultural', margin, y);
    y += 26;

    // ─── Hero metric ──────────────────────────────────────────────────────────
    if (acc) {
      const heroHeight = 130;
      // Background: soft surface with gradient strip on the left
      setFill(surface);
      setStroke(ruleSoft);
      doc.setLineWidth(0.6);
      doc.roundedRect(margin, y, contentWidth, heroHeight, 14, 14, 'FD');
      // Left accent band (the "pulse" gradient, in 3 stacked thin rectangles)
      const accentW = 6;
      setFill(brand);       doc.rect(margin, y + 14,                     accentW, (heroHeight - 28) / 3, 'F');
      setFill(brand2);      doc.rect(margin, y + 14 + (heroHeight - 28) / 3, accentW, (heroHeight - 28) / 3, 'F');
      setFill(brandOrange); doc.rect(margin, y + 14 + (heroHeight - 28) * 2 / 3, accentW, (heroHeight - 28) / 3, 'F');

      // Kicker
      setText(brand);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.text('DADO CENTRAL DO PILOTO', margin + 24, y + 26);

      // Big number
      setText(ink);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(64);
      doc.text(`${acc.multiplicador}×`, margin + 24, y + 84);

      // Headline next to the number
      setText(ink);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(13);
      doc.text('mais visitantes reais', margin + 200, y + 60);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(11);
      setText(inkSoft);
      doc.text('do que o livro de assinatura registrou', margin + 200, y + 78);

      // Caption row
      const livro = livroEstimado ?? '—';
      setText(inkFaint);
      doc.setFontSize(8);
      doc.text(
        `Câmera: ${acc.camera.toLocaleString('pt-BR')}     Livro estimado: ~${typeof livro === 'number' ? livro.toLocaleString('pt-BR') : livro}     Período: 30 dias`,
        margin + 24, y + heroHeight - 14
      );
      y += heroHeight + 28;
    }

    // ─── Métricas consolidadas ────────────────────────────────────────────────
    if (acc) {
      y = ensureSpace(180, y);
      y = drawSectionHeader(y, '01 · MÉTRICAS', 'Métricas consolidadas');

      const adesao = acc.camera > 0 ? Math.round((acc.checkins / acc.camera) * 100) : 0;
      const stats: { label: string; value: string; sub: string; color: [number, number, number] }[] = [
        { label: 'Visitantes',     value: acc.camera.toLocaleString('pt-BR'),                       sub: 'Detectados pela câmera', color: brand },
        { label: 'Check-ins',      value: acc.checkins.toLocaleString('pt-BR'),                     sub: 'Cadastros voluntários',   color: brandOrange },
        { label: 'Adesão',         value: `${adesao}%`,                                              sub: 'Check-ins ÷ visitantes',  color: [72, 187, 120] },
        { label: 'Taxa de retorno',value: `${acc.retorno}%`,                                         sub: 'Pulsaram ≥ 2 vezes',      color: [72, 187, 120] },
        { label: 'Multiplicador',  value: `${acc.multiplicador}×`,                                   sub: 'Câmera vs. livro',         color: brand },
        { label: 'Recorrentes',    value: (recorrencia?.retorno ?? 0).toLocaleString('pt-BR'),       sub: 'Pessoas únicas',           color: [212, 38, 126] },
      ];

      const cardW = (contentWidth - 16) / 3;
      const cardH = 70;
      stats.forEach((s, i) => {
        const col = i % 3;
        const row = Math.floor(i / 3);
        const cx = margin + col * (cardW + 8);
        const cy = y + row * (cardH + 10);
        // Card bg
        setFill([255, 255, 255]);
        setStroke(ruleSoft);
        doc.setLineWidth(0.6);
        doc.roundedRect(cx, cy, cardW, cardH, 10, 10, 'FD');
        // Left color bar
        setFill(s.color);
        doc.rect(cx, cy + 8, 3, cardH - 16, 'F');
        // Big value — extra gap so the side bar doesn't crowd the digits
        setText(s.color);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(22);
        doc.text(s.value, cx + 18, cy + 30);
        // Label
        setText(ink);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.text(s.label, cx + 18, cy + 46);
        // Sub
        setText(inkFaint);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7.5);
        doc.text(s.sub, cx + 18, cy + 58);
      });
      y += Math.ceil(stats.length / 3) * (cardH + 10) + 24;
    }

    // ─── Perfil do público ────────────────────────────────────────────────────
    if (demo && (demo.gender.length > 0 || demo.origin.length > 0)) {
      y = ensureSpace(180, y);
      y = drawSectionHeader(y, '02 · PERFIL', 'Perfil do público');

      const drawBars = (
        title: string,
        data: { name: string; value: number }[],
        labelMap: Record<string, string>,
        color: [number, number, number],
        startY: number
      ): number => {
        let by = startY;
        setText(inkSoft);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.text(title.toUpperCase(), margin, by);
        by += 14;

        const labelW = 110;
        const barMaxW = contentWidth - labelW - 60;
        for (const d of data) {
          setText(ink);
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(9);
          doc.text(labelMap[d.name] || d.name, margin, by + 8);
          // Track
          setFill([244, 240, 246]);
          doc.roundedRect(margin + labelW, by + 1, barMaxW, 11, 3, 3, 'F');
          // Fill
          setFill(color);
          const fillW = Math.max(2, barMaxW * (d.value / 100));
          doc.roundedRect(margin + labelW, by + 1, fillW, 11, 3, 3, 'F');
          // Value
          setText(ink);
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(9);
          doc.text(`${d.value}%`, margin + contentWidth, by + 8, { align: 'right' });
          by += 17;
        }
        return by + 10;
      };

      if (demo.gender.length > 0) {
        y = drawBars('Gênero', demo.gender, GENDER_LABEL, [212, 38, 126], y);
      }
      if (demo.origin.length > 0) {
        y = ensureSpace(demo.origin.length * 17 + 20, y);
        y = drawBars('Origem', demo.origin, ORIGIN_LABEL, brand, y);
      }
      y += 6;
    }

    // ─── Principais achados ───────────────────────────────────────────────────
    y = ensureSpace(80, y);
    y = drawSectionHeader(y, '03 · INSIGHTS', 'Principais achados');

    findings.forEach((f, i) => {
      const cardPadding = 14;
      const numberCol = 44; // extra breathing room between the big number and the title text
      const titleLines = doc.splitTextToSize(f.title, contentWidth - cardPadding * 2 - numberCol);
      const bodyLines = doc.splitTextToSize(f.body, contentWidth - cardPadding * 2 - numberCol);
      const cardH = cardPadding * 2 + titleLines.length * 13 + bodyLines.length * 11 + 8;
      y = ensureSpace(cardH + 12, y);

      // Card bg
      setFill([253, 251, 254]);
      setStroke(ruleSoft);
      doc.setLineWidth(0.6);
      doc.roundedRect(margin, y, contentWidth, cardH, 10, 10, 'FD');

      // Big number on the left
      setText(brand);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(20);
      doc.text(String(i + 1).padStart(2, '0'), margin + cardPadding, y + cardPadding + 14);

      // Title
      setText(ink);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.text(titleLines, margin + cardPadding + numberCol, y + cardPadding + 8);

      // Body
      setText(inkSoft);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9.5);
      doc.text(bodyLines, margin + cardPadding + numberCol, y + cardPadding + 8 + titleLines.length * 13 + 6);

      y += cardH + 10;
    });

    // ─── Footer (every page) ─────────────────────────────────────────────────
    const totalPages = (doc as any).internal.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      drawBrandStrip(pageHeight - 4, 4);

      // Footer text — left: brand line; right: page count
      setText(inkFaint);
      doc.setFontSize(7.5);
      doc.setFont('helvetica', 'normal');
      doc.text('Pulso Cultural · Dados agregados conforme LGPD Art. 12',
        margin, pageHeight - 12);
      doc.text(`${i} / ${totalPages}`, pageWidth - margin, pageHeight - 12, { align: 'right' });
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
        <StatCard
          value={hoje?.tempo_medio_min != null ? `${hoje.tempo_medio_min} min` : '—'}
          label="Permanência média"
          color={COLORS.purple}
        />
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
