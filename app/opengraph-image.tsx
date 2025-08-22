import { ImageResponse } from "next/og";

export const runtime = "edge";
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

export default async function Image() {
  const title =
    "Albion Online Black Market Flipping Tool | Real-Time Profitable Trades";
  const description =
    "Find profitable flips with real-time data. Private database. Fast.";

  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "flex-start",
          background: "#0B0B0F",
          color: "#fff",
          padding: 64,
        }}
      >
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 12,
            marginBottom: 24,
            fontSize: 36,
            fontWeight: 700,
          }}
        >
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: 8,
              background: "#7C3AED",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: 800,
            }}
          >
            F
          </div>
          Flipper
        </div>
        <div style={{ fontSize: 56, fontWeight: 800, lineHeight: 1.1 }}>
          {title}
        </div>
        <div style={{ marginTop: 18, fontSize: 28, opacity: 0.8 }}>
          {description}
        </div>
        <div style={{ marginTop: 40, fontSize: 24, opacity: 0.7 }}>
          flipper.mattiaswiberg.com
        </div>
      </div>
    ),
    size
  );
}
