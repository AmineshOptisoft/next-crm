"use client";

import { useState, useEffect, useRef, useMemo, memo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Script from "next/script";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CompanySubscription } from "@/components/company-settings/company-subscription";
import { CompanyPreferences } from "@/components/company-settings/company-preferences";
import { CompanyPayments } from "@/components/company-settings/company-payments";
import { CompanyPromocodes } from "@/components/company-settings/company-promocodes";
import { CompanyServiceAreas } from "@/components/company-settings/company-service-areas";
import { CompanyZipCodes } from "@/components/company-settings/company-zip-codes";
import { CompanyAvailability } from "@/components/company-settings/company-availability";
import { CompanyMailSending } from "@/components/company-settings/company-mail-sending";
import { CompanySubdomainSettings } from "@/components/company-settings/company-subdomain-settings";
import { Company } from "@/components/company-settings/types";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Building2, Save, Upload, MapPin, X, Loader2, Check, ChevronsUpDown } from "lucide-react";
import useSWR from "swr";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

// ─── Lazy-load country-state-city & VirtualGeoSelect (same as bookings) ───────
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
            const withinWindow = now - lastTypeTime < 700;
            const nextPrefix = (withinWindow ? typeAhead + key : key).toLowerCase();
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
import { log } from "console";

const fetcher = (url: string) =>
    fetch(url, { credentials: "include" }).then((res) => res.json());

const toCompanySubdomain = (name: string) => {
    const normalized = (name || "")
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9\s-]/g, "")
        .replace(/\s+/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-+|-+$/g, "");

    if (!normalized) return "";
    if (normalized.length >= 3) return normalized.slice(0, 50);
    return normalized.padEnd(3, normalized[normalized.length - 1] || "x").slice(0, 50);
};

interface CompanyProfileProps {
    formData: any;
    setFormData: (data: any) => void;
    saving: boolean;
    handleSubmit: (e: React.FormEvent) => void;
    industries: Array<{ _id: string; name: string }>;
    selectedLogo: File | null;
    setSelectedLogo: (file: File | null) => void;
    isActiveTab: boolean;
}

declare const google: any;

function CompanyProfile({
    formData,
    setFormData,
    saving,
    handleSubmit,
    industries,
    selectedLogo,
    setSelectedLogo,
    isActiveTab,
}: CompanyProfileProps) {
    const [errors, setErrors] = useState<Record<string, string | undefined>>({});
    const [locationQuery, setLocationQuery] = useState("");
    const [isLocationManuallyCleared, setIsLocationManuallyCleared] = useState(false);

    const clearError = (key: string) => {
        setErrors((prev) => (prev[key] ? { ...prev, [key]: undefined } : prev));
    };

    const setError = (key: string, message: string) => {
        setErrors((prev) => ({ ...prev, [key]: message }));
    };

    const isValidEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

    const isValidUrl = (value: string) => {
        try {
            const url = new URL(value);
            return url.protocol === "http:" || url.protocol === "https:";
        } catch {
            return false;
        }
    };

    const validate = () => {
        const next: Record<string, string> = {};

        const name = (formData?.name ?? "").trim();
        if (!name) next["name"] = "Company name is required.";
        else if (name.length < 2) next["name"] = "Company name must be at least 2 characters.";

        const email = (formData?.email ?? "").trim();
        if (!email) next["email"] = "Email is required.";
        else if (!isValidEmail(email)) next["email"] = "Enter a valid email address.";

        const phone = (formData?.phone ?? "").trim();
        if (!phone) next["phone"] = "Phone is required.";
        else {
            const digits = phone.replace(/\D/g, "");
            if (digits.length < 7) next["phone"] = "Enter a valid phone number.";
            else if (digits.length > 10) next["phone"] = "Phone number cannot be more than 10 digits.";
        }

        const website = (formData?.website ?? "").trim();
        if (website && !isValidUrl(website)) next["website"] = "Enter a valid URL (must start with http:// or https://).";

        const street = (formData?.address?.street ?? "").trim();
        if (!street) next["address.street"] = "Street is required.";

        const country = (formData?.address?.country ?? "").trim();
        if (!country) next["address.country"] = "Country is required.";

        const state = (formData?.address?.state ?? "").trim();
        if (!state) next["address.state"] = "State is required.";

        const city = (formData?.address?.city ?? "").trim();
        if (!city) next["address.city"] = "City is required.";

        const zipCode = (formData?.address?.zipCode ?? "").trim();
        if (!zipCode) next["address.zipCode"] = "Zip code is required.";

        const latitude = formData?.address?.latitude;
        const longitude = formData?.address?.longitude;
        if (
            latitude === undefined ||
            latitude === null ||
            longitude === undefined ||
            longitude === null ||
            latitude === "" ||
            longitude === ""
        ) {
            next["address.location"] = "Select location in the map.";
        }

        const hasLogo = Boolean((formData?.logo ?? "").trim()) || Boolean(selectedLogo);
        if (!hasLogo) next["logo"] = "Company logo is required.";

        return next;
    };

    const fieldIdByErrorKey: Record<string, string> = {
        logo: "logo",
        name: "name",
        industry: "industry",
        website: "website",
        email: "email",
        phone: "phone",
        "address.street": "street",
        "address.country": "country",
        "address.state": "state",
        "address.city": "city",
        "address.zipCode": "zipCode",
        "address.location": "latitude",
    };

    const onSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const next = validate();
        setErrors(next);

        const firstKey = Object.keys(next)[0];
        if (firstKey) {
            const fieldId = fieldIdByErrorKey[firstKey] ?? firstKey;
            const el = document.getElementById(fieldId) as HTMLElement | null;
            el?.focus?.();
            return;
        }

        handleSubmit(e);
    };

    // Google Maps initialization
    const mapRef = useRef<HTMLDivElement>(null);
    const locationInputRef = useRef<HTMLInputElement>(null);
    const mapInstanceRef = useRef<any | null>(null);
    const markerRef = useRef<any | null>(null);
    const geocoderRef = useRef<any | null>(null);
    const autocompleteRef = useRef<any | null>(null);
    const [isMapReady, setIsMapReady] = useState(false);
    const hasSelectedLocation = useMemo(() => {
        const lat = formData?.address?.latitude;
        const lng = formData?.address?.longitude;
        return typeof lat === "number" && typeof lng === "number";
    }, [formData?.address?.latitude, formData?.address?.longitude]);

    const extractAddressParts = (components: any[] = []) => {
        const getPart = (types: string[]) =>
            components.find((c: any) => types.some((t) => c.types?.includes(t)))?.long_name || "";

        return {
            streetNumber: getPart(["street_number"]),
            route: getPart(["route"]),
            city: getPart(["locality", "postal_town", "administrative_area_level_3"]),
            state: getPart(["administrative_area_level_1"]),
            country: getPart(["country"]),
            zipCode: getPart(["postal_code"]),
        };
    };

    const setAddressFromLatLng = (lat: number, lng: number) => {
        if (!geocoderRef.current) return;
        geocoderRef.current.geocode(
            { location: { lat, lng } },
            (results: any[], status: string) => {
                if (status !== "OK" || !results?.[0]) return;
                const topResult = results[0];
                const parts = extractAddressParts(topResult.address_components || []);
                const street = [parts.streetNumber, parts.route].filter(Boolean).join(" ").trim();

                setLocationQuery(topResult.formatted_address || "");
                setIsLocationManuallyCleared(false);
                setFormData((prev: any) => ({
                    ...prev,
                    address: {
                        ...prev.address,
                        street: street || prev.address.street || "",
                        country: parts.country || prev.address.country || "",
                        state: parts.state || prev.address.state || "",
                        city: parts.city || prev.address.city || "",
                        zipCode: parts.zipCode || prev.address.zipCode || "",
                    },
                }));
                clearError("address.street");
                clearError("address.country");
                clearError("address.state");
                clearError("address.city");
                clearError("address.zipCode");
            }
        );
    };

    // Initialize map function
    const initMap = () => {
        if (!mapRef.current || mapInstanceRef.current) return;

        const defaultLat = formData.address.latitude || 19.0760;
        const defaultLng = formData.address.longitude || 72.8777;

        try {
            const map = new google.maps.Map(mapRef.current, {
                center: { lat: defaultLat, lng: defaultLng },
                zoom: 13,
                mapTypeControl: true,
                streetViewControl: false,
                fullscreenControl: true,
            });

            mapInstanceRef.current = map;
            geocoderRef.current = new google.maps.Geocoder();

            if (formData.address.latitude && formData.address.longitude) {
                markerRef.current = new google.maps.Marker({
                    position: { lat: formData.address.latitude, lng: formData.address.longitude },
                    map: map,
                    draggable: false,
                });
            }

            map.addListener("click", (e: any) => {
                if (e.latLng) {
                    const lat = e.latLng.lat();
                    const lng = e.latLng.lng();

                    setFormData((prev: any) => ({
                        ...prev,
                        address: {
                            ...prev.address,
                            latitude: lat,
                            longitude: lng,
                        },
                    }));

                    clearError("address.location");

                    if (markerRef.current) {
                        markerRef.current.setPosition(e.latLng);
                    } else {
                        markerRef.current = new google.maps.Marker({
                            position: e.latLng,
                            map: map,
                            draggable: false,
                        });
                    }

                    setAddressFromLatLng(lat, lng);
                }
            });

            if (locationInputRef.current) {
                autocompleteRef.current = new google.maps.places.Autocomplete(locationInputRef.current, {
                    fields: ["address_components", "formatted_address", "geometry"],
                });

                autocompleteRef.current.addListener("place_changed", () => {
                    const place = autocompleteRef.current?.getPlace?.();
                    const placeLocation = place?.geometry?.location;

                    if (!place || !placeLocation) {
                        setError("address.location", "Please select a valid location.");
                        return;
                    }

                    const lat = placeLocation.lat();
                    const lng = placeLocation.lng();
                    const nextPosition = { lat, lng };

                    setLocationQuery(place.formatted_address || locationInputRef.current?.value || "");
                    setIsLocationManuallyCleared(false);
                    setFormData((prev: any) => ({
                        ...prev,
                        address: {
                            ...prev.address,
                            latitude: lat,
                            longitude: lng,
                        },
                    }));

                    clearError("address.location");

                    if (markerRef.current) {
                        markerRef.current.setPosition(nextPosition);
                    } else {
                        markerRef.current = new google.maps.Marker({
                            position: nextPosition,
                            map,
                            draggable: false,
                        });
                    }

                    map.setCenter(nextPosition);
                    map.setZoom(15);

                    const parts = extractAddressParts(place.address_components || []);
                    const street = [parts.streetNumber, parts.route].filter(Boolean).join(" ").trim();
                    setFormData((prev: any) => ({
                        ...prev,
                        address: {
                            ...prev.address,
                            street: street || prev.address.street || "",
                            country: parts.country || prev.address.country || "",
                            state: parts.state || prev.address.state || "",
                            city: parts.city || prev.address.city || "",
                            zipCode: parts.zipCode || prev.address.zipCode || "",
                        },
                    }));
                    clearError("address.street");
                    clearError("address.country");
                    clearError("address.state");
                    clearError("address.city");
                    clearError("address.zipCode");
                });
            }
        } catch (error) {
            console.error("Error initializing map:", error);
        }
    };

    useEffect(() => {
        if (isMapReady) {
            initMap();
        }
    }, [isMapReady]);

    // Ensure map initializes even when script is already loaded before onLoad fires.
    useEffect(() => {
        if (!isActiveTab) return;
        if (typeof window === "undefined") return;
        if ((window as any).google?.maps && !isMapReady) {
            setIsMapReady(true);
        }
    }, [isActiveTab, isMapReady]);

    useEffect(() => {
        if (mapInstanceRef.current && formData.address.latitude && formData.address.longitude) {
            const position = {
                lat: formData.address.latitude,
                lng: formData.address.longitude,
            };

            if (markerRef.current) {
                markerRef.current.setPosition(position);
            } else {
                markerRef.current = new google.maps.Marker({
                    position: position,
                    map: mapInstanceRef.current,
                });
            }

            mapInstanceRef.current.setCenter(position);
        }
    }, [formData.address.latitude, formData.address.longitude]);

    // Tabs can hide the map container; force resize/recenter when profile tab becomes active.
    useEffect(() => {
        if (!isActiveTab || !mapInstanceRef.current) return;

        const map = mapInstanceRef.current;
        const lat = formData.address.latitude;
        const lng = formData.address.longitude;
        const center =
            typeof lat === "number" && typeof lng === "number"
                ? { lat, lng }
                : { lat: 19.076, lng: 72.8777 };

        const timeout = setTimeout(() => {
            try {
                if ((window as any).google?.maps?.event) {
                    (window as any).google.maps.event.trigger(map, "resize");
                }
                map.setCenter(center);
            } catch (error) {
                console.error("Error resizing map on tab activation:", error);
            }
        }, 100);

        return () => clearTimeout(timeout);
    }, [isActiveTab, formData.address.latitude, formData.address.longitude]);

    const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            if (file.size > 5 * 1024 * 1024) {
                setError("logo", "File size must be less than 5MB.");
                return;
            }
            setSelectedLogo(file);
            setFormData({ ...formData, logo: URL.createObjectURL(file) });
            clearError("logo");
        }
    };

    const handleRemoveLogo = () => {
        setSelectedLogo(null);
        setFormData({ ...formData, logo: "" });
        setError("logo", "Company logo is required.");
    };

    // Cascading Location Logic using lazy-loaded geo library (same behaviour as bookings)
    const [geoLib, setGeoLib] = useState<any>(null);
    useEffect(() => {
        loadGeo().then(setGeoLib);
    }, []);

    const savedCountry = (formData?.address?.country ?? "").trim();
    const savedState = (formData?.address?.state ?? "").trim();
    const savedCity = (formData?.address?.city ?? "").trim();
    const rawIndustry = (formData?.industry ?? "").trim();
    const normalizedRawIndustry = rawIndustry.toLowerCase();
    const matchedIndustry = industries.find(
        (industry) =>
            industry._id === rawIndustry ||
            industry._id.toLowerCase() === normalizedRawIndustry ||
            industry.name.trim().toLowerCase() === normalizedRawIndustry
    );
    const industrySelectValue = matchedIndustry?.name || (rawIndustry ? rawIndustry : "none");
    const hasStoredIndustryNotInList = Boolean(rawIndustry) && !matchedIndustry;

    useEffect(() => {
        if (hasSelectedLocation && !locationQuery && !isLocationManuallyCleared) {
            const fallback = [savedCity, savedState, savedCountry].filter(Boolean).join(", ");
            setLocationQuery(fallback);
        }
    }, [hasSelectedLocation, locationQuery, isLocationManuallyCleared, savedCity, savedState, savedCountry]);

    const countryOptions = useMemo(() => {
        if (!geoLib) return [];
        const list = geoLib.Country.getAllCountries().map((c: any) => ({
            label: c.name,
            value: c.name,
            isoCode: c.isoCode,
        }));
        if (savedCountry && !list.some((c: any) => c.value === savedCountry)) {
            list.unshift({ label: savedCountry, value: savedCountry, isoCode: "" });
        }
        return list;
    }, [geoLib, savedCountry]);

    const countryCode = useMemo(
        () => countryOptions.find((c: any) => c.value === savedCountry)?.isoCode ?? "",
        [countryOptions, savedCountry]
    );

    const stateOptions = useMemo(() => {
        if (!geoLib || !countryCode) return [];
        const base = geoLib.State.getStatesOfCountry(countryCode).map((s: any) => ({
            label: s.name,
            value: s.name,
            isoCode: s.isoCode,
        }));
        if (savedState && !base.some((s: any) => s.value === savedState)) {
            base.unshift({ label: savedState, value: savedState, isoCode: "" });
        }
        return base;
    }, [geoLib, countryCode, savedState]);

    const stateCode = useMemo(
        () => stateOptions.find((s: any) => s.value === savedState)?.isoCode ?? "",
        [stateOptions, savedState]
    );

    const cityOptions = useMemo(() => {
        let list: { label: string; value: string }[] = [];
        if (geoLib && countryCode && stateCode) {
            list = geoLib.City.getCitiesOfState(countryCode, stateCode).map((c: any) => ({
                label: c.name,
                value: c.name,
            }));
        }
        if (savedCity && !list.some((c) => c.value === savedCity)) {
            list = [{ label: savedCity, value: savedCity }, ...list];
        }
        return list;
    }, [geoLib, countryCode, stateCode, savedCity]);

    return (
        <form onSubmit={onSubmit} noValidate>
            <Script
                src="https://maps.googleapis.com/maps/api/js?key=AIzaSyAQODjSc_eWcBWoIdk7trMzl98oRHF9HFs&libraries=places"
                onLoad={() => {
                    setIsMapReady(true);
                }}
                onReady={() => {
                    setIsMapReady(true);
                }}
                onError={() => {
                    console.error("Error loading Google Maps script");
                }}
                strategy="afterInteractive"
            />
            <Card className="py-4">
                <CardHeader>
                    <CardTitle>Company Profile</CardTitle>
                    <CardDescription>
                        Update your company information
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="space-y-4">
                        <h3 className="font-semibold">Company Logo</h3>
                        <div className="flex items-center gap-6">
                            {formData.logo ? (
                                <div className="relative">
                                    <img
                                        src={formData.logo}
                                        alt="Company Logo"
                                        className="h-24 w-24 rounded-lg object-cover border-2 border-gray-200"
                                    />
                                    <button
                                        type="button"
                                        onClick={handleRemoveLogo}
                                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                                    >
                                        <X className="h-4 w-4" />
                                    </button>
                                </div>
                            ) : (
                                <div className="h-24 w-24 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center bg-gray-50">
                                    <Building2 className="h-8 w-8 text-gray-400" />
                                </div>
                            )}
                            <div className="flex-1">
                                <Label htmlFor="logo">Upload Company Logo *</Label>
                                <p className="text-sm text-muted-foreground mb-2">
                                    PNG, JPG up to 5MB
                                </p>
                                <Input
                                    id="logo"
                                    type="file"
                                    accept="image/png,image/jpeg,image/jpg"
                                    onChange={handleLogoUpload}
                                    className="cursor-pointer"
                                    aria-invalid={Boolean(errors.logo)}
                                    aria-describedby={errors.logo ? "logo-error" : undefined}
                                />
                                {errors.logo && (
                                    <p id="logo-error" className="text-destructive text-sm mt-1">
                                        {errors.logo}
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                            <Label htmlFor="name">Company Name *</Label>
                            <Input
                                id="name"
                                value={formData.name}
                                onChange={(e) =>
                                    (setFormData({ ...formData, name: e.target.value }), clearError("name"))
                                }
                                aria-invalid={Boolean(errors.name)}
                                aria-describedby={errors.name ? "name-error" : undefined}
                            />
                            {errors.name && (
                                <p id="name-error" className="text-destructive text-sm">
                                    {errors.name}
                                </p>
                            )}
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="industry">Industry</Label>
                            <Select
                                value={industrySelectValue}
                                onValueChange={(value) => {
                                    setFormData({
                                        ...formData,
                                        industry: value === "none" ? "" : value,
                                    });
                                    clearError("industry");
                                }}
                            >
                                <SelectTrigger
                                    id="industry"
                                    className="w-full"
                                    aria-invalid={Boolean(errors.industry)}
                                    aria-describedby={errors.industry ? "industry-error" : undefined}
                                >
                                    <SelectValue placeholder="Select an industry" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="none">No Industry</SelectItem>
                                    {hasStoredIndustryNotInList && (
                                        <SelectItem value={rawIndustry}>{rawIndustry}</SelectItem>
                                    )}
                                    {industries.map((industry) => (
                                        <SelectItem key={industry._id} value={industry.name}>
                                            {industry.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            {errors.industry && (
                                <p id="industry-error" className="text-destructive text-sm">
                                    {errors.industry}
                                </p>
                            )}
                            {industries.length === 0 && (
                                <p className="text-xs text-muted-foreground">
                                    No industries found. Add some in Administration → Industries.
                                </p>
                            )}
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="description">Description</Label>
                        <Textarea
                            id="description"
                            value={formData.description}
                            onChange={(e) =>
                                setFormData({ ...formData, description: e.target.value })
                            }
                            placeholder="Brief description of your company"
                            rows={3}
                        />
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                            <Label htmlFor="website">Website</Label>
                            <Input
                                id="website"
                                type="url"
                                value={formData.website}
                                onChange={(e) =>
                                    (setFormData({ ...formData, website: e.target.value }), clearError("website"))
                                }
                                placeholder="https://example.com"
                                aria-invalid={Boolean(errors.website)}
                                aria-describedby={errors.website ? "website-error" : undefined}
                            />
                            {errors.website && (
                                <p id="website-error" className="text-destructive text-sm">
                                    {errors.website}
                                </p>
                            )}
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="email">Email *</Label>
                            <Input
                                id="email"
                                type="email"
                                value={formData.email}
                                onChange={(e) =>
                                    (setFormData({ ...formData, email: e.target.value }), clearError("email"))
                                }
                                placeholder="contact@company.com"
                                aria-invalid={Boolean(errors.email)}
                                aria-describedby={errors.email ? "email-error" : undefined}
                            />
                            {errors.email && (
                                <p id="email-error" className="text-destructive text-sm">
                                    {errors.email}
                                </p>
                            )}
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="phone">Phone *</Label>
                        <Input
                            id="phone"
                            type="tel"
                            value={formData.phone}
                            onChange={(e) =>
                                (setFormData({ ...formData, phone: e.target.value }), clearError("phone"))
                            }
                            placeholder="1234567890"
                            aria-invalid={Boolean(errors.phone)}
                            aria-describedby={errors.phone ? "phone-error" : undefined}
                        />
                        {errors.phone && (
                            <p id="phone-error" className="text-destructive text-sm">
                                {errors.phone}
                            </p>
                        )}
                    </div>

                    <div className="space-y-4">
                        <h3 className="font-semibold">Address</h3>
                        
                        <div className="grid gap-4 md:grid-cols-1">
                            

                        <div className="space-y-4">
                            <div className="flex items-center gap-2">
                                <MapPin className="h-5 w-5 text-primary" />
                                <h4 className="font-semibold">Location on Map</h4>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="selectLocation">Select Location *</Label>
                                <div className="flex items-center gap-2">
                                    <Input
                                        id="selectLocation"
                                        ref={locationInputRef}
                                        value={locationQuery}
                                        onChange={(e) => {
                                            const value = e.target.value;
                                            setLocationQuery(value);
                                            if (value.trim() === "") {
                                                setIsLocationManuallyCleared(true);
                                            } else {
                                                setIsLocationManuallyCleared(false);
                                            }
                                        }}
                                        placeholder="Search and select your location"
                                        aria-invalid={Boolean(errors["address.location"])}
                                        aria-describedby={errors["address.location"] ? "location-error" : undefined}
                                    />
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() => {
                                            setLocationQuery("");
                                            setIsLocationManuallyCleared(true);
                                        }}
                                        disabled={!locationQuery}
                                    >
                                        Clear
                                    </Button>
                                </div>
                            </div>
                            <p className="text-sm text-muted-foreground">
                                Search above or click on the map to select your company location
                            </p>
                            {errors["address.location"] && (
                                <p id="location-error" className="text-destructive text-sm">
                                    {errors["address.location"]}
                                </p>
                            )}
                            <div
                                ref={mapRef}
                                className="w-full h-[400px] rounded-lg border-2 border-gray-200"
                                style={{ minHeight: "400px" }}
                            />
                            {hasSelectedLocation && (
                                <div className="space-y-2">
                                    <Label htmlFor="addressInstructions">Current Address (Instructions)</Label>
                                    <Textarea
                                        id="addressInstructions"
                                        value={formData.address.addressInstructions || ""}
                                        onChange={(e) =>
                                            setFormData({
                                                ...formData,
                                                address: {
                                                    ...formData.address,
                                                    addressInstructions: e.target.value,
                                                },
                                            })
                                        }
                                        placeholder="e.g. Building name, floor, landmark, unit number"
                                        rows={2}
                                    />
                                </div>
                            )}
                        </div>

                        {hasSelectedLocation && (
                        <div className="grid md:grid-cols-2 gap-4">
                        <div className="space-y-2 col-span-2">
                            <Label htmlFor="street">Street *</Label>
                            <Textarea
                                id="street"
                                value={formData.address.street}
                                onChange={(e) =>
                                    (setFormData({
                                        ...formData,
                                        address: { ...formData.address, street: e.target.value },
                                    }), clearError("address.street"))
                                }
                                aria-invalid={Boolean(errors["address.street"])}
                                aria-describedby={errors["address.street"] ? "street-error" : undefined}
                            />
                            {errors["address.street"] && (
                                <p id="street-error" className="text-destructive text-sm">
                                    {errors["address.street"]}
                                </p>
                            )}
                        </div>

                        <div className="space-y-2">
                                <Label htmlFor="country">Country *</Label>
                                <VirtualGeoSelect
                                    id="country"
                                    value={savedCountry}
                                    options={countryOptions}
                                    placeholder="Select Country"
                                    disabled={!geoLib}
                                    onChange={(val) => {
                                        setFormData({
                                            ...formData,
                                            address: {
                                                ...formData.address,
                                                country: val,
                                                state: "",
                                                city: "",
                                            },
                                        });
                                        clearError("address.country");
                                        clearError("address.state");
                                        clearError("address.city");
                                    }}
                                />
                                {errors["address.country"] && (
                                    <p id="country-error" className="text-destructive text-sm">
                                        {errors["address.country"]}
                                    </p>
                                )}
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="state">State *</Label>
                                <VirtualGeoSelect
                                    id="state"
                                    value={savedState}
                                    options={stateOptions}
                                    placeholder="Select State"
                                    disabled={!geoLib || !savedCountry}
                                    onChange={(val) => {
                                        setFormData({
                                            ...formData,
                                            address: {
                                                ...formData.address,
                                                state: val,
                                                city: "",
                                            },
                                        });
                                        clearError("address.state");
                                        clearError("address.city");
                                    }}
                                />
                                {errors["address.state"] && (
                                    <p id="state-error" className="text-destructive text-sm">
                                        {errors["address.state"]}
                                    </p>
                                )}
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="city">City *</Label>
                                <VirtualGeoSelect
                                    id="city"
                                    value={savedCity}
                                    options={cityOptions}
                                    placeholder="Select City"
                                    disabled={!geoLib || !savedState}
                                    onChange={(val) =>
                                        (setFormData({
                                            ...formData,
                                            address: {
                                                ...formData.address,
                                                city: val.trim(),
                                            },
                                        }), clearError("address.city"))
                                    }
                                />
                                {errors["address.city"] && (
                                    <p id="city-error" className="text-destructive text-sm">
                                        {errors["address.city"]}
                                    </p>
                                )}
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="zipCode">Zip Code *</Label>
                                <Input
                                    id="zipCode"
                                    value={formData.address.zipCode}
                                    onChange={(e) =>
                                        (setFormData({
                                            ...formData,
                                            address: { ...formData.address, zipCode: e.target.value },
                                        }), clearError("address.zipCode"))
                                    }
                                    aria-invalid={Boolean(errors["address.zipCode"])}
                                    aria-describedby={errors["address.zipCode"] ? "zipCode-error" : undefined}
                                />
                                {errors["address.zipCode"] && (
                                    <p id="zipCode-error" className="text-destructive text-sm">
                                        {errors["address.zipCode"]}
                                    </p>
                                )}
                            </div>
                        </div>
                        )}
                        </div>

                        <div style={{ display: "none" }} className="hidden md:grid gap-4 md:grid-cols-2">
                            <div className="space-y-2">
                                <Label htmlFor="latitude">Latitude</Label>
                                <Input
                                    id="latitude"
                                    type="number"
                                    step="any"
                                    value={formData.address.latitude || ""}
                                    readOnly
                                    placeholder="Click on map to set"
                                    className="bg-gray-50"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="longitude">Longitude</Label>
                                <Input
                                    id="longitude"
                                    type="number"
                                    step="any"
                                    value={formData.address.longitude || ""}
                                    readOnly
                                    placeholder="Click on map to set"
                                    className="bg-gray-50"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-end">
                        <Button type="submit" disabled={saving}>
                            {saving ? (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                                <Save className="mr-2 h-4 w-4" />
                            )}
                            {saving ? "Saving..." : "Save Changes"}
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </form>
    );
}


export default function CompanySettingsPage() {
    const searchParams = useSearchParams();
    const allowedTabs = new Set([
        "profile",
        "subscription",
        "preferences",
        "availability",
        "payments",
        "promocodes",
        "service-areas",
        "zip-codes",
        "mail-sending",
        "subdomain",
    ]);
    const requestedTab = searchParams.get("tab");
    const initialTab =
        requestedTab && allowedTabs.has(requestedTab) ? requestedTab : "profile";
    const [activeTab, setActiveTab] = useState(initialTab);

    useEffect(() => {
        if (requestedTab && allowedTabs.has(requestedTab)) {
            setActiveTab(requestedTab);
        }
    }, [requestedTab]);
    const router = useRouter();
    const [saving, setSaving] = useState(false);
    const [isRedirectDialogOpen, setIsRedirectDialogOpen] = useState(false);
    const [selectedLogo, setSelectedLogo] = useState<File | null>(null);

    // SWR for company settings – shared cache with layout / sidebar
    const { data: company, isLoading: loadingSettings, mutate: mutateSettings } = useSWR<Company>(
        "/api/company/settings",
        fetcher,
        { revalidateOnFocus: false }
    );

    // SWR for industries list – rarely changes, cache for 5 min
    const { data: industriesData } = useSWR<Array<{ _id: string; name: string }>>(
        "/api/industries",
        fetcher,
        { revalidateOnFocus: false, dedupingInterval: 300_000 }
    );

    const industries = industriesData || [];

    const [formData, setFormData] = useState({
        name: "",
        description: "",
        industry: "",
        website: "",
        email: "",
        phone: "",
        logo: "",
        subdomain: "",
        publicTemplate: "templateA",
        address: {
            street: "",
            city: "",
            state: "",
            country: "",
            zipCode: "",
            addressInstructions: "",
            latitude: undefined as number | undefined,
            longitude: undefined as number | undefined,
        },
        settings: {
            timezone: "UTC",
            currency: "USD",
        },
    });

    // Sync formData when SWR fetches company (preserve non-empty existing address fields)
    useEffect(() => {
        if (!company) return;

        setFormData((prev) => {
            const apiAddress = (company as any).address || {};

            const mergedAddress = {
                street: apiAddress.street ?? prev.address.street ?? "",
                city: apiAddress.city ?? prev.address.city ?? "",
                state: apiAddress.state ?? prev.address.state ?? "",
                country: apiAddress.country ?? prev.address.country ?? "",
                zipCode: apiAddress.zipCode ?? prev.address.zipCode ?? "",
                addressInstructions:
                    apiAddress.addressInstructions ?? prev.address.addressInstructions ?? "",
                latitude: apiAddress.latitude ?? prev.address.latitude,
                longitude: apiAddress.longitude ?? prev.address.longitude,
            };

            return {
                ...prev,
                name: company.name ?? prev.name ?? "",
                description: (company as any).description ?? prev.description ?? "",
                industry: (company as any).industry ?? prev.industry ?? "",
                website: (company as any).website ?? prev.website ?? "",
                email: (company as any).email ?? prev.email ?? "",
                phone: (company as any).phone ?? prev.phone ?? "",
                logo: (company as any).logo ?? prev.logo ?? "",
                subdomain: (company as any).subdomain ?? prev.subdomain ?? "",
                publicTemplate: (company as any).publicTemplate ?? prev.publicTemplate ?? "templateA",
                address: mergedAddress,
                settings: (company as any).settings ?? prev.settings ?? {
                    timezone: "UTC",
                    currency: "USD",
                },
            };
        });
    }, [company]);

    // Basic front-end validation to avoid obviously invalid payloads
    const validateFormData = () => {
        if (!formData.name.trim()) {
            toast.error("Company name is required");
            return false;
        }
        if (!formData.email.trim()) {
            toast.error("Company email is required");
            return false;
        }
        const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailPattern.test(formData.email.trim())) {
            toast.error("Please enter a valid email address");
            return false;
        }
        if (!formData.phone.trim()) {
            toast.error("Company phone is required");
            return false;
        }
        // If address is partially filled, encourage completing it
        const { street, city, state, country, zipCode } = formData.address;
        const hasAnyAddressField = !!(street || city || state || country || zipCode);
        const allAddressFieldsFilled = !!(
            street &&
            city &&
            state &&
            country &&
            zipCode
        );
        if (hasAnyAddressField && !allAddressFieldsFilled) {
            toast.error("Please complete all address fields (street, city, state, country, zip)");
            return false;
        }
        return true;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!validateFormData()) {
            return;
        }

        setSaving(true);

        try {
            let finalFormData = { ...formData };

            // Upload logo first if a new one was selected
            if (selectedLogo) {
                const logoFormData = new FormData();
                logoFormData.append("file", selectedLogo);

                const uploadRes = await fetch("/api/company/upload-logo", {
                    method: "POST",
                    body: logoFormData,
                });

                if (uploadRes.ok) {
                    const uploadData = await uploadRes.json();
                    finalFormData.logo = uploadData.url;
                    setFormData((prev) => ({ ...prev, logo: uploadData.url }));
                } else {
                    toast.error("Failed to upload logo. Saving other settings...");
                }
            }

            const response = await fetch("/api/company/settings", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(finalFormData),
            });

            if (response.ok) {
                const updated = await response.json();

                // Update the SWR cache so sidebar / layout picks up the change instantly
                await mutateSettings(updated, { revalidate: false });

                if (updated.profileCompleted === true) {
                    const hasSubdomain = Boolean(updated?.subdomain);
                    const hasPublicSites =
                        Array.isArray(updated?.publicSites) && updated.publicSites.length > 0;

                    // Auto-create first public site once, right after profile completion.
                    if (!hasSubdomain && !hasPublicSites) {
                        const autoSubdomain = toCompanySubdomain(updated?.name || finalFormData.name || "");

                        if (autoSubdomain) {
                            const autoSitePayload = {
                                subdomain: autoSubdomain,
                                publicTemplate: "templateA",
                                publicSites: [{ subdomain: autoSubdomain, template: "templateA" }],
                            };

                            const autoSiteResponse = await fetch("/api/company/settings", {
                                method: "PUT",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify(autoSitePayload),
                            });

                            if (autoSiteResponse.ok) {
                                const autoSiteUpdated = await autoSiteResponse.json();
                                await mutateSettings(autoSiteUpdated, { revalidate: false });
                            } else {
                                const autoSiteError = await autoSiteResponse.json().catch(() => null);
                                toast.error(
                                    autoSiteError?.error ||
                                    "Profile saved, but automatic subdomain creation failed."
                                );
                            }
                        }
                    }

                    setIsRedirectDialogOpen(true);
                } else {
                    toast.warning("Settings saved, but profile is not complete yet. Please fill all required fields.");
                }
            } else {
                const error = await response.json();
                toast.error(error.error || "Failed to update settings");
            }
        } catch (error) {
            console.error("Error updating settings:", error);
            toast.error("Failed to update settings. Check console for details.");
        } finally {
            setSaving(false);
        }
    };

    const handleRedirect = () => {
        window.location.href = "/dashboard";
    };

    if (loadingSettings) {
        return (
            <div className="py-12 text-center">
                <p className="text-muted-foreground">Loading company settings...</p>
            </div>
        );
    }
console.log("company",company?.address);
    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Company Settings</h1>
                <p className="text-muted-foreground">
                    Manage your company profile and preferences
                </p>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
                <TabsList className="w-full justify-start overflow-x-auto h-auto flex-nowrap p-1">
                    <TabsTrigger value="profile">Profile</TabsTrigger>
                    <TabsTrigger value="subscription">Subscription</TabsTrigger>
                    <TabsTrigger value="preferences">Preferences</TabsTrigger>
                    <TabsTrigger value="availability">Availability</TabsTrigger>
                    <TabsTrigger value="payments">Payments</TabsTrigger>
                    <TabsTrigger value="promocodes">Promocodes</TabsTrigger>
                    <TabsTrigger value="service-areas">Service Areas</TabsTrigger>
                    <TabsTrigger value="zip-codes">Zip Codes</TabsTrigger>
                    <TabsTrigger value="mail-sending">Mail Sending</TabsTrigger>
                    <TabsTrigger value="subdomain">Sub Domain</TabsTrigger>
                </TabsList>

                <TabsContent value="profile">
                    <CompanyProfile
                        formData={formData}
                        setFormData={setFormData}
                        saving={saving}
                        handleSubmit={handleSubmit}
                        industries={industries}
                        selectedLogo={selectedLogo}
                        setSelectedLogo={setSelectedLogo}
                        isActiveTab={activeTab === "profile"}
                    />
                </TabsContent>

                <TabsContent value="subscription">
                    <CompanySubscription company={company ?? null} />
                </TabsContent>

                <TabsContent value="preferences">
                    <CompanyPreferences
                        formData={formData}
                        setFormData={setFormData}
                        saving={saving}
                        handleSubmit={handleSubmit}
                    />
                </TabsContent>

                <TabsContent value="availability">
                    <CompanyAvailability />
                </TabsContent>

                <TabsContent value="payments">
                    <CompanyPayments />
                </TabsContent>

                <TabsContent value="promocodes">
                    <CompanyPromocodes />
                </TabsContent>

                <TabsContent value="service-areas">
                    <CompanyServiceAreas />
                </TabsContent>

                <TabsContent value="zip-codes">
                    <CompanyZipCodes />
                </TabsContent>

                <TabsContent value="mail-sending">
                    <CompanyMailSending company={company ?? null} />
                </TabsContent>

                <TabsContent value="subdomain">
                    <CompanySubdomainSettings company={company ?? null} mutateSettings={mutateSettings as any} />
                </TabsContent>
            </Tabs>

            <Dialog open={isRedirectDialogOpen} onOpenChange={setIsRedirectDialogOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <div className="flex items-center gap-2">
                            <CheckCircle2 className="h-6 w-6 text-green-500" />
                            <DialogTitle>Setup Complete!</DialogTitle>
                        </div>
                        <DialogDescription className="pt-2">
                            🎉 Company profile completed successfully! You are now ready to access your dashboard.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="sm:justify-end">
                        <Button onClick={handleRedirect} className="w-full sm:w-auto">
                            Go to Dashboard
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
