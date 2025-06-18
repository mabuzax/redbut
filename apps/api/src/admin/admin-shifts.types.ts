export const SHIFT_TYPES = ['Morning', 'Afternoon', 'Evening', 'Night'] as const;
export type ShiftType = typeof SHIFT_TYPES[number];

export const SHIFT_STATUSES = ['Scheduled', 'Active', 'Completed', 'Cancelled'] as const;
export type ShiftStatus = typeof SHIFT_STATUSES[number];

export interface Shift {
  id: string;
  staffId: string;
  startTime: Date;
  endTime: Date;
  type: ShiftType;
  status: ShiftStatus;
  notes?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface MinimalStaffInfo {
  id: string;
  name: string;
  surname: string;
  tag_nickname: string;
  position?: string;
}

export interface ShiftWithStaffInfo extends Shift {
  staffMember?: MinimalStaffInfo;
}
