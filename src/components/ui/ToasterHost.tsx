"use client";

import { Toaster } from "sonner";

export function ToasterHost() {
  return (
    <Toaster
      position="bottom-center"
      offset={16}
      mobileOffset={{ bottom: 16 }}
      toastOptions={{
        style: {
          background: "#111",
          border: "1px solid #333",
          color: "#fff",
          fontFamily: "monospace",
          fontSize: "12px",
          maxWidth: "min(100vw - 2rem, 360px)",
        },
      }}
    />
  );
}
