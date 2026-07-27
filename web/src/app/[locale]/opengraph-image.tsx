import { ImageResponse } from "next/og";

export const alt = "Aqlee Markets — Intelligence BRVM";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OpengraphImage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const fr = locale === "fr";
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
        <div style={{ display: "flex", alignItems: "center" }}>
          <div
            style={{
              background: "#f59e0b",
              color: "#000",
              fontSize: 40,
              fontWeight: 900,
              padding: "10px 22px",
              textTransform: "uppercase",
              letterSpacing: -1,
            }}
          >
            Aqlee
          </div>
          <div
            style={{
              border: "2px solid #52525b",
              color: "#fff",
              fontSize: 40,
              fontWeight: 900,
              padding: "8px 22px",
              textTransform: "uppercase",
              letterSpacing: -1,
            }}
          >
            Markets
          </div>
        </div>
        <div
          style={{
            color: "#fff",
            fontSize: 88,
            fontWeight: 900,
            lineHeight: 1.02,
            textTransform: "uppercase",
            letterSpacing: -3,
            maxWidth: 1000,
          }}
        >
          {fr ? "La clarté sur les marchés ouest-africains" : "Clarity on West African markets"}
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ color: "#f59e0b", fontSize: 28, fontWeight: 700, letterSpacing: 4 }}>
            BRVM / UEMOA
          </div>
          <div style={{ color: "#71717a", fontSize: 24 }}>
            {fr ? "Dividendes · Sociétés · Intelligence vérifiée" : "Dividends · Companies · Verified intelligence"}
          </div>
        </div>
      </div>
    ),
    size,
  );
}
