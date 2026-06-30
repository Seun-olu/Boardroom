import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(145deg, #0a0a0b 0%, #141416 100%)",
          borderRadius: 36,
          border: "2px solid #2a2a2e",
        }}
      >
        <div style={{ display: "flex", gap: 10, alignItems: "flex-end", marginBottom: 16 }}>
          {[
            { color: "#6366F1", h: 48 },
            { color: "#22D3EE", h: 72 },
            { color: "#10B981", h: 40 },
          ].map((bar) => (
            <div
              key={bar.color}
              style={{
                width: 22,
                height: bar.h,
                background: bar.color,
                borderRadius: 6,
              }}
            />
          ))}
        </div>
        <div
          style={{
            fontSize: 22,
            fontWeight: 900,
            letterSpacing: "0.08em",
            color: "#ffffff",
            textTransform: "uppercase",
          }}
        >
          BR
        </div>
      </div>
    ),
    { ...size }
  );
}
