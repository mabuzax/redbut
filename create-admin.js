const { PrismaClient } = require('./apps/api/node_modules/.prisma/client');

async function createAdminUser() {
  const prisma = new PrismaClient();
  
  try {
    // Create an admin user for testing
    const adminUser = await prisma.waiter.create({
      data: {
        name: 'Admin',
        surname: 'User',
        email: 'info@treeparrot.co.za',
        phone: '+27123456789',
        tag_nickname: 'admin_user',
        userType: 'admin',
        restaurantId: 'cabcf95b-a3ab-4f0f-8474-88ec122def2c' // Use the same restaurant ID as other waiters
      }
    });
    
    console.log('Admin user created successfully:');
    console.log(JSON.stringify(adminUser, null, 2));
    
  } catch (error) {
    console.error('Error creating admin user:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createAdminUser();
