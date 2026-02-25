export function WhyItWorksSection() {
  return (
    <section
      id="how-it-works"
      className="bg-primary font-body px-6 py-16 md:py-24"
    >
      <div className="container mx-auto grid max-w-6xl items-center gap-12 md:grid-cols-2">
        <div>
          <h2 className="font-heading text-3xl font-bold leading-tight text-primary-foreground md:text-4xl">
            See why we&apos;re the premier choice for home services
          </h2>
          <ul className="mt-10 space-y-8">
            <li className="flex gap-4">
              <div className="flex size-12 shrink-0 items-center justify-center rounded-full bg-primary-foreground/10">
                <svg
                  className="size-6 text-primary-foreground"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                  />
                </svg>
              </div>
              <div>
                <h3 className="font-section text-lg font-semibold text-primary-foreground">
                  Trusted by our community
                </h3>
                <p className="mt-1 text-sm text-primary-foreground/80">
                  90% of our bookings come from happy, returning customers.
                </p>
              </div>
            </li>
            <li className="flex gap-4">
              <div className="flex size-12 shrink-0 items-center justify-center rounded-full bg-primary-foreground/10">
                <svg
                  className="size-6 text-primary-foreground"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <div>
                <h3 className="font-section text-lg font-semibold text-primary-foreground">
                  More than 6 hours back in your week
                </h3>
                <p className="mt-1 text-sm text-primary-foreground/80">
                  Lorem ipsum dolor sit amet, consectetur adipiscing elit.
                  Suspendisse varius enim in eros elementum tristique.
                </p>
              </div>
            </li>
            <li className="flex gap-4">
              <div className="flex size-12 shrink-0 items-center justify-center rounded-full bg-primary-foreground/10">
                <svg
                  className="size-6 text-primary-foreground"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
                  />
                </svg>
              </div>
              <div>
                <h3 className="font-section text-lg font-semibold text-primary-foreground">
                  Real reviews you can trust
                </h3>
                <p className="mt-1 text-sm text-primary-foreground/80">
                  Lorem ipsum dolor sit amet, consectetur adipiscing elit.
                  Suspendisse varius enim in eros elementum tristique.
                </p>
              </div>
            </li>
          </ul>
        </div>
        <div className="overflow-hidden rounded-xl">
          <img
            src="https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=600&h=500&fit=crop"
            alt="Professional with vacuum"
            className="h-80 w-full object-cover md:h-96"
          />
        </div>
      </div>
    </section>
  );
}
