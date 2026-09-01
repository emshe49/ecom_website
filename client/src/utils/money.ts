/**
 * Formats minor monetary units (e.g. paisa/cents) into display string.
 * Example: formatMoney(1850000, 'PKR') -> "Rs 18,500.00"
 */
export const formatMoney = (minorUnits: number | null | undefined, currency = 'PKR'): string => {
  if (minorUnits === null || minorUnits === undefined || isNaN(minorUnits)) {
    return '—';
  }

  const majorUnits = minorUnits / 100;

  if (currency === 'PKR') {
    return `Rs ${majorUnits.toLocaleString('en-PK', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  }

  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }).format(majorUnits);
};

/**
 * Converts major units input to integer minor units.
 * Example: toMinorUnits(18500.50) -> 1850050
 */
export const toMinorUnits = (majorUnits: number | string): number => {
  const parsed = typeof majorUnits === 'string' ? parseFloat(majorUnits) : majorUnits;
  if (isNaN(parsed) || parsed < 0) return 0;
  return Math.round(parsed * 100);
};

/**
 * Converts minor units to float major units for input fields.
 * Example: fromMinorUnits(1850050) -> 18500.5
 */
export const fromMinorUnits = (minorUnits: number | null | undefined): number | string => {
  if (minorUnits === null || minorUnits === undefined) return '';
  return (minorUnits / 100).toString();
};
