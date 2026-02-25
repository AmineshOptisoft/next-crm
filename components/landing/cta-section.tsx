import Link from "next/link";

export function CTASection() {
  return (
    <section className="bg-primary font-body px-6 py-16 md:py-24">
      <div className="container mx-auto max-w-4xl text-center">
        <h2 className="font-heading text-3xl font-bold leading-tight text-primary-foreground md:text-4xl lg:text-5xl">
          Ready to{" "}
          <span className="text-primary-foreground">Get Started?</span>
        </h2>
        <p className="mt-6 text-lg text-primary-foreground/90">
          No more hassle—get professional handyman services that fit your
          schedule and budget. Whether it&apos;s home repairs, office maintenance,
          or a quick fix, we&apos;re here to help you every step of the way.
        </p>
        <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
          <Link
            href="/signup"
            className="inline-flex items-center justify-center rounded-lg bg-primary-foreground px-6 py-3 text-sm font-semibold text-primary transition hover:opacity-90"
          >
            Get Started
          </Link>
          <Link
            href="#how-it-works"
            className="inline-flex items-center justify-center rounded-lg border-2 border-primary-foreground bg-transparent px-6 py-3 text-sm font-semibold text-primary-foreground transition hover:bg-primary-foreground/10"
          >
            Learn More
          </Link>
        </div>
      </div>
    </section>
  );
}
