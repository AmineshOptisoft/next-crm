"use client";

import { useEffect, useMemo, useRef, useState, memo } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { signupSchema, type SignupInput } from "./schema";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";
import Link from "next/link";
import { Loader2, Check, ChevronsUpDown } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

// ─── Lazy-load country-state-city + VirtualGeoSelect (same behaviour as bookings) ─────
let geoCache: any = null;
async function loadGeo() {
  if (geoCache) return geoCache;
  geoCache = await import("country-state-city");
  return geoCache;
}

const ITEM_H = 36;
const LIST_H = 288;

const VirtualGeoSelect = memo(function VirtualGeoSelect({
  id,
  value,
  onChange,
  options,
  placeholder,
  disabled,
}: {
  id?: string;
  value: string;
  onChange: (v: string) => void;
  options: { label: string; value: string }[];
  placeholder?: string;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [typeAhead, setTypeAhead] = useState("");
  const [lastTypeTime, setLastTypeTime] = useState(0);
  const [placement, setPlacement] = useState<"top" | "bottom">("bottom");
  const [listHeight, setListHeight] = useState(LIST_H);

  const totalH = options.length * ITEM_H;
  const startIdx = Math.floor(scrollTop / ITEM_H);
  const visibleCount = Math.ceil((listHeight || LIST_H) / ITEM_H) + 2;
  const endIdx = Math.min(startIdx + visibleCount, options.length);
  const visibleItems = options.slice(startIdx, endIdx);
  const offsetY = startIdx * ITEM_H;

  const displayLabel = useMemo(
    () => options.find(o => o.value === value)?.label ?? "",
    [options, value]
  );

  const handleKeyDown = (e: React.KeyboardEvent<HTMLButtonElement | HTMLDivElement>) => {
    if (!open) return;
    const key = e.key;
    if (key.length === 1 && /^[a-z0-9]$/i.test(key)) {
      const now = Date.now();
      const within = now - lastTypeTime < 700;
      const nextPrefix = (within ? typeAhead + key : key).toLowerCase();
      setTypeAhead(nextPrefix);
      setLastTypeTime(now);

      const idx = options.findIndex(o => o.label.toLowerCase().startsWith(nextPrefix));
      if (idx >= 0 && scrollRef.current) {
        const visibleHeight = Math.min(totalH, LIST_H);
        let newTop = idx * ITEM_H - visibleHeight / 2;
        newTop = Math.max(0, Math.min(newTop, Math.max(0, totalH - visibleHeight)));
        scrollRef.current.scrollTop = newTop;
        setScrollTop(newTop);
      }
    }
  };

  useEffect(() => {
    if (!open) return;

    setScrollTop(0);
    scrollRef.current?.scrollTo(0, 0);

    const triggerEl = containerRef.current;
    if (!triggerEl || typeof window === "undefined") return;

    const rect = triggerEl.getBoundingClientRect();
    const viewportH = window.innerHeight || document.documentElement.clientHeight || 0;

    const spaceBelow = viewportH - rect.bottom;
    const spaceAbove = rect.top;

    // Decide whether to open upwards or downwards based on available space
    const preferredPlacement: "top" | "bottom" =
      spaceBelow < LIST_H && spaceAbove > spaceBelow ? "top" : "bottom";
    setPlacement(preferredPlacement);

    const availableSpace =
      preferredPlacement === "bottom" ? spaceBelow - 8 : spaceAbove - 8;
    const nextHeight = Math.max(
      Math.min(LIST_H, Math.max(ITEM_H * 3, availableSpace)),
      ITEM_H * 3
    );
    setListHeight(isFinite(nextHeight) ? nextHeight : LIST_H);
  }, [open]);

  const containerRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  return (
    <div ref={containerRef} className="relative w-full min-w-0">
      <button
        id={id}
        type="button"
        onKeyDown={handleKeyDown}
        disabled={disabled}
        onClick={() => setOpen(o => !o)}
        className={cn(
          "flex h-11 w-full min-w-0 items-center justify-between rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground",
          "ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
          "disabled:cursor-not-allowed disabled:opacity-50",
        )}
      >
        <span
          className={cn(
            "block max-w-full truncate text-left",
            !displayLabel && "text-muted-foreground"
          )}
        >
          {displayLabel || placeholder}
        </span>
        <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
      </button>

      {open && (
        <div
          className={cn(
            "absolute z-200 w-full rounded-md border bg-popover shadow-md",
            placement === "bottom" ? "top-full mt-1" : "bottom-full mb-1"
          )}
        >
          <div
            ref={scrollRef}
            style={{
              height: Math.min(totalH, listHeight || LIST_H),
              maxHeight: listHeight || LIST_H,
              overflowY: "auto",
              scrollbarWidth: "none",
            }}
            className="scrollbar-none"
            onKeyDown={handleKeyDown}
            onScroll={e => setScrollTop((e.target as HTMLDivElement).scrollTop)}
          >
            {options.length === 0 ? (
              <div className="px-3 py-6 text-center text-sm text-muted-foreground">No results found.</div>
            ) : (
              <div style={{ height: totalH, position: "relative" }}>
                <div style={{ position: "absolute", top: offsetY, width: "100%" }}>
                  {visibleItems.map(opt => (
                    <div
                      key={opt.value}
                      style={{ height: ITEM_H }}
                      onClick={() => { onChange(opt.value); setOpen(false); }}
                      className={cn(
                        "flex items-center gap-2 px-3 text-sm cursor-pointer select-none hover:bg-accent hover:text-accent-foreground",
                        value === opt.value && "bg-accent font-medium"
                      )}
                    >
                      <Check className={cn("h-4 w-4 shrink-0", value === opt.value ? "opacity-100" : "opacity-0")} />
                      {opt.label}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
});

export default function SignupPage() {
  const router = useRouter();
  const duplicateCompanyError = "Company name already exists";

  const form = useForm<SignupInput>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      password: "",
      confirmPassword: "",
      companyName: "",
      countryId: "",
      stateId: "",
      cityId: "",
    },
  });

  const countryId = (form.watch("countryId") || "").trim();
  const stateId = (form.watch("stateId") || "").trim();

  const [geoLib, setGeoLib] = useState<any>(null);
  useEffect(() => {
    loadGeo().then(setGeoLib);
  }, []);

  const countryOptions = useMemo(() => {
    if (!geoLib) return [];
    const list = geoLib.Country.getAllCountries().map((c: any) => ({
      label: c.name,
      value: c.name,
      isoCode: c.isoCode,
    }));
    if (countryId && !list.some((c: any) => c.value === countryId)) {
      list.unshift({ label: countryId, value: countryId, isoCode: "" });
    }
    return list;
  }, [geoLib, countryId]);

  const countryCode = useMemo(
    () => countryOptions.find((c: any) => c.value === countryId)?.isoCode ?? "",
    [countryOptions, countryId]
  );

  const stateOptions = useMemo(() => {
    if (!geoLib || !countryCode) return [];
    const base = geoLib.State.getStatesOfCountry(countryCode).map((s: any) => ({
      label: s.name,
      value: s.name,
      isoCode: s.isoCode,
    }));
    if (stateId && !base.some((s: any) => s.value === stateId)) {
      base.unshift({ label: stateId, value: stateId, isoCode: "" });
    }
    return base;
  }, [geoLib, countryCode, stateId]);

  const stateCode = useMemo(
    () => stateOptions.find((s: any) => s.value === stateId)?.isoCode ?? "",
    [stateOptions, stateId]
  );

  const cityOptions = useMemo(() => {
    let list: { label: string; value: string }[] = [];
    if (geoLib && countryCode && stateCode) {
      list = geoLib.City.getCitiesOfState(countryCode, stateCode).map((c: any) => ({
        label: c.name,
        value: c.name,
      }));
    }
    const cityId = (form.getValues("cityId") || "").trim();
    if (cityId && !list.some((c) => c.value === cityId)) {
      list = [{ label: cityId, value: cityId }, ...list];
    }
    return list;
  }, [geoLib, countryCode, stateCode, form]);

  const [loading, setLoading] = useState(false);
  const [successDialogOpen, setSuccessDialogOpen] = useState(false);
  const [isCheckingCompany, setIsCheckingCompany] = useState(false);
  const companyCheckRequestId = useRef(0);
  const companyCheckTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (companyCheckTimeoutRef.current) {
        clearTimeout(companyCheckTimeoutRef.current);
      }
    };
  }, []);

  async function checkCompanyNameAvailability(name: string) {
    const trimmedName = name.trim();
    if (!trimmedName || trimmedName.length < 2) {
      if (form.formState.errors.companyName?.message === duplicateCompanyError) {
        form.clearErrors("companyName");
      }
      return;
    }

    const requestId = ++companyCheckRequestId.current;

    try {
      setIsCheckingCompany(true);
      const res = await fetch(
        `/api/auth/signup?companyName=${encodeURIComponent(trimmedName)}`
      );
      const data = await res.json();

      if (companyCheckRequestId.current !== requestId) return;

      if (data.exists) {
        form.setError("companyName", { type: "validate", message: duplicateCompanyError });
        return;
      }

      if (form.formState.errors.companyName?.message === duplicateCompanyError) {
        form.clearErrors("companyName");
      }
    } catch {
      // Keep silent on lookup failure and rely on submit-time validation.
    } finally {
      if (companyCheckRequestId.current === requestId) {
        setIsCheckingCompany(false);
      }
    }
  }

  async function onSubmit(values: SignupInput) {
    setLoading(true);
    const { confirmPassword, ...payload } = values;

    const res = await fetch("/api/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      const field = data.field as keyof SignupInput | undefined;
      if (field) {
        form.setError(field, { message: data.error });
      } else {
        toast.error(data.error || "Signup failed");
      }
      return;
    }

    // ✅ Open dialog BEFORE reset to prevent state being cleared
    setSuccessDialogOpen(true);
    form.reset();
  }

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      {/* Left panel – form */}
      <div className="flex flex-1 items-center justify-center px-8 lg:px-20">
        <div className="w-full max-w-xl">
          {/* Logo */}
          <div className="mb-16 flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-black text-white text-xl font-semibold">
              m
            </div>
            <span className="text-xl font-semibold tracking-tight text-foreground">Greenfrog.</span>
          </div>

          <Button asChild variant="outline" className="mt-4 h-11 w-full rounded-lg">
                <Link href="/">Go To Website</Link>
              </Button>

          <Card className="border-none shadow-none bg-transparent p-0">
            <CardHeader className="px-0 pb-6 pt-0">
              <CardTitle className="text-3xl font-semibold text-foreground">
                Create account
              </CardTitle>
              <CardDescription className="mt-1 text-base text-muted-foreground">
                Sign up to access your CRM dashboard.
              </CardDescription>
            </CardHeader>
            <CardContent className="px-0 pt-0">
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="firstName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm font-medium text-foreground">
                            First name
                          </FormLabel>
                          <FormControl>
                            <Input
                              placeholder="John"
                              className="h-11 rounded-lg border border-input bg-background text-sm text-foreground placeholder:text-muted-foreground"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="lastName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm font-medium text-foreground">
                            Last name
                          </FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Doe"
                              className="h-11 rounded-lg border border-input bg-background text-sm text-foreground placeholder:text-muted-foreground"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-medium text-foreground">
                          Email
                        </FormLabel>
                        <FormControl>
                          <Input
                            type="email"
                            placeholder="Enter your email"
                            className="h-11 rounded-lg border border-input bg-background text-sm text-foreground placeholder:text-muted-foreground"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm font-medium text-foreground">
                            Password
                          </FormLabel>
                          <FormControl>
                            <Input
                              type="password"
                              placeholder="Enter your password"
                              className="h-11 rounded-lg border border-input bg-background text-sm text-foreground placeholder:text-muted-foreground"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="confirmPassword"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm font-medium text-foreground">
                            Confirm password
                          </FormLabel>
                          <FormControl>
                            <Input
                              type="password"
                              placeholder="Confirm your password"
                              className="h-11 rounded-lg border border-input bg-background text-sm text-foreground placeholder:text-muted-foreground"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="companyName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-medium text-foreground">
                          Company
                        </FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Acme Inc."
                            className="h-11 rounded-lg border border-input bg-background text-sm text-foreground placeholder:text-muted-foreground"
                            {...field}
                            onChange={(e) => {
                              field.onChange(e);
                              // Remove stale duplicate error as soon as user edits the name.
                              if (form.formState.errors.companyName?.message === duplicateCompanyError) {
                                form.clearErrors("companyName");
                              }
                              if (companyCheckTimeoutRef.current) {
                                clearTimeout(companyCheckTimeoutRef.current);
                              }
                            }}
                            onBlur={(e) => {
                              field.onBlur();
                              if (companyCheckTimeoutRef.current) {
                                clearTimeout(companyCheckTimeoutRef.current);
                              }
                              companyCheckTimeoutRef.current = setTimeout(() => {
                                checkCompanyNameAvailability(e.target.value);
                              }, 250);
                            }}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  

                  <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                    <FormField
                      control={form.control}
                      name="countryId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm font-medium text-foreground">
                            Country
                          </FormLabel>
                          <FormControl>
                            <VirtualGeoSelect
                              id="countryId"
                              value={countryId}
                              options={countryOptions}
                              placeholder="Select Country"
                              disabled={!geoLib}
                              onChange={(value) => {
                                field.onChange(value);
                                form.setValue("stateId", "");
                                form.setValue("cityId", "");
                              }}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="stateId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm font-medium text-foreground">
                            State
                          </FormLabel>
                          <FormControl>
                            <VirtualGeoSelect
                              id="stateId"
                              value={stateId}
                              options={stateOptions}
                              placeholder="Select State"
                              disabled={!geoLib || !countryId}
                              onChange={(value) => {
                                field.onChange(value);
                                form.setValue("cityId", "");
                              }}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="cityId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm font-medium text-foreground">
                            City
                          </FormLabel>
                          <FormControl>
                            <VirtualGeoSelect
                              id="cityId"
                              value={field.value || ""}
                              options={cityOptions}
                              placeholder="Select City"
                              disabled={!geoLib || !stateId}
                              onChange={(value) => field.onChange(value)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <Button
                    type="submit"
                    className="mt-1 h-11 w-full rounded-lg bg-primary text-sm font-semibold text-secondary hover:bg-primary/90"
                    disabled={loading || isCheckingCompany}
                  >
                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {loading
                      ? "Creating account..."
                      : isCheckingCompany
                        ? "Checking company..."
                        : "Sign up"}
                  </Button>
                </form>
              </Form>

              <p className="mt-8 text-center text-xs text-foreground">
                Already have an account?
                <Link
                  href="/login"
                  className="ml-1 text-xs font-medium text-foreground underline hover:text-muted-foreground"
                >
                  Login
                </Link>
              </p>

              
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Right panel – illustration */}
      <div className="hidden w-1/2 items-center justify-center bg-[#e6e7f0] lg:flex">
        <div className="relative flex h-[70%] w-[70%] items-center justify-center rounded-t-full bg-[#f6dcd5]">
          <div className="absolute bottom-10 h-1.5 w-40 rounded-full bg-[#c9cbd6]" />
          <div className="relative -mt-24 flex flex-col items-center">
            <div className="mb-[-32px] h-44 w-20 rounded-full bg-[#d0d1da]" />
            <div className="flex h-40 w-40 items-center justify-center rounded-full bg-[#C7FF3D] shadow-lg">
              <div className="relative h-28 w-28 rounded-full border border-black/20">
                <div className="absolute left-1/2 top-1/2 h-10 w-[2px] -translate-x-1/2 -translate-y-full origin-bottom bg-black" />
                <div className="absolute left-1/2 top-1/2 h-12 w-[2px] -translate-x-1/2 -translate-y-full origin-bottom rotate-45 bg-black" />
                <div className="absolute left-1/2 top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-black" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ✅ Sibling to Card, outside Form context */}
      <AlertDialog open={successDialogOpen} onOpenChange={setSuccessDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Account created! 🎉</AlertDialogTitle>
            <AlertDialogDescription>
              Your account has been successfully created. First Verify your email, then log in.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => router.push("/login")}>
              Go to Login
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}