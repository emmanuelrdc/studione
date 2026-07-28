import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { writeAudit, actorFromSession, auditContext } from "@/lib/audit";

export async function POST(request: NextRequest) {
  // Record who logged out (best-effort; session may be null if the token already expired).
  const session = await getSession();
  if (session) {
    writeAudit({
      actor: actorFromSession(session),
      action: "auth.logout",
      entityType: "user",
      entityId: session.userId,
      ...auditContext(request),
    });
  }

  const response = NextResponse.json({ success: true });
  response.cookies.set("token", "", { httpOnly: true, maxAge: 0, path: "/" });
  return response;
}
