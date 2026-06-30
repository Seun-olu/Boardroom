import type { Metadata } from "next";
import { Toaster } from "sonner";
import "./globals.css";

export const metadata: Metadata = {
  title: "Boardroom — Real-time Kanban",
  description:
    "A real-time shared kanban board demonstrating optimistic UI, connection states, and live collaboration.",
  openGraph: {
    title: "Boardroom",
    description: "Real-time collaborative kanban — built by Oluwaseun Olugbewesa",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-black text-white antialiased">
        {children}
        <Toaster
          position="bottom-right"
          toastOptions={{
            style: {
              background: "#111",
              border: "1px solid #333",
              color: "#fff",
              fontFamily: "monospace",
              fontSize: "12px",
            },
          }}
        />
      </body>
    </html>
  );
}
