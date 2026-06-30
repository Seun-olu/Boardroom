import { Suspense } from "react";
import { Boardroom } from "@/components/Boardroom";
import { BoardSkeleton } from "@/components/BoardSkeleton";

interface BoardPageProps {
  params: { roomId: string };
}

export default function BoardPage({ params }: BoardPageProps) {
  return (
    <Suspense fallback={<BoardSkeleton />}>
      <Boardroom roomId={params.roomId} />
    </Suspense>
  );
}
