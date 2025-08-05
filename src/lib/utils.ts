import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDuration(durationMinutes: number): string {
  if (durationMinutes < 60) {
    return `${durationMinutes} minutes`;
  }
  
  const hours = Math.floor(durationMinutes / 60);
  const remainingMinutes = durationMinutes % 60;
  
  if (remainingMinutes === 0) {
    return hours === 1 ? '1 hour' : `${hours} hours`;
  }
  
  const hourText = hours === 1 ? '1 hour' : `${hours} hours`;
  return `${hourText} ${remainingMinutes} minutes`;
}

export function formatPrice(price: number | string): string {
  const numPrice = typeof price === 'string' ? parseFloat(price) : price;
  return numPrice.toFixed(2);
}

export function formatCurrency(price: number | string): string {
  return `$${formatPrice(price)}`;
}
