import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy",
  description: "What Lamplight stores about you: almost nothing.",
  alternates: { canonical: "/privacy" },
};

export default function PrivacyPage() {
  return (
    <main id="content" className="page prose-page">
      <div>
        <p className="smallcaps-head index-label">Privacy</p>
        <h1 className="index-title">What we keep about you</h1>
        <p className="index-sub">Almost nothing. Last updated [date].</p>
      </div>
      <div className="prose">
        {/* PLACEHOLDER: Sam to review, add the operator's name and contact, and have it checked for your jurisdiction. */}
        <h2>No accounts, no ads, no tracking</h2>
        <p>
          You don’t sign in to read Lamplight. We don’t show ads, sell data, or use advertising or cross-site tracking cookies.
        </p>
        <h2>Kept on your device</h2>
        <p>
          Your browser keeps a few things so the site works the way you left it: the last chapter you read, which chapters you
          have read, your text size and theme, and any notes you write in Study mode. These stay in your browser’s local
          storage. We never receive them, and clearing your browser data removes them.
        </p>
        <h2>The daily verse email</h2>
        <p>
          If you sign up, we keep your email address with our email provider, Resend, only to send you the verse each
          morning. Every email has an unsubscribe link, which removes you from the list.
        </p>
        <h2>Server logs</h2>
        <p>
          Like any website, our hosting provider [Vercel] records basic request logs (such as IP address and pages
          requested) to run and protect the service. [Say how long these are kept.]
        </p>
        <h2>Contact</h2>
        <p>Questions or requests about your data: [contact email].</p>
      </div>
    </main>
  );
}
