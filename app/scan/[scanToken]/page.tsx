import { db } from "@/lib/db";
import ScannerForm from "./ScannerForm";

export default async function ScanPage({
  params,
}: {
  params: Promise<{ scanToken: string }>;
}) {
  const { scanToken } = await params;

  const scanAccess = await db.scanAccessToken.findUnique({
    where: { token: scanToken },
    include: {
      event: { select: { title: true, startsAt: true } },
    },
  });

  if (!scanAccess || !scanAccess.active) {
    return (
      <main className="min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-sm text-center space-y-3">
          <p className="text-red-400 text-4xl font-bold">✕</p>
          <h1 className="text-xl font-bold">Neplatný odkaz</h1>
          <p className="text-gray-400 text-sm">
            Tento odkaz pro vstupní kontrolu je neplatný nebo byl deaktivován.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen max-w-sm mx-auto px-4 py-10">
      <ScannerForm scanToken={scanToken} eventTitle={scanAccess.event.title} />
    </main>
  );
}
