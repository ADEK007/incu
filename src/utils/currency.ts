export const CURRENCY_MAP: Record<string, { symbol: string; code: string }> = {
  USA: { symbol: '$', code: 'USD' },
  Bangladesh: { symbol: '৳', code: 'BDT' },
  UK: { symbol: '£', code: 'GBP' },
  Europe: { symbol: '€', code: 'EUR' },
  Canada: { symbol: 'CA$', code: 'CAD' },
  Australia: { symbol: 'A$', code: 'AUD' },
  India: { symbol: '₹', code: 'INR' },
};

export const formatPrice = (amount: number, country: string | null = 'Bangladesh') => {
  const currency = CURRENCY_MAP[country || 'Bangladesh'] || CURRENCY_MAP['Bangladesh'];
  return `${currency.symbol}${amount.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};
