"use client";

import { memo, useEffect, useMemo, useRef, useState } from "react";
import { format } from "date-fns";
import {
  CalendarClock,
  Check,
  ChevronsUpDown,
  Download,
  Eye,
  Loader2,
  Mail,
  MapPin,
  Phone,
  ReceiptText,
  Upload,
  UserRound,
  X,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import useSWR, { useSWRConfig } from "swr";
import { toast } from "sonner";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import type { DateRange } from "react-day-picker";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn, normalizeAvatarUrl } from "@/lib/utils";

type ClientBooking = {
  _id: string;
  orderId: string;
  status: string;
  bookingType: "previous" | "upcoming";
  startDateTime: string;
  endDateTime?: string;
  serviceName: string;
  technicianName: string;
  finalAmount: number;
  address: string;
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  notes?: string;
  specialRequestFromClient?: string;
  hasPets?: boolean;
  pets?: string[];
  subServices?: Array<{ name: string; quantity: number }>;
  addons?: Array<{ name: string; quantity: number }>;
  pricing?: {
    baseAmount?: number;
    subServicesAmount?: number;
    addonsAmount?: number;
    totalAmount?: number;
    discount?: number;
    finalAmount?: number;
    billedHours?: number;
  };
  timesheet?: {
    arrivalTime?: string;
    departureTime?: string;
    cleaningTime?: number;
    totalTeamTime?: number;
    technicianTime?: number;
    notes?: string;
  };
};

type ClientInvoice = {
  _id: string;
  invoiceNumber: string;
  issueDate: string;
  dueDate: string;
  total: number;
  currency?: string;
  status?: string;
  contactId?: {
    firstName?: string;
    lastName?: string;
    email?: string;
    company?: string;
    companyName?: string;
  };
  items?: Array<{
    description: string;
    quantity: number;
    unitPrice: number;
    total: number;
  }>;
  taxAmount?: number;
  bookingId?: string;
};

type MeResponse = {
  user?: {
    id?: string;
    firstName?: string;
    lastName?: string;
    email?: string;
    avatarUrl?: string;
  } | null;
};

type BookingsResponse = {
  bookings: ClientBooking[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  counts: {
    upcoming: number;
    previous: number;
  };
};

type ClientProfile = {
  firstName?: string;
  lastName?: string;
  email?: string;
  avatarUrl?: string;
  phoneNumber?: string;
  address?: string;
  country?: string;
  state?: string;
  city?: string;
  zipCode?: string;
  specialInstructions?: string;
  defaultPaymentMethod?: string;
  cardDetails?: Array<{
    _id?: string;
    brand?: string;
    last4?: string;
    expMonth?: string;
    expYear?: string;
    nameOnCard?: string;
  }>;
};

const statusClassMap: Record<string, string> = {
  completed: "bg-green-500/15 text-green-700 dark:text-green-300 border-green-500/20",
  confirmed: "bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/20",
  cancelled: "bg-red-500/15 text-red-700 dark:text-red-300 border-red-500/20",
  unconfirmed: "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/20",
};

const fetcher = async (url: string) => {
  const res = await fetch(url, { credentials: "include" });
  return res.json();
};

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
  const containerRef = useRef<HTMLDivElement>(null);

  const totalH = options.length * ITEM_H;
  const startIdx = Math.floor(scrollTop / ITEM_H);
  const visibleCount = Math.ceil((listHeight || LIST_H) / ITEM_H) + 2;
  const endIdx = Math.min(startIdx + visibleCount, options.length);
  const visibleItems = options.slice(startIdx, endIdx);
  const offsetY = startIdx * ITEM_H;

  const displayLabel = useMemo(
    () => options.find((o) => o.value === value)?.label ?? "",
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

      const idx = options.findIndex((o) => o.label.toLowerCase().startsWith(nextPrefix));
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
    const preferredPlacement: "top" | "bottom" =
      spaceBelow < LIST_H && spaceAbove > spaceBelow ? "top" : "bottom";
    setPlacement(preferredPlacement);

    const availableSpace =
      preferredPlacement === "bottom" ? spaceBelow - 8 : spaceAbove - 8;
    const nextHeight = Math.max(
      Math.min(LIST_H, Math.max(ITEM_H * 3, availableSpace)),
      ITEM_H * 3
    );
    setListHeight(Number.isFinite(nextHeight) ? nextHeight : LIST_H);
  }, [open, totalH]);

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
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "flex h-11 w-full min-w-0 items-center justify-between rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground",
          "ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
          "disabled:cursor-not-allowed disabled:opacity-50"
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
            onScroll={(e) => setScrollTop((e.target as HTMLDivElement).scrollTop)}
          >
            {options.length === 0 ? (
              <div className="px-3 py-6 text-center text-sm text-muted-foreground">No results found.</div>
            ) : (
              <div style={{ height: totalH, position: "relative" }}>
                <div style={{ position: "absolute", top: offsetY, width: "100%" }}>
                  {visibleItems.map((opt) => (
                    <div
                      key={opt.value}
                      style={{ height: ITEM_H }}
                      onClick={() => {
                        onChange(opt.value);
                        setOpen(false);
                      }}
                      className={cn(
                        "flex cursor-pointer select-none items-center gap-2 px-3 text-sm hover:bg-accent hover:text-accent-foreground",
                        value === opt.value && "bg-accent font-medium"
                      )}
                    >
                      <Check
                        className={cn(
                          "h-4 w-4 shrink-0",
                          value === opt.value ? "opacity-100" : "opacity-0"
                        )}
                      />
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

const ProfileImageUploader = memo(function ProfileImageUploader({
  imageUrl,
  initials,
  uploading,
  onUpload,
  onRemove,
}: {
  imageUrl: string;
  initials: string;
  uploading: boolean;
  onUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRemove: () => void;
}) {
  return (
    <div className="space-y-2 mb-2 flex flex-col gap-2">
      <Label>Profile photo</Label>
      <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
        {imageUrl ? (
          <div className="relative">
            <img
              src={imageUrl}
              alt="Profile photo"
              className="h-24 w-24 rounded-lg object-cover border-2 border-gray-200"
            />
            <button
              type="button"
              onClick={onRemove}
              className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
              aria-label="Remove profile photo"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <div className="h-24 w-24 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center bg-gray-50 text-primary">
            <div className="flex flex-col items-center gap-1">
              <Upload className="h-6 w-6 text-gray-400" />
              <span className="text-xs font-semibold">{initials}</span>
            </div>
          </div>
        )}
        <div className="flex-1">
          <Label htmlFor="client-avatar-upload" className="font-semibold">Upload Image</Label>
          <p className="text-sm text-muted-foreground mb-2">
            PNG, JPG, WEBP up to 5MB
          </p>
          <Input
            id="client-avatar-upload"
            type="file"
            accept="image/png,image/jpeg,image/jpg,image/webp"
            disabled={uploading}
            onChange={onUpload}
          />
          <p className="text-xs text-muted-foreground mt-2">
            Changes apply after you click Save Changes.
          </p>
        </div>
      </div>
    </div>
  );
});

export default function ClientBookingsPage() {
  const [activeTab, setActiveTab] = useState<"upcoming" | "previous">("upcoming");
  const [dashboardTab, setDashboardTab] = useState<"booking" | "payment" | "invoices" | "profile">("booking");
  const [page, setPage] = useState(1);
  const [filterSheetOpen, setFilterSheetOpen] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState<string>("");
  const [daysUpToToday, setDaysUpToToday] = useState("7");
  const [daysStartingToday, setDaysStartingToday] = useState("7");
  const [filterRange, setFilterRange] = useState<DateRange | undefined>(undefined);
  const [appliedRange, setAppliedRange] = useState<DateRange | undefined>(undefined);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [profileDraft, setProfileDraft] = useState<ClientProfile | null>(null);
  const [passwordSheetOpen, setPasswordSheetOpen] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const { mutate } = useSWRConfig();
  const [savingPassword, setSavingPassword] = useState(false);
  const [addCardSheetOpen, setAddCardSheetOpen] = useState(false);
  const [savingCard, setSavingCard] = useState(false);
  const [geoLib, setGeoLib] = useState<any>(null);
  const [displayBookings, setDisplayBookings] = useState<ClientBooking[]>([]);
  const [displayCounts, setDisplayCounts] = useState({ upcoming: 0, previous: 0 });
  const [displayTotalPages, setDisplayTotalPages] = useState(1);
  const [clientInvoices, setClientInvoices] = useState<ClientInvoice[]>([]);
  const [selectedCardId, setSelectedCardId] = useState<string>("");
  const [viewClientInvoice, setViewClientInvoice] = useState<ClientInvoice | null>(null);
  const [viewClientBooking, setViewClientBooking] = useState<any>(null);
  const [downloadingClientInvoicePdf, setDownloadingClientInvoicePdf] = useState(false);
  const [deleteCardDialogOpen, setDeleteCardDialogOpen] = useState(false);
  const [cardPendingDeleteId, setCardPendingDeleteId] = useState<string>("");
  const [deletingCard, setDeletingCard] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    oldPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [newCard, setNewCard] = useState({
    number: "",
    exp: "",
    cvv: "",
    name: "",
  });
  const [company, setCompany] = useState<{
    name?: string;
    logo?: string;
    email?: string;
    phone?: string;
  } | null>(null);
  const [profile, setProfile] = useState<ClientProfile>({
    firstName: "",
    lastName: "",
    email: "",
    avatarUrl: "",
    phoneNumber: "",
    address: "",
    country: "",
    state: "",
    city: "",
    zipCode: "",
    specialInstructions: "",
    defaultPaymentMethod: "",
    cardDetails: [],
  });
  const invoicePreviewRef = useRef<HTMLDivElement | null>(null);
  const bookingsLoadMoreRef = useRef<HTMLDivElement | null>(null);
  const { data: meData } = useSWR<MeResponse>("/api/auth/me", fetcher, {
    revalidateOnFocus: false,
  });
  const bookingsQuery = useMemo(() => {
    const params = new URLSearchParams({
      bookingType: activeTab,
      page: String(page),
      limit: "10",
    });
    if (appliedRange?.from) {
      const start = new Date(appliedRange.from);
      start.setHours(0, 0, 0, 0);
      params.set("startDate", start.toISOString());
    }
    if (appliedRange?.to) {
      const end = new Date(appliedRange.to);
      end.setHours(23, 59, 59, 999);
      params.set("endDate", end.toISOString());
    }
    return `/api/client/bookings?${params.toString()}`;
  }, [activeTab, page, appliedRange]);

  const { data: bookingsData, isLoading: bookingsLoading } = useSWR<BookingsResponse>(
    bookingsQuery,
    fetcher,
    {
      revalidateOnFocus: false,
      keepPreviousData: true,
    }
  );

  useEffect(() => {
    if (!bookingsData) return;
    if (Array.isArray(bookingsData.bookings)) {
      setDisplayBookings((prev) => {
        if (page === 1) return bookingsData.bookings;
        const seen = new Set(prev.map((b) => b._id));
        const next = bookingsData.bookings.filter((b) => !seen.has(b._id));
        return [...prev, ...next];
      });
    }
    if (bookingsData.counts) {
      setDisplayCounts({
        upcoming: Number(bookingsData.counts.upcoming || 0),
        previous: Number(bookingsData.counts.previous || 0),
      });
    }
    if (bookingsData.pagination?.totalPages) {
      setDisplayTotalPages(Math.max(1, Number(bookingsData.pagination.totalPages)));
    } else if (bookingsData.pagination?.totalPages === 0) {
      setDisplayTotalPages(1);
    }
  }, [bookingsData, page]);

  useEffect(() => {
    if (dashboardTab !== "booking") return;
    const node = bookingsLoadMoreRef.current;
    if (!node) return;
    if (bookingsLoading) return;
    if (page >= displayTotalPages) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry?.isIntersecting) {
          setPage((prev) => {
            if (prev >= displayTotalPages) return prev;
            return prev + 1;
          });
        }
      },
      { root: null, rootMargin: "120px", threshold: 0.1 }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [dashboardTab, bookingsLoading, page, displayTotalPages, displayBookings.length]);

  useEffect(() => {
    loadGeo().then(setGeoLib).catch(() => {
      // ignore
    });
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function loadCompany() {
      try {
        const response = await fetch("/api/company/settings", { credentials: "include" });
        if (!response.ok) return;
        const data = await response.json();
        if (cancelled) return;
        setCompany({
          name: data?.name,
          logo: data?.logo,
          email: data?.email,
          phone: data?.phone,
        });
      } catch {
        // ignore
      }
    }
    loadCompany();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function loadBooking() {
      if (!viewClientInvoice?.bookingId) {
        setViewClientBooking(null);
        return;
      }
      try {
        const res = await fetch(`/api/bookings/${viewClientInvoice.bookingId}`, {
          credentials: "include",
        });
        if (!res.ok) throw new Error("Failed");
        const data = await res.json();
        if (!cancelled) setViewClientBooking(data);
      } catch {
        if (!cancelled) setViewClientBooking(null);
      }
    }
    loadBooking();
    return () => {
      cancelled = true;
    };
  }, [viewClientInvoice?.bookingId]);

  useEffect(() => {
    if (!meData?.user?.id) return;
    let cancelled = false;
    async function loadClientInvoices() {
      try {
        const res = await fetch("/api/client/invoices", { credentials: "include" });
        if (!res.ok) {
          if (!cancelled) setClientInvoices([]);
          return;
        }
        const data = await res.json();
        if (cancelled) return;
        setClientInvoices(Array.isArray(data) ? data : []);
      } catch {
        if (!cancelled) setClientInvoices([]);
      }
    }
    loadClientInvoices();
    return () => {
      cancelled = true;
    };
  }, [meData?.user?.id]);

  useEffect(() => {
    let cancelled = false;
    async function loadProfile() {
      try {
        const res = await fetch("/api/client/profile", { credentials: "include" });
        if (!res.ok) return;
        const data = await res.json();
        if (cancelled) return;
        setProfile((prev) => ({
          firstName: data.firstName || "",
          lastName: data.lastName || "",
          email: data.email || "",
          avatarUrl:
            typeof data.avatarUrl === "string"
              ? data.avatarUrl.trim()
              : data.avatarUrl === null
                ? ""
                : prev.avatarUrl,
          phoneNumber: data.phoneNumber || "",
          address: data.address || "",
          country: data.country || "",
          state: data.state || "",
          city: data.city || "",
          zipCode: data.zipCode || "",
          specialInstructions: data.specialInstructions || "",
          defaultPaymentMethod: data.defaultPaymentMethod || "",
          cardDetails: Array.isArray(data.cardDetails) ? data.cardDetails : [],
        }));
      } catch {
        // ignore
      }
    }
    loadProfile();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const persistedDefault = profile.defaultPaymentMethod || "";
    const firstCardId = profile.cardDetails?.[0]?._id || "";
    const next = persistedDefault || firstCardId;
    if (next && selectedCardId !== next) {
      setSelectedCardId(next);
    }
  }, [profile.cardDetails, profile.defaultPaymentMethod, selectedCardId]);

  const userName = useMemo(() => {
    const first = profile.firstName || meData?.user?.firstName || "";
    const last = profile.lastName || meData?.user?.lastName || "";
    return [first, last].filter(Boolean).join(" ") || "Client";
  }, [meData, profile.firstName, profile.lastName]);

  const bookings = displayBookings;
  const totalPages = displayTotalPages;
  const counts = displayCounts;

  const userEmail = profile.email || meData?.user?.email || "No email";

  const profileAddress = useMemo(() => {
    return profile.address || "Address not available";
  }, [profile.address]);

  const openEditProfileSheet = () => {
    setProfileDraft({
      firstName: profile.firstName || "",
      lastName: profile.lastName || "",
      email: profile.email || "",
      avatarUrl: profile.avatarUrl || "",
      phoneNumber: profile.phoneNumber || "",
      address: profile.address || "",
      country: profile.country || "",
      state: profile.state || "",
      city: profile.city || "",
      zipCode: profile.zipCode || "",
      specialInstructions: profile.specialInstructions || "",
      defaultPaymentMethod: profile.defaultPaymentMethod || "",
      cardDetails: profile.cardDetails || [],
    });
    setSheetOpen(true);
  };

  /** Invoices shared with the client (sent or later); keyed by booking id for quick lookup. */
  const sentInvoiceByBookingId = useMemo(() => {
    const map = new Map<string, ClientInvoice>();
    const visible = new Set(["sent", "paid", "overdue"]);
    for (const inv of clientInvoices) {
      const bid = inv.bookingId != null ? String(inv.bookingId) : "";
      if (!bid || !visible.has(String(inv.status || "").toLowerCase())) continue;
      if (!map.has(bid)) map.set(bid, inv);
    }
    return map;
  }, [clientInvoices]);

  const countryOptions = useMemo(() => {
    if (!sheetOpen || !geoLib) return [];
    const selected = (profileDraft?.country || "").trim();
    const list = geoLib.Country.getAllCountries().map((c: any) => ({
      label: c.name,
      value: c.name,
      isoCode: c.isoCode,
    }));
    if (selected && !list.some((c: any) => c.value === selected)) {
      list.unshift({ label: selected, value: selected, isoCode: "" });
    }
    return list;
  }, [sheetOpen, geoLib, profileDraft?.country]);

  const countryCode = useMemo(
    () => countryOptions.find((c: any) => c.value === (profileDraft?.country || ""))?.isoCode ?? "",
    [countryOptions, profileDraft?.country]
  );

  const stateOptions = useMemo(() => {
    if (!sheetOpen || !geoLib || !countryCode) return [];
    const selected = (profileDraft?.state || "").trim();
    const list = geoLib.State.getStatesOfCountry(countryCode).map((s: any) => ({
      label: s.name,
      value: s.name,
      isoCode: s.isoCode,
    }));
    if (selected && !list.some((s: any) => s.value === selected)) {
      list.unshift({ label: selected, value: selected, isoCode: "" });
    }
    return list;
  }, [sheetOpen, geoLib, countryCode, profileDraft?.state]);

  const stateCode = useMemo(
    () => stateOptions.find((s: any) => s.value === (profileDraft?.state || ""))?.isoCode ?? "",
    [stateOptions, profileDraft?.state]
  );

  const cityOptions = useMemo(() => {
    let list: { label: string; value: string }[] = [];
    if (sheetOpen && geoLib && countryCode && stateCode) {
      list = geoLib.City.getCitiesOfState(countryCode, stateCode).map((c: any) => ({
        label: c.name,
        value: c.name,
      }));
    }
    const selected = (profileDraft?.city || "").trim();
    if (selected && !list.some((c) => c.value === selected)) {
      list.unshift({ label: selected, value: selected });
    }
    return list;
  }, [sheetOpen, geoLib, countryCode, stateCode, profileDraft?.city]);

  const profileAvatarUrl = useMemo(
    () => normalizeAvatarUrl(profile.avatarUrl || meData?.user?.avatarUrl),
    [profile.avatarUrl, meData?.user?.avatarUrl]
  );

  const draftProfileAvatarUrl = useMemo(
    () => normalizeAvatarUrl(profileDraft?.avatarUrl),
    [profileDraft?.avatarUrl]
  );

  const displayInitials = useMemo(() => {
    const first = (profile.firstName || meData?.user?.firstName || "").trim();
    const last = (profile.lastName || meData?.user?.lastName || "").trim();
    if (first && last) {
      return (first[0] + last[0]).toUpperCase();
    }
    const name = [first, last].filter(Boolean).join(" ") || userName;
    const parts = name.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    if (parts.length === 1 && parts[0].length > 0) {
      return parts[0].slice(0, 2).toUpperCase();
    }
    return "U";
  }, [
    profile.firstName,
    profile.lastName,
    meData?.user?.firstName,
    meData?.user?.lastName,
    userName,
  ]);

  const draftDisplayInitials = useMemo(() => {
    const first = (profileDraft?.firstName || "").trim();
    const last = (profileDraft?.lastName || "").trim();
    if (first && last) return (first[0] + last[0]).toUpperCase();
    const name = [first, last].filter(Boolean).join(" ");
    const parts = name.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    if (parts.length === 1 && parts[0].length > 0) return parts[0].slice(0, 2).toUpperCase();
    return displayInitials;
  }, [profileDraft?.firstName, profileDraft?.lastName, displayInitials]);

  const handleProfileChange = (field: keyof ClientProfile, value: string) => {
    setProfileDraft((prev) => ({ ...(prev || profile), [field]: value }));
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error("File size must be less than 5MB.");
      e.target.value = "";
      return;
    }

    setUploadingAvatar(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const uploadRes = await fetch("/api/upload", {
        method: "POST",
        body: formData,
        credentials: "include",
      });
      if (!uploadRes.ok) throw new Error("Upload failed");
      const uploadData = await uploadRes.json();
      const url = typeof uploadData.url === "string" ? uploadData.url.trim() : "";
      if (!url) throw new Error("No URL");

      setProfileDraft((prev) => ({ ...(prev || profile), avatarUrl: url }));
      toast.success("Profile photo selected. Click Save Changes to apply.");
    } catch {
      toast.error("Failed to upload profile photo.");
    } finally {
      setUploadingAvatar(false);
      e.target.value = "";
    }
  };

  const handleRemoveDraftAvatar = () => {
    setProfileDraft((prev) => ({ ...(prev || profile), avatarUrl: "" }));
    toast.success("Profile photo removed. Click Save Changes to apply.");
  };

  const handleSaveProfile = async () => {
    const draft = profileDraft || profile;
    setSavingProfile(true);
    try {
      const res = await fetch("/api/client/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          firstName: draft.firstName,
          lastName: draft.lastName,
          phoneNumber: draft.phoneNumber,
          address: draft.address,
          country: draft.country,
          state: draft.state,
          city: draft.city,
          zipCode: draft.zipCode,
          specialInstructions: draft.specialInstructions,
          avatarUrl: draft.avatarUrl ?? "",
        }),
      });
      if (!res.ok) throw new Error("Failed");
      const updated = await res.json().catch(() => ({}));
      setProfile((prev) => ({
        ...prev,
        firstName: String(updated?.firstName ?? prev.firstName ?? "").trim(),
        lastName: String(updated?.lastName ?? prev.lastName ?? "").trim(),
        email: String(updated?.email ?? prev.email ?? "").trim(),
        phoneNumber: String(updated?.phoneNumber ?? prev.phoneNumber ?? "").trim(),
        address: String(updated?.address ?? prev.address ?? "").trim(),
        country: String(updated?.country ?? prev.country ?? "").trim(),
        state: String(updated?.state ?? prev.state ?? "").trim(),
        city: String(updated?.city ?? prev.city ?? "").trim(),
        zipCode: String(updated?.zipCode ?? prev.zipCode ?? "").trim(),
        specialInstructions: String(
          updated?.specialInstructions ?? prev.specialInstructions ?? ""
        ).trim(),
        avatarUrl: String(updated?.avatarUrl ?? prev.avatarUrl ?? "").trim(),
      }));
      await mutate("/api/auth/me");
      toast.success("Profile updated.");
      setProfileDraft(null);
      setSheetOpen(false);
    } catch {
      toast.error("Failed to update profile.");
    } finally {
      setSavingProfile(false);
    }
  };

  const handleChangePassword = async () => {
    if (!passwordForm.oldPassword || !passwordForm.newPassword || !passwordForm.confirmPassword) {
      toast.error("All password fields are required.");
      return;
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast.error("New password and confirm password must match.");
      return;
    }

    setSavingPassword(true);
    try {
      const res = await fetch("/api/settings/account", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          currentPassword: passwordForm.oldPassword,
          newPassword: passwordForm.newPassword,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.error || "Failed");
      }
      toast.success("Password changed successfully.");
      setPasswordForm({ oldPassword: "", newPassword: "", confirmPassword: "" });
      setPasswordSheetOpen(false);
    } catch (error: any) {
      toast.error(error?.message || "Failed to change password.");
    } finally {
      setSavingPassword(false);
    }
  };

  const buildRangeFromPreset = (preset: string): DateRange => {
    const now = new Date();
    const startOfToday = new Date(now);
    startOfToday.setHours(0, 0, 0, 0);
    const endOfToday = new Date(now);
    endOfToday.setHours(23, 59, 59, 999);
    const range: DateRange = { from: startOfToday, to: endOfToday };

    if (preset === "yesterday") {
      const d = new Date(startOfToday);
      d.setDate(d.getDate() - 1);
      range.from = d;
      range.to = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
    } else if (preset === "thisWeek") {
      const monday = new Date(startOfToday);
      const day = monday.getDay();
      const diff = day === 0 ? -6 : 1 - day;
      monday.setDate(monday.getDate() + diff);
      const saturday = new Date(monday);
      saturday.setDate(saturday.getDate() + 5);
      saturday.setHours(23, 59, 59, 999);
      range.from = monday;
      range.to = saturday;
    } else if (preset === "lastWeek") {
      const thisMonday = new Date(startOfToday);
      const day = thisMonday.getDay();
      const diff = day === 0 ? -6 : 1 - day;
      thisMonday.setDate(thisMonday.getDate() + diff);
      const lastMonday = new Date(thisMonday);
      lastMonday.setDate(lastMonday.getDate() - 7);
      const lastSaturday = new Date(lastMonday);
      lastSaturday.setDate(lastSaturday.getDate() + 5);
      lastSaturday.setHours(23, 59, 59, 999);
      range.from = lastMonday;
      range.to = lastSaturday;
    } else if (preset === "thisMonth") {
      range.from = new Date(now.getFullYear(), now.getMonth(), 1);
      range.to = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    } else if (preset === "lastMonth") {
      range.from = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      range.to = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
    } else if (preset === "daysUpToToday") {
      const days = Math.max(1, Number(daysUpToToday) || 1);
      const start = new Date(startOfToday);
      start.setDate(start.getDate() - (days - 1));
      range.from = start;
      range.to = endOfToday;
    } else if (preset === "daysStartingToday") {
      const days = Math.max(1, Number(daysStartingToday) || 1);
      const end = new Date(endOfToday);
      end.setDate(end.getDate() + (days - 1));
      end.setHours(23, 59, 59, 999);
      range.from = startOfToday;
      range.to = end;
    }
    return range;
  };

  const applyPreset = (preset: string) => {
    setSelectedPreset(preset);
    setFilterRange(buildRangeFromPreset(preset));
  };

  const handleApplyBookingFilter = () => {
    const computedRange =
      selectedPreset === "daysUpToToday" || selectedPreset === "daysStartingToday"
        ? buildRangeFromPreset(selectedPreset)
        : filterRange;
    setPage(1);
    setAppliedRange(computedRange);
    setFilterRange(computedRange);
    setFilterSheetOpen(false);
  };

  const isCardExpired = (card: {
    expMonth?: string;
    expYear?: string;
  }) => {
    const month = Number(card.expMonth);
    const yearRaw = String(card.expYear || "");
    const year = yearRaw.length === 2 ? 2000 + Number(yearRaw) : Number(yearRaw);
    if (!month || !year || month < 1 || month > 12) return false;
    const endOfMonth = new Date(year, month, 0, 23, 59, 59, 999);
    return endOfMonth.getTime() < Date.now();
  };

  const handleSelectDefaultCard = async (
    cardId: string,
    card: { expMonth?: string; expYear?: string }
  ) => {
    if (isCardExpired(card)) {
      toast.error("This card is expired. Please add a valid card.");
      return;
    }
    const previous = selectedCardId;
    setSelectedCardId(cardId);
    setProfile((prev) => ({ ...prev, defaultPaymentMethod: cardId }));
    try {
      const res = await fetch("/api/client/cards/default", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ cardId }),
      });
      if (!res.ok) throw new Error("Failed");
    } catch {
      setSelectedCardId(previous);
      setProfile((prev) => ({ ...prev, defaultPaymentMethod: previous }));
      toast.error("Failed to set default card.");
    }
  };

  const handleAddCard = async () => {
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
    if (!meData?.user?.id) {
      toast.error("Unable to identify user for card save.");
      return;
    }

    setSavingCard(true);
    try {
      const last4 = cleanNumber.slice(-4);
      const response = await fetch("/api/public/cards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: meData.user.id,
          brand: "Card",
          cardNumber: cleanNumber,
          last4,
          expMonth: mm,
          expYear: yy,
          nameOnCard: newCard.name.trim(),
        }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data?.error || "Failed to save card.");
      }
      const saved = await response.json();
      const insertedCard = {
        _id: saved.id,
        brand: saved.brand || "Card",
        last4: saved.last4,
        expMonth: saved.expMonth,
        expYear: saved.expYear,
        nameOnCard: saved.nameOnCard,
      };

      await fetch("/api/client/cards/default", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ cardId: insertedCard._id }),
      });

      setProfile((prev) => ({
        ...prev,
        defaultPaymentMethod: insertedCard._id || "",
        cardDetails: [insertedCard, ...(prev.cardDetails || [])],
      }));
      setSelectedCardId(insertedCard._id || `${insertedCard.brand}-${insertedCard.last4}`);
      setNewCard({ number: "", exp: "", cvv: "", name: "" });
      setAddCardSheetOpen(false);
      toast.success("Card added successfully.");
    } catch {
      toast.error("Failed to save card,");
    } finally {
      setSavingCard(false);
    }
  };

  const openDeleteCardDialog = (cardId: string) => {
    const currentDefault = String(profile.defaultPaymentMethod || selectedCardId || "").trim();
    if (currentDefault && currentDefault === cardId) {
      toast.error("Default card cannot be deleted. Set another card as default first.");
      return;
    }
    setCardPendingDeleteId(cardId);
    setDeleteCardDialogOpen(true);
  };

  const handleConfirmDeleteCard = async () => {
    if (!cardPendingDeleteId) return;
    setDeletingCard(true);
    try {
      const res = await fetch(`/api/client/cards/${cardPendingDeleteId}`, {
        method: "DELETE",
        credentials: "include",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Failed to delete card.");

      setProfile((prev) => {
        const nextCards = (prev.cardDetails || []).filter(
          (card, index) => {
            const currentId = card._id || `${card.brand}-${card.last4}-${index}`;
            return currentId !== cardPendingDeleteId;
          }
        );
        return {
          ...prev,
          cardDetails: nextCards,
          defaultPaymentMethod: data?.defaultPaymentMethod || nextCards[0]?._id || "",
        };
      });

      if (selectedCardId === cardPendingDeleteId) {
        setSelectedCardId(data?.defaultPaymentMethod || "");
      }

      toast.success("Card deleted successfully.");
      setDeleteCardDialogOpen(false);
      setCardPendingDeleteId("");
    } catch (error: any) {
      toast.error(error?.message || "Failed to delete card.");
    } finally {
      setDeletingCard(false);
    }
  };

  const handleClearBookingFilter = () => {
    setSelectedPreset("");
    setFilterRange(undefined);
    setAppliedRange(undefined);
    setPage(1);
    setFilterSheetOpen(false);
  };

  const formatCurrency = (amount: number, currency = "USD") =>
    new Intl.NumberFormat("en-US", { style: "currency", currency }).format(amount || 0);

  const handleDownloadClientInvoicePdf = async () => {
    if (!viewClientInvoice || !invoicePreviewRef.current) return;
    let wrapper: HTMLDivElement | null = null;
    try {
      setDownloadingClientInvoicePdf(true);
      const [{ toPng }, { default: html2canvas }, { jsPDF }] = await Promise.all([
        import("html-to-image"),
        import("html2canvas"),
        import("jspdf"),
      ]);

      const source = invoicePreviewRef.current;
      const clone = source.cloneNode(true) as HTMLDivElement;
      wrapper = document.createElement("div");
      wrapper.classList.add("dark");
      wrapper.style.position = "fixed";
      wrapper.style.left = "-99999px";
      wrapper.style.top = "0";
      wrapper.style.width = `${source.clientWidth}px`;
      wrapper.style.background = "#0b0b0b";
      wrapper.style.colorScheme = "dark";
      wrapper.style.padding = "0";
      wrapper.style.zIndex = "-1";
      clone.classList.add("dark");
      clone.style.maxHeight = "none";
      clone.style.height = "auto";
      clone.style.overflow = "visible";
      wrapper.appendChild(clone);
      document.body.appendChild(wrapper);

      let dataUrl = "";
      try {
        dataUrl = await toPng(clone, {
          pixelRatio: 2,
          cacheBust: true,
          backgroundColor: "#0b0b0b",
          canvasWidth: source.scrollWidth,
          canvasHeight: source.scrollHeight,
        });
      } catch {
        const canvas = await html2canvas(clone, {
          backgroundColor: "#0b0b0b",
          scale: 2,
          useCORS: true,
          allowTaint: true,
          logging: false,
          width: source.scrollWidth,
          height: source.scrollHeight,
          windowWidth: source.scrollWidth,
          windowHeight: source.scrollHeight,
        });
        dataUrl = canvas.toDataURL("image/png");
      }

      const pdf = new jsPDF("p", "mm", "a4");
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const imgProps = pdf.getImageProperties(dataUrl);
      const imgWidth = pageWidth;
      const imgHeight = (imgProps.height * imgWidth) / imgProps.width;
      let heightLeft = imgHeight;
      let position = 0;
      pdf.addImage(dataUrl, "PNG", 0, position, imgWidth, imgHeight, undefined, "FAST");
      heightLeft -= pageHeight;
      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(dataUrl, "PNG", 0, position, imgWidth, imgHeight, undefined, "FAST");
        heightLeft -= pageHeight;
      }
      pdf.save(`invoice-${viewClientInvoice.invoiceNumber}.pdf`);
    } catch {
      toast.error("Failed to download invoice.");
    } finally {
      if (wrapper && wrapper.parentNode) {
        wrapper.parentNode.removeChild(wrapper);
      }
      setDownloadingClientInvoicePdf(false);
    }
  };

  if (bookingsLoading && displayBookings.length === 0) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border bg-card">
        <div className="relative h-44 w-full bg-muted">
          <div className="absolute inset-0 bg-[linear-gradient(to_right,transparent,rgba(0,0,0,0.35))]" />
          <div className="absolute inset-0 bg-primary/20" />
          <div className="absolute inset-0 flex items-center justify-center">
            <h1 className="text-3xl font-bold tracking-tight text-primary-foreground">Dashboard</h1>
          </div>
        </div>
        <div className="w-full border-t bg-background px-2 md:px-4 py-3">
<div className="flex overflow-x-auto no-scrollbar items-center justify-start md:justify-center gap-1 w-full">
        <Button
            type="button"
            size="sm"
            className={cn(
              "lg:hidden w-fit",
              dashboardTab === "profile" ? "" : "bg-muted text-foreground hover:bg-muted/80"
            )}
            onClick={(e) => {
              e.preventDefault();
              setDashboardTab("profile");
            }}
          >
            Profile
          </Button>

          <Button
            type="button"
            size="sm"
            className={dashboardTab === "booking" ? "" : "bg-muted text-foreground hover:bg-muted/80"}
            onClick={(e) => {
              e.preventDefault();
              setDashboardTab("booking");
            }}
          >
            Booking
          </Button>
          <Button
            type="button"
            size="sm"
            className={
              dashboardTab === "payment"
                ? ""
                : "bg-muted text-foreground hover:bg-muted/80"
            }
            onClick={(e) => {
              e.preventDefault();
              setDashboardTab("payment");
            }}
          >
            Payment Settings
          </Button>
          <Button
            type="button"
            size="sm"
            className={
              dashboardTab === "invoices"
                ? ""
                : "bg-muted text-foreground hover:bg-muted/80"
            }
            onClick={(e) => {
              e.preventDefault();
              setDashboardTab("invoices");
            }}
          >
            Invoices
          </Button>
        </div>
        </div>
      </div>

      {dashboardTab === "profile" ? (
        <div className="grid grid-cols-1 gap-4">
          <Card>
            <CardContent className="space-y-4 p-4 max-h-screen overflow-y-auto">
              <div className="flex flex-col items-center border-b pb-4">
                <Avatar key={profileAvatarUrl || "none"} className="mb-2 h-16 w-16">
                  <AvatarImage src={profileAvatarUrl || undefined} alt="" className="object-cover" />
                  <AvatarFallback className="bg-primary text-xl font-bold text-primary-foreground">
                    {displayInitials}
                  </AvatarFallback>
                </Avatar>
                <p className="text-sm font-semibold">{userName}</p>
              </div>

              <div className="grid gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={(e) => {
                    e.preventDefault();
                    openEditProfileSheet();
                  }}
                >
                  Edit Profile
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={(e) => {
                    e.preventDefault();
                    setPasswordSheetOpen(true);
                  }}
                >
                  Change Password
                </Button>
              </div>

              <div className="space-y-2 text-xs">
                <div className="rounded-md border p-2">
                  <p className="mb-1 text-muted-foreground">Email</p>
                  <div className="flex items-center gap-1.5 text-foreground">
                    <Mail className="h-3.5 w-3.5 text-primary" />
                    <span>{userEmail}</span>
                  </div>
                </div>
                <div className="rounded-md border p-2">
                  <p className="mb-1 text-muted-foreground">Phone</p>
                  <div className="flex items-center gap-1.5 text-foreground">
                    <Phone className="h-3.5 w-3.5 text-primary" />
                    <span>{profile.phoneNumber || "Not available"}</span>
                  </div>
                </div>
                <div className="rounded-md border p-2">
                  <p className="mb-1 text-muted-foreground">Address</p>
                  <div className="flex items-start gap-1.5 text-foreground">
                    <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
                    <span>{profileAddress}</span>
                  </div>
                </div>
                <div className="rounded-md border p-2">
                  <p className="mb-1 text-muted-foreground">Country</p>
                  <span>{profile.country || "Not available"}</span>
                </div>
                <div className="rounded-md border p-2">
                  <p className="mb-1 text-muted-foreground">State</p>
                  <span>{profile.state || "Not available"}</span>
                </div>
                <div className="rounded-md border p-2">
                  <p className="mb-1 text-muted-foreground">City</p>
                  <span>{profile.city || "Not available"}</span>
                </div>
                <div className="rounded-md border p-2">
                  <p className="mb-1 text-muted-foreground">Zip Code</p>
                  <span>{profile.zipCode || "Not available"}</span>
                </div>
                <div className="rounded-md border p-2">
                  <p className="mb-1 text-muted-foreground">Special Instructions</p>
                  <span>{profile.specialInstructions || "Not available"}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : dashboardTab === "payment" ? (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
          <Card className="hidden lg:block lg:col-span-3 sticky top-[4rem]">
            <CardContent className="space-y-4 p-4">
              <div className="flex flex-col items-center border-b pb-4">
                <Avatar key={profileAvatarUrl || "none"} className="mb-2 h-16 w-16">
                  <AvatarImage src={profileAvatarUrl || undefined} alt="" className="object-cover" />
                  <AvatarFallback className="bg-primary text-xl font-bold text-primary-foreground">
                    {displayInitials}
                  </AvatarFallback>
                </Avatar>
                <p className="text-sm font-semibold">{userName}</p>
              </div>

              <div className="grid gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={(e) => {
                    e.preventDefault();
                    openEditProfileSheet();
                  }}
                >
                  Edit Profile
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={(e) => {
                    e.preventDefault();
                    setPasswordSheetOpen(true);
                  }}
                >
                  Change Password
                </Button>
              </div>

              <div className="space-y-2 text-xs">
                <div className="rounded-md border p-2">
                  <p className="mb-1 text-muted-foreground">Email</p>
                  <div className="flex items-center gap-1.5 text-foreground">
                    <Mail className="h-3.5 w-3.5 text-primary" />
                    <span>{userEmail}</span>
                  </div>
                </div>
                <div className="rounded-md border p-2">
                  <p className="mb-1 text-muted-foreground">Phone</p>
                  <div className="flex items-center gap-1.5 text-foreground">
                    <Phone className="h-3.5 w-3.5 text-primary" />
                    <span>{profile.phoneNumber || "Not available"}</span>
                  </div>
                </div>
                <div className="rounded-md border p-2">
                  <p className="mb-1 text-muted-foreground">Address</p>
                  <div className="flex items-start gap-1.5 text-foreground">
                    <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
                    <span>{profileAddress}</span>
                  </div>
                </div>
                <div className="rounded-md border p-2">
                  <p className="mb-1 text-muted-foreground">Country</p>
                  <span>{profile.country || "Not available"}</span>
                </div>
                <div className="rounded-md border p-2">
                  <p className="mb-1 text-muted-foreground">State</p>
                  <span>{profile.state || "Not available"}</span>
                </div>
                <div className="rounded-md border p-2">
                  <p className="mb-1 text-muted-foreground">City</p>
                  <span>{profile.city || "Not available"}</span>
                </div>
                <div className="rounded-md border p-2">
                  <p className="mb-1 text-muted-foreground">Zip Code</p>
                  <span>{profile.zipCode || "Not available"}</span>
                </div>
                <div className="rounded-md border p-2">
                  <p className="mb-1 text-muted-foreground">Special Instructions</p>
                  <span>{profile.specialInstructions || "Not available"}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="lg:col-span-9 max-h-screen overflow-y-hidden">
            <CardContent className="space-y-4 p-4 md:p-6 max-h-screen">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold">Payment Methods</h2>
                  <p className="text-sm text-muted-foreground">Select default card</p>
                </div>
                <Button type="button" onClick={() => setAddCardSheetOpen(true)}>
                  + Add Card
                </Button>
              </div>
              <div className="flex flex-col gap-2 overflow-y-auto max-h-[calc(100vh-200px)] py-2">

              {!profile.cardDetails || profile.cardDetails.length === 0 ? (
                <div className="rounded-md border p-6 text-center text-sm text-muted-foreground">
                  No cards available.
                </div>
              ) : (
                <div className="space-y-3">
                  {profile.cardDetails.map((card, index) => {
                    const cardId = card._id || `${card.brand}-${card.last4}-${index}`;
                    const isSelected = selectedCardId === cardId;
                    const isDefaultCard =
                      String(profile.defaultPaymentMethod || "").trim() === cardId || isSelected;
                    const expires = [card.expMonth, card.expYear].filter(Boolean).join("/");
                    return (
                      <div
                        key={cardId}
                        className={`flex items-center gap-3 rounded-lg border p-4 ${
                          isSelected ? "border-primary/40 bg-primary/5" : ""
                        }`}
                        onClick={() => handleSelectDefaultCard(cardId, card)}
                      >
                        <button
                          type="button"
                          aria-label="Set default card"
                          className={`h-4 w-4 rounded-full border ${
                            isSelected ? "border-primary bg-primary" : "border-muted-foreground/40"
                          }`}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSelectDefaultCard(cardId, card);
                          }}
                        />
                        <div className="flex-1">
                          <p className="text-sm font-medium">{card.nameOnCard || userName}</p>
                          <p className="text-sm capitalize text-muted-foreground">
                            {card.brand || "card"} ending in {card.last4 || "****"}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Card expires at {expires || "--/--"}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          {isSelected && <Badge>Default Card</Badge>}
                          {!isDefaultCard && (
                            <Button
                              type="button"
                              variant="destructive"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                openDeleteCardDialog(cardId);
                              }}
                            >
                              Delete
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
              </div>
            </CardContent>
          </Card>
        </div>
      ) : dashboardTab === "invoices" ? (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
          <Card className="hidden lg:block lg:col-span-3 sticky top-[4rem]">
            <CardContent className="space-y-4 p-4 max-h-screen overflow-y-auto">
              <div className="flex flex-col items-center border-b pb-4">
                <Avatar key={profileAvatarUrl || "none"} className="mb-2 h-16 w-16">
                  <AvatarImage src={profileAvatarUrl || undefined} alt="" className="object-cover" />
                  <AvatarFallback className="bg-primary text-xl font-bold text-primary-foreground">
                    {displayInitials}
                  </AvatarFallback>
                </Avatar>
                <p className="text-sm font-semibold">{userName}</p>
              </div>

              <div className="grid gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={(e) => {
                    e.preventDefault();
                    openEditProfileSheet();
                  }}
                >
                  Edit Profile
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={(e) => {
                    e.preventDefault();
                    setPasswordSheetOpen(true);
                  }}
                >
                  Change Password
                </Button>
              </div>

              <div className="space-y-2 text-xs">
                <div className="rounded-md border p-2">
                  <p className="mb-1 text-muted-foreground">Email</p>
                  <div className="flex items-center gap-1.5 text-foreground">
                    <Mail className="h-3.5 w-3.5 text-primary" />
                    <span>{userEmail}</span>
                  </div>
                </div>
                <div className="rounded-md border p-2">
                  <p className="mb-1 text-muted-foreground">Phone</p>
                  <div className="flex items-center gap-1.5 text-foreground">
                    <Phone className="h-3.5 w-3.5 text-primary" />
                    <span>{profile.phoneNumber || "Not available"}</span>
                  </div>
                </div>
                <div className="rounded-md border p-2">
                  <p className="mb-1 text-muted-foreground">Address</p>
                  <div className="flex items-start gap-1.5 text-foreground">
                    <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
                    <span>{profileAddress}</span>
                  </div>
                </div>
                <div className="rounded-md border p-2">
                  <p className="mb-1 text-muted-foreground">Country</p>
                  <span>{profile.country || "Not available"}</span>
                </div>
                <div className="rounded-md border p-2">
                  <p className="mb-1 text-muted-foreground">State</p>
                  <span>{profile.state || "Not available"}</span>
                </div>
                <div className="rounded-md border p-2">
                  <p className="mb-1 text-muted-foreground">City</p>
                  <span>{profile.city || "Not available"}</span>
                </div>
                <div className="rounded-md border p-2">
                  <p className="mb-1 text-muted-foreground">Zip Code</p>
                  <span>{profile.zipCode || "Not available"}</span>
                </div>
                <div className="rounded-md border p-2">
                  <p className="mb-1 text-muted-foreground">Special Instructions</p>
                  <span>{profile.specialInstructions || "Not available"}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="lg:col-span-9 max-h-screen overflow-y-auto">
            <CardContent className="space-y-4 p-4 md:p-6">
              <div>
                <h2 className="text-lg font-semibold">My Invoices</h2>
                <p className="text-sm text-muted-foreground">
                  View all invoices linked to your account.
                </p>
              </div>
              {clientInvoices.length === 0 ? (
                <div className="rounded-md border p-6 text-center text-sm text-muted-foreground">
                  No invoices available.
                </div>
              ) : (
                <div className="rounded-lg border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Invoice #</TableHead>
                        <TableHead>Issue Date</TableHead>
                        <TableHead>Due Date</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {clientInvoices.map((invoice) => (
                        <TableRow key={invoice._id}>
                          <TableCell className="font-medium">{invoice.invoiceNumber}</TableCell>
                          <TableCell>
                            {invoice.issueDate ? format(new Date(invoice.issueDate), "MMM dd, yyyy") : "-"}
                          </TableCell>
                          <TableCell>
                            {invoice.dueDate ? format(new Date(invoice.dueDate), "MMM dd, yyyy") : "-"}
                          </TableCell>
                          <TableCell>{formatCurrency(invoice.total, invoice.currency || "USD")}</TableCell>
                          <TableCell>
                            <Badge className="capitalize">{invoice.status || "draft"}</Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => setViewClientInvoice(invoice)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-12 sticky top-[4rem]">
          <Card className="hidden lg:block lg:col-span-3 max-h-screen sticky top-[4rem] ">
            <CardContent className="space-y-4 p-4 max-h-screen overflow-y-auto">
              <div className="flex flex-col items-center border-b pb-4">
                <Avatar key={profileAvatarUrl || "none"} className="mb-2 h-16 w-16">
                  <AvatarImage src={profileAvatarUrl || undefined} alt="" className="object-cover" />
                  <AvatarFallback className="bg-primary text-xl font-bold text-primary-foreground">
                    {displayInitials}
                  </AvatarFallback>
                </Avatar>
                <p className="text-sm font-semibold">{userName}</p>
              </div>

              <div className="grid gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={(e) => {
                    e.preventDefault();
                    openEditProfileSheet();
                  }}
                >
                  Edit Profile
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={(e) => {
                    e.preventDefault();
                    setPasswordSheetOpen(true);
                  }}
                >
                  Change Password
                </Button>
              </div>

              <div className="space-y-2 text-xs">
                <div className="rounded-md border p-2">
                  <p className="mb-1 text-muted-foreground">Email</p>
                  <div className="flex items-center gap-1.5 text-foreground">
                    <Mail className="h-3.5 w-3.5 text-primary" />
                    <span>{userEmail}</span>
                  </div>
                </div>
                <div className="rounded-md border p-2">
                  <p className="mb-1 text-muted-foreground">Phone</p>
                  <div className="flex items-center gap-1.5 text-foreground">
                    <Phone className="h-3.5 w-3.5 text-primary" />
                    <span>{profile.phoneNumber || "Not available"}</span>
                  </div>
                </div>
                <div className="rounded-md border p-2">
                  <p className="mb-1 text-muted-foreground">Address</p>
                  <div className="flex items-start gap-1.5 text-foreground">
                    <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
                    <span>{profileAddress}</span>
                  </div>
                </div>
                <div className="rounded-md border p-2">
                  <p className="mb-1 text-muted-foreground">Country</p>
                  <span>{profile.country || "Not available"}</span>
                </div>
                <div className="rounded-md border p-2">
                  <p className="mb-1 text-muted-foreground">State</p>
                  <span>{profile.state || "Not available"}</span>
                </div>
                <div className="rounded-md border p-2">
                  <p className="mb-1 text-muted-foreground">City</p>
                  <span>{profile.city || "Not available"}</span>
                </div>
                <div className="rounded-md border p-2">
                  <p className="mb-1 text-muted-foreground">Zip Code</p>
                  <span>{profile.zipCode || "Not available"}</span>
                </div>
                <div className="rounded-md border p-2">
                  <p className="mb-1 text-muted-foreground">Special Instructions</p>
                  <span>{profile.specialInstructions || "Not available"}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="space-y-4 lg:col-span-9 max-h-screen pr-1">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Card className="border-primary/20 bg-primary/5 max-h-screen">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-muted-foreground">Upcoming Bookings</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-semibold text-primary">{counts.upcoming}</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-muted-foreground">Previous Bookings</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-semibold">{counts.previous}</p>
                </CardContent>
              </Card>
            </div>

            <Tabs
              value={activeTab}
              onValueChange={(value) => {
                setPage(1);
                setActiveTab(value as "upcoming" | "previous");
              }}
              className="space-y-4"
            >
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <TabsList>
                  <TabsTrigger type="button" value="upcoming">
                    Upcoming
                  </TabsTrigger>
                  <TabsTrigger type="button" value="previous">
                    Previous
                  </TabsTrigger>
                </TabsList>
                <Button
                  type="button"
                  variant="outline"
                  onClick={(e) => {
                    e.preventDefault();
                    setFilterSheetOpen(true);
                  }}
                >
                  Booking Filter
                </Button>
              </div>

              <TabsContent value={activeTab} className="flex-none space-y-3 overflow-y-auto max-h-[calc(100vh-200px)]">
                {bookings.length === 0 ? (
                  <Card>
                    <CardContent className="py-10 text-center text-sm text-muted-foreground">
                      No appointment scheduled!
                    </CardContent>
                  </Card>
                ) : (
                  bookings.map((booking) => {
                    const start = new Date(booking.startDateTime);
                    const end = booking.endDateTime ? new Date(booking.endDateTime) : null;
                    const statusClass =
                      statusClassMap[booking.status] ||
                      "bg-muted text-muted-foreground border-border";

                    return (
                      <Card key={booking._id} className="overflow-hidden relative">
                        <CardContent className="p-0">
                          <div className="border-l-4 border-primary px-5 py-4">
                            <div className="flex flex-wrap items-center justify-between gap-3 mt-2 md:mt-0">
                              <div>
                                <p className="text-sm text-muted-foreground">Order #{booking.orderId || "-"}</p>
                                <h3 className="text-lg font-semibold">{booking.serviceName}</h3>
                              </div>
                              <div className="flex flex-wrap items-center justify-end gap-2">
                                <Badge className={`capitalize text-[10px] ${statusClass} absolute top-[0.5rem] right-[0.5rem] lg:top-[1rem] lg:right-[1rem]`}>{booking.status}</Badge>
                                {sentInvoiceByBookingId.has(booking._id) && (
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    className="gap-1.5"
                                    onClick={() =>
                                      setViewClientInvoice(sentInvoiceByBookingId.get(booking._id)!)
                                    }
                                  >
                                    <ReceiptText className="h-4 w-4" />
                                    Invoice
                                  </Button>
                                )}
                              </div>
                            </div>

                            <div className="mt-4 grid grid-cols-1 gap-3 text-sm md:grid-cols-2">
                              <div className="flex items-start gap-2 text-muted-foreground">
                                <CalendarClock className="mt-0.5 h-4 w-4 text-primary" />
                                <span>
                                  {format(start, "EEE, MMM d, yyyy")} at {format(start, "hh:mm a")}
                                  {end ? ` - ${format(end, "hh:mm a")}` : ""}
                                </span>
                              </div>

                              <div className="flex items-start gap-2 text-muted-foreground">
                                <UserRound className="mt-0.5 h-4 w-4 text-primary" />
                                <span>Technician: {booking.technicianName}</span>
                              </div>

                              <div className="flex items-start gap-2 text-muted-foreground">
                                <ReceiptText className="mt-0.5 h-4 w-4 text-primary" />
                                <span>Amount: ${booking.finalAmount.toFixed(2)}</span>
                              </div>

                              <div className="flex items-start gap-2 text-muted-foreground">
                                <MapPin className="mt-0.5 h-4 w-4 text-primary" />
                                <span>{booking.address || "Address not available"}</span>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })
                )}

                <div ref={bookingsLoadMoreRef} className="h-10 flex items-center justify-center">
                  {bookingsLoading && page < totalPages ? (
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  ) : page >= totalPages ? (
                    <span className="text-xs text-muted-foreground">End of bookings</span>
                  ) : null}
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      )}

      <Sheet
        open={sheetOpen}
        onOpenChange={(open) => {
          setSheetOpen(open);
          if (!open) setProfileDraft(null);
        }}
      >
        <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-2xl">
          <SheetHeader>
            <SheetTitle>Edit User Information</SheetTitle>
            <SheetDescription>
              Update your profile information.
            </SheetDescription>
          </SheetHeader>

          <div className="grid grid-cols-1 gap-4 px-4 md:grid-cols-2">
            <div className="md:col-span-2">
              <ProfileImageUploader
                imageUrl={draftProfileAvatarUrl}
                initials={draftDisplayInitials}
                uploading={uploadingAvatar}
                onUpload={handleAvatarUpload}
                onRemove={handleRemoveDraftAvatar}
              />
            </div>

            <div className="space-y-2">
              <Label>First name</Label>
              <Input
                value={profileDraft?.firstName || ""}
                onChange={(e) => handleProfileChange("firstName", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Last name</Label>
              <Input
                value={profileDraft?.lastName || ""}
                onChange={(e) => handleProfileChange("lastName", e.target.value)}
              />
            </div>
            <div className="space-y-2 ">
              <Label>Email address</Label>
              <Input value={profileDraft?.email || ""} disabled />
            </div>
            
            <div className="space-y-2">
              <Label>Number</Label>
              <Input
                value={profileDraft?.phoneNumber || ""}
                onChange={(e) => handleProfileChange("phoneNumber", e.target.value)}
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Street Address</Label>
              <Textarea
                value={profileDraft?.address || ""}
                onChange={(e) => handleProfileChange("address", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Country</Label>
              <VirtualGeoSelect
                id="client-country"
                value={profileDraft?.country || ""}
                options={countryOptions}
                placeholder="Select Country"
                disabled={!geoLib}
                onChange={(value) => {
                  handleProfileChange("country", value);
                  handleProfileChange("state", "");
                  handleProfileChange("city", "");
                }}
              />
            </div>
            <div className="space-y-2">
              <Label>State</Label>
              <VirtualGeoSelect
                id="client-state"
                value={profileDraft?.state || ""}
                options={stateOptions}
                placeholder="Select State"
                disabled={!geoLib || !(profileDraft?.country || "").trim()}
                onChange={(value) => {
                  handleProfileChange("state", value);
                  handleProfileChange("city", "");
                }}
              />
            </div>
            <div className="space-y-2">
              <Label>City</Label>
              <VirtualGeoSelect
                id="client-city"
                value={profileDraft?.city || ""}
                options={cityOptions}
                placeholder="Select City"
                disabled={!geoLib || !(profileDraft?.state || "").trim()}
                onChange={(value) => handleProfileChange("city", value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Zip Code</Label>
              <Input
                value={profileDraft?.zipCode || ""}
                onChange={(e) => handleProfileChange("zipCode", e.target.value)}
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Special Instructions</Label>
              <Textarea
                value={profileDraft?.specialInstructions || ""}
                onChange={(e) =>
                  handleProfileChange("specialInstructions", e.target.value)
                }
              />
            </div>
          </div>

          <SheetFooter className="mt-4 flex-row justify-end gap-2">
            <Button
              className="min-w-[110px]"
              onClick={handleSaveProfile}
              disabled={savingProfile}
            >
              {savingProfile ? "Saving..." : "Save Changes"}
            </Button>
            <Button
              variant="destructive"
              className="min-w-[110px]"
              onClick={() => {
                setSheetOpen(false);
                setProfileDraft(null);
              }}
              disabled={savingProfile}
            >
              Cancel
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <Sheet open={passwordSheetOpen} onOpenChange={setPasswordSheetOpen}>
        <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-lg">
          <SheetHeader>
            <SheetTitle>Change Password</SheetTitle>
            <SheetDescription>
              Update your account password.
            </SheetDescription>
          </SheetHeader>

          <div className="grid grid-cols-1 gap-4 px-4">
            <div className="space-y-2">
              <Label>Old Password</Label>
              <Input
                type="password"
                value={passwordForm.oldPassword}
                onChange={(e) =>
                  setPasswordForm((prev) => ({ ...prev, oldPassword: e.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label>New Password</Label>
              <Input
                type="password"
                value={passwordForm.newPassword}
                onChange={(e) =>
                  setPasswordForm((prev) => ({ ...prev, newPassword: e.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Confirm Password</Label>
              <Input
                type="password"
                value={passwordForm.confirmPassword}
                onChange={(e) =>
                  setPasswordForm((prev) => ({ ...prev, confirmPassword: e.target.value }))
                }
              />
            </div>
          </div>

          <SheetFooter className="mt-4 flex-row justify-end gap-2">
            <Button
              className="min-w-[110px]"
              onClick={handleChangePassword}
              disabled={savingPassword}
            >
              {savingPassword ? "Confirming..." : "Confirm"}
            </Button>
            <Button
              variant="destructive"
              className="min-w-[110px]"
              onClick={() => setPasswordSheetOpen(false)}
              disabled={savingPassword}
            >
              Cancel
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <Sheet open={filterSheetOpen} onOpenChange={setFilterSheetOpen}>
        <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-3xl">
          <SheetHeader>
            <SheetTitle>Filter data</SheetTitle>
            <SheetDescription>Choose a booking date range.</SheetDescription>
          </SheetHeader>

          <div className="grid grid-cols-1 gap-4 px-4 md:grid-cols-12">
            <div className="space-y-2 md:col-span-3">
              <p className="text-sm font-medium">Search Date</p>
              <Button type="button" variant={selectedPreset === "today" ? "default" : "ghost"} className="w-full justify-start" onClick={() => applyPreset("today")}>Today</Button>
              <Button type="button" variant={selectedPreset === "yesterday" ? "default" : "ghost"} className="w-full justify-start" onClick={() => applyPreset("yesterday")}>Yesterday</Button>
              <Button type="button" variant={selectedPreset === "thisWeek" ? "default" : "ghost"} className="w-full justify-start" onClick={() => applyPreset("thisWeek")}>This Week</Button>
              <Button type="button" variant={selectedPreset === "lastWeek" ? "default" : "ghost"} className="w-full justify-start" onClick={() => applyPreset("lastWeek")}>Last Week</Button>
              <Button type="button" variant={selectedPreset === "thisMonth" ? "default" : "ghost"} className="w-full justify-start" onClick={() => applyPreset("thisMonth")}>This Month</Button>
              <Button type="button" variant={selectedPreset === "lastMonth" ? "default" : "ghost"} className="w-full justify-start" onClick={() => applyPreset("lastMonth")}>Last Month</Button>
              <div className="flex items-center gap-2 rounded-md border p-2">
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  className="h-10 w-28 rounded-md border border-input bg-background px-3 text-center text-sm font-semibold text-foreground caret-foreground outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                  value={daysUpToToday || ""}
                  placeholder="0"
                  onFocus={() => {
                    setSelectedPreset("daysUpToToday");
                    setDaysStartingToday("0");
                  }}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, "");
                    setDaysUpToToday(value);
                    setSelectedPreset("daysUpToToday");
                    setDaysStartingToday("0");
                    const normalized = Math.max(1, Number(value || "1"));
                    const now = new Date();
                    const startOfToday = new Date(now);
                    startOfToday.setHours(0, 0, 0, 0);
                    const endOfToday = new Date(now);
                    endOfToday.setHours(23, 59, 59, 999);
                    const start = new Date(startOfToday);
                    start.setDate(start.getDate() - (normalized - 1));
                    setFilterRange({ from: start, to: endOfToday });
                  }}
                  onKeyDown={(e) => {
                    if (["e", "E", "+", "-", ".", ","].includes(e.key)) e.preventDefault();
                  }}
                />
                <span className="text-sm text-foreground">days up to today</span>
              </div>
              <div className="flex items-center gap-2 rounded-md border p-2">
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  className="h-10 w-28 rounded-md border border-input bg-background px-3 text-center text-sm font-semibold text-foreground caret-foreground outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                  value={daysStartingToday || ""}
                  placeholder="0"
                  onFocus={() => {
                    setSelectedPreset("daysStartingToday");
                    setDaysUpToToday("0");
                  }}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, "");
                    setDaysStartingToday(value);
                    setSelectedPreset("daysStartingToday");
                    setDaysUpToToday("0");
                    const normalized = Math.max(1, Number(value || "1"));
                    const now = new Date();
                    const startOfToday = new Date(now);
                    startOfToday.setHours(0, 0, 0, 0);
                    const end = new Date(now);
                    end.setHours(23, 59, 59, 999);
                    end.setDate(end.getDate() + (normalized - 1));
                    setFilterRange({ from: startOfToday, to: end });
                  }}
                  onKeyDown={(e) => {
                    if (["e", "E", "+", "-", ".", ","].includes(e.key)) e.preventDefault();
                  }}
                />
                <span className="text-sm text-foreground">days starting today</span>
              </div>
            </div>

            <div className="rounded-lg border md:col-span-9">
              <div className="flex items-center gap-2 border-b p-3">
                <Input value={filterRange?.from ? format(filterRange.from, "MMM dd, yyyy") : ""} readOnly />
                <Input value={filterRange?.to ? format(filterRange.to, "MMM dd, yyyy") : ""} readOnly />
              </div>
              <div className="flex justify-center p-2">
                <Calendar
                  mode="range"
                  selected={filterRange}
                  onSelect={setFilterRange}
                  captionLayout="dropdown"
                  fromYear={2020}
                  toYear={2035}
                />
              </div>
            </div>
          </div>

          <SheetFooter className="mt-4 flex-row justify-end gap-2">
            <Button type="button" onClick={handleApplyBookingFilter}>
              Submit
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={handleClearBookingFilter}
            >
              Clear
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={() => setFilterSheetOpen(false)}
            >
              Cancel
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <Sheet
        open={!!viewClientInvoice}
        onOpenChange={(open) => {
          if (!open) {
            setViewClientInvoice(null);
            setViewClientBooking(null);
          }
        }}
      >
        <SheetContent side="right" className="sm:max-w-5xl w-full p-0 flex flex-col">
          <SheetHeader className="p-4 border-b gap-0">
            <SheetTitle>Invoice Preview</SheetTitle>
            <SheetDescription>Review invoice details before downloading.</SheetDescription>
          </SheetHeader>

          {viewClientInvoice && (
            <div className="flex-1 overflow-y-auto p-4 sm:p-6">
              <div ref={invoicePreviewRef} className="rounded-2xl border bg-background shadow-sm overflow-hidden">
                <div className="p-5 sm:p-7">
                  <div className="flex items-start justify-between gap-4">
                    <div className="text-sm text-muted-foreground">
                      Date{" "}
                      <span className="text-foreground font-medium">
                        {new Date(viewClientInvoice.issueDate).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="text-sm text-muted-foreground text-right">
                      Invoice{" "}
                      <span className="text-foreground font-medium">
                        #{viewClientInvoice.invoiceNumber}
                      </span>
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="rounded-xl border bg-muted/20 p-4">
                      <div className="text-xs font-medium text-muted-foreground">To</div>
                      <div className="mt-2 text-sm">
                        <div className="font-semibold text-foreground">
                          {`${viewClientInvoice.contactId?.firstName || ""} ${viewClientInvoice.contactId?.lastName || ""}`.trim() || "N/A"}
                        </div>
                        {(viewClientInvoice.contactId?.companyName ||
                          viewClientInvoice.contactId?.company) && (
                          <div className="text-muted-foreground">
                            {viewClientInvoice.contactId?.companyName ||
                              viewClientInvoice.contactId?.company}
                          </div>
                        )}
                        {viewClientInvoice.contactId?.email && (
                          <div className="text-muted-foreground">{viewClientInvoice.contactId.email}</div>
                        )}
                      </div>
                    </div>
                    <div className="rounded-xl border bg-muted/20 p-4">
                      <div className="text-xs font-medium text-muted-foreground">From</div>
                      <div className="mt-2 text-sm">
                        <div className="font-semibold text-foreground">{company?.name || "Company"}</div>
                        <div className="text-muted-foreground">Billing</div>
                        <div className="text-muted-foreground">{company?.email || "support@company.com"}</div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 rounded-full border bg-muted/20 px-4 py-3 flex items-center justify-between gap-3">
                    <div className="text-sm text-muted-foreground">
                      <span className="font-medium text-destructive">
                        {formatCurrency(viewClientInvoice.total || 0, viewClientInvoice.currency || "USD")}
                      </span>{" "}
                      due on{" "}
                      <span className="text-foreground font-medium">
                        {viewClientInvoice.dueDate ? new Date(viewClientInvoice.dueDate).toLocaleDateString() : "-"}
                      </span>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Status: <span className="text-foreground font-medium">{viewClientInvoice.status || "draft"}</span>
                    </div>
                  </div>

                  <div className="mt-5 rounded-xl border bg-muted/10 overflow-hidden">
                    <div className="px-4 py-3 border-b bg-background/50">
                      <div className="text-sm font-semibold">Items</div>
                    </div>
                    <div className="p-0">
                      {(() => {
                        const items = viewClientInvoice.items || [];
                        const subServices = items.filter((i) => i.description?.startsWith("Sub Service:"));
                        const addons = items.filter((i) => i.description?.startsWith("Add On:"));
                        const discounts = items.filter((i) => {
                          const lineTotal = Number(i.total) || 0;
                          return lineTotal < 0 || String(i.description || "").toLowerCase().startsWith("discount");
                        });
                        const other = items.filter(
                          (i) =>
                            !i.description?.startsWith("Sub Service:") &&
                            !i.description?.startsWith("Add On:") &&
                            !(Number(i.total) < 0) &&
                            !String(i.description || "").toLowerCase().startsWith("discount")
                        );
                        const discountTotal = Math.abs(
                          discounts.reduce((sum, i) => sum + (Number(i.total) || 0), 0)
                        );

                        const mainServiceName =
                          viewClientBooking?.serviceId?.name ||
                          (typeof viewClientBooking?.serviceId === "string" ? "Service" : "") ||
                          "Main service";

                        const renderGroup = (title: string, groupItems: any[], titleClass?: string) => {
                          if (!groupItems.length) return null;
                          return (
                            <>
                              <TableRow>
                                <TableCell colSpan={4} className={titleClass || "font-semibold"}>
                                  {title}
                                </TableCell>
                              </TableRow>
                              {groupItems.map((item, idx) => (
                                <TableRow key={`${title}-${idx}`}>
                                  <TableCell>
                                    <div className="font-medium text-foreground">
                                      {String(item.description || "")
                                        .replace(/^Sub Service:\s*/i, "")
                                        .replace(/^Add On:\s*/i, "")}
                                    </div>
                                  </TableCell>
                                  <TableCell className="text-muted-foreground">{item.quantity}</TableCell>
                                  <TableCell className="text-muted-foreground">
                                    {formatCurrency(item.unitPrice, viewClientInvoice.currency || "USD")}
                                  </TableCell>
                                  <TableCell className="text-right font-medium">
                                    {formatCurrency(item.total, viewClientInvoice.currency || "USD")}
                                  </TableCell>
                                </TableRow>
                              ))}
                            </>
                          );
                        };

                        return (
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead className="w-[55%]">Service</TableHead>
                                <TableHead className="w-[15%]">Qty</TableHead>
                                <TableHead className="w-[15%]">Rate</TableHead>
                                <TableHead className="w-[15%] text-right">Line total</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              <TableRow>
                                <TableCell colSpan={4} className="font-bold">
                                  {mainServiceName}
                                </TableCell>
                              </TableRow>
                              {renderGroup("Sub services", subServices, "pl-2 font-semibold text-primary")}
                              {renderGroup("Addons", addons, "pl-2 font-semibold text-primary")}
                              {renderGroup("Other", other, "pl-2 font-semibold text-primary")}
                              {discounts.length > 0 && (
                                <>
                                  <TableRow>
                                    <TableCell colSpan={4} className="pl-2 font-semibold text-primary">
                                      Discounts
                                    </TableCell>
                                  </TableRow>
                                  {discounts.map((item, idx) => (
                                    <TableRow key={`discount-${idx}`}>
                                      <TableCell>
                                        <div className="font-medium text-foreground">{item.description}</div>
                                      </TableCell>
                                      <TableCell className="text-muted-foreground">{item.quantity}</TableCell>
                                      <TableCell className="text-muted-foreground">
                                        {formatCurrency(item.unitPrice, viewClientInvoice.currency || "USD")}
                                      </TableCell>
                                      <TableCell className="text-right font-medium">
                                        {formatCurrency(item.total, viewClientInvoice.currency || "USD")}
                                      </TableCell>
                                    </TableRow>
                                  ))}
                                  <TableRow>
                                    <TableCell colSpan={3} className="text-right text-muted-foreground">
                                      Total discount
                                    </TableCell>
                                    <TableCell className="text-right font-semibold">
                                      -{formatCurrency(discountTotal, viewClientInvoice.currency || "USD")}
                                    </TableCell>
                                  </TableRow>
                                </>
                              )}
                            </TableBody>
                          </Table>
                        );
                      })()}
                    </div>

                    <div className="px-4 py-4 border-t bg-background/50">
                      <div className="flex justify-end">
                        <div className="w-full sm:w-72 space-y-2 text-sm">
                          {(() => {
                            const items = viewClientInvoice.items || [];
                            const tax = Number(viewClientInvoice.taxAmount) || 0;
                            const discount = Math.abs(
                              items.reduce((sum, i) => {
                                const t = Number((i as any).total) || 0;
                                const desc = String((i as any).description || "").toLowerCase();
                                return sum + (t < 0 || desc.startsWith("discount") ? t : 0);
                              }, 0)
                            );
                            const grossSubtotal = items.reduce((sum, i) => {
                              const t = Number((i as any).total) || 0;
                              const desc = String((i as any).description || "").toLowerCase();
                              const isDiscount = t < 0 || desc.startsWith("discount");
                              return sum + (isDiscount ? 0 : Math.max(0, t));
                            }, 0);
                            const subtotal = Math.max(0, grossSubtotal - discount);
                            const total = Math.max(0, subtotal + tax);
                            return (
                              <>
                                <div className="flex justify-between text-muted-foreground">
                                  <span>Gross Subtotal</span>
                                  <span className="text-foreground">
                                    {formatCurrency(grossSubtotal, viewClientInvoice.currency || "USD")}
                                  </span>
                                </div>
                                <div className="flex justify-between text-muted-foreground">
                                  <span>Tax</span>
                                  <span className="text-foreground">
                                    {formatCurrency(tax, viewClientInvoice.currency || "USD")}
                                  </span>
                                </div>
                                {discount > 0 && (
                                  <div className="flex justify-between text-muted-foreground">
                                    <span>Total discount</span>
                                    <span className="text-foreground">
                                      -{formatCurrency(discount, viewClientInvoice.currency || "USD")}
                                    </span>
                                  </div>
                                )}
                                <div className="pt-2 border-t flex justify-between font-semibold">
                                  <span>Total</span>
                                  <span>{formatCurrency(total, viewClientInvoice.currency || "USD")}</span>
                                </div>
                                <div className="pt-2 flex justify-between text-xs text-muted-foreground">
                                  <span>Amount due</span>
                                  <span className="text-foreground font-medium">
                                    {formatCurrency(total, viewClientInvoice.currency || "USD")}
                                  </span>
                                </div>
                              </>
                            );
                          })()}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {viewClientInvoice.status !== "paid" ? (
                      <div className="rounded-xl border bg-muted/20 p-4">
                        <div className="text-sm font-semibold">Thank you for the business!</div>
                        <div className="mt-1 text-xs text-muted-foreground">
                          Please pay within 15 days of receiving this invoice.
                        </div>
                      </div>
                    ) : (
                      <div className="rounded-xl border bg-muted/20 p-4">
                        <div className="text-sm font-semibold">Payment received</div>
                        <div className="mt-1 text-xs text-muted-foreground">This invoice is marked as paid.</div>
                      </div>
                    )}
                    <div className="rounded-xl border bg-muted/20 p-4">
                      <div className="text-sm font-semibold">Bank details</div>
                      <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                        <div className="text-muted-foreground">Bank details</div>
                        <div className="text-foreground">ABCD BANK</div>
                        <div className="text-muted-foreground">IFSC code</div>
                        <div className="text-foreground">ABCD000XXXX</div>
                        <div className="text-muted-foreground">Swift code</div>
                        <div className="text-foreground">ABCDUSBBXXX</div>
                        <div className="text-muted-foreground">Account #</div>
                        <div className="text-foreground">37474892300011</div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="border-t bg-muted/10 px-5 sm:px-7 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div className="flex items-center gap-2">
                    {company?.logo ? (
                      <img
                        src={company.logo}
                        alt={company?.name || "Company logo"}
                        className="h-7 w-7 rounded-full object-cover border"
                      />
                    ) : (
                      <div className="h-7 w-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-semibold">
                        {(company?.name || "Company").slice(0, 2).toUpperCase()}
                      </div>
                    )}
                    <div className="text-sm font-semibold text-foreground">{company?.name || "Company"}</div>
                  </div>
                  <div className="text-xs text-muted-foreground flex flex-wrap gap-x-4 gap-y-1">
                    {company?.phone ? <span>{company.phone}</span> : <span>+0 (000) 123-4567</span>}
                    {company?.email ? <span>{company.email}</span> : <span>support@company.com</span>}
                  </div>
                </div>
              </div>
            </div>
          )}

          {viewClientInvoice && (
            <SheetFooter className="p-4 border-t bg-muted/30 flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={handleDownloadClientInvoicePdf}
                disabled={downloadingClientInvoicePdf}
              >
                {downloadingClientInvoicePdf ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Download className="mr-2 h-4 w-4" />
                )}
                {downloadingClientInvoicePdf ? "Generating..." : "Download"}
              </Button>
            </SheetFooter>
          )}
        </SheetContent>
      </Sheet>

      <Sheet open={addCardSheetOpen} onOpenChange={setAddCardSheetOpen}>
        <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-md">
          <SheetHeader>
            <div className="flex items-center justify-between">
              <SheetTitle>New card details</SheetTitle>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                onClick={() => setAddCardSheetOpen(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </SheetHeader>

          <div className="space-y-3 px-4 text-xs text-foreground">
            <div className="space-y-1">
              <Label>Card number</Label>
              <Input
                type="text"
                inputMode="numeric"
                placeholder="1234 5678 9012 3456"
                maxLength={19}
                value={newCard.number}
                onChange={(e) => {
                  const digits = e.target.value.replace(/\D/g, "").slice(0, 16);
                  const groups = digits.match(/.{1,4}/g) || [];
                  setNewCard((prev) => ({ ...prev, number: groups.join(" ") }));
                }}
              />
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <Label>Exp. date</Label>
                <Input
                  type="text"
                  placeholder="MM/YY"
                  maxLength={5}
                  value={newCard.exp}
                  onChange={(e) => {
                    let value = e.target.value.replace(/[^\d/]/g, "");
                    if (value.length === 1 && Number(value) > 1) value = `0${value}`;
                    if (value.length === 2 && !value.includes("/")) value = `${value}/`;
                    if (value.length > 5) value = value.slice(0, 5);
                    setNewCard((prev) => ({ ...prev, exp: value }));
                  }}
                />
              </div>
              <div className="space-y-1">
                <Label>CVV</Label>
                <Input
                  type="password"
                  placeholder="CVV"
                  maxLength={3}
                  value={newCard.cvv}
                  onChange={(e) => {
                    const digits = e.target.value.replace(/\D/g, "").slice(0, 3);
                    setNewCard((prev) => ({ ...prev, cvv: digits }));
                  }}
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label>Full name</Label>
              <Input
                type="text"
                placeholder="Name on card"
                value={newCard.name}
                onChange={(e) =>
                  setNewCard((prev) => ({ ...prev, name: e.target.value }))
                }
              />
            </div>
          </div>

          <SheetFooter className="mt-5 flex-row justify-end gap-3">
            <Button
              type="button"
              variant="destructive"
              onClick={() => setAddCardSheetOpen(false)}
            >
              Cancel
            </Button>
            <Button type="button" onClick={handleAddCard} disabled={savingCard}>
              {savingCard ? "Saving..." : "Save"}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <AlertDialog open={deleteCardDialogOpen} onOpenChange={setDeleteCardDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Card</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this card?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deletingCard}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                void handleConfirmDeleteCard();
              }}
              disabled={deletingCard}
            >
              {deletingCard ? "Deleting..." : "Confirm"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
