import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Merges class names using clsx and tailwind-merge.
 * Used throughout shadcn/ui components.
 */
export function cn(...inputs) {
  return twMerge(clsx(inputs));
}
