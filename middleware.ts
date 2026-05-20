import { NextRequest, NextResponse } from "next/server";

const ALLOWED_COUNTRIES = (process.env.ALLOWED_SITE_COUNTRIES ?? "CZ,SK")
  .split(",")
  .map((c) => c.trim().toUpperCase());

// UUID pattern (v4): 8-4-4-4-12 hex chars
const UUID_RE = "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}";

// Routes with secure, unguessable tokens from email — allowed outside CZ/SK
const GEO_EXEMPT = [
  new RegExp(`^/objednavka/${UUID_RE}(/.*)?$`, "i"), // order detail (publicToken)
  new RegExp(`^/vstupenka/${UUID_RE}(/.*)?$`, "i"),  // ticket detail (ticketToken)
];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Country from Vercel or Cloudflare header
  const countryCode = (
    req.headers.get("x-vercel-ip-country") ??
    req.headers.get("cf-ipcountry")
  )?.toUpperCase() ?? null;

  // Local development: no country header → pass through
  if (!countryCode && process.env.NODE_ENV === "development") {
    return NextResponse.next();
  }

  // CZ/SK → pass through
  if (countryCode && ALLOWED_COUNTRIES.includes(countryCode)) {
    return NextResponse.next();
  }

  // Exempt ticket/order routes with secure UUID tokens
  if (GEO_EXEMPT.some((re) => re.test(pathname))) {
    return NextResponse.next();
  }

  // Block: minimal log + 404 with generic message
  console.log(
    JSON.stringify({
      ts: new Date().toISOString(),
      path: pathname,
      method: req.method,
      country: countryCode ?? "unknown",
      ua: req.headers.get("user-agent") ?? "",
      reason: "site_geo_not_allowed",
    })
  );

  return new NextResponse("Něco se nepodařilo. Zkuste to prosím později.", {
    status: 404,
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}

export const config = {
  matcher: [
    // Skip Next.js internals, static files, and common asset extensions
    "/((?!_next/static|_next/image|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|txt|xml)$).*)",
  ],
};
