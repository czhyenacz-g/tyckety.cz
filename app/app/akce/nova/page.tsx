import { redirect } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/auth";
import AppHeader from "@/app/components/AppHeader";
import NovaAkceForm from "./NovaAkceForm";

export default async function NovaAkce() {
  const session = await getSession();
  if (!session) redirect("/prihlaseni?next=/app");

  const { organizer } = session;

  return (
    <>
      <AppHeader name={organizer.name} email={organizer.email} />
      <main className="max-w-2xl mx-auto px-6 py-8">
        <div className="mb-6">
          <Link href="/app/akce" className="text-gray-500 hover:text-white text-sm transition-colors">
            ← Zpět na akce
          </Link>
          <h1 className="text-xl font-bold mt-3">Nová akce</h1>
        </div>
        <NovaAkceForm
          defaultBankAccount={organizer.bankAccount}
          defaultNotificationEmail={organizer.notificationEmail}
        />
      </main>
    </>
  );
}
