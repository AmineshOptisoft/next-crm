import { Home, Briefcase, ShoppingBag } from "lucide-react";

const items = [
  {
    icon: Home,
    title: "Home",
    description:
      "Dedicated to providing essential support and resources to individuals and communities.",
  },
  {
    icon: Briefcase,
    title: "Workspace",
    description:
      "Dedicated to providing essential support and resources to individuals and communities.",
  },
  {
    icon: ShoppingBag,
    title: "Store",
    description:
      "Dedicated to providing essential support and resources to individuals and communities.",
  },
];

export function WhoWeHelpSection() {
  return (
    <section
      id="features"
      className="bg-muted font-body px-6 py-16 md:py-24"
    >
      <div className="container mx-auto max-w-6xl">
        <p className="font-nav text-center text-sm font-medium uppercase tracking-wider text-muted-foreground">
          Our Trusted Partner
        </p>
        <h2 className="font-section mt-2 text-center text-3xl font-bold text-foreground md:text-4xl">
          Who We Help
        </h2>
        <p className="mx-auto mt-4 max-w-2xl text-center text-muted-foreground">
          Committed to delivering exceptional home services with expertise,
          reliability, and a customer-first approach.
        </p>
        <div className="mt-14 grid gap-8 sm:grid-cols-3">
          {items.map((item) => (
            <div
              key={item.title}
              className="rounded-xl border border-border bg-card p-6 shadow-sm"
            >
              <div className="mb-4 flex size-14 items-center justify-center rounded-full bg-primary">
                <item.icon className="size-7 text-primary-foreground" />
              </div>
              <h3 className="font-section text-xl font-bold text-foreground">
                {item.title}
              </h3>
              <p className="mt-2 text-sm text-muted-foreground">
                {item.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
