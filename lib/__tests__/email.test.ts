import { describe, it, expect, vi, beforeEach } from "vitest";

// --- Provider tests (no DB, no mock needed) ---

describe("sendEmail provider — no RESEND_API_KEY", () => {
  it("does not throw and returns ok in non-production env", async () => {
    const saved = process.env.RESEND_API_KEY;
    delete process.env.RESEND_API_KEY;

    // Use importActual to bypass the vi.mock below that replaces the provider for outbox tests
    const { sendEmail: realSendEmail } = await vi.importActual<typeof import("../email/provider")>("../email/provider");
    const result = await realSendEmail({ to: "a@b.com", subject: "Test", html: "<p>hi</p>" });

    expect(result.ok).toBe(true);
    if (saved !== undefined) process.env.RESEND_API_KEY = saved;
  });
});

// --- Outbox tests (require DB + provider mocks) ---

vi.mock("@/lib/db", () => ({
  db: {
    emailMessage: {
      findUnique: vi.fn(),
      update: vi.fn().mockResolvedValue({}),
      create: vi.fn().mockResolvedValue({ id: "msg-1" }),
    },
  },
}));

vi.mock("../email/provider", () => ({
  sendEmail: vi.fn().mockResolvedValue({ ok: false, error: "SMTP rejected" }),
}));

import { db } from "@/lib/db";
import { sendEmailMessage, enqueueAndTrySend } from "../email/outbox";

beforeEach(() => {
  vi.clearAllMocks();
  (db.emailMessage.update as ReturnType<typeof vi.fn>).mockResolvedValue({});
  (db.emailMessage.create as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "msg-1" });
});

describe("sendEmailMessage — provider failure", () => {
  it("marks message as failed when provider fails", async () => {
    (db.emailMessage.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "msg-1",
      status: "queued",
      to: "test@example.com",
      subject: "Objednávka",
      html: "<p>hi</p>",
    });

    await sendEmailMessage("msg-1");

    const updateCalls = (db.emailMessage.update as ReturnType<typeof vi.fn>).mock.calls;
    const failCall = updateCalls.find((c) => c[0]?.data?.status === "failed");
    expect(failCall).toBeDefined();
    expect(failCall![0].data.error).toBe("SMTP rejected");
  });

  it("skips already-sent messages", async () => {
    (db.emailMessage.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "msg-2",
      status: "sent",
      to: "x@x.com",
      subject: "s",
      html: "<p>h</p>",
    });

    await sendEmailMessage("msg-2");

    expect(db.emailMessage.update).not.toHaveBeenCalled();
  });
});

describe("enqueueAndTrySend — does not throw caller", () => {
  it("resolves without throwing even when DB create fails", async () => {
    (db.emailMessage.create as ReturnType<typeof vi.fn>).mockRejectedValue(new Error("DB down"));

    await expect(
      enqueueAndTrySend({ type: "magic_link", to: "x@x.com", subject: "Test", html: "<p>hi</p>" })
    ).resolves.toBeUndefined();
  });
});
