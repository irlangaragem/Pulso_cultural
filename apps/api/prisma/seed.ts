import 'dotenv/config'; // loads .env in local dev; Railway injects vars automatically
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  // 1. Create Museum
  const museum = await prisma.museum.upsert({
    where: { slug: 'mam-bahia' },
    update: {},
    create: {
      name: 'Museu de Arte Moderna da Bahia',
      slug: 'mam-bahia',
      address: 'Av. Lafayete Coutinho, s/n - Comércio',
      city: 'Salvador',
      state: 'BA',
      openingHours: {
        tue_sun: '10:00-18:00',
        mon: 'Closed'
      }
    }
  });

  // 1.1 Create Default Admin User with hashed password
  const rawPassword = process.env.ADMIN_PASSWORD || 'PUL_$O=CL';
  if (rawPassword === 'PUL_$O=CL') {
    console.warn('⚠️ ADMIN_PASSWORD env variable is not set. Using default password "PUL_$O=CL". Please change this in production.');
  }
  const passwordHash = await bcrypt.hash(rawPassword, 12);

  await prisma.user.upsert({
    where: { email: 'admin@mam.ba.gov.br' },
    update: { passwordHash },  // re-hash on each seed in case ADMIN_PASSWORD changed
    create: {
      email: 'admin@mam.ba.gov.br',
      passwordHash,
      name: 'Administrador MAM',
      role: 'GESTOR',
      museumId: museum.id
    }
  });

  // 2. Create Exhibition
  const exhibition = await prisma.exhibition.upsert({
    where: { id: 'default-exhibition' },
    update: {},
    create: {
      id: 'default-exhibition',
      museumId: museum.id,
      name: 'Uma História da Arte Brasileira',
      subtitle: '80 obras do MAM Rio · Entrada gratuita',
      description: '80 obras do acervo do MAM Rio chegam a Salvador numa celebração da arte brasileira do século XX. De Portinari a Anita Malfatti, de Di Cavalcanti a Lygia Clark — um percurso que atravessa movimentos, gerações e visões de Brasil.',
      startDate: new Date(),
      endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      status: 'ACTIVE'
    }
  });

  // 3. Create Works
  const works = [
    { title: 'Retirantes', artist: 'Cândido Portinari', year: '1944', room: 'Sala 1', order: 1, description: 'Óleo sobre tela que retrata a migração nordestina. Uma das obras mais emblemáticas da arte social brasileira, mostrando a força e o sofrimento do povo em êxodo.' },
    { title: 'A Boba', artist: 'Anita Malfatti', year: '1915–16', room: 'Sala 2', order: 2, description: 'Obra-chave do modernismo brasileiro. A deformação expressionista dos traços causou escândalo na exposição de 1917 e abriu caminho para a Semana de 22.' },
    { title: 'Cinco Moças de Guaratinguetá', artist: 'Di Cavalcanti', year: '1930', room: 'Sala 2', order: 3, description: 'Mulatas em cores tropicais — a brasilidade celebrada com sensualidade e vigor. Di Cavalcanti traduz o povo em forma e cor.' },
    { title: 'Bicho', artist: 'Lygia Clark', year: '1960', room: 'Sala 3', order: 4, description: 'Escultura articulada em metal que convida à participação. O espectador se torna coautor da forma — arte como experiência viva.' },
    { title: 'Bandeirinhas', artist: 'Alfredo Volpi', year: 'c. 1960', room: 'Sala 3', order: 5, description: 'Têmpera sobre tela com o motivo que se tornou assinatura de Volpi. Geometria popular, cor vibrante, simplicidade que é sofisticação.' },
    { title: 'Núcleo', artist: 'Iberê Camargo', year: '1963', room: 'Sala 4', order: 6, description: 'Expressionismo abstrato carregado de matéria e tensão. Camargo construía suas telas com camadas densas de tinta, criando profundidade emocional.' },
  ];

  for (const w of works) {
    // Check if work already exists to avoid duplicates on re-seed
    const existing = await prisma.work.findFirst({
      where: { title: w.title, exhibitionId: exhibition.id }
    });
    if (!existing) {
      await prisma.work.create({ data: { ...w, exhibitionId: exhibition.id } });
    }
  }

  console.log('Seed completed successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
