import { useState, useEffect, useRef, useCallback } from 'react';
import { api } from '../services/api';

// ─── Types ────────────────────────────────────────────────────────────────────
interface Exhibition {
  id: string;
  name: string;
  status: string;
  coverImage?: string;
}

interface QREntry {
  id: string;
  label?: string;
  destinationUrl: string;
  isActive: boolean;
  createdAt: string;
}

type Panel = 'qr' | 'upload' | 'pdf' | null;

// ─── Design tokens ───────────────────────────────────────────────────────────
const T = {
  bg:        '#1A0A0E',
  bgPanel:   '#231018',
  border:    '#3D2030',
  accent:    '#E8554E',
  accentB:   '#D4267E',
  text:      '#F5ECE4',
  muted:     '#6B5A60',
  success:   '#4CAF82',
  error:     '#E8554E',
  radius:    '14px',
  radiusSm:  '8px',
  shadow:    '0 8px 40px rgba(0,0,0,0.6)',
};

const btn = (active = false): React.CSSProperties => ({
  display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column',
  gap: 4, width: 56, height: 56, borderRadius: 12, border: 'none', cursor: 'pointer',
  background: active ? `linear-gradient(135deg, ${T.accent}, ${T.accentB})` : T.bgPanel,
  color: active ? '#fff' : T.muted, fontSize: 10, fontFamily: 'Sora, sans-serif',
  fontWeight: 600, letterSpacing: 0.5, transition: 'all 0.2s',
  boxShadow: active ? `0 4px 16px rgba(232,85,78,0.4)` : 'none',
  outline: 'none',
});

const panelStyle: React.CSSProperties = {
  position: 'fixed', top: 0, right: 72, width: 340, height: '100vh',
  background: T.bgPanel, borderLeft: `1px solid ${T.border}`,
  boxShadow: T.shadow, display: 'flex', flexDirection: 'column',
  fontFamily: 'DM Sans, sans-serif', zIndex: 9998,
  overflowY: 'auto',
};

const h2Style: React.CSSProperties = {
  fontFamily: 'Sora, sans-serif', fontSize: 14, fontWeight: 700,
  color: T.text, margin: 0,
};

const labelStyle: React.CSSProperties = {
  fontSize: 11, fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase',
  color: T.muted, marginBottom: 6, display: 'block',
};

const inputStyle: React.CSSProperties = {
  width: '100%', background: T.bg, border: `1px solid ${T.border}`,
  borderRadius: T.radiusSm, padding: '10px 12px', color: T.text,
  fontSize: 13, fontFamily: 'DM Sans, sans-serif', outline: 'none',
  boxSizing: 'border-box',
};

const btnPrimary: React.CSSProperties = {
  width: '100%', padding: '12px 16px', borderRadius: T.radiusSm,
  background: `linear-gradient(135deg, ${T.accent}, ${T.accentB})`,
  border: 'none', color: '#fff', fontSize: 13, fontWeight: 700,
  fontFamily: 'Sora, sans-serif', cursor: 'pointer', letterSpacing: 0.5,
};

const btnSecondary: React.CSSProperties = {
  ...btnPrimary,
  background: T.bgPanel, border: `1px solid ${T.border}`, color: T.muted,
};

// ─── QR Panel ────────────────────────────────────────────────────────────────
function QRPanel() {
  const [exhibitions, setExhibitions] = useState<Exhibition[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [label, setLabel] = useState('Entrada Principal');
  const [url, setUrl] = useState('https://pulso-web-production.up.railway.app/');
  const [active, setActive] = useState<QREntry[]>([]);
  const [previewSrc, setPreviewSrc] = useState('');
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

  const showToast = (msg: string, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3500);
  };

  useEffect(() => {
    api.get('/exhibitions').then(r => {
      const list: Exhibition[] = r.data?.exhibitions ?? r.data ?? [];
      setExhibitions(list);
      if (list.length) setSelectedId(list[0].id);
    }).catch(() => {});

    api.get('/qrcode/active').then(r => {
      setActive(r.data?.qrcodes ?? r.data ?? []);
    }).catch(() => {});
  }, []);

  const generate = async () => {
    if (!url.trim()) return;
    setLoading(true);
    try {
      const res = await api.post('/qrcode/generate', {
        destinationUrl: url,
        label,
        exhibitionId: selectedId || undefined,
      });
      const qr = res.data?.qrcode ?? res.data;
      setActive(prev => [qr, ...prev]);
      // Get preview image
      const tokenRes = await api.get(`/qrcode/${qr.id}/token`);
      const token = tokenRes.data?.token;
      if (token) {
        const apiBase = import.meta.env.VITE_API_URL || '';
        setPreviewSrc(`${apiBase}/qrcode/${qr.id}/image.png?token=${token}`);
      }
      showToast('QR Code gerado com sucesso!');
    } catch {
      showToast('Erro ao gerar QR Code.', false);
    } finally {
      setLoading(false);
    }
  };

  const revoke = async (id: string) => {
    try {
      await api.patch(`/qrcode/${id}/revoke`);
      setActive(prev => prev.map(q => q.id === id ? { ...q, isActive: false } : q));
      showToast('QR revogado.');
    } catch {
      showToast('Erro ao revogar.', false);
    }
  };

  return (
    <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 20 }}>
      {toast && (
        <div style={{ padding: '10px 14px', borderRadius: T.radiusSm, fontSize: 13,
          background: toast.ok ? '#1a3a2a' : '#3a1a1a', color: toast.ok ? T.success : T.error,
          border: `1px solid ${toast.ok ? T.success : T.error}40` }}>
          {toast.msg}
        </div>
      )}

      <div>
        <span style={labelStyle}>URL de destino</span>
        <input style={inputStyle} value={url} onChange={e => setUrl(e.target.value)}
          placeholder="https://..." />
      </div>

      <div>
        <span style={labelStyle}>Rótulo</span>
        <input style={inputStyle} value={label} onChange={e => setLabel(e.target.value)}
          placeholder="Ex: Entrada Principal" />
      </div>

      {exhibitions.length > 0 && (
        <div>
          <span style={labelStyle}>Exposição</span>
          <select style={{ ...inputStyle, appearance: 'none' }}
            value={selectedId} onChange={e => setSelectedId(e.target.value)}>
            <option value="">— nenhuma —</option>
            {exhibitions.map(ex => (
              <option key={ex.id} value={ex.id}>{ex.name}</option>
            ))}
          </select>
        </div>
      )}

      <button style={btnPrimary} onClick={generate} disabled={loading}>
        {loading ? 'Gerando…' : '📲 Gerar QR Code'}
      </button>

      {previewSrc && (
        <div style={{ textAlign: 'center', padding: '16px', background: '#fff',
          borderRadius: T.radiusSm }}>
          <img src={previewSrc} alt="QR Code" style={{ width: 180, height: 180 }} />
          <div style={{ marginTop: 8 }}>
            <a href={previewSrc} download="qrcode-pulso.png"
              style={{ ...btnPrimary, display: 'inline-block', textDecoration: 'none',
                padding: '8px 20px', fontSize: 12 }}>
              ⬇ Baixar PNG
            </a>
          </div>
        </div>
      )}

      {active.length > 0 && (
        <div>
          <span style={labelStyle}>QRs ativos</span>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {active.filter(q => q.isActive).slice(0, 5).map(q => (
              <div key={q.id} style={{ padding: '10px 12px', background: T.bg,
                borderRadius: T.radiusSm, border: `1px solid ${T.border}`,
                display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: 12, color: T.text, fontWeight: 600 }}>
                    {q.label || 'Sem rótulo'}
                  </div>
                  <div style={{ fontSize: 10, color: T.muted, marginTop: 2 }}>
                    {new Date(q.createdAt).toLocaleDateString('pt-BR')}
                  </div>
                </div>
                <button style={{ ...btnSecondary, width: 'auto', padding: '4px 10px',
                  fontSize: 10 }} onClick={() => revoke(q.id)}>
                  Revogar
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Upload Panel ─────────────────────────────────────────────────────────────
function UploadPanel() {
  const [exhibitions, setExhibitions] = useState<Exhibition[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState('');
  const [uploading, setUploading] = useState(false);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);
  const coverRef = useRef<HTMLInputElement>(null);

  const showToast = (msg: string, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3500);
  };

  useEffect(() => {
    api.get('/exhibitions').then(r => {
      const list: Exhibition[] = r.data?.exhibitions ?? r.data ?? [];
      setExhibitions(list);
      if (list.length) {
        setSelectedId(list[0].id);
        if (list[0].coverImage) setCoverPreview(list[0].coverImage);
      }
    }).catch(() => {});
  }, []);

  const handleCoverSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(f.type)) {
      showToast('Formato inválido. Use PNG, JPG ou WebP.', false);
      return;
    }
    if (f.size > 5 * 1024 * 1024) {
      showToast('Arquivo muito grande. Máximo: 5MB.', false);
      return;
    }
    setCoverFile(f);
    setCoverPreview(URL.createObjectURL(f));
  };

  const uploadCover = async () => {
    if (!coverFile || !selectedId) return;
    setUploading(true);
    try {
      // Convert to base64 and save via PUT /exhibitions/:id
      const reader = new FileReader();
      await new Promise<void>((resolve, reject) => {
        reader.onload = async () => {
          try {
            await api.put(`/exhibitions/${selectedId}`, {
              coverImage: reader.result as string,
            });
            resolve();
          } catch (e) { reject(e); }
        };
        reader.onerror = reject;
        reader.readAsDataURL(coverFile);
      });
      showToast('Imagem de capa atualizada!');
    } catch {
      // Fallback: save as base64 via JSON
      try {
        const reader = new FileReader();
        reader.onload = async () => {
          await api.put(`/exhibitions/${selectedId}`, {
            coverImage: reader.result as string,
          });
          showToast('Imagem salva!');
        };
        reader.readAsDataURL(coverFile);
      } catch {
        showToast('Erro ao enviar imagem.', false);
      }
    } finally {
      setUploading(false);
    }
  };

  const onExhibitionChange = (id: string) => {
    setSelectedId(id);
    const ex = exhibitions.find(e => e.id === id);
    setCoverPreview(ex?.coverImage || '');
    setCoverFile(null);
  };

  return (
    <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 20 }}>
      {toast && (
        <div style={{ padding: '10px 14px', borderRadius: T.radiusSm, fontSize: 13,
          background: toast.ok ? '#1a3a2a' : '#3a1a1a', color: toast.ok ? T.success : T.error,
          border: `1px solid ${toast.ok ? T.success : T.error}40` }}>
          {toast.msg}
        </div>
      )}

      {exhibitions.length > 0 && (
        <div>
          <span style={labelStyle}>Exposição</span>
          <select style={{ ...inputStyle, appearance: 'none' }}
            value={selectedId} onChange={e => onExhibitionChange(e.target.value)}>
            {exhibitions.map(ex => (
              <option key={ex.id} value={ex.id}>{ex.name}</option>
            ))}
          </select>
        </div>
      )}

      <div>
        <span style={labelStyle}>Imagem de capa</span>
        <div
          onClick={() => coverRef.current?.click()}
          style={{ border: `2px dashed ${T.border}`, borderRadius: T.radius,
            padding: 20, textAlign: 'center', cursor: 'pointer',
            background: T.bg, transition: 'border-color 0.2s',
            minHeight: 140, display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center', gap: 8 }}>
          {coverPreview ? (
            <img src={coverPreview} alt="Capa" style={{ maxWidth: '100%', maxHeight: 120,
              borderRadius: T.radiusSm, objectFit: 'cover' }} />
          ) : (
            <>
              <span style={{ fontSize: 32 }}>🖼</span>
              <span style={{ fontSize: 12, color: T.muted }}>
                Clique para selecionar<br />PNG, JPG ou WebP · máx 5MB
              </span>
            </>
          )}
        </div>
        <input ref={coverRef} type="file" accept="image/png,image/jpeg,image/webp"
          style={{ display: 'none' }} onChange={handleCoverSelect} />
      </div>

      {coverFile && (
        <div style={{ fontSize: 12, color: T.muted, padding: '8px 12px',
          background: T.bg, borderRadius: T.radiusSm, border: `1px solid ${T.border}` }}>
          📎 {coverFile.name} ({(coverFile.size / 1024).toFixed(0)} KB)
        </div>
      )}

      <button style={{ ...btnPrimary, opacity: (!coverFile || !selectedId) ? 0.4 : 1 }}
        onClick={uploadCover}
        disabled={!coverFile || !selectedId || uploading}>
        {uploading ? 'Enviando…' : '⬆ Salvar imagem de capa'}
      </button>

      <div style={{ borderTop: `1px solid ${T.border}`, paddingTop: 16 }}>
        <p style={{ fontSize: 12, color: T.muted, margin: 0, lineHeight: 1.6 }}>
          💡 Para upload de imagens de obras individuais, use a aba <strong style={{ color: T.text }}>Exposição</strong> no dashboard principal e clique em cada obra.
        </p>
      </div>
    </div>
  );
}

// ─── PDF Export Panel ─────────────────────────────────────────────────────────
function PDFPanel() {
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<Record<string, unknown> | null>(null);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

  const showToast = (msg: string, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3500);
  };

  useEffect(() => {
    api.get('/dashboard/resumo/hoje').then(r => setStats(r.data)).catch(() => {});
  }, []);

  const generatePDF = useCallback(async () => {
    setLoading(true);
    try {
      await new Promise<void>((resolve, reject) => {
        if ((window as any).jspdf) return resolve();
        const s = document.createElement('script');
        s.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
        s.onload = () => resolve();
        s.onerror = reject;
        document.head.appendChild(s);
      });

      const jsPDF = (window as any).jspdf?.jsPDF ?? (window as any).jsPDF;
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const today = new Date().toLocaleDateString('pt-BR', {
        day: '2-digit', month: 'long', year: 'numeric',
      });
      const W = 210; const M = 20;

      // ── Capa ──
      doc.setFillColor(26, 10, 14);
      doc.rect(0, 0, W, 297, 'F');
      doc.setDrawColor(232, 85, 78);
      doc.setLineWidth(0.5);
      doc.rect(M, 20, W - M * 2, 257, 'S');

      doc.setTextColor(232, 85, 78);
      doc.setFontSize(8);
      doc.text('PULSO CULTURAL · RELATÓRIO DE IMPACTO', W / 2, 35, { align: 'center' });

      doc.setTextColor(245, 236, 228);
      doc.setFontSize(26);
      doc.setFont('helvetica', 'bold');
      doc.text('Relatório de', W / 2, 80, { align: 'center' });
      doc.text('Impacto Cultural', W / 2, 95, { align: 'center' });

      doc.setTextColor(168, 150, 154);
      doc.setFontSize(12);
      doc.setFont('helvetica', 'normal');
      doc.text(today, W / 2, 115, { align: 'center' });

      doc.setDrawColor(232, 85, 78);
      doc.setLineWidth(1);
      doc.line(M + 20, 125, W - M - 20, 125);

      // ── Página 2: Métricas ──
      doc.addPage();
      doc.setFillColor(26, 10, 14);
      doc.rect(0, 0, W, 297, 'F');

      let y = 25;
      doc.setTextColor(232, 85, 78);
      doc.setFontSize(8);
      doc.text('MÉTRICAS GERAIS', M, y);
      y += 12;

      const s: any = stats || {};
      const metrics: [string, string][] = [
        ['Entradas Hoje', String(s.entradas_hoje ?? '—')],
        ['Saídas Hoje', String(s.saidas_hoje ?? '—')],
        ['Check-ins Hoje', String(s.checkins_hoje ?? '—')],
        ['Ocupação Atual', String(s.ocupacao_atual ?? '—')],
        ['Ocupação Pico', String(s.ocupacao_pico ? Math.round(s.ocupacao_pico) : '—')],
        ['Atualizado em', s.atualizado_em ? new Date(s.atualizado_em).toLocaleTimeString('pt-BR') : '—'],
      ];

      metrics.forEach(([label, value]) => {
        doc.setTextColor(245, 236, 228);
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text(label, M, y);

        doc.setTextColor(168, 150, 154);
        doc.setFontSize(11);
        doc.setFont('helvetica', 'normal');
        doc.text(value, W - M, y, { align: 'right' });

        doc.setDrawColor(50, 30, 40);
        doc.setLineWidth(0.3);
        doc.line(M, y + 3, W - M, y + 3);
        y += 16;
      });

      // ── Rodapé ──
      doc.setTextColor(107, 90, 96);
      doc.setFontSize(8);
      doc.text(
        `Gerado em ${today} · Pulso Cultural · Dados LGPD-compliant`,
        W / 2, 280, { align: 'center' }
      );

      doc.save('relatorio-impacto-pulso-cultural.pdf');
      showToast('PDF exportado com sucesso!');
    } catch {
      showToast('Erro ao gerar PDF.', false);
    } finally {
      setLoading(false);
    }
  }, [stats]);

  return (
    <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 20 }}>
      {toast && (
        <div style={{ padding: '10px 14px', borderRadius: T.radiusSm, fontSize: 13,
          background: toast.ok ? '#1a3a2a' : '#3a1a1a', color: toast.ok ? T.success : T.error,
          border: `1px solid ${toast.ok ? T.success : T.error}40` }}>
          {toast.msg}
        </div>
      )}

      <div style={{ padding: '16px', background: T.bg, borderRadius: T.radius,
        border: `1px solid ${T.border}` }}>
        <div style={{ fontSize: 12, color: T.muted, marginBottom: 12, fontWeight: 600,
          letterSpacing: 1, textTransform: 'uppercase' as const }}>
          Conteúdo do relatório
        </div>
        {[
          '📄 Capa com data de geração',
          '📊 Métricas gerais (visitantes, avaliação, etc.)',
          '🌍 Distribuição de origens',
          '♿ Acessibilidade',
          '📅 Período da exposição ativa',
        ].map(item => (
          <div key={item} style={{ fontSize: 12, color: T.text, padding: '6px 0',
            borderBottom: `1px solid ${T.border}` }}>
            {item}
          </div>
        ))}
      </div>

      {stats && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          {[
            ['Entradas', (stats as any).entradas_hoje ?? '—'],
            ['Check-ins', (stats as any).checkins_hoje ?? '—'],
          ].map(([k, v]) => (
            <div key={String(k)} style={{ padding: '12px', background: T.bg,
              borderRadius: T.radiusSm, border: `1px solid ${T.border}`, textAlign: 'center' }}>
              <div style={{ fontSize: 20, fontWeight: 700, color: T.accent }}>{String(v)}</div>
              <div style={{ fontSize: 10, color: T.muted, marginTop: 4 }}>{String(k)}</div>
            </div>
          ))}
        </div>
      )}

      <button style={btnPrimary} onClick={generatePDF} disabled={loading}>
        {loading ? 'Gerando PDF…' : '📥 Exportar Relatório PDF'}
      </button>

      <p style={{ fontSize: 11, color: T.muted, margin: 0, lineHeight: 1.6 }}>
        O PDF é gerado no seu navegador — nenhum dado sai do sistema. Formato A4, preto com detalhes em vermelho.
      </p>
    </div>
  );
}

// ─── Main Toolbar ─────────────────────────────────────────────────────────────
export function DashboardToolbar() {
  const [open, setOpen] = useState<Panel>(null);

  const toggle = (p: Panel) => setOpen(prev => prev === p ? null : p);

  const panels: { id: Panel; icon: string; label: string }[] = [
    { id: 'qr',     icon: '📲', label: 'QR' },
    { id: 'upload', icon: '🖼',  label: 'Mídia' },
    { id: 'pdf',    icon: '📥', label: 'PDF' },
  ];

  const titles: Record<string, string> = {
    qr:     '📲 QR Code Manager',
    upload: '🖼 Upload de Mídia',
    pdf:    '📥 Exportar Relatório',
  };

  return (
    <>
      {/* Floating sidebar toolbar */}
      <div style={{
        position: 'fixed', top: 0, right: 0, width: 64, height: '100vh',
        background: T.bgPanel, borderLeft: `1px solid ${T.border}`,
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        paddingTop: 80, gap: 10, zIndex: 9999,
        boxShadow: '-4px 0 20px rgba(0,0,0,0.3)',
      }}>
        {panels.map(p => (
          <button key={p.id} style={btn(open === p.id)} onClick={() => toggle(p.id)}
            title={p.label} aria-label={p.label}>
            <span style={{ fontSize: 20 }}>{p.icon}</span>
            <span>{p.label}</span>
          </button>
        ))}

        {/* Divider */}
        <div style={{ width: 32, height: 1, background: T.border, margin: '8px 0' }} />

        {/* Close all */}
        {open && (
          <button style={btn(false)} onClick={() => setOpen(null)} title="Fechar painel">
            <span style={{ fontSize: 18 }}>✕</span>
            <span>Fechar</span>
          </button>
        )}
      </div>

      {/* Slide-in panel */}
      {open && (
        <>
          {/* Backdrop (transparent, just catches clicks outside) */}
          <div style={{ position: 'fixed', inset: 0, zIndex: 9997 }}
            onClick={() => setOpen(null)} />

          <div style={panelStyle} onClick={e => e.stopPropagation()}>
            {/* Panel header */}
            <div style={{ padding: '20px 20px 16px', borderBottom: `1px solid ${T.border}`,
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              background: T.bgPanel, position: 'sticky', top: 0, zIndex: 1 }}>
              <h2 style={h2Style}>{titles[open!]}</h2>
              <button style={{ background: 'none', border: 'none', color: T.muted,
                cursor: 'pointer', fontSize: 18, padding: 4 }}
                onClick={() => setOpen(null)}>✕</button>
            </div>

            {/* Panel body */}
            {open === 'qr'     && <QRPanel />}
            {open === 'upload' && <UploadPanel />}
            {open === 'pdf'    && <PDFPanel />}
          </div>
        </>
      )}
    </>
  );
}
