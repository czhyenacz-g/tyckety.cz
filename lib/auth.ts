import { cookies } from "next/headers";
import { db } from "./db";

export async function getSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get("session")?.value;
  if (!token) return null;

  const session = await db.session.findUnique({
    where: { token },
    include: { organizer: true },
  });

  if (!session || session.expiresAt < new Date()) return null;
  return session;
}
