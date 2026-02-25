"use client";

import Link from "next/link";

const navLinks = [
  { href: "#", label: "Home" },
  { href: "#services", label: "Services" },
  { href: "#how-it-works", label: "How it works" },
  { href: "#testimonials", label: "Testimonials" },
  { href: "#blog", label: "Blog" },
  { href: "#faq", label: "FAQ" },
];

export function LandingHeader() {
  return (
    <header className="sticky top-0 z-50 w-full bg-primary font-nav">
      <div className="container flex h-16 items-center justify-between px-6">
        <Link
          href="/"
          className="flex items-center gap-2 font-logo text-xl font-semibold text-primary-foreground"
        >
          <span className="font-logo">Hously</span>
        </Link>
        <nav className="hidden items-center gap-8 md:flex">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-sm font-medium text-primary-foreground/90 transition hover:text-primary-foreground"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <Link
            href="/login"
            className="rounded-lg bg-primary-foreground px-5 py-2.5 text-sm font-semibold text-primary transition hover:opacity-90"
          >
            Login
          </Link>
          <Link
            href="/signup"
            className="rounded-lg border-2 border-primary-foreground bg-transparent px-5 py-2.5 text-sm font-semibold text-primary-foreground transition hover:bg-primary-foreground/10"
          >
            Signup
          </Link>
        </div>
      </div>
    </header>
  );
}
