/**
 * seed-visitors-mock.ts — synthetic Visitor + Checkin rows for the piloto
 * demo, sized to MAM Bahia volume (≈280 visitors/day on the camera, with
 * ~10–14% voluntarily checking in).
 *
 * Only synthetic visitors are inserted (cpfHash is a random opaque string,
 * never a real CPF). Existing visitors are preserved.
 *
 * Idempotent guard: skips if there are already > 800 visitor rows. To
 * re-seed from scratch, pass --reset (deletes only synthetic rows whose
 * name begins with "MOCK·").
 *
 * Usage:
 *   npx tsx prisma/seed-visitors-mock.ts
 *   npx tsx prisma/seed-visitors-mock.ts --reset
 */

import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';

const prisma = new PrismaClient();

const DAYS = 60;
const ADHESION_RATE = 0.12;   // 12% of camera visitors check in
const DAILY_AVG_ENTRIES = 280;
const TODAY_BOOST = 2.0;
const YESTERDAY_BOOST = 1.5;
const GROWTH_TREND_MIN = 0.6;
const GROWTH_TREND_MAX = 1.4;

const FIRST_NAMES = ['Ana', 'João', 'Maria', 'Pedro', 'Beatriz', 'Lucas', 'Sofia', 'Mateus', 'Camila', 'Rafael', 'Letícia', 'Gabriel', 'Júlia', 'Felipe', 'Larissa', 'Daniel', 'Mariana', 'Tiago', 'Helena', 'Bruno', 'Isabela', 'Caio', 'Yasmin', 'Vinicius', 'Clara', 'Eduardo', 'Sara', 'Diego', 'Manuela', 'Ricardo'];
const LAST_NAMES = ['Silva', 'Santos', 'Oliveira', 'Souza', 'Lima', 'Pereira', 'Costa', 'Ferreira', 'Almeida', 'Rodrigues', 'Carvalho', 'Gomes', 'Martins', 'Araújo', 'Ribeiro', 'Barbosa', 'Cavalcanti'];
const GENDERS: Array<'FEMININO' | 'MASCULINO' | 'NAO_BINARIO' | 'PREFIRO_NAO_DIZER'> =
  ['FEMININO', 'MASCULINO', 'NAO_BINARIO', 'PREFIRO_NAO_DIZER'];
const GENDER_WEIGHTS = [0.52, 0.43, 0.03, 0.02]; // realistic Brazilian museum mix
const ORIGINS: Array<'SALVADOR' | 'INTERIOR_BA' | 'OUTRO_ESTADO' | 'INTERNACIONAL'> =
  ['SALVADOR', 'INTERIOR_BA', 'OUTRO_ESTADO', 'INTERNACIONAL'];
const ORIGIN_WEIGHTS = [0.62, 0.18, 0.16, 0.04];
const CHANNELS: Array<'REDES_SOCIAIS' | 'INDICACAO' | 'PASSOU_NA_FRENTE' | 'JORNAL_TV' | 'ESCOLA_FACULDADE' | 'OUTRO'> =
  ['REDES_SOCIAIS', 'INDICACAO', 'PASSOU_NA_FRENTE', 'JORNAL_TV', 'ESCOLA_FACULDADE', 'OUTRO'];
const CHANNEL_WEIGHTS = [0.46, 0.21, 0.14, 0.08, 0.07, 0.04];

function pickWeighted<T>(items: T[], weights: number[]): T {
  const r = Math.random();
  let cum = 0;
  for (let i = 0; i < items.length; i++) {
    cum += weights[i];
    if (r <= cum) return items[i];
  }
  return items[items.length - 1];
}

function randHour(): number {
  // weighted to mid-afternoon, matching the camera curve
  const weights: Record<number, number> = { 10: 0.06, 11: 0.10, 12: 0.13, 13: 0.14, 14: 0.16, 15: 0.16, 16: 0.13, 17: 0.08, 18: 0.04 };
  const r = Math.random();
  let cum = 0;
  for (const [h, w] of Object.entries(weights)) { cum += w; if (r <= cum) return Number(h); }
  return 14;
}

function rand(min: number, max: number): number { return Math.floor(Math.random() * (max - min + 1)) + min; }

function isOpen(date: Date): boolean { return date.getDay() !== 1; }

async function main() {
  const reset = process.argv.includes('--reset');

  if (reset) {
    // Find synthetic visitor IDs first.
    const synthetic = await prisma.visitor.findMany({
      where: { name: { startsWith: 'MOCK·' } },
      select: { id: true },
    });
    const ids = synthetic.map(v => v.id);
    if (ids.length > 0) {
      const ckDel = await prisma.checkin.deleteMany({ where: { visitorId: { in: ids } } });
      const vDel = await prisma.visitor.deleteMany({ where: { id: { in: ids } } });
      console.log(`🧹 deleted ${ckDel.count} mock checkins + ${vDel.count} mock visitors`);
    }
  } else {
    const existing = await prisma.visitor.count();
    if (existing > 800) {
      console.log(`⏭  ${existing} visitors already exist — skipping (use --reset to wipe synthetic rows).`);
      await prisma.$disconnect();
      return;
    }
  }

  // Pick the active or most recent exhibition.
  const exhibition =
    (await prisma.exhibition.findFirst({ where: { status: 'ACTIVE' } }))
    ?? (await prisma.exhibition.findFirst({ orderBy: { updatedAt: 'desc' } }));
  if (!exhibition) {
    console.error('❌ no exhibition found.');
    process.exit(1);
  }

  const totalCheckins = Math.round(DAYS * DAILY_AVG_ENTRIES * (6 / 7) * ADHESION_RATE);
  console.log(`Target: ${totalCheckins} mock checkins (≈${Math.round(totalCheckins / DAYS)}/day, ${Math.round(ADHESION_RATE * 100)}% adesão)`);

  // Day distribution mirrors the camera seed so daily ratios stay coherent.
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
    const isYesterday = i === 1;
    const ageFraction = i / (DAYS - 1);
    const trend = GROWTH_TREND_MAX - ageFraction * (GROWTH_TREND_MAX - GROWTH_TREND_MIN);
    const dayBoost = isToday ? TODAY_BOOST : isYesterday ? YESTERDAY_BOOST : 1.0;
    const w = (isWeekend ? 1.3 : 1.0) * dayBoost * trend * (0.85 + Math.random() * 0.3);
    dayDistribution.push(w);
    totalWeight += w;
  }

  // Build synthetic visitors first (one per checkin — assumption: most visitors
  // visit once during the period; recurring is naturally low at ~5%, which we'll
  // achieve by having a small pool of "returning" IDs).
  const recurringPool: string[] = [];
  const visitorsToCreate: any[] = [];
  for (let n = 0; n < totalCheckins; n++) {
    const yearOptions = [1995, 2000, 1985, 1978, 2002, 1990, 1965, 1958, 2008, 1972];
    const birthYear = yearOptions[rand(0, yearOptions.length - 1)];
    const first = FIRST_NAMES[rand(0, FIRST_NAMES.length - 1)];
    const last = LAST_NAMES[rand(0, LAST_NAMES.length - 1)];
    visitorsToCreate.push({
      cpfHash: `mock-${crypto.randomBytes(16).toString('hex')}`,
      name: `MOCK· ${first} ${last}`,
      birthYear,
      gender: pickWeighted(GENDERS, GENDER_WEIGHTS),
      origin: pickWeighted(ORIGINS, ORIGIN_WEIGHTS),
    });
  }

  console.log(`Inserting ${visitorsToCreate.length} synthetic visitors…`);
  // createMany doesn't return ids; do it in batches and capture by re-querying.
  await prisma.visitor.createMany({ data: visitorsToCreate, skipDuplicates: true });

  // Re-query the inserted MOCK visitors to get their IDs.
  const allMockVisitors = await prisma.visitor.findMany({
    where: { name: { startsWith: 'MOCK·' } },
    select: { id: true },
  });
  console.log(`Got ${allMockVisitors.length} mock visitor ids back.`);

  // Build checkins distributed across days.
  const checkinsToCreate: any[] = [];
  let visitorIdx = 0;
  for (let i = 0; i < DAYS; i++) {
    if (dayDistribution[i] === 0) continue;
    const dayShare = dayDistribution[i] / totalWeight;
    const dayCheckins = Math.round(totalCheckins * dayShare);
    const dateBase = new Date(today);
    dateBase.setDate(dateBase.getDate() - i);

    for (let c = 0; c < dayCheckins; c++) {
      // 5% chance of being a returning visitor: pick from the recurring pool
      // if it has anyone, else fall back to a fresh id.
      let visitorId: string;
      if (Math.random() < 0.05 && recurringPool.length > 0) {
        visitorId = recurringPool[rand(0, recurringPool.length - 1)];
      } else if (visitorIdx < allMockVisitors.length) {
        visitorId = allMockVisitors[visitorIdx].id;
        if (recurringPool.length < 50) recurringPool.push(visitorId);
        visitorIdx++;
      } else {
        break;
      }
      const ts = new Date(dateBase);
      ts.setHours(randHour(), rand(0, 59), rand(0, 59), 0);
      checkinsToCreate.push({
        visitorId,
        exhibitionId: exhibition.id,
        channel: pickWeighted(CHANNELS, CHANNEL_WEIGHTS),
        createdAt: ts,
      });
    }
  }

  console.log(`Inserting ${checkinsToCreate.length} synthetic checkins…`);
  // Chunk to keep packets reasonable.
  const CHUNK = 500;
  for (let i = 0; i < checkinsToCreate.length; i += CHUNK) {
    await prisma.checkin.createMany({ data: checkinsToCreate.slice(i, i + CHUNK) });
  }

  // Final tallies.
  const ckCount = await prisma.checkin.count();
  const vCount = await prisma.visitor.count();
  const ent = await prisma.cameraCount.aggregate({ _sum: { count: true }, where: { type: 'ENTRADA' } });

  console.log('');
  console.log(`📊 Pós-seed:`);
  console.log(`   Visitors total: ${vCount}`);
  console.log(`   Checkins total: ${ckCount}`);
  console.log(`   ENTRADA total:  ${ent._sum.count ?? 0}`);
  console.log(`   Adesão:         ${Math.round((ckCount / Math.max(ent._sum.count ?? 1, 1)) * 100)}%`);
}

main()
  .catch(err => { console.error(err); process.exit(1); })
  .finally(() => prisma.$disconnect());
