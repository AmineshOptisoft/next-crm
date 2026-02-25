"use client";

import { useState } from "react";
import Link from "next/link";

const footerLinks = {
  quick: [
    { href: "#", label: "Home" },
    { href: "#", label: "About us" },
    { href: "#services", label: "Services" },
    { href: "#blog", label: "Blog" },
    { href: "#", label: "Contact Us" },
  ],
  info: [
    { href: "#", label: "Style Guide" },
    { href: "#", label: "Licensing" },
    { href: "#", label: "Changelog" },
  ],
};

const social = [
  { name: "Facebook", href: "#" },
  { name: "Instagram", href: "#" },
  { name: "X", href: "#" },
  { name: "LinkedIn", href: "#" },
  { name: "Youtube", href: "#" },
];

export function LandingFooter() {
  const [email, setEmail] = useState("");

  return (
    <footer className="bg-background font-body">
      <div className="container mx-auto max-w-6xl px-6 py-14">
        <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-4">
          <div>
            <Link
              href="/"
              className="font-logo text-xl font-semibold text-foreground"
            >
              Hously
            </Link>
            <p className="mt-3 text-sm text-muted-foreground">
              © {new Date().getFullYear()} Hously. All rights reserved.
            </p>
          </div>
          <div>
            <h4 className="font-nav text-sm font-semibold uppercase tracking-wider text-foreground">
              Quick Links
            </h4>
            <ul className="mt-4 space-y-2">
              {footerLinks.quick.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-muted-foreground transition hover:text-foreground"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h4 className="font-nav text-sm font-semibold uppercase tracking-wider text-foreground">
              Information
            </h4>
            <ul className="mt-4 space-y-2">
              {footerLinks.info.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-muted-foreground transition hover:text-foreground"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h4 className="font-nav text-sm font-semibold uppercase tracking-wider text-foreground">
              Follow us
            </h4>
            <p className="mt-4 text-sm text-muted-foreground">
              Join our newsletter to stay up to date on features and releases.
            </p>
            <form
              className="mt-3 flex gap-2"
              onSubmit={(e) => e.preventDefault()}
            >
              <input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
              />
              <button
                type="submit"
                className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition hover:opacity-90"
              >
                Subscribe
              </button>
            </form>
            <div className="mt-4 flex flex-wrap gap-4">
              {social.map((s) => (
                <Link
                  key={s.name}
                  href={s.href}
                  className="text-sm text-muted-foreground hover:text-primary"
                >
                  {s.name}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
      <div className="border-t border-border bg-muted py-4">
        <div className="container mx-auto flex max-w-6xl flex-wrap justify-center gap-6 px-6 text-center text-sm text-muted-foreground">
          <Link href="#" className="hover:text-foreground">
            Privacy Policy
          </Link>
          <Link href="#" className="hover:text-foreground">
            Terms of Service
          </Link>
          <Link href="#" className="hover:text-foreground">
            Cookies Settings
          </Link>
        </div>
      </div>
    </footer>
  );
}
