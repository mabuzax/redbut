import { 
  startOfDay, 
  endOfDay, 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek,
  subDays,
  format,
  parseISO
} from 'date-fns';
import { toZonedTime, fromZonedTime } from 'date-fns-tz';

/**
 * Date utilities for consistent timezone handling across the application
 * All dates are handled in Africa/Johannesburg timezone (GMT+2)
 * Works in both Docker and local development environments
 */
export class DateUtil {
  private static readonly DEFAULT_TIMEZONE = 'Africa/Johannesburg';
  
  /**
   * Initialize timezone for the application
   * Call this early in application bootstrap
   */
  static initializeTimezone(): void {
    if (!process.env.TZ) {
      process.env.TZ = this.DEFAULT_TIMEZONE;
    }
    
    // Log timezone information for debugging
    console.log(`[DateUtil] Timezone initialized: ${process.env.TZ}`);
    console.log(`[DateUtil] Current time: ${this.now().toISOString()}`);
    console.log(`[DateUtil] System timezone: ${Intl.DateTimeFormat().resolvedOptions().timeZone}`);
  }
  
  /**
   * Get current date in application timezone (Africa/Johannesburg)
   */
  static now(): Date {
    return new Date();
  }
  
  /**
   * Get start of day in application timezone
   */
  static startOfDayUTC(date: Date = new Date()): Date {
    const localDate = this.utcToLocal(date, this.DEFAULT_TIMEZONE);
    return this.localToUTC(startOfDay(localDate), this.DEFAULT_TIMEZONE);
  }
  
  /**
   * Get end of day in application timezone
   */
  static endOfDayUTC(date: Date = new Date()): Date {
    const localDate = this.utcToLocal(date, this.DEFAULT_TIMEZONE);
    return this.localToUTC(endOfDay(localDate), this.DEFAULT_TIMEZONE);
  }
  
  /**
   * Get start of month in application timezone
   */
  static startOfMonthUTC(date: Date = new Date()): Date {
    const localDate = this.utcToLocal(date, this.DEFAULT_TIMEZONE);
    return this.localToUTC(startOfMonth(localDate), this.DEFAULT_TIMEZONE);
  }
  
  /**
   * Get end of month in application timezone
   */
  static endOfMonthUTC(date: Date = new Date()): Date {
    const localDate = this.utcToLocal(date, this.DEFAULT_TIMEZONE);
    return this.localToUTC(endOfMonth(localDate), this.DEFAULT_TIMEZONE);
  }
  
  /**
   * Get start of week in application timezone
   */
  static startOfWeekUTC(date: Date = new Date()): Date {
    const localDate = this.utcToLocal(date, this.DEFAULT_TIMEZONE);
    return this.localToUTC(startOfWeek(localDate), this.DEFAULT_TIMEZONE);
  }
  
  /**
   * Get end of week in application timezone
   */
  static endOfWeekUTC(date: Date = new Date()): Date {
    const localDate = this.utcToLocal(date, this.DEFAULT_TIMEZONE);
    return this.localToUTC(endOfWeek(localDate), this.DEFAULT_TIMEZONE);
  }
  
  /**
   * Subtract days from date in application timezone
   */
  static subDaysUTC(date: Date, days: number): Date {
    const localDate = this.utcToLocal(date, this.DEFAULT_TIMEZONE);
    return this.localToUTC(subDays(localDate, days), this.DEFAULT_TIMEZONE);
  }
  
  /**
   * Parse ISO string to date in application timezone
   */
  static parseISOUTC(dateString: string): Date {
    return parseISO(dateString);
  }
  
  /**
   * Format date to ISO string
   */
  static toISOStringUTC(date: Date): string {
    return date.toISOString();
  }
  
  /**
   * Get default date range for analytics (last N days)
   */
  static getDefaultDateRange(days = 7): { startDate: string; endDate: string } {
    const endDate = this.endOfDayUTC();
    const startDate = this.startOfDayUTC(this.subDaysUTC(endDate, days - 1));
    
    return {
      startDate: this.toISOStringUTC(startDate),
      endDate: this.toISOStringUTC(endDate),
    };
  }
  
  /**
   * Get current month date range
   */
  static getCurrentMonthDateRange(): { startDate: string; endDate: string } {
    const now = this.now();
    return {
      startDate: this.toISOStringUTC(this.startOfMonthUTC(now)),
      endDate: this.toISOStringUTC(this.endOfDayUTC(now)),
    };
  }
  
  /**
   * Get today's date range
   */
  static getTodayDateRange(): { startDate: string; endDate: string } {
    const now = this.now();
    return {
      startDate: this.toISOStringUTC(this.startOfDayUTC(now)),
      endDate: this.toISOStringUTC(this.endOfDayUTC(now)),
    };
  }
  
  /**
   * Convert local timezone date to UTC for database storage
   */
  static localToUTC(date: Date, timezone?: string): Date {
    if (!timezone) return date;
    return fromZonedTime(date, timezone);
  }
  
  /**
   * Convert UTC date to local timezone for display
   */
  static utcToLocal(date: Date, timezone: string = this.DEFAULT_TIMEZONE): Date {
    return toZonedTime(date, timezone);
  }
  
  /**
   * Format date for display in Johannesburg timezone
   */
  static formatForDisplay(date: Date, formatString: string = 'yyyy-MM-dd HH:mm:ss', timezone?: string): string {
    const displayDate = timezone ? this.utcToLocal(date, timezone) : this.utcToLocal(date, this.DEFAULT_TIMEZONE);
    return format(displayDate, formatString);
  }
}
