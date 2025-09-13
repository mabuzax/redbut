import { Injectable, ConflictException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { UserType } from '@prisma/client';

@Injectable()
export class AdminService {
  constructor(private prisma: PrismaService) {}

  /**
   * Get restaurant metrics for admin dashboard
   * Includes table occupancy, request counts, revenue, etc.
   */
  async getRestaurantMetrics() {
    // Get total tables (hardcoded for now, could come from a tables table)
    const totalTables = 24;

    // Count occupied tables (tables with active users)
    const occupiedTableRecords = await this.prisma.user.findMany({
      where: {
        // A valid table number is any positive integer (> 0)
        tableNumber: { gt: 0 },
        // Consider adding a lastActive field to filter out inactive sessions
      },
      distinct: ['tableNumber'],
      select: { tableNumber: true },
    });
    const occupiedTables = occupiedTableRecords.length;

    // Count total and open requests
    const totalRequests = await this.prisma.request.count();
    const openRequests = await this.prisma.request.count({
      where: {
        status: {
          notIn: ['Completed', 'Cancelled', 'Done'],
        },
      },
    });

    // Calculate average response time (in minutes)
    const requests = await this.prisma.request.findMany({
      where: {
        status: 'Completed',
        updatedAt: {
          // Only consider requests from the last 24 hours
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000),
        },
      },
      select: {
        createdAt: true,
        updatedAt: true,
      },
    });

    let averageResponseTime = 0;
    if (requests.length > 0) {
      const totalResponseTime = requests.reduce((sum, req) => {
        const responseTime = req.updatedAt.getTime() - req.createdAt.getTime();
        return sum + responseTime / (1000 * 60); // Convert to minutes
      }, 0);
      averageResponseTime = totalResponseTime / requests.length;
    }

    // Calculate daily revenue (mock data for now)
    // In a real implementation, this would come from orders table
    const dailyRevenue = 8750.50;

    return {
      totalTables,
      occupiedTables,
      totalRequests,
      openRequests,
      averageResponseTime,
      dailyRevenue,
    };
  }

  /**
   * Get all staff members (waiters)
   */
  async getStaffMembers() {
    /**
     * Waiter information is stored on the `waiter` table, while the
     * login credentials / role live on the `access_users` table
     * (one-to-one:  waiter.id == access_users.userId).
     *
     * To fetch staff for the admin dashboard we query the waiter table
     * and join the accessAccount relation so we can grab the username
     * (and ensure the role is indeed `waiter`).
     */
    const staffMembers = await this.prisma.waiter.findMany({
      where: {
        accessAccount: {
          userType: UserType.waiter,
        },
      },
      select: {
        id: true,
        name: true,
        surname: true,
        tag_nickname: true,
        propic: true,
        accessAccount: {
          select: {
            username: true,
          },
        },
      },
    });

    // Enhance with additional metrics
    const enhancedStaff = await Promise.all(
      staffMembers.map(async (member) => {
        // Count handled requests
        const requestsHandled = await this.prisma.request.count({
          where: {
            // Legacy schema – no waiterId field on Request.
            // When waiterId is introduced, switch to `waiterId: member.id`.
            status: 'Completed',
          },
        });

        // Get average rating from service analysis
        const serviceAnalyses = await this.prisma.serviceAnalysis.findMany({
          where: {
            waiterId: member.id,
          },
          select: {
            rating: true,
          },
        });

        let averageRating = 0;
        if (serviceAnalyses.length > 0) {
          const totalRating = serviceAnalyses.reduce((sum: number, analysis: any) => {
            return sum + analysis.rating;
          }, 0);
          averageRating = totalRating / serviceAnalyses.length;
        }

        return {
          id: member.id,
          username: member.accessAccount?.username || '',
          name: member.name,
          surname: member.surname,
          tag_nickname: member.tag_nickname,
          userType: UserType.waiter,
          propic: member.propic,
          requestsHandled,
          averageRating: averageRating.toFixed(1),
        };
      })
    );

    return enhancedStaff;
  }

  /**
   * Get restaurant overview data
   * Includes general stats about the restaurant
   */
  async getRestaurantOverview() {
    // Total customers served (unique users)
    const totalCustomers = await this.prisma.user.count();

    // Total orders
    const totalOrders = await this.prisma.order.count();

    // Total revenue (mock data for now)
    const totalRevenue = 125000;

    // Average satisfaction (from service analysis)
    const serviceAnalyses = await this.prisma.serviceAnalysis.findMany({
      select: {
        rating: true,
      },
    });

    let averageSatisfaction = 0;
    if (serviceAnalyses.length > 0) {
      const totalRating = serviceAnalyses.reduce((sum: number, analysis: any) => {
        return sum + analysis.rating;
      }, 0);
      averageSatisfaction = totalRating / serviceAnalyses.length;
    }

    // Popular menu items (mock data for now)
    const popularItems = [
      { name: 'Burger Deluxe', count: 156 },
      { name: 'Fries', count: 143 },
      { name: 'Chicken Wings', count: 98 },
      { name: 'Salad', count: 76 },
      { name: 'Ice Cream', count: 65 },
    ];

    return {
      totalCustomers,
      totalOrders,
      totalRevenue,
      averageSatisfaction,
      popularItems,
    };
  }

  /**
   * Register a new tenant with initial restaurant
   */
  async registerTenant(registerTenantDto: {
    tenant: {
      name: string;
      email: string;
      phone?: string;
      address?: string;
      status: string;
    };
    restaurant: {
      name: string;
      phone?: string;
      email?: string;
      location: string;
      address?: string;
      status: string;
    };
  }) {
    try {
      // Validate required fields
      if (!registerTenantDto.tenant?.name || !registerTenantDto.tenant?.email) {
        throw new BadRequestException('Tenant name and email are required');
      }

      if (!registerTenantDto.restaurant?.name || !registerTenantDto.restaurant?.location) {
        throw new BadRequestException('Restaurant name and location are required');
      }

      // Check if tenant with this email already exists
      const existingTenant = await this.prisma.tenant.findFirst({
        where: {
          email: registerTenantDto.tenant.email,
        },
      });

      if (existingTenant) {
        throw new ConflictException('A tenant with this email already exists');
      }

      // Create tenant and restaurant in a transaction
      const result = await this.prisma.$transaction(async (prisma) => {
        // Create tenant
        const tenant = await prisma.tenant.create({
          data: {
            name: registerTenantDto.tenant.name,
            email: registerTenantDto.tenant.email,
            phone: registerTenantDto.tenant.phone || null,
            address: registerTenantDto.tenant.address || null,
            status: registerTenantDto.tenant.status || 'Active',
          },
        });

        // Create restaurant
        const restaurant = await prisma.restaurant.create({
          data: {
            tenantId: tenant.id,
            name: registerTenantDto.restaurant.name,
            phone: registerTenantDto.restaurant.phone || null,
            email: registerTenantDto.restaurant.email || null,
            location: registerTenantDto.restaurant.location,
            address: registerTenantDto.restaurant.address || null,
            status: registerTenantDto.restaurant.status || 'Inactive',
          },
        });

        return { tenant, restaurant };
      });

      return {
        tenant: {
          id: result.tenant.id,
          name: result.tenant.name,
          email: result.tenant.email,
          status: result.tenant.status,
        },
        restaurant: {
          id: result.restaurant.id,
          name: result.restaurant.name,
          location: result.restaurant.location,
          status: result.restaurant.status,
        },
        message: 'Tenant and restaurant registered successfully! You can now login with your email address.',
      };
    } catch (error) {
      if (error instanceof ConflictException || error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('Failed to register tenant: ' + error.message);
    }
  }
}
