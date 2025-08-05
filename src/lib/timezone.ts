import { format, parseISO } from 'date-fns';
import { formatInTimeZone, toZonedTime, fromZonedTime } from 'date-fns-tz';

const PACIFIC_TIMEZONE = 'America/Los_Angeles';

/**
 * Get the current date in Pacific timezone as YYYY-MM-DD string
 */
export const getTodayInPacific = (): string => {
  return formatInTimeZone(new Date(), PACIFIC_TIMEZONE, 'yyyy-MM-dd');
};

/**
 * Get the current date and time in Pacific timezone
 */
export const getNowInPacific = (): Date => {
  return toZonedTime(new Date(), PACIFIC_TIMEZONE);
};

/**
 * Convert a UTC date to Pacific timezone
 */
export const toPacificTime = (date: Date | string): Date => {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  return toZonedTime(dateObj, PACIFIC_TIMEZONE);
};

/**
 * Convert a Pacific timezone date to UTC for database storage
 */
export const fromPacificTime = (date: Date): Date => {
  return fromZonedTime(date, PACIFIC_TIMEZONE);
};

/**
 * Format a date/time in Pacific timezone
 */
export const formatInPacific = (date: Date | string, formatStr: string): string => {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  return formatInTimeZone(dateObj, PACIFIC_TIMEZONE, formatStr);
};

/**
 * Format a date for display in Pacific timezone
 */
export const formatDateInPacific = (date: Date | string): string => {
  return formatInPacific(date, 'EEEE, MMMM d, yyyy');
};

/**
 * Format a time for display in Pacific timezone
 */
export const formatTimeInPacific = (time: string): string => {
  // Handle time string like "14:30:00"
  const timeDate = new Date(`2000-01-01T${time}`);
  return formatInTimeZone(timeDate, PACIFIC_TIMEZONE, 'h:mm a');
};

/**
 * Get a date string in Pacific timezone for API queries
 */
export const getDateStringInPacific = (date?: Date): string => {
  const targetDate = date || new Date();
  return formatInTimeZone(targetDate, PACIFIC_TIMEZONE, 'yyyy-MM-dd');
};