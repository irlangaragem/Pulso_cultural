/**
 * seed-camera-mock.ts — populate CameraCount with realistic synthetic data
 * for the piloto demo, since the YOLOv8 vision pipeline isn't running yet.
 *
 * Generates 30 days of opening-hours data (Tue–Sun, 10h–18h) with peaks
 * mid-afternoon. Total ENTRADA aims for ~7× the existing check-in count
 * — which is the typical "real visitors vs. signed-in" multiplier the
 * product is meant to surface.
 *
 * Idempotent guard: rows are tagged via a fixed cameraId; running twice
 * detects existing seed and skips. To re-seed, delete by cameraId first.
 *
 * Usage:
 *   npx tsx prisma/seed-camera-mock.ts
 *
 *   # to wipe and re-seed:
 *   npx tsx prisma/seed-camera-mock.ts --reset
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const DAYS = 30;
const TARGET_MULTIPLIER = 7; // ENTRADA total / Checkin total

// Opening hours: Tue (2) → Sun (0), closed Mon (1).
function isOpen(date: Date): boolean {
  const d = date.getDay();
  return d !== 1; // closed Monday
}

// Hour weight curve: noon to 4 PM is busiest. Weights sum to 1.
const HOUR_WEIGHTS: Record<number, number> = {
  10: 0.06, 11: 0.10, 12: 0.13, 13: 0.14,
  14: 0.16, 15: 0.16, 16: 0.13, 17: 0.08, 18: 0.04,
};

function weightedHour(): number {
  const r = Math.random();
  let cum = 0;
  for (const [h, w] of Object.entries(HOUR_WEIGHTS)) {
    cum += w;
    if (r <= cum) return Number(h);
  }
  return 14;
}

function rand(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

async function main() {
  const reset = process.argv.includes('--reset');

  // Locate the demo camera + exhibition.
  const camera = await prisma.camera.findFirst({ where: { id: 'demo-camera' } });
  if (!camera) {
    console.error('❌ demo-camera not found. Run the main seed first.');
    process.exit(1);
  }
  const exhibition = await prisma.exhibition.findFirst({ where: { status: 'ACTIVE' } })
    ?? await prisma.exhibition.findFirst();
  if (!exhibition) {
    console.error('❌ no exhibition found. Create one first.');
    process.exit(1);
  }

  if (reset) {
    const deleted = await prisma.cameraCount.deleteMany({ where: { cameraId: camera.id } });
    console.log(`🧹 deleted ${deleted.count} pre-existing rows for camera ${camera.id}`);
  } else {
    const existing = await prisma.cameraCount.count({ where: { cameraId: camera.id } });
    if (existing > 200) {
      console.log(`⏭  ${existing} CameraCount rows already exist — skipping (use --reset to wipe).`);
      await prisma.$disconnect();
      return;
    }
  }

  // Aim for total ENTRADA ≈ TARGET_MULTIPLIER × check-in count.
  const checkinCount = await prisma.checkin.count();
  const targetEntradas = Math.max(50, checkinCount * TARGET_MULTIPLIER);
  const targetSaidas = Math.round(targetEntradas * 0.92); // most leave, a few overlap end-of-day

  console.log(`Target: ${targetEntradas} ENTRADA + ${targetSaidas} SAIDA across ${DAYS} days`);

  const rows: Array<{ cameraId: string; exhibitionId: string; type: 'ENTRADA' | 'SAIDA'; count: number; timestamp: Date }> = [];

  // Distribute counts day-by-day. Weekend = +30%, today = +random surge.
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const dayDistribution: number[] = [];
  let totalWeight = 0;
  for (let i = 0; i < DAYS; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    if (!isOpen(d)) { dayDistribution.push(0); continue; }
    const dow = d.getDay();
    const isWeekend = dow === 0 || dow === 6;
    const isToday = i === 0;
    const w = (isWeekend ? 1.3 : 1.0) * (isToday ? 1.4 : 1.0) * (0.85 + Math.random() * 0.3);
    dayDistribution.push(w);
    totalWeight += w;
  }

  for (let i = 0; i < DAYS; i++) {
    if (dayDistribution[i] === 0) continue;
    const dayShare = dayDistribution[i] / totalWeight;
    const dayEntradas = Math.round(targetEntradas * dayShare);
    const daySaidas = Math.round(targetSaidas * dayShare);

    const dateBase = new Date(today);
    dateBase.setDate(dateBase.getDate() - i);

    for (let e = 0; e < dayEntradas; e++) {
      const ts = new Date(dateBase);
      ts.setHours(weightedHour(), rand(0, 59), rand(0, 59), 0);
      // batch sizes: mostly singletons, occasional groups
      const count = Math.random() < 0.85 ? 1 : rand(2, 3);
      rows.push({ cameraId: camera.id, exhibitionId: exhibition.id, type: 'ENTRADA', count, timestamp: ts });
    }
    for (let e = 0; e < daySaidas; e++) {
      const ts = new Date(dateBase);
      // exits skew slightly later in the day vs. entries
      ts.setHours(Math.min(18, weightedHour() + rand(0, 1)), rand(0, 59), rand(0, 59), 0);
      const count = Math.random() < 0.85 ? 1 : rand(2, 3);
      rows.push({ cameraId: camera.id, exhibitionId: exhibition.id, type: 'SAIDA', count, timestamp: ts });
    }
  }

  console.log(`Inserting ${rows.length} CameraCount rows…`);
  // createMany is fastest for bulk inserts.
  const result = await prisma.cameraCount.createMany({ data: rows });
  console.log(`✅ inserted ${result.count} rows`);

  // Print resulting totals so we can sanity-check.
  const ent = await prisma.cameraCount.aggregate({ _sum: { count: true }, where: { type: 'ENTRADA' } });
  const sai = await prisma.cameraCount.aggregate({ _sum: { count: true }, where: { type: 'SAIDA' } });
  const ck  = await prisma.checkin.count();
  console.log('');
  console.log(`📊 Pós-seed:`);
  console.log(`   ENTRADA total:  ${ent._sum.count ?? 0}`);
  console.log(`   SAIDA total:    ${sai._sum.count ?? 0}`);
  console.log(`   Checkins total: ${ck}`);
  console.log(`   Multiplicador:  ${ck > 0 ? ((ent._sum.count ?? 0) / ck).toFixed(1) : '∞'}×`);
  console.log(`   Ocupação atual: ${Math.max(0, (ent._sum.count ?? 0) - (sai._sum.count ?? 0))}`);
}

main()
  .catch(err => { console.error(err); process.exit(1); })
  .finally(() => prisma.$disconnect());
