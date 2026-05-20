import { describe, it, expect } from "vitest";
import { parseRaiffeisenCsv } from "../csv/raiffeisen";

const HEADERS = "Id transakce;Datum zaúčtování;Zaúčtovaná částka;Měna účtu;VS;Typ transakce";

function makeRow(overrides: Partial<Record<string, string>> = {}): string {
  const defaults: Record<string, string> = {
    "Id transakce": "TX001",
    "Datum zaúčtování": "15.03.2025",
    "Zaúčtovaná částka": "299,00",
    "Měna účtu": "CZK",
    VS: "123456",
    "Typ transakce": "Příchozí úhrada",
  };
  const merged = { ...defaults, ...overrides };
  return Object.values(merged).join(";");
}

describe("parseRaiffeisenCsv", () => {
  it("parses a basic incoming CZK payment", () => {
    const csv = [HEADERS, makeRow()].join("\n");
    const { payments, errors } = parseRaiffeisenCsv(csv);
    expect(errors).toHaveLength(0);
    expect(payments).toHaveLength(1);
    expect(payments[0].transactionId).toBe("TX001");
    expect(payments[0].amountCzk).toBe(299);
    expect(payments[0].variableSymbol).toBe("123456");
    expect(payments[0].currency).toBe("CZK");
  });

  it("strips UTF-8 BOM from first line", () => {
    const csv = "﻿" + HEADERS + "\n" + makeRow();
    const { payments, errors } = parseRaiffeisenCsv(csv);
    expect(errors).toHaveLength(0);
    expect(payments).toHaveLength(1);
  });

  it("parses czech decimal comma (1 500,50 → 1501)", () => {
    const csv = [HEADERS, makeRow({ "Zaúčtovaná částka": "1 500,50" })].join("\n");
    const { payments } = parseRaiffeisenCsv(csv);
    expect(payments[0].amountCzk).toBe(1501);
  });

  it("ignores outgoing payments (negative amount)", () => {
    const csv = [HEADERS, makeRow({ "Zaúčtovaná částka": "-500,00", "Typ transakce": "Odchozí úhrada" })].join("\n");
    const { payments } = parseRaiffeisenCsv(csv);
    expect(payments).toHaveLength(0);
  });

  it("ignores non-CZK payments", () => {
    const csv = [HEADERS, makeRow({ "Měna účtu": "EUR" })].join("\n");
    const { payments } = parseRaiffeisenCsv(csv);
    expect(payments).toHaveLength(0);
  });

  it("ignores non-incoming transaction types", () => {
    const csv = [HEADERS, makeRow({ "Typ transakce": "Poplatek" })].join("\n");
    const { payments } = parseRaiffeisenCsv(csv);
    expect(payments).toHaveLength(0);
  });

  it("handles quoted values with semicolons inside", () => {
    const row = `TX002;15.03.2025;"1 000,00";CZK;999;Příchozí úhrada`;
    const csv = [HEADERS, row].join("\n");
    const { payments } = parseRaiffeisenCsv(csv);
    expect(payments).toHaveLength(1);
    expect(payments[0].amountCzk).toBe(1000);
  });

  it("returns unsupportedFormat when required headers are missing", () => {
    const csv = "WrongCol;AnotherCol\n1;2";
    const result = parseRaiffeisenCsv(csv);
    expect(result.unsupportedFormat).toBeDefined();
    expect(result.unsupportedFormat!.missingHeaders).toContain("Id transakce");
    expect(result.unsupportedFormat!.missingHeaders).toContain("VS");
  });

  it("handles empty CSV", () => {
    const result = parseRaiffeisenCsv("");
    expect(result.payments).toHaveLength(0);
    expect(result.errors).toHaveLength(0);
  });

  it("skips blank lines between data rows", () => {
    const csv = [HEADERS, makeRow(), "", makeRow({ "Id transakce": "TX002", VS: "654321" })].join("\n");
    const { payments } = parseRaiffeisenCsv(csv);
    expect(payments).toHaveLength(2);
  });
});
