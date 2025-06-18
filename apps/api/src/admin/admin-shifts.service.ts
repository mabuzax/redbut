import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { v4 as uuidv4 } from 'uuid';
import { CreateShiftDto, UpdateShiftDto } from './admin-shifts.dto';
import { ShiftWithStaffInfo, MinimalStaffInfo } from './admin-shifts.types';

@Injectable()
export class AdminShiftsService {
  private readonly logger = new Logger(AdminShiftsService.name);
  private shifts: ShiftWithStaffInfo[] = [];

  constructor(private prisma: PrismaService) {}

  private async _getMinimalStaffInfo(staffId: string): Promise<MinimalStaffInfo | null> {
    const staffMember = await this.prisma.waiter.findUnique({
      where: { id: staffId },
      select: {
        id: true,
        name: true,
        surname: true,
        tag_nickname: true,
        accessAccount: {
          select: {
            userType: true,
          },
        },
      },
    });

    if (!staffMember) {
      return null;
    }
    
    let position = 'Waiter'; // Default
    if (staffMember.accessAccount) {
        switch (staffMember.accessAccount.userType) {
            case 'manager':
                position = 'Manager';
                break;
            case 'admin':
                position = 'Admin'; // Or handle as per specific app logic
                break;
            // 'waiter' type maps to 'Waiter', 'Chef', 'Supervisor' based on other logic in staff service,
            // but here we only have UserType. For simplicity, default to 'Waiter' or use a direct position field if it existed.
        }
    }


    return {
      id: staffMember.id,
      name: staffMember.name,
      surname: staffMember.surname,
      tag_nickname: staffMember.tag_nickname,
      position: position, 
    };
  }

  async getAllShifts(): Promise<ShiftWithStaffInfo[]> {
    this.logger.log('Fetching all shifts');
    return [...this.shifts];
  }

  async getShiftById(id: string): Promise<ShiftWithStaffInfo> {
    this.logger.log(`Fetching shift with ID: ${id}`);
    const shift = this.shifts.find((s) => s.id === id);
    if (!shift) {
      throw new NotFoundException(`Shift with ID ${id} not found`);
    }
    return { ...shift };
  }

  async createShift(dto: CreateShiftDto): Promise<ShiftWithStaffInfo> {
    this.logger.log(`Creating new shift for staff ID: ${dto.staffId}`);

    const staffMemberInfo = await this._getMinimalStaffInfo(dto.staffId);
    if (!staffMemberInfo) {
      throw new BadRequestException(`Staff member with ID ${dto.staffId} not found.`);
    }

    if (dto.endTime <= dto.startTime) {
        throw new BadRequestException('Shift end time must be after start time.');
    }

    const newShift: ShiftWithStaffInfo = {
      id: uuidv4(),
      staffId: dto.staffId,
      startTime: dto.startTime,
      endTime: dto.endTime,
      type: dto.type,
      status: dto.status || 'Scheduled',
      notes: dto.notes,
      createdAt: new Date(),
      updatedAt: new Date(),
      staffMember: staffMemberInfo,
    };

    this.shifts.push(newShift);
    this.logger.log(`Shift created with ID: ${newShift.id}`);
    return { ...newShift };
  }

  async updateShift(id: string, dto: UpdateShiftDto): Promise<ShiftWithStaffInfo> {
    this.logger.log(`Updating shift with ID: ${id}`);
    const shiftIndex = this.shifts.findIndex((s) => s.id === id);
    if (shiftIndex === -1) {
      throw new NotFoundException(`Shift with ID ${id} not found`);
    }

    const existingShift = this.shifts[shiftIndex];

    const newStartTime = dto.startTime || existingShift.startTime;
    const newEndTime = dto.endTime || existingShift.endTime;

    if (newEndTime <= newStartTime) {
        throw new BadRequestException('Shift end time must be after start time.');
    }

    const updatedShift: ShiftWithStaffInfo = {
      ...existingShift,
      ...dto,
      startTime: newStartTime,
      endTime: newEndTime,
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
