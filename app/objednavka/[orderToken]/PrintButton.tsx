"use client";

export default function PrintButton() {
  return (
    <button
      onClick={() => window.print()}
      className="w-full mb-4 py-2.5 rounded-xl border border-gray-600 text-gray-300 hover:text-white hover:border-gray-400 text-sm transition-colors no-print"
    >
      Tisknout vstupenky
    </button>
  );
}
