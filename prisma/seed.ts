// Use CommonJS require to avoid “SyntaxError: Cannot use import statement
// outside a module” when Prisma executes this seed script with plain Node.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  console.log('Start seeding...');

  // Create Menu Categories
  const appetizersCategory = await prisma.menuCategory.upsert({
    where: { id: 'cat_appetizers' },
    update: {},
    create: {
      id: 'cat_appetizers',
      description: 'Appetizers',
    },
  });

  const mainCoursesCategory = await prisma.menuCategory.upsert({
    where: { id: 'cat_main_courses' },
    update: {},
    create: {
      id: 'cat_main_courses',
      description: 'Main Courses',
    },
  });

  const drinksCategory = await prisma.menuCategory.upsert({
    where: { id: 'cat_drinks' },
    update: {},
    create: {
      id: 'cat_drinks',
      description: 'Drinks',
    },
  });

  const dessertsCategory = await prisma.menuCategory.upsert({
    where: { id: 'cat_desserts' },
    update: {},
    create: {
      id: 'cat_desserts',
      description: 'Desserts',
    },
  });

  console.log('Created categories:', {
    appetizersCategory,
    mainCoursesCategory,
    drinksCategory,
    dessertsCategory,
  });

  // Create 5 Dummy Menu Items
  const menuItem1 = await prisma.menuItem.upsert({
    where: { id: 'item1' }, // Using a fixed ID for upsert to prevent duplicates on re-run
    update: {},
    create: {
      id: 'item1',
      name: 'Garlic Bread',
      description: 'Toasted bread with garlic butter and herbs.',
      price: 5.99,
      categoryId: appetizersCategory.id,
      status: 'Active',
    },
  });

  const menuItem2 = await prisma.menuItem.upsert({
    where: { id: 'item2' },
    update: {},
    create: {
      id: 'item2',
      name: 'Spaghetti Carbonara',
      description: 'Classic pasta with eggs, hard cheese, cured pork, and black pepper.',
      price: 15.50,
      categoryId: mainCoursesCategory.id,
      status: 'Active',
    },
  });

  const menuItem3 = await prisma.menuItem.upsert({
    where: { id: 'item3' },
    update: {},
    create: {
      id: 'item3',
      name: 'Coca-Cola',
      description: 'Refreshing carbonated soft drink.',
      price: 3.00,
      categoryId: drinksCategory.id,
      status: 'Active',
    },
  });

  const menuItem4 = await prisma.menuItem.upsert({
    where: { id: 'item4' },
    update: {},
    create: {
      id: 'item4',
      name: 'Tiramisu',
      description: 'Coffee-flavored Italian dessert.',
      price: 8.75,
      categoryId: dessertsCategory.id,
      status: 'Active',
    },
  });

  const menuItem5 = await prisma.menuItem.upsert({
    where: { id: 'item5' },
    update: {},
    create: {
      id: 'item5',
      name: 'Grilled Salmon',
      description: 'Fresh grilled salmon with seasonal vegetables.',
      price: 22.00,
      categoryId: mainCoursesCategory.id,
      status: 'Active',
    },
  });

  console.log('Created menu items:', {
    menuItem1,
    menuItem2,
    menuItem3,
    menuItem4,
    menuItem5,
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
