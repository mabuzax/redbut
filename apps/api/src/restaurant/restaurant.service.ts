import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { Restaurant, RestaurantSubscription, Prisma } from '@prisma/client';

export interface CreateRestaurantDto {
  name: string;
  phone?: string;
  email?: string;
  location?: string;
  address?: string;
  tenantId: string;
}

export interface UpdateRestaurantDto {
  name?: string;
  phone?: string;
  email?: string;
  location?: string;
  address?: string;
  status?: string;
}

export interface ActivateRestaurantDto {
  restaurantId: string;
  months: number;
}

type RestaurantWithSubscription = Prisma.RestaurantGetPayload<{
  include: { subscription: true }
}>;

@Injectable()
export class RestaurantService {
  constructor(private prisma: PrismaService) {}

  /**
   * Get all restaurants with their subscription status for a specific tenant
   * Automatically updates status based on subscription expiry
   */
  async getAllRestaurants(tenantId: string): Promise<RestaurantWithSubscription[]> {
    const restaurants = await this.prisma.restaurant.findMany({
      where: {
        tenantId: tenantId, // Filter by tenant for data isolation
      },
      include: {
        subscription: true,
      },
      orderBy: [
        { status: 'desc' }, // Active first
        { name: 'asc' },    // Then by name
      ],
    });

    // Update status based on subscription expiry
    const updatedRestaurants = await Promise.all(
      restaurants.map(async (restaurant) => {
        const effectiveStatus = this.getEffectiveStatus(restaurant);
        
        // Update database if status has changed
        if (restaurant.status !== effectiveStatus) {
          await this.prisma.restaurant.update({
            where: { id: restaurant.id },
            data: { status: effectiveStatus },
          });
          restaurant.status = effectiveStatus;
        }
        
        return restaurant;
      })
    );

    return updatedRestaurants;
  }

  /**
   * Get a single restaurant by ID with subscription details
   * Ensures the restaurant belongs to the specified tenant
   */
  async getRestaurantById(id: string, tenantId: string): Promise<RestaurantWithSubscription> {
    const restaurant = await this.prisma.restaurant.findUnique({
      where: { 
        id,
        tenantId // Ensure restaurant belongs to the tenant
      },
      include: {
        subscription: true,
      },
    });

    if (!restaurant) {
      throw new NotFoundException(`Restaurant with ID ${id} not found or does not belong to your tenant`);
    }

    // Update status based on subscription expiry
    const effectiveStatus = this.getEffectiveStatus(restaurant);
    if (restaurant.status !== effectiveStatus) {
      await this.prisma.restaurant.update({
        where: { id },
        data: { status: effectiveStatus },
      });
      restaurant.status = effectiveStatus;
    }

    return restaurant;
  }

  /**
   * Create a new restaurant with inactive status and expired subscription
   */
  async createRestaurant(createRestaurantDto: CreateRestaurantDto): Promise<Restaurant> {
    return await this.prisma.$transaction(async (prisma) => {
      // Create restaurant with Inactive status
      const restaurant = await prisma.restaurant.create({
        data: {
          ...createRestaurantDto,
          status: 'Inactive',
        },
      });

      // Create subscription record with today's date (making it immediately expired)
      await prisma.restaurantSubscription.create({
        data: {
          restaurantId: restaurant.id,
          activeUntil: new Date(), // Today's date = expired
        },
      });

      return restaurant;
    });
  }

  /**
   * Update restaurant details (with tenant verification)
   */
  async updateRestaurant(id: string, tenantId: string, updateRestaurantDto: UpdateRestaurantDto): Promise<Restaurant> {
    const existingRestaurant = await this.prisma.restaurant.findUnique({
      where: { 
        id,
        tenantId // Ensure restaurant belongs to the tenant
      },
    });

    if (!existingRestaurant) {
      throw new NotFoundException(`Restaurant with ID ${id} not found or does not belong to your tenant`);
    }

    return await this.prisma.restaurant.update({
      where: { id },
      data: updateRestaurantDto,
    });
  }

  /**
   * Activate restaurant by updating subscription (with tenant verification)
   */
  async activateRestaurant(activateDto: ActivateRestaurantDto, tenantId: string): Promise<RestaurantSubscription> {
    const { restaurantId, months } = activateDto;

    // Verify restaurant exists and belongs to the tenant
    const restaurant = await this.prisma.restaurant.findUnique({
      where: { 
        id: restaurantId,
        tenantId // Ensure restaurant belongs to the tenant
      },
      include: { subscription: true },
    });

    if (!restaurant) {
      throw new NotFoundException(`Restaurant with ID ${restaurantId} not found or does not belong to your tenant`);
    }

    // Calculate new expiry date
    const now = new Date();
    const newExpiryDate = new Date(now);
    newExpiryDate.setMonth(newExpiryDate.getMonth() + months);

    // Update or create subscription
    const subscription = await this.prisma.restaurantSubscription.upsert({
      where: { restaurantId },
      update: {
        activeUntil: newExpiryDate,
      },
      create: {
        restaurantId,
        activeUntil: newExpiryDate,
      },
    });

    // Update restaurant status to Active
    await this.prisma.restaurant.update({
      where: { id: restaurantId },
      data: { status: 'Active' },
    });

    return subscription;
  }

  /**
   * Soft delete restaurant (set status to Inactive)
   */
  async deactivateRestaurant(id: string): Promise<Restaurant> {
    const restaurant = await this.prisma.restaurant.findUnique({
      where: { id },
    });

    if (!restaurant) {
      throw new NotFoundException(`Restaurant with ID ${id} not found`);
    }

    return await this.prisma.restaurant.update({
      where: { id },
      data: { status: 'Inactive' },
    });
  }

  /**
   * Get subscription details for a restaurant
   */
  async getRestaurantSubscription(restaurantId: string): Promise<RestaurantSubscription | null> {
    return await this.prisma.restaurantSubscription.findUnique({
      where: { restaurantId },
    });
  }

  /**
   * Get restaurants that are expiring soon (within 7 days)
   */
  async getExpiringSoon(): Promise<RestaurantWithSubscription[]> {
    const sevenDaysFromNow = new Date();
    sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);

    return await this.prisma.restaurant.findMany({
      where: {
        status: 'Active',
        subscription: {
          activeUntil: {
            lte: sevenDaysFromNow,
            gt: new Date(), // Not yet expired
          },
        },
      },
      include: {
        subscription: true,
      },
    }) as RestaurantWithSubscription[];
  }

  /**
   * Private helper to determine effective status based on subscription
   */
  private getEffectiveStatus(restaurant: RestaurantWithSubscription): string {
    if (!restaurant.subscription) {
      return 'Inactive';
    }

    const now = new Date();
    const isExpired = new Date(restaurant.subscription.activeUntil) <= now;
    
    return isExpired ? 'Inactive' : 'Active';
  }

  /**
   * Check if subscription is active
   */
  private isSubscriptionActive(subscription?: RestaurantSubscription | null): boolean {
    if (!subscription) return false;
    return new Date(subscription.activeUntil) > new Date();
  }
}
