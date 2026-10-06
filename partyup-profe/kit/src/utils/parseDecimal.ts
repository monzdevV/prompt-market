/**
 * Parses a user-typed decimal number accepting both "4.50" and "4,50"
 * (decimal-pad shows "," on Spanish/European keyboards). If both separators
 * appear ("1.234,50" / "1,234.50") the last one is the decimal separator.
 * Returns undefined for empty or invalid input.
 */
export function parseDecimal(input: string): number | undefined {
  let value = input.trim().replace(/\s/g, '');
  if (!value) return undefined;

  const lastComma = value.lastIndexOf(',');
  const lastDot = value.lastIndexOf('.');
  const decimalSep = lastComma > lastDot ? ',' : '.';
  const thousandsSep = decimalSep === ',' ? '.' : ',';

  value = value.split(thousandsSep).join('');
  if (decimalSep === ',') value = value.replace(',', '.');

  if (!/^\d+(\.\d+)?$/.test(value)) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}
