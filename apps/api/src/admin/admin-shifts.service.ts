import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { CreateShiftDto, UpdateShiftDto } from './admin-shifts.dto';
import { Shift } from './admin-shifts.types';

@Injectable()
export class AdminShiftsService {
  private readonly logger = new Logger(AdminShiftsService.name);
  private shifts: Shift[] = [];

  constructor() {}

  async getAllShifts(): Promise<Shift[]> {
    this.logger.log('Fetching all shifts');
    return [...this.shifts.sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())];
  }

  async getShiftById(id: string): Promise<Shift> {
    this.logger.log(`Fetching shift with ID: ${id}`);
    const shift = this.shifts.find((s) => s.id === id);
    if (!shift) {
      throw new NotFoundException(`Shift with ID ${id} not found`);
    }
    return { ...shift };
  }

  async createShift(dto: CreateShiftDto): Promise<Shift> {
    this.logger.log(`Creating new shift starting at: ${dto.startTime}`);

    if (new Date(dto.endTime) <= new Date(dto.startTime)) {
      throw new BadRequestException('Shift end time must be after start time.');
    }

    const shiftDate = new Date(dto.startTime);
    shiftDate.setHours(0, 0, 0, 0);

    const newShift: Shift = {
      id: uuidv4(),
      date: shiftDate,
      startTime: new Date(dto.startTime),
      endTime: new Date(dto.endTime),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.shifts.push(newShift);
    this.logger.log(`Shift created with ID: ${newShift.id}`);
    return { ...newShift };
  }

  async updateShift(id: string, dto: UpdateShiftDto): Promise<Shift> {
    this.logger.log(`Updating shift with ID: ${id}`);
    const shiftIndex = this.shifts.findIndex((s) => s.id === id);
    if (shiftIndex === -1) {
      throw new NotFoundException(`Shift with ID ${id} not found`);
    }

    const existingShift = this.shifts[shiftIndex];
    const newStartTime = dto.startTime ? new Date(dto.startTime) : existingShift.startTime;
    const newEndTime = dto.endTime ? new Date(dto.endTime) : existingShift.endTime;

    if (newEndTime <= newStartTime) {
      throw new BadRequestException('Shift end time must be after start time.');
    }
    
    const newShiftDate = new Date(newStartTime);
    newShiftDate.setHours(0, 0, 0, 0);

    const updatedShift: Shift = {
      ...existingShift,
      startTime: newStartTime,
      endTime: newEndTime,
      date: newShiftDate,
      updatedAt: new Date(),
    };
    
    this.shifts[shiftIndex] = updatedShift;
    this.logger.log(`Shift updated with ID: ${id}`);
    return { ...updatedShift };
  }

  async deleteShift(id: string): Promise<void> {
    this.logger.log(`Deleting shift with ID: ${id}`);
    const initialLength = this.shifts.length;
    this.shifts = this.shifts.filter((s) => s.id !== id);
    if (this.shifts.length === initialLength) {
      throw new NotFoundException(`Shift with ID ${id} not found`);
    }
    this.logger.log(`Shift deleted with ID: ${id}`);
  }
}
