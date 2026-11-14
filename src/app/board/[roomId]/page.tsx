import { Suspense } from "react";
import { Boardroom } from "@/components/Boardroom";
import { BoardSkeleton } from "@/components/BoardSkeleton";

interface BoardPageProps {
  params: Promise<{ roomId: string }>;
}

export default async function BoardPage({ params }: BoardPageProps) {
  const { roomId } = await params;
  return (
    <Suspense fallback={<BoardSkeleton />}>
      <Boardroom roomId={roomId} />
    </Suspense>
  );
}
