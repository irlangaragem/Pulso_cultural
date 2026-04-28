/**
 * seed-work-audio.ts — fill empty `audioUrl` fields on Work rows with
 * publicly-hosted royalty-free audio samples, so the client can press play
 * on each card in the /guide and hear something during the piloto demo.
 *
 * Uses SoundHelix's free song hosting (commonly cited in dev demos —
 * stable, reliable, royalty-free). Each work gets a different track so
 * the audio doesn't repeat between cards.
 *
 * Idempotent: skips works that already have an audioUrl set.
 *
 * Usage:
 *   npx tsx prisma/seed-work-audio.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const SAMPLE_TRACKS = [
  'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
  'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3',
  'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3',
  'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3',
  'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-5.mp3',
  'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-6.mp3',
  'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-7.mp3',
  'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-8.mp3',
];

async function main() {
  const works = await prisma.work.findMany({ orderBy: [{ exhibitionId: 'asc' }, { order: 'asc' }] });
  let updated = 0;
  let skipped = 0;

  for (let i = 0; i < works.length; i++) {
    const w = works[i];
    if (w.audioUrl && w.audioUrl !== 'https://') {
      skipped++;
      continue;
    }
    const url = SAMPLE_TRACKS[i % SAMPLE_TRACKS.length];
    await prisma.work.update({ where: { id: w.id }, data: { audioUrl: url } });
    updated++;
  }

  console.log(`✅ ${updated} obras atualizadas com áudio sample`);
  if (skipped > 0) console.log(`⏭  ${skipped} obras já tinham áudio (preservadas)`);
}

main()
  .catch(err => { console.error(err); process.exit(1); })
  .finally(() => prisma.$disconnect());
