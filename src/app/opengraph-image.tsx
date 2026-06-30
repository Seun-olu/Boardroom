import { ImageResponse } from "next/og";

export const alt = "Boardroom — real-time collaborative kanban";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "64px 72px",
          background: "linear-gradient(135deg, #0a0a0b 0%, #141416 50%, #1a1a2e 100%)",
          color: "#fff",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
            {[
              { color: "#6366F1", h: 36 },
              { color: "#22D3EE", h: 52 },
              { color: "#10B981", h: 28 },
            ].map((bar) => (
              <div
                key={bar.color}
                style={{
                  width: 14,
                  height: bar.h,
                  background: bar.color,
                  borderRadius: 4,
                }}
              />
            ))}
          </div>
          <span
            style={{
              fontSize: 28,
              fontWeight: 800,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
            }}
          >
            Boardroom
          </span>
        </div>

        <div style={{ display: "flex", flexDirection: "column", maxWidth: 720 }}>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              fontSize: 72,
              fontWeight: 900,
              lineHeight: 0.95,
              letterSpacing: "-0.02em",
              textTransform: "uppercase",
            }}
          >
            <span>Ship together.</span>
            <span style={{ color: "#71717a" }}>In real time.</span>
          </div>
          <p style={{ marginTop: 28, fontSize: 24, color: "#a1a1aa", lineHeight: 1.4 }}>
            Shared kanban with optimistic UI, live presence, and conflict handling.
          </p>
        </div>

        <div style={{ display: "flex", gap: 12 }}>
          {["Live sync", "Drag & drop", "Multiplayer"].map((tag) => (
            <div
              key={tag}
              style={{
                display: "flex",
                padding: "10px 20px",
                borderRadius: 999,
                border: "1px solid #3f3f46",
                background: "rgba(255,255,255,0.04)",
                fontSize: 18,
                color: "#d4d4d8",
              }}
            >
              {tag}
            </div>
          ))}
        </div>
      </div>
    ),
    { ...size }
  );
}
