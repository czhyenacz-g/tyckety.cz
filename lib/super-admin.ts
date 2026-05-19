import { getSession } from "./auth";
import { NextResponse } from "next/server";

export function isSuperAdmin(email: string): boolean {
  const list = (process.env.SUPER_ADMIN_EMAILS ?? "").split(",").map((e) => e.trim().toLowerCase()).filter(Boolean);
  return list.includes(email.toLowerCase());
}

export async function requireSuperAdmin(): Promise<{ error: NextResponse } | { email: string }> {
  const session = await getSession();
  if (!session) return { error: NextResponse.json({ error: "Nepřihlášen." }, { status: 401 }) };
  if (!isSuperAdmin(session.organizer.email)) return { error: NextResponse.json({ error: "Nedostatečná oprávnění." }, { status: 403 }) };
  return { email: session.organizer.email };
}
