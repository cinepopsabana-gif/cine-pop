/**
 * Formats a numeric price into Colombian Pesos representation (e.g., 18000 -> "$18.000").
 * Relies on simple regex formatting for robust behavior in any environment.
 */
export function formatPrice(amount: number): string {
  const rounded = Math.round(amount);
  return '$' + rounded.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}
