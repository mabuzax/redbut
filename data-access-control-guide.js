/**
 * Data Access Control Implementation Guide
 * 
 * This file shows exactly how to implement proper data isolation
 * for each user type in your application services.
 */

const { PrismaClient } = require('./apps/api/node_modules/.prisma/client');

const prisma = new PrismaClient();

/**
 * USER ACCESS PATTERNS
 * Users should only see their own orders and requests
 */
class UserDataService {
  
  // Get user's own orders only
  static async getUserOrders(sessionId) {
    return await prisma.order.findMany({
      where: {
        sessionId: sessionId // User can only see their session's orders
      },
      include: {
        orderItems: {
          include: {
            menuItem: {
              select: {
                name: true,
                price: true,
                category: true
              }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  // Get user's own requests only
  static async getUserRequests(sessionId) {
    return await prisma.request.findMany({
      where: {
        sessionId: sessionId // User can only see their session's requests
      },
      include: {
        logs: {
          orderBy: { dateTime: 'desc' }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  // Get restaurant-specific menu for user's session
  static async getRestaurantMenu(sessionId) {
    // First get the user's restaurant
    const user = await prisma.user.findFirst({
      where: { sessionId },
      select: { restaurantId: true }
    });

    if (!user) return [];

    // Return only menu items for this restaurant
    return await prisma.menuItem.findMany({
      where: {
        restaurantId: user.restaurantId,
        status: 'Active'
      },
      orderBy: [
        { category: 'asc' },
        { name: 'asc' }
      ]
    });
  }
}

/**
 * WAITER ACCESS PATTERNS
 * Waiters should only see data for their restaurant and assigned users
 */
class WaiterDataService {

  // Get orders for waiter's assigned users within their restaurant
  static async getWaiterOrders(waiterId) {
    return await prisma.order.findMany({
      where: {
        user: {
          waiterId: waiterId, // Only orders from users assigned to this waiter
          waiter: {
            restaurantId: { // Ensure it's within the waiter's restaurant
              equals: await this.getWaiterRestaurantId(waiterId)
            }
          }
        }
      },
      include: {
        user: {
          select: {
            sessionId: true,
            tableNumber: true,
            name: true
          }
        },
        orderItems: {
          include: {
            menuItem: {
              select: {
                name: true,
                price: true,
                category: true
              }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  // Get requests for waiter's assigned users within their restaurant
  static async getWaiterRequests(waiterId) {
    return await prisma.request.findMany({
      where: {
        user: {
          waiterId: waiterId, // Only requests from users assigned to this waiter
          waiter: {
            restaurantId: { // Ensure it's within the waiter's restaurant
              equals: await this.getWaiterRestaurantId(waiterId)
            }
          }
        }
      },
      include: {
        user: {
          select: {
            sessionId: true,
            tableNumber: true,
            name: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  // Get all active sessions in waiter's restaurant (for assignment)
  static async getRestaurantSessions(waiterId) {
    const restaurantId = await this.getWaiterRestaurantId(waiterId);
    
    return await prisma.user.findMany({
      where: {
        restaurantId: restaurantId // Only sessions in the waiter's restaurant
      },
      include: {
        waiter: {
          select: {
            name: true,
            surname: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  // Get restaurant menu items for waiter's restaurant
  static async getRestaurantMenu(waiterId) {
    const restaurantId = await this.getWaiterRestaurantId(waiterId);
    
    return await prisma.menuItem.findMany({
      where: {
        restaurantId: restaurantId, // Only menu items for waiter's restaurant
        status: 'Active'
      },
      orderBy: [
        { category: 'asc' },
        { name: 'asc' }
      ]
    });
  }

  // Helper method to get waiter's restaurant ID
  static async getWaiterRestaurantId(waiterId) {
    const waiter = await prisma.waiter.findUnique({
      where: { id: waiterId },
      select: { restaurantId: true }
    });
    return waiter?.restaurantId;
  }
}

/**
 * TENANT/ADMIN ACCESS PATTERNS
 * Tenants should only see data for their own restaurants
 */
class TenantDataService {

  // Get all restaurants owned by tenant
  static async getTenantRestaurants(tenantId) {
    return await prisma.restaurant.findMany({
      where: {
        tenantId: tenantId // Only restaurants owned by this tenant
      },
      include: {
        _count: {
          select: {
            waiters: true,
            users: true,
            menuItems: true,
            closedSessions: true
          }
        }
      },
      orderBy: { name: 'asc' }
    });
  }

  // Get all waiters across tenant's restaurants
  static async getTenantWaiters(tenantId) {
    return await prisma.waiter.findMany({
      where: {
        restaurant: {
          tenantId: tenantId // Only waiters in tenant's restaurants
        }
      },
      include: {
        restaurant: {
          select: {
            name: true,
            location: true
          }
        },
        _count: {
          select: {
            users: true // Count of assigned users
          }
        }
      },
      orderBy: [
        { restaurant: { name: 'asc' } },
        { name: 'asc' }
      ]
    });
  }

  // Get aggregated analytics for tenant's restaurants
  static async getTenantAnalytics(tenantId) {
    const restaurants = await prisma.restaurant.findMany({
      where: {
        tenantId: tenantId
      },
      include: {
        _count: {
          select: {
            waiters: true,
            users: true,
            menuItems: true,
            closedSessions: true
          }
        }
      }
    });

    // Aggregate data across all tenant's restaurants
    const analytics = restaurants.reduce((acc, restaurant) => {
      acc.totalWaiters += restaurant._count.waiters;
      acc.totalActiveSessions += restaurant._count.users;
      acc.totalMenuItems += restaurant._count.menuItems;
      acc.totalClosedSessions += restaurant._count.closedSessions;
      acc.restaurants.push({
        name: restaurant.name,
        location: restaurant.location,
        ...restaurant._count
      });
      return acc;
    }, {
      totalWaiters: 0,
      totalActiveSessions: 0,
      totalMenuItems: 0,
      totalClosedSessions: 0,
      restaurants: []
    });

    return analytics;
  }

  // Get orders across all tenant's restaurants
  static async getTenantOrders(tenantId, filters = {}) {
    return await prisma.order.findMany({
      where: {
        user: {
          restaurant: {
            tenantId: tenantId // Only orders from tenant's restaurants
          }
        },
        ...filters // Additional filters like date range, status, etc.
      },
      include: {
        user: {
          select: {
            sessionId: true,
            tableNumber: true,
            restaurant: {
              select: {
                name: true,
                location: true
              }
            }
          }
        },
        orderItems: {
          include: {
            menuItem: {
              select: {
                name: true,
                price: true,
                category: true
              }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  // Get menu items for a specific restaurant (tenant must own it)
  static async getRestaurantMenu(tenantId, restaurantId) {
    // First verify the restaurant belongs to the tenant
    const restaurant = await prisma.restaurant.findFirst({
      where: {
        id: restaurantId,
        tenantId: tenantId // Security check
      }
    });

    if (!restaurant) {
      throw new Error('Restaurant not found or access denied');
    }

    return await prisma.menuItem.findMany({
      where: {
        restaurantId: restaurantId
      },
      orderBy: [
        { category: 'asc' },
        { name: 'asc' }
      ]
    });
  }
}

/**
 * SECURITY MIDDLEWARE EXAMPLES
 * These would be used in your API routes to enforce access control
 */
class SecurityMiddleware {

  // Middleware to ensure user can only access their own data
  static async validateUserAccess(sessionId, resourceSessionId) {
    if (sessionId !== resourceSessionId) {
      throw new Error('Access denied: Can only access your own data');
    }
    return true;
  }

  // Middleware to ensure waiter can only access data from their restaurant
  static async validateWaiterAccess(waiterId, resourceUserId) {
    const waiter = await prisma.waiter.findUnique({
      where: { id: waiterId },
      select: { restaurantId: true }
    });

    const user = await prisma.user.findUnique({
      where: { id: resourceUserId },
      select: { restaurantId: true }
    });

    if (waiter?.restaurantId !== user?.restaurantId) {
      throw new Error('Access denied: Resource not in your restaurant');
    }
    return true;
  }

  // Middleware to ensure tenant can only access their own restaurants
  static async validateTenantAccess(tenantId, restaurantId) {
    const restaurant = await prisma.restaurant.findUnique({
      where: { id: restaurantId },
      select: { tenantId: true }
    });

    if (restaurant?.tenantId !== tenantId) {
      throw new Error('Access denied: Restaurant not owned by your tenant');
    }
    return true;
  }
}

// Demo function showing these patterns in action
async function demonstrateAccessPatterns() {
  console.log('🔒 DATA ACCESS CONTROL IMPLEMENTATION DEMO\n');

  try {
    // 1. User Access Example
    console.log('📱 USER ACCESS EXAMPLE');
    const users = await prisma.user.findMany({ take: 1 });
    if (users.length > 0) {
      const userOrders = await UserDataService.getUserOrders(users[0].sessionId);
      const userRequests = await UserDataService.getUserRequests(users[0].sessionId);
      const userMenu = await UserDataService.getRestaurantMenu(users[0].sessionId);
      
      console.log(`User ${users[0].sessionId.slice(-8)}: ${userOrders.length} orders, ${userRequests.length} requests`);
      console.log(`Available menu items: ${userMenu.length}`);
    }

    // 2. Waiter Access Example
    console.log('\n👨‍💼 WAITER ACCESS EXAMPLE');
    const waiters = await prisma.waiter.findFirst({ 
      where: { users: { some: {} } }
    });
    if (waiters) {
      const waiterOrders = await WaiterDataService.getWaiterOrders(waiters.id);
      const waiterRequests = await WaiterDataService.getWaiterRequests(waiters.id);
      const restaurantSessions = await WaiterDataService.getRestaurantSessions(waiters.id);
      
      console.log(`Waiter ${waiters.name}: ${waiterOrders.length} orders, ${waiterRequests.length} requests`);
      console.log(`Restaurant sessions: ${restaurantSessions.length}`);
    }

    // 3. Tenant Access Example
    console.log('\n🏛️  TENANT ACCESS EXAMPLE');
    const tenants = await prisma.tenant.findMany({ take: 1 });
    if (tenants.length > 0) {
      const tenantRestaurants = await TenantDataService.getTenantRestaurants(tenants[0].id);
      const tenantWaiters = await TenantDataService.getTenantWaiters(tenants[0].id);
      const analytics = await TenantDataService.getTenantAnalytics(tenants[0].id);
      
      console.log(`Tenant ${tenants[0].name}: ${tenantRestaurants.length} restaurants`);
      console.log(`Total waiters: ${analytics.totalWaiters}, Active sessions: ${analytics.totalActiveSessions}`);
    }

  } catch (error) {
    console.error('Demo error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Export the service classes for use in your application
module.exports = {
  UserDataService,
  WaiterDataService,
  TenantDataService,
  SecurityMiddleware
};

// Run demo if called directly
if (require.main === module) {
  demonstrateAccessPatterns()
    .then(() => {
      console.log('\n✅ Access control implementation demo completed!');
      console.log('\n📋 KEY TAKEAWAYS:');
      console.log('1. Always filter by restaurantId for restaurant-scoped data');
      console.log('2. Use sessionId for user-specific data isolation');
      console.log('3. Filter by tenantId for tenant-level access control');
      console.log('4. Implement security middleware to validate access');
      console.log('5. Use joins to enforce relationship-based access control');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Demo failed:', error);
      process.exit(1);
    });
}
