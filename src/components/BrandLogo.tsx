import Link from "next/link";
import clsx from "clsx";

interface BrandLogoProps {
  href?: string;
  className?: string;
  size?: "sm" | "md";
}

export function BrandLogo({ href = "/", className, size = "md" }: BrandLogoProps) {
  const isSm = size === "sm";
  const markPad = isSm ? "px-1.5 py-1" : "px-2 py-1.5";
  const bars = isSm
    ? [
        { h: "h-3", color: "bg-accent" },
        { h: "h-4", color: "bg-cyan-400" },
        { h: "h-2.5", color: "bg-emerald-400" },
      ]
    : [
        { h: "h-3", color: "bg-accent" },
        { h: "h-4", color: "bg-cyan-400" },
        { h: "h-2.5", color: "bg-emerald-400" },
      ];
  const barW = isSm ? "w-1" : "w-1.5";
  const textClass = isSm
    ? "text-base font-black sm:text-lg"
    : "text-lg font-black";

  const content = (
    <>
      <div
        className={clsx(
          "flex items-end gap-1 rounded-lg border border-subtle bg-surface",
          markPad
        )}
        aria-hidden
      >
        {bars.map((bar) => (
          <span
            key={bar.color}
            className={clsx(barW, bar.h, "rounded-sm", bar.color)}
          />
        ))}
      </div>
      <span className={clsx("font-display uppercase tracking-tight text-white", textClass)}>
        Boardroom
      </span>
    </>
  );

  const wrapperClass = clsx("inline-flex shrink-0 items-center gap-2.5 sm:gap-3", className);

  if (href) {
    return (
      <Link href={href} className={clsx(wrapperClass, "transition-opacity hover:opacity-90")}>
        {content}
      </Link>
    );
  }

  return <div className={wrapperClass}>{content}</div>;
}
