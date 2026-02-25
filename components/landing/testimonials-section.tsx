const testimonials = [
  {
    quote:
      "They installed our new lighting perfectly and left everything spotless. A great experience from start to finish.",
    name: "Emily Carter",
    role: "Real Estate Agent",
    image:
      "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=80&h=80&fit=crop&crop=face",
  },
  {
    quote:
      "Super professional and fast! They fixed our leaking sink in under an hour. Highly recommended for anyone needing reliable home repairs.",
    name: "Jason Reynolds",
    role: "IT Consultant",
    image:
      "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=80&h=80&fit=crop&crop=face",
  },
  {
    quote:
      "Our AC broke down early in the morning and their team arrived the same day. Great service and fair pricing.",
    name: "Sarah Mitchell",
    role: "Interior Designer",
    image:
      "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=80&h=80&fit=crop&crop=face",
  },
  {
    quote:
      "Very knowledgeable. They explained everything before upgrading our electrical panel. Smooth and stress-free!",
    name: "Michael Turner",
    role: "Operations Manager",
    image:
      "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=80&h=80&fit=crop&crop=face",
  },
];

export function TestimonialsSection() {
  return (
    <section
      id="testimonials"
      className="bg-muted font-body px-6 py-16 md:py-24"
    >
      <div className="container mx-auto max-w-6xl">
        <p className="font-nav text-center text-sm font-medium uppercase tracking-wider text-muted-foreground">
          Testimonials
        </p>
        <h2 className="font-section mt-2 text-center text-3xl font-bold text-primary md:text-4xl">
          What Our Clients Say
        </h2>
        <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {testimonials.map((t) => (
            <div
              key={t.name}
              className="rounded-xl border border-border bg-card p-6 shadow-sm"
            >
              <p className="text-4xl font-bold leading-none text-muted">
                &ldquo;
              </p>
              <p className="mt-2 text-sm text-foreground">{t.quote}</p>
              <div className="mt-4 flex items-center gap-3">
                <img
                  src={t.image}
                  alt={t.name}
                  className="size-12 rounded-full object-cover"
                />
                <div>
                  <p className="font-section font-semibold text-foreground">
                    {t.name}
                  </p>
                  <p className="text-xs text-muted-foreground">{t.role}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
