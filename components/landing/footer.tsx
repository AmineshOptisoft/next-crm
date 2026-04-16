import Link from "next/link";
import AnimationContainer from "@/components/landing/animation-container";
import { TextHoverEffect } from "@/components/ui/text-hover-effect";

export default function LandingFooter() {
  return (
    <footer className="flex flex-col relative items-center justify-center border-t border-border pt-16 pb-8 px-6 lg:px-8 w-full max-w-6xl mx-auto lg:pt-24 bg-[radial-gradient(35%_128px_at_50%_0%,rgba(255,255,255,.08),transparent)]">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-1.5 bg-foreground rounded-full" />

      <div className="grid gap-8 xl:grid-cols-3 xl:gap-8 w-full">
        <AnimationContainer delay={0.1}>
          <div className="flex flex-col items-start justify-start md:max-w-[220px]">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-400 to-fuchsia-500" />
            <p className="text-muted-foreground mt-4 text-sm text-start">
              Cleaner booking software for modern service teams.
            </p>
            <span className="mt-4 text-sm flex items-center">
              Built for{" "}
              <span className="font-semibold ml-1 text-foreground">cleaning businesses</span>
            </span>
          </div>
        </AnimationContainer>

        <div className="grid-cols-2 gap-8 grid mt-10 xl:col-span-2 xl:mt-0">
          <AnimationContainer delay={0.2}>
            <div>
              <h3 className="text-base font-medium text-foreground">Product</h3>
              <ul className="mt-4 text-sm text-muted-foreground space-y-2">
                <li><Link href="#features" className="hover:text-foreground">Features</Link></li>
                <li><Link href="#pricing" className="hover:text-foreground">Pricing</Link></li>
                <li><Link href="#testimonials" className="hover:text-foreground">Testimonials</Link></li>
                <li><Link href="#resources" className="hover:text-foreground">Resources</Link></li>
              </ul>
            </div>
          </AnimationContainer>
          <AnimationContainer delay={0.3}>
            <div>
              <h3 className="text-base font-medium text-foreground">Resources</h3>
              <ul className="mt-4 text-sm text-muted-foreground space-y-2">
                <li><Link href="/resources/blog" className="hover:text-foreground">Blog</Link></li>
                <li><Link href="/resources/help" className="hover:text-foreground">Support</Link></li>
              </ul>
            </div>
          </AnimationContainer>
        </div>
      </div>

      <div className="mt-8 border-t border-border/40 pt-6 w-full">
        <AnimationContainer delay={0.4}>
          <p className="text-sm text-muted-foreground">
            &copy; {new Date().getFullYear()} CleanFlow INC. All rights reserved.
          </p>
        </AnimationContainer>
      </div>

      <div className="h-[20rem] lg:h-[20rem] hidden md:flex items-center justify-center w-full">
        <TextHoverEffect text="NEXT-CRM" />
      </div>
    </footer>
  );
}
