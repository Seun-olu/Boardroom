"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { displayNameSchema, emailSchema, friendlyDbError, fromZodError, passwordSchema, type FormState } from "@/lib/forms";
import { createSupabaseServerClient } from "@/lib/supabase/server-client";
import { COLUMN_COLORS } from "@/lib/types";

/**
 * Workspace, board, member and account mutations. Each action validates its
 * input, requires a signed-in user, and then relies on row-level security for
 * authorisation — a forged form can't do more than the user's role allows.
 */

const uuid = z.string().uuid();
const workspaceName = z.string().trim().min(1, "Enter a name.").max(80, "Use at most 80 characters.");
const boardName = z.string().trim().min(1, "Enter a name.").max(120, "Use at most 120 characters.");
const assignableRole = z.enum(["admin", "member", "viewer"]);

const STARTER_LANES = [
  { title: "Todo", color: "#3B82F6" },
  { title: "Doing", color: "#F59E0B" },
  { title: "Done", color: "#10B981" },
];

// ── Workspaces ───────────────────────────────────────────────────────────

export async function createWorkspace(_prev: FormState, form: FormData): Promise<FormState> {
  await requireUser("/w");
  const parsed = z.object({ name: workspaceName }).safeParse({ name: form.get("name") });
  if (!parsed.success) return fromZodError(parsed.error);

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.from("workspaces").insert({ name: parsed.data.name }).select("id").single();
  if (error || !data) return { status: "error", message: friendlyDbError(error, "createWorkspace") };
  redirect(`/w/${data.id}`);
}

export async function renameWorkspace(_prev: FormState, form: FormData): Promise<FormState> {
  const parsed = z.object({ workspaceId: uuid, name: workspaceName }).safeParse(Object.fromEntries(form));
  if (!parsed.success) return fromZodError(parsed.error);
  await requireUser(`/w/${parsed.data.workspaceId}/members`);

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("workspaces")
    .update({ name: parsed.data.name })
    .eq("id", parsed.data.workspaceId)
    .select("id");
  if (error) return { status: "error", message: friendlyDbError(error, "renameWorkspace") };
  if (!data?.length) return { status: "error", message: "Only admins can rename this workspace." };
  revalidatePath(`/w/${parsed.data.workspaceId}`, "layout");
  return { status: "success", message: "Workspace renamed." };
}

export async function deleteWorkspace(_prev: FormState, form: FormData): Promise<FormState> {
  const parsed = z
    .object({ workspaceId: uuid, confirm: z.string(), name: z.string() })
    .safeParse(Object.fromEntries(form));
  if (!parsed.success) return fromZodError(parsed.error);
  if (parsed.data.confirm.trim() !== parsed.data.name) {
    return { status: "error", message: "Type the workspace name exactly to confirm.", fieldErrors: { confirm: "Name doesn't match." } };
  }
  await requireUser("/w");

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.from("workspaces").delete().eq("id", parsed.data.workspaceId).select("id");
  if (error) return { status: "error", message: friendlyDbError(error, "deleteWorkspace") };
  if (!data?.length) return { status: "error", message: "Only the owner can delete this workspace." };
  redirect("/w");
}

// ── Boards ───────────────────────────────────────────────────────────────

export async function createBoard(_prev: FormState, form: FormData): Promise<FormState> {
  const parsed = z
    .object({ workspaceId: uuid, name: boardName, template: z.enum(["blank", "starter"]) })
    .safeParse(Object.fromEntries(form));
  if (!parsed.success) return fromZodError(parsed.error);
  await requireUser(`/w/${parsed.data.workspaceId}`);

  const supabase = await createSupabaseServerClient();
  const { data: board, error } = await supabase
    .from("boards")
    .insert({ workspace_id: parsed.data.workspaceId, name: parsed.data.name })
    .select("id")
    .single();
  if (error || !board) return { status: "error", message: friendlyDbError(error, "createBoard") };

  if (parsed.data.template === "starter") {
    for (const [i, lane] of STARTER_LANES.entries()) {
      const { error: laneError } = await supabase.rpc("apply_board_action", {
        p_board: board.id,
        p_client_action_id: `init:${board.id}:${i}`,
        p_action: { type: "add_column", title: lane.title, color: lane.color, position: i + 1 },
      });
      if (laneError) {
        // The board exists; report the partial result rather than hiding it.
        revalidatePath(`/w/${parsed.data.workspaceId}`);
        return { status: "error", message: "Board created, but its starter lanes couldn't be added." };
      }
    }
  }
  revalidatePath(`/w/${parsed.data.workspaceId}`);
  return { status: "success", message: `Created “${parsed.data.name}”.` };
}

export async function renameBoard(_prev: FormState, form: FormData): Promise<FormState> {
  const parsed = z
    .object({ workspaceId: uuid, boardId: uuid, name: boardName, version: z.coerce.number().int().positive() })
    .safeParse(Object.fromEntries(form));
  if (!parsed.success) return fromZodError(parsed.error);
  await requireUser(`/w/${parsed.data.workspaceId}`);

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("apply_board_action", {
    p_board: parsed.data.boardId,
    p_client_action_id: crypto.randomUUID(),
    p_action: { type: "rename_board", name: parsed.data.name, expectedVersion: parsed.data.version },
  });
  if (error) return { status: "error", message: friendlyDbError(error, "renameBoard") };
  revalidatePath(`/w/${parsed.data.workspaceId}`);
  if ((data as { status?: string } | null)?.status === "conflict") {
    return { status: "error", message: "Someone renamed this board first. The latest name is now shown." };
  }
  return { status: "success", message: "Board renamed." };
}

export async function deleteBoard(_prev: FormState, form: FormData): Promise<FormState> {
  const parsed = z.object({ workspaceId: uuid, boardId: uuid }).safeParse(Object.fromEntries(form));
  if (!parsed.success) return fromZodError(parsed.error);
  await requireUser(`/w/${parsed.data.workspaceId}`);

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.from("boards").delete().eq("id", parsed.data.boardId).select("id");
  if (error) return { status: "error", message: friendlyDbError(error, "deleteBoard") };
  if (!data?.length) return { status: "error", message: "Only admins can delete boards." };
  revalidatePath(`/w/${parsed.data.workspaceId}`);
  return { status: "success", message: "Board deleted." };
}

// ── Members & invites ────────────────────────────────────────────────────

export async function inviteMember(_prev: FormState, form: FormData): Promise<FormState> {
  const parsed = z
    .object({ workspaceId: uuid, email: emailSchema, role: assignableRole })
    .safeParse(Object.fromEntries(form));
  if (!parsed.success) return fromZodError(parsed.error);
  await requireUser(`/w/${parsed.data.workspaceId}/members`);

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("workspace_invites")
    .insert({ workspace_id: parsed.data.workspaceId, email: parsed.data.email, role: parsed.data.role });
  if (error) {
    if (error.code === "23505") return { status: "error", message: `${parsed.data.email} already has an open invite.` };
    return { status: "error", message: friendlyDbError(error, "inviteMember") };
  }
  revalidatePath(`/w/${parsed.data.workspaceId}/members`);
  return { status: "success", message: `Invite created for ${parsed.data.email}. Copy the link below and send it to them.` };
}

export async function revokeInvite(_prev: FormState, form: FormData): Promise<FormState> {
  const parsed = z.object({ workspaceId: uuid, inviteId: uuid }).safeParse(Object.fromEntries(form));
  if (!parsed.success) return fromZodError(parsed.error);
  await requireUser(`/w/${parsed.data.workspaceId}/members`);

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("workspace_invites").delete().eq("id", parsed.data.inviteId);
  if (error) return { status: "error", message: friendlyDbError(error, "revokeInvite") };
  revalidatePath(`/w/${parsed.data.workspaceId}/members`);
  return { status: "success", message: "Invite revoked." };
}

export async function changeRole(_prev: FormState, form: FormData): Promise<FormState> {
  const parsed = z
    .object({ workspaceId: uuid, userId: uuid, role: assignableRole })
    .safeParse(Object.fromEntries(form));
  if (!parsed.success) return fromZodError(parsed.error);
  await requireUser(`/w/${parsed.data.workspaceId}/members`);

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("workspace_members")
    .update({ role: parsed.data.role })
    .eq("workspace_id", parsed.data.workspaceId)
    .eq("user_id", parsed.data.userId)
    .select("user_id");
  if (error) return { status: "error", message: friendlyDbError(error, "changeRole") };
  if (!data?.length) return { status: "error", message: "You can't change that member's role." };
  revalidatePath(`/w/${parsed.data.workspaceId}/members`);
  return { status: "success", message: "Role updated." };
}

export async function removeMember(_prev: FormState, form: FormData): Promise<FormState> {
  const parsed = z.object({ workspaceId: uuid, userId: uuid }).safeParse(Object.fromEntries(form));
  if (!parsed.success) return fromZodError(parsed.error);
  const user = await requireUser(`/w/${parsed.data.workspaceId}/members`);

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("workspace_members")
    .delete()
    .eq("workspace_id", parsed.data.workspaceId)
    .eq("user_id", parsed.data.userId)
    .select("user_id");
  if (error) return { status: "error", message: friendlyDbError(error, "removeMember") };
  if (!data?.length) return { status: "error", message: "You can't remove that member." };
  if (parsed.data.userId === user.id) redirect("/w");
  revalidatePath(`/w/${parsed.data.workspaceId}/members`);
  return { status: "success", message: "Member removed." };
}

export async function acceptInvite(_prev: FormState, form: FormData): Promise<FormState> {
  const parsed = z.object({ token: z.string().regex(/^[0-9a-f]{64}$/) }).safeParse(Object.fromEntries(form));
  if (!parsed.success) return { status: "error", message: "That invite link is malformed." };
  await requireUser(`/invite/${parsed.data.token}`);

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("accept_workspace_invite", { p_token: parsed.data.token });
  if (error || !data) return { status: "error", message: friendlyDbError(error, "acceptInvite") };
  redirect(`/w/${data}`);
}

// ── Account ──────────────────────────────────────────────────────────────

export async function updateProfile(_prev: FormState, form: FormData): Promise<FormState> {
  const parsed = z
    .object({ name: displayNameSchema, color: z.enum(COLUMN_COLORS as [string, ...string[]]) })
    .safeParse(Object.fromEntries(form));
  if (!parsed.success) return fromZodError(parsed.error);
  const user = await requireUser("/account");

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("profiles")
    .update({ display_name: parsed.data.name, avatar_color: parsed.data.color })
    .eq("id", user.id);
  if (error) return { status: "error", message: friendlyDbError(error, "updateProfile") };
  revalidatePath("/", "layout");
  return { status: "success", message: "Profile saved." };
}

export async function updatePassword(_prev: FormState, form: FormData): Promise<FormState> {
  const parsed = z
    .object({ password: passwordSchema, confirm: z.string() })
    .refine((v) => v.password === v.confirm, { message: "Passwords don't match.", path: ["confirm"] })
    .safeParse(Object.fromEntries(form));
  if (!parsed.success) return fromZodError(parsed.error);
  await requireUser("/account");

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) {
    if (error.code === "same_password") return { status: "error", message: "Choose a password you haven't used here." };
    if (error.code === "weak_password") return { status: "error", message: "Choose a stronger password." };
    return { status: "error", message: "Couldn't update the password. Sign in again and retry." };
  }
  return { status: "success", message: "Password updated." };
}
