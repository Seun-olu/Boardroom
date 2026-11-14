import { SubmitButton } from "@/components/app/Form";
import { signInWithGoogle } from "./actions";

export function GoogleButton({ next }: { next: string }) {
  return (
    <form action={signInWithGoogle} className="flex flex-col gap-4">
      <input type="hidden" name="next" value={next} />
      <SubmitButton variant="secondary" pendingLabel="Opening Google…" className="gap-2">
        <svg aria-hidden viewBox="0 0 24 24" className="h-4 w-4">
          <path fill="#EA4335" d="M12 10.2v3.9h5.5c-.24 1.4-1.7 4.1-5.5 4.1-3.3 0-6-2.7-6-6.1s2.7-6.1 6-6.1c1.9 0 3.1.8 3.8 1.5l2.6-2.5C16.8 3.4 14.6 2.4 12 2.4 6.7 2.4 2.4 6.7 2.4 12s4.3 9.6 9.6 9.6c5.5 0 9.2-3.9 9.2-9.4 0-.6-.1-1.1-.2-1.6H12z" />
        </svg>
        Continue with Google
      </SubmitButton>
      <div className="flex items-center gap-3 text-xs text-muted" aria-hidden>
        <span className="h-px flex-1 bg-subtle" /> or <span className="h-px flex-1 bg-subtle" />
      </div>
    </form>
  );
}
