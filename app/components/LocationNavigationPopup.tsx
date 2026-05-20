"use client";

import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";

interface Props {
  label: string;
  venueName?: string;
  venueAddress?: string;
  className?: string;
}

function buildNavUrls(venueName?: string, venueAddress?: string, label?: string) {
  const parts = [venueName, venueAddress].filter(Boolean);
  const q = encodeURIComponent(parts.length > 0 ? parts.join(", ") : (label ?? ""));
  return {
    mapyCz: `https://mapy.cz/zakladni?q=${q}`,
    googleMaps: `https://www.google.com/maps/search/?api=1&query=${q}`,
    waze: `https://waze.com/ul?q=${q}&navigate=yes`,
  };
}

export default function LocationNavigationPopup({ label, venueName, venueAddress, className }: Props) {
  const [open, setOpen] = useState(false);
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const urls = buildNavUrls(venueName, venueAddress, label);
  const displayLocation = [venueName, venueAddress].filter(Boolean).join(", ") || label;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`underline decoration-dotted underline-offset-2 hover:text-white transition-colors cursor-pointer ${className ?? ""}`.trim()}
        aria-label={`Navigovat na ${displayLocation}`}
      >
        {label}
      </button>

      {open && createPortal(
        <div
          ref={overlayRef}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          onClick={(e) => { if (e.target === overlayRef.current) setOpen(false); }}
        >
          <div
            className="bg-gray-900 border border-gray-700 rounded-2xl p-6 w-full max-w-xs shadow-2xl"
            role="dialog"
            aria-modal="true"
            aria-labelledby="loc-nav-title"
          >
            <div className="flex items-start justify-between mb-4">
              <div>
                <h2 id="loc-nav-title" className="text-white font-semibold text-base">
                  Navigovat na místo
                </h2>
                <p className="text-gray-400 text-sm mt-0.5">{displayLocation}</p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Zavřít"
                className="text-gray-500 hover:text-white transition-colors ml-3 mt-0.5 flex-shrink-0"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
            <div className="space-y-2.5">
              <NavLink href={urls.mapyCz} label="Navigovat na Mapy.cz" />
              <NavLink href={urls.waze} label="Navigovat ve Waze" />
              <NavLink href={urls.googleMaps} label="Navigovat v Google Maps" />
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}

function NavLink({ href, label }: { href: string; label: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center justify-between w-full px-4 py-3 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-xl text-sm text-gray-200 hover:text-white transition-colors"
    >
      {label}
      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /><polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" />
      </svg>
    </a>
  );
}
