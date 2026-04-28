import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const PILOT_MUSEUM_SLUG = process.env.PILOT_MUSEUM_SLUG || 'mam-bahia';

async function main() {
  // 1. Museum
  const museum = await prisma.museum.upsert({
    where: { slug: PILOT_MUSEUM_SLUG },
    update: {},
    create: {
      name: 'Museu de Arte Moderna da Bahia',
      slug: PILOT_MUSEUM_SLUG,
      address: 'Av. Lafayete Coutinho, s/n - Comércio',
      city: 'Salvador',
      state: 'BA',
      openingHours: { tue_sun: '10:00-18:00', mon: 'Closed' },
    },
  });

  // 2. Admin user — only created when missing. ADMIN_PASSWORD must be set.
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@mam.ba.gov.br';
  const existingAdmin = await prisma.user.findUnique({ where: { email: adminEmail } });
  if (!existingAdmin) {
    const rawPassword = process.env.ADMIN_PASSWORD;
    if (!rawPassword) {
      throw new Error('ADMIN_PASSWORD env is required to seed the admin user.');
    }
    const passwordHash = await bcrypt.hash(rawPassword, 12);
    await prisma.user.create({
      data: {
        email: adminEmail,
        passwordHash,
        name: 'Administrador MAM',
        role: 'GESTOR',
        museumId: museum.id,
      },
    });
    console.log(`[seed] Admin created: ${adminEmail}`);
  } else {
    console.log(`[seed] Admin already exists: ${existingAdmin.email}`);
  }

  // 3. Exhibition
  const exhibition = await prisma.exhibition.upsert({
    where: { id: 'default-exhibition' },
    update: {},
    create: {
      id: 'default-exhibition',
      museumId: museum.id,
      name: 'Uma História da Arte Brasileira',
      subtitle: '80 obras do MAM Rio · Entrada gratuita',
      description:
        '80 obras do acervo do MAM Rio chegam a Salvador numa celebração da arte brasileira do século XX. ' +
        'De Portinari a Anita Malfatti, de Di Cavalcanti a Lygia Clark — um percurso que atravessa movimentos, gerações e visões de Brasil.',
      startDate: new Date(),
      endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      status: 'ACTIVE',
    },
  });

  // 4. Works
  const works = [
    { title: 'Retirantes', artist: 'Cândido Portinari', year: '1944', room: 'Sala 1', order: 1, description: 'Óleo sobre tela que retrata a migração nordestina. Uma das obras mais emblemáticas da arte social brasileira, mostrando a força e o sofrimento do povo em êxodo.' },
    { title: 'A Boba', artist: 'Anita Malfatti', year: '1915–16', room: 'Sala 2', order: 2, description: 'Obra-chave do modernismo brasileiro. A deformação expressionista dos traços causou escândalo na exposição de 1917 e abriu caminho para a Semana de 22.' },
    { title: 'Cinco Moças de Guaratinguetá', artist: 'Di Cavalcanti', year: '1930', room: 'Sala 2', order: 3, description: 'Mulatas em cores tropicais — a brasilidade celebrada com sensualidade e vigor. Di Cavalcanti traduz o povo em forma e cor.' },
    { title: 'Bicho', artist: 'Lygia Clark', year: '1960', room: 'Sala 3', order: 4, description: 'Escultura articulada em metal que convida à participação. O espectador se torna coautor da forma — arte como experiência viva.' },
    { title: 'Bandeirinhas', artist: 'Alfredo Volpi', year: 'c. 1960', room: 'Sala 3', order: 5, description: 'Têmpera sobre tela com o motivo que se tornou assinatura de Volpi. Geometria popular, cor vibrante, simplicidade que é sofisticação.' },
    { title: 'Núcleo', artist: 'Iberê Camargo', year: '1963', room: 'Sala 4', order: 6, description: 'Expressionismo abstrato carregado de matéria e tensão. Camargo construía suas telas com camadas densas de tinta, criando profundidade emocional.' },
  ];

  for (const w of works) {
    const existing = await prisma.work.findFirst({
      where: { title: w.title, exhibitionId: exhibition.id },
    });
    if (!existing) {
      await prisma.work.create({ data: { ...w, exhibitionId: exhibition.id } });
    }
  }

  console.log('[seed] done');
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
