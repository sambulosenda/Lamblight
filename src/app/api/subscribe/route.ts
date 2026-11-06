import { NextResponse, type NextRequest } from "next/server";
import { addSubscriber, emailConfigured, isEmail, sendEmail } from "@/lib/email";
import { votdEmail } from "@/lib/votd-email";

type Result = "thanks" | "check" | "off" | "error";
const MESSAGES: Record<Result, string> = {
  thanks: "You’re subscribed. Today’s verse is on its way.",
  check: "That doesn’t look like an email address.",
  off: "Daily emails aren’t switched on yet. Please try again soon.",
  error: "Something went wrong on our side. Please try again in a minute.",
};

/** Subscribe to the daily verse. Works as a plain form post (redirects) or from fetch (JSON). */
export async function POST(request: NextRequest) {
  const form = await request.formData();
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const trap = String(form.get("website") ?? ""); // hidden field that only bots fill in
  let result: Result;
  if (trap) result = "thanks";
  else if (!isEmail(email)) result = "check";
  else if (!emailConfigured()) result = "off";
  else {
    try {
      await addSubscriber(email);
      const today = await votdEmail(new Date(), { unsubscribe: false });
      await sendEmail(email, `Welcome to Lamplight. ${today.subject}`, today.html, today.text);
      result = "thanks";
    } catch (e) {
      console.error(e);
      result = "error";
    }
  }
  if (request.headers.get("accept")?.includes("application/json")) {
    return NextResponse.json({ ok: result === "thanks", message: MESSAGES[result] }, { status: result === "thanks" ? 200 : result === "error" ? 502 : 400 });
  }
  return NextResponse.redirect(new URL(`/subscribe/${result === "thanks" ? "thanks" : "sorry"}`, request.url), 303);
}
