/**
 * Formats a numeric price or amount as INR (₹).
 */
export function formatCurrency(amount) {
  const num = Number(amount || 0);
  if (isNaN(num)) return '₹0';
  const hasDecimal = num % 1 !== 0;
  return `₹${num.toLocaleString('en-IN', {
    minimumFractionDigits: hasDecimal ? 2 : 0,
    maximumFractionDigits: 2,
  })}`;
}
