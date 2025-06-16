import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { UserType, Waiter, Prisma } from '@prisma/client';
import {
  CreateStaffMemberDto,
  UpdateStaffMemberDto,
} from './admin-staff.dto';
import {
  StaffPosition,
  DEFAULT_STAFF_PASSWORD,
  StaffMemberWithAccessInfo,
} from './admin-staff.types';

@Injectable()
export class AdminStaffService {
  private readonly logger = new Logger(AdminStaffService.name);

  constructor(private prisma: PrismaService) {}

  private mapPositionToUserType(position: StaffPosition): UserType {
    switch (position) {
      case 'Manager':
        return UserType.manager;
      case 'Waiter':
      case 'Chef':
      case 'Supervisor':
      default:
        return UserType.waiter; // Defaulting Chef/Supervisor to Waiter UserType for now
    }
  }

  async getAllStaffMembers(): Promise<StaffMemberWithAccessInfo[]> {
    this.logger.log('Fetching all staff members');
    const waiters = await this.prisma.waiter.findMany({
      include: {
        accessAccount: {
          select: {
            username: true,
            userType: true,
            // No 'position' field on AccessUser, so we derive it or use Waiter's if it exists
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return waiters.map(w => {
      let displayPosition = (w as any).position; // Assuming Waiter model might have a 'position' field
      if (!displayPosition && w.accessAccount) {
        // Fallback to UserType if direct position field is not on Waiter model
        if (w.accessAccount.userType === UserType.manager) displayPosition = 'Manager';
        else if (w.accessAccount.userType === UserType.admin) displayPosition = 'Admin'; // Should not happen for staff usually
        else displayPosition = 'Waiter'; // Default for UserType.waiter
      }
      return {
        ...w,
        position: displayPosition || 'N/A',
      };
    });
  }

  async getStaffMemberById(id: string): Promise<StaffMemberWithAccessInfo> {
    this.logger.log(`Fetching staff member with ID: ${id}`);
    const waiter = await this.prisma.waiter.findUnique({
      where: { id },
      include: {
        accessAccount: {
          select: {
            username: true,
            userType: true,
          },
        },
      },
    });

    if (!waiter) {
      throw new NotFoundException(`Staff member with ID ${id} not found`);
    }
    
    let displayPosition = (waiter as any).position;
    if (!displayPosition && waiter.accessAccount) {
      if (waiter.accessAccount.userType === UserType.manager) displayPosition = 'Manager';
      else if (waiter.accessAccount.userType === UserType.admin) displayPosition = 'Admin';
      else displayPosition = 'Waiter';
    }

    return { ...waiter, position: displayPosition || 'N/A' };
  }

  async createStaffMember(dto: CreateStaffMemberDto): Promise<Waiter> {
    this.logger.log(`Creating new staff member: ${dto.email}`);

    const existingWaiterByEmail = await this.prisma.waiter.findUnique({ where: { email: dto.email } });
    if (existingWaiterByEmail) {
      throw new ConflictException(`Waiter with email ${dto.email} already exists.`);
    }
    if (dto.phone) {
      const existingWaiterByPhone = await this.prisma.waiter.findUnique({ where: { phone: dto.phone } });
      if (existingWaiterByPhone) {
        throw new ConflictException(`Waiter with phone ${dto.phone} already exists.`);
      }
    }
    const existingAccessUser = await this.prisma.accessUser.findUnique({ where: { username: dto.email } });
    if (existingAccessUser) {
      throw new ConflictException(`Access account with username ${dto.email} already exists.`);
    }

    const userType = this.mapPositionToUserType(dto.position);

    try {
      return await this.prisma.$transaction(async (tx) => {
        const waiterData: Prisma.WaiterCreateInput = {
          name: dto.name,
          surname: dto.surname,
          email: dto.email,
          tag_nickname: dto.tag_nickname,
          address: dto.address,
          phone: dto.phone,
          propic: dto.propic,
          // position: dto.position, // If Waiter model gets a 'position: StaffPosition' field
        };
        
        // If your Prisma schema for Waiter has a 'position' field of type StaffPosition
        // you can add it here: (waiterData as any).position = dto.position;
        // For now, 'position' from DTO primarily influences UserType for AccessUser

        const newWaiter = await tx.waiter.create({ data: waiterData });

        await tx.accessUser.create({
          data: {
            userId: newWaiter.id,
            username: dto.email,
            password: dto.password || DEFAULT_STAFF_PASSWORD, // Hashing should happen here or in a pre-save hook if using an ORM that supports it. Prisma needs explicit hashing.
            userType: userType,
          },
        });
        return newWaiter;
      });
    } catch (error) {
      this.logger.error(`Failed to create staff member: ${dto.email}`, error.stack);
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          throw new ConflictException(`A staff member with similar unique details (email, phone, or username) already exists.`);
        }
      }
      throw new BadRequestException(`Could not create staff member. ${error.message}`);
    }
  }

  async updateStaffMember(id: string, dto: UpdateStaffMemberDto): Promise<Waiter> {
    this.logger.log(`Updating staff member with ID: ${id}`);
    const existingWaiterRecord = await this.prisma.waiter.findUnique({ where: {id}, include: {accessAccount: true}});
    if (!existingWaiterRecord) {
        throw new NotFoundException(`Staff member with ID ${id} not found`);
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
      // position: dto.position, // If Waiter model gets a 'position: StaffPosition' field
    };
     // If your Prisma schema for Waiter has a 'position' field of type StaffPosition
     // you can add it here: (waiterUpdateData as any).position = dto.position;

    let accessUserUpdateData: Prisma.AccessUserUpdateInput | undefined;
    if (dto.position) {
      const newUserType = this.mapPositionToUserType(dto.position);
      if (existingWaiterRecord.accessAccount?.userType !== newUserType) {
        accessUserUpdateData = { userType: newUserType };
      }
    }

    try {
      return await this.prisma.$transaction(async (tx) => {
        const updatedWaiter = await tx.waiter.update({
          where: { id },
          data: waiterUpdateData,
        });

        if (accessUserUpdateData && existingWaiterRecord.accessAccount) { // Check if accessAccount exists
          await tx.accessUser.update({
            where: { userId: id },
            data: accessUserUpdateData,
          });
        } else if (accessUserUpdateData && !existingWaiterRecord.accessAccount) {
            this.logger.warn(`Access account for staff ID ${id} not found during update, cannot update role.`);
        }
        return updatedWaiter;
      });
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
        await tx.waiterRating.deleteMany({ where: { waiterId: id } });
        // Add deletion for other related entities if necessary

        await tx.waiter.delete({
          where: { id },
        });
      });
    } catch (error) {
      this.logger.error(`Failed to delete staff member: ${id}`, error.stack);
      // Handle specific Prisma errors if needed, e.g., foreign key constraints not handled by cascading deletes
      throw new BadRequestException(`Could not delete staff member. ${error.message}`);
    }
  }
}
