import { NextRequest, NextResponse } from "next/server";
import { requireSuperAdmin } from "@/lib/super-admin";
import { db } from "@/lib/db";

export async function POST(_req: NextRequest, { params }: { params: Promise<{ eventId: string }> }) {
  const auth = await requireSuperAdmin();
  if ("error" in auth) return auth.error;

  const { eventId } = await params;

  const event = await db.event.findUnique({ where: { id: eventId } });
  if (!event) return NextResponse.json({ error: "Akce nenalezena." }, { status: 404 });

  await db.scanAccessToken.updateMany({ where: { eventId, active: true }, data: { active: false } });

  return NextResponse.json({ ok: true });
}
