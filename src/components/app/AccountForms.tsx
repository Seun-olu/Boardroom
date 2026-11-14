"use client";

import { updatePassword, updateProfile } from "@/app/(app)/w/actions";
import { COLUMN_COLORS } from "@/lib/types";
import { ActionForm } from "./ActionForm";
import { Field, SubmitButton } from "./Form";

export function ProfileForm({ name, color }: { name: string; color: string }) {
  return (
    <ActionForm action={updateProfile} className="flex flex-col gap-4" aria-label="Profile">
      {(errors) => (
        <>
          <Field id="display-name" name="name" label="Display name" defaultValue={name} maxLength={60} required error={errors?.name} />
          <fieldset>
            <legend className="mb-2 font-mono text-[10px] uppercase tracking-widest text-muted">Avatar colour</legend>
            <div className="flex flex-wrap gap-2">
              {COLUMN_COLORS.map((c) => (
                <label key={c} className="cursor-pointer">
                  <input type="radio" name="color" value={c} defaultChecked={c.toLowerCase() === color.toLowerCase()} className="peer sr-only" />
                  <span
                    className="block h-8 w-8 rounded-full ring-offset-2 ring-offset-base peer-checked:ring-2 peer-checked:ring-white peer-focus-visible:ring-2 peer-focus-visible:ring-accent"
                    style={{ background: c }}
                  />
                  <span className="sr-only">{c}</span>
                </label>
              ))}
            </div>
          </fieldset>
          <div>
            <SubmitButton pendingLabel="Saving…">Save profile</SubmitButton>
          </div>
        </>
      )}
    </ActionForm>
  );
}

export function PasswordForm() {
  return (
    <ActionForm action={updatePassword} resetOnSuccess className="flex flex-col gap-4" aria-label="Change password">
      {(errors) => (
        <>
          <Field id="new-password" name="password" type="password" label="New password" autoComplete="new-password" hint="At least 8 characters." error={errors?.password} />
          <Field id="confirm-password" name="confirm" type="password" label="Confirm new password" autoComplete="new-password" error={errors?.confirm} />
          <div>
            <SubmitButton variant="secondary" pendingLabel="Updating…">
              Update password
            </SubmitButton>
          </div>
        </>
      )}
    </ActionForm>
  );
}
