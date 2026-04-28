import { useEffect, useState, type ReactNode } from 'react';
import { api } from '../../services/api';
import { useAuthStore } from '../../store/useAuthStore';
import {
  card, COLORS, sectionTitle,
  inputBase, labelStyle, btnPrimary, btnGhost, btnDanger,
} from './styles';

type Role = 'ADMIN' | 'GESTOR';
type Status = 'ATIVO' | 'INATIVO' | 'CONVITE_PENDENTE' | 'CONVITE_EXPIRADO';

interface User {
  id: string;
  email: string;
  name: string;
  role: Role;
  active: boolean;
  status: Status;
  invite?: { expiresAt: string; expiresInDays: number };
  createdAt?: string;
  updatedAt?: string;
}

interface InviteResponse {
  invite: {
    expiresAt: string;
    expiresInDays: number;
    url: string;
    emailSent: boolean;
  };
}

const ROLE_LABEL: Record<Role, string> = { ADMIN: 'Administrador', GESTOR: 'Gestor' };

function statusPill(s: Status, expiresInDays?: number) {
  if (s === 'ATIVO') {
    return { label: 'Ativo', color: COLORS.green, bg: 'transparent', dot: true };
  }
  if (s === 'INATIVO') {
    return { label: 'Inativo', color: COLORS.faint, bg: 'transparent', dot: true };
  }
  if (s === 'CONVITE_PENDENTE') {
    return {
      label: 'CONVITE ENVIADO',
      sub: expiresInDays ? `expira em ${expiresInDays}d` : null,
      color: COLORS.green,
      bg: 'transparent',
    };
  }
  return {
    label: 'CONVITE EXPIRADO',
    sub: 'reenvie',
    color: COLORS.brand,
    bg: 'transparent',
  };
}

export function GestoresTab() {
  const { user: me } = useAuthStore();
  const [list, setList] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  // Create form
  const [creating, setCreating] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [newName, setNewName] = useState('');
  const [newRole, setNewRole] = useState<Role>('GESTOR');
  const [creatingBusy, setCreatingBusy] = useState(false);

  // Reset password modal (for already-active users)
  const [resettingId, setResettingId] = useState<string | null>(null);
  const [resetPassword, setResetPassword] = useState('');
  const [resetBusy, setResetBusy] = useState(false);

  // Invite link modal (after create or resend)
  const [inviteLink, setInviteLink] = useState<{ url: string; email: string; emailSent: boolean; expiresInDays: number } | null>(null);

  // Hard-delete confirmation modal — replaces the two stacked window.confirm()
  // with a single styled dialog that requires typing the email to enable submit.
  const [deleteTarget, setDeleteTarget] = useState<User | null>(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deleteBusy, setDeleteBusy] = useState(false);

  // Generic confirm modal — used for cancel-invite and deactivate, which
  // previously used native window.confirm() popups.
  type ConfirmAction = {
    title: string;
    message: ReactNode;
    confirmLabel: string;
    danger?: boolean;
    onConfirm: () => Promise<void> | void;
  };
  const [confirmAction, setConfirmAction] = useState<ConfirmAction | null>(null);
  const [confirmBusy, setConfirmBusy] = useState(false);

  const refresh = async () => {
    setLoading(true);
    try {
      const r = await api.get('/users');
      setList(r.data || []);
      setError(null);
    } catch (err: any) {
      setError(err?.response?.data?.error || err?.message || 'Erro ao listar gestores');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { refresh(); }, []);

  const handleCreate = async () => {
    if (!newEmail.trim() || !newName.trim()) {
      setError('Preencha email e nome');
      return;
    }
    setCreatingBusy(true);
    setError(null);
    setInfo(null);
    try {
      const res = await api.post('/users', {
        email: newEmail.trim(),
        name: newName.trim(),
        role: newRole,
      });
      const data = res.data as InviteResponse & { email: string };
      setInviteLink({
        url: data.invite.url,
        email: data.email,
        emailSent: data.invite.emailSent,
        expiresInDays: data.invite.expiresInDays,
      });
      setCreating(false);
      setNewEmail(''); setNewName(''); setNewRole('GESTOR');
      await refresh();
    } catch (err: any) {
      setError(err?.response?.data?.error || err?.message || 'Erro ao convidar gestor');
    } finally {
      setCreatingBusy(false);
    }
  };

  const handleResend = async (u: User) => {
    setError(null);
    setInfo(null);
    try {
      const res = await api.post(`/users/${u.id}/resend-invite`);
      const inv = (res.data as InviteResponse).invite;
      setInviteLink({ url: inv.url, email: u.email, emailSent: inv.emailSent, expiresInDays: inv.expiresInDays });
      await refresh();
    } catch (err: any) {
      setError(err?.response?.data?.error || err?.message || 'Erro ao reenviar');
    }
  };

  const handleRevoke = (u: User) => {
    setConfirmAction({
      title: 'Cancelar convite',
      message: <>O convite enviado para <strong style={{ color: COLORS.text }}>{u.name}</strong> será invalidado e o link atual não funcionará mais.</>,
      confirmLabel: 'Cancelar convite',
      danger: true,
      onConfirm: async () => {
        await api.post(`/users/${u.id}/revoke-invite`);
        setInfo(`Convite de ${u.name} cancelado.`);
        await refresh();
      },
    });
  };

  const handleToggleActive = async (u: User) => {
    if (u.id === me?.id) return;
    if (u.active) {
      setConfirmAction({
        title: 'Desativar acesso',
        message: <><strong style={{ color: COLORS.text }}>{u.name}</strong> não conseguirá mais entrar no painel. A conta fica preservada e pode ser reativada depois.</>,
        confirmLabel: 'Desativar',
        danger: true,
        onConfirm: async () => {
          await api.delete(`/users/${u.id}`);
          setInfo(`${u.name} desativado.`);
          await refresh();
        },
      });
      return;
    }
    try {
      await api.put(`/users/${u.id}`, { active: true });
      setInfo(`${u.name} reativado.`);
      await refresh();
    } catch (err: any) {
      setError(err?.response?.data?.error || err?.message || 'Erro ao mudar status');
    }
  };

  const handleHardDelete = (u: User) => {
    if (u.id === me?.id) return;
    setDeleteTarget(u);
    setDeleteConfirmText('');
  };

  const confirmHardDelete = async () => {
    if (!deleteTarget) return;
    if (deleteConfirmText.trim().toLowerCase() !== deleteTarget.email.toLowerCase()) return;
    setDeleteBusy(true);
    try {
      await api.delete(`/users/${deleteTarget.id}/permanent`);
      setInfo(`${deleteTarget.name} foi excluído definitivamente.`);
      setDeleteTarget(null);
      await refresh();
    } catch (err: any) {
      setError(err?.response?.data?.error || err?.message || 'Erro ao excluir');
    } finally {
      setDeleteBusy(false);
    }
  };

  const handleChangeRole = async (u: User, role: Role) => {
    try {
      await api.put(`/users/${u.id}`, { role });
      setInfo(`Função de ${u.name} → ${ROLE_LABEL[role]}.`);
      await refresh();
    } catch (err: any) {
      setError(err?.response?.data?.error || err?.message || 'Erro ao atualizar role');
    }
  };

  const handleResetPasswordSubmit = async () => {
    if (!resettingId) return;
    if (!resetPassword || resetPassword.length < 8) {
      setError('Senha precisa ter ao menos 8 caracteres');
      return;
    }
    setResetBusy(true);
    setError(null);
    setInfo(null);
    try {
      await api.post(`/users/${resettingId}/reset-password`, { newPassword: resetPassword });
      setInfo('Senha redefinida.');
      setResettingId(null);
      setResetPassword('');
    } catch (err: any) {
      setError(err?.response?.data?.error || err?.message || 'Erro ao redefinir senha');
    } finally {
      setResetBusy(false);
    }
  };

  return (
    <div>
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

      <div style={{ display: 'flex', alignItems: 'baseline', marginBottom: 16 }}>
        <div style={{ flex: 1 }}>
          <h3 style={{ ...sectionTitle, margin: 0 }}>Equipe do museu</h3>
          <p style={{ color: COLORS.muted, fontSize: 13, margin: '4px 0 0' }}>
            Convide pessoas e defina o nível de acesso. Cada nível tem permissões específicas.
          </p>
        </div>
        {!creating && (
          <button onClick={() => setCreating(true)} style={btnPrimary}>
            🧑‍🤝‍🧑  Convidar usuário
          </button>
        )}
      </div>

      {/* Create form */}
      {creating && (
        <div style={{ ...card, marginBottom: 20, padding: 22 }}>
          <h4 style={{ ...sectionTitle, marginBottom: 14, fontSize: 14 }}>Convidar nova pessoa</h4>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 12, marginBottom: 14 }}>
            <div>
              <label style={labelStyle}>Nome completo</label>
              <input style={inputBase} value={newName} onChange={e => setNewName(e.target.value)} placeholder="Ana Silva" />
            </div>
            <div>
              <label style={labelStyle}>Email</label>
              <input style={inputBase} type="email" value={newEmail} onChange={e => setNewEmail(e.target.value)} placeholder="ana@mam.ba.gov.br" />
            </div>
            <div>
              <label style={labelStyle}>Função</label>
              <select
                style={{ ...inputBase, cursor: 'pointer' }}
                value={newRole}
                onChange={e => setNewRole(e.target.value as Role)}
              >
                <option value="GESTOR">Gestor</option>
                <option value="ADMIN">Administrador</option>
              </select>
            </div>
          </div>
          <p style={{ fontSize: 12, color: COLORS.muted, marginBottom: 14 }}>
            A pessoa vai receber um email com link para definir a própria senha. O convite expira em 7 dias.
          </p>
          <div style={{ display: 'flex', gap: 12 }}>
            <button onClick={handleCreate} disabled={creatingBusy} style={btnPrimary}>
              {creatingBusy ? 'Enviando convite…' : 'Enviar convite'}
            </button>
            <button onClick={() => setCreating(false)} style={btnGhost}>Cancelar</button>
          </div>
        </div>
      )}

      {/* List table */}
      <div style={{ ...card, padding: 0, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ background: 'rgba(255,255,255,0.04)' }}>
              <th style={th}>USUÁRIO</th>
              <th style={th}>NÍVEL</th>
              <th style={th}>STATUS</th>
              <th style={{ ...th, textAlign: 'right' }}>AÇÕES</th>
            </tr>
          </thead>
          <tbody>
            {loading && list.length === 0 && (
              <tr><td colSpan={4} style={{ padding: 18, color: COLORS.faint }}>Carregando…</td></tr>
            )}
            {!loading && list.length === 0 && (
              <tr><td colSpan={4} style={{ padding: 18, color: COLORS.faint }}>Sem gestores cadastrados.</td></tr>
            )}
            {list.map(u => {
              const isMe = u.id === me?.id;
              const pill = statusPill(u.status, u.invite?.expiresInDays);
              const isPending = u.status === 'CONVITE_PENDENTE' || u.status === 'CONVITE_EXPIRADO';

              return (
                <tr key={u.id} style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}>
                  <td style={td}>
                    <strong style={{ color: COLORS.text, marginRight: 8 }}>{u.name}</strong>
                    {isMe && (
                      <span style={{
                        fontSize: 10, color: COLORS.brand, fontFamily: "'Space Mono', monospace",
                        letterSpacing: 1, marginRight: 6,
                      }}>
                        VOCÊ
                      </span>
                    )}
                    <div style={{ color: COLORS.muted, fontSize: 12, marginTop: 2 }}>{u.email}</div>
                  </td>
                  <td style={td}>
                    {isMe || isPending ? (
                      <span style={{
                        display: 'inline-block',
                        padding: '4px 10px',
                        borderRadius: 6,
                        background: 'rgba(245,193,71,0.12)',
                        color: '#F5C147',
                        fontFamily: "'Space Mono', monospace",
                        fontSize: 10,
                        letterSpacing: 1.5,
                        fontWeight: 700,
                      }}>
                        {ROLE_LABEL[u.role]}
                      </span>
                    ) : (
                      <select
                        value={u.role}
                        onChange={e => handleChangeRole(u, e.target.value as Role)}
                        style={{
                          background: 'rgba(255,255,255,0.04)',
                          color: COLORS.text,
                          border: `1px solid ${COLORS.border}`,
                          borderRadius: 6,
                          padding: '4px 8px',
                          fontFamily: "'DM Sans', sans-serif",
                          fontSize: 12,
                          cursor: 'pointer',
                        }}
                      >
                        <option value="GESTOR">Gestor</option>
                        <option value="ADMIN">Administrador</option>
                      </select>
                    )}
                  </td>
                  <td style={td}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      {(pill as any).dot && (
                        <span style={{
                          display: 'inline-block', width: 8, height: 8, borderRadius: '50%',
                          background: pill.color,
                        }} />
                      )}
                      <span style={{
                        color: pill.color,
                        fontWeight: u.status.startsWith('CONVITE_') ? 700 : 400,
                        fontFamily: u.status.startsWith('CONVITE_') ? "'Space Mono', monospace" : "'DM Sans', sans-serif",
                        fontSize: u.status.startsWith('CONVITE_') ? 11 : 13,
                        letterSpacing: u.status.startsWith('CONVITE_') ? 1 : 0,
                      }}>
                        {pill.label}
                      </span>
                    </div>
                    {(pill as any).sub && (
                      <div style={{ color: COLORS.faint, fontSize: 11, marginTop: 4 }}>
                        {(pill as any).sub}
                      </div>
                    )}
                  </td>
                  <td style={{ ...td, textAlign: 'right' }}>
                    <div style={{ display: 'inline-flex', gap: 6 }}>
                      {isPending && (
                        <button onClick={() => handleResend(u)} title="Reenviar convite" style={iconBtn}>
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="22" y1="2" x2="11" y2="13"/>
                            <polygon points="22 2 15 22 11 13 2 9 22 2"/>
                          </svg>
                        </button>
                      )}
                      {isPending && (
                        <button onClick={() => handleRevoke(u)} title="Cancelar convite" style={iconBtn}>
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="12" cy="12" r="10"/>
                            <line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/>
                          </svg>
                        </button>
                      )}
                      {!isPending && !isMe && (
                        <button onClick={() => { setResettingId(u.id); setResetPassword(''); }} title="Redefinir senha" style={iconBtn}>
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/>
                          </svg>
                        </button>
                      )}
                      <button
                        onClick={() => handleToggleActive(u)}
                        disabled={isMe}
                        title={u.active ? 'Desativar (preserva conta)' : 'Reativar'}
                        style={{ ...iconBtn, opacity: isMe ? 0.3 : 1, cursor: isMe ? 'not-allowed' : 'pointer' }}
                      >
                        {u.active ? (
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="12" cy="12" r="10"/>
                            <line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/>
                          </svg>
                        ) : (
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="20 6 9 17 4 12"/>
                          </svg>
                        )}
                      </button>
                      <button
                        onClick={() => handleHardDelete(u)}
                        disabled={isMe}
                        title="Excluir definitivamente"
                        style={{
                          ...iconBtn,
                          opacity: isMe ? 0.3 : 1,
                          cursor: isMe ? 'not-allowed' : 'pointer',
                          color: '#F2A29F',
                        }}
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                          <line x1="10" y1="11" x2="10" y2="17"/>
                          <line x1="14" y1="11" x2="14" y2="17"/>
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Reset password modal */}
      {resettingId && (
        <div style={modalBackdrop}>
          <div style={{ ...card, width: 420, maxWidth: '90vw', padding: 24 }}>
            <h3 style={{ ...sectionTitle, marginBottom: 16 }}>Redefinir senha</h3>
            <p style={{ color: COLORS.muted, fontSize: 13, marginTop: 0, marginBottom: 16 }}>
              Defina uma nova senha. Comunique ao gestor depois para ele entrar e trocar.
            </p>
            <label style={labelStyle}>Nova senha</label>
            <input
              type="password"
              style={{ ...inputBase, marginBottom: 16 }}
              value={resetPassword}
              onChange={e => setResetPassword(e.target.value)}
              placeholder="Mínimo 8 caracteres"
              autoFocus
            />
            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
              <button onClick={() => setResettingId(null)} style={btnGhost}>Cancelar</button>
              <button onClick={handleResetPasswordSubmit} disabled={resetBusy} style={btnPrimary}>
                {resetBusy ? 'Redefinindo…' : 'Redefinir'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Invite link modal (after create/resend) */}
      {inviteLink && (
        <div style={modalBackdrop} onClick={() => setInviteLink(null)}>
          <div style={{ ...card, width: 540, maxWidth: '92vw', padding: 26 }} onClick={e => e.stopPropagation()}>
            <h3 style={{ ...sectionTitle, marginBottom: 12 }}>Convite gerado</h3>
            <p style={{ color: COLORS.muted, fontSize: 13, lineHeight: 1.5, margin: '0 0 18px' }}>
              {inviteLink.emailSent ? (
                <>
                  Enviamos um email para <strong style={{ color: COLORS.text }}>{inviteLink.email}</strong> com o link
                  para definir a senha. Expira em <strong style={{ color: COLORS.text }}>{inviteLink.expiresInDays} dias</strong>.
                </>
              ) : (
                <>
                  Copie o link abaixo e envie pra <strong style={{ color: COLORS.text }}>{inviteLink.email}</strong>.
                  Expira em <strong style={{ color: COLORS.text }}>{inviteLink.expiresInDays} dias</strong>.
                </>
              )}
            </p>
            <div style={{
              background: 'rgba(255,255,255,0.04)',
              border: `1px solid ${COLORS.border}`,
              borderRadius: 10,
              padding: 12,
              fontFamily: "'Space Mono', monospace",
              fontSize: 11,
              color: COLORS.text,
              wordBreak: 'break-all',
              marginBottom: 16,
            }}>
              {inviteLink.url}
            </div>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
              <button onClick={() => setInviteLink(null)} style={btnGhost}>Fechar</button>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(inviteLink.url);
                  setInfo('Link copiado. Envie manualmente para a pessoa.');
                }}
                style={btnPrimary}
              >
                📋 Copiar link
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Hard-delete confirmation — replaces the previous double window.confirm. */}
      {deleteTarget && (() => {
        const target = deleteTarget;
        const matches = deleteConfirmText.trim().toLowerCase() === target.email.toLowerCase();
        return (
          <div style={modalBackdrop} onClick={() => !deleteBusy && setDeleteTarget(null)}>
            <div
              style={{ ...card, width: 480, maxWidth: '92vw', padding: 26, borderColor: 'rgba(232,85,78,0.35)' }}
              onClick={e => e.stopPropagation()}
            >
              <h3 style={{ ...sectionTitle, marginBottom: 8, color: COLORS.brand, fontSize: 16 }}>
                Excluir definitivamente
              </h3>
              <p style={{ color: COLORS.muted, fontSize: 13, lineHeight: 1.6, margin: '0 0 8px' }}>
                A conta de <strong style={{ color: COLORS.text }}>{target.name}</strong> será apagada permanentemente.
              </p>
              <p style={{ color: COLORS.muted, fontSize: 13, lineHeight: 1.6, margin: '0 0 20px' }}>
                Esta ação não pode ser desfeita — o histórico de auditoria será perdido.
              </p>
              <label style={{ ...labelStyle, marginBottom: 4 }}>Para confirmar, digite o email abaixo:</label>
              <div style={{
                fontFamily: "'Space Mono', monospace",
                fontSize: 12,
                color: COLORS.text,
                background: 'rgba(255,255,255,0.04)',
                border: `1px solid ${COLORS.border}`,
                borderRadius: 6,
                padding: '6px 10px',
                marginBottom: 10,
                userSelect: 'all',
              }}>
                {target.email}
              </div>
              <input
                style={inputBase}
                value={deleteConfirmText}
                onChange={e => setDeleteConfirmText(e.target.value)}
                placeholder="Digite o email para liberar o botão"
                autoFocus
                disabled={deleteBusy}
              />
              <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 20 }}>
                <button
                  onClick={() => setDeleteTarget(null)}
                  style={btnGhost}
                  disabled={deleteBusy}
                >
                  Cancelar
                </button>
                <button
                  onClick={confirmHardDelete}
                  style={{
                    ...btnDanger,
                    opacity: matches && !deleteBusy ? 1 : 0.45,
                    cursor: matches && !deleteBusy ? 'pointer' : 'not-allowed',
                  }}
                  disabled={!matches || deleteBusy}
                >
                  {deleteBusy ? 'Excluindo…' : 'Excluir definitivamente'}
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Generic confirm modal — replaces the remaining native window.confirm
          popups for cancel-invite and deactivate. */}
      {confirmAction && (
        <div style={modalBackdrop} onClick={() => !confirmBusy && setConfirmAction(null)}>
          <div
            style={{
              ...card,
              width: 440,
              maxWidth: '92vw',
              padding: 26,
              borderColor: confirmAction.danger ? 'rgba(232,85,78,0.35)' : COLORS.border,
            }}
            onClick={e => e.stopPropagation()}
          >
            <h3 style={{
              ...sectionTitle,
              marginBottom: 10,
              fontSize: 16,
              color: confirmAction.danger ? COLORS.brand : COLORS.text,
            }}>
              {confirmAction.title}
            </h3>
            <p style={{ color: COLORS.muted, fontSize: 13, lineHeight: 1.6, margin: '0 0 22px' }}>
              {confirmAction.message}
            </p>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
              <button
                onClick={() => setConfirmAction(null)}
                style={btnGhost}
                disabled={confirmBusy}
              >
                Voltar
              </button>
              <button
                onClick={async () => {
                  setConfirmBusy(true);
                  try {
                    await confirmAction.onConfirm();
                    setConfirmAction(null);
                  } catch (err: any) {
                    setError(err?.response?.data?.error || err?.message || 'Erro ao executar ação');
                  } finally {
                    setConfirmBusy(false);
                  }
                }}
                style={confirmAction.danger ? btnDanger : btnPrimary}
                disabled={confirmBusy}
              >
                {confirmBusy ? 'Aguarde…' : confirmAction.confirmLabel}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const th: React.CSSProperties = {
  textAlign: 'left',
  padding: '12px 18px',
  color: COLORS.muted,
  fontFamily: "'Space Mono', monospace",
  fontSize: 10,
  letterSpacing: 2,
  fontWeight: 'normal' as const,
};
const td: React.CSSProperties = { padding: '14px 18px', fontSize: 13, color: COLORS.text };

const iconBtn: React.CSSProperties = {
  background: 'transparent',
  border: 'none',
  color: COLORS.muted,
  width: 32,
  height: 32,
  borderRadius: 8,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  cursor: 'pointer',
  padding: 0,
};

const modalBackdrop: React.CSSProperties = {
  position: 'fixed',
  inset: 0,
  background: 'rgba(0,0,0,0.7)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 100,
  backdropFilter: 'blur(4px)',
};
