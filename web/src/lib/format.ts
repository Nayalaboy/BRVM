/**
 * Financial number formatting. French-first: FCFA amounts always use French
 * thousands separators (narrow no-break space), e.g. "1 250 000 FCFA",
 * regardless of the UI locale.
 */

export const NNBSP = "\u202F";

function frenchDigits(value: number, maxFractionDigits = 0): string {
  return new Intl.NumberFormat("fr-FR", {
    maximumFractionDigits: maxFractionDigits,
    minimumFractionDigits: 0,
  })
    .format(value)
    // Some ICU builds emit U+00A0 for fr-FR grouping; normalize to U+202F.
    .replace(/\u00A0/g, NNBSP);
}

export function formatNumber(value: number, maxFractionDigits = 0): string {
  return frenchDigits(value, maxFractionDigits);
}

export function formatFCFA(value: number, maxFractionDigits = 0): string {
  return `${frenchDigits(value, maxFractionDigits)}${NNBSP}FCFA`;
}

/** Compact FCFA for large amounts, e.g. "12,5 M FCFA" (millions). */
export function formatCompactFCFA(value: number): string {
  const abs = Math.abs(value);
  if (abs >= 1_000_000_000) {
    return `${frenchDigits(value / 1_000_000_000, 1)}${NNBSP}Md${NNBSP}FCFA`;
  }
  if (abs >= 1_000_000) {
    return `${frenchDigits(value / 1_000_000, 1)}${NNBSP}M${NNBSP}FCFA`;
  }
  return formatFCFA(value);
}

/** Percentage with French decimal comma, e.g. "6,4 %". */
export function formatPercent(ratio: number, maxFractionDigits = 1): string {
  return `${frenchDigits(ratio * 100, maxFractionDigits)}${NNBSP}%`;
}

export function formatDate(
  date: string | Date | null | undefined,
  locale: string,
): string {
  if (!date) return "—";
  const d = typeof date === "string" ? new Date(`${date}T00:00:00Z`) : date;
  return new Intl.DateTimeFormat(locale === "fr" ? "fr-FR" : "en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(d);
}
