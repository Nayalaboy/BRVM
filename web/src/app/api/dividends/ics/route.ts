import { getDividendCalendar, type DividendRow } from "@/lib/api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * iCalendar (.ics) export of the dividend calendar.
 *   /api/dividends/ics             → all upcoming dividends (global)
 *   /api/dividends/ics?ticker=SNTS → that company's dividends (upcoming + past)
 * Each dividend yields an all-day "détachement" event on its ex-date and a
 * "paiement" event on its payment date.
 */
export async function GET(request: Request): Promise<Response> {
  const ticker = new URL(request.url).searchParams.get("ticker")?.toUpperCase();
  const { upcoming, past } = await getDividendCalendar();

  let rows: DividendRow[] = ticker
    ? [...upcoming, ...past].filter((d) => d.ticker === ticker)
    : upcoming;

  const events = rows.flatMap(dividendEvents);
  const ics = buildCalendar(events, ticker);

  return new Response(ics, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="brvm-dividendes${ticker ? `-${ticker}` : ""}.ics"`,
      "Cache-Control": "public, max-age=1800",
    },
  });
}

interface IcsEvent {
  uid: string;
  date: string; // YYYYMMDD
  summary: string;
}

function dividendEvents(d: DividendRow): IcsEvent[] {
  const amount = d.amount === null ? "" : ` — ${formatAmount(d.amount)} FCFA`;
  const out: IcsEvent[] = [];
  if (d.exDate) {
    out.push({
      uid: `${d.ticker}-${d.fiscalYear}-ex@aqlee.invest`,
      date: d.exDate.replaceAll("-", ""),
      summary: `Détachement dividende ${d.ticker}${amount}`,
    });
  }
  if (d.paymentDate) {
    out.push({
      uid: `${d.ticker}-${d.fiscalYear}-pay@aqlee.invest`,
      date: d.paymentDate.replaceAll("-", ""),
      summary: `Paiement dividende ${d.ticker}${amount}`,
    });
  }
  return out;
}

function formatAmount(n: number): string {
  return new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 2 }).format(n);
}

function esc(text: string): string {
  return text.replace(/([,;\\])/g, "\\$1").replace(/\n/g, "\\n");
}

function buildCalendar(events: IcsEvent[], ticker?: string): string {
  const stamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
  const name = ticker ? `Dividendes BRVM ${ticker}` : "Dividendes BRVM";
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Aqlee Invest//BRVM Dividendes//FR",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${esc(name)}`,
    ...events.flatMap((e) => [
      "BEGIN:VEVENT",
      `UID:${e.uid}`,
      `DTSTAMP:${stamp}`,
      `DTSTART;VALUE=DATE:${e.date}`,
      `SUMMARY:${esc(e.summary)}`,
      "TRANSP:TRANSPARENT",
      "END:VEVENT",
    ]),
    "END:VCALENDAR",
  ];
  // CRLF line endings per RFC 5545.
  return lines.join("\r\n") + "\r\n";
}
