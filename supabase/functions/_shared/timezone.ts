// Timezone utilities for Supabase Edge Functions
// Since edge functions can't import from src/, we need standalone utilities

const PACIFIC_TIMEZONE = 'America/Los_Angeles';

/**
 * Get the current date in Pacific timezone as YYYY-MM-DD string
 * For use in edge functions
 */
export const getTodayInPacific = (): string => {
  const now = new Date();
  const pacificTime = new Date(now.toLocaleString("en-US", { timeZone: PACIFIC_TIMEZONE }));
  return pacificTime.toISOString().split('T')[0];
};

/**
 * Get the current date and time in Pacific timezone
 * For use in edge functions
 */
export const getNowInPacific = (): Date => {
  const now = new Date();
  return new Date(now.toLocaleString("en-US", { timeZone: PACIFIC_TIMEZONE }));
};

/**
 * Format a date in Pacific timezone
 * For use in edge functions
 */
export const formatDateInPacific = (date: Date): string => {
  return new Date(date.toLocaleString("en-US", { timeZone: PACIFIC_TIMEZONE }))
    .toISOString().split('T')[0];
};

/**
 * Get current time string in Pacific timezone (HH:mm:ss format)
 * For use in edge functions
 */
export const getCurrentTimeInPacific = (): string => {
  const now = new Date();
  const pacificTime = new Date(now.toLocaleString("en-US", { timeZone: PACIFIC_TIMEZONE }));
  return pacificTime.toTimeString().split(' ')[0];
};