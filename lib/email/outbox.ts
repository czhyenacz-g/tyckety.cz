import type { EmailType } from "@prisma/client";
import { db } from "@/lib/db";
import { sendEmail } from "./provider";

interface EnqueueParams {
  type: EmailType;
  to: string;
  subject: string;
  html: string;
  orderId?: string;
  eventId?: string;
}

export async function enqueueEmail(params: EnqueueParams) {
  return db.emailMessage.create({
    data: {
      type: params.type,
      status: "queued",
      to: params.to,
      subject: params.subject,
      html: params.html,
      orderId: params.orderId ?? null,
      eventId: params.eventId ?? null,
    },
  });
}

export async function sendEmailMessage(id: string): Promise<void> {
  const msg = await db.emailMessage.findUnique({ where: { id } });
  if (!msg || msg.status === "sent") return;

  await db.emailMessage.update({ where: { id }, data: { status: "sending" } });

  const result = await sendEmail({ to: msg.to, subject: msg.subject, html: msg.html });

  if (result.ok) {
    await db.emailMessage.update({
      where: { id },
      data: { status: "sent", sentAt: new Date() },
    });
  } else {
    await db.emailMessage.update({
      where: { id },
      data: { status: "failed", error: result.error ?? "Unknown error" },
    });
  }
}

export async function enqueueAndTrySend(params: EnqueueParams): Promise<void> {
  try {
    const msg = await enqueueEmail(params);
    await sendEmailMessage(msg.id);
  } catch (err) {
    console.error("[email:outbox]", err);
  }
}
