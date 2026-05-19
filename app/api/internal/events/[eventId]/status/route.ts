import { NextRequest, NextResponse } from "next/server";
import { requireSuperAdmin } from "@/lib/super-admin";
import { db } from "@/lib/db";

const ALLOWED_STATUSES = ["draft", "published", "cancelled", "ended"] as const;
type AllowedStatus = (typeof ALLOWED_STATUSES)[number];

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ eventId: string }> }) {
  const auth = await requireSuperAdmin();
  if ("error" in auth) return auth.error;

  const { eventId } = await params;
  const body = await req.json().catch(() => ({}));
  const { status } = body;

  if (!ALLOWED_STATUSES.includes(status as AllowedStatus)) {
    return NextResponse.json({ error: "Neplatný status." }, { status: 400 });
  }

  const event = await db.event.findUnique({ where: { id: eventId } });
  if (!event) return NextResponse.json({ error: "Akce nenalezena." }, { status: 404 });

  await db.event.update({ where: { id: eventId }, data: { status: status as AllowedStatus } });

  return NextResponse.json({ ok: true });
}
