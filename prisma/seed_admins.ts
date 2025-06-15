// Use CommonJS require to avoid "SyntaxError: Cannot use import statement
// outside a module" when Prisma executes this seed script with plain Node.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  console.log('Start seeding admin users…');

  /* ------------------------------------------------------------------ */
  /*  Create / upsert admin users                                       */
  /* ------------------------------------------------------------------ */

  // Restaurant Manager Admin
  const managerAdmin = await prisma.waiter.upsert({
    where: { id: 'admin-1-manager-id' },
    update: {},
    create: {
      id: 'admin-1-manager-id',
      name: 'Sarah',
      surname: 'Johnson',
      address: '42 Restaurant Ave, Cape Town',
      phone: '+27-82-555-1234',
      email: 'manager@redbut.ai',
      tag_nickname: 'manager',
      propic: 'https://example.com/avatars/manager.jpg',
    },
  });

  // System Administrator
  const sysAdmin = await prisma.waiter.upsert({
    where: { id: 'admin-2-sysadmin-id' },
    update: {},
    create: {
      id: 'admin-2-sysadmin-id',
      name: 'Alex',
      surname: 'Tech',
      address: '1 System Road, Johannesburg',
      phone: '+27-83-555-9876',
      email: 'admin@redbut.ai',
      tag_nickname: 'sysadmin',
      propic: 'https://example.com/avatars/sysadmin.jpg',
    },
  });

  /* ------------------------------------------------------------------ */
  /*  Create / upsert access users with admin userType                  */
  /* ------------------------------------------------------------------ */

  const managerAccess = await prisma.accessUser.upsert({
    where: { userId: managerAdmin.id },
    update: { userType: 'admin' },
    create: {
      userId: managerAdmin.id,
      username: managerAdmin.email,
      password: '__new__pass',
      userType: 'admin',
    },
  });

  const sysAdminAccess = await prisma.accessUser.upsert({
    where: { userId: sysAdmin.id },
    update: { userType: 'admin' },
    create: {
      userId: sysAdmin.id,
      username: sysAdmin.email,
      password: '__new__pass',
      userType: 'admin',
    },
  });

  console.log('Seeded / updated admin users:', { managerAdmin, sysAdmin });
  console.log('Seeded / updated admin access accounts:', { managerAccess, sysAdminAccess });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });