/**
 * reset-admin.ts
 * ─────────────────────────────────────────────────────────────
 * Resets admin@mam.ba.gov.br password to the value of ADMIN_PASSWORD env var.
 *
 * Usage (local):
 *   ADMIN_PASSWORD=MinhaNovaSenh@ npx tsx prisma/reset-admin.ts
 *
 * Usage (Railway shell — Apps > API > Shell):
 *   ADMIN_PASSWORD=MinhaNovaSenh@ npx tsx prisma/reset-admin.ts
 *   — or set ADMIN_PASSWORD in Railway env vars and run:
 *   npx tsx prisma/reset-admin.ts
 */

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const email = process.env.ADMIN_EMAIL || 'admin@mam.ba.gov.br';
  const newPassword = process.env.ADMIN_PASSWORD;

  if (!newPassword) {
    console.error('❌  ADMIN_PASSWORD env var is required.');
    console.error('    Example: ADMIN_PASSWORD="MinhaSenh@123" npx tsx prisma/reset-admin.ts');
    process.exit(1);
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    console.error(`❌  User "${email}" not found. Run "npx prisma db seed" first.`);
    process.exit(1);
  }

  const passwordHash = await bcrypt.hash(newPassword, 12);
  await prisma.user.update({
    where: { email },
    data: { passwordHash },
  });

  console.log(`✅  Password for "${email}" updated successfully.`);
  console.log(`    New password: ${newPassword}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
