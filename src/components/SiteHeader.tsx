import Link from "next/link";
import { HeaderShell } from "./HeaderShell";
import { SearchIcon } from "./Icons";
import { LampIcon } from "./Logo";
import { MainNav } from "./MainNav";

export function SiteHeader() {
  return (
    <HeaderShell>
      <div className="site-header__inner">
        <Link href="/" className="logo">
          <LampIcon />
          <span>Lamplight</span>
        </Link>
        <MainNav />
        <Link href="/search" className="search-link" aria-label="Search">
          <SearchIcon size={20} />
        </Link>
        <form className="search" action="/go" method="get" role="search">
          <SearchIcon size={17} />
          <label htmlFor="q" className="sr-only">
            Search the Bible
          </label>
          <input id="q" name="q" type="search" placeholder="A verse, a word, “ps 23”" autoComplete="off" enterKeyHint="search" />
        </form>
      </div>
    </HeaderShell>
  );
}
