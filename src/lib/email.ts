import "server-only";

/**
 * Verse-of-the-day email through Resend (https://resend.com).
 *
 * Subscribers are kept as contacts in one Resend audience, so we store no
 * email addresses ourselves; Resend handles unsubscribes. Each morning a cron
 * job sends that day's verse to the audience as a broadcast.
 *
 *   RESEND_API_KEY      API key with full access
 *   RESEND_AUDIENCE_ID  the audience that holds subscribers
 *   EMAIL_FROM          e.g. "Lamplight <verse@yourdomain>" on a domain verified in Resend
 *   CRON_SECRET         shared secret the cron request must send
 */
const API = process.env.RESEND_API_URL ?? "https://api.resend.com"; // override only for local testing

export function emailConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY && process.env.RESEND_AUDIENCE_ID && process.env.EMAIL_FROM);
}

async function resend<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Resend ${path} failed: ${res.status} ${await res.text()}`);
  return (await res.json()) as T;
}

/** Add (or re-subscribe) a contact in the subscriber audience. */
export async function addSubscriber(email: string): Promise<void> {
  await resend(`/audiences/${process.env.RESEND_AUDIENCE_ID}/contacts`, { email, unsubscribed: false });
}

export async function sendEmail(to: string, subject: string, html: string, text: string): Promise<void> {
  await resend("/emails", { from: process.env.EMAIL_FROM, to, subject, html, text });
}

/** Send one email to everyone in the audience. Resend fills in the unsubscribe link. */
export async function broadcast(name: string, subject: string, html: string, text: string): Promise<string> {
  const { id } = await resend<{ id: string }>("/broadcasts", {
    audience_id: process.env.RESEND_AUDIENCE_ID,
    from: process.env.EMAIL_FROM,
    name,
    subject,
    html,
    text,
  });
  await resend(`/broadcasts/${id}/send`, {});
  return id;
}

/** A plain check, not full RFC 5322: something@something.tld, no spaces. */
export function isEmail(value: string): boolean {
  return value.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value);
}
