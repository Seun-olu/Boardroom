import { BrandLogo } from "@/components/BrandLogo";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-[100dvh] flex-col bg-base text-white">
      <header className="border-b border-subtle/80 px-4 py-4 sm:px-6">
        <BrandLogo href="/" size="sm" />
      </header>
      <main className="flex flex-1 items-start justify-center px-4 py-12 sm:items-center sm:py-16">
        <div className="w-full max-w-sm">{children}</div>
      </main>
    </div>
  );
}
