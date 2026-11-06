import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "About Lamplight",
  description: "Lamplight is a free Bible website with no ads and no store: clean reading, fast search and word study.",
  alternates: { canonical: "/about" },
};

export default function AboutPage() {
  return (
    <main id="content" className="page prose-page">
      <div>
        <p className="smallcaps-head index-label">About</p>
        <h1 className="index-title">A quiet place to read the Bible</h1>
      </div>
      <div className="prose">
        {/* PLACEHOLDER: Sam to replace with the story of why Lamplight exists and who makes it. */}
        <p>
          Lamplight is a free Bible website. There are no ads, no store and no account to make. Open it and read, the way you
          would open a printed Bible.
        </p>
        <p>
          You can read whole chapters, find a verse by typing a reference or a few words, share a verse as a picture, and look
          at the Greek and Hebrew behind each word in Study mode.
        </p>
        <h2>The text</h2>
        <p>
          Lamplight uses translations in the public domain: the Berean Standard Bible, the World English Bible and the King
          James Version. Greek and Hebrew word data comes from the Berean Bible’s open data (Apache 2.0), and cross references
          from OpenBible.info (CC BY).
        </p>
        <h2>Who makes it</h2>
        <p>[Your name, where you are, and why you built this.]</p>
        <h2>Keeping it free</h2>
        <p>
          Lamplight will always be free to read. If it helps you, you can <Link href="/donate">help cover the costs</Link>.
        </p>
        <h2>Contact</h2>
        <p>[Contact email]</p>
      </div>
    </main>
  );
}
