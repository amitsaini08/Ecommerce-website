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

export const formatDate = (d) =>
  new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

export const isVideoUrl = (url) =>
  !!url && (/\.(mp4|webm|mov|avi|mkv)($|\?)/i.test(url) || url.includes('/video/upload/'));

// discount valid ho tabhi use hota hai (0 < discount < price)
export const getEffectivePrice = (p) => {
  const price = Number(p.price);
  const discount = Number(p.discountPrice);
  return discount > 0 && discount < price ? discount : price;
};

export const getDiscountPercent = (p) => {
  const price = Number(p.price);
  const effective = getEffectivePrice(p);
  return price > 0 && effective < price ? Math.round(((price - effective) / price) * 100) : 0;
};

export const formatNumber = (n) => Number(n || 0).toLocaleString('en-IN');