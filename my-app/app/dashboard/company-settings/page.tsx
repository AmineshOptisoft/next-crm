"use client";

import { useState, useEffect, useRef } from "react";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Building2, Save, Users, CreditCard, Upload, MapPin, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface Company {
  _id: string;
  name: string;
  description?: string;
  industry?: string;
  website?: string;
  email?: string;
  phone?: string;
  logo?: string;
  address?: {
    street?: string;
    city?: string;
    state?: string;
    country?: string;
    zipCode?: string;
    latitude?: number;
    longitude?: number;
  };
  plan: string;
  planExpiry?: string;
  limits: {
    users: number;
    contacts: number;
    deals: number;
  };
  settings: {
    timezone: string;
    currency: string;
  };
}

export default function CompanySettingsPage() {
  const [company, setCompany] = useState<Company | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    industry: "",
    website: "",
    email: "",
    phone: "",
    logo: "",
    address: {
      street: "",
      city: "",
      state: "",
      country: "",
      zipCode: "",
      latitude: undefined as number | undefined,
      longitude: undefined as number | undefined,
    },
    settings: {
      timezone: "UTC",
      currency: "USD",
    },
  });

  useEffect(() => {
    fetchCompanySettings();
  }, []);

  const fetchCompanySettings = async () => {
    try {
      const response = await fetch("/api/company/settings");
      if (response.ok) {
        const data = await response.json();
        setCompany(data);
        setFormData({
          name: data.name || "",
          description: data.description || "",
          industry: data.industry || "",
          website: data.website || "",
          email: data.email || "",
          phone: data.phone || "",
          logo: data.logo || "",
          address: data.address || {
            street: "",
            city: "",
            state: "",
            country: "",
            zipCode: "",
            latitude: undefined,
            longitude: undefined,
          },
          settings: data.settings || {
            timezone: "UTC",
            currency: "USD",
          },
        });
      }
    } catch (error) {
      console.error("Error fetching company settings:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const response = await fetch("/api/company/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        const updated = await response.json();
        setCompany(updated);
        alert("Company settings updated successfully!");
      } else {
        const error = await response.json();
        alert(error.error || "Failed to update settings");
      }
    } catch (error) {
      console.error("Error updating settings:", error);
      alert("Failed to update settings");
    } finally {
      setSaving(false);
    }
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert("File size must be less than 5MB");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData({ ...formData, logo: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveLogo = () => {
    setFormData({ ...formData, logo: "" });
  };

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

    console.log("Initializing map...");

    try {
      const map = new google.maps.Map(mapRef.current, {
        center: { lat: defaultLat, lng: defaultLng },
        zoom: 13,
        mapTypeControl: true,
        streetViewControl: false,
        fullscreenControl: true,
      });

      mapInstanceRef.current = map;
      console.log("Map initialized successfully!");

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

          console.log("Map clicked:", lat, lng);

          setFormData((prev) => ({
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

  if (loading) {
    return (
      <div className="py-12 text-center">
        <p className="text-muted-foreground">Loading company settings...</p>
      </div>
    );
  }

  return (
    <>
      <Script
        src="https://maps.googleapis.com/maps/api/js?key=AIzaSyAQODjSc_eWcBWoIdk7trMzl98oRHF9HFs&libraries=places"
        onLoad={() => {
          console.log("Google Maps script loaded!");
          setIsMapReady(true);
        }}
        onError={() => {
          console.error("Error loading Google Maps script");
        }}
        strategy="afterInteractive"
      />
      <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Company Settings</h1>
        <p className="text-muted-foreground">
          Manage your company profile and preferences
        </p>
      </div>

      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList>
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="subscription">Subscription</TabsTrigger>
          <TabsTrigger value="preferences">Preferences</TabsTrigger>
        </TabsList>

        <TabsContent value="profile">
          <form onSubmit={handleSubmit}>
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
                      <Label htmlFor="logo">Upload Company Logo</Label>
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
                    <Input
                      id="industry"
                      value={formData.industry}
                      onChange={(e) =>
                        setFormData({ ...formData, industry: e.target.value })
                      }
                      placeholder="e.g., Technology, Healthcare"
                    />
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
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) =>
                        setFormData({ ...formData, email: e.target.value })
                      }
                      placeholder="contact@company.com"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    type="tel"
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
                    <Label htmlFor="street">Street</Label>
                    <Input
                      id="street"
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
                      <Label htmlFor="city">City</Label>
                      <Input
                        id="city"
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
                      <Label htmlFor="state">State</Label>
                      <Input
                        id="state"
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
                      <Label htmlFor="zipCode">Zip Code</Label>
                      <Input
                        id="zipCode"
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
                    <Label htmlFor="country">Country</Label>
                    <Input
                      id="country"
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
                    <Save className="mr-2 h-4 w-4" />
                    {saving ? "Saving..." : "Save Changes"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </form>
        </TabsContent>

        <TabsContent value="subscription">
          <Card>
            <CardHeader>
              <CardTitle>Subscription & Limits</CardTitle>
              <CardDescription>
                View your current plan and usage limits
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {company && (
                <>
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold">Current Plan</h3>
                      <p className="text-sm text-muted-foreground">
                        Your subscription tier
                      </p>
                    </div>
                    <Badge variant="default" className="capitalize text-lg">
                      {company.plan}
                    </Badge>
                  </div>

                  {company.planExpiry && (
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold">Plan Expiry</h3>
                        <p className="text-sm text-muted-foreground">
                          Renewal date
                        </p>
                      </div>
                      <span className="font-medium">
                        {new Date(company.planExpiry).toLocaleDateString()}
                      </span>
                    </div>
                  )}

                  <div className="space-y-4">
                    <h3 className="font-semibold">Usage Limits</h3>
                    <div className="grid gap-4 md:grid-cols-3">
                      <Card>
                        <CardHeader className="pb-3">
                          <CardTitle className="text-sm font-medium">
                            <Users className="h-4 w-4 inline mr-2" />
                            Users
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="text-2xl font-bold">
                            {company.limits.users}
                          </div>
                          <p className="text-xs text-muted-foreground">
                            Maximum team members
                          </p>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader className="pb-3">
                          <CardTitle className="text-sm font-medium">
                            <Building2 className="h-4 w-4 inline mr-2" />
                            Contacts
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="text-2xl font-bold">
                            {company.limits.contacts}
                          </div>
                          <p className="text-xs text-muted-foreground">
                            Maximum contacts
                          </p>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader className="pb-3">
                          <CardTitle className="text-sm font-medium">
                            <CreditCard className="h-4 w-4 inline mr-2" />
                            Deals
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="text-2xl font-bold">
                            {company.limits.deals}
                          </div>
                          <p className="text-xs text-muted-foreground">
                            Maximum deals
                          </p>
                        </CardContent>
                      </Card>
                    </div>
                  </div>

                  <div className="pt-4">
                    <Button variant="outline" disabled>
                      Upgrade Plan (Coming Soon)
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="preferences">
          <form onSubmit={handleSubmit}>
            <Card>
              <CardHeader>
                <CardTitle>Company Preferences</CardTitle>
                <CardDescription>
                  Configure default settings for your organization
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="timezone">Timezone</Label>
                    <Select
                      value={formData.settings.timezone}
                      onValueChange={(value) =>
                        setFormData({
                          ...formData,
                          settings: { ...formData.settings, timezone: value },
                        })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="UTC">UTC</SelectItem>
                        <SelectItem value="America/New_York">
                          Eastern Time (ET)
                        </SelectItem>
                        <SelectItem value="America/Chicago">
                          Central Time (CT)
                        </SelectItem>
                        <SelectItem value="America/Denver">
                          Mountain Time (MT)
                        </SelectItem>
                        <SelectItem value="America/Los_Angeles">
                          Pacific Time (PT)
                        </SelectItem>
                        <SelectItem value="Europe/London">
                          London (GMT)
                        </SelectItem>
                        <SelectItem value="Asia/Kolkata">
                          India (IST)
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="currency">Default Currency</Label>
                    <Select
                      value={formData.settings.currency}
                      onValueChange={(value) =>
                        setFormData({
                          ...formData,
                          settings: { ...formData.settings, currency: value },
                        })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="USD">USD ($)</SelectItem>
                        <SelectItem value="EUR">EUR (€)</SelectItem>
                        <SelectItem value="GBP">GBP (£)</SelectItem>
                        <SelectItem value="INR">INR (₹)</SelectItem>
                        <SelectItem value="JPY">JPY (¥)</SelectItem>
                        <SelectItem value="AUD">AUD (A$)</SelectItem>
                        <SelectItem value="CAD">CAD (C$)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button type="submit" disabled={saving}>
                    <Save className="mr-2 h-4 w-4" />
                    {saving ? "Saving..." : "Save Preferences"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </form>
        </TabsContent>
      </Tabs>
    </div>
    </>
  );
}
