import Link from "next/link";

export default function NotFound() {
  return (
    <main id="content" className="page">
      <div className="verse-hero">
        <h1>Page not found</h1>
        <blockquote>We couldn’t find that passage.</blockquote>
        <p className="attribution">Check the reference, or search for it in the box above.</p>
        <div className="actions">
          <Link href="/bsb" className="btn btn--primary">
            Browse all books
          </Link>
          <Link href="/" className="btn">
            Home
          </Link>
        </div>
      </div>
    </main>
  );
}
