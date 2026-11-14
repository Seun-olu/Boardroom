import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BoardScreen } from "@/components/app/BoardScreen";
import { requireUser } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server-client";
import { atLeast, getProfile, getWorkspace, listMembers } from "@/lib/workspaces";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

interface Props {
  params: Promise<{ workspaceId: string; boardId: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { boardId } = await params;
  if (!UUID.test(boardId)) return {};
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.from("boards").select("name").eq("id", boardId).maybeSingle();
  return data ? { title: data.name } : {};
}

export default async function BoardPage({ params }: Props) {
  const { workspaceId, boardId } = await params;
  const user = await requireUser(`/w/${workspaceId}/b/${boardId}`);
  if (!UUID.test(workspaceId) || !UUID.test(boardId)) notFound();

  const supabase = await createSupabaseServerClient();
  const [workspace, boardRes, columnsRes, cardsRes, members, me] = await Promise.all([
    getWorkspace(workspaceId, user.id),
    supabase.from("boards").select("*").eq("id", boardId).eq("workspace_id", workspaceId).maybeSingle(),
    supabase.from("board_columns").select("*").eq("board_id", boardId),
    supabase.from("cards").select("*").eq("board_id", boardId),
    listMembers(workspaceId),
    getProfile(user.id),
  ]);
  // RLS hides boards outside the caller's workspaces; treat that as not found.
  if (!workspace || !boardRes.data) notFound();

  return (
    <BoardScreen
      workspace={{ id: workspace.id, name: workspace.name }}
      init={{
        board: boardRes.data,
        columns: columnsRes.data ?? [],
        cards: cardsRes.data ?? [],
        names: Object.fromEntries(members.map((m) => [m.userId, m.name])),
        me: { id: user.id, name: me.name, color: me.color },
        canEdit: atLeast(workspace.role, "member"),
      }}
    />
  );
}
