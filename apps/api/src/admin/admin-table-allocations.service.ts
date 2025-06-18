import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { CreateTableAllocationDto, UpdateTableAllocationDto } from './admin-table-allocations.dto';
import {
  TableAllocationWithDetails,
  ShiftInfoForAllocation,
  WaiterInfoForAllocation,
} from './admin-table-allocations.types';
import { Prisma } from '@prisma/client';

@Injectable()
export class AdminTableAllocationsService {
  private readonly logger = new Logger(AdminTableAllocationsService.name);

  constructor(private prisma: PrismaService) {}

  private mapPrismaAllocationToDetailed(
    prismaAllocation: Prisma.TableAllocationGetPayload<{
      include: {
        shift: true;
        waiter: { select: { id: true; name: true; surname: true; tag_nickname: true } };
      };
    }>,
  ): TableAllocationWithDetails {
    return {
      ...prismaAllocation,
      shift: prismaAllocation.shift
        ? {
            id: prismaAllocation.shift.id,
            date: prismaAllocation.shift.date,
            startTime: prismaAllocation.shift.startTime,
            endTime: prismaAllocation.shift.endTime,
          }
        : null,
      waiter: prismaAllocation.waiter
        ? {
            id: prismaAllocation.waiter.id,
            name: prismaAllocation.waiter.name,
            surname: prismaAllocation.waiter.surname,
            tag_nickname: prismaAllocation.waiter.tag_nickname,
          }
        : null,
    };
  }

  async getAllTableAllocations(): Promise<TableAllocationWithDetails[]> {
    this.logger.log('Fetching all table allocations from database');
    const allocations = await this.prisma.tableAllocation.findMany({
      include: {
        shift: true,
        waiter: { select: { id: true, name: true, surname: true, tag_nickname: true } },
      },
      orderBy: [
        { shift: { startTime: 'asc' } },
        { waiter: { tag_nickname: 'asc' } },
      ],
    });
    return allocations.map(this.mapPrismaAllocationToDetailed);
  }

  async getTableAllocationById(id: string): Promise<TableAllocationWithDetails> {
    this.logger.log(`Fetching table allocation with ID: ${id} from database`);
    const allocation = await this.prisma.tableAllocation.findUnique({
      where: { id },
      include: {
        shift: true,
        waiter: { select: { id: true, name: true, surname: true, tag_nickname: true } },
      },
    });
    if (!allocation) {
      throw new NotFoundException(`Table allocation with ID ${id} not found`);
    }
    return this.mapPrismaAllocationToDetailed(allocation);
  }

  async createTableAllocation(dto: CreateTableAllocationDto): Promise<TableAllocationWithDetails> {
    this.logger.log(`Creating new table allocation for shift ID: ${dto.shiftId}, waiter ID: ${dto.waiterId}`);

    const shift = await this.prisma.shift.findUnique({ where: { id: dto.shiftId } });
    if (!shift) {
      throw new BadRequestException(`Shift with ID ${dto.shiftId} not found.`);
    }

    const waiter = await this.prisma.waiter.findUnique({ where: { id: dto.waiterId } });
    if (!waiter) {
      throw new BadRequestException(`Waiter with ID ${dto.waiterId} not found.`);
    }

    const existingWaiterAllocation = await this.prisma.tableAllocation.findFirst({
      where: { shiftId: dto.shiftId, waiterId: dto.waiterId },
    });
    if (existingWaiterAllocation) {
      throw new ConflictException(
        `Waiter ${waiter.tag_nickname} already has an allocation for shift on ${new Date(shift.date).toLocaleDateString()}. Please update the existing allocation.`,
      );
    }

    const conflictingTableAllocations = await this.prisma.tableAllocation.findMany({
      where: {
        shiftId: dto.shiftId,
        waiterId: { not: dto.waiterId },
        tableNumbers: { hasSome: dto.tableNumbers },
      },
      include: { waiter: { select: { tag_nickname: true } } },
    });

    if (conflictingTableAllocations.length > 0) {
      const firstConflict = conflictingTableAllocations[0];
      const conflictingTable = firstConflict.tableNumbers.find(tNum => dto.tableNumbers.includes(tNum));
      throw new ConflictException(
        `Table ${conflictingTable} in shift on ${new Date(shift.date).toLocaleDateString()} is already assigned to waiter ${firstConflict.waiter?.tag_nickname || firstConflict.waiterId}.`,
      );
    }
    
    const uniqueSortedTableNumbers = [...new Set(dto.tableNumbers)].sort((a, b) => a - b);

    try {
      const newAllocationPrisma = await this.prisma.tableAllocation.create({
        data: {
          shiftId: dto.shiftId,
          tableNumbers: uniqueSortedTableNumbers,
          waiterId: dto.waiterId,
        },
        include: {
          shift: true,
          waiter: { select: { id: true, name: true, surname: true, tag_nickname: true } },
        },
      });
      this.logger.log(`Table allocation created with ID: ${newAllocationPrisma.id}`);
      return this.mapPrismaAllocationToDetailed(newAllocationPrisma);
    } catch (error) {
      this.logger.error(`Failed to create table allocation: ${error.message}`, error.stack);
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
         throw new ConflictException('A conflicting allocation already exists.');
      }
      throw new BadRequestException(`Could not create table allocation. ${error.message}`);
    }
  }

  async updateTableAllocation(id: string, dto: UpdateTableAllocationDto): Promise<TableAllocationWithDetails> {
    this.logger.log(`Updating table allocation with ID: ${id}`);
    
    const existingAllocation = await this.prisma.tableAllocation.findUnique({ where: { id } });
    if (!existingAllocation) {
      throw new NotFoundException(`Table allocation with ID ${id} not found, cannot update.`);
    }

    const targetShiftId = dto.shiftId || existingAllocation.shiftId;
    const targetWaiterId = dto.waiterId || existingAllocation.waiterId;
    const targetTableNumbers = dto.tableNumbers
      ? [...new Set(dto.tableNumbers)].sort((a, b) => a - b)
      : existingAllocation.tableNumbers;

    if (dto.shiftId && dto.shiftId !== existingAllocation.shiftId) {
      const shift = await this.prisma.shift.findUnique({ where: { id: dto.shiftId } });
      if (!shift) throw new BadRequestException(`New shift with ID ${dto.shiftId} not found.`);
    }
    
    if (dto.waiterId && dto.waiterId !== existingAllocation.waiterId) {
      const waiter = await this.prisma.waiter.findUnique({ where: { id: dto.waiterId } });
      if (!waiter) throw new BadRequestException(`New waiter with ID ${dto.waiterId} not found.`);
    }
    
    const shiftForConflictCheck = await this.prisma.shift.findUnique({where: {id: targetShiftId}});
    if(!shiftForConflictCheck) throw new BadRequestException(`Target shift with ID ${targetShiftId} not found.`);

    const waiterForConflictCheck = await this.prisma.waiter.findUnique({where: {id: targetWaiterId}});
     if(!waiterForConflictCheck) throw new BadRequestException(`Target waiter with ID ${targetWaiterId} not found.`);


    const existingWaiterAllocationConflict = await this.prisma.tableAllocation.findFirst({
      where: { shiftId: targetShiftId, waiterId: targetWaiterId, id: { not: id } },
    });
    if (existingWaiterAllocationConflict) {
      throw new ConflictException(
        `Waiter ${waiterForConflictCheck.tag_nickname} already has another allocation for shift on ${new Date(shiftForConflictCheck.date).toLocaleDateString()}.`,
      );
    }

    const conflictingTableAllocations = await this.prisma.tableAllocation.findMany({
      where: {
        shiftId: targetShiftId,
        waiterId: { not: targetWaiterId },
        tableNumbers: { hasSome: targetTableNumbers },
        id: { not: id },
      },
      include: { waiter: { select: { tag_nickname: true } } },
    });

    if (conflictingTableAllocations.length > 0) {
      const firstConflict = conflictingTableAllocations[0];
      const conflictingTable = firstConflict.tableNumbers.find(tNum => targetTableNumbers.includes(tNum));
      throw new ConflictException(
        `Table ${conflictingTable} in shift on ${new Date(shiftForConflictCheck.date).toLocaleDateString()} is already assigned to waiter ${firstConflict.waiter?.tag_nickname || firstConflict.waiterId}.`,
      );
    }

    try {
      const updatedAllocationPrisma = await this.prisma.tableAllocation.update({
        where: { id },
        data: {
          shiftId: targetShiftId,
          tableNumbers: targetTableNumbers,
          waiterId: targetWaiterId,
        },
        include: {
          shift: true,
          waiter: { select: { id: true, name: true, surname: true, tag_nickname: true } },
        },
      });
      this.logger.log(`Table allocation updated with ID: ${id}`);
      return this.mapPrismaAllocationToDetailed(updatedAllocationPrisma);
    } catch (error) {
      this.logger.error(`Failed to update table allocation ${id}: ${error.message}`, error.stack);
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2025') {
          throw new NotFoundException(`Table allocation with ID ${id} not found during update attempt.`);
        }
         if (error.code === 'P2002') {
           throw new ConflictException('A conflicting allocation already exists for this waiter and shift.');
        }
      }
      throw new BadRequestException(`Could not update table allocation. ${error.message}`);
    }
  }

  async deleteTableAllocation(id: string): Promise<void> {
    this.logger.log(`Deleting table allocation with ID: ${id}`);
    try {
      await this.prisma.tableAllocation.delete({
        where: { id },
      });
      this.logger.log(`Table allocation deleted with ID: ${id}`);
    } catch (error) {
      this.logger.error(`Failed to delete table allocation ${id}: ${error.message}`, error.stack);
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2025') { 
          throw new NotFoundException(`Table allocation with ID ${id} not found, cannot delete.`);
        }
      }
      throw new BadRequestException(`Could not delete table allocation. ${error.message}`);
    }
  }
}
