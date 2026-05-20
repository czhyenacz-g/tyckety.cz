import { db } from "./db";

export const FREE_TICKET_LIMIT = 666;
export const SUPPORT_HINT_TICKET_COUNT = 200;
export const NEARING_TICKET_COUNT = 500;

export type UsageThresholdState = "ok" | "support_hint" | "nearing" | "exceeded";

export function getUsageThresholdState(count: number): UsageThresholdState {
  if (count >= FREE_TICKET_LIMIT) return "exceeded";
  if (count >= NEARING_TICKET_COUNT) return "nearing";
  if (count >= SUPPORT_HINT_TICKET_COUNT) return "support_hint";
  return "ok";
}

export async function getOrganizerIssuedTicketCount(organizerId: string): Promise<number> {
  return db.ticket.count({
    where: {
      status: { in: ["issued", "used"] },
      event: { organizerId },
    },
  });
}
