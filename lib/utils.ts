// lib/utils.ts - Updated formatDate function
import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import { format } from 'date-fns'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * ✅ UPDATED: Format date in European style (DD/MM/YYYY)
 */
export function formatDate(date: Date | string | null | undefined): string {
  if (!date) return 'N/A'
  
  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date
    if (isNaN(dateObj.getTime())) return 'Invalid Date'
    
    // Use European date format: DD/MM/YYYY
    return format(dateObj, 'dd/MM/yyyy')
  } catch (error) {
    console.error('Error formatting date:', error)
    return 'Invalid Date'
  }
}

/**
 * ✅ NEW: Format date for display in timesheet headers (shorter format)
 */
export function formatDateShort(date: Date | string): string {
  if (!date) return 'N/A'
  
  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date
    if (isNaN(dateObj.getTime())) return 'N/A'
    
    return format(dateObj, 'dd/MM')
  } catch (error) {
    return 'N/A'
  }
}

/**
 * ✅ NEW: Format period range display
 */
export function formatPeriodRange(startDate: Date | string, endDate: Date | string): string {
  const start = formatDate(startDate)
  const end = formatDate(endDate)
  
  if (start === 'N/A' || end === 'N/A') return 'Invalid Period'
  
  return `${start} - ${end}`
}

/**
 * ✅ NEW: Get month display with proper day range (1-30/31)
 */
export function getMonthDisplay(date: Date | string): string {
  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date
    if (isNaN(dateObj.getTime())) return 'Invalid Month'
    
    const year = dateObj.getFullYear()
    const month = dateObj.getMonth()
    
    // Get last day of the month
    const lastDay = new Date(year, month + 1, 0).getDate()
    const monthName = format(dateObj, 'MMMM yyyy')
    
    return `1-${lastDay} ${monthName}`
  } catch (error) {
    return 'Invalid Month'
  }
}

// Keep existing utility functions
export function formatHours(hours: number): string {
  if (hours === 0) return '0h'
  if (hours < 1) return `${Math.round(hours * 60)}m`
  if (hours % 1 === 0) return `${hours}h`
  
  const wholeHours = Math.floor(hours)
  const minutes = Math.round((hours - wholeHours) * 60)
  return `${wholeHours}h ${minutes}m`
}

export function formatCurrency(amount: number, currency = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }).format(amount)
}

export function formatPercentage(value: number, decimals = 1): string {
  return `${value.toFixed(decimals)}%`
}

export function formatFileSize(bytes: number): string {
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB']
  if (bytes === 0) return '0 Bytes'
  
  const i = Math.floor(Math.log(bytes) / Math.log(1024))
  const size = Math.round((bytes / Math.pow(1024, i)) * 100) / 100
  
  return `${size} ${sizes[i]}`
}

export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text
  return text.slice(0, maxLength) + '...'
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w ]+/g, '')
    .replace(/ +/g, '-')
}

export function capitalizeFirst(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1)
}