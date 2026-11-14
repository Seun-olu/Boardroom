import Link from "next/link";
import { BrandLogo } from "@/components/BrandLogo";
import { requireUser } from "@/lib/auth";
import { getProfile } from "@/lib/workspaces";
import { getInitials } from "@/lib/username";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser("/w");
  const profile = await getProfile(user.id);

  return (
    <div className="flex min-h-[100dvh] flex-col bg-base text-white">
      <header className="border-b border-subtle/80 bg-base/60 px-4 py-3 backdrop-blur-md sm:px-6">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
          <BrandLogo href="/w" size="sm" />
          <nav aria-label="Account" className="flex items-center gap-2">
            <Link
              href="/account"
              className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-muted hover:bg-surface hover:text-white"
            >
              <span
                aria-hidden
                className="flex h-7 w-7 items-center justify-center rounded-full text-[11px] font-bold text-black"
                style={{ background: profile.color }}
              >
                {getInitials(profile.name)}
              </span>
              <span className="hidden max-w-[12rem] truncate sm:inline">{profile.name}</span>
            </Link>
            <form action="/auth/sign-out" method="post">
              <button type="submit" className="rounded-lg px-3 py-1.5 font-mono text-[11px] uppercase tracking-widest text-muted hover:bg-surface hover:text-white">
                Sign out
              </button>
            </form>
          </nav>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6 sm:py-10">{children}</main>
    </div>
  );
}
