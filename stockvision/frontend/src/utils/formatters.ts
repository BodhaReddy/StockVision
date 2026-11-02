/**
 * Plain-English formatters for dates, currency, and volume.
 */

const MONTH_NAMES = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

/**
 * Format date string into "13 Nov 2025" style
 */
export function formatPlainDate(dateInput: string | Date | undefined | null): string {
  if (!dateInput) return '—';
  try {
    const d = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
    if (isNaN(d.getTime())) {
      // In case string is already YYYY-MM-DD
      if (typeof dateInput === 'string' && dateInput.includes('-')) {
        const parts = dateInput.split('-');
        if (parts.length >= 3) {
          const monthIdx = parseInt(parts[1], 10) - 1;
          const day = parseInt(parts[2].slice(0, 2), 10);
          return `${day} ${MONTH_NAMES[monthIdx] || parts[1]} ${parts[0]}`;
        }
      }
      return String(dateInput);
    }
    const day = d.getDate();
    const month = MONTH_NAMES[d.getMonth()];
    const year = d.getFullYear();
    return `${day} ${month} ${year}`;
  } catch {
    return String(dateInput);
  }
}

/**
 * Format currency with Indian Rupee symbol
 */
export function formatRupees(amount: number | undefined | null, decimals = 2): string {
  if (amount === undefined || amount === null || isNaN(amount)) return '—';
  return `₹${amount.toLocaleString('en-IN', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })}`;
}

/**
 * Format volume in plain English (e.g. 14.8M shares)
 */
export function formatShares(volume: number | undefined | null): string {
  if (!volume || isNaN(volume)) return '—';
  if (volume >= 10_000_000) {
    return `${(volume / 10_000_000).toFixed(1)}Cr shares`;
  }
  if (volume >= 1_000_000) {
    return `${(volume / 1_000_000).toFixed(1)}M shares`;
  }
  if (volume >= 1_000) {
    return `${(volume / 1_000).toFixed(1)}K shares`;
  }
  return `${volume.toLocaleString()} shares`;
}

