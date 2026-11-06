import Link from "next/link";
import { SearchIcon } from "./Icons";
import { LampIcon } from "./Logo";

export function SiteHeader() {
  return (
    <header className="site-header">
      <div className="site-header__inner">
        <Link href="/" className="logo">
          <LampIcon />
          <span>Lamplight</span>
        </Link>
        <form className="search" action="/go" method="get" role="search">
          <SearchIcon />
          <label htmlFor="q" className="sr-only">
            Search the Bible
          </label>
          <input id="q" name="q" type="search" placeholder="Search a verse, like “jn 3 16” or “do not be anxious”" autoComplete="off" enterKeyHint="search" />
        </form>
        <nav aria-label="Main" className="main-nav">
          <Link href="/bsb">Read</Link>
        </nav>
      </div>
    </header>
  );
}
