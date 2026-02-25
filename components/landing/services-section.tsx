import Link from "next/link";
import { Star } from "lucide-react";

const services = [
  {
    image:
      "https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=400&h=280&fit=crop",
    title: "Home Cleaning",
    description:
      "Our expert cleaners ensure your bathrooms are spotless, hygienic, and fresh. Say goodbye to stubborn stains and unpleasant odors!",
    originalPrice: "USD$450",
    price: "USD$400",
  },
  {
    image:
      "https://images.unsplash.com/photo-1552321554-5f7a2f4b64c9?w=400&h=280&fit=crop",
    title: "Toilet Cleaning",
    description:
      "Our expert cleaners ensure your bathrooms are spotless, hygienic, and fresh. Say goodbye to stubborn stains and unpleasant odors!",
    originalPrice: "USD$450",
    price: "USD$300",
  },
  {
    image:
      "https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=400&h=280&fit=crop",
    title: "Garden Cleaning",
    description:
      "Our expert cleaners ensure your bathrooms are spotless, hygienic, and fresh. Say goodbye to stubborn stains and unpleasant odors!",
    originalPrice: "USD$450",
    price: "USD$400",
  },
];

export function ServicesSection() {
  return (
    <section
      id="services"
      className="bg-muted font-body px-6 py-16 md:py-24"
    >
      <div className="container mx-auto max-w-6xl">
        <p className="font-nav text-center text-sm font-medium uppercase tracking-wider text-muted-foreground">
          Services
        </p>
        <h2 className="font-section mt-2 text-center text-3xl font-bold text-primary md:text-4xl">
          Professional Cleaning Made Simple
        </h2>
        <p className="mx-auto mt-4 max-w-2xl text-center text-muted-foreground">
          Lorem ipsum dolor sit amet, consectetur adipiscing elit. Suspendisse
          varius enim in eros elementum tristique. Duis cursus, mi quis viverra
          ornare, eros dolor interdum nulla, ut commodo diam libero vitae erat.
        </p>
        <div className="mt-14 grid gap-8 sm:grid-cols-3">
          {services.map((s) => (
            <div
              key={s.title}
              className="overflow-hidden rounded-xl border border-border bg-card shadow-sm"
            >
              <img
                src={s.image}
                alt={s.title}
                className="h-52 w-full object-cover"
              />
              <div className="p-5">
                <div className="mb-3 inline-flex items-center gap-1 rounded-full bg-muted px-3 py-1 text-xs text-muted-foreground">
                  <Star className="size-3.5 fill-amber-400 text-amber-400" />
                  4.5 (1800+ reviews)
                </div>
                <h3 className="font-section text-lg font-bold text-foreground">
                  {s.title}
                </h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  {s.description}
                </p>
                <div className="mt-4 flex items-center justify-between gap-4">
                  <Link
                    href="/signup"
                    className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition hover:opacity-90"
                  >
                    Booking Now
                  </Link>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground line-through">
                      {s.originalPrice}
                    </span>
                    <span className="font-section font-bold text-foreground">
                      {s.price}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
