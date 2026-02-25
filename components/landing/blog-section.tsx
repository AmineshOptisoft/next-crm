import Link from "next/link";
import { ArrowRight } from "lucide-react";

const posts = [
  {
    image:
      "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=500&h=300&fit=crop",
    date: "November 16, 2025",
    readTime: "5 min read",
    title: "Home Security Tips for Peace of Mind",
    description:
      "Implement these home security tips to protect your property and ensure your family's safety.",
  },
  {
    image:
      "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=500&h=300&fit=crop",
    date: "November 16, 2025",
    readTime: "5 min read",
    title: "Creative Home Renovation Ideas",
    description:
      "Discover creative renovation ideas to enhance your home's beauty and functionality.",
  },
];

export function BlogSection() {
  return (
    <section
      id="blog"
      className="bg-muted font-body px-6 py-16 md:py-24"
    >
      <div className="container mx-auto max-w-6xl">
        <p className="font-nav text-center text-sm font-medium uppercase tracking-wider text-muted-foreground">
          Blog
        </p>
        <h2 className="font-section mt-2 text-center text-3xl font-bold text-primary md:text-4xl">
          Helpful Tips & Resources
        </h2>
        <p className="mx-auto mt-4 max-w-2xl text-center text-muted-foreground">
          Your go-to resource for actionable tips, industry updates, and
          behind-the-scenes knowledge. Empower yourself with content that makes
          a difference.
        </p>
        <div className="mt-14 grid gap-8 sm:grid-cols-2">
          {posts.map((post) => (
            <div
              key={post.title}
              className="overflow-hidden rounded-xl border border-border bg-card shadow-sm"
            >
              <img
                src={post.image}
                alt={post.title}
                className="h-48 w-full object-cover"
              />
              <div className="p-5">
                <p className="font-nav text-xs text-muted-foreground">
                  {post.date} • {post.readTime}
                </p>
                <h3 className="font-section mt-2 text-lg font-bold text-foreground">
                  {post.title}
                </h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  {post.description}
                </p>
                <Link
                  href="#"
                  className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
                >
                  Read more
                  <ArrowRight className="size-4" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
