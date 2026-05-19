export interface ParsedPayment {
  transactionId: string;
  paymentDate: Date;
  amountCzk: number;
  currency: string;
  variableSymbol: string | null;
  ownAccount: string;
  counterpartyAccount: string | null;
  counterpartyName: string | null;
  transactionType: string;
  message: string | null;
}

export interface ParseError {
  line: number;
  error: string;
}

export interface ParseResult {
  payments: ParsedPayment[];
  errors: ParseError[];
  unsupportedFormat?: { missingHeaders: string[] };
}

const REQUIRED_HEADERS = [
  "Id transakce",
  "Datum zaúčtování",
  "Zaúčtovaná částka",
  "Měna účtu",
  "VS",
  "Typ transakce",
] as const;

function stripBom(s: string): string {
  return s.charCodeAt(0) === 0xfeff ? s.slice(1) : s;
}

function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        current += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ";") {
        result.push(current);
        current = "";
      } else {
        current += ch;
      }
    }
  }
  result.push(current);
  return result;
}

function parseAmount(raw: string): number {
  const normalized = raw.trim().replace(/\s/g, "").replace(",", ".");
  const amount = parseFloat(normalized);
  if (isNaN(amount)) throw new Error(`Neplatná částka: ${raw}`);
  return Math.round(amount);
}

function parseDate(raw: string): Date {
  const parts = raw.trim().split(".");
  if (parts.length !== 3) throw new Error(`Neplatné datum: ${raw}`);
  const [day, month, year] = parts.map(Number);
  const d = new Date(year, month - 1, day);
  if (isNaN(d.getTime())) throw new Error(`Neplatné datum: ${raw}`);
  return d;
}

export function parseRaiffeisenCsv(csvContent: string): ParseResult {
  const content = stripBom(csvContent);
  const lines = content.split(/\r?\n/);

  if (lines.length < 2) {
    return { payments: [], errors: [] };
  }

  const headers = parseCsvLine(lines[0]).map((h) => h.trim());

  const missingHeaders = REQUIRED_HEADERS.filter((h) => !headers.includes(h));
  if (missingHeaders.length > 0) {
    return { payments: [], errors: [], unsupportedFormat: { missingHeaders } };
  }

  const payments: ParsedPayment[] = [];
  const errors: ParseError[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim()) continue;

    try {
      const values = parseCsvLine(line);
      const row: Record<string, string> = {};
      headers.forEach((h, idx) => {
        row[h] = values[idx]?.trim() ?? "";
      });

      const amountRaw = row["Zaúčtovaná částka"] ?? "";
      if (!amountRaw) continue;

      const amount = parseAmount(amountRaw);
      const currency = row["Měna účtu"] ?? "";
      const type = row["Typ transakce"] ?? "";

      // Pouze příchozí platby v CZK
      if (amount <= 0) continue;
      if (currency !== "CZK") continue;
      if (type && type !== "Příchozí úhrada") continue;

      const transactionId = row["Id transakce"];
      if (!transactionId) {
        errors.push({ line: i + 1, error: "Chybí Id transakce" });
        continue;
      }

      const paymentDate = parseDate(row["Datum zaúčtování"] ?? "");
      const vs = row["VS"]?.trim() || null;

      payments.push({
        transactionId,
        paymentDate,
        amountCzk: amount,
        currency,
        variableSymbol: vs,
        ownAccount: row["Číslo účtu"] ?? "",
        counterpartyAccount: row["Číslo protiúčtu"] || null,
        counterpartyName: row["Název protiúčtu"] || null,
        transactionType: type,
        message: row["Zpráva"] || null,
      });
    } catch (err) {
      errors.push({
        line: i + 1,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  return { payments, errors };
}
