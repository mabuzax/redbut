import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { CreateShiftDto, UpdateShiftDto } from './admin-shifts.dto';
import { Shift } from './admin-shifts.types';
import { Prisma } from '@prisma/client';

@Injectable()
export class AdminShiftsService {
  private readonly logger = new Logger(AdminShiftsService.name);

  constructor(private prisma: PrismaService) {}

  async getAllShifts(): Promise<Shift[]> {
    this.logger.log('Fetching all shifts from database');
    return this.prisma.shift.findMany({
      orderBy: {
        startTime: 'asc',
      },
    });
  }

  async getShiftById(id: string): Promise<Shift> {
    this.logger.log(`Fetching shift with ID: ${id} from database`);
    const shift = await this.prisma.shift.findUnique({
      where: { id },
    });
    if (!shift) {
      throw new NotFoundException(`Shift with ID ${id} not found`);
    }
    return shift;
  }

  async createShift(dto: CreateShiftDto): Promise<Shift> {
    this.logger.log(`Creating new shift starting at: ${dto.startTime}`);

    const startTime = new Date(dto.startTime);
    const endTime = new Date(dto.endTime);

    if (endTime <= startTime) {
      throw new BadRequestException('Shift end time must be after start time.');
    }

    const shiftDate = new Date(startTime);
    shiftDate.setUTCHours(0, 0, 0, 0); // Store date part at midnight UTC

    try {
      const newShift = await this.prisma.shift.create({
        data: {
          date: shiftDate,
          startTime: startTime,
          endTime: endTime,
        },
      });
      this.logger.log(`Shift created with ID: ${newShift.id}`);
      return newShift;
    } catch (error) {
      this.logger.error(`Failed to create shift: ${error.message}`, error.stack);
      throw new BadRequestException(`Could not create shift. ${error.message}`);
    }
  }

  async updateShift(id: string, dto: UpdateShiftDto): Promise<Shift> {
    this.logger.log(`Updating shift with ID: ${id}`);

    const existingShift = await this.prisma.shift.findUnique({ where: { id } });
    if (!existingShift) {
      throw new NotFoundException(`Shift with ID ${id} not found, cannot update.`);
    }

    const newStartTime = dto.startTime ? new Date(dto.startTime) : existingShift.startTime;
    const newEndTime = dto.endTime ? new Date(dto.endTime) : existingShift.endTime;

    if (newEndTime <= newStartTime) {
      throw new BadRequestException('Shift end time must be after start time.');
    }
    
    const newShiftDate = new Date(newStartTime);
    newShiftDate.setUTCHours(0, 0, 0, 0); // Update date part if startTime changes

    try {
      const updatedShift = await this.prisma.shift.update({
        where: { id },
        data: {
          startTime: newStartTime,
          endTime: newEndTime,
          date: newShiftDate,
        },
      });
      this.logger.log(`Shift updated with ID: ${id}`);
      return updatedShift;
    } catch (error) {
      this.logger.error(`Failed to update shift ${id}: ${error.message}`, error.stack);
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2025') {
          throw new NotFoundException(`Shift with ID ${id} not found during update attempt.`);
        }
      }
      throw new BadRequestException(`Could not update shift. ${error.message}`);
    }
  }

  async deleteShift(id: string): Promise<void> {
    this.logger.log(`Deleting shift with ID: ${id}`);
    try {
      await this.prisma.shift.delete({
        where: { id },
      });
      this.logger.log(`Shift deleted with ID: ${id}`);
    } catch (error) {
      this.logger.error(`Failed to delete shift ${id}: ${error.message}`, error.stack);
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2025') { // Record to delete not found
          throw new NotFoundException(`Shift with ID ${id} not found, cannot delete.`);
        }
      }
      throw new BadRequestException(`Could not delete shift. ${error.message}`);
    }
  }
}
