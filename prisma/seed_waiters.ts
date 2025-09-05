// Use CommonJS require to avoid "SyntaxError: Cannot use import statement
// outside a module" when Prisma executes this seed script with plain Node.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { PrismaClient: PrismaClientWaiters } = require('../apps/api/node_modules/.prisma/client');se CommonJS require to avoid “SyntaxError: Cannot use import statement
// outside a module” when Prisma executes this seed script with plain Node.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { PrismaClient: PrismaClientWaiters } = require('@prisma/client');

const prismaWaiters = new PrismaClientWaiters();

async function main() {
  console.log('Start seeding waiters…');

  /* ------------------------------------------------------------------ */
  /*  Create / upsert three waiters                                     */
  /* ------------------------------------------------------------------ */

  const waiter1 = await prismaWaiters.waiter.upsert({
    where: { id: 'd9f7ba3b-1a0d-4b69-9950-6d1461e33c01' },
    update: {},
    create: {
      id: 'd9f7ba3b-1a0d-4b69-9950-6d1461e33c01',
      name: 'John',
      surname: 'Doe',
      address: '123 Main St, Cape Town',
      phone: '+27-82-123-4567',
      email: 'john.doe@example.com',
      tag_nickname: 'johnny',
      propic: 'https://example.com/avatars/john.jpg',
    },
  });

  const waiter2 = await prismaWaiters.waiter.upsert({
    where: { id: '3c4d8be2-85bd-4c72-9b6e-748d6e1abf42' },
    update: {},
    create: {
      id: '3c4d8be2-85bd-4c72-9b6e-748d6e1abf42',
      name: 'Maria',
      surname: 'Santos',
      address: '456 Oak Avenue, Johannesburg',
      phone: null, // optional field
      email: 'maria.santos@example.com',
      tag_nickname: 'marias',
      propic: 'https://example.com/avatars/maria.jpg',
    },
  });

  const waiter3 = await prismaWaiters.waiter.upsert({
    where: { id: 'b7d4f195-cdc3-426d-9f4f-b31d41d61234' },
    update: {},
    create: {
      id: 'b7d4f195-cdc3-426d-9f4f-b31d41d61234',
      name: 'Lebo',
      surname: 'Nkosi',
      address: '789 Pine Road, Durban',
      phone: '+27-83-765-4321',
      email: 'lebo.nkosi@example.com',
      tag_nickname: 'lebo',
      propic: null,
    },
  });

  /* ------------------------------------------------------------------ */
  /*  Create / upsert access users (default pwd = "__new__pass")        */
  /* ------------------------------------------------------------------ */

  const acc1 = await prismaWaiters.accessUser.upsert({
    where: { userId: waiter1.id },
    update: {},
    create: {
      userId: waiter1.id,
      username: waiter1.email,
      password: '__new__pass',
    },
  });

  const acc2 = await prismaWaiters.accessUser.upsert({
    where: { userId: waiter2.id },
    update: {},
    create: {
      userId: waiter2.id,
      username: waiter2.email,
      password: '__new__pass',
    },
  });

  const acc3 = await prismaWaiters.accessUser.upsert({
    where: { userId: waiter3.id },
    update: {},
    create: {
      userId: waiter3.id,
      username: waiter3.email,
      password: '__new__pass',
    },
  });

  console.log('Seeded / updated waiters:', { waiter1, waiter2, waiter3 });
  console.log('Seeded / updated access users:', { acc1, acc2, acc3 });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prismaWaiters.$disconnect();
  });
