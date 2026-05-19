/**
 * Generátor SPD (Sdílená Platební Data) QR kódu pro českou mezibankovní platbu.
 * Specifikace: https://qr-platba.cz/pro-vyvojare/specifikace-formatu/
 */

/** Převede český formát účtu "123456-1234567890/0800" na IBAN CZ. */
export function czechAccountToIBAN(raw: string): string | null {
  const m = raw.trim().match(/^(?:(\d{1,6})-)?(\d{1,10})\/(\d{4})$/);
  if (!m) return null;

  const prefix = (m[1] ?? "0").padStart(6, "0");
  const number = m[2].padStart(10, "0");
  const bank = m[3];

  // BBAN = bankCode(4) + prefix(6) + accountNumber(10) = 20 číslic
  const bban = bank + prefix + number;

  // MOD-97: přesuň BBAN na začátek, C=12, Z=35 → "CZ00" → "123500"
  const checkInput = bban + "123500";
  let rem = 0;
  for (const d of checkInput) rem = (rem * 10 + Number(d)) % 97;

  const check = String(98 - rem).padStart(2, "0");
  return `CZ${check}${bban}`;
}

interface SpdParams {
  iban: string;
  amountCzk: number;
  variableSymbol: string;
  message?: string;
}

/** Sestaví SPD řetězec pro QR kód dle standardu ČBA v1.0. */
export function buildSpdString({ iban, amountCzk, variableSymbol, message }: SpdParams): string {
  // Částka musí být ve formátu "350.00" (tečka, 2 des. místa)
  const amount = amountCzk.toFixed(2);
  const parts = [
    "SPD*1.0",
    `ACC:${iban}`,
    `AM:${amount}`,
    "CC:CZK",
    `X-VS:${variableSymbol}`,
  ];
  if (message) parts.push(`MSG:${message.slice(0, 60)}`);
  return parts.join("*");
}
