import { Mail, MapPin, Phone } from "lucide-react";

type PublicTemplateProps = {
  company: any;
};

export function PublicTemplateA({ company }: PublicTemplateProps) {
  const addressParts = [
    company?.address?.street,
    company?.address?.city,
    company?.address?.state,
    company?.address?.zipCode,
    company?.address?.country,
  ].filter(Boolean);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-slate-50">
      <header className="border-b border-slate-800 bg-black/40 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
          <div className="flex items-center gap-3">
            {company.logo ? (
              <img
                src={company.logo}
                alt={company.name}
                className="h-10 w-10 rounded-lg border border-slate-700 object-cover"
              />
            ) : (
              <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-slate-700 bg-slate-900 text-sm font-semibold">
                {company.name?.slice(0, 2)?.toUpperCase() || "CO"}
              </div>
            )}
            <div>
              <div className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-400">
                {company.industry || "Service Provider"}
              </div>
              <h1 className="text-xl font-bold tracking-tight">{company.name}</h1>
            </div>
          </div>
          <div className="hidden text-xs text-slate-400 sm:block">
            {company.website && (
              <a
                href={company.website}
                target="_blank"
                rel="noreferrer"
                className="hover:text-slate-100"
              >
                {company.website.replace(/^https?:\/\//, "")}
              </a>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto flex max-w-5xl flex-col gap-12 px-4 py-10 md:py-16">
        <section className="grid gap-8 md:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] md:items-center">
          <div className="space-y-6">
            <p className="inline-flex rounded-full border border-emerald-500/40 bg-emerald-500/10 px-3 py-1 text-xs font-medium uppercase tracking-[0.2em] text-emerald-300">
              Book your next appointment
            </p>
            <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl md:text-5xl">
              {company.description
                ? company.description
                : "Professional services designed around your schedule."}
            </h2>
            <p className="max-w-xl text-sm text-slate-300 sm:text-base">
              We help you save time and stay organized with easy online booking, automated
              reminders, and a team that actually cares about your experience.
            </p>
            <div className="flex flex-wrap gap-3">
              <a
                href={company.website || "#"}
                className="inline-flex items-center justify-center rounded-full bg-emerald-500 px-5 py-2 text-sm font-medium text-emerald-950 shadow-lg shadow-emerald-500/30 hover:bg-emerald-400"
              >
                Book an appointment
              </a>
              <a
                href={`tel:${company.phone || ""}`}
                className="inline-flex items-center justify-center gap-2 rounded-full border border-slate-700 bg-slate-900/60 px-5 py-2 text-sm font-medium text-slate-50 hover:border-slate-500"
              >
                <Phone className="h-4 w-4" />
                Call us
              </a>
            </div>
          </div>

          <div className="space-y-4 rounded-2xl border border-slate-800 bg-slate-900/60 p-5 shadow-xl">
            <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-400">
              Overview
            </h3>
            <div className="space-y-3 text-sm text-slate-200">
              {addressParts.length > 0 && (
                <div className="flex gap-3">
                  <MapPin className="mt-0.5 h-4 w-4 text-emerald-400" />
                  <div>
                    <div className="font-medium">Address</div>
                    <div className="text-slate-300">{addressParts.join(", ")}</div>
                  </div>
                </div>
              )}
              {company.email && (
                <div className="flex gap-3">
                  <Mail className="mt-0.5 h-4 w-4 text-emerald-400" />
                  <div>
                    <div className="font-medium">Email</div>
                    <a
                      href={`mailto:${company.email}`}
                      className="text-slate-300 hover:text-slate-100"
                    >
                      {company.email}
                    </a>
                  </div>
                </div>
              )}
              {company.phone && (
                <div className="flex gap-3">
                  <Phone className="mt-0.5 h-4 w-4 text-emerald-400" />
                  <div>
                    <div className="font-medium">Phone</div>
                    <a
                      href={`tel:${company.phone}`}
                      className="text-slate-300 hover:text-slate-100"
                    >
                      {company.phone}
                    </a>
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6">
          <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-400">
            Why people choose us
          </h3>
          <div className="mt-4 grid gap-4 md:grid-cols-3">
            <div className="space-y-1">
              <div className="text-sm font-semibold text-slate-50">Online scheduling</div>
              <p className="text-xs text-slate-300">
                Book and manage appointments 24/7 without back-and-forth messages.
              </p>
            </div>
            <div className="space-y-1">
              <div className="text-sm font-semibold text-slate-50">Reliable reminders</div>
              <p className="text-xs text-slate-300">
                Reduce no-shows with automatic email notifications and confirmations.
              </p>
            </div>
            <div className="space-y-1">
              <div className="text-sm font-semibold text-slate-50">Personal service</div>
              <p className="text-xs text-slate-300">
                A dedicated team that knows your preferences and respects your time.
              </p>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-800 bg-black/60">
        <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-3 px-4 py-4 text-xs text-slate-500 sm:flex-row">
          <span>© {new Date().getFullYear()} {company.name}. All rights reserved.</span>
          {company.website && (
            <a
              href={company.website}
              target="_blank"
              rel="noreferrer"
              className="hover:text-slate-200"
            >
              Visit full website
            </a>
          )}
        </div>
      </footer>
    </div>
  );
}

