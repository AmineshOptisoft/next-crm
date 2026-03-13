"use client";

import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { Mail, MapPin, Phone } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { toast } from "sonner";

let geoCache: any = null;
async function loadGeo() {
  if (geoCache) return geoCache;
  geoCache = await import("country-state-city");
  return geoCache;
}
// import { toast } from "sonner";

type PublicTemplateProps = {
  company: any;
  subdomain?: string;
  services: any[];
};

type UserType = "new" | "existing";

function isServiceAvailableForUserType(
  availability: string | undefined,
  userType: UserType
): boolean {
  if (!availability) return true;
  if (availability === "admin_service") return false;
  if (availability === "both") return true;
  if (userType === "new" && availability === "new_client") return true;
  if (userType === "existing" && availability === "existing_client") return true;
  return false;
}

export function PublicTemplateA({ company, subdomain, services }: PublicTemplateProps) {
  const addressParts = [
    company?.address?.street,
    company?.address?.city,
    company?.address?.state,
    company?.address?.zipCode,
    company?.address?.country,
  ].filter(Boolean);

  const [userType, setUserType] = useState<UserType | null>(null);
  const [existingEmail, setExistingEmail] = useState("");
  const [existingPassword, setExistingPassword] = useState("");
  const [existingVerified, setExistingVerified] = useState(false);

  const [step, setStep] = useState(1);

  const [technicianMode, setTechnicianMode] = useState<"random" | "manual" | null>("random");

  const [selectedServiceId, setSelectedServiceId] = useState<string | null>(null);
  const [subServiceCounts, setSubServiceCounts] = useState<Record<string, number>>({});
  const [addonCounts, setAddonCounts] = useState<Record<string, number>>({});

  const [selectedTechnician, setSelectedTechnician] = useState<string | null>(null);
  const [appointmentDate, setAppointmentDate] = useState("");
  const [appointmentDateObj, setAppointmentDateObj] = useState<Date | undefined>(undefined);
  const [appointmentTime, setAppointmentTime] = useState("");

  const [appointmentNotes, setAppointmentNotes] = useState("");
  const [newUserFormStep, setNewUserFormStep] = useState<"form" | "notes">("form");
  const [contactId, setContactId] = useState<string | null>(null);
  const [newUserForm, setNewUserForm] = useState({
    email: "",
    password: "",
    confirmPassword: "",
    firstName: "",
    lastName: "",
    phone: "",
    zipCode: "",
    address: "",
    country: "",
    state: "",
    city: "",
    smsOptIn: false,
  });
  const [savingNewUser, setSavingNewUser] = useState(false);
  const [cards, setCards] = useState<
    { id: string; brand: string; last4: string; expMonth: string; expYear: string; name: string }[]
  >([]);
  const [addCardOpen, setAddCardOpen] = useState(false);
  const [newCard, setNewCard] = useState({
    number: "",
    exp: "",
    cvv: "",
    name: "",
  });

  const [savedCard, setSavedCard] = useState<string | null>(null);

  const [promocodes, setPromocodes] = useState<any[]>([]);
  const [promocodeInput, setPromocodeInput] = useState("");
  const [discount, setDiscount] = useState(0);
  const [technicians, setTechnicians] = useState<any[]>([]);
  const [calendarEvents, setCalendarEvents] = useState<any[]>([]);
  const [geoLib, setGeoLib] = useState<any>(null);
  const [searchZip, setSearchZip] = useState("");
  const [showThankYou, setShowThankYou] = useState(false);

  const steps = [
    { id: 1, label: "Choose a Service" },
    { id: 2, label: "Technician & Time" },
    { id: 3, label: "Appointment Notes" },
    { id: 4, label: "Credit Card Details" },
  ] as const;

  const zipServiceIds = useMemo(() => {
    const raw = searchZip.replace(/\s+/g, "");
    if (!raw) return null;
    const normalized = raw.toLowerCase();
    const ids = new Set<string>();

    technicians.forEach((tech: any) => {
      const zips: string[] = tech.workingZipCodes || [];
      const matchesZip = zips.some(
        (z) => z && z.replace(/\s+/g, "").toLowerCase() === normalized
      );
      if (!matchesZip) return;
      (tech.services || []).forEach((sid: any) => {
        if (!sid) return;
        const key = typeof sid === "string" ? sid : sid.toString();
        ids.add(key);
      });
    });

    return ids;
  }, [technicians, searchZip]);

  const filteredMainServices = useMemo(() => {
    if (!userType) return [];
    if (!searchZip.trim()) return [];
    if (!zipServiceIds || zipServiceIds.size === 0) return [];

    return (services || []).filter((s: any) => {
      if (s.category !== "main") return false;
      if (!isServiceAvailableForUserType(s.availability, userType)) return false;
      const id = s._id?.toString?.() ?? "";
      return id && zipServiceIds.has(id);
    });
  }, [services, userType, searchZip, zipServiceIds]);

  useEffect(() => {
    loadGeo().then(setGeoLib).catch(() => {
      // ignore geo load errors on public page
    });
  }, []);

  useEffect(() => {
    if (!contactId) return;
    (async () => {
      try {
        const res = await fetch(`/api/public/cards?userId=${encodeURIComponent(contactId)}`);
        if (!res.ok) return;
        const data = await res.json();
        if (Array.isArray(data)) {
          const mapped = data.map((c: any) => ({
            id: c.id,
            brand: c.brand || "Card",
            last4: c.last4,
            expMonth: c.expMonth,
            expYear: c.expYear,
            name: c.nameOnCard || c.name,
          }));
          setCards(mapped);
          if (mapped.length && !savedCard) {
            setSavedCard(mapped[0].id);
          }
        }
      } catch (err) {
        console.error("Failed to load saved cards", err);
      }
    })();
  }, [contactId, savedCard]);

  const countryOptions = useMemo(() => {
    if (!geoLib) return [];
    return geoLib.Country.getAllCountries().map((c: any) => ({
      label: c.name,
      value: c.name,
      isoCode: c.isoCode,
    }));
  }, [geoLib]);

  const selectedCountryIso = useMemo(() => {
    if (!geoLib || !newUserForm.country) return "";
    const match = countryOptions.find((c: any) => c.value === newUserForm.country);
    return match?.isoCode || "";
  }, [countryOptions, geoLib, newUserForm.country]);

  const stateOptions = useMemo(() => {
    if (!geoLib || !selectedCountryIso) return [];
    return geoLib.State.getStatesOfCountry(selectedCountryIso).map((s: any) => ({
      label: s.name,
      value: s.name,
      isoCode: s.isoCode,
    }));
  }, [geoLib, selectedCountryIso]);

  const cityOptions = useMemo(() => {
    if (!geoLib || !selectedCountryIso || !newUserForm.state) return [];
    const stateIso = stateOptions.find((s: any) => s.value === newUserForm.state)?.isoCode;
    if (!stateIso) return [];
    return geoLib.City.getCitiesOfState(selectedCountryIso, stateIso).map((c: any) => ({
      label: c.name,
      value: c.name,
    }));
  }, [geoLib, selectedCountryIso, newUserForm.state, stateOptions]);

  const selectedServiceConfig = selectedServiceId
    ? filteredMainServices.find((s: any) => s._id === selectedServiceId) || null
    : null;

  const visibleSubServices = useMemo(() => {
    if (!selectedServiceConfig || !userType) return [];
    const list = selectedServiceConfig.subServices || [];
    return list.filter((sub: any) =>
      isServiceAvailableForUserType(sub.availability, userType)
    );
  }, [selectedServiceConfig, userType]);

  const visibleAddons = useMemo(() => {
    if (!selectedServiceConfig || !userType) return [];
    const list = selectedServiceConfig.addons || [];
    return list.filter((addon: any) =>
      isServiceAvailableForUserType(addon.availability, userType)
    );
  }, [selectedServiceConfig, userType]);

  const selectedServiceName = selectedServiceConfig?.name ?? null;

  const { subTotal, addonsTotal, total } = useMemo(() => {
    if (!selectedServiceConfig) {
      return { subTotal: 0, addonsTotal: 0, total: 0 };
    }

    const calcPrice = (item: any, qty: number) => {
      if (qty <= 0) return 0;
      const base = Number(item.basePrice) || 0;
      const hourly = Number(item.hourlyRate) || 0;
      const percentage = Number(
        // support both "percentage" and "rangePercentage" shapes
        item.rangePercentage ?? item.percentage ?? 0
      );

      const minutes = Number(item.estimatedTime) || 60;
      const hours = minutes / 60;

      const raw = base + hourly * hours * qty;
      return raw ;
    };

    let subTotal = 0;
    let addonsTotal = 0;

    visibleSubServices.forEach((sub: any) => {
      const qty = subServiceCounts[sub._id] || 0;
      subTotal += calcPrice(sub, qty);
    });

    visibleAddons.forEach((addon: any) => {
      const qty = addonCounts[addon._id] || 0;
      addonsTotal += calcPrice(addon, qty);
    });

    return {
      subTotal,
      addonsTotal,
      total: subTotal + addonsTotal,
    };
  }, [selectedServiceConfig, visibleSubServices, visibleAddons, subServiceCounts, addonCounts]);

  const finalAmount = Math.max(0, total - discount);

  const isStepComplete = (currentStep: number) => {
    if (currentStep === 1) {
      if (!userType) return false;
      if (userType === "existing" && !existingVerified) return false;
      if (!searchZip.trim()) return false;
      if (!filteredMainServices.length) return false;
      if (!selectedServiceId) return false;
      if (visibleSubServices.length > 0) {
        const hasSelectedSub = visibleSubServices.some(
          (sub: any) => (subServiceCounts[sub._id] ?? 0) > 0
        );
        if (!hasSelectedSub) return false;
      }
      return true;
    }
    if (currentStep === 2) {
      const hasTechnician =
        technicianMode === "random" || (technicianMode === "manual" && !!selectedTechnician);
      return hasTechnician && !!appointmentDate && !!appointmentTime;
    }
    if (currentStep === 3) {
      if (userType === "new") {
        if (newUserFormStep === "form") {
          return (
            !!newUserForm.email.trim() &&
            !!newUserForm.password.trim() &&
            newUserForm.password === newUserForm.confirmPassword &&
            !!newUserForm.firstName.trim() &&
            !!newUserForm.lastName.trim()
          );
        }
        return appointmentNotes.trim().length > 0;
      }
      return appointmentNotes.trim().length > 0;
    }
    if (currentStep === 4) {
      return !!savedCard;
    }
    return false;
  };

  const canGoNext = isStepComplete(step);

  const handleNext = async () => {
    if (step === 3 && userType === "new" && newUserFormStep === "form") {
      if (!canGoNext) return;
      (async () => {
        try {
          setSavingNewUser(true);
          const response = await fetch("/api/public/contacts", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              companyId: company?._id,
              email: newUserForm.email.trim(),
              password: newUserForm.password,
              firstName: newUserForm.firstName.trim(),
              lastName: newUserForm.lastName.trim(),
              phone: newUserForm.phone.trim() || undefined,
              zipCode: newUserForm.zipCode.trim() || undefined,
              address: newUserForm.address.trim() || undefined,
                country: newUserForm.country.trim() || undefined,
                state: newUserForm.state.trim() || undefined,
                city: newUserForm.city.trim() || undefined,
              smsOptIn: newUserForm.smsOptIn,
            }),
          });

          if (!response.ok) {
            const error = await response.json().catch(() => null);
            toast.error(error?.error || "Failed to save account details");
            return;
          }

          const data = await response.json();
          if (data?.id) {
            setContactId(data.id);
          }

          toast.success("Account details saved");
          setNewUserFormStep("notes");
        } catch (err) {
          console.error("Error creating public contact", err);
          toast.error("Unexpected error while saving account details");
        } finally {
          setSavingNewUser(false);
        }
      })();
      return;
    }

    if (!canGoNext) return;

    if (step === steps.length) {
      // Final submit – create booking
      try {
        if (!contactId) {
          toast.error("Please complete account details or login before submitting.");
          return;
        }
        if (!selectedServiceId || !selectedServiceConfig) {
          toast.error("Please select a service.");
          return;
        }
        const techId =
          technicianMode === "manual"
            ? selectedTechnician
            : availableTechnicians[0]?.id || null;
        if (!techId) {
          toast.error("Please select a technician or time where a technician is available.");
          return;
        }
        if (!appointmentDate || !appointmentTime) {
          toast.error("Please select a date and time.");
          return;
        }

        const start = new Date(`${appointmentDate}T${appointmentTime}:00`);
        if (Number.isNaN(start.getTime())) {
          toast.error("Invalid booking time.");
          return;
        }

        let totalMinutes = 0;
        visibleSubServices.forEach((sub: any) => {
          const qty = subServiceCounts[sub._id] || 0;
          const m = Number(sub.estimatedTime) || 0;
          totalMinutes += m * qty;
        });
        visibleAddons.forEach((addon: any) => {
          const qty = addonCounts[addon._id] || 0;
          const m = Number(addon.estimatedTime) || 0;
          totalMinutes += m * qty;
        });
        if (!totalMinutes) {
          totalMinutes = 120;
        }
        const end = new Date(start.getTime() + totalMinutes * 60 * 1000);

        const allowedSubIds = new Set(
          visibleSubServices.map((s: any) => s._id?.toString?.()).filter(Boolean)
        );
        const allowedAddonIds = new Set(
          visibleAddons.map((a: any) => a._id?.toString?.()).filter(Boolean)
        );

        const subServices = Object.entries(subServiceCounts)
          .filter(([id, qty]) => (qty as number) > 0 && allowedSubIds.has(id))
          .map(([serviceId, quantity]) => ({ serviceId, quantity }));

        const addons = Object.entries(addonCounts)
          .filter(([id, qty]) => (qty as number) > 0 && allowedAddonIds.has(id))
          .map(([serviceId, quantity]) => ({ serviceId, quantity }));

        const pricing = {
          baseAmount:
            Number((selectedServiceConfig as any).basePrice) ||
            Number((selectedServiceConfig as any).hourlyRate) ||
            0,
          subServicesAmount: subTotal,
          addonsAmount: addonsTotal,
          totalAmount: total,
          discount,
          finalAmount,
          billedHours: totalMinutes / 60,
        };

        const res = await fetch("/api/public/bookings", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            companyId: company?._id,
            contactId,
            technicianId: techId,
            serviceId: selectedServiceId,
            subServices,
            addons,
            startDateTime: start.toISOString(),
            endDateTime: end.toISOString(),
            notes: appointmentNotes || undefined,
            pricing,
            zipCode: searchZip.trim() || undefined,
          }),
        });

        if (!res.ok) {
          const err = await res.json().catch(() => null);
          toast.error(err?.error || "Failed to create booking");
          return;
        }

        toast.success("Booking submitted successfully");
        setShowThankYou(true);
      } catch (err) {
        console.error("Error submitting public booking", err);
        toast.error("Unexpected error while submitting booking");
      }
      return;
    }

    setStep((prev) => Math.min(prev + 1, steps.length));
  };

  const handlePrevious = () => {
    setStep((prev) => Math.max(prev - 1, 1));
  };

  useEffect(() => {
    // Load technicians and calendar events for manual selection/availability
    (async () => {
      try {
        const res = await fetch("/api/appointments/resources", { credentials: "include" });
        if (!res.ok) return;
        const data = await res.json();
        if (data?.resources) setTechnicians(data.resources);
        if (data?.events) setCalendarEvents(data.events);
      } catch {
        // ignore errors on public page
      }
    })();
  }, []);

  const availableTechnicians = useMemo(() => {
    if (!technicians || technicians.length === 0) return [];

    const normalizedZip = searchZip.replace(/\s+/g, "").toLowerCase();
    if (!normalizedZip) return [];

    // First filter by zipcode coverage
    const techsByZip = technicians.filter((tech: any) => {
      const zips: string[] = tech.workingZipCodes || [];
      if (!zips.length) return false;
      return zips.some(
        (z) => z && z.replace(/\s+/g, "").toLowerCase() === normalizedZip
      );
    });
    if (!techsByZip.length) return [];

    // Then filter by service if a service is selected
    const techsByService = techsByZip.filter((tech: any) => {
      if (!selectedServiceId) return true;
      if (!tech.services || tech.services.length === 0) return true;
      return tech.services.some(
        (id: any) => id.toString && id.toString() === selectedServiceId.toString()
      );
    });

    // If no date or time selected yet, just return service-filtered list
    if (!appointmentDate || !appointmentTime) return techsByService;

    const start = new Date(`${appointmentDate}T${appointmentTime}:00`);
    if (Number.isNaN(start.getTime())) return techsByService;
    const end = new Date(start.getTime() + 2 * 60 * 60 * 1000); // 2‑hour window

    return techsByService.filter((tech: any) => {
      const techId = tech.id || tech._id?.toString?.();
      if (!techId) return false;

      const eventsForTech = (calendarEvents || []).filter(
        (ev: any) => ev.resourceId === techId
      );

      // If any blocking event overlaps, technician is not available
      const hasBlockingOverlap = eventsForTech.some((ev: any) => {
        const evStart = new Date(ev.start).getTime();
        const evEnd = new Date(ev.end).getTime();
        if (!evStart || !evEnd) return false;
        return start.getTime() < evEnd && end.getTime() > evStart;
      });

      return !hasBlockingOverlap;
    });
  }, [technicians, calendarEvents, selectedServiceId, appointmentDate, appointmentTime, searchZip]);

  useEffect(() => {
    // Try to load active promocodes for this company; if unauthorized, just ignore.
    (async () => {
      try {
        const res = await fetch("/api/promocodes", { credentials: "include" });
        if (!res.ok) return;
        const data = await res.json();
        setPromocodes(Array.isArray(data) ? data : []);
      } catch {
        // ignore errors in public view
      }
    })();
  }, []);

  useEffect(() => {
    if (!promocodeInput.trim() || total <= 0 || promocodes.length === 0) {
      setDiscount(0);
      return;
    }

    const code = promocodeInput.trim().toUpperCase();
    const promo = promocodes.find((p: any) => p.code?.toUpperCase() === code);
    if (!promo) {
      setDiscount(0);
      return;
    }

    if (promo.limit === 0) {
      setDiscount(0);
      return;
    }

    const valueNum = Number(promo.value) || 0;
    if (!valueNum) {
      setDiscount(0);
      return;
    }

    let applied = 0;
    if (promo.type === "percentage") {
      applied = total * (valueNum / 100);
    } else {
      applied = valueNum;
    }

    setDiscount(Number(Math.min(applied, total).toFixed(2)));
  }, [promocodeInput, total, promocodes]);

  return (
    <div className="min-h-screen bg-muted text-foreground">
      <header className="border-b bg-background/80 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
          <div className="flex items-center gap-3">
            {company.logo ? (
              <img
                src={company.logo}
                alt={company.name}
                className="h-10 w-10 rounded-lg border border-border object-cover"
              />
            ) : (
              <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-muted text-sm font-semibold">
                {company.name?.slice(0, 2)?.toUpperCase() || "CO"}
              </div>
            )}
            <div>
              <div className="text-sm font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                {company.industry || "Service Provider"}
              </div>
              <h1 className="text-xl font-bold tracking-tight">{company.name}</h1>
            </div>
          </div>
            <div className="flex items-center gap-4">
            <div className="hidden text-xs text-muted-foreground sm:block">
              {company.website && (
                <a
                  href={company.website}
                  target="_blank"
                  rel="noreferrer"
                  className="hover:text-foreground"
                >
                  {company.website.replace(/^https?:\/\//, "")}
                </a>
              )}
            </div>
            <div className="flex items-center gap-2">
              <a
                href={subdomain ? `/login?subdomain=${encodeURIComponent(subdomain)}` : "/login"}
                className="rounded-full border border-border px-4 py-1.5 text-xs font-medium text-foreground hover:border-primary hover:text-primary"
              >
                Login
              </a>
              <a
                href={
                  subdomain
                    ? `/register?subdomain=${encodeURIComponent(subdomain)}`
                    : "/register"
                }
                className="rounded-full bg-primary px-4 py-1.5 text-xs font-semibold text-primary-foreground shadow-sm hover:bg-primary/90"
              >
                Register
              </a>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto flex max-w-5xl flex-col gap-8 px-4 py-10 md:py-14">
        <section className="rounded-2xl border bg-background p-5 shadow-sm">
          <p className="inline-flex rounded-full border border-primary/40 bg-primary/10 px-3 py-1 text-xs font-medium uppercase tracking-[0.2em] text-primary">
            Secure online booking
          </p>
          <h2 className="mt-3 text-2xl font-semibold tracking-tight sm:text-3xl md:text-4xl text-foreground">
            Book your {company.industry || "service"} in a few simple steps.
          </h2>
          <p className="mt-2 max-w-xl text-xs text-muted-foreground sm:text-sm">
            Choose your service, pick your preferred professional and time, share any notes, and
            confirm securely. You&apos;ll receive a confirmation email once your booking is
            complete.
          </p>
        </section>

        <section className="grid gap-6 md:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
          <div className="space-y-6 rounded-2xl border bg-background p-5">
            <div>
              <div className="mb-4 flex items-center justify-between text-xs font-medium text-muted-foreground">
                <span>Step {step} of {steps.length}</span>
              </div>
              <div className="flex items-center gap-3">
                {steps.map((s, index) => {
                  const isActive = s.id === step;
                  const isCompleted = step > s.id && isStepComplete(s.id);
                  return (
                    <div key={s.id} className="flex flex-1 items-center gap-2">
                      <div
                        className={[
                          "flex h-7 w-7 items-center justify-center rounded-full border text-xs font-semibold",
                          isActive
                            ? "border-primary bg-primary text-primary-foreground shadow-sm"
                            : isCompleted
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-border bg-muted text-muted-foreground",
                        ].join(" ")}
                      >
                        {index + 1}
                      </div>
                      <div className="hidden flex-1 text-[11px] font-medium uppercase tracking-[0.15em] text-muted-foreground sm:block">
                        {s.label}
                      </div>
                      {index < steps.length - 1 && (
                        <div className="hidden h-px flex-1 rounded-full bg-border sm:block" />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {step === 1 && (
              <div className="space-y-6">
                <div className="space-y-3">
                  <div className="text-sm font-semibold text-foreground">Choose user</div>
                  <div className="grid gap-3 text-xs sm:grid-cols-2 sm:text-sm">
                    <button
                      type="button"
                      onClick={() => {
                        setUserType("new");
                        setExistingVerified(false);
                        setNewUserFormStep("form");
                      }}
                      className={[
                        "flex flex-col items-start gap-1 rounded-lg border px-4 py-3 text-left",
                        userType === "new"
                          ? "border-primary bg-primary/5"
                          : "border-border bg-background hover:border-primary/60",
                      ].join(" ")}
                    >
                      <div className="flex w-full items-center justify-between">
                        <span className="font-semibold text-foreground">New user</span>
                        {userType === "new" && (
                          <span className="h-5 w-5 rounded-full bg-primary text-[10px] font-bold text-primary-foreground flex items-center justify-center">
                            ✓
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Don&apos;t have an account? Create one in the next steps.
                      </p>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setUserType("existing");
                        setExistingVerified(false);
                        setNewUserFormStep("notes");
                      }}
                      className={[
                        "flex flex-col items-start gap-1 rounded-lg border px-4 py-3 text-left",
                        userType === "existing"
                          ? "border-primary bg-primary/5"
                          : "border-border bg-background hover:border-primary/60",
                      ].join(" ")}
                    >
                      <div className="flex w-full items-center justify-between">
                        <span className="font-semibold text-foreground">Existing user</span>
                        {userType === "existing" && (
                          <span className="h-5 w-5 rounded-full bg-primary text-[10px] font-bold text-primary-foreground flex items-center justify-center">
                            ✓
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Login with your email and password to continue.
                      </p>
                    </button>
                  </div>
                </div>

                {userType === "existing" && !existingVerified && (
                  <div className="space-y-3 rounded-xl border bg-muted p-4 text-xs text-foreground sm:text-sm">
                    <div className="text-sm font-semibold text-foreground">Enter login details</div>
                    <div className="space-y-2">
                      <input
                        type="email"
                        placeholder="Enter email"
                        value={existingEmail}
                        onChange={(e) => setExistingEmail(e.target.value)}
                        className="w-full rounded-lg border border-input bg-background px-3 py-2 text-xs text-foreground outline-none ring-0 placeholder:text-muted-foreground focus:border-primary"
                      />
                      <input
                        type="password"
                        placeholder="Enter password"
                        value={existingPassword}
                        onChange={(e) => setExistingPassword(e.target.value)}
                        className="w-full rounded-lg border border-input bg-background px-3 py-2 text-xs text-foreground outline-none ring-0 placeholder:text-muted-foreground focus:border-primary"
                      />
                    </div>
                    <div className="flex items-center justify-between pt-1">
                      <button
                        type="button"
                        onClick={() => {
                          if (!existingEmail.trim() || !existingPassword.trim()) {
                            toast.error("Please enter email and password");
                            return;
                          }
                          (async () => {
                            try {
                              const res = await fetch("/api/public/contacts/login", {
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({
                                  companyId: company?._id,
                                  email: existingEmail.trim(),
                                  password: existingPassword,
                                }),
                              });
                              if (!res.ok) {
                                const err = await res.json().catch(() => null);
                                toast.error(err?.error || "Invalid email or password");
                                return;
                              }
                              const data = await res.json();
                              setContactId(data.id);
                              setExistingVerified(true);
                              toast.success("Login successful");
                            } catch (err) {
                              console.error("Public contact login failed", err);
                              toast.error("Unexpected error while logging in");
                            }
                          })();
                        }}
                        className="rounded-full bg-primary px-5 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90"
                      >
                        Login
                      </button>
                      <button
                        type="button"
                        className="text-xs font-medium text-primary hover:text-primary/80"
                      >
                        Forgot password
                      </button>
                    </div>
                  </div>
                )}

                {userType && (userType === "new" || (userType === "existing" && existingVerified)) && (
                  <div className="space-y-5">
                    <div className="space-y-2">
                      <div className="text-sm font-semibold text-foreground">Service area</div>
                      <div className="grid gap-2 text-xs sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] sm:text-sm">
                        <div className="space-y-1">
                          <div className="text-[11px] font-medium uppercase tracking-[0.15em] text-muted-foreground">
                            Zip code
                          </div>
                          <input
                            type="text"
                            value={searchZip}
                            onChange={(e) => setSearchZip(e.target.value)}
                            placeholder="Enter service zip code"
                            className="w-full rounded-md border border-input bg-background px-3 py-2 text-xs text-foreground outline-none ring-0 placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/20"
                          />
                        </div>
                        <div className="flex items-end">
                          <p className="text-[11px] text-muted-foreground">
                            We&apos;ll only show services available in this area.
                          </p>
                        </div>
                      </div>
                      {!searchZip.trim() && (
                        <p className="text-[11px] text-muted-foreground">
                          Enter your zip code to see services in your area.
                        </p>
                      )}
                      {searchZip.trim() && !filteredMainServices.length && (
                        <p className="text-[11px] text-destructive">
                          No services are currently available for this zip code. Please try a
                          different area.
                        </p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <div className="text-sm font-semibold text-foreground">Choose a service</div>
                      <div className="space-y-3 rounded-xl border bg-muted p-4 text-xs text-foreground sm:text-sm">
                        {filteredMainServices.map((service: any) => (
                          <label
                            key={service._id}
                            className="flex cursor-pointer items-center justify-between gap-3 rounded-lg border border-border bg-background px-3 py-2 text-xs hover:border-primary/70"
                          >
                            <div className="flex items-center gap-2">
                              <input
                                type="radio"
                                name="service"
                                value={service._id}
                                checked={selectedServiceId === service._id}
                                onChange={() => {
                                  setSelectedServiceId(service._id);
                                  setSubServiceCounts({});
                                  setAddonCounts({});
                                }}
                                className="h-3 w-3 accent-primary"
                              />
                              <span>{service.name}</span>
                            </div>
                          </label>
                        ))}
                      </div>
                    </div>

                    {selectedServiceConfig && (
                      <div className="space-y-4">
                        {visibleSubServices.length > 0 && (
                            <div className="space-y-2">
                              <div className="text-[11px] font-medium uppercase tracking-[0.15em] text-muted-foreground">
                                Sub services
                              </div>
                              <div className="space-y-2 rounded-xl border bg-muted p-3 text-xs text-foreground sm:text-sm">
                                {visibleSubServices.map((sub: any) => (
                                    <label
                                      key={sub._id}
                                      className="flex cursor-pointer items-center justify-between gap-3 rounded-lg border border-border bg-background px-3 py-2 hover:border-primary/70"
                                    >
                                      <div className="flex items-center gap-2">
                                        <span>{sub.name}</span>
                                      </div>
                                      <div className="flex items-center gap-1">
                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setSubServiceCounts((prev) => {
                                              const current = prev[sub._id] ?? 0;
                                              const next = Math.max(0, current - 1);
                                              return { ...prev, [sub._id]: next };
                                            });
                                          }}
                                          className="h-6 w-6 rounded-full border border-border text-xs text-foreground hover:border-primary"
                                        >
                                          -
                                        </button>
                                        <span className="w-6 text-center text-xs font-medium">
                                          {subServiceCounts[sub._id] ?? 0}
                                        </span>
                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setSubServiceCounts((prev) => {
                                              const current = prev[sub._id] ?? 0;
                                              const next = Math.min(99, current + 1);
                                              return { ...prev, [sub._id]: next };
                                            });
                                          }}
                                          className="h-6 w-6 rounded-full border border-border text-xs text-foreground hover:border-primary"
                                        >
                                          +
                                        </button>
                                      </div>
                                    </label>
                                  ))}
                              </div>
                            </div>
                          )}

                        {selectedServiceConfig.addons &&
                          visibleAddons.length > 0 && (
                            <div className="space-y-2">
                              <div className="text-[11px] font-medium uppercase tracking-[0.15em] text-muted-foreground">
                                Add-ons
                              </div>
                              <div className="space-y-2 rounded-xl border bg-muted p-3 text-xs text-foreground sm:text-sm">
                                {visibleAddons.map((addon: any) => (
                                    <label
                                      key={addon._id}
                                      className="flex cursor-pointer items-center justify-between gap-3 rounded-lg border border-border bg-background px-3 py-2 hover:border-primary/70"
                                    >
                                      <div className="flex items-center gap-2">
                                        <span>{addon.name}</span>
                                      </div>
                                      <div className="flex items-center gap-1">
                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setAddonCounts((prev) => {
                                              const current = prev[addon._id] ?? 0;
                                              const next = Math.max(0, current - 1);
                                              return { ...prev, [addon._id]: next };
                                            });
                                          }}
                                          className="h-6 w-6 rounded-full border border-border text-xs text-foreground hover:border-primary"
                                        >
                                          -
                                        </button>
                                        <span className="w-6 text-center text-xs font-medium">
                                          {addonCounts[addon._id] ?? 0}
                                        </span>
                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setAddonCounts((prev) => {
                                              const current = prev[addon._id] ?? 0;
                                              const next = Math.min(99, current + 1);
                                              return { ...prev, [addon._id]: next };
                                            });
                                          }}
                                          className="h-6 w-6 rounded-full border border-border text-xs text-foreground hover:border-primary"
                                        >
                                          +
                                        </button>
                                      </div>
                                    </label>
                                  ))}
                              </div>
                            </div>
                          )}
                      </div>
                    )}

                  </div>
                )}
              </div>
            )}

            {step === 2 && (
              <div className="space-y-6">
                <div className="space-y-2">
                  <div className="text-sm font-semibold text-foreground">Technician</div>
                  <div className="flex flex-wrap gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        setTechnicianMode("random");
                        setSelectedTechnician("random");
                      }}
                      className={[
                        "flex-1 min-w-[120px] rounded-full border px-4 py-2 text-xs font-medium",
                        technicianMode === "random"
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border bg-background text-foreground hover:border-primary/60",
                      ].join(" ")}
                    >
                      Select random technician
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setTechnicianMode("manual");
                        setSelectedTechnician(null);
                      }}
                      className={[
                        "flex-1 min-w-[120px] rounded-full border px-4 py-2 text-xs font-medium",
                        technicianMode === "manual"
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border bg-background text-foreground hover:border-primary/60",
                      ].join(" ")}
                    >
                      Choose your technician
                    </button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    We&apos;ll always send a vetted professional. You can either let us assign one
                    automatically, or pick a specific technician.
                  </p>
                </div>

                {technicianMode === "manual" && (
                  <div className="space-y-2">
                    <div className="text-[11px] font-medium uppercase tracking-[0.15em] text-muted-foreground">
                      Available technicians
                    </div>
                    {availableTechnicians.length === 0 ? (
                      <div className="rounded-xl border bg-muted p-3 text-xs text-muted-foreground">
                        No technicians are available for the selected date and time. Please adjust
                        your time or choose the random technician option.
                      </div>
                    ) : (
                      <div className="grid max-h-72 grid-cols-2 gap-3 overflow-y-auto rounded-xl border bg-muted p-3 sm:grid-cols-3">
                        {availableTechnicians.map((tech: any) => (
                          <button
                            key={tech.id}
                            type="button"
                            onClick={() => setSelectedTechnician(tech.id)}
                            className={[
                              "flex flex-col items-center gap-1 rounded-lg border px-2 py-2 text-center text-[11px] font-medium",
                              selectedTechnician === tech.id
                                ? "border-primary bg-primary/10 text-primary"
                                : "border-border bg-background text-foreground hover:border-primary/70",
                            ].join(" ")}
                          >
                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted text-[11px] font-semibold">
                              {tech.title
                                ?.split(" ")
                                .map((p: string) => p[0])
                                .join("")
                                .toUpperCase() || "T"}
                            </div>
                            <span className="line-clamp-2">{tech.title}</span>
                            {tech.group && (
                              <span className="text-[10px] text-muted-foreground">
                                {tech.group}
                              </span>
                            )}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                <div className="space-y-4">
                  <div className="text-sm font-semibold text-foreground">
                    When would you like us to come?
                  </div>

                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => setAppointmentTime("09:00")}
                      className={[
                        "flex-1 rounded-lg border px-4 py-2 text-xs font-medium",
                        appointmentTime && appointmentTime < "12:00"
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border bg-background text-foreground hover:border-primary/60",
                      ].join(" ")}
                    >
                      Morning <span className="block text-[10px] text-muted-foreground">8:00 AM – 12:00 PM</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setAppointmentTime("14:00")}
                      className={[
                        "flex-1 rounded-lg border px-4 py-2 text-xs font-medium",
                        appointmentTime && appointmentTime >= "12:00"
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border bg-background text-foreground hover:border-primary/60",
                      ].join(" ")}
                    >
                      Afternoon <span className="block text-[10px] text-muted-foreground">12:00 PM – 5:00 PM</span>
                    </button>
                  </div>

                  <div className="grid gap-4 text-xs text-foreground sm:grid-cols-[minmax(0,2fr)_minmax(0,1.5fr)] sm:text-sm">
                    <div className="space-y-2">
                      <div className="text-[11px] font-medium uppercase tracking-[0.15em] text-muted-foreground">
                        Date
                      </div>
                      <div className="rounded-xl border bg-muted p-3">
                        <Calendar
                          mode="single"
                          selected={appointmentDateObj}
                          onSelect={(date) => {
                            setAppointmentDateObj(date || undefined);
                            setAppointmentDate(date ? format(date, "yyyy-MM-dd") : "");
                          }}
                          initialFocus
                        />
                      </div>
                    </div>
                    <div className="space-y-3">
                      <div>
                        <div className="text-[11px] font-medium uppercase tracking-[0.15em] text-muted-foreground">
                          Booking time
                        </div>
                        <input
                          type="time"
                          value={appointmentTime}
                          onChange={(e) => setAppointmentTime(e.target.value)}
                          className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-xs text-foreground outline-none ring-0 focus:border-primary focus:ring-2 focus:ring-primary/30"
                        />
                        <p className="mt-1 text-[11px] text-muted-foreground">
                          Select a time within your chosen window.
                        </p>
                      </div>
                      <div className="space-y-2">
                        <div className="text-[11px] font-medium uppercase tracking-[0.15em] text-muted-foreground">
                          Do you have pets?
                        </div>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            className="flex-1 rounded-full border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground hover:border-primary hover:text-primary"
                          >
                            Cats
                          </button>
                          <button
                            type="button"
                            className="flex-1 rounded-full border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground hover:border-primary hover:text-primary"
                          >
                            Dogs
                          </button>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <div className="text-[11px] font-medium uppercase tracking-[0.15em] text-muted-foreground">
                          Special instructions
                        </div>
                        <textarea
                          rows={3}
                          className="w-full rounded-lg border border-input bg-background px-3 py-2 text-xs text-foreground outline-none ring-0 placeholder:text-muted-foreground focus:border-primary"
                          placeholder="Share any access details, parking notes, or other requests."
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-6">
                {userType === "new" && newUserFormStep === "form" && (
                  <div className="space-y-4 rounded-2xl border bg-background p-4">
                    <div className="text-sm font-semibold text-foreground">
                      New account details
                    </div>
                    <div className="space-y-3">
                      <div className="space-y-1">
                        <div className="text-xs font-medium text-foreground">Preferred email</div>
                        <input
                          type="email"
                          placeholder="Enter email"
                          value={newUserForm.email}
                          onChange={(e) =>
                            setNewUserForm((prev) => ({ ...prev, email: e.target.value }))
                          }
                          className="w-full rounded-md border border-input bg-background px-3 py-2 text-xs text-foreground outline-none ring-0 placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/20"
                        />
                      </div>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <div className="space-y-1">
                          <div className="text-xs font-medium text-foreground">
                            Preferred password
                          </div>
                          <input
                            type="password"
                            value={newUserForm.password}
                            onChange={(e) =>
                              setNewUserForm((prev) => ({ ...prev, password: e.target.value }))
                            }
                            className="w-full rounded-md border border-input bg-background px-3 py-2 text-xs text-foreground outline-none ring-0 focus:border-primary focus:ring-2 focus:ring-primary/20"
                          />
                        </div>
                        <div className="space-y-1">
                          <div className="text-xs font-medium text-foreground">
                            Confirm password
                          </div>
                          <input
                            type="password"
                            value={newUserForm.confirmPassword}
                            onChange={(e) =>
                              setNewUserForm((prev) => ({
                                ...prev,
                                confirmPassword: e.target.value,
                              }))
                            }
                            className="w-full rounded-md border border-input bg-background px-3 py-2 text-xs text-foreground outline-none ring-0 focus:border-primary focus:ring-2 focus:ring-primary/20"
                          />
                        </div>
                      </div>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <div className="space-y-1">
                          <div className="text-xs font-medium text-foreground">First name</div>
                          <input
                            type="text"
                            value={newUserForm.firstName}
                            onChange={(e) =>
                              setNewUserForm((prev) => ({ ...prev, firstName: e.target.value }))
                            }
                            className="w-full rounded-md border border-input bg-background px-3 py-2 text-xs text-foreground outline-none ring-0 focus:border-primary focus:ring-2 focus:ring-primary/20"
                          />
                        </div>
                        <div className="space-y-1">
                          <div className="text-xs font-medium text-foreground">Last name</div>
                          <input
                            type="text"
                            value={newUserForm.lastName}
                            onChange={(e) =>
                              setNewUserForm((prev) => ({ ...prev, lastName: e.target.value }))
                            }
                            className="w-full rounded-md border border-input bg-background px-3 py-2 text-xs text-foreground outline-none ring-0 focus:border-primary focus:ring-2 focus:ring-primary/20"
                          />
                        </div>
                      </div>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <div className="space-y-1">
                          <div className="text-xs font-medium text-foreground">Phone</div>
                          <input
                            type="tel"
                            value={newUserForm.phone}
                            onChange={(e) =>
                              setNewUserForm((prev) => ({ ...prev, phone: e.target.value }))
                            }
                            className="w-full rounded-md border border-input bg-background px-3 py-2 text-xs text-foreground outline-none ring-0 focus:border-primary focus:ring-2 focus:ring-primary/20"
                          />
                        </div>
                        <div className="space-y-1">
                          <div className="text-xs font-medium text-foreground">Zip code</div>
                          <input
                            type="text"
                            value={newUserForm.zipCode}
                            onChange={(e) =>
                              setNewUserForm((prev) => ({ ...prev, zipCode: e.target.value }))
                            }
                            className="w-full rounded-md border border-input bg-background px-3 py-2 text-xs text-foreground outline-none ring-0 focus:border-primary focus:ring-2 focus:ring-primary/20"
                          />
                        </div>
                      </div>
                      <div className="space-y-1">
                        <div className="text-xs font-medium text-foreground">Street address</div>
                        <input
                          type="text"
                          value={newUserForm.address}
                          onChange={(e) =>
                            setNewUserForm((prev) => ({ ...prev, address: e.target.value }))
                          }
                          className="w-full rounded-md border border-input bg-background px-3 py-2 text-xs text-foreground outline-none ring-0 focus:border-primary focus:ring-2 focus:ring-primary/20"
                        />
                      </div>
                      <div className="grid gap-3 sm:grid-cols-3">
                        <div className="space-y-1">
                          <div className="text-xs font-medium text-foreground">Country</div>
                          <select
                            value={newUserForm.country}
                            onChange={(e) =>
                              setNewUserForm((prev) => ({
                                ...prev,
                                country: e.target.value,
                                state: "",
                                city: "",
                              }))
                            }
                            disabled={!geoLib}
                            className="w-full rounded-md border border-input bg-background px-3 py-2 text-xs text-foreground outline-none ring-0 focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            <option value="">Select country</option>
                            {countryOptions.map((c: any) => (
                              <option key={c.value} value={c.value}>
                                {c.label}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="space-y-1">
                          <div className="text-xs font-medium text-foreground">State</div>
                          <select
                            value={newUserForm.state}
                            onChange={(e) =>
                              setNewUserForm((prev) => ({ ...prev, state: e.target.value, city: "" }))
                            }
                            disabled={!geoLib || !newUserForm.country}
                            className="w-full rounded-md border border-input bg-background px-3 py-2 text-xs text-foreground outline-none ring-0 focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            <option value="">Select state</option>
                            {stateOptions.map((s: any) => (
                              <option key={s.value} value={s.value}>
                                {s.label}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="space-y-1">
                          <div className="text-xs font-medium text-foreground">City</div>
                          <select
                            value={newUserForm.city}
                            onChange={(e) =>
                              setNewUserForm((prev) => ({ ...prev, city: e.target.value }))
                            }
                            disabled={!geoLib || !newUserForm.state}
                            className="w-full rounded-md border border-input bg-background px-3 py-2 text-xs text-foreground outline-none ring-0 focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            <option value="">Select city</option>
                            {cityOptions.map((c: any) => (
                              <option key={c.value} value={c.value}>
                                {c.label}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                      <label className="mt-2 flex items-center gap-2 text-[11px] text-muted-foreground">
                        <input
                          type="checkbox"
                          className="h-3 w-3 accent-primary"
                          checked={newUserForm.smsOptIn}
                          onChange={(e) =>
                            setNewUserForm((prev) => ({ ...prev, smsOptIn: e.target.checked }))
                          }
                        />
                        <span>I agree to receive SMS updates about my appointments.</span>
                      </label>
                    </div>
                  </div>
                )}

                {(userType !== "new" || newUserFormStep === "notes") && (
                  <div className="space-y-2">
                    <div className="text-sm font-semibold text-foreground">Appointment notes</div>
                    <p className="text-xs text-muted-foreground">
                      Share any special instructions or access details here so our team can prepare
                      in advance.
                    </p>
                    <textarea
                      rows={5}
                      value={appointmentNotes}
                      onChange={(e) => setAppointmentNotes(e.target.value)}
                      placeholder="For example: gate code, parking instructions, or rooms to prioritize."
                      className="mt-2 w-full rounded-lg border border-input bg-background px-3 py-2 text-xs text-foreground outline-none ring-0 placeholder:text-muted-foreground focus:border-primary sm:text-sm"
                    />
                  </div>
                )}
              </div>
            )}

            {step === 4 && (
              <div className="space-y-5">
                <div className="text-sm font-semibold text-foreground">Credit card details</div>
                <p className="text-xs text-muted-foreground">
                  Payments are processed securely. You won&apos;t be charged until your booking is
                  confirmed.
                </p>

                <div className="space-y-3 rounded-xl border bg-muted p-4 text-xs text-foreground sm:text-sm">
                  {cards.map((card) => (
                    <label
                      key={card.id}
                      className="flex cursor-pointer items-center justify-between gap-3 rounded-lg border border-border bg-background px-3 py-2 hover:border-primary/70"
                    >
                      <div className="flex items-center gap-3">
                        <input
                          type="radio"
                          name="card"
                          value={card.id}
                          checked={savedCard === card.id}
                          onChange={() => setSavedCard(card.id)}
                          className="h-3 w-3 accent-primary"
                        />
                        <div>
                          <div className="font-medium">
                            •••• •••• •••• {card.last4}
                          </div>
                          <div className="text-[11px] text-muted-foreground">
                            {card.brand} exp {card.expMonth}/{card.expYear}
                          </div>
                        </div>
                      </div>
                    </label>
                  ))}

                  <button
                    type="button"
                    onClick={() => setAddCardOpen(true)}
                    className="mt-1 inline-flex items-center justify-center rounded-full border border-dashed border-border px-4 py-1.5 text-xs font-medium text-muted-foreground hover:border-primary hover:text-primary"
                  >
                    Add new card
                  </button>
                </div>

                {addCardOpen && (
                  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
                    <div className="w-full max-w-md rounded-xl bg-background p-5 shadow-lg">
                      <div className="mb-4 flex items-center justify-between">
                        <div className="text-sm font-semibold text-foreground">
                          New card details
                        </div>
                        <button
                          type="button"
                          onClick={() => setAddCardOpen(false)}
                          className="h-6 w-6 rounded-full border border-border text-xs font-bold text-muted-foreground hover:border-primary hover:text-primary"
                        >
                          ×
                        </button>
                      </div>

                      <div className="space-y-3 text-xs text-foreground">
                        <div className="space-y-1">
                          <div className="font-medium">Card number</div>
                          <input
                            type="text"
                            inputMode="numeric"
                            placeholder="1234 5678 9012 3456"
                            maxLength={19}
                            value={newCard.number}
                            onChange={(e) => {
                              const digits = e.target.value.replace(/\D/g, "").slice(0, 16);
                              const groups = digits.match(/.{1,4}/g) || [];
                              const formatted = groups.join(" ");
                              setNewCard((prev) => ({ ...prev, number: formatted }));
                            }}
                            className="w-full rounded-md border border-input bg-background px-3 py-2 text-xs outline-none ring-0 placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/20"
                          />
                        </div>

                        <div className="grid gap-3 sm:grid-cols-2">
                          <div className="space-y-1">
                            <div className="font-medium">Exp. date</div>
                            <input
                              type="text"
                              placeholder="MM/YY"
                              maxLength={5}
                              value={newCard.exp}
                              onChange={(e) => {
                                let value = e.target.value.replace(/[^\d/]/g, "");
                                if (value.length === 1 && Number(value) > 1) {
                                  value = "0" + value;
                                }
                                if (value.length === 2 && !value.includes("/")) {
                                  value = value + "/";
                                }
                                if (value.length > 5) {
                                  value = value.slice(0, 5);
                                }
                                setNewCard((prev) => ({ ...prev, exp: value }));
                              }}
                              className="w-full rounded-md border border-input bg-background px-3 py-2 text-xs outline-none ring-0 placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/20"
                            />
                          </div>
                          <div className="space-y-1">
                            <div className="font-medium">CVV</div>
                            <input
                              type="password"
                              placeholder="CVV"
                              maxLength={3}
                              value={newCard.cvv}
                              onChange={(e) => {
                                const digits = e.target.value.replace(/\D/g, "").slice(0, 3);
                                setNewCard((prev) => ({ ...prev, cvv: digits }));
                              }}
                              className="w-full rounded-md border border-input bg-background px-3 py-2 text-xs outline-none ring-0 placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/20"
                            />
                          </div>
                        </div>

                        <div className="space-y-1">
                          <div className="font-medium">Full name</div>
                          <input
                            type="text"
                            placeholder="Name on card"
                            value={newCard.name}
                            onChange={(e) =>
                              setNewCard((prev) => ({ ...prev, name: e.target.value }))
                            }
                            className="w-full rounded-md border border-input bg-background px-3 py-2 text-xs outline-none ring-0 placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/20"
                          />
                        </div>
                      </div>

                      <div className="mt-5 flex justify-end gap-3">
                        <button
                          type="button"
                          onClick={() => setAddCardOpen(false)}
                          className="rounded-md bg-red-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-red-700"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={async () => {
                            const cleanNumber = newCard.number.replace(/\s+/g, "");
                            if (cleanNumber.length !== 16) {
                              toast.error("Card number must be 16 digits.");
                              return;
                            }
                            if (!/^\d{2}\/\d{2}$/.test(newCard.exp)) {
                              toast.error("Expiry must be in MM/YY format.");
                              return;
                            }
                            const [mm, yy] = newCard.exp.split("/");
                            const monthNum = Number(mm);
                            if (monthNum < 1 || monthNum > 12) {
                              toast.error("Expiry month must be between 01 and 12.");
                              return;
                            }
                            if (newCard.cvv.length !== 3) {
                              toast.error("CVV must be 3 digits.");
                              return;
                            }
                            if (!newCard.name.trim()) {
                              toast.error("Please enter the name on card.");
                              return;
                            }

                            const last4 = cleanNumber.slice(-4);
                            const id = `card_${Date.now()}`;
                            setCards((prev) => [
                              ...prev,
                              {
                                id,
                                brand: "Card",
                                last4,
                                expMonth: mm,
                                expYear: yy,
                                name: newCard.name.trim(),
                              },
                            ]);
                            setSavedCard(id);

                            if (contactId) {
                              try {
                                await fetch("/api/public/cards", {
                                  method: "POST",
                                  headers: { "Content-Type": "application/json" },
                                  body: JSON.stringify({
                                    userId: contactId,
                                    brand: "Card",
                                    last4,
                                    expMonth: mm,
                                    expYear: yy,
                                    nameOnCard: newCard.name.trim(),
                                  }),
                                });
                              } catch (err) {
                                console.error("Failed to save card details", err);
                              }
                            }

                            setNewCard({ number: "", exp: "", cvv: "", name: "" });
                            setAddCardOpen(false);
                          }}
                          className="rounded-md bg-primary px-4 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90"
                        >
                          Save
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="mt-3 flex items-center justify-between border-t border-border pt-4">
              <button
                type="button"
                onClick={handlePrevious}
                disabled={step === 1}
                className="inline-flex items-center justify-center rounded-full border border-border px-5 py-1.5 text-xs font-medium text-foreground hover:border-primary disabled:cursor-not-allowed disabled:border-muted disabled:text-muted-foreground"
              >
                Previous
              </button>

              <button
                type="button"
                onClick={handleNext}
                disabled={!canGoNext}
                className="inline-flex items-center justify-center rounded-full bg-primary px-6 py-1.5 text-xs font-semibold text-primary-foreground shadow-sm hover:bg-primary/90 disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground"
              >
                {step === steps.length ? "Submit" : "Next"}
              </button>
            </div>
          </div>

          <aside className="space-y-4 rounded-2xl border bg-background p-5 text-xs text-foreground sm:text-sm">
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                Booking summary
              </div>
              <div className="mt-3 space-y-2 rounded-xl bg-muted p-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Estimated billed amount</span>
                  <span className="text-xs font-semibold text-primary">
                    {selectedServiceId ? `$${finalAmount.toFixed(2)}` : "$0.00"}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Estimated duration</span>
                  <span className="text-xs text-muted-foreground">
                    {selectedServiceId && visibleSubServices.length > 0
                      ? `${Math.max(
                          1,
                          Math.round(
                            visibleSubServices.reduce((minutes: number, sub: any) => {
                              const qty = subServiceCounts[sub._id] || 0;
                              const m = Number(sub.estimatedTime) || 0;
                              return minutes + m * qty;
                            }, 0) / 60
                          )
                        )} hours`
                      : "—"}
                  </span>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                Apply promocode
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Enter promocode"
                  value={promocodeInput}
                  onChange={(e) => setPromocodeInput(e.target.value)}
                  className="flex-1 rounded-lg border border-input bg-background px-3 py-1.5 text-xs text-foreground outline-none ring-0 placeholder:text-muted-foreground focus:border-primary"
                />
                <button
                  type="button"
                  className="rounded-full border border-border px-3 py-1.5 text-[11px] font-medium text-foreground hover:border-primary hover:text-primary"
                  onClick={() => setPromocodeInput((prev) => prev.trim().toUpperCase())}
                >
                  Apply
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                Cart items
              </div>
              <div className="rounded-xl border bg-muted p-3">
                <div className="space-y-1 text-xs text-muted-foreground">
                  <div className="font-medium text-foreground">
                    {selectedServiceName || "No service selected"}
                  </div>
                  {visibleSubServices.length > 0 && (
                    <div>
                      Sub services:{" "}
                      {visibleSubServices
                        .filter((sub: any) => (subServiceCounts[sub._id] || 0) > 0)
                        .map((sub: any) => `${sub.name} x${subServiceCounts[sub._id] || 0}`)
                        .join(", ") || "None"}
                    </div>
                  )}
                  {visibleAddons.length > 0 && (
                    <div>
                      Add-ons:{" "}
                      {visibleAddons
                        .filter((addon: any) => (addonCounts[addon._id] || 0) > 0)
                        .map(
                          (addon: any) => `${addon.name} x${addonCounts[addon._id] || 0}`
                        )
                        .join(", ") || "None"}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-2 border-t border-border pt-3">
              <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                Your price summary
              </div>
              <div className="space-y-1 rounded-xl bg-muted p-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Sub total</span>
                  <span className="text-xs font-semibold text-primary">
                    {selectedServiceId ? `$${total.toFixed(2)}` : "$0.00"}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Discount</span>
                  <span className="text-xs text-muted-foreground">
                    {selectedServiceId && discount > 0 ? `- $${discount.toFixed(2)}` : "$0.00"}
                  </span>
                </div>
                <div className="mt-2 flex items-center justify-between border-t border-border pt-2">
                  <span className="text-xs font-semibold text-foreground">Total</span>
                  <span className="text-xs font-bold text-primary">
                    {selectedServiceId ? `$${finalAmount.toFixed(2)}` : "$0.00"}
                  </span>
                </div>
              </div>
            </div>

            <div className="space-y-2 rounded-xl border bg-muted p-3 text-[11px] text-muted-foreground">
              <div className="font-medium text-foreground">Need help booking?</div>
              <p>
                {company.phone ? (
                  <>
                    Call us at{" "}
                    <a
                      href={`tel:${company.phone}`}
                      className="font-medium text-primary hover:text-primary/80"
                    >
                      {company.phone}
                    </a>{" "}
                    and we&apos;ll complete this booking for you.
                  </>
                ) : company.email ? (
                  <>
                    Email us at{" "}
                    <a
                      href={`mailto:${company.email}`}
                      className="font-medium text-primary hover:text-primary/80"
                    >
                      {company.email}
                    </a>{" "}
                    with your preferred date and time.
                  </>
                ) : (
                  "Reach out to our team with any questions about your booking."
                )}
              </p>
            </div>
          </aside>
        </section>
      </main>

      {showThankYou && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-md rounded-xl bg-background p-6 shadow-lg">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-foreground">Thank you for your booking</h2>
              <button
                type="button"
                onClick={() => setShowThankYou(false)}
                className="h-6 w-6 rounded-full border border-border text-xs font-bold text-muted-foreground hover:border-primary hover:text-primary"
              >
                ×
              </button>
            </div>
            <p className="text-xs text-muted-foreground">
              We&apos;ve received your booking request and will send you a confirmation as soon as it
              is scheduled. You can close this window to continue browsing.
            </p>
            <div className="mt-4 flex justify-end">
              <button
                type="button"
                onClick={() => setShowThankYou(false)}
                className="rounded-md bg-primary px-4 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      <footer className="border-t bg-background">
        <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-3 px-4 py-4 text-xs text-muted-foreground sm:flex-row">
          <span>© {new Date().getFullYear()} {company.name}. All rights reserved.</span>
          {company.website && (
            <a
              href={company.website}
              target="_blank"
              rel="noreferrer"
              className="hover:text-foreground"
            >
              Visit full website
            </a>
          )}
        </div>
      </footer>
    </div>
  );
}

