// Simple seed script for waiters
const { PrismaClient } = require('./apps/api/node_modules/.prisma/client');

const prisma = new PrismaClient();

async function main() {
  console.log('Start seeding waiters…');

  const waiter1 = await prisma.waiter.upsert({
    where: { email: 'john.doe@example.com' },
    update: {},
    create: {
      name: 'John',
      surname: 'Doe',
      address: '123 Main St, Cape Town',
      phone: '+27-82-123-4567',
      email: 'john.doe@example.com',
      tag_nickname: 'johnny',
      propic: 'https://example.com/avatars/john.jpg',
    },
  });

  const waiter2 = await prisma.waiter.upsert({
    where: { email: 'maria.santos@example.com' },
    update: {},
    create: {
      name: 'Maria',
      surname: 'Santos',
      address: '456 Oak Avenue, Johannesburg',
      phone: '+27-83-987-6543',
      email: 'maria.santos@example.com',
      tag_nickname: 'marias',
      propic: 'https://example.com/avatars/maria.jpg',
    },
  });

  const waiter3 = await prisma.waiter.upsert({
    where: { email: 'lebo.mthembu@example.com' },
    update: {},
    create: {
      name: 'Lebo',
      surname: 'Mthembu',
      address: '789 Pine Street, Durban',
      phone: '+27-84-555-1234',
      email: 'lebo.mthembu@example.com',
      tag_nickname: 'lebom',
      propic: 'https://example.com/avatars/lebo.jpg',
    },
  });

  console.log({ waiter1, waiter2, waiter3 });
  console.log('Seeding finished.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
