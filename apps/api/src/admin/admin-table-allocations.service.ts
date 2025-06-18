import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { CreateTableAllocationDto, UpdateTableAllocationDto } from './admin-table-allocations.dto';
import {
  TableAllocationWithDetails,
  ShiftInfoForAllocation,
  WaiterInfoForAllocation,
} from './admin-table-allocations.types';
import { AdminShiftsService } from './admin-shifts.service';
import { AdminStaffService } from './admin-staff.service';
import { Shift } from './admin-shifts.types';
import { StaffMemberWithAccessInfo } from './admin-staff.types';

@Injectable()
export class AdminTableAllocationsService {
  private readonly logger = new Logger(AdminTableAllocationsService.name);
  private tableAllocations: TableAllocationWithDetails[] = [];

  constructor(
    private readonly adminShiftsService: AdminShiftsService,
    private readonly adminStaffService: AdminStaffService,
  ) {}

  private async _getShiftInfo(shiftId: string): Promise<ShiftInfoForAllocation | null> {
    try {
      const shift: Shift = await this.adminShiftsService.getShiftById(shiftId);
      return {
        id: shift.id,
        date: shift.date,
        startTime: shift.startTime,
        endTime: shift.endTime,
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        return null;
      }
      throw error;
    }
  }

  private async _getWaiterInfo(waiterId: string): Promise<WaiterInfoForAllocation | null> {
    try {
      const staffMember: StaffMemberWithAccessInfo = await this.adminStaffService.getStaffMemberById(waiterId);
      return {
        id: staffMember.id,
        name: staffMember.name,
        surname: staffMember.surname,
        tag_nickname: staffMember.tag_nickname,
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        return null;
      }
      throw error;
    }
  }

  private _checkTableConflict(
    shiftId: string,
    tableNumbers: number[],
    waiterId: string,
    currentAllocationId?: string,
  ): void {
    for (const alloc of this.tableAllocations) {
      if (alloc.id === currentAllocationId) continue; 

      if (alloc.shiftId === shiftId && alloc.waiterId !== waiterId) {
        const conflict = alloc.tableNumbers.some(assignedTable => tableNumbers.includes(assignedTable));
        if (conflict) {
          const conflictingTable = alloc.tableNumbers.find(assignedTable => tableNumbers.includes(assignedTable));
          throw new ConflictException(
            `Table ${conflictingTable} in shift ${shiftId} is already assigned to waiter ${alloc.waiter?.tag_nickname || alloc.waiterId}.`,
          );
        }
      }
    }
  }

  async getAllTableAllocations(): Promise<TableAllocationWithDetails[]> {
    this.logger.log('Fetching all table allocations');
    return [...this.tableAllocations].sort((a, b) => 
      new Date(a.shift?.startTime || 0).getTime() - new Date(b.shift?.startTime || 0).getTime() ||
      (a.waiter?.tag_nickname || '').localeCompare(b.waiter?.tag_nickname || '')
    );
  }

  async getTableAllocationById(id: string): Promise<TableAllocationWithDetails> {
    this.logger.log(`Fetching table allocation with ID: ${id}`);
    const allocation = this.tableAllocations.find((alloc) => alloc.id === id);
    if (!allocation) {
      throw new NotFoundException(`Table allocation with ID ${id} not found`);
    }
    return { ...allocation };
  }

  async createTableAllocation(dto: CreateTableAllocationDto): Promise<TableAllocationWithDetails> {
    this.logger.log(`Creating new table allocation for shift ID: ${dto.shiftId}, waiter ID: ${dto.waiterId}`);

    const shiftInfo = await this._getShiftInfo(dto.shiftId);
    if (!shiftInfo) {
      throw new BadRequestException(`Shift with ID ${dto.shiftId} not found.`);
    }

    const waiterInfo = await this._getWaiterInfo(dto.waiterId);
    if (!waiterInfo) {
      throw new BadRequestException(`Waiter with ID ${dto.waiterId} not found.`);
    }

    this._checkTableConflict(dto.shiftId, dto.tableNumbers, dto.waiterId);
    
    const existingAllocationForWaiterInShift = this.tableAllocations.find(
      alloc => alloc.shiftId === dto.shiftId && alloc.waiterId === dto.waiterId
    );

    if (existingAllocationForWaiterInShift) {
       throw new ConflictException(`Waiter ${waiterInfo.tag_nickname} already has an allocation for shift on ${new Date(shiftInfo.date).toLocaleDateString()}. Please update the existing allocation.`);
    }


    const newAllocation: TableAllocationWithDetails = {
      id: uuidv4(),
      shiftId: dto.shiftId,
      tableNumbers: [...new Set(dto.tableNumbers)].sort((a, b) => a - b),
      waiterId: dto.waiterId,
      createdAt: new Date(),
      updatedAt: new Date(),
      shift: shiftInfo,
      waiter: waiterInfo,
    };

    this.tableAllocations.push(newAllocation);
    this.logger.log(`Table allocation created with ID: ${newAllocation.id}`);
    return { ...newAllocation };
  }

  async updateTableAllocation(id: string, dto: UpdateTableAllocationDto): Promise<TableAllocationWithDetails> {
    this.logger.log(`Updating table allocation with ID: ${id}`);
    const allocationIndex = this.tableAllocations.findIndex((alloc) => alloc.id === id);
    if (allocationIndex === -1) {
      throw new NotFoundException(`Table allocation with ID ${id} not found`);
    }

    const existingAllocation = this.tableAllocations[allocationIndex];
    
    const targetShiftId = dto.shiftId || existingAllocation.shiftId;
    const targetWaiterId = dto.waiterId || existingAllocation.waiterId;
    const targetTableNumbers = dto.tableNumbers 
      ? [...new Set(dto.tableNumbers)].sort((a, b) => a - b) 
      : existingAllocation.tableNumbers;

    let shiftInfo = existingAllocation.shift;
    if (dto.shiftId && dto.shiftId !== existingAllocation.shiftId) {
      shiftInfo = await this._getShiftInfo(dto.shiftId);
      if (!shiftInfo) {
        throw new BadRequestException(`New shift with ID ${dto.shiftId} not found.`);
      }
    }

    let waiterInfo = existingAllocation.waiter;
    if (dto.waiterId && dto.waiterId !== existingAllocation.waiterId) {
      waiterInfo = await this._getWaiterInfo(dto.waiterId);
      if (!waiterInfo) {
        throw new BadRequestException(`New waiter with ID ${dto.waiterId} not found.`);
      }
    }
    
    this._checkTableConflict(targetShiftId, targetTableNumbers, targetWaiterId, id);

    const updatedAllocation: TableAllocationWithDetails = {
      ...existingAllocation,
      shiftId: targetShiftId,
      tableNumbers: targetTableNumbers,
      waiterId: targetWaiterId,
      shift: shiftInfo,
      waiter: waiterInfo,
      updatedAt: new Date(),
    };

    this.tableAllocations[allocationIndex] = updatedAllocation;
    this.logger.log(`Table allocation updated with ID: ${id}`);
    return { ...updatedAllocation };
  }

  async deleteTableAllocation(id: string): Promise<void> {
    this.logger.log(`Deleting table allocation with ID: ${id}`);
    const initialLength = this.tableAllocations.length;
    this.tableAllocations = this.tableAllocations.filter((alloc) => alloc.id !== id);
    if (this.tableAllocations.length === initialLength) {
      throw new NotFoundException(`Table allocation with ID ${id} not found`);
    }
    this.logger.log(`Table allocation deleted with ID: ${id}`);
  }
}
