import type { Metadata, Viewport } from "next";
import { ToasterHost } from "@/components/ui/ToasterHost";
import "./globals.css";

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ?? "http://localhost:3002";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Boardroom",
    template: "%s · Boardroom",
  },
  description:
    "A real-time shared kanban board with optimistic UI, live presence, draggable swimlanes, and conflict handling.",
  applicationName: "Boardroom",
  keywords: [
    "kanban",
    "real-time collaboration",
    "optimistic UI",
    "portfolio",
    "boardroom",
    "supabase",
  ],
  authors: [{ name: "Oluwaseun Olugbewesa" }],
  creator: "Oluwaseun Olugbewesa",
  openGraph: {
    type: "website",
    locale: "en_GB",
    url: siteUrl,
    siteName: "Boardroom",
    title: "Boardroom — Real-time Kanban",
    description:
      "Ship together in real time. Shared kanban with optimistic updates, live presence, and conflict handling.",
    images: [
      {
        url: "/opengraph-image",
        width: 1200,
        height: 630,
        alt: "Boardroom — real-time collaborative kanban",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Boardroom — Real-time Kanban",
    description:
      "Ship together in real time. Shared kanban with optimistic updates and live collaboration.",
    images: ["/opengraph-image"],
  },
  icons: {
    icon: [{ url: "/icon", type: "image/png" }],
    apple: [{ url: "/apple-icon", type: "image/png" }],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0a0a0b",
  viewportFit: "cover",
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
        <ToasterHost />
      </body>
    </html>
  );
}
