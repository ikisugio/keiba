import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Returns a Tailwind text color class for an HTTP response code.
 *  2xx → success (green)
 *  3xx → info (blue)
 *  4xx → warning (amber)
 *  5xx → destructive (red)
 *  null / other → muted
 */
export function responseCodeColor(code: number | null): string {
  if (code === null) return "text-muted-foreground"
  if (code >= 200 && code < 300) return "text-success"
  if (code >= 300 && code < 400) return "text-info"
  if (code >= 400 && code < 500) return "text-warning"
  if (code >= 500) return "text-destructive"
  return "text-muted-foreground"
}
