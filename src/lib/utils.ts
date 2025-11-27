import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(value: number): string {
  return value.toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

export function formatCurrencyCompact(value: number): string {
  if (value >= 100000) {
    if (value >= 1000000) {
      return (value / 1000000).toFixed(1).replace('.', ',') + 'M';
    }
    return (value / 1000).toFixed(1).replace('.', ',') + 'K';
  }
  return formatCurrency(value);
}
