import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const EXHIBITION_ID = 'default-exhibition';

  // 1. Count existing works
  const before = await prisma.work.count({ where: { exhibitionId: EXHIBITION_ID } });
  console.log(`🔍 Obras encontradas antes da limpeza: ${before}`);

  // 2. Delete ALL works for this exhibition
  const deleted = await prisma.work.deleteMany({ where: { exhibitionId: EXHIBITION_ID } });
  console.log(`🗑️  Obras removidas: ${deleted.count}`);

  // 3. Recreate exactly 4 curated works
  const works = [
    {
      title: 'Retirantes',
      artist: 'Cândido Portinari',
      year: '1944',
      room: 'Sala 1',
      order: 1,
      description: 'Óleo sobre tela que retrata a migração nordestina. Uma das obras mais emblemáticas da arte social brasileira, mostrando a força e o sofrimento do povo em êxodo.',
    },
    {
      title: 'A Boba',
      artist: 'Anita Malfatti',
      year: '1915–16',
      room: 'Sala 2',
      order: 2,
      description: 'Obra-chave do modernismo brasileiro. A deformação expressionista dos traços causou escândalo na exposição de 1917 e abriu caminho para a Semana de 22.',
    },
    {
      title: 'Cinco Moças de Guaratinguetá',
      artist: 'Di Cavalcanti',
      year: '1930',
      room: 'Sala 2',
      order: 3,
      description: 'Mulatas em cores tropicais — a brasilidade celebrada com sensualidade e vigor. Di Cavalcanti traduz o povo em forma e cor.',
    },
    {
      title: 'Bicho',
      artist: 'Lygia Clark',
      year: '1960',
      room: 'Sala 3',
      order: 4,
      description: 'Escultura articulada em metal que convida à participação. O espectador se torna coautor da forma — arte como experiência viva.',
    },
  ];

  for (const w of works) {
    await prisma.work.create({ data: { ...w, exhibitionId: EXHIBITION_ID } });
    console.log(`✅ Criada: "${w.title}" — ${w.artist}`);
  }

  const after = await prisma.work.count({ where: { exhibitionId: EXHIBITION_ID } });
  console.log(`\n🎉 Concluído! Total de obras agora: ${after}`);
}

main()
  .catch((e) => {
    console.error('❌ Erro:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
