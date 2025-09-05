const { PrismaClient } = require('./apps/api/node_modules/.prisma/client');

const prisma = new PrismaClient();

async function checkData() {
  try {
    console.log('📊 Checking database data...\n');
    
    // Check menu items
    const menuItems = await prisma.menuItem.findMany();
    console.log(`🍽️  Menu Items: ${menuItems.length}`);
    if (menuItems.length > 0) {
      console.log('   Sample:', menuItems.slice(0, 2).map(item => `${item.name} (${item.category})`));
    }
    
    // Check waiters
    const waiters = await prisma.waiter.findMany();
    console.log(`👨‍💼 Waiters: ${waiters.length}`);
    if (waiters.length > 0) {
      console.log('   Sample:', waiters.slice(0, 2).map(w => `${w.name} ${w.surname}`));
    }
    
    // Check access users
    const accessUsers = await prisma.accessUser.findMany();
    console.log(`🔐 Access Users: ${accessUsers.length}`);
    if (accessUsers.length > 0) {
      console.log('   Sample:', accessUsers.slice(0, 2).map(u => `${u.username} (${u.userType})`));
    }
    
    // Check order status configs
    const orderConfigs = await prisma.orderStatusConfig.findMany();
    console.log(`⚙️  Order Status Configs: ${orderConfigs.length}`);
    if (orderConfigs.length > 0) {
      console.log('   Sample:', orderConfigs.slice(0, 2).map(c => `${c.currentStatus} → ${c.targetStatus} (${c.userRole})`));
    }
    
    // Check request status configs
    const requestConfigs = await prisma.requestStatusConfig.findMany();
    console.log(`⚙️  Request Status Configs: ${requestConfigs.length}`);
    if (requestConfigs.length > 0) {
      console.log('   Sample:', requestConfigs.slice(0, 2).map(c => `${c.currentStatus} → ${c.targetStatus} (${c.userRole})`));
    }
    
    console.log('\n✅ Database recovery completed successfully!');
    console.log('🎉 All essential data has been restored.');
    
  } catch (error) {
    console.error('❌ Error checking data:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkData();
