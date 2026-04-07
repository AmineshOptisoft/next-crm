"use client";

import { useState, useRef, useEffect } from "react";
import Script from "next/script";
import { Button } from "@/components/ui/button";
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
import { Building2, Save, Upload, MapPin, X, Loader2 } from "lucide-react";
import { Country, State, City } from "country-state-city";

declare const google: any;

interface CompanyProfileProps {
    formData: any;
    setFormData: (data: any) => void;
    saving: boolean;
    handleSubmit: (e: React.FormEvent) => void;
    industries: Array<{ _id: string; name: string }>;
    selectedLogo: File | null;
    setSelectedLogo: (file: File | null) => void;
}

export function CompanyProfile({ formData, setFormData, saving, handleSubmit, industries, selectedLogo, setSelectedLogo }: CompanyProfileProps) {
    const [errors, setErrors] = useState<Record<string, string | undefined>>({});

    const clearError = (key: string) => {
        setErrors((prev) => (prev[key] ? { ...prev, [key]: undefined } : prev));
    };

    const setError = (key: string, message: string) => {
        setErrors((prev) => ({ ...prev, [key]: message }));
    };

    const isValidEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

    const isValidUrl = (value: string) => {
        try {
            // allow http(s) only
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

        if (industries.length > 0) {
            const industry = (formData?.industry ?? "").trim();
            if (!industry) next["industry"] = "Select industry.";
        }

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
    const mapInstanceRef = useRef<any | null>(null);
    const markerRef = useRef<any | null>(null);
    const [isMapReady, setIsMapReady] = useState(false);

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

            // Add marker if coordinates exist
            if (formData.address.latitude && formData.address.longitude) {
                markerRef.current = new google.maps.Marker({
                    position: { lat: formData.address.latitude, lng: formData.address.longitude },
                    map: map,
                    draggable: false,
                });
            }

            // Add click listener
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

                    // Update or create marker
                    if (markerRef.current) {
                        markerRef.current.setPosition(e.latLng);
                    } else {
                        markerRef.current = new google.maps.Marker({
                            position: e.latLng,
                            map: map,
                            draggable: false,
                        });
                    }
                }
            });
        } catch (error) {
            console.error("Error initializing map:", error);
        }
    };

    // Initialize when map is ready
    useEffect(() => {
        if (isMapReady) {
            initMap();
        }
    }, [isMapReady]);

    // Update marker when coordinates change
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

    // Cascading Location Logic
    const countries = Country.getAllCountries();
    const selectedCountry = countries.find((c) => c.name === (formData.address.country || "").trim());
    const countryCode = selectedCountry?.isoCode;

    const states = countryCode ? State.getStatesOfCountry(countryCode) : [];
    const selectedState = states.find((s) => s.name === (formData.address.state || "").trim());
    const stateCode = selectedState?.isoCode;

    const citiesFromLibrary = (countryCode && stateCode) ? City.getCitiesOfState(countryCode, stateCode) : [];
    // Use values from formData, but normalize them; this is the single source of truth
    const savedCountry = (formData?.address?.country ?? "").trim();
    const savedState = (formData?.address?.state ?? "").trim();
    const savedCityRaw = (formData?.address?.city ?? "").trim();
    const cityExists = citiesFromLibrary.some((c) => c.name === savedCityRaw);
    const cities = savedCityRaw && !cityExists
        ? [{ name: savedCityRaw, stateCode: stateCode || "" }, ...citiesFromLibrary]
        : citiesFromLibrary;
    const savedCity = savedCityRaw;
    return (
        <form onSubmit={onSubmit} noValidate>
            <Script
                src="https://maps.googleapis.com/maps/api/js?key=AIzaSyAQODjSc_eWcBWoIdk7trMzl98oRHF9HFs&libraries=places"
                onLoad={() => {
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
                    {/* Company Logo Section */}
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
                                value={formData.industry || "none"}
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
                            placeholder="(555) 123-4567"
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
                        <div className="space-y-2">
                            <Label htmlFor="street">Street *</Label>
                            <Input
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
                        <div className="grid gap-4 md:grid-cols-2">
                           

                        {/* Google Maps Section */}
                        <div className="space-y-4">
                            <div className="flex items-center gap-2">
                                <MapPin className="h-5 w-5 text-primary" />
                                <h4 className="font-semibold">Location on Map</h4>
                            </div>
                            <p className="text-sm text-muted-foreground">
                                Click on the map to select your company location
                            </p>
                            {errors["address.location"] && (
                                <p className="text-destructive text-sm">
                                    {errors["address.location"]}
                                </p>
                            )}
                            <div
                                ref={mapRef}
                                className="w-full h-[400px] rounded-lg border-2 border-gray-200"
                                style={{ minHeight: "400px" }}
                            />
                        </div>

                        <div className="space-y-2">
                                <Label htmlFor="country">Country *</Label>
                                <Select
                                    value={savedCountry}
                                    onValueChange={(val) => {
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
                                >
                                    <SelectTrigger
                                        id="country"
                                        className="w-full !bg-slate-800"
                                        aria-invalid={Boolean(errors["address.country"])}
                                        aria-describedby={errors["address.country"] ? "country-error" : undefined}
                                    >
                                        <SelectValue placeholder="Select Country" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {countries.map((country) => (
                                            <SelectItem key={country.isoCode} value={country.name}>
                                                {country.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                {errors["address.country"] && (
                                    <p id="country-error" className="text-destructive text-sm">
                                        {errors["address.country"]}
                                    </p>
                                )}
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="state">State *</Label>
                                <Select
                                    value={savedState}
                                    onValueChange={(val) => {
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
                                    disabled={!countryCode}
                                >
                                    <SelectTrigger
                                        id="state"
                                        className="w-full"
                                        aria-invalid={Boolean(errors["address.state"])}
                                        aria-describedby={errors["address.state"] ? "state-error" : undefined}
                                    >
                                        <SelectValue placeholder="Select State" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {states.map((state) => (
                                            <SelectItem key={state.isoCode} value={state.name}>
                                                {state.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                {errors["address.state"] && (
                                    <p id="state-error" className="text-destructive text-sm">
                                        {errors["address.state"]}
                                    </p>
                                )}
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="city">City *</Label>
                                <Select
                                    // Normalize value so it matches SelectItem values (DB may contain trailing spaces)
                                    value={savedCity}
                                    onValueChange={(val) =>
                                        (setFormData({
                                            ...formData,
                                            address: {
                                                ...formData.address,
                                                city: val.trim(),
                                            },
                                        }), clearError("address.city"))
                                    }
                                    // disabled={!stateCode}
                                >
                                    <SelectTrigger
                                        id="city"
                                        className="w-full"
                                        aria-invalid={Boolean(errors["address.city"])}
                                        aria-describedby={errors["address.city"] ? "city-error" : undefined}
                                    >
                                        <SelectValue placeholder="Select City" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {cities.map((city) => (
                                            <SelectItem key={city.name} value={city.name}>
                                                {city.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
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

                        {/* Latitude and Longitude Fields */}
                        <div className="hidden md:grid gap-4 md:grid-cols-2">
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
            </Card >
            <style>
                {`
                .bg-background {
                    background-color:rgb(5, 81, 204) !important;
                }
                `}
            </style>
        </form >
    );
}
