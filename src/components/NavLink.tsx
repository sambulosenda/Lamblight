"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/** A main-nav link that marks itself current anywhere inside its section. */
export function NavLink({ href, match, children }: { href: string; match: string; children: React.ReactNode }) {
  const pathname = usePathname();
  const current = pathname === match || pathname.startsWith(`${match}/`);
  return (
    <Link href={href} aria-current={current ? "page" : undefined}>
      {children}
    </Link>
  );
}
