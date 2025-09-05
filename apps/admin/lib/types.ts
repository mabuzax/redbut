// Local type definitions for Prisma enums
// This file provides the same enum types as Prisma client without requiring database connection

export enum RequestStatus {
  New = 'New',
  Acknowledged = 'Acknowledged',
  InProgress = 'InProgress',
  Completed = 'Completed',
  OnHold = 'OnHold',
  Cancelled = 'Cancelled',
  Done = 'Done'
}

export enum OrderStatus {
  New = 'New',
  Acknowledged = 'Acknowledged',
  InProgress = 'InProgress',
  Delivered = 'Delivered',
  Completed = 'Completed',
  Cancelled = 'Cancelled'
}

export enum UserType {
  waiter = 'waiter',
  admin = 'admin'
}
