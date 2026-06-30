import type { Metadata } from "next";
import { HomePage } from "@/components/home/HomePage";

export const metadata: Metadata = {
  title: "Boardroom",
  description:
    "Create a shared kanban board in seconds. Optimistic UI, live presence, and real-time sync for teams.",
  openGraph: {
    title: "Boardroom — Ship together in real time",
    description:
      "Create a shared kanban board in seconds. Optimistic UI, live presence, and real-time sync.",
  },
};

export default function Page() {
  return <HomePage />;
}
