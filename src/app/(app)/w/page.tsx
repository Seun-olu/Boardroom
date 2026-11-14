import type { Metadata } from "next";
import Link from "next/link";
import { CreateWorkspaceForm } from "@/components/app/WorkspaceForms";
import { requireUser } from "@/lib/auth";
import { listMyWorkspaces } from "@/lib/workspaces";

export const metadata: Metadata = { title: "Workspaces" };

export default async function WorkspacesPage() {
  const user = await requireUser("/w");
  const workspaces = await listMyWorkspaces(user.id);

  return (
    <div className="space-y-10">
      <div>
        <h1 className="font-display text-3xl uppercase tracking-tight sm:text-4xl">Workspaces</h1>
        <p className="mt-2 text-sm text-muted">Each workspace has its own boards and members.</p>
      </div>

      {workspaces.length === 0 ? (
        <section className="rounded-2xl border border-dashed border-subtle p-8 text-center">
          <h2 className="text-lg font-semibold">You&apos;re not in a workspace yet</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted">
            Create one for your team below, or open an invite link someone sent you.
          </p>
        </section>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {workspaces.map((w) => (
            <li key={w.id}>
              <Link
                href={`/w/${w.id}`}
                className="flex h-full flex-col rounded-2xl border border-subtle bg-surface p-5 transition-colors hover:border-accent/50"
              >
                <span className="truncate text-lg font-semibold">{w.name}</span>
                <span className="mt-1 font-mono text-xs uppercase tracking-widest text-muted">{w.role}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}

      <section aria-labelledby="new-ws" className="rounded-2xl border border-subtle bg-surface/50 p-5">
        <h2 id="new-ws" className="mb-4 font-mono text-xs uppercase tracking-widest text-muted">
          New workspace
        </h2>
        <CreateWorkspaceForm />
      </section>
    </div>
  );
}
