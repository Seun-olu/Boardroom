import { ImageResponse } from "next/og";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#0a0a0b",
          borderRadius: 8,
          border: "1px solid #2a2a2e",
        }}
      >
        <div style={{ display: "flex", gap: 4, alignItems: "flex-end" }}>
          {[
            { color: "#6366F1", h: 16 },
            { color: "#22D3EE", h: 22 },
            { color: "#10B981", h: 12 },
          ].map((bar) => (
            <div
              key={bar.color}
              style={{
                width: 7,
                height: bar.h,
                background: bar.color,
                borderRadius: 2,
              }}
            />
          ))}
        </div>
      </div>
    ),
    { ...size }
  );
}
