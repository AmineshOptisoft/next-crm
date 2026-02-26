import { Mail, Phone } from "lucide-react";

type PublicTemplateProps = {
  company: any;
};

export function PublicTemplateB({ company }: PublicTemplateProps) {
  return (
    <div className="min-h-screen bg-white text-slate-900">
      <header className="border-b border-slate-200 bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-4">
          <div className="flex items-center gap-3">
            {company.logo ? (
              <img
                src={company.logo}
                alt={company.name}
                className="h-9 w-9 rounded-md border border-slate-200 object-cover"
              />
            ) : (
              <div className="flex h-9 w-9 items-center justify-center rounded-md border border-slate-200 bg-slate-50 text-xs font-semibold">
                {company.name?.slice(0, 2)?.toUpperCase() || "CO"}
              </div>
            )}
            <div>
              <h1 className="text-base font-semibold tracking-tight">{company.name}</h1>
              {company.industry && (
                <p className="text-xs text-slate-500">{company.industry}</p>
              )}
            </div>
          </div>
          {company.phone && (
            <a
              href={`tel:${company.phone}`}
              className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-3 py-1.5 text-xs font-medium hover:bg-slate-50"
            >
              <Phone className="h-3.5 w-3.5" />
              {company.phone}
            </a>
          )}
        </div>
      </header>

      <main className="mx-auto flex max-w-4xl flex-col gap-8 px-4 py-10">
        <section className="space-y-4">
          <h2 className="text-2xl font-semibold tracking-tight">
            {company.description || "Book trusted services in a few clicks."}
          </h2>
          <p className="max-w-2xl text-sm text-slate-600">
            Choose a time that works for you, share a few details, and we&apos;ll confirm your
            booking shortly. No accounts, no apps, just simple online scheduling.
          </p>
        </section>

        <section className="grid gap-8 md:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
          <div className="space-y-4 rounded-xl border border-slate-200 bg-slate-50/80 p-4">
            <h3 className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
              Quick booking request
            </h3>
            <form className="space-y-3 text-sm">
              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-slate-700">
                  Your name
                </label>
                <input
                  type="text"
                  className="w-full rounded-md border border-slate-200 px-3 py-1.5 text-sm outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-300"
                  placeholder="John Doe"
                />
              </div>
              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-slate-700">
                  Email
                </label>
                <input
                  type="email"
                  className="w-full rounded-md border border-slate-200 px-3 py-1.5 text-sm outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-300"
                  placeholder="you@example.com"
                />
              </div>
              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-slate-700">
                  Preferred date
                </label>
                <input
                  type="date"
                  className="w-full rounded-md border border-slate-200 px-3 py-1.5 text-sm outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-300"
                />
              </div>
              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-slate-700">
                  Notes
                </label>
                <textarea
                  rows={3}
                  className="w-full resize-none rounded-md border border-slate-200 px-3 py-1.5 text-sm outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-300"
                  placeholder="What do you need help with?"
                />
              </div>
              <button
                type="button"
                className="inline-flex w-full items-center justify-center rounded-md bg-slate-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-800"
              >
                Submit request
              </button>
              <p className="text-[11px] leading-relaxed text-slate-500">
                This is a demo form for your public page. You can later connect it to real
                booking logic inside the app.
              </p>
            </form>
          </div>

          <div className="space-y-4">
            <h3 className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
              Contact details
            </h3>
            <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-4 text-sm">
              {company.email && (
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-slate-500" />
                  <a
                    href={`mailto:${company.email}`}
                    className="text-slate-700 hover:text-slate-900"
                  >
                    {company.email}
                  </a>
                </div>
              )}
              {company.address && (
                <div className="text-slate-600">
                  <div className="font-medium text-slate-800">Address</div>
                  <div className="text-xs">
                    {[company.address.street, company.address.city, company.address.state]
                      .filter(Boolean)
                      .join(", ")}
                  </div>
                  <div className="text-xs">
                    {[company.address.zipCode, company.address.country].filter(Boolean).join(" ")}
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-200 bg-slate-50/80">
        <div className="mx-auto flex max-w-4xl flex-col items-center justify-between gap-2 px-4 py-4 text-[11px] text-slate-500 sm:flex-row">
          <span>© {new Date().getFullYear()} {company.name}. All rights reserved.</span>
          {company.website && (
            <a
              href={company.website}
              target="_blank"
              rel="noreferrer"
              className="hover:text-slate-800"
            >
              Visit full website
            </a>
          )}
        </div>
      </footer>
    </div>
  );
}

