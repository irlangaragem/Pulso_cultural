import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { useAuthStore } from '../store/useAuthStore';
import { TempoRealTab } from './dashboard/TempoRealTab';
import { PublicoTab } from './dashboard/PublicoTab';
import { HistoricoTab } from './dashboard/HistoricoTab';
import { ExposicaoTab } from './dashboard/ExposicaoTab';
import { ImpactoTab } from './dashboard/ImpactoTab';
import { GestoresTab } from './dashboard/GestoresTab';
import { COLORS, aoVivoPill, pulseDot, pulseKeyframes, dashboardCss } from './dashboard/styles';

interface ExhibitionSummary {
  id: string;
  name: string;
  status: string;
  startDate: string;
  endDate: string;
}

interface MuseumSummary {
  id: string;
  name: string;
  slug: string;
  city: string;
  state: string;
  address: string;
}

/** "Museu de Arte Moderna da Bahia" → "MAM Bahia". Falls back to the raw name. */
function formatMuseumShortName(name: string): string {
  if (/museu\s+de\s+arte\s+moderna/i.test(name)) {
    if (/bahia|salvador|MAM[\s-]*BA/i.test(name)) return 'MAM Bahia';
    if (/rio/i.test(name))                        return 'MAM Rio';
    if (/s[aã]o\s+paulo|sp/i.test(name))          return 'MAM SP';
    return 'MAM';
  }
  return name;
}

/** Canonical location label for the sidebar footer.
 *  Known slugs map to their iconic location string. Unknown slugs fall back to
 *  the first comma-segment of the address. */
const KNOWN_LOCATIONS: Record<string, string> = {
  'mam-bahia': 'Solar do Unhão, Salvador',
};
function formatMuseumLocation(m: { slug?: string; address: string; city: string }): string {
  if (m.slug && KNOWN_LOCATIONS[m.slug]) return KNOWN_LOCATIONS[m.slug];
  if (/solar\s+do\s+unh[aã]o/i.test(m.address)) return `Solar do Unhão, ${m.city}`;
  const firstSegment = m.address.split(',')[0].trim();
  return `${firstSegment}, ${m.city}`;
}

/** Brand logo: SVG concentric pulse rings + gradient core.
 *  Three thin rings of decreasing opacity + a vibrant core dot. */
function SidebarBrandLogo() {
  return (
    <svg width="32" height="32" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" style={{ flexShrink: 0 }}>
      <defs>
        <radialGradient id="brand-core" cx="42%" cy="38%">
          <stop offset="0%"   stopColor="#F59E42" />
          <stop offset="60%"  stopColor="#FF5E5B" />
          <stop offset="100%" stopColor="#F0426A" />
        </radialGradient>
      </defs>
      <circle cx={50} cy={50} r={44} fill="none" stroke="#F59E42" strokeWidth={1.4} opacity={0.30} />
      <circle cx={50} cy={50} r={32} fill="none" stroke="#FF5E5B" strokeWidth={2}   opacity={0.55} />
      <circle cx={50} cy={50} r={20} fill="none" stroke="#F0426A" strokeWidth={2.5} opacity={0.85} />
      <circle cx={50} cy={50} r={9}  fill="url(#brand-core)" />
    </svg>
  );
}

type TabId = 'tempo-real' | 'publico' | 'historico' | 'exposicao' | 'impacto' | 'gestores';

const TABS: { id: TabId; label: string; icon: string }[] = [
  { id: 'tempo-real', label: 'Tempo real', icon: '⚡' },
  { id: 'publico',    label: 'Público',     icon: '👥' },
  { id: 'historico',  label: 'Histórico',   icon: '📊' },
  { id: 'exposicao',  label: 'Exposição',   icon: '🖼' },
  { id: 'impacto',    label: 'Impacto',     icon: '📋' },
  { id: 'gestores',   label: 'Gestores',    icon: '👤' },
];

const TAB_TITLES: Record<TabId, string> = {
  'tempo-real': 'Tempo real',
  'publico': 'Perfil do público',
  'historico': 'Histórico e recorrência',
  'exposicao': 'Cadastro de exposição',
  'impacto': 'Relatório de impacto',
  'gestores': 'Equipe do museu',
};

export function Dashboard() {
  const navigate = useNavigate();
  const { user, token, logout } = useAuthStore();

  const TAB_KEY = 'pulso:dashboard:tab';
  const VALID_TABS: TabId[] = ['tempo-real', 'publico', 'historico', 'exposicao', 'impacto', 'gestores'];
  const [tab, setTabRaw] = useState<TabId>(() => {
    const saved = (typeof window !== 'undefined' ? localStorage.getItem(TAB_KEY) : null) as TabId | null;
    return saved && VALID_TABS.includes(saved) ? saved : 'tempo-real';
  });
  const setTab = (next: TabId) => {
    setTabRaw(next);
    try { localStorage.setItem(TAB_KEY, next); } catch { /* private mode */ }
  };
  const [exhibitions, setExhibitions] = useState<ExhibitionSummary[]>([]);
  const [exhibitionId, setExhibitionId] = useState<string>('');
  const [museum, setMuseum] = useState<MuseumSummary | null>(null);

  useEffect(() => {
    document.title = 'Pulso Cultural · Gestão';
  }, []);

  useEffect(() => {
    if (!token) navigate('/login');
  }, [token, navigate]);

  const refreshExhibitions = async () => {
    try {
      const res = await api.get('/exhibitions');
      const list: ExhibitionSummary[] = (res.data || []).map((e: any) => ({
        id: e.id, name: e.name, status: e.status, startDate: e.startDate, endDate: e.endDate,
      }));
      setExhibitions(list);
      setExhibitionId(prev => {
        if (prev && list.some(e => e.id === prev)) return prev;
        const active = list.find(e => e.status === 'ACTIVE') || list[0];
        return active ? active.id : '';
      });
    } catch { /* swallow — header banner shows nothing if no exhibitions */ }
  };

  const refreshMuseum = async () => {
    if (!user?.museumId) return;
    try {
      const res = await api.get(`/museums/${user.museumId}`);
      setMuseum(res.data);
    } catch { /* fallback to user's name only */ }
  };

  useEffect(() => {
    if (!token) return;
    refreshExhibitions();
    refreshMuseum();
  }, [token, user?.museumId]);

  const activeExhibition = exhibitions.find(e => e.id === exhibitionId);

  return (
    <div className="pulso-dashboard" style={{
      width: '100vw', minHeight: '100vh',
      background: COLORS.bg,
      backgroundImage:
        'radial-gradient(900px 500px at 85% -10%, rgba(212,38,126,0.10), transparent 60%),' +
        'radial-gradient(1100px 600px at 100% 100%, rgba(232,85,78,0.06), transparent 60%)',
      backgroundAttachment: 'fixed',
      color: COLORS.text,
      fontFamily: "'DM Sans', sans-serif",
      display: 'flex',
    }}>
      <style>{pulseKeyframes}{dashboardCss}</style>

      {/* ── SIDEBAR ─────────────────────────────────────────── */}
      <aside style={{
        width: 240,
        minHeight: '100vh',
        background: COLORS.panel,
        // No border-right: separation comes from contrast (panel #1E1924 vs bg #0B0710).
        padding: '24px 16px',
        display: 'flex',
        flexDirection: 'column',
        gap: 24,
        flexShrink: 0,
        position: 'sticky',
        top: 0,
        alignSelf: 'flex-start',
      }}>
        {/* Brand — clicking the logo/name resets to the live "Tempo real" tab. */}
        <button
          type="button"
          onClick={() => setTab('tempo-real')}
          aria-label="Voltar para Tempo real"
          style={{
            display: 'flex', alignItems: 'center', gap: 10, padding: '4px 8px 8px',
            background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left',
          }}
        >
          <SidebarBrandLogo />
          <div>
            <div style={{ fontFamily: "'Sora', 'Geist', sans-serif", fontSize: 15, fontWeight: 800, color: COLORS.text, letterSpacing: '0.04em' }}>
              PULSO
            </div>
            <div style={{ fontFamily: "'Space Mono', 'Geist Mono', monospace", fontSize: 9, color: COLORS.faint, marginTop: 2, letterSpacing: '0.18em', textTransform: 'uppercase' }}>
              Cultural
            </div>
          </div>
        </button>

        {/* Nav */}
        <nav style={{ display: 'flex', flexDirection: 'column', gap: 2, flex: 1 }}>
          {TABS.map(t => {
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`pulso-tab-item${active ? ' active' : ''}`}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '10px 14px',
                  background: active ? 'rgba(240,66,106,0.06)' : 'transparent',
                  border: 'none',
                  borderRadius: 8,
                  color: active ? COLORS.brand : COLORS.muted,
                  fontFamily: "'DM Sans', 'Geist', sans-serif",
                  fontSize: 13.5,
                  fontWeight: active ? 600 : 500,
                  cursor: 'pointer',
                  textAlign: 'left',
                  position: 'relative',
                }}
              >
                {active && (
                  <span style={{
                    position: 'absolute',
                    left: -16, top: 8, bottom: 8,
                    width: 2,
                    background: COLORS.brand,
                    borderRadius: '0 2px 2px 0',
                  }} />
                )}
                <span style={{ fontSize: 16, flexShrink: 0 }}>{t.icon}</span>
                {t.label}
              </button>
            );
          })}
        </nav>

        {/* Footer: museum info + logout */}
        <div style={{ padding: '12px 8px 4px', borderTop: `1px solid ${COLORS.border}` }}>
          <p style={{ fontFamily: "'Sora', 'Geist', sans-serif", fontSize: 12, fontWeight: 600, color: COLORS.text, margin: 0 }}>
            {museum ? formatMuseumShortName(museum.name) : 'Museu'}
          </p>
          <p style={{ fontFamily: "'Space Mono', 'Geist Mono', monospace", fontSize: 10, color: COLORS.faint, margin: '2px 0 0', letterSpacing: '0.04em' }}>
            {museum ? formatMuseumLocation(museum) : (user?.email || '')}
          </p>
          <button
            onClick={() => { logout(); navigate('/login'); }}
            style={{
              marginTop: 12,
              background: 'transparent',
              border: 'none',
              color: COLORS.faint,
              fontSize: 11,
              fontFamily: "'DM Sans', sans-serif",
              padding: 0,
              cursor: 'pointer',
              textDecoration: 'underline',
            }}
          >
            Sair
          </button>
        </div>
      </aside>

      {/* ── MAIN ────────────────────────────────────────────── */}
      <main style={{ flex: 1, maxWidth: 1400, width: '100%', boxSizing: 'border-box' }}>
        <header style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '24px 32px 16px',
          borderBottom: `1px solid ${COLORS.border}`,
          flexWrap: 'wrap',
          gap: 12,
        }}>
          <div style={{ minWidth: 0 }}>
            <h1 style={{ fontFamily: "'Sora', 'Geist', sans-serif", fontSize: 22, fontWeight: 700, color: COLORS.text, margin: '0 0 4px', letterSpacing: '-0.01em' }}>
              {TAB_TITLES[tab]}
            </h1>
            <p style={{ fontFamily: "'DM Sans', 'Geist', sans-serif", fontSize: 12.5, color: COLORS.muted, margin: 0 }}>
              {activeExhibition?.name || '—'} · {museum ? formatMuseumShortName(museum.name) : ''}
            </p>
          </div>

          {/* Exhibition selector — only on tabs whose data is exhibition-scoped.
              Tabs like Gestores (museum-wide users) and Impacto (museum-wide
              report) don't change with exhibition selection. */}
          {(['tempo-real', 'publico', 'historico'] as TabId[]).includes(tab) && exhibitions.length > 1 && (
            <select
              value={exhibitionId}
              onChange={e => setExhibitionId(e.target.value)}
              style={{
                background: COLORS.panel,
                color: COLORS.text,
                border: `1px solid ${COLORS.border}`,
                borderRadius: 10,
                padding: '8px 12px',
                fontFamily: "'DM Sans', sans-serif",
                fontSize: 13,
                cursor: 'pointer',
                marginRight: 12,
              }}
            >
              {exhibitions.map(e => (
                <option
                  key={e.id}
                  value={e.id}
                  style={{ background: COLORS.panel, color: COLORS.text }}
                >
                  {e.name}
                </option>
              ))}
            </select>
          )}

          <span style={aoVivoPill}>
            <span style={pulseDot()} />
            AO VIVO
          </span>
        </header>

        {/* ── Content ────────────────────────────────────────── */}
        <div style={{ padding: '24px 32px 40px' }}>
          {tab === 'tempo-real' && <TempoRealTab exhibitionId={exhibitionId} />}
          {tab === 'publico' && <PublicoTab exhibitionId={exhibitionId} museumId={user?.museumId} />}
          {tab === 'historico' && <HistoricoTab exhibitionId={exhibitionId} />}
          {tab === 'exposicao' && (
            <ExposicaoTab
              museumId={user?.museumId}
              selectedExhibitionId={exhibitionId}
              onChange={refreshExhibitions}
            />
          )}
          {tab === 'impacto' && <ImpactoTab exhibitionId={exhibitionId} museumId={user?.museumId} />}
          {tab === 'gestores' && <GestoresTab />}
        </div>
      </main>
    </div>
  );
}
