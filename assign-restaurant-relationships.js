/**
 * Migration script to assign restaurant relationships to existing data
 */

const { PrismaClient } = require('./apps/api/node_modules/.prisma/client');

const prisma = new PrismaClient();

async function assignRestaurantRelationships() {
  console.log('🔗 Assigning restaurant relationships to existing data...\n');

  try {
    // Get the default restaurant
    const defaultRestaurant = await prisma.restaurant.findFirst({
      where: {
        name: 'RedBut Restaurant'
      }
    });

    if (!defaultRestaurant) {
      throw new Error('Default restaurant not found. Please run setup-tenant-restaurant.js first.');
    }

    console.log(`Using default restaurant: ${defaultRestaurant.name} (${defaultRestaurant.id})`);

    // 1. Update existing waiters to belong to the default restaurant
    console.log('\n👨‍💼 Updating waiters...');
    const existingWaiters = await prisma.waiter.findMany({
      where: {
        restaurantId: null
      }
    });

    console.log(`Found ${existingWaiters.length} waiters to update`);

    if (existingWaiters.length > 0) {
      const waiterUpdateResult = await prisma.waiter.updateMany({
        where: {
          restaurantId: null
        },
        data: {
          restaurantId: defaultRestaurant.id
        }
      });
      console.log(`✅ Updated ${waiterUpdateResult.count} waiters with restaurant_id`);
    }

    // 2. Update existing users/sessions to belong to the default restaurant
    console.log('\n👥 Updating user sessions...');
    const existingUsers = await prisma.user.findMany({
      where: {
        restaurantId: null
      }
    });

    console.log(`Found ${existingUsers.length} user sessions to update`);

    if (existingUsers.length > 0) {
      const userUpdateResult = await prisma.user.updateMany({
        where: {
          restaurantId: null
        },
        data: {
          restaurantId: defaultRestaurant.id
        }
      });
      console.log(`✅ Updated ${userUpdateResult.count} user sessions with restaurant_id`);
    }

    // 3. Update existing closed sessions to belong to the default restaurant
    console.log('\n📝 Updating closed sessions...');
    const existingClosedSessions = await prisma.closedSession.findMany({
      where: {
        restaurantId: null
      }
    });

    console.log(`Found ${existingClosedSessions.length} closed sessions to update`);

    if (existingClosedSessions.length > 0) {
      const closedSessionUpdateResult = await prisma.closedSession.updateMany({
        where: {
          restaurantId: null
        },
        data: {
          restaurantId: defaultRestaurant.id
        }
      });
      console.log(`✅ Updated ${closedSessionUpdateResult.count} closed sessions with restaurant_id`);
    }

    // Verification
    console.log('\n📊 Verification:');
    const restaurantWithRelations = await prisma.restaurant.findFirst({
      where: { id: defaultRestaurant.id },
      include: {
        waiters: {
          select: {
            id: true,
            name: true,
            surname: true,
          }
        },
        users: {
          select: {
            id: true,
            sessionId: true,
            tableNumber: true,
          }
        },
        closedSessions: {
          select: {
            id: true,
            sessionId: true,
          }
        },
        menuItems: {
          select: {
            id: true,
            name: true,
          }
        }
      }
    });

    if (restaurantWithRelations) {
      console.log(`Restaurant: ${restaurantWithRelations.name}`);
      console.log(`- Waiters: ${restaurantWithRelations.waiters.length}`);
      console.log(`- Active sessions: ${restaurantWithRelations.users.length}`);
      console.log(`- Closed sessions: ${restaurantWithRelations.closedSessions.length}`);
      console.log(`- Menu items: ${restaurantWithRelations.menuItems.length}`);
      
      if (restaurantWithRelations.waiters.length > 0) {
        console.log('\n👨‍💼 Waiters:');
        restaurantWithRelations.waiters.forEach((waiter, index) => {
          console.log(`  ${index + 1}. ${waiter.name} ${waiter.surname}`);
        });
      }

      if (restaurantWithRelations.users.length > 0) {
        console.log('\n👥 Active sessions:');
        restaurantWithRelations.users.forEach((user, index) => {
          console.log(`  ${index + 1}. Table ${user.tableNumber} - Session: ${user.sessionId.slice(-8)}`);
        });
      }
    }

    console.log('\n✅ Restaurant relationship assignment completed successfully!');

  } catch (error) {
    console.error('❌ Assignment failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the assignment
assignRestaurantRelationships()
  .then(() => {
    console.log('\n🎉 Assignment completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Assignment failed:', error);
    process.exit(1);
  });
