import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const MIRROR_API_URL = process.env.NEXT_PUBLIC_MIRROR_API_URL || 'http://localhost:3001';
