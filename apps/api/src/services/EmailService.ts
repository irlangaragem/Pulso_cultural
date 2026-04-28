import nodemailer, { Transporter } from 'nodemailer';

/**
 * Sends transactional emails via SMTP if configured.
 * Without SMTP env vars, emails are logged and the link is returned to the
 * caller — useful in dev and when SMTP isn't ready yet.
 *
 * Required env (production):
 *   SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM
 *   (optional: SMTP_SECURE = "1" for 465, otherwise STARTTLS on 587)
 */

let cachedTransporter: Transporter | null = null;

function getTransporter(): Transporter | null {
  if (cachedTransporter) return cachedTransporter;
  const host = process.env.SMTP_HOST;
  if (!host) return null;
  const port = Number(process.env.SMTP_PORT || 587);
  const secure = process.env.SMTP_SECURE === '1';
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  cachedTransporter = nodemailer.createTransport({
    host, port, secure,
    auth: user && pass ? { user, pass } : undefined,
  });
  return cachedTransporter;
}

export interface InviteEmailPayload {
  to: string;
  toName: string;
  inviteUrl: string;
  museumName: string;
  inviterName?: string;
  expiresInDays: number;
}

function inviteHtml(p: InviteEmailPayload): string {
  return `<!doctype html>
<html lang="pt-BR">
<body style="margin:0;padding:32px;background:#0E0B0D;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#F5ECE4">
  <div style="max-width:520px;margin:0 auto;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.08);border-radius:14px;padding:32px">
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:24px">
      <span style="display:inline-block;width:24px;height:24px;border-radius:50%;background:radial-gradient(circle at 30% 30%, #F28C38, #E8554E)"></span>
      <span style="font-weight:700;letter-spacing:1px">PULSO CULTURAL</span>
    </div>
    <h1 style="font-size:22px;font-weight:700;margin:0 0 12px">Você foi convidado para o ${p.museumName}</h1>
    <p style="color:#A8969A;line-height:1.55;font-size:14px;margin:0 0 20px">
      Olá ${p.toName},${p.inviterName ? ` ${p.inviterName} convidou você` : ' você foi convidado'} para acessar o painel de gestão do Pulso Cultural no <strong>${p.museumName}</strong>.
    </p>
    <p style="color:#A8969A;line-height:1.55;font-size:14px;margin:0 0 28px">
      Clique no botão abaixo para definir sua senha e entrar. O convite expira em ${p.expiresInDays} dias.
    </p>
    <a href="${p.inviteUrl}" style="display:inline-block;background:linear-gradient(135deg,#E8554E,#D4267E);color:#fff;text-decoration:none;padding:14px 28px;border-radius:12px;font-weight:600">
      Aceitar convite e definir senha
    </a>
    <p style="color:#6B5A60;font-size:11px;line-height:1.5;margin:28px 0 0">
      Se o botão não funcionar, copie e cole esta URL no navegador:<br>
      <span style="word-break:break-all;color:#A8969A">${p.inviteUrl}</span>
    </p>
  </div>
</body>
</html>`;
}

export const EmailService = {
  /**
   * Returns whether SMTP is configured at all (i.e., we will *attempt* to send).
   * The actual SMTP send happens fire-and-forget so the HTTP request returns
   * fast even when the provider is slow/unverified — the invite URL is always
   * returned in the response body so the admin can copy it as a fallback.
   *
   * Why fire-and-forget: Resend (and most providers) can take 2–10s on the
   * first send after a cold start; an unverified domain causes a 30s+ hang
   * before failing. Awaiting that inside the request handler caused the
   * dashboard's 20s axios timeout to fire and made the UI look broken.
   */
  sendInvite(p: InviteEmailPayload): boolean {
    const transporter = getTransporter();
    if (!transporter) {
      console.log(`[email:mock] invite for ${p.to}: ${p.inviteUrl}`);
      return false;
    }
    setImmediate(() => {
      transporter
        .sendMail({
          from: process.env.SMTP_FROM || `Pulso Cultural <noreply@${(process.env.SMTP_HOST || 'localhost').replace(/^smtp\./, '')}>`,
          to: `${p.toName} <${p.to}>`,
          subject: `Convite para o ${p.museumName} · Pulso Cultural`,
          html: inviteHtml(p),
          text: `Você foi convidado para acessar o painel do ${p.museumName}.\n\nDefina sua senha em: ${p.inviteUrl}\n\nO convite expira em ${p.expiresInDays} dias.`,
        })
        .then(() => console.log(`[email] invite sent to ${p.to}`))
        .catch(err => console.error('[email] failed to send invite:', err?.message ?? err));
    });
    return true;
  },
};
