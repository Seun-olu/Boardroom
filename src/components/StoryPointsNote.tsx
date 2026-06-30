import { STORY_POINTS_HELP } from "@/lib/story-points";

export function StoryPointsNote() {
  return (
    <div className="rounded-xl border border-subtle bg-surface/80 px-4 py-3">
      <p className="font-mono text-[10px] font-semibold uppercase tracking-widest text-accent">
        About story points
      </p>
      <p className="mt-2 text-xs leading-relaxed text-muted">{STORY_POINTS_HELP}</p>
    </div>
  );
}
