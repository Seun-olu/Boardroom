import type { Metadata } from "next";
import { safeNext } from "@/lib/auth";
import { SignUpForm } from "../AuthForms";

export const metadata: Metadata = { title: "Create account" };

export default async function SignUpPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  return (
    <>
      <h1 className="font-display text-3xl uppercase tracking-tight">Create account</h1>
      <p className="mb-8 mt-2 text-sm text-muted">Workspaces, boards and real-time collaboration for your team.</p>
      <SignUpForm next={safeNext(next)} />
    </>
  );
}
