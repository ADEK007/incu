export const CURRENCY_MAP: Record<string, { symbol: string; code: string }> = {
  USA: { symbol: '৳', code: 'BDT' },
  Bangladesh: { symbol: '৳', code: 'BDT' },
  UK: { symbol: '৳', code: 'BDT' },
  Europe: { symbol: '৳', code: 'BDT' },
  Canada: { symbol: '৳', code: 'BDT' },
  Australia: { symbol: '৳', code: 'BDT' },
  India: { symbol: '৳', code: 'BDT' },
};

export const formatPrice = (amount: number, country: string | null = 'Bangladesh') => {
  const currency = CURRENCY_MAP[country || 'Bangladesh'] || CURRENCY_MAP['Bangladesh'];
  return `${currency.symbol}${amount.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};
