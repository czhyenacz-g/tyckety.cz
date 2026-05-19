"use client";

import { useEffect, useState } from "react";

interface Props {
  deadlineIso: string;
}

function calcRemaining(deadlineIso: string) {
  return Math.max(0, new Date(deadlineIso).getTime() - Date.now());
}

export default function Countdown({ deadlineIso }: Props) {
  const [msLeft, setMsLeft] = useState(() => calcRemaining(deadlineIso));

  useEffect(() => {
    const id = setInterval(() => {
      const remaining = calcRemaining(deadlineIso);
      setMsLeft(remaining);
      if (remaining === 0) clearInterval(id);
    }, 1000);
    return () => clearInterval(id);
  }, [deadlineIso]);

  if (msLeft === 0) {
    return <span className="text-red-400 font-semibold">Čas vypršel</span>;
  }

  const totalSeconds = Math.ceil(msLeft / 1000);
  const minutes = Math.floor(totalSeconds / 60).toString().padStart(2, "0");
  const seconds = (totalSeconds % 60).toString().padStart(2, "0");

  const isUrgent = msLeft < 3 * 60 * 1000; // poslední 3 minuty

  return (
    <span className={`font-mono font-bold text-lg ${isUrgent ? "text-red-400" : "text-amber-400"}`}>
      {minutes}:{seconds}
    </span>
  );
}
