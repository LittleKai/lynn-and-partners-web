/**
 * Format a number string with dot (.) as thousands separator.
 * e.g. "1000000" → "1.000.000"
 */
export function formatWithDots(value: string): string {
  // Allow digits and one trailing dot for decimals (e.g. "1.5")
  const digits = value.replace(/[^\d]/g, "");
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

/**
 * Strip dots to get raw number string for submission.
 * e.g. "1.000.000" → "1000000"
 */
export function parseDots(value: string): string {
  return value.replace(/\./g, "");
}
