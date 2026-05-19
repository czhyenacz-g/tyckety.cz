"use client";

import { useState } from "react";

export default function OrderLinkActions() {
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopyFeedback("✓ Odkaz zkopírován");
    } catch {
      setCopyFeedback(window.location.href);
    }
    setTimeout(() => setCopyFeedback(null), 3000);
  }

  async function handleShare() {
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({
          title: "Objednávka vstupenek",
          text: "Odkaz na moji objednávku vstupenek",
          url: window.location.href,
        });
        return;
      } catch {
        // user cancelled or share failed — fall through to copy
      }
    }
    await handleCopy();
  }

  return (
    <div className="mt-4">
      <p className="text-xs text-gray-500 mb-3 leading-relaxed">
        Uložte si odkaz na objednávku. Po potvrzení platby se tady zobrazí vstupenky.
      </p>
      <div className="flex flex-col sm:flex-row gap-2">
        <button
          onClick={handleCopy}
          className="flex-1 py-2 px-3 rounded-lg text-xs font-medium border border-gray-600 text-gray-300 hover:border-gray-500 hover:text-white transition-colors"
        >
          Zkopírovat odkaz na objednávku
        </button>
        <button
          onClick={handleShare}
          className="flex-1 py-2 px-3 rounded-lg text-xs font-medium border border-gray-600 text-gray-300 hover:border-gray-500 hover:text-white transition-colors"
        >
          Sdílet / uložit odkaz
        </button>
      </div>
      {copyFeedback && (
        <p className="text-xs text-amber-400 mt-2 break-all">{copyFeedback}</p>
      )}
    </div>
  );
}
