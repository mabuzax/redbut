export interface ShiftInfoForAllocation {
  id: string;
  date: Date;
  startTime: Date;
  endTime: Date;
}

export interface WaiterInfoForAllocation {
  id: string;
  name: string;
  surname: string;
  tag_nickname: string;
}

export interface TableAllocation {
  id: string;
  shiftId: string;
  tableNumbers: number[];
  waiterId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface TableAllocationWithDetails extends TableAllocation {
  shift?: ShiftInfoForAllocation | null;
  waiter?: WaiterInfoForAllocation | null;
}
