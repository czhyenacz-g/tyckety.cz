const base = (content: string) => `<!DOCTYPE html>
<html lang="cs">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#111827;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#111827;padding:32px 16px;">
    <tr><td align="center">
      <table width="100%" style="max-width:560px;background:#1f2937;border:1px solid #374151;border-radius:12px;overflow:hidden;">
        <tr><td style="padding:24px 32px;border-bottom:1px solid #374151;">
          <span style="font-size:20px;font-weight:700;color:#f59e0b;">Tyckety.cz</span>
        </td></tr>
        <tr><td style="padding:28px 32px;color:#e5e7eb;font-size:15px;line-height:1.6;">
          ${content}
        </td></tr>
        <tr><td style="padding:16px 32px;border-top:1px solid #374151;color:#6b7280;font-size:12px;">
          Tyckety.cz — online prodej vstupenek
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

export function magicLinkTemplate(link: string): { subject: string; html: string } {
  return {
    subject: "Váš přihlašovací odkaz — Tyckety.cz",
    html: base(`
      <h2 style="margin:0 0 16px;color:#fff;font-size:20px;">Přihlašovací odkaz</h2>
      <p style="margin:0 0 24px;color:#9ca3af;">Klikněte na tlačítko níže pro přihlášení. Odkaz platí 15 minut.</p>
      <a href="${link}" style="display:inline-block;background:#f59e0b;color:#111827;font-weight:700;padding:12px 28px;border-radius:8px;text-decoration:none;font-size:15px;">Přihlásit se →</a>
      <p style="margin:24px 0 0;color:#6b7280;font-size:13px;">Pokud jste odkaz nevyžádali, ignorujte tento e-mail.</p>
    `),
  };
}

export function orderCreatedCustomerTemplate(d: {
  buyerName: string;
  eventTitle: string;
  eventDate: string;
  venueName?: string | null;
  quantity: number;
  totalAmountCzk: number;
  variableSymbol: string;
  bankAccount: string;
  orderUrl: string;
  paymentDeadline: string;
}): { subject: string; html: string } {
  return {
    subject: `Objednávka vstupenek — ${d.eventTitle}`,
    html: base(`
      <h2 style="margin:0 0 8px;color:#fff;font-size:20px;">Objednávka přijata</h2>
      <p style="margin:0 0 20px;color:#9ca3af;">Ahoj ${d.buyerName}, vaše objednávka byla přijata.</p>
      <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:20px;">
        <tr><td style="color:#9ca3af;padding:6px 0;border-bottom:1px solid #374151;">Akce</td><td style="color:#fff;text-align:right;padding:6px 0;border-bottom:1px solid #374151;">${d.eventTitle}</td></tr>
        <tr><td style="color:#9ca3af;padding:6px 0;border-bottom:1px solid #374151;">Datum</td><td style="color:#fff;text-align:right;padding:6px 0;border-bottom:1px solid #374151;">${d.eventDate}</td></tr>
        ${d.venueName ? `<tr><td style="color:#9ca3af;padding:6px 0;border-bottom:1px solid #374151;">Místo</td><td style="color:#fff;text-align:right;padding:6px 0;border-bottom:1px solid #374151;">${d.venueName}</td></tr>` : ""}
        <tr><td style="color:#9ca3af;padding:6px 0;border-bottom:1px solid #374151;">Počet vstupenek</td><td style="color:#fff;text-align:right;padding:6px 0;border-bottom:1px solid #374151;">${d.quantity} ks</td></tr>
        <tr><td style="color:#9ca3af;padding:6px 0;border-bottom:1px solid #374151;">Celkem</td><td style="color:#f59e0b;font-weight:700;text-align:right;padding:6px 0;border-bottom:1px solid #374151;">${d.totalAmountCzk.toLocaleString("cs-CZ")} Kč</td></tr>
      </table>
      <div style="background:#111827;border:1px solid #374151;border-radius:8px;padding:16px;margin-bottom:16px;">
        <p style="margin:0 0 8px;color:#9ca3af;font-size:13px;">Platební instrukce</p>
        <p style="margin:0 0 4px;color:#fff;">Číslo účtu: <strong>${d.bankAccount}</strong></p>
        <p style="margin:0 0 4px;color:#fff;">Variabilní symbol: <strong style="font-size:18px;color:#f59e0b;">${d.variableSymbol}</strong></p>
        <p style="margin:8px 0 0;color:#6b7280;font-size:13px;">Splatnost: ${d.paymentDeadline}</p>
      </div>
      <p style="margin:0 0 20px;color:#9ca3af;font-size:13px;line-height:1.5;">Vstupenky obvykle dorazí do 1 hodiny po potvrzení platby pořadatelem. U malých akcí platbu potvrzuje pořadatel ručně.</p>
      <a href="${d.orderUrl}" style="display:inline-block;background:#374151;color:#fff;font-weight:600;padding:10px 20px;border-radius:8px;text-decoration:none;font-size:14px;">Zobrazit objednávku →</a>
    `),
  };
}

export function orderCreatedOrganizerTemplate(d: {
  buyerName: string;
  buyerEmail: string;
  eventTitle: string;
  quantity: number;
  totalAmountCzk: number;
  variableSymbol: string;
  orderUrl: string;
}): { subject: string; html: string } {
  return {
    subject: `Nová objednávka — ${d.eventTitle}`,
    html: base(`
      <h2 style="margin:0 0 8px;color:#fff;font-size:20px;">Nová objednávka</h2>
      <p style="margin:0 0 20px;color:#9ca3af;">Na akci <strong style="color:#fff;">${d.eventTitle}</strong> přišla nová objednávka.</p>
      <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:20px;">
        <tr><td style="color:#9ca3af;padding:6px 0;border-bottom:1px solid #374151;">Zákazník</td><td style="color:#fff;text-align:right;padding:6px 0;border-bottom:1px solid #374151;">${d.buyerName}</td></tr>
        <tr><td style="color:#9ca3af;padding:6px 0;border-bottom:1px solid #374151;">E-mail</td><td style="color:#fff;text-align:right;padding:6px 0;border-bottom:1px solid #374151;">${d.buyerEmail}</td></tr>
        <tr><td style="color:#9ca3af;padding:6px 0;border-bottom:1px solid #374151;">Počet vstupenek</td><td style="color:#fff;text-align:right;padding:6px 0;border-bottom:1px solid #374151;">${d.quantity} ks</td></tr>
        <tr><td style="color:#9ca3af;padding:6px 0;border-bottom:1px solid #374151;">Celkem</td><td style="color:#f59e0b;font-weight:700;text-align:right;padding:6px 0;border-bottom:1px solid #374151;">${d.totalAmountCzk.toLocaleString("cs-CZ")} Kč</td></tr>
        <tr><td style="color:#9ca3af;padding:6px 0;">Variabilní symbol</td><td style="color:#f59e0b;font-weight:700;text-align:right;padding:6px 0;">${d.variableSymbol}</td></tr>
      </table>
      <a href="${d.orderUrl}" style="display:inline-block;background:#374151;color:#fff;font-weight:600;padding:10px 20px;border-radius:8px;text-decoration:none;font-size:14px;">Zobrazit objednávku →</a>
    `),
  };
}

export function ticketsIssuedTemplate(d: {
  buyerName: string;
  eventTitle: string;
  eventDate: string;
  venueName?: string | null;
  quantity: number;
  orderUrl: string;
}): { subject: string; html: string } {
  return {
    subject: `Vstupenky vydány — ${d.eventTitle}`,
    html: base(`
      <h2 style="margin:0 0 8px;color:#fff;font-size:20px;">Vstupenky jsou připraveny</h2>
      <p style="margin:0 0 20px;color:#9ca3af;">Ahoj ${d.buyerName}, vaše vstupenky na akci <strong style="color:#fff;">${d.eventTitle}</strong> byly vydány.</p>
      <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:20px;">
        <tr><td style="color:#9ca3af;padding:6px 0;border-bottom:1px solid #374151;">Datum akce</td><td style="color:#fff;text-align:right;padding:6px 0;border-bottom:1px solid #374151;">${d.eventDate}</td></tr>
        ${d.venueName ? `<tr><td style="color:#9ca3af;padding:6px 0;border-bottom:1px solid #374151;">Místo</td><td style="color:#fff;text-align:right;padding:6px 0;border-bottom:1px solid #374151;">${d.venueName}</td></tr>` : ""}
        <tr><td style="color:#9ca3af;padding:6px 0;">Počet vstupenek</td><td style="color:#fff;text-align:right;padding:6px 0;">${d.quantity} ks</td></tr>
      </table>
      <a href="${d.orderUrl}" style="display:inline-block;background:#f59e0b;color:#111827;font-weight:700;padding:12px 28px;border-radius:8px;text-decoration:none;font-size:15px;">Zobrazit vstupenky →</a>
    `),
  };
}

export function pendingReviewAdminTemplate(d: {
  eventTitle: string;
  eventId: string;
  eventSlug: string;
  startsAt: string;
  venueName?: string | null;
  venueAddress?: string | null;
  organizerName: string;
  organizerEmail: string;
  organizerIco?: string | null;
  bankAccount: string;
  categoryCount: number;
  totalCapacity: number;
  adminUrl: string;
  submittedAt: string;
}): { subject: string; html: string } {
  const row = (label: string, value: string, last = false) =>
    `<tr><td style="color:#9ca3af;padding:6px 0;${last ? "" : "border-bottom:1px solid #374151;"}">${label}</td>` +
    `<td style="color:#fff;text-align:right;padding:6px 0;${last ? "" : "border-bottom:1px solid #374151;"}">${value}</td></tr>`;

  return {
    subject: `Nová akce čeká na schválení: ${d.eventTitle}`,
    html: base(`
      <h2 style="margin:0 0 16px;color:#fff;font-size:20px;">Nová akce ke schválení</h2>
      <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
        ${row("Název akce", d.eventTitle)}
        ${row("Slug", `<span style="font-size:12px;color:#6b7280;">${d.eventSlug}</span>`)}
        ${row("Datum a čas", d.startsAt)}
        ${d.venueName ? row("Místo", `${d.venueName}${d.venueAddress ? ", " + d.venueAddress : ""}`) : ""}
        ${row("Pořadatel", d.organizerName)}
        ${row("E-mail pořadatele", d.organizerEmail)}
        ${d.organizerIco ? row("IČO", d.organizerIco) : ""}
        ${row("Bankovní účet", d.bankAccount)}
        ${row("Typy vstupenek", String(d.categoryCount))}
        ${row("Celková kapacita", String(d.totalCapacity))}
        ${row("Odesláno ke schválení", d.submittedAt, true)}
      </table>
      <a href="${d.adminUrl}" style="display:inline-block;background:#f59e0b;color:#111827;font-weight:700;padding:12px 28px;border-radius:8px;text-decoration:none;font-size:15px;">Zkontrolovat akci →</a>
      <p style="margin:20px 0 0;color:#6b7280;font-size:12px;">ID akce: ${d.eventId}</p>
    `),
  };
}
