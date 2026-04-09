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
  const rawPassword = process.env.ADMIN_PASSWORD || 'admin123';
  if (rawPassword === 'admin123') {
    console.warn('⚠️ ADMIN_PASSWORD env variable is not set. Using default password "admin123". Please change this in production.');
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
      name: 'Horizonte Local',
      subtitle: 'A arte contemporânea da Bahia',
      description: 'Uma jornada visual pelas cores e formas da Salvador moderna.',
      startDate: new Date(),
      endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      status: 'ACTIVE'
    }
  });

  // 3. Create Works
  const works = [
    { title: 'O Grito da Bahia', artist: 'Artista Local', year: '2023', room: 'Galeria A', order: 1, description: 'Representação da força soteropolitana.' },
    { title: 'Horizonte Infinito', artist: 'Maria Clara', year: '2024', room: 'Galeria A', order: 2, description: 'Estudo sobre as águas do Solar do Unhão.' },
    { title: 'Ritmo Ancestral', artist: 'José Santos', year: '2022', room: 'Sala B', order: 3, description: 'Escultura sonora que ressoa a herança africana.' },
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
