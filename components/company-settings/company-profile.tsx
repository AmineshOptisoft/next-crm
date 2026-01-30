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
    // Google Maps initialization
    const mapRef = useRef<HTMLDivElement>(null);
    const mapInstanceRef = useRef<google.maps.Map | null>(null);
    const markerRef = useRef<google.maps.Marker | null>(null);
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
            map.addListener("click", (e: google.maps.MapMouseEvent) => {
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
                alert("File size must be less than 5MB");
                return;
            }
            setSelectedLogo(file);
            setFormData({ ...formData, logo: URL.createObjectURL(file) });
        }
    };

    const handleRemoveLogo = () => {
        setSelectedLogo(null);
        setFormData({ ...formData, logo: "" });
    };

    return (
        <form onSubmit={handleSubmit}>
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
            <Card>
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
                                />
                            </div>
                        </div>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                            <Label htmlFor="name">Company Name *</Label>
                            <Input
                                id="name"
                                required
                                value={formData.name}
                                onChange={(e) =>
                                    setFormData({ ...formData, name: e.target.value })
                                }
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="industry">Industry</Label>
                            <Select
                                value={formData.industry || "none"}
                                onValueChange={(value) =>
                                    setFormData({
                                        ...formData,
                                        industry: value === "none" ? "" : value,
                                    })
                                }
                            >
                                <SelectTrigger id="industry">
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
                                    setFormData({ ...formData, website: e.target.value })
                                }
                                placeholder="https://example.com"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="email">Email *</Label>
                            <Input
                                id="email"
                                type="email"
                                required
                                value={formData.email}
                                onChange={(e) =>
                                    setFormData({ ...formData, email: e.target.value })
                                }
                                placeholder="contact@company.com"
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="phone">Phone *</Label>
                        <Input
                            id="phone"
                            type="tel"
                            required
                            value={formData.phone}
                            onChange={(e) =>
                                setFormData({ ...formData, phone: e.target.value })
                            }
                            placeholder="+1 (555) 123-4567"
                        />
                    </div>

                    <div className="space-y-4">
                        <h3 className="font-semibold">Address</h3>
                        <div className="space-y-2">
                            <Label htmlFor="street">Street *</Label>
                            <Input
                                id="street"
                                required
                                value={formData.address.street}
                                onChange={(e) =>
                                    setFormData({
                                        ...formData,
                                        address: { ...formData.address, street: e.target.value },
                                    })
                                }
                            />
                        </div>
                        <div className="grid gap-4 md:grid-cols-3">
                            <div className="space-y-2">
                                <Label htmlFor="city">City *</Label>
                                <Input
                                    id="city"
                                    required
                                    value={formData.address.city}
                                    onChange={(e) =>
                                        setFormData({
                                            ...formData,
                                            address: { ...formData.address, city: e.target.value },
                                        })
                                    }
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="state">State *</Label>
                                <Input
                                    id="state"
                                    required
                                    value={formData.address.state}
                                    onChange={(e) =>
                                        setFormData({
                                            ...formData,
                                            address: { ...formData.address, state: e.target.value },
                                        })
                                    }
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="zipCode">Zip Code *</Label>
                                <Input
                                    id="zipCode"
                                    required
                                    value={formData.address.zipCode}
                                    onChange={(e) =>
                                        setFormData({
                                            ...formData,
                                            address: { ...formData.address, zipCode: e.target.value },
                                        })
                                    }
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="country">Country *</Label>
                            <Input
                                id="country"
                                required
                                value={formData.address.country}
                                onChange={(e) =>
                                    setFormData({
                                        ...formData,
                                        address: { ...formData.address, country: e.target.value },
                                    })
                                }
                            />
                        </div>

                        {/* Google Maps Section */}
                        <div className="space-y-4">
                            <div className="flex items-center gap-2">
                                <MapPin className="h-5 w-5 text-primary" />
                                <h4 className="font-semibold">Location on Map</h4>
                            </div>
                            <p className="text-sm text-muted-foreground">
                                Click on the map to select your company location
                            </p>
                            <div
                                ref={mapRef}
                                className="w-full h-[400px] rounded-lg border-2 border-gray-200"
                                style={{ minHeight: "400px" }}
                            />
                        </div>

                        {/* Latitude and Longitude Fields */}
                        <div className="grid gap-4 md:grid-cols-2">
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
        </form >
    );
}
