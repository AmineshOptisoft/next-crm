"use client";

import Link from "next/link";
import { MoonIcon, SunIcon, ZapIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { buttonVariants } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import MaxWidthWrapper from "@/components/landing/max-width-wrapper";
import AnimationContainer from "@/components/landing/animation-container";

const NAV_LINKS = [
  { title: "Features", href: "#features" },
  { title: "Pricing", href: "#pricing" },
  { title: "Testimonials", href: "#testimonials" },
  { title: "Resources", href: "#resources" },
];

export default function LandingNavbar() {
  const [scroll, setScroll] = useState(false);
  const [mounted, setMounted] = useState(false);
  const { resolvedTheme, setTheme } = useTheme();

  useEffect(() => {
    const onScroll = () => setScroll(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    setMounted(true);
  }, []);

  const isDark = mounted && resolvedTheme === "dark";

  return (
    <header
      className={cn(
        "sticky top-0 inset-x-0 h-16 w-full border-b border-transparent z-50",
        scroll && "border-border/80 bg-background/70 backdrop-blur-md"
      )}
    >
      <AnimationContainer reverse delay={0.1} className="size-full">
        <MaxWidthWrapper className="h-full flex items-center justify-between">
          <Link href="#home" className="text-lg font-bold leading-none">
            CleanFlow
          </Link>

          <nav className="hidden md:flex items-center gap-7 text-sm text-muted-foreground">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.title}
                href={link.href}
                className="hover:text-foreground transition-colors"
              >
                {link.title}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-x-2">
            <div className="flex items-center gap-2 rounded-full border border-border/70 bg-background/70 px-2 py-1">
              <SunIcon className="size-3.5 text-muted-foreground" />
              <Switch
                checked={isDark}
                onCheckedChange={(checked) => setTheme(checked ? "dark" : "light")}
                aria-label="Toggle dark mode"
              />
              <MoonIcon className="size-3.5 text-muted-foreground" />
            </div>
            <Link href="/login" className={buttonVariants({ size: "sm", variant: "ghost", className: "hidden sm:inline-flex" })}>
              Sign In
            </Link>
            <Link href="/dashboard" className={buttonVariants({ size: "sm" })}>
              Book a Demo
              <ZapIcon className="size-3.5 ml-1.5 text-orange-500 fill-orange-500" />
            </Link>
          </div>
        </MaxWidthWrapper>
      </AnimationContainer>
    </header>
  );
}
