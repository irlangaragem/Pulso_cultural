import crypto from 'node:crypto';

/**
 * Pending-invite store. Tokens live in memory and expire after `TTL_HOURS`.
 *
 * Trade-off: an API restart clears pending invites — admins need to "Reenviar".
 * This avoids a database migration on the production Railway DB. When the
 * schema can be migrated, replace this with a `UserInvite` table.
 */

const TTL_HOURS = 24 * 7; // 7 days
const PENDING_PREFIX = 'PENDING_INVITE:';

interface InviteRecord {
  userId: string;
  email: string;
  expiresAt: number;
}

const tokens = new Map<string, InviteRecord>();
const userIndex = new Map<string, string>(); // userId -> token (latest)

function prune() {
  const now = Date.now();
  for (const [token, rec] of tokens.entries()) {
    if (rec.expiresAt < now) {
      tokens.delete(token);
      if (userIndex.get(rec.userId) === token) userIndex.delete(rec.userId);
    }
  }
}

export const InviteService = {
  /**
   * Returns a placeholder password hash that no real password can match.
   * Used when creating a user that hasn't accepted the invite yet, since the
   * Prisma schema requires `passwordHash` to be non-null.
   */
  pendingHashPlaceholder(): string {
    return PENDING_PREFIX + crypto.randomBytes(24).toString('hex');
  },

  isPendingHash(hash: string | null | undefined): boolean {
    return !!hash && hash.startsWith(PENDING_PREFIX);
  },

  create(userId: string, email: string): { token: string; expiresAt: Date } {
    prune();

    // Invalidate previous token for the same user, if any.
    const prev = userIndex.get(userId);
    if (prev) tokens.delete(prev);

    const token = crypto.randomBytes(24).toString('base64url');
    const expiresAt = Date.now() + TTL_HOURS * 60 * 60 * 1000;
    tokens.set(token, { userId, email, expiresAt });
    userIndex.set(userId, token);

    return { token, expiresAt: new Date(expiresAt) };
  },

  /**
   * Returns the userId if the token is valid and not expired; null otherwise.
   * Single-use: caller should `consume(token)` after a successful accept.
   */
  resolve(token: string): InviteRecord | null {
    prune();
    const rec = tokens.get(token);
    if (!rec) return null;
    if (rec.expiresAt < Date.now()) {
      tokens.delete(token);
      userIndex.delete(rec.userId);
      return null;
    }
    return rec;
  },

  consume(token: string): void {
    const rec = tokens.get(token);
    if (rec) userIndex.delete(rec.userId);
    tokens.delete(token);
  },

  /** Look up the active token+expiry for a user (for the dashboard "expires in N days" hint). */
  getForUser(userId: string): { token: string; expiresAt: Date } | null {
    prune();
    const token = userIndex.get(userId);
    if (!token) return null;
    const rec = tokens.get(token);
    if (!rec) return null;
    return { token, expiresAt: new Date(rec.expiresAt) };
  },

  revoke(userId: string): void {
    const token = userIndex.get(userId);
    if (token) tokens.delete(token);
    userIndex.delete(userId);
  },
};
