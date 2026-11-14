import "server-only";
import type { Enums } from "@/lib/database.types";
import { createSupabaseServerClient } from "@/lib/supabase/server-client";

/**
 * Read queries for workspaces, boards and members. All run as the signed-in
 * user, so row-level security decides what comes back; nothing here filters
 * for permission on its own.
 */

export type WorkspaceRole = Enums<"workspace_role">;

export const ROLE_RANK: Record<WorkspaceRole, number> = { viewer: 1, member: 2, admin: 3, owner: 4 };
export const atLeast = (role: WorkspaceRole | null | undefined, min: WorkspaceRole) =>
  role ? ROLE_RANK[role] >= ROLE_RANK[min] : false;

export interface WorkspaceSummary {
  id: string;
  name: string;
  role: WorkspaceRole;
}

export async function listMyWorkspaces(userId: string): Promise<WorkspaceSummary[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("workspace_members")
    .select("role, workspace:workspaces(id, name, created_at)")
    .eq("user_id", userId);
  if (error) throw error;
  return (data ?? [])
    .flatMap((m) => (m.workspace ? [{ id: m.workspace.id, name: m.workspace.name, role: m.role, created: m.workspace.created_at }] : []))
    .sort((a, b) => a.created.localeCompare(b.created))
    .map(({ id, name, role }) => ({ id, name, role }));
}

export async function getWorkspace(workspaceId: string, userId: string) {
  const supabase = await createSupabaseServerClient();
  const [{ data: workspace }, { data: membership }] = await Promise.all([
    supabase.from("workspaces").select("id, name").eq("id", workspaceId).maybeSingle(),
    supabase.from("workspace_members").select("role").eq("workspace_id", workspaceId).eq("user_id", userId).maybeSingle(),
  ]);
  if (!workspace || !membership) return null;
  return { ...workspace, role: membership.role };
}

export interface BoardSummary {
  id: string;
  name: string;
  version: number;
  updatedAt: string;
  lanes: number;
  cards: number;
}

export async function listBoards(workspaceId: string): Promise<BoardSummary[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("boards")
    .select("id, name, version, updated_at, board_columns(count), cards(count)")
    .eq("workspace_id", workspaceId)
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((b) => ({
    id: b.id,
    name: b.name,
    version: b.version,
    updatedAt: b.updated_at,
    lanes: b.board_columns[0]?.count ?? 0,
    cards: b.cards[0]?.count ?? 0,
  }));
}

export interface MemberSummary {
  userId: string;
  role: WorkspaceRole;
  joinedAt: string;
  name: string;
  color: string;
}

export async function listMembers(workspaceId: string): Promise<MemberSummary[]> {
  const supabase = await createSupabaseServerClient();
  const { data: members, error } = await supabase
    .from("workspace_members")
    .select("user_id, role, joined_at")
    .eq("workspace_id", workspaceId);
  if (error) throw error;
  const ids = (members ?? []).map((m) => m.user_id);
  const { data: profiles } = ids.length
    ? await supabase.from("profiles").select("id, display_name, avatar_color").in("id", ids)
    : { data: [] };
  const byId = new Map((profiles ?? []).map((p) => [p.id, p]));
  return (members ?? [])
    .map((m) => ({
      userId: m.user_id,
      role: m.role,
      joinedAt: m.joined_at,
      name: byId.get(m.user_id)?.display_name ?? "Unknown member",
      color: byId.get(m.user_id)?.avatar_color ?? "#71717A",
    }))
    .sort((a, b) => ROLE_RANK[b.role] - ROLE_RANK[a.role] || a.name.localeCompare(b.name));
}

export interface InviteSummary {
  id: string;
  email: string;
  role: WorkspaceRole;
  token: string;
  expiresAt: string;
}

/** Open invites. RLS returns none unless the caller is an admin. */
export async function listOpenInvites(workspaceId: string): Promise<InviteSummary[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("workspace_invites")
    .select("id, email, role, token, expires_at")
    .eq("workspace_id", workspaceId)
    .is("accepted_at", null)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((i) => ({ id: i.id, email: i.email, role: i.role, token: i.token, expiresAt: i.expires_at }));
}

export async function getProfile(userId: string) {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.from("profiles").select("display_name, avatar_color").eq("id", userId).maybeSingle();
  return { name: data?.display_name ?? "You", color: data?.avatar_color ?? "#6366F1" };
}
