import { ImageResponse } from "next/og";
import { getCompany } from "@/lib/api";
import { formatNumber } from "@/lib/format";

export const alt = "Fiche société BRVM — Aqlee Markets";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function CompanyOgImage({
  params,
}: {
  params: Promise<{ locale: string; symbol: string }>;
}) {
  const { locale, symbol } = await params;
  const fr = locale === "fr";
  const company = await getCompany(symbol).catch(() => null);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#000",
          padding: 72,
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div
            style={{
              background: "#f59e0b",
              color: "#000",
              fontSize: 56,
              fontWeight: 900,
              padding: "12px 28px",
              letterSpacing: -1,
            }}
          >
            {company?.ticker ?? symbol.toUpperCase()}
          </div>
          <div style={{ color: "#71717a", fontSize: 28, fontWeight: 700, letterSpacing: 3 }}>
            AQLEE MARKETS · BRVM
          </div>
        </div>
        <div
          style={{
            color: "#fff",
            fontSize: 72,
            fontWeight: 900,
            lineHeight: 1.05,
            letterSpacing: -2,
            maxWidth: 1050,
          }}
        >
          {company?.name ?? (fr ? "Société cotée BRVM" : "BRVM listed company")}
        </div>
        <div style={{ display: "flex", gap: 64 }}>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ color: "#71717a", fontSize: 22, letterSpacing: 3 }}>
              {fr ? "DERNIER COURS" : "LAST CLOSE"}
            </div>
            <div style={{ color: "#f59e0b", fontSize: 48, fontWeight: 900 }}>
              {company?.lastClose != null ? `${formatNumber(company.lastClose, 0)} FCFA` : "—"}
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ color: "#71717a", fontSize: 22, letterSpacing: 3 }}>
              {fr ? "RENDEMENT" : "YIELD"}
            </div>
            <div style={{ color: "#fff", fontSize: 48, fontWeight: 900 }}>
              {company?.metrics?.dividendYield != null
                ? `${formatNumber(company.metrics.dividendYield * 100, 1)} %`
                : "—"}
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ color: "#71717a", fontSize: 22, letterSpacing: 3 }}>
              {fr ? "SECTEUR" : "SECTOR"}
            </div>
            <div style={{ color: "#fff", fontSize: 48, fontWeight: 900 }}>
              {company?.sector ?? "—"}
            </div>
          </div>
        </div>
      </div>
    ),
    size,
  );
}
