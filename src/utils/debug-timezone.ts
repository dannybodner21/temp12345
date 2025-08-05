import { getTodayInPacific, formatInPacific } from '@/lib/timezone';

// Debug function to check timezone handling
export const debugTimezone = () => {
  const now = new Date();
  const utcDate = now.toISOString().split('T')[0];
  const pacificDate = getTodayInPacific();
  const pacificTime = formatInPacific(now, 'yyyy-MM-dd HH:mm:ss zzz');
  
  console.log('=== TIMEZONE DEBUG ===');
  console.log('Current UTC date:', utcDate);
  console.log('Current Pacific date:', pacificDate);
  console.log('Current Pacific time:', pacificTime);
  console.log('=== END TIMEZONE DEBUG ===');
  
  return {
    utcDate,
    pacificDate,
    pacificTime
  };
};