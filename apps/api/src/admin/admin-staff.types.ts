import { UserType, Waiter } from '@prisma/client';

/**
 * Defines possible staff positions.
 * These are used for display and selection in forms.
 */
export const STAFF_POSITIONS = ['Waiter', 'Chef', 'Manager', 'Supervisor'] as const;

/**
 * Type representing one of the defined staff positions.
 */
export type StaffPosition = typeof STAFF_POSITIONS[number];

/**
 * Default password for newly created staff members.
 * They will be required to change this on their first login.
 */
export const DEFAULT_STAFF_PASSWORD = '__new__pass';

/**
 * Interface representing a staff member with their access account information.
 * This is typically used within the service layer to combine data from
 * the Waiter and AccessUser models.
 */
export interface StaffMemberWithAccessInfo extends Waiter {
  accessAccount?: {
    username: string;
    userType: UserType;
  } | null;
  /**
   * The display position of the staff member (e.g., "Waiter", "Chef").
   * This may be derived from a specific 'position' field on the Waiter model
   * or mapped from the AccessUser's userType.
   */
  position?: string; 
}
