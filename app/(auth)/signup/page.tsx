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
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
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

  const totalH = options.length * ITEM_H;
  const startIdx = Math.floor(scrollTop / ITEM_H);
  const visibleCount = Math.ceil(LIST_H / ITEM_H) + 2;
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
    if (open) {
      setScrollTop(0);
      scrollRef.current?.scrollTo(0, 0);
    }
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
    <div ref={containerRef} className="relative w-full">
      <button
        id={id}
        type="button"
        onKeyDown={handleKeyDown}
        disabled={disabled}
        onClick={() => setOpen(o => !o)}
        className={cn(
          "flex h-10 w-full items-center justify-between rounded-md border border-input bg-secondary/50 px-3 py-2 text-sm",
          "ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
          "disabled:cursor-not-allowed disabled:opacity-50",
        )}
      >
        <span className={cn("truncate text-left", !displayLabel && "text-muted-foreground")}>
          {displayLabel || placeholder}
        </span>
        <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
      </button>

      {open && (
        <div className="absolute z-[200] mt-1 w-full rounded-md border bg-popover shadow-md">
          <div
            ref={scrollRef}
            style={{ height: Math.min(totalH, LIST_H), overflowY: "auto", scrollbarWidth: "none" }}
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
    <div className="flex min-h-screen items-center justify-center bg-muted/30">
      <Card className="w-full max-w-xl shadow-sm">
        <CardHeader>
          <CardTitle className="text-2xl">Create account</CardTitle>
          <CardDescription>
            Sign up to access your CRM dashboard.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="firstName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>First name</FormLabel>
                      <FormControl>
                        <Input placeholder="John" {...field} />
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
                      <FormLabel>Last name</FormLabel>
                      <FormControl>
                        <Input placeholder="Doe" {...field} />
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
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="you@company.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Password</FormLabel>
                      <FormControl>
                        <Input type="password" {...field} />
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
                      <FormLabel>Confirm password</FormLabel>
                      <FormControl>
                        <Input type="password" {...field} />
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
                    <FormLabel>Company</FormLabel>
                    <FormControl>
                      <Input placeholder="Acme Inc." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="countryId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Country</FormLabel>
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
                      <FormLabel>State</FormLabel>
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
                      <FormLabel>City</FormLabel>
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

              <Button type="submit" className="w-full" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {loading ? "Creating account..." : "Sign up"}
              </Button>
            </form>
          </Form>

          <p className="mt-4 text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link href="/login" className="text-primary">
              Login
            </Link>
          </p>
        </CardContent>
      </Card>

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