import { NextResponse } from "next/server";

/**
 * Retired: this API served the anonymous single-JSON-row boards. Boards now
 * live in the relational schema and are edited through the
 * `apply_board_action` RPC under the signed-in user's permissions.
 */
const gone = () =>
  NextResponse.json({ error: "This API has been retired. Sign in at /sign-in to use boards." }, { status: 410 });

export const GET = gone;
export const POST = gone;
