// lib/utils/dateFormatting.ts

import { format, parse } from 'date-fns'

/**
 * Format date to DD/MM/YYYY format. Handles null/undefined inputs.
 */
export const formatDateEuropean = (date: Date | string | null | undefined): string => {
  // Guard clause: If the date is null or undefined, return a safe string.
  if (!date) {
    return 'Invalid Date';
  }

  const dateObj = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(dateObj.getTime())) {
    return 'Invalid Date';
  }
  
  return format(dateObj, 'dd/MM/yyyy');
}

/**
 * Format date for display in components (short version). Handles null/undefined inputs.
 */
export const formatDateShort = (date: Date | string | null | undefined): string => {
  if (!date) {
    return 'N/A';
  }
  
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(dateObj.getTime())) {
    return 'N/A';
  }
  
  return format(dateObj, 'dd/MM/yy');
}

/**
 * Parse DD/MM/YYYY string to Date object.
 */
export const parseDateEuropean = (dateString: string): Date => {
  return parse(dateString, 'dd/MM/yyyy', new Date());
}

/**
 * Format date for the 'value' attribute of an HTML <input type="date">.
 * Handles null/undefined inputs to prevent crashes on initial render.
 */
export const formatDateForInput = (date: Date | string | null | undefined): string => {
  // Guard clause: If the date is null or undefined, return an empty string.
  if (!date) {
    return '';
  }

  const dateObj = typeof date === 'string' ? new Date(date) : date;

  // Check for an invalid date (e.g., from a bad string conversion).
  if (isNaN(dateObj.getTime())) {
    return '';
  }
  
  // The value for an <input type="date"> must be 'yyyy-MM-dd'.
  return format(dateObj, 'yyyy-MM-dd');
}


// No changes needed for the functions below, as they are not directly exposed
// to potentially undefined props in the same way.

/**
 * Get month range display (e.g., "1 - 31 August 2025").
 */
export const getMonthRangeDisplay = (date: Date): string => {
  const year = date.getFullYear();
  const month = date.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const monthName = format(firstDay, 'MMMM yyyy');
  return `1 - ${lastDay.getDate()} ${monthName}`;
}

/**
 * Get period display for timesheets (DD/MM/YYYY - DD/MM/YYYY).
 */
export const getPeriodDisplay = (startDate: Date | string, endDate: Date | string): string => {
  const start = typeof startDate === 'string' ? new Date(startDate) : startDate;
  const end = typeof endDate === 'string' ? new Date(endDate) : endDate;
  return `${formatDateEuropean(start)} - ${formatDateEuropean(end)}`;
}

/**
 * Get default period for current month with proper formatting.
 */
export const getDefaultPeriodFormatted = () => {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  
  return {
    startDate: startOfMonth,
    endDate: endOfMonth,
    display: getPeriodDisplay(startOfMonth, endOfMonth),
    monthRange: getMonthRangeDisplay(startOfMonth),
    inputStartDate: formatDateForInput(startOfMonth),
    inputEndDate: formatDateForInput(endOfMonth)
  };
}