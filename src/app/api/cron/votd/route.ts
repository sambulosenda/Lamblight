import { NextResponse, type NextRequest } from "next/server";
import { broadcast, emailConfigured } from "@/lib/email";
import { votdEmail } from "@/lib/votd-email";

/** Sends today's verse to every subscriber. Called once a day by the cron in vercel.json. */
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  if (!emailConfigured()) return NextResponse.json({ error: "email not configured" }, { status: 503 });
  const now = new Date();
  const email = await votdEmail(now, { unsubscribe: true });
  const id = await broadcast(`Verse ${now.toISOString().slice(0, 10)}`, email.subject, email.html, email.text);
  return NextResponse.json({ sent: true, broadcast: id, ref: email.ref });
}
