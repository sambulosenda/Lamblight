import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="site-footer__inner">
        <nav aria-label="Site" className="site-footer__links">
          <Link href="/about">About</Link>
          <Link href="/subscribe">Daily verse email</Link>
          <Link href="/donate">Donate</Link>
          <Link href="/privacy">Privacy</Link>
        </nav>
        <p>Free forever. No ads, no store.</p>
        <p>Scripture from the Berean Standard Bible, public domain.</p>
      </div>
    </footer>
  );
}
