import Link from "next/link";

export default function BetaBanner() {
  return (
    <div className="w-full bg-amber-950/80 border-b border-amber-800/50 px-4 py-1.5 text-center">
      <p className="text-xs text-amber-300/90 leading-snug">
        Beta provoz: Tyckety je nové MVP pro malé akce. Používejte na vlastní odpovědnost.{" "}
        <Link
          href="/podminky"
          className="underline underline-offset-2 hover:text-amber-200 transition-colors"
        >
          Podmínky
        </Link>
      </p>
    </div>
  );
}
