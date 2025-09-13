import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { CacheInvalidatorService } from '../common/cache-invalidator.service';
import { UserType, Waiter, Prisma } from '@prisma/client';
import {
  CreateStaffMemberDto,
  UpdateStaffMemberDto,
} from './admin-staff.dto';
import {
  StaffPosition,
  DEFAULT_STAFF_PASSWORD,
  StaffMemberWithAccessInfo,
  WaiterStatus,
} from './admin-staff.types';

@Injectable()
export class AdminStaffService {
  private readonly logger = new Logger(AdminStaffService.name);

  constructor(
    private prisma: PrismaService,
    private cacheInvalidator: CacheInvalidatorService,
  ) {}

  private mapPositionToUserType(position: StaffPosition): UserType {
    switch (position) {
      case 'Admin':
        return UserType.admin;
      case 'Waiter':
      default:
        return UserType.waiter;
    }
  }

  async getAllStaffMembers(restaurantId?: string): Promise<StaffMemberWithAccessInfo[]> {
    this.logger.log(`Fetching staff members${restaurantId ? ` for restaurant ${restaurantId}` : ''}`);
    
    const whereClause: any = {};
    if (restaurantId) {
      whereClause.restaurantId = restaurantId;
    }
    
    this.logger.log(`Query whereClause: ${JSON.stringify(whereClause)}`);
    
    const waiters = await this.prisma.waiter.findMany({
      where: whereClause,
      include: {
        accessAccount: {
          select: {
            username: true,
          },
        },
      },
      orderBy: [
        {
          status: 'asc', // Active comes before Inactive alphabetically
        },
        {
          name: 'asc',
        },
      ],
    });

    this.logger.log(`Found ${waiters.length} waiters: ${waiters.map(w => `${w.name} ${w.surname} (restaurantId: ${w.restaurantId})`).join(', ')}`);

    // Map waiters to include position based on userType from waiter record
    const staffMembersWithPosition = waiters.map(waiter => {
      let displayPosition = (waiter as any).position;
      if (!displayPosition) {
        if (waiter.userType === UserType.admin) displayPosition = 'Admin';
        else displayPosition = 'Waiter';
      }
      return { ...waiter, position: displayPosition || 'N/A' };
    });

    return staffMembersWithPosition;
  }

  async getStaffMemberById(id: string): Promise<StaffMemberWithAccessInfo> {
    this.logger.log(`Fetching staff member with ID: ${id}`);
    const waiter = await this.prisma.waiter.findUnique({
      where: { id },
      include: {
        accessAccount: {
          select: {
            username: true,
          },
        },
      },
    });

    if (!waiter) {
      throw new NotFoundException(`Staff member with ID ${id} not found`);
    }
    
    let displayPosition = (waiter as any).position;
    if (!displayPosition) {
      if (waiter.userType === UserType.manager) displayPosition = 'Manager';
      else if (waiter.userType === UserType.admin) displayPosition = 'Admin';
      else displayPosition = 'Waiter';
    }

    return { ...waiter, position: displayPosition || 'N/A' };
  }

  async createStaffMember(dto: CreateStaffMemberDto): Promise<Waiter> {
    this.logger.log(`Creating new staff member: ${dto.name} ${dto.surname} (${dto.position})`);
    this.logger.log(`Restaurant ID: ${dto.restaurantId}`);

    // Validate that either email or phone is provided
    if (!dto.email && !dto.phone) {
      throw new BadRequestException('Either email or phone number must be provided');
    }

    // Check if email already exists (if provided)
    if (dto.email) {
      const existingByEmail = await this.prisma.waiter.findFirst({
        where: { email: dto.email },
      });
      if (existingByEmail) {
        throw new BadRequestException('A staff member with this email already exists');
      }
    }

    // Check if phone already exists (if provided)
    if (dto.phone) {
      const existingByPhone = await this.prisma.waiter.findFirst({
        where: { phone: dto.phone },
      });
      if (existingByPhone) {
        throw new BadRequestException('A staff member with this phone number already exists');
      }
    }

    const userType = this.mapPositionToUserType(dto.position);

    try {
      const waiterData: Prisma.WaiterCreateInput = {
        name: dto.name,
        surname: dto.surname,
        email: dto.email || null,
        tag_nickname: dto.tag_nickname,
        address: dto.address,
        phone: dto.phone,
        propic: dto.propic,
        userType: userType, // Store userType directly in waiter record
        status: WaiterStatus.Active, // Default status to Active
        restaurant: {
          connect: { id: dto.restaurantId }
        },
      };

      const newWaiter = await this.prisma.waiter.create({ data: waiterData });

      // Invalidate waiters cache
      await this.cacheInvalidator.invalidateWaiters();

      // Calculate and add position field based on userType
      let displayPosition = (newWaiter as any).position;
      if (!displayPosition) {
        if (newWaiter.userType === UserType.manager) displayPosition = 'Manager';
        else if (newWaiter.userType === UserType.admin) displayPosition = 'Admin';
        else displayPosition = 'Waiter';
      }

      this.logger.log(`Staff member created successfully: ${newWaiter.id} for restaurant: ${newWaiter.restaurantId}`);
      return { ...newWaiter, position: displayPosition } as any;
    } catch (error) {
      this.logger.error(`Failed to create staff member: ${error.message}`);
      throw error;
    }
  }

  async updateStaffMember(id: string, dto: UpdateStaffMemberDto): Promise<Waiter> {
    this.logger.log(`Updating staff member with ID: ${id}`);
    this.logger.log(`Update data: ${JSON.stringify(dto)}`);
    
    const existingWaiterRecord = await this.prisma.waiter.findUnique({ where: {id}, include: {accessAccount: true}});
    if (!existingWaiterRecord) {
        throw new NotFoundException(`Staff member with ID ${id} not found`);
    }

    this.logger.log(`Existing waiter has access account: ${!!existingWaiterRecord.accessAccount}`);
    if (existingWaiterRecord.accessAccount) {
      this.logger.log(`Current userType: ${existingWaiterRecord.accessAccount.userType}`);
    }

    if (dto.phone && dto.phone !== existingWaiterRecord.phone) {
      const conflictingWaiter = await this.prisma.waiter.findUnique({ where: { phone: dto.phone } });
      if (conflictingWaiter && conflictingWaiter.id !== id) {
        throw new ConflictException(`Waiter with phone ${dto.phone} already exists.`);
      }
    }
    
    const waiterUpdateData: Prisma.WaiterUpdateInput = {
      name: dto.name,
      surname: dto.surname,
      tag_nickname: dto.tag_nickname,
      address: dto.address,
      phone: dto.phone,
      propic: dto.propic,
    };

    // Update userType directly in waiter table if position is provided
    if (dto.position) {
      const newUserType = this.mapPositionToUserType(dto.position);
      this.logger.log(`Position changed to: ${dto.position}, mapping to userType: ${newUserType}`);
      this.logger.log(`UserType will be updated from ${existingWaiterRecord.userType} to ${newUserType}`);
      waiterUpdateData.userType = newUserType;
    }

    // Update status if provided
    if (dto.status) {
      this.logger.log(`Status changed to: ${dto.status}`);
      waiterUpdateData.status = dto.status;
    }

    try {
      const result = await this.prisma.$transaction(async (tx) => {
        const updatedWaiter = await tx.waiter.update({
          where: { id },
          data: waiterUpdateData,
          include: {
            accessAccount: {
              select: {
                username: true,
                userType: true,
              },
            },
          },
        });

        return updatedWaiter;
      });

      // Invalidate waiters cache
      await this.cacheInvalidator.invalidateWaiters();

      // Calculate and add position field based on userType
      let displayPosition = (result as any).position;
      if (!displayPosition) {
        if (result.userType === UserType.manager) displayPosition = 'Manager';
        else if (result.userType === UserType.admin) displayPosition = 'Admin';
        else displayPosition = 'Waiter';
      }

      return { ...result, position: displayPosition } as any;
    } catch (error) {
      this.logger.error(`Failed to update staff member: ${id}`, error.stack);
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException(`A staff member with similar unique details (phone) already exists.`);
      }
      throw new BadRequestException(`Could not update staff member. ${error.message}`);
    }
  }

  async deleteStaffMember(id: string): Promise<void> {
    this.logger.log(`Deleting staff member with ID: ${id}`);
    // Ensure waiter exists before attempting transaction
    const waiterExists = await this.prisma.waiter.findUnique({ where: { id } });
    if (!waiterExists) {
      throw new NotFoundException(`Staff member with ID ${id} not found.`);
    }

    try {
      await this.prisma.$transaction(async (tx) => {
        await tx.accessUser.delete({
          where: { userId: id },
        }).catch(err => {
          if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2025') { // Record to delete not found
            this.logger.warn(`No AccessUser found for Waiter ID ${id} during deletion, proceeding.`);
          } else {
            throw err;
          }
        });
        
        await tx.waiterMetric.deleteMany({ where: { waiterId: id } });
        await tx.serviceAnalysis.deleteMany({ where: { waiterId: id } });
        // Add deletion for other related entities if necessary

        await tx.waiter.delete({
          where: { id },
        });
      });

      // Invalidate both waiters and access_users caches
      await Promise.all([
        this.cacheInvalidator.invalidateWaiters(),
        this.cacheInvalidator.invalidateAccessUsers(),
      ]);
    } catch (error) {
      this.logger.error(`Failed to delete staff member: ${id}`, error.stack);
      // Handle specific Prisma errors if needed, e.g., foreign key constraints not handled by cascading deletes
      throw new BadRequestException(`Could not delete staff member. ${error.message}`);
    }
  }
}
