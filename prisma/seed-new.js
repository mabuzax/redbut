// Use CommonJS require to avoid "SyntaxError: Cannot use import statement
// outside a module" when Prisma executes this seed script with plain Node.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { PrismaClient } = require('../apps/api/node_modules/.prisma/client');

const prisma = new PrismaClient();

async function main() {
  console.log('Start seeding...');

  // Create Menu Items with categories
  const menuItems = [
    {
      id: 'item_burger',
      category: 'Main Courses',
      name: 'Classic Burger',
      description: 'Juicy beef patty with lettuce, tomato, and special sauce',
      price: 12.99,
      status: 'Active',
      served_info: 'Served with fries',
      available_options: JSON.stringify(['No onions', 'Extra cheese', 'Well done']),
      available_extras: JSON.stringify(['Bacon +$2', 'Avocado +$1.50'])
    },
    {
      id: 'item_pizza',
      category: 'Main Courses', 
      name: 'Margherita Pizza',
      description: 'Fresh mozzarella, tomatoes, and basil on wood-fired crust',
      price: 15.99,
      status: 'Active',
      served_info: 'Serves 1-2 people',
      available_options: JSON.stringify(['Thin crust', 'Thick crust', 'Gluten-free']),
      available_extras: JSON.stringify(['Extra cheese +$2', 'Pepperoni +$3'])
    },
    {
      id: 'item_caesar',
      category: 'Appetizers',
      name: 'Caesar Salad',
      description: 'Crisp romaine lettuce with parmesan, croutons, and caesar dressing',
      price: 8.99,
      status: 'Active',
      served_info: 'Fresh daily',
      available_options: JSON.stringify(['No croutons', 'Light dressing', 'Extra parmesan']),
      available_extras: JSON.stringify(['Grilled chicken +$4', 'Bacon bits +$2'])
    },
    {
      id: 'item_wings',
      category: 'Appetizers',
      name: 'Buffalo Wings',
      description: 'Spicy chicken wings served with celery and blue cheese',
      price: 9.99,
      status: 'Active',
      served_info: '8 pieces per order',
      available_options: JSON.stringify(['Mild', 'Medium', 'Hot', 'Extra Hot']),
      available_extras: JSON.stringify(['Extra sauce +$1', 'Ranch dressing +$0.50'])
    },
    {
      id: 'item_coke',
      category: 'Drinks',
      name: 'Coca Cola',
      description: 'Refreshing cola drink',
      price: 2.99,
      status: 'Active',
      served_info: 'Served chilled',
      available_options: JSON.stringify(['Regular', 'Diet', 'Zero']),
      available_extras: JSON.stringify(['Extra ice', 'Lemon slice'])
    },
    {
      id: 'item_coffee',
      category: 'Drinks',
      name: 'Espresso Coffee',
      description: 'Rich, bold coffee made from premium beans',
      price: 3.99,
      status: 'Active',
      served_info: 'Freshly brewed',
      available_options: JSON.stringify(['Single', 'Double', 'Decaf']),
      available_extras: JSON.stringify(['Sugar +$0', 'Cream +$0.50', 'Oat milk +$1'])
    },
    {
      id: 'item_tiramisu',
      category: 'Desserts',
      name: 'Tiramisu',
      description: 'Classic Italian dessert with mascarpone and coffee',
      price: 6.99,
      status: 'Active',
      served_info: 'Made fresh daily',
      available_options: JSON.stringify(['Regular', 'Decaf coffee version']),
      available_extras: JSON.stringify(['Extra cocoa powder', 'Whipped cream +$1'])
    },
    {
      id: 'item_cheesecake',
      category: 'Desserts',
      name: 'New York Cheesecake',
      description: 'Creamy cheesecake with graham cracker crust',
      price: 5.99,
      status: 'Active',
      served_info: 'Served chilled',
      available_options: JSON.stringify(['Plain', 'With berries']),
      available_extras: JSON.stringify(['Strawberry sauce +$1', 'Chocolate sauce +$1'])
    }
  ];

  // Create all menu items
  for (const item of menuItems) {
    await prisma.menuItem.upsert({
      where: { id: item.id },
      update: {},
      create: item
    });
  }

  console.log('✅ Created menu items:', menuItems.length);

  // Create Waiters first
  const waiters = [
    {
        id: 'd9f7ba3b-1a0d-4b69-9950-6d1461e33c01',
      name: 'John',
      surname: 'Doe',
      address: '123 Main St, Cape Town',
      phone: '+27-82-123-4567',
      email: 'john.doe@example.com',
      tag_nickname: 'johnny',
      propic: 'https://example.com/avatars/john.jpg'
    },
    {
      id: '3c4d8be2-85bd-4c72-9b6e-748d6e1abf42',
      name: 'Maria',
      surname: 'Santos',
      address: '456 Oak Avenue, Johannesburg',
      phone: null, // optional field
      email: 'maria.santos@example.com',
      tag_nickname: 'marias',
      propic: 'https://example.com/avatars/maria.jpg',
    },
    {
       id: 'b7d4f195-cdc3-426d-9f4f-b31d41d61234',
      name: 'Lebo',
      surname: 'Nkosi',
      address: '789 Pine Road, Durban',
      phone: '+27-83-765-4321',
      email: 'lebo.nkosi@example.com',
      tag_nickname: 'lebo',
      propic: null,
    }
  ];

  for (const waiter of waiters) {
    await prisma.waiter.upsert({
      where: { id: waiter.id },
      update: {},
      create: waiter
    });
  }

  console.log('✅ Created waiters:', waiters.length);

  // Create Access Users (tied to waiters)
  const accessUsers = [
    {
      userId: 'd9f7ba3b-1a0d-4b69-9950-6d1461e33c01',
      username: 'john.doe@example.com',
      code: null,
      userType: 'waiter'
    },
    {
      userId: '3c4d8be2-85bd-4c72-9b6e-748d6e1abf42',
      username: 'maria.santos@example.com',
      code: null,
      userType: 'waiter'
    },
    {
      userId: 'b7d4f195-cdc3-426d-9f4f-b31d41d61234',
      username: 'lebo.nkosi@example.com',
      code: null,
      userType: 'waiter'
    }
  ];

  for (const user of accessUsers) {
    await prisma.accessUser.upsert({
      where: { userId: user.userId },
      update: {},
      create: user
    });
  }

  console.log('✅ Created access users:', accessUsers.length);

  // Create Order Status Configurations
  const orderStatusConfigs = [
    { currentStatus: 'New', targetStatus: 'Acknowledged', userRole: 'admin', label: 'Acknowledge Order' },
    { currentStatus: 'New', targetStatus: 'Cancelled', userRole: 'admin', label: 'Cancel Order' },
    { currentStatus: 'Acknowledged', targetStatus: 'InProgress', userRole: 'kitchen', label: 'Start Preparation' },
    { currentStatus: 'Acknowledged', targetStatus: 'Cancelled', userRole: 'admin', label: 'Cancel Order' },
    { currentStatus: 'InProgress', targetStatus: 'Complete', userRole: 'kitchen', label: 'Mark Complete' },
    { currentStatus: 'Complete', targetStatus: 'Delivered', userRole: 'waiter', label: 'Mark Delivered' },
    { currentStatus: 'Delivered', targetStatus: 'Paid', userRole: 'waiter', label: 'Mark Paid' },
    { currentStatus: 'New', targetStatus: 'Rejected', userRole: 'admin', label: 'Reject Order' },
    { currentStatus: 'Acknowledged', targetStatus: 'Rejected', userRole: 'admin', label: 'Reject Order' }
  ];

  for (const config of orderStatusConfigs) {
    await prisma.orderStatusConfig.upsert({
      where: {
        id: `${config.currentStatus}_to_${config.targetStatus}_${config.userRole}`
      },
      update: {},
      create: {
        id: `${config.currentStatus}_to_${config.targetStatus}_${config.userRole}`,
        ...config
      }
    });
  }

  console.log('✅ Created order status configurations:', orderStatusConfigs.length);

  // Create Request Status Configurations  
  const requestStatusConfigs = [
    { currentStatus: 'New', targetStatus: 'Acknowledged', userRole: 'waiter', label: 'Acknowledge Request' },
    { currentStatus: 'Acknowledged', targetStatus: 'InProgress', userRole: 'waiter', label: 'Start Working' },
    { currentStatus: 'InProgress', targetStatus: 'Completed', userRole: 'waiter', label: 'Mark Completed' },
    { currentStatus: 'New', targetStatus: 'Cancelled', userRole: 'waiter', label: 'Cancel Request' },
    { currentStatus: 'Acknowledged', targetStatus: 'Cancelled', userRole: 'waiter', label: 'Cancel Request' },
    { currentStatus: 'InProgress', targetStatus: 'OnHold', userRole: 'waiter', label: 'Put On Hold' },
    { currentStatus: 'OnHold', targetStatus: 'InProgress', userRole: 'waiter', label: 'Resume Work' }
  ];

  for (const config of requestStatusConfigs) {
    await prisma.requestStatusConfig.upsert({
      where: {
        id: `${config.currentStatus}_to_${config.targetStatus}_${config.userRole}`
      },
      update: {},
      create: {
        id: `${config.currentStatus}_to_${config.targetStatus}_${config.userRole}`,
        ...config
      }
    });
  }

  console.log('✅ Created request status configurations:', requestStatusConfigs.length);

  console.log('🎉 Seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
