/**
 * Read-only inspection of the connected Postgres.
 * Does not write or alter the schema. Run with:
 *   npx tsx prisma/inspect.ts
 */
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('=== Pulso Cultural — DB inspection (read-only) ===\n');

  // Connectivity
  await prisma.$queryRaw`SELECT 1`;
  console.log('✔ Conexão OK\n');

  // Inspect raw schema (tables present)
  const tables = await prisma.$queryRaw<{ table_name: string }[]>`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
    ORDER BY table_name
  `;
  console.log(`Tables (${tables.length}):`);
  for (const t of tables) console.log(`  - ${t.table_name}`);
  console.log('');

  // Try high-level counts (will fail gracefully if tables missing)
  async function safeCount(label: string, fn: () => Promise<number>) {
    try {
      const n = await fn();
      console.log(`  ${label}: ${n}`);
    } catch (err: any) {
      console.log(`  ${label}: <indisponível — ${err?.code || err?.message}>`);
    }
  }

  console.log('Counts:');
  await safeCount('Museums', () => prisma.museum.count());
  await safeCount('Exhibitions', () => prisma.exhibition.count());
  await safeCount('Works', () => prisma.work.count());
  await safeCount('Users (gestores)', () => prisma.user.count());
  await safeCount('Visitors', () => prisma.visitor.count());
  await safeCount('Checkins', () => prisma.checkin.count());
  await safeCount('Evaluations', () => prisma.evaluation.count());
  await safeCount('CameraCount rows', () => prisma.cameraCount.count());
  await safeCount('AnalyticsEvents', () => prisma.analyticsEvent.count());
  console.log('');

  // Camera count totals (this is the LOG-01 audit metric)
  try {
    const sumIn = await prisma.cameraCount.aggregate({
      _sum: { count: true },
      where: { type: 'ENTRADA' },
    });
    const sumOut = await prisma.cameraCount.aggregate({
      _sum: { count: true },
      where: { type: 'SAIDA' },
    });
    console.log('Camera totals (sum of "count" field):');
    console.log(`  ENTRADA total: ${sumIn._sum.count ?? 0}`);
    console.log(`  SAIDA   total: ${sumOut._sum.count ?? 0}`);
  } catch (err: any) {
    console.log(`  CameraCount aggregation failed: ${err?.message}`);
  }
  console.log('');

  // Museums
  try {
    const museums = await prisma.museum.findMany({ select: { slug: true, name: true, city: true, state: true } });
    console.log(`Museums:`);
    for (const m of museums) console.log(`  - ${m.slug} · ${m.name} (${m.city}/${m.state})`);
    console.log('');
  } catch { /* ignore */ }

  // Exhibitions
  try {
    const exhibitions = await prisma.exhibition.findMany({
      select: { id: true, name: true, status: true, startDate: true, endDate: true, _count: { select: { works: true } } },
      orderBy: { startDate: 'desc' },
      take: 10,
    });
    console.log(`Exhibitions (latest 10):`);
    for (const e of exhibitions) {
      const start = e.startDate.toISOString().slice(0, 10);
      const end = e.endDate.toISOString().slice(0, 10);
      console.log(`  - ${e.id} · ${e.name} · ${e.status} · ${start}→${end} · ${e._count.works} works`);
    }
    console.log('');
  } catch { /* ignore */ }

  // Users (no password hash)
  try {
    const users = await prisma.user.findMany({
      select: { email: true, role: true, active: true, museumId: true, createdAt: true },
      orderBy: { createdAt: 'asc' },
    });
    console.log(`Users:`);
    for (const u of users) {
      console.log(`  - ${u.email} · ${u.role} · active=${u.active} · museum=${u.museumId} · created=${u.createdAt.toISOString().slice(0, 10)}`);
    }
    console.log('');
  } catch { /* ignore */ }

  // Recent visitors
  try {
    const recent = await prisma.visitor.findMany({
      select: { id: true, gender: true, origin: true, birthYear: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
      take: 5,
    });
    console.log(`Recent visitors (5 most recent — no PII):`);
    for (const v of recent) {
      console.log(`  - ${v.id} · ${v.gender} · ${v.origin} · ${v.birthYear} · created=${v.createdAt.toISOString().slice(0, 10)}`);
    }
    console.log('');
  } catch { /* ignore */ }

  // Recent checkins
  try {
    const ck = await prisma.checkin.findMany({
      select: { id: true, exhibitionId: true, channel: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
      take: 5,
    });
    console.log(`Recent checkins (5 most recent):`);
    for (const c of ck) {
      console.log(`  - ${c.id.slice(0, 12)}… · exh=${c.exhibitionId} · ${c.channel} · ${c.createdAt.toISOString()}`);
    }
    console.log('');
  } catch { /* ignore */ }

  // Recent camera counts
  try {
    const cc = await prisma.cameraCount.findMany({
      select: { id: true, exhibitionId: true, type: true, count: true, timestamp: true },
      orderBy: { timestamp: 'desc' },
      take: 8,
    });
    console.log(`Recent CameraCount rows (8 most recent):`);
    for (const r of cc) {
      console.log(`  - ${r.timestamp.toISOString()} · exh=${r.exhibitionId ?? '—'} · ${r.type} · count=${r.count}`);
    }
    console.log('');
  } catch { /* ignore */ }

  // Recent analytics events
  try {
    const ev = await prisma.analyticsEvent.findMany({
      select: { event: true, exhibitionId: true, museumSlug: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });
    console.log(`Recent AnalyticsEvents (10 most recent):`);
    for (const e of ev) {
      console.log(`  - ${e.createdAt.toISOString()} · ${e.event} · exh=${e.exhibitionId ?? '—'} · slug=${e.museumSlug ?? '—'}`);
    }
    console.log('');
  } catch { /* ignore */ }
}

main()
  .catch(err => {
    console.error('FAIL:', err?.message || err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
