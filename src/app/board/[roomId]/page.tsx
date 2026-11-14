import { redirect } from "next/navigation";

/**
 * Anonymous share-link boards were retired when Boardroom moved to accounts
 * and workspaces. Old links land on the workspace list (or sign-in).
 */
export default function LegacyBoardPage() {
  redirect("/w");
}
