const { PrismaClient } = require('./apps/api/node_modules/.prisma/client');

async function checkWaiters() {
  const prisma = new PrismaClient();
  
  try {
    const waiters = await prisma.waiter.findMany({
      select: {
        id: true,
        name: true,
        surname: true,
        email: true,
        phone: true,
        userType: true,
        restaurantId: true,
      }
    });
    
    console.log('Existing waiters in database:');
    console.log(JSON.stringify(waiters, null, 2));
    
    // Check if we have any admin users
    const adminUsers = waiters.filter(w => w.userType === 'admin');
    console.log(`\nFound ${adminUsers.length} admin users`);
    
    if (adminUsers.length === 0) {
      console.log('\nNo admin users found. You will need to create one for testing.');
    }
    
  } catch (error) {
    console.error('Error checking waiters:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkWaiters();
