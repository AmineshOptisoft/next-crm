import Link from "next/link";

export function HeroSection() {
  return (
    <section className="bg-primary font-body px-6 pb-16 pt-14 md:pb-20 md:pt-20">
      <div className="container mx-auto max-w-6xl">
        <div className="flex flex-col items-center text-center">
          <h1 className="font-heading max-w-4xl text-4xl font-bold leading-tight tracking-tight text-primary-foreground sm:text-5xl md:text-6xl">
            Top-Rated Local Pros Ready to Elevate{" "}
            <span className="text-primary-foreground">Your Space</span>
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-relaxed text-primary-foreground/90">
            From leaky faucets to complete remodels, we connect you with vetted
            professionals ready to tackle your to-do list. Get your space
            looking its best, stress-free.
          </p>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
            <Link
              href="/signup"
              className="inline-flex items-center justify-center rounded-lg bg-primary-foreground px-6 py-3 text-sm font-semibold text-primary transition hover:opacity-90"
            >
              Register
            </Link>
            <Link
              href="/login"
              className="inline-flex items-center justify-center rounded-lg border-2 border-primary-foreground bg-transparent px-6 py-3 text-sm font-semibold text-primary-foreground transition hover:bg-primary-foreground/10"
            >
              Login
            </Link>
            <Link
              href="#how-it-works"
              className="inline-flex items-center justify-center rounded-lg border border-primary-foreground/40 bg-primary-foreground/5 px-6 py-3 text-sm font-semibold text-primary-foreground/90 transition hover:bg-primary-foreground/15"
            >
              Learn More
            </Link>
          </div>
          {/* Two images side by side */}
          <div className="mt-14 grid w-full max-w-4xl grid-cols-2 gap-4">
            <div className="overflow-hidden rounded-xl shadow-lg">
              <img
                src="https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=600&h=400&fit=crop"
                alt="Cozy living room with sofa and plant"
                className="h-64 w-full object-cover md:h-72"
              />
            </div>
            <div className="overflow-hidden rounded-xl shadow-lg">
              <img
                src="https://images.unsplash.com/photo-1504148455328-c376907d081c?w=600&h=400&fit=crop"
                alt="Construction professional at work"
                className="h-64 w-full object-cover md:h-72"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
