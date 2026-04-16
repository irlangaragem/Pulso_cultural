import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const EXHIBITION_ID = 'default-exhibition';

  // Show current state
  const before = await prisma.exhibition.findUnique({ where: { id: EXHIBITION_ID } });
  console.log('📋 Atual:');
  console.log(`   Nome: ${before?.name}`);
  console.log(`   Subtítulo: ${before?.subtitle}`);
  console.log(`   Descrição: ${before?.description?.slice(0, 80)}...`);

  // Restore to original values
  await prisma.exhibition.update({
    where: { id: EXHIBITION_ID },
    data: {
      name: 'Uma História da Arte Brasileira',
      subtitle: '80 obras do MAM Rio · Entrada gratuita',
      description: '80 obras do acervo do MAM Rio chegam a Salvador numa celebração da arte brasileira do século XX. De Portinari a Anita Malfatti, de Di Cavalcanti a Lygia Clark — um percurso que atravessa movimentos, gerações e visões de Brasil.',
      status: 'ACTIVE',
    },
  });

  const after = await prisma.exhibition.findUnique({ where: { id: EXHIBITION_ID } });
  console.log('\n✅ Atualizado:');
  console.log(`   Nome: ${after?.name}`);
  console.log(`   Subtítulo: ${after?.subtitle}`);
  console.log(`   Descrição: ${after?.description?.slice(0, 80)}...`);
}

main()
  .catch((e) => {
    console.error('❌ Erro:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
