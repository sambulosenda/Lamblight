import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Support Lamplight",
  description: "Lamplight is free with no ads. Gifts pay for hosting and new translations.",
  alternates: { canonical: "/donate" },
};

const DONATE_URL = process.env.NEXT_PUBLIC_DONATE_URL;

export default function DonatePage() {
  return (
    <main id="content" className="page prose-page">
      <div>
        <p className="smallcaps-head index-label">Support</p>
        <h1 className="index-title">Keep the lamp lit</h1>
        <p className="index-sub">Lamplight is free to read, with no ads and nothing to buy. Gifts keep it that way.</p>
      </div>
      <div className="prose">
        {/* PLACEHOLDER: Sam to confirm what gifts pay for, and whether Lamplight is a charity (tax receipts). */}
        <p>Your gift pays for hosting, the daily verse email, and the work of adding new translations and languages.</p>
        <p>[Is Lamplight a registered charity? If so, say whether gifts are tax-deductible and where.]</p>
      </div>
      {DONATE_URL ? (
        <p>
          <a href={DONATE_URL} className="btn btn--primary" rel="noopener">
            Give to Lamplight
          </a>
        </p>
      ) : (
        <p className="prose-small">Online giving opens soon.</p>
      )}
    </main>
  );
}
