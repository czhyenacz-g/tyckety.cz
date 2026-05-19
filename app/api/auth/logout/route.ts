import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { db } from "@/lib/db";

export async function POST(req: NextRequest) {
  const cookieStore = await cookies();
  const token = cookieStore.get("session")?.value;

  if (token) {
    await db.session.deleteMany({ where: { token } }).catch(() => {});
  }

  const response = NextResponse.redirect(new URL("/prihlaseni", req.url));
  response.cookies.delete("session");
  return response;
}
