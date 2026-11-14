import type { Metadata } from "next";
import { HomePage } from "@/components/home/HomePage";
import { getCurrentUser } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Boardroom",
  description:
    "Team workspaces with shared kanban boards: roles, invites, optimistic UI, live presence and versioned edits.",
  openGraph: {
    title: "Boardroom — Ship together in real time",
    description:
      "Create a shared kanban board in seconds. Optimistic UI, live presence, and real-time sync.",
  },
};

export default async function Page() {
  const user = await getCurrentUser();
  return <HomePage signedIn={Boolean(user)} />;
}
