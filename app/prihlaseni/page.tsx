import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import Nav from "@/app/components/Nav";
import PrihlaseniForm from "./PrihlaseniForm";

export const metadata: Metadata = { robots: { index: false } };

export default async function Prihlaseni({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; next?: string }>;
}) {
  const session = await getSession();
  if (session) redirect("/app");

  const { error, next } = await searchParams;

  return (
    <>
      <Nav />
      <main className="min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-sm">
          <h1 className="text-2xl font-bold mb-2 text-center">Přihlášení</h1>
          <p className="text-gray-400 text-sm mb-8 text-center">
            Zadejte e-mail a zašleme vám přihlašovací odkaz.
          </p>
          {error === "expired" && (
            <p className="text-red-400 text-sm mb-4 text-center bg-red-900/20 border border-red-800 rounded-lg px-4 py-2">
              Odkaz vypršel nebo byl již použit.
            </p>
          )}
          <PrihlaseniForm next={next} />
        </div>
      </main>
    </>
  );
}
