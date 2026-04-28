import { Suspense, lazy, useEffect, useRef, useState } from 'react';
import { api } from '../../services/api';
import {
  card, COLORS, sectionTitle, sectionMeta, GRADIENT_PULSE,
  inputBase, labelStyle, btnPrimary, btnGhost, btnDanger,
} from './styles';

// Lazy: poster carries qrcode + jspdf + html-to-image (~350KB) — only loads
// when the manager actually clicks the Cartaz / QR button.
const PosterPreview = lazy(() => import('./PosterPreview').then(m => ({ default: m.PosterPreview })));

type Status = 'DRAFT' | 'ACTIVE' | 'ENDED';

interface Work {
  id?: string;
  artist: string;
  title: string;
  year: string;
  room: string;
  description: string;
  audioUrl?: string | null;
  order: number;
}

interface OtherExhibition {
  name: string;
  room: string;
}

interface Exhibition {
  id: string;
  museumId: string;
  name: string;
  subtitle?: string | null;
  description: string;
  startDate: string;
  endDate: string;
  sponsor?: string | null;
  coverImage?: string | null;
  audioUrl?: string | null;
  status: Status;
  works?: Work[];
  otherExhibitions?: OtherExhibition[] | null;
}

interface Props {
  museumId?: string;
  onChange?: () => void;
  selectedExhibitionId?: string;
}

const STATUS_CHIPS: { value: Status; label: string; color: string }[] = [
  { value: 'ACTIVE', label: 'Ativa',      color: COLORS.green },
  { value: 'DRAFT',  label: 'Programada', color: COLORS.muted },
  { value: 'ENDED',  label: 'Encerrada',  color: COLORS.faint },
];

function dateInput(iso: string | undefined | null): string {
  if (!iso) return '';
  return new Date(iso).toISOString().split('T')[0];
}

function statusDot(s: Status): string {
  if (s === 'ACTIVE') return COLORS.green;
  if (s === 'DRAFT')  return COLORS.orange;
  return COLORS.faint;
}

function statusLabel(s: Status): string {
  if (s === 'ACTIVE') return 'Em exibição';
  if (s === 'DRAFT')  return 'Programada';
  return 'Encerrada';
}

// ─── Curadoria field is currently visual-only — schema migration pending ──
// Persisted in localStorage keyed by exhibition id, until the backend column
// is approved and added (see comment in handleSave).
const CURATORSHIP_KEY = (id: string) => `pulso:curatorship:${id || 'new'}`;

// Resolve relative upload URLs (e.g. "/uploads/files/abc.jpg") against the API host.
const API_BASE = (import.meta as any).env?.VITE_API_URL || '';
function resolveImg(url: string | null | undefined): string {
  if (!url) return '';
  if (/^(https?:|data:|blob:)/i.test(url)) return url;
  return `${API_BASE}${url}`;
}

export function ExposicaoTab({ museumId, onChange, selectedExhibitionId }: Props) {
  const [list, setList] = useState<Exhibition[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [creatingNew, setCreatingNew] = useState(false);
  const [form, setForm] = useState<Exhibition | null>(null);
  const [curatorship, setCuratorship] = useState<string>('');
  const [works, setWorks] = useState<Work[]>([]);
  const [others, setOthers] = useState<OtherExhibition[]>([]);
  const [expandedWork, setExpandedWork] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [showPoster, setShowPoster] = useState(false);
  const [museumInfo, setMuseumInfo] = useState<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const worksContainerRef = useRef<HTMLDivElement>(null);

  const refreshList = async () => {
    try {
      const r = await api.get('/exhibitions');
      setList(r.data || []);
    } catch (err: any) {
      setError(err?.response?.data?.error || err?.message || 'Erro ao listar exposições');
    }
  };

  /**
   * Hydrate the form from an Exhibition object. When the caller already has
   * the full record from `GET /exhibitions` (which now includes works),
   * pass `{ skipFetch: true }` to skip the redundant `GET /exhibitions/:id`
   * round-trip — saves ~700ms on first paint of the tab.
   */
  const loadExhibition = async (id: string, opts?: { skipFetch?: boolean; preloaded?: Exhibition }) => {
    try {
      const ex: Exhibition = opts?.preloaded
        ?? (opts?.skipFetch ? null as any : (await api.get(`/exhibitions/${id}`)).data);
      if (!ex) return;
      setForm(ex);
      setWorks((ex.works || []).slice().sort((a, b) => a.order - b.order));
      setOthers(Array.isArray(ex.otherExhibitions) ? ex.otherExhibitions : []);
      setCuratorship(localStorage.getItem(CURATORSHIP_KEY(id)) || '');
      setEditingId(id);
      setCreatingNew(false);
      setExpandedWork(null);
      setError(null);
      setInfo(null);
    } catch (err: any) {
      setError(err?.response?.data?.error || err?.message || 'Erro ao carregar');
    }
  };

  useEffect(() => { refreshList(); }, []);

  // Museum info comes embedded in each exhibition's `museum` field, so we hydrate
  // from `form` rather than firing a separate `GET /museums/:id` round-trip.
  useEffect(() => {
    const m = (form as any)?.museum;
    if (m && !museumInfo) setMuseumInfo(m);
  }, [form, museumInfo]);

  // Close preview modal on Escape
  useEffect(() => {
    if (!showPreview) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setShowPreview(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [showPreview]);

  useEffect(() => {
    if (list.length === 0 || editingId || creatingNew) return;
    const target =
      list.find(e => e.id === selectedExhibitionId) ||
      list.find(e => e.status === 'ACTIVE') ||
      list[0];
    if (target) {
      // The list response already carries the full record (works, etc.) — see
      // ExhibitionController.index. Hydrate the form straight from it instead
      // of round-tripping `GET /exhibitions/:id`.
      loadExhibition(target.id, { preloaded: target });
    }
  }, [list, selectedExhibitionId]);

  const startNew = () => {
    if (!museumId) {
      setError('Usuário sem museu associado');
      return;
    }
    setCreatingNew(true);
    setEditingId(null);
    setExpandedWork(null);
    setError(null);
    setInfo(null);
    const today = new Date();
    const in30 = new Date(Date.now() + 30 * 24 * 3600 * 1000);
    setForm({
      id: '',
      museumId,
      name: '',
      subtitle: '',
      description: '',
      startDate: today.toISOString(),
      endDate: in30.toISOString(),
      sponsor: '',
      coverImage: '',
      audioUrl: null,
      status: 'DRAFT',
    });
    setCuratorship('');
    setWorks([]);
    setOthers([]);
    // Reset the hidden file input so a previously selected file doesn't
    // sneak back in via React's input.value preservation.
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const updateField = <K extends keyof Exhibition>(key: K, value: Exhibition[K]) =>
    setForm(f => f ? { ...f, [key]: value } : f);

  const updateWork = (i: number, key: keyof Work, value: any) =>
    setWorks(prev => prev.map((w, idx) => idx === i ? { ...w, [key]: value } : w));

  const addWork = () => {
    setWorks(prev => {
      const next = [...prev, {
        artist: '', title: '', year: '', room: '', description: '',
        audioUrl: null, order: prev.length + 1,
      }];
      const newIndex = next.length - 1;
      setExpandedWork(newIndex);
      // Scroll the new work into view after the next render so the user sees it.
      requestAnimationFrame(() => {
        const container = worksContainerRef.current;
        if (!container) return;
        const lastChild = container.children[newIndex] as HTMLElement | undefined;
        if (lastChild) {
          lastChild.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      });
      return next;
    });
  };

  const removeWork = (i: number) => {
    setWorks(prev => prev.filter((_, idx) => idx !== i).map((w, idx) => ({ ...w, order: idx + 1 })));
    setExpandedWork(null);
  };

  const handleImageDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    handleImageFile(file);
  };

  const handleImageFile = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      setError('Arquivo inválido. Envie PNG ou JPG.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError('Imagem maior que 5MB. Reduza antes de enviar.');
      return;
    }
    setError(null);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await api.post('/uploads', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const url = res.data?.url;
      if (!url) throw new Error('Resposta inválida do servidor');
      updateField('coverImage', url);
      setInfo('Imagem enviada. Clique em "Salvar e publicar guia" para persistir.');
    } catch (err: any) {
      setError(err?.response?.data?.error || err?.message || 'Falha ao enviar imagem');
    }
  };

  // `openGuideOnPublish` controls whether the guide preview auto-opens on save.
  // True only for the main "Salvar e publicar guia" footer button. The inline
  // "Salvar obra" / "Salvar lista" buttons pass false — they're partial saves
  // while the user is still editing, no preview should pop up.
  const handleSave = async (openGuideOnPublish: boolean = false) => {
    if (!form) return;
    if (!form.name.trim()) { setError('Nome é obrigatório'); setExpandedWork(null); return; }
    if (!form.description.trim()) { setError('Descrição é obrigatória'); setExpandedWork(null); return; }

    // Validate works — backend rejects empty title/artist (required columns).
    for (let i = 0; i < works.length; i++) {
      const w = works[i];
      if (!w.title.trim() || !w.artist.trim()) {
        setExpandedWork(i);
        setError(`Obra #${i + 1}: artista e título são obrigatórios. Preencha ou remova a obra.`);
        // Scroll to the offending work
        requestAnimationFrame(() => {
          const container = worksContainerRef.current;
          if (!container) return;
          const child = container.children[i] as HTMLElement | undefined;
          child?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        });
        return;
      }
    }

    setSaving(true);
    setError(null);
    setInfo(null);
    try {
      // NOTE: curatorship is not yet persisted on the backend. The schema column
      // has not been migrated on the production DB (waiting for user approval).
      // Until then, we save it in localStorage so the field round-trips locally.
      const body = {
        museumId: form.museumId,
        name: form.name.trim(),
        subtitle: form.subtitle || null,
        description: form.description,
        startDate: form.startDate,
        endDate: form.endDate,
        sponsor: form.sponsor || null,
        coverImage: form.coverImage || null,
        audioUrl: form.audioUrl && form.audioUrl !== 'https://' ? form.audioUrl : null,
        status: form.status,
        otherExhibitions: others.length > 0 ? others : null,
        works: works.map((w, idx) => ({
          artist: w.artist,
          title: w.title,
          year: w.year || '',
          room: w.room || '',
          description: w.description || '',
          audioUrl: w.audioUrl || null,
          order: idx + 1,
        })),
      };

      let savedId: string;
      if (creatingNew) {
        const r = await api.post('/exhibitions', body);
        savedId = r.data.id;
        if (works.length > 0 || others.length > 0) {
          await api.put(`/exhibitions/${savedId}`, body);
        }
      } else {
        await api.put(`/exhibitions/${form.id}`, body);
        savedId = form.id;
      }

      if (curatorship.trim()) {
        localStorage.setItem(CURATORSHIP_KEY(savedId), curatorship.trim());
      } else {
        localStorage.removeItem(CURATORSHIP_KEY(savedId));
      }

      const wasActive = form.status === 'ACTIVE';
      setInfo(creatingNew ? 'Exposição criada e publicada.' : 'Salvo.');
      await refreshList();
      await loadExhibition(savedId);
      onChange?.();

      // The main "Salvar e publicar guia" button opens the guide preview
      // (phone-frame iframe of /guide). The QR-code poster stays one click away
      // via the dedicated "📄 Cartaz / QR" button in the header.
      if (openGuideOnPublish && wasActive) {
        setShowPreview(true);
      }
    } catch (err: any) {
      setError(err?.response?.data?.error || err?.message || 'Erro ao salvar');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!form?.id) return;
    if (!window.confirm(`Apagar a exposição "${form.name}"?`)) return;
    setSaving(true);
    try {
      await api.delete(`/exhibitions/${form.id}`);
      localStorage.removeItem(CURATORSHIP_KEY(form.id));
      setInfo('Exposição apagada.');
      setForm(null);
      setWorks([]);
      setOthers([]);
      setEditingId(null);
      await refreshList();
      onChange?.();
    } catch (err: any) {
      setError(err?.response?.data?.error || err?.message || 'Erro ao apagar');
    } finally {
      setSaving(false);
    }
  };

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div>
      {/* Header card with current selection + Preview button */}
      {form && !creatingNew && (
        <div style={{ ...card, marginBottom: 24, padding: 22 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            {/* Header card identifies status with the dot in the title row; no thumbnail. */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{
                  display: 'inline-block',
                  width: 8, height: 8, borderRadius: '50%',
                  background: statusDot(form.status),
                  boxShadow: form.status === 'ACTIVE' ? `0 0 8px ${COLORS.green}` : 'none',
                  flexShrink: 0,
                }} />
                <h2 style={{ fontFamily: "'Sora', sans-serif", fontSize: 20, fontWeight: 700, color: COLORS.text, margin: 0 }}>
                  {form.name || '(sem nome)'}
                </h2>
              </div>
              <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: COLORS.muted, margin: 0 }}>
                {form.subtitle || '—'} · {statusLabel(form.status)}
              </p>
            </div>
            <button
              onClick={() => setShowPoster(true)}
              style={{ ...btnGhost, marginRight: 8 }}
              disabled={!museumInfo}
              title={museumInfo ? 'Gerar cartaz com QR code' : 'Carregando dados do museu…'}
            >
              📄 Cartaz / QR
            </button>
            <button onClick={() => setShowPreview(true)} style={btnGhost}>
              👁 Preview do guia
            </button>
          </div>
        </div>
      )}

      {error && (
        <div style={{ ...card, borderColor: 'rgba(232,85,78,0.3)', background: 'rgba(232,85,78,0.08)', color: '#F2A29F', marginBottom: 16 }}>
          ⚠️ {error}
        </div>
      )}
      {info && (
        <div style={{ ...card, borderColor: 'rgba(72,187,120,0.3)', background: 'rgba(72,187,120,0.06)', color: '#9FE2B4', marginBottom: 16 }}>
          ✓ {info}
        </div>
      )}

      {/* Exhibition switcher */}
      {list.length > 0 && (
        <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
          {list.map(ex => (
            <button
              key={ex.id}
              onClick={() => loadExhibition(ex.id, { preloaded: ex })}
              style={{
                background: 'transparent',
                border: `1px solid ${editingId === ex.id ? COLORS.brand : COLORS.border}`,
                borderRadius: 100,
                color: editingId === ex.id ? COLORS.brand : COLORS.muted,
                padding: '8px 16px',
                fontFamily: "'DM Sans', sans-serif",
                fontSize: 12,
                cursor: 'pointer',
              }}
            >
              <span style={{
                display: 'inline-block', width: 6, height: 6, borderRadius: '50%',
                background: statusDot(ex.status), marginRight: 8, verticalAlign: 'middle',
              }} />
              {ex.name}
            </button>
          ))}
          <button onClick={startNew} style={{ ...btnPrimary, padding: '8px 16px', fontSize: 12 }} disabled={!museumId}>
            + Nova exposição
          </button>
        </div>
      )}

      {!form ? (
        <div style={{ ...card, textAlign: 'center', color: COLORS.faint }}>
          Carregando exposição…
        </div>
      ) : (
        <>
          {/* ── Main form: Exposição principal ─────────────────────────── */}
          <div style={{ ...card, marginBottom: 24, padding: 24 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', marginBottom: 20 }}>
              <h3 style={{ ...sectionTitle, margin: 0, flex: 1 }}>Exposição principal</h3>
              <span style={sectionMeta}>DADOS GERAIS</span>
            </div>

            {/* Top row: 5 columns */}
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1.5fr 1.5fr 1fr 1fr', gap: 14, marginBottom: 16 }}>
              <div>
                <label style={labelStyle}>Nome da exposição</label>
                <input style={inputBase} value={form.name} onChange={e => updateField('name', e.target.value)} placeholder="Uma História da Arte Brasileira" />
              </div>
              <div>
                <label style={labelStyle}>Subtítulo</label>
                <input style={inputBase} value={form.subtitle || ''} onChange={e => updateField('subtitle', e.target.value)} placeholder="Coleções MAM Rio" />
              </div>
              <div>
                <label style={labelStyle}>Artista / Curadoria</label>
                <input style={inputBase} value={curatorship} onChange={e => setCuratorship(e.target.value)} placeholder="Coletiva" />
              </div>
              <div>
                <label style={labelStyle}>Data de início</label>
                <input
                  type="date"
                  style={inputBase}
                  value={dateInput(form.startDate)}
                  onChange={e => updateField('startDate', new Date(e.target.value).toISOString())}
                />
              </div>
              <div>
                <label style={labelStyle}>Data de término</label>
                <input
                  type="date"
                  style={inputBase}
                  value={dateInput(form.endDate)}
                  onChange={e => updateField('endDate', new Date(e.target.value).toISOString())}
                />
              </div>
            </div>

            {/* Second row: Patrocinador + Status chips */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 14, marginBottom: 16 }}>
              <div>
                <label style={labelStyle}>Patrocinador</label>
                <input style={inputBase} value={form.sponsor || ''} onChange={e => updateField('sponsor', e.target.value)} placeholder="Banco do Brasil" />
              </div>
              <div>
                <label style={labelStyle}>Status</label>
                <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                  {STATUS_CHIPS.map(s => {
                    const active = form.status === s.value;
                    return (
                      <button
                        key={s.value}
                        type="button"
                        onClick={() => updateField('status', s.value)}
                        style={{
                          padding: '10px 22px',
                          borderRadius: 100,
                          border: `1px solid ${active ? s.color : COLORS.border}`,
                          background: active ? `${s.color}22` : 'transparent',
                          color: active ? s.color : COLORS.muted,
                          fontFamily: "'DM Sans', sans-serif",
                          fontSize: 13,
                          fontWeight: 600,
                          cursor: 'pointer',
                          transition: 'all 0.15s ease',
                        }}
                      >
                        {s.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Description */}
            <div style={{ marginBottom: 16 }}>
              <label style={labelStyle}>Descrição para o guia</label>
              <textarea
                style={{ ...inputBase, minHeight: 110, resize: 'vertical' }}
                value={form.description}
                onChange={e => updateField('description', e.target.value)}
                placeholder="Texto que aparece no guia digital e no card compartilhável."
              />
            </div>

            {/* Image drag-drop */}
            <div>
              <label style={labelStyle}>Imagem de capa</label>
              <div
                onDragOver={e => { e.preventDefault(); e.stopPropagation(); }}
                onDrop={handleImageDrop}
                onClick={() => fileInputRef.current?.click()}
                style={{
                  border: `2px dashed ${COLORS.border}`,
                  borderRadius: 12,
                  padding: 32,
                  textAlign: 'center',
                  cursor: 'pointer',
                  background: 'rgba(255,255,255,0.02)',
                  transition: 'border-color 0.18s',
                }}
              >
                {form.coverImage ? (
                  <img src={resolveImg(form.coverImage)} alt="" style={{ maxWidth: '100%', maxHeight: 200, borderRadius: 8 }} />
                ) : (
                  <>
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke={COLORS.faint} strokeWidth="1.5" style={{ margin: '0 auto 12px', display: 'block' }}>
                      <rect x="3" y="3" width="18" height="18" rx="2" />
                      <circle cx="8.5" cy="8.5" r="1.5" />
                      <path d="M21 15l-5-5L5 21" />
                    </svg>
                    <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14, color: COLORS.muted, margin: 0 }}>
                      Arraste uma imagem ou clique para enviar
                    </p>
                    <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: COLORS.faint, margin: '6px 0 0' }}>
                      PNG, JPG até 5MB · Recomendado: 1200×630px
                    </p>
                  </>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  style={{ display: 'none' }}
                  onChange={e => { const f = e.target.files?.[0]; if (f) handleImageFile(f); }}
                />
              </div>
              {form.coverImage && (
                <button
                  onClick={() => updateField('coverImage', '')}
                  style={{
                    marginTop: 8,
                    background: 'transparent',
                    border: 'none',
                    color: COLORS.faint,
                    fontSize: 11,
                    cursor: 'pointer',
                    textDecoration: 'underline',
                  }}
                >
                  Remover imagem
                </button>
              )}

              {/* Áudio de introdução — mesmo padrão (toggle + URL) das obras. */}
              <div style={{ marginTop: 18 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  <span style={{ fontSize: 13, color: COLORS.muted, fontFamily: "'DM Sans', sans-serif" }}>
                    Áudio de introdução
                  </span>
                  <ToggleSwitch
                    checked={!!form.audioUrl}
                    onChange={(on) => {
                      if (on && !form.audioUrl) updateField('audioUrl', 'https://');
                      if (!on) updateField('audioUrl', null);
                    }}
                  />
                  {form.audioUrl && (
                    <input
                      style={{ ...inputBase, flex: 1, padding: '8px 12px', fontSize: 13 }}
                      value={form.audioUrl || ''}
                      onChange={e => updateField('audioUrl', e.target.value)}
                      placeholder="https://… (URL do arquivo de áudio)"
                    />
                  )}
                </div>
                {form.audioUrl && (
                  <p style={{ fontSize: 11, color: COLORS.faint, margin: '8px 0 0' }}>
                    Toca como faixa de boas-vindas no topo do guia, antes da lista de obras.
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* ── Works editor ────────────────────────────────────────────── */}
          <div style={{ ...card, marginBottom: 24, padding: 24 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', marginBottom: 16 }}>
              <h3 style={{ ...sectionTitle, margin: 0, flex: 1 }}>Obras no guia</h3>
              <span style={sectionMeta}>{works.length} OBRA{works.length === 1 ? '' : 'S'}</span>
            </div>

            <div ref={worksContainerRef} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {works.map((w, i) => {
                const isOpen = expandedWork === i;
                return (
                  <div key={i} style={{
                    background: isOpen ? '#1A141C' : 'rgba(255,255,255,0.02)',
                    border: `1px solid ${COLORS.border}`,
                    borderRadius: 12,
                    overflow: 'hidden',
                  }}>
                    {!isOpen ? (
                      <div style={{ padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 16 }}>
                        <span style={{
                          fontFamily: "'Space Mono', monospace",
                          fontSize: 12, color: COLORS.brand, fontWeight: 700, minWidth: 28,
                        }}>
                          {String(i + 1).padStart(2, '0')}
                        </span>
                        {w.room && (
                          <span style={{
                            fontFamily: "'Space Mono', monospace",
                            fontSize: 10,
                            letterSpacing: 1,
                            color: COLORS.brand,
                            border: `1px solid ${COLORS.brand}`,
                            borderRadius: 4,
                            padding: '3px 10px',
                            whiteSpace: 'nowrap',
                          }}>
                            {w.room}
                          </span>
                        )}
                        <div style={{ flex: 1 }}>
                          <div style={{ fontFamily: "'Sora', sans-serif", fontSize: 15, fontWeight: 700, color: COLORS.text }}>
                            {w.title || '(sem título)'}
                          </div>
                          <div style={{ fontSize: 12, color: COLORS.muted }}>
                            {w.artist || '—'}{w.year ? ` · ${w.year}` : ''}
                          </div>
                        </div>
                        {w.audioUrl && (
                          <span style={{
                            fontFamily: "'Space Mono', monospace",
                            fontSize: 10,
                            letterSpacing: 2,
                            color: '#fff',
                            background: GRADIENT_PULSE,
                            border: 'none',
                            borderRadius: 4,
                            padding: '5px 11px',
                            whiteSpace: 'nowrap',
                            fontWeight: 600,
                          }}>
                            AUDIO
                          </span>
                        )}
                        <button
                          onClick={() => setExpandedWork(i)}
                          title="Editar"
                          style={iconBtn}
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/>
                          </svg>
                        </button>
                        <button
                          onClick={() => removeWork(i)}
                          title="Remover"
                          style={iconBtn}
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                          </svg>
                        </button>
                      </div>
                    ) : (
                      <div style={{ padding: 22 }}>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 16 }}>
                          <div>
                            <label style={labelStyle}>Artista</label>
                            <input style={inputBase} value={w.artist} onChange={e => updateWork(i, 'artist', e.target.value)} />
                          </div>
                          <div>
                            <label style={labelStyle}>Título da obra</label>
                            <input style={inputBase} value={w.title} onChange={e => updateWork(i, 'title', e.target.value)} />
                          </div>
                          <div>
                            <label style={labelStyle}>Ano</label>
                            <input style={inputBase} value={w.year} onChange={e => updateWork(i, 'year', e.target.value)} />
                          </div>
                          <div>
                            <label style={labelStyle}>Sala</label>
                            <input style={inputBase} value={w.room} onChange={e => updateWork(i, 'room', e.target.value)} />
                          </div>
                        </div>

                        <label style={labelStyle}>Descrição para o visitante</label>
                        <textarea
                          style={{ ...inputBase, minHeight: 90, resize: 'vertical', marginBottom: 16 }}
                          value={w.description}
                          onChange={e => updateWork(i, 'description', e.target.value)}
                        />

                        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                          <span style={{ fontSize: 12, color: COLORS.muted, fontFamily: "'DM Sans', sans-serif" }}>Áudio guia</span>
                          <ToggleSwitch
                            checked={!!w.audioUrl}
                            onChange={(on) => {
                              if (on && !w.audioUrl) updateWork(i, 'audioUrl', 'https://');
                              if (!on) updateWork(i, 'audioUrl', null);
                            }}
                          />
                          {w.audioUrl && (
                            <input
                              style={{ ...inputBase, flex: 1, padding: '8px 12px', fontSize: 13 }}
                              value={w.audioUrl || ''}
                              onChange={e => updateWork(i, 'audioUrl', e.target.value)}
                              placeholder="https://… (URL do arquivo de áudio)"
                            />
                          )}
                          <div style={{ flex: 1 }} />
                          <button onClick={() => setExpandedWork(null)} style={btnGhost}>Fechar</button>
                          <button
                            onClick={async () => { await handleSave(); setExpandedWork(null); }}
                            disabled={saving}
                            style={btnPrimary}
                          >
                            {saving ? 'Salvando…' : 'Salvar obra'}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <button
              onClick={addWork}
              style={{
                width: '100%',
                marginTop: 12,
                padding: '16px',
                background: 'transparent',
                border: `1.5px dashed ${COLORS.border}`,
                borderRadius: 12,
                color: COLORS.muted,
                fontFamily: "'DM Sans', sans-serif",
                fontSize: 14,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
              }}
            >
              <span style={{ fontSize: 18 }}>+</span> Adicionar obra
            </button>
          </div>

          {/* ── Outras exposições simultâneas ────────────────────────────── */}
          <div style={{ ...card, marginBottom: 24, padding: 24 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', marginBottom: 16 }}>
              <h3 style={{ ...sectionTitle, margin: 0, flex: 1 }}>Outras exposições simultâneas</h3>
              <span style={sectionMeta}>{others.length} EM CARTAZ</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {others.map((o, i) => (
                <div key={i} style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 200px 36px',
                  gap: 10,
                  alignItems: 'center',
                }}>
                  <div>
                    <label style={{ ...labelStyle, marginBottom: 4 }}>Nome da exposição</label>
                    <input
                      style={inputBase}
                      value={o.name}
                      onChange={e => setOthers(prev => prev.map((x, idx) => idx === i ? { ...x, name: e.target.value } : x))}
                      placeholder="Walter Smetak: Imprevisto e Invenção"
                    />
                  </div>
                  <div>
                    <label style={{ ...labelStyle, marginBottom: 4 }}>Sala / Espaço</label>
                    <input
                      style={{ ...inputBase, textAlign: 'center' }}
                      value={o.room}
                      onChange={e => setOthers(prev => prev.map((x, idx) => idx === i ? { ...x, room: e.target.value } : x))}
                      placeholder="Galeria 2"
                    />
                  </div>
                  <button
                    onClick={() => setOthers(prev => prev.filter((_, idx) => idx !== i))}
                    style={{
                      ...iconBtn,
                      alignSelf: 'flex-end',
                      marginBottom: 4,
                      color: COLORS.faint,
                    }}
                    title="Remover"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                    </svg>
                  </button>
                </div>
              ))}
              <button
                onClick={() => setOthers(prev => [...prev, { name: '', room: '' }])}
                style={{
                  marginTop: 4,
                  padding: '14px',
                  background: 'transparent',
                  border: `1.5px dashed ${COLORS.border}`,
                  borderRadius: 10,
                  color: COLORS.muted,
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: 13,
                  cursor: 'pointer',
                }}
              >
                + Adicionar exposição
              </button>
            </div>
            {/* Inline save for the simultaneous-exhibitions section */}
            <div style={{ marginTop: 14, display: 'flex', justifyContent: 'flex-end' }}>
              <button onClick={() => handleSave(false)} disabled={saving} style={btnPrimary}>
                {saving ? 'Salvando…' : 'Salvar lista'}
              </button>
            </div>
          </div>

          {!creatingNew && form.id && (
            <div style={{ textAlign: 'right', marginBottom: 80 }}>
              <button onClick={handleDelete} style={btnDanger}>Apagar exposição</button>
            </div>
          )}

          {/* ── Sticky action bar (always visible while scrolling) ─────────── */}
          <div style={{
            position: 'sticky',
            bottom: 0,
            zIndex: 20,
            marginLeft: -40,
            marginRight: -40,
            marginBottom: -32,
            padding: '14px 40px',
            background: 'rgba(14,11,13,0.92)',
            backdropFilter: 'blur(8px)',
            borderTop: `1px solid ${COLORS.border}`,
          }}>
            {/* Inline error/success banner inside the sticky bar — guarantees the
                user sees feedback when clicking save without scrolling up. */}
            {error && (
              <div style={{
                marginBottom: 10,
                padding: '8px 12px',
                borderRadius: 8,
                background: 'rgba(232,85,78,0.12)',
                border: '1px solid rgba(232,85,78,0.4)',
                color: '#F2A29F',
                fontSize: 12,
                fontFamily: "'DM Sans', sans-serif",
              }}>
                ⚠️ {error}
              </div>
            )}
            {info && !error && (
              <div style={{
                marginBottom: 10,
                padding: '8px 12px',
                borderRadius: 8,
                background: 'rgba(72,187,120,0.10)',
                border: '1px solid rgba(72,187,120,0.4)',
                color: '#9FE2B4',
                fontSize: 12,
                fontFamily: "'DM Sans', sans-serif",
              }}>
                ✓ {info}
              </div>
            )}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <button onClick={() => handleSave(true)} disabled={saving} style={{ ...btnPrimary, padding: '18px', fontSize: 14 }}>
                {saving ? 'Salvando…' : (creatingNew ? 'Criar exposição' : 'Salvar e publicar guia')}
              </button>
              <button
                onClick={() => setShowPreview(true)}
                style={{ ...btnGhost, padding: '18px', fontSize: 14 }}
              >
                👁 Visualizar guia
              </button>
            </div>
          </div>

          {/* ── Preview modal: iframe of /guide simulating a phone ─────────── */}
          {showPreview && (
            <div
              onClick={() => setShowPreview(false)}
              style={{
                position: 'fixed',
                inset: 0,
                background: 'rgba(0,0,0,0.88)',
                backdropFilter: 'blur(10px)',
                zIndex: 1000,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 24,
              }}
            >
              {/* Title in the corner */}
              <h2 style={{
                position: 'absolute',
                top: 32,
                left: 40,
                fontFamily: "'Sora', 'Geist', sans-serif",
                fontSize: 22,
                fontWeight: 700,
                color: COLORS.text,
                margin: 0,
              }}>
                Preview do guia
              </h2>

              {/* Phone bezel: dark frame, notch, side button hints */}
              <div
                onClick={e => e.stopPropagation()}
                style={{
                  width: 392,
                  height: 'min(820px, 92vh)',
                  background: '#1A141C',
                  borderRadius: 44,
                  position: 'relative',
                  padding: 14,
                  boxShadow:
                    '0 50px 100px rgba(0,0,0,0.7),' +
                    '0 0 0 2px rgba(255,255,255,0.06),' +
                    '0 0 0 4px #0A0709,' +
                    'inset 0 0 1px rgba(255,255,255,0.08)',
                  boxSizing: 'border-box',
                }}
              >

                {/* Screen */}
                <div style={{
                  width: '100%',
                  height: '100%',
                  background: '#0E0B0D',
                  borderRadius: 32,
                  overflow: 'hidden',
                  position: 'relative',
                }}>
                  {/* Status bar (purely visual) */}
                  <div style={{
                    position: 'absolute',
                    top: 0, left: 0, right: 0,
                    height: 28,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0 24px',
                    color: '#F5ECE4',
                    fontFamily: "'Sora', sans-serif",
                    fontSize: 11,
                    fontWeight: 700,
                    zIndex: 2,
                    pointerEvents: 'none',
                  }}>
                    <span>{new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 10 }}>
                      <span>●●●</span>
                      <span>📶</span>
                      <span style={{
                        display: 'inline-block', width: 18, height: 9,
                        border: '1px solid #F5ECE4', borderRadius: 2,
                        position: 'relative',
                      }}>
                        <span style={{ position: 'absolute', inset: 1, right: 4, background: '#F5ECE4', borderRadius: 1 }} />
                      </span>
                    </span>
                  </div>
                  {/* Notch */}
                  <div style={{
                    position: 'absolute',
                    top: 6, left: '50%', transform: 'translateX(-50%)',
                    width: 110, height: 22,
                    background: '#0A0709',
                    borderRadius: 16,
                    zIndex: 3,
                  }} />

                  <iframe
                    // Passes the currently selected exhibition id so the
                    // preview reflects whichever one the manager is editing,
                    // not just whatever is ACTIVE in the DB. Keying on form.id
                    // forces a remount when the selected exhibition changes.
                    key={form.id || 'new'}
                    src={form.id ? `/guide?exhibition=${encodeURIComponent(form.id)}` : '/guide'}
                    style={{
                      width: '100%',
                      height: '100%',
                      border: 'none',
                      display: 'block',
                    }}
                    title="Preview do guia"
                  />
                </div>
              </div>

              <button
                onClick={() => setShowPreview(false)}
                className="pulso-btn"
                style={{
                  position: 'absolute',
                  top: 24,
                  right: 24,
                  background: 'rgba(0,0,0,0.6)',
                  border: `1px solid ${COLORS.border}`,
                  color: '#fff',
                  width: 40,
                  height: 40,
                  borderRadius: '50%',
                  cursor: 'pointer',
                  fontSize: 20,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
                title="Fechar (Esc)"
              >
                ×
              </button>
              <p style={{
                position: 'absolute',
                bottom: 20,
                left: 0,
                right: 0,
                textAlign: 'center',
                color: COLORS.faint,
                fontSize: 10,
                fontFamily: "'Space Mono', monospace",
                letterSpacing: 2,
                margin: 0,
              }}>
                PREVIEW · CLIQUE FORA OU PRESSIONE ESC PARA FECHAR
              </p>
            </div>
          )}

          {/* Poster modal — opens on demand or auto after publishing as ACTIVE.
              Wrapped in Suspense because PosterPreview is lazy-loaded. */}
          {showPoster && form && museumInfo && (
            <Suspense fallback={null}>
              <PosterPreview
                open={showPoster}
                exhibition={{
                  id: form.id,
                  name: form.name,
                  subtitle: form.subtitle,
                  startDate: form.startDate,
                  endDate: form.endDate,
                  coverImage: form.coverImage,
                }}
                museum={{
                  name: museumInfo.name,
                  shortName: museumInfo.shortName,
                  city: museumInfo.city,
                  address: museumInfo.address,
                  openingHours: museumInfo.openingHours,
                }}
                onClose={() => setShowPoster(false)}
              />
            </Suspense>
          )}
        </>
      )}
    </div>
  );
}

// ─── Tiny components ───────────────────────────────────────────────────────

const iconBtn: React.CSSProperties = {
  background: 'transparent',
  border: 'none',
  color: COLORS.brand,
  width: 32,
  height: 32,
  borderRadius: 8,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  cursor: 'pointer',
  padding: 0,
};

function ToggleSwitch({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      style={{
        width: 40,
        height: 22,
        borderRadius: 100,
        border: 'none',
        background: checked ? COLORS.brand : 'rgba(255,255,255,0.1)',
        cursor: 'pointer',
        position: 'relative',
        transition: 'background 0.15s ease',
        padding: 0,
      }}
      aria-pressed={checked}
    >
      <span style={{
        position: 'absolute',
        top: 3,
        left: checked ? 21 : 3,
        width: 16,
        height: 16,
        borderRadius: '50%',
        background: '#fff',
        transition: 'left 0.15s ease',
        boxShadow: '0 1px 3px rgba(0,0,0,0.4)',
      }} />
    </button>
  );
}
