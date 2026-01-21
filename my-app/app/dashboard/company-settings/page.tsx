"use client";

import { useState, useEffect, useRef } from "react";
import Script from "next/script";
import { useRouter } from "next/navigation";
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
import { Building2, Save, Users, CreditCard, Upload, MapPin, X, Plus, Trash2, Calendar, TicketPercent } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { format } from "date-fns";

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
  profileCompleted?: boolean;
}

interface Promocode {
  _id: string;
  code: string;
  type: "percentage" | "flat";
  value: number;
  limit: number;
  usageCount: number;
  expiryDate: string;
  isActive: boolean;
}

interface ZipCode {
  _id: string;
  zone: string;
  code: string;
}

export default function CompanySettingsPage() {
  const router = useRouter();
  const [company, setCompany] = useState<Company | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [industries, setIndustries] = useState<Array<{ _id: string; name: string }>>([]);

  // Promocodes State
  const [promocodes, setPromocodes] = useState<Promocode[]>([]);
  const [isPromocodeDialogOpen, setIsPromocodeDialogOpen] = useState(false);
  const [newPromocode, setNewPromocode] = useState({
    code: "",
    type: "percentage",
    value: "",
    limit: "",
    expiryDate: ""
  });

  // Zip Codes State
  const [zipCodes, setZipCodes] = useState<ZipCode[]>([]);
  const [isZipCodeSheetOpen, setIsZipCodeSheetOpen] = useState(false);
  const [newZipCode, setNewZipCode] = useState({
    zone: "",
    code: ""
  });

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

  const [paymentSettings, setPaymentSettings] = useState({
    // Legacy
    payLocally: true,
    fattmerchantEnabled: false,
    fattmerchantApiKey: "",
    fattmerchantMerchantId: "",
    // New
    paymentEnabled: false,
    currency: "USD",
    paymentMode: "test",
    razorpay: { enabled: false, keyId: "", keySecret: "" },
    stripe: { enabled: false, publishableKey: "", secretKey: "" },
    paypal: { enabled: false, clientId: "", secret: "" },
    platformCommission: 0,
    tax: { enabled: false, percentage: 0 },
    convenienceFee: { enabled: false, amount: 0 },
    refund: { enabled: false, maxDays: 0 },
    invoice: { enabled: false, prefix: "" },
    autoCapture: true
  });

  useEffect(() => {
    fetchCompanySettings();
    fetchIndustries();
    fetchPaymentSettings();
    fetchPromocodes();
    fetchZipCodes();
  }, []);

  const fetchIndustries = async () => {
    try {
      const response = await fetch("/api/industries");
      if (response.ok) {
        const data = await response.json();
        setIndustries(data);
      }
    } catch (error) {
      console.error("Error fetching industries:", error);
    }
  };

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

  const fetchPaymentSettings = async () => {
    try {
      const response = await fetch("/api/payment-settings");
      if (response.ok) {
        const data = await response.json();
        setPaymentSettings({
          ...data,
          // Ensure nested objects exist to avoid crashes
          razorpay: data.razorpay || { enabled: false, keyId: "", keySecret: "" },
          stripe: data.stripe || { enabled: false, publishableKey: "", secretKey: "" },
          paypal: data.paypal || { enabled: false, clientId: "", secret: "" },
          tax: data.tax || { enabled: false, percentage: 0 },
          convenienceFee: data.convenienceFee || { enabled: false, amount: 0 },
          refund: data.refund || { enabled: false, maxDays: 0 },
          invoice: data.invoice || { enabled: false, prefix: "" },
        });
      }
    } catch (error) {
      console.error("Error fetching payment settings:", error);
    }
  };

  const fetchPromocodes = async () => {
    try {
      const response = await fetch("/api/promocodes");
      if (response.ok) {
        const data = await response.json();
        setPromocodes(data);
      }
    } catch (error) {
      console.error("Error fetching promocodes:", error);
    }
  };

  const handleCreatePromocode = async () => {
    try {
      const response = await fetch("/api/promocodes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newPromocode),
      });

      if (response.ok) {
        setIsPromocodeDialogOpen(false);
        setNewPromocode({
          code: "",
          type: "percentage",
          value: "",
          limit: "",
          expiryDate: ""
        });
        fetchPromocodes();
        alert("Promocode created successfully!");
      } else {
        const error = await response.json();
        alert(error.error || "Failed to create promocode");
      }
    } catch (error) {
      console.error("Error creating promocode:", error);
      alert("Error creating promocode");
    }
  };

  const handleDeletePromocode = async (id: string) => {
    if (!confirm("Are you sure you want to delete this promocode?")) return;
    try {
      const response = await fetch(`/api/promocodes/${id}`, {
        method: "DELETE",
      });
      if (response.ok) {
        fetchPromocodes();
      } else {
        alert("Failed to delete promocode");
      }
    } catch (error) {
      console.error("Error deleting promocode:", error);
    }
  };

  const fetchZipCodes = async () => {
    try {
      const response = await fetch("/api/zip-codes");
      if (response.ok) {
        const data = await response.json();
        setZipCodes(data);
      }
    } catch (error) {
      console.error("Error fetching zip codes:", error);
    }
  };

  const handleCreateZipCode = async () => {
    try {
      const response = await fetch("/api/zip-codes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newZipCode),
      });

      if (response.ok) {
        setIsZipCodeSheetOpen(false);
        setNewZipCode({
          zone: "",
          code: ""
        });
        fetchZipCodes();
        alert("Zip Code added successfully!");
      } else {
        const error = await response.json();
        alert(error.error || "Failed to add zip code");
      }
    } catch (error) {
      console.error("Error creating zip code:", error);
      alert("Error adding zip code");
    }
  };

  const handleDeleteZipCode = async (id: string) => {
    if (!confirm("Are you sure you want to delete this zip code?")) return;
    try {
      const response = await fetch(`/api/zip-codes/${id}`, {
        method: "DELETE",
      });
      if (response.ok) {
        fetchZipCodes();
      } else {
        alert("Failed to delete zip code");
      }
    } catch (error) {
      console.error("Error deleting zip code:", error);
    }
  };

  const savePaymentSettings = async () => {
    try {
      const response = await fetch("/api/payment-settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(paymentSettings),
      });

      if (response.ok) {
        alert("Payment settings saved successfully!");
      } else {
        alert("Failed to save payment settings");
      }
    } catch (error) {
      console.error("Error saving payment settings:", error);
      alert("Error saving payment settings");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      console.log("=== FRONTEND: Submitting form ===");
      console.log("Form data being sent:", formData);

      const response = await fetch("/api/company/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      console.log("Response status:", response.status);

      if (response.ok) {
        const updated = await response.json();
        console.log("=== FRONTEND: Response received ===");
        console.log("Full response:", updated);
        console.log("profileCompleted value:", updated.profileCompleted);
        console.log("Type of profileCompleted:", typeof updated.profileCompleted);

        setCompany(updated);

        // Check if profile is complete
        if (updated.profileCompleted === true) {
          console.log("✅ PROFILE IS COMPLETE! Starting redirect...");
          alert("🎉 Company profile completed successfully! Redirecting to dashboard...");

          // Immediate redirect with page reload
          setSaving(false);
          window.location.href = "/dashboard";
          return; // Stop execution
        } else {
          console.log("❌ Profile still incomplete. profileCompleted =", updated.profileCompleted);
          alert("Settings updated, but profile not complete yet. Please fill all required fields.");
        }
      } else {
        const error = await response.json();
        console.error("API Error:", error);
        alert(error.error || "Failed to update settings");
      }
    } catch (error) {
      console.error("=== FRONTEND ERROR ===");
      console.error("Error updating settings:", error);
      alert("Failed to update settings. Check console for details.");
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
            <TabsTrigger value="payments">Payments</TabsTrigger>
            <TabsTrigger value="promocodes">Promocodes</TabsTrigger>
            <TabsTrigger value="service-area">Service Area</TabsTrigger>
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
                      <Save className="mr-2 h-4 w-4" />
                      {saving ? "Saving..." : "Save Changes"}
                    </Button>
                  </div>
                </CardContent>
              </Card >
            </form >
          </TabsContent >

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

          <TabsContent value="payments">
            <Card>
              <CardHeader>
                <CardTitle>Payment Configuration</CardTitle>
                <CardDescription>
                  Configure payment methods and gateways
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-8">
                {/* --- Legacy Section --- */}
                <div className="space-y-4">
                  <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Legacy Settings</h3>

                  {/* Pay Locally */}
                  <div className="flex items-center justify-between rounded-lg border p-4 shadow-sm">
                    <div className="space-y-0.5">
                      <Label className="text-base font-semibold">Pay Locally</Label>
                      <div className="text-sm text-muted-foreground">Enable cash/check payments</div>
                    </div>
                    <Switch
                      checked={paymentSettings.payLocally}
                      onCheckedChange={(checked) => setPaymentSettings({ ...paymentSettings, payLocally: checked })}
                    />
                  </div>

                  {/* Fattmerchant */}
                  <div className="space-y-4 rounded-lg border p-4 shadow-sm">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label className="text-base font-semibold">Fattmerchant (Legacy)</Label>
                        <div className="text-sm text-muted-foreground">Original payment gateway integration</div>
                      </div>
                      <Switch
                        checked={paymentSettings.fattmerchantEnabled}
                        onCheckedChange={(checked) => setPaymentSettings({ ...paymentSettings, fattmerchantEnabled: checked })}
                      />
                    </div>
                    {paymentSettings.fattmerchantEnabled && (
                      <div className="grid gap-4 md:grid-cols-2 pt-2">
                        <div className="space-y-2">
                          <Label>API Key</Label>
                          <Input
                            type="password"
                            value={paymentSettings.fattmerchantApiKey}
                            onChange={(e) => setPaymentSettings({ ...paymentSettings, fattmerchantApiKey: e.target.value })}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Merchant ID</Label>
                          <Input
                            value={paymentSettings.fattmerchantMerchantId}
                            onChange={(e) => setPaymentSettings({ ...paymentSettings, fattmerchantMerchantId: e.target.value })}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="h-px bg-border" />

                {/* --- General Settings --- */}
                <div className="space-y-4">
                  <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">General Configuration</h3>
                  <div className="grid gap-6 md:grid-cols-2"> {/* Changed to grid-cols-2 for better layout */}
                    <div className="flex items-center justify-between rounded-lg border p-4 shadow-sm col-span-2">
                      <div className="space-y-0.5">
                        <Label className="text-base font-semibold">Enable Payments</Label>
                        <div className="text-sm text-muted-foreground">Master switch for new payment system</div>
                      </div>
                      <Switch
                        checked={paymentSettings.paymentEnabled}
                        onCheckedChange={(checked) => setPaymentSettings({ ...paymentSettings, paymentEnabled: checked })}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Currency</Label>
                      <Select
                        value={paymentSettings.currency}
                        onValueChange={(val) => setPaymentSettings({ ...paymentSettings, currency: val })}
                      >
                        <SelectTrigger><SelectValue placeholder="Select Currency" /></SelectTrigger>
                        <SelectContent>
                          {["USD", "EUR", "GBP", "INR", "JPY", "AUD", "CAD"].map(c => (
                            <SelectItem key={c} value={c}>{c}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Payment Mode</Label>
                      <Select
                        value={paymentSettings.paymentMode}
                        onValueChange={(val) => setPaymentSettings({ ...paymentSettings, paymentMode: val })}
                      >
                        <SelectTrigger><SelectValue placeholder="Mode" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="test">Test Mode</SelectItem>
                          <SelectItem value="live">Live Mode</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Platform Commission (%)</Label>
                      <Input
                        type="number"
                        value={paymentSettings.platformCommission}
                        onChange={(e) => setPaymentSettings({ ...paymentSettings, platformCommission: Number(e.target.value) })}
                      />
                    </div>

                    <div className="flex items-center justify-between rounded-lg border p-4 shadow-sm">
                      <div className="space-y-0.5">
                        <Label>Auto Capture</Label>
                        <div className="text-xs text-muted-foreground">Automatically capture payments</div>
                      </div>
                      <Switch
                        checked={paymentSettings.autoCapture}
                        onCheckedChange={(checked) => setPaymentSettings({ ...paymentSettings, autoCapture: checked })}
                      />
                    </div>
                  </div>
                </div>

                {/* --- Payment Gateways --- */}
                {paymentSettings.paymentEnabled && (
                  <>
                    <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider pt-4">Payment Gateways</h3>
                    <div className="grid gap-6">
                      {/* Razorpay */}
                      <div className="space-y-4 rounded-lg border p-4 shadow-sm bg-blue-50/50">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Label className="text-base font-semibold">Razorpay</Label>
                            <Badge variant="outline" className="text-xs">India</Badge>
                          </div>
                          <Switch
                            checked={paymentSettings.razorpay?.enabled}
                            onCheckedChange={(checked) => setPaymentSettings({
                              ...paymentSettings,
                              razorpay: { ...paymentSettings.razorpay, enabled: checked }
                            })}
                          />
                        </div>
                        {paymentSettings.razorpay?.enabled && (
                          <div className="grid gap-4 md:grid-cols-2 pt-2">
                            <div className="space-y-2">
                              <Label>Key ID</Label>
                              <Input
                                value={paymentSettings.razorpay.keyId}
                                onChange={(e) => setPaymentSettings({
                                  ...paymentSettings,
                                  razorpay: { ...paymentSettings.razorpay, keyId: e.target.value }
                                })}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>Key Secret</Label>
                              <Input
                                type="password"
                                value={paymentSettings.razorpay.keySecret}
                                onChange={(e) => setPaymentSettings({
                                  ...paymentSettings,
                                  razorpay: { ...paymentSettings.razorpay, keySecret: e.target.value }
                                })}
                              />
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Stripe */}
                      <div className="space-y-4 rounded-lg border p-4 shadow-sm bg-indigo-50/50">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Label className="text-base font-semibold">Stripe</Label>
                            <Badge variant="outline" className="text-xs">Global</Badge>
                          </div>
                          <Switch
                            checked={paymentSettings.stripe?.enabled}
                            onCheckedChange={(checked) => setPaymentSettings({
                              ...paymentSettings,
                              stripe: { ...paymentSettings.stripe, enabled: checked }
                            })}
                          />
                        </div>
                        {paymentSettings.stripe?.enabled && (
                          <div className="grid gap-4 md:grid-cols-2 pt-2">
                            <div className="space-y-2">
                              <Label>Publishable Key</Label>
                              <Input
                                value={paymentSettings.stripe.publishableKey}
                                onChange={(e) => setPaymentSettings({
                                  ...paymentSettings,
                                  stripe: { ...paymentSettings.stripe, publishableKey: e.target.value }
                                })}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>Secret Key</Label>
                              <Input
                                type="password"
                                value={paymentSettings.stripe.secretKey}
                                onChange={(e) => setPaymentSettings({
                                  ...paymentSettings,
                                  stripe: { ...paymentSettings.stripe, secretKey: e.target.value }
                                })}
                              />
                            </div>
                          </div>
                        )}
                      </div>

                      {/* PayPal */}
                      <div className="space-y-4 rounded-lg border p-4 shadow-sm bg-sky-50/50">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Label className="text-base font-semibold">PayPal</Label>
                            <Badge variant="outline" className="text-xs">Global</Badge>
                          </div>
                          <Switch
                            checked={paymentSettings.paypal?.enabled}
                            onCheckedChange={(checked) => setPaymentSettings({
                              ...paymentSettings,
                              paypal: { ...paymentSettings.paypal, enabled: checked }
                            })}
                          />
                        </div>
                        {paymentSettings.paypal?.enabled && (
                          <div className="grid gap-4 md:grid-cols-2 pt-2">
                            <div className="space-y-2">
                              <Label>Client ID</Label>
                              <Input
                                value={paymentSettings.paypal.clientId}
                                onChange={(e) => setPaymentSettings({
                                  ...paymentSettings,
                                  paypal: { ...paymentSettings.paypal, clientId: e.target.value }
                                })}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>Secret</Label>
                              <Input
                                type="password"
                                value={paymentSettings.paypal.secret}
                                onChange={(e) => setPaymentSettings({
                                  ...paymentSettings,
                                  paypal: { ...paymentSettings.paypal, secret: e.target.value }
                                })}
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </>
                )}

                {/* --- Fees & Taxes --- */}
                <div className="space-y-4 pt-4 border-t">
                  <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Fees & Taxes</h3>
                  <div className="grid gap-4 md:grid-cols-3">
                    {/* Tax */}
                    <div className="rounded-lg border p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <Label className="font-semibold">Tax</Label>
                        <Switch
                          checked={paymentSettings.tax?.enabled}
                          onCheckedChange={(checked) => setPaymentSettings({ ...paymentSettings, tax: { ...paymentSettings.tax, enabled: checked } })}
                        />
                      </div>
                      {paymentSettings.tax?.enabled && (
                        <div className="space-y-1">
                          <Label className="text-xs">Percentage (%)</Label>
                          <Input
                            type="number"
                            value={paymentSettings.tax.percentage}
                            onChange={(e) => setPaymentSettings({ ...paymentSettings, tax: { ...paymentSettings.tax, percentage: Number(e.target.value) } })}
                          />
                        </div>
                      )}
                    </div>

                    {/* Convenience Fee */}
                    <div className="rounded-lg border p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <Label className="font-semibold">Convenience Fee</Label>
                        <Switch
                          checked={paymentSettings.convenienceFee?.enabled}
                          onCheckedChange={(checked) => setPaymentSettings({ ...paymentSettings, convenienceFee: { ...paymentSettings.convenienceFee, enabled: checked } })}
                        />
                      </div>
                      {paymentSettings.convenienceFee?.enabled && (
                        <div className="space-y-1">
                          <Label className="text-xs">Amount</Label>
                          <Input
                            type="number"
                            value={paymentSettings.convenienceFee.amount}
                            onChange={(e) => setPaymentSettings({ ...paymentSettings, convenienceFee: { ...paymentSettings.convenienceFee, amount: Number(e.target.value) } })}
                          />
                        </div>
                      )}
                    </div>

                    {/* Refund Settings */}
                    <div className="rounded-lg border p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <Label className="font-semibold">Refund Policy</Label>
                        <Switch
                          checked={paymentSettings.refund?.enabled}
                          onCheckedChange={(checked) => setPaymentSettings({ ...paymentSettings, refund: { ...paymentSettings.refund, enabled: checked } })}
                        />
                      </div>
                      {paymentSettings.refund?.enabled && (
                        <div className="space-y-1">
                          <Label className="text-xs">Max Days</Label>
                          <Input
                            type="number"
                            value={paymentSettings.refund.maxDays}
                            onChange={(e) => setPaymentSettings({ ...paymentSettings, refund: { ...paymentSettings.refund, maxDays: Number(e.target.value) } })}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* --- Invoice Settings --- */}
                <div className="space-y-4 pt-4 border-t">
                  <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Invoicing</h3>
                  <div className="flex items-center gap-6 rounded-lg border p-4">
                    <div className="flex items-center gap-4">
                      <Label className="font-semibold">Enable Invoicing</Label>
                      <Switch
                        checked={paymentSettings.invoice?.enabled}
                        onCheckedChange={(checked) => setPaymentSettings({ ...paymentSettings, invoice: { ...paymentSettings.invoice, enabled: checked } })}
                      />
                    </div>
                    {paymentSettings.invoice?.enabled && (
                      <div className="flex items-center gap-2 flex-1 max-w-xs">
                        <Label className="whitespace-nowrap">Invoice Prefix:</Label>
                        <Input
                          value={paymentSettings.invoice.prefix}
                          onChange={(e) => setPaymentSettings({ ...paymentSettings, invoice: { ...paymentSettings.invoice, prefix: e.target.value } })}
                          placeholder="INV-"
                        />
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex justify-end pt-6 sticky bottom-0 bg-background/95 backdrop-blur py-4 border-t mt-4">
                  <Button onClick={savePaymentSettings} size="lg" className="shadow-lg">
                    <Save className="mr-2 h-4 w-4" />
                    Save Payment Configuration
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="promocodes">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div className="space-y-1.5">
                  <CardTitle>Promocodes</CardTitle>
                  <CardDescription>
                    Manage discount coupons and promotional offers
                  </CardDescription>
                </div>
                <Sheet open={isPromocodeDialogOpen} onOpenChange={setIsPromocodeDialogOpen}>
                  <SheetTrigger asChild>
                    <Button>
                      <Plus className="mr-2 h-4 w-4" />
                      Create New Promocode
                    </Button>
                  </SheetTrigger>
                  <SheetContent className="w-full sm:max-w-md flex flex-col h-full p-0 border-l shadow-2xl">
                    <div className="p-6 border-b bg-gradient-to-r from-muted/50 to-muted/20">
                      <SheetHeader className="space-y-4">
                        <div className="flex items-center gap-3">
                          <div className="p-2.5 bg-primary/10 rounded-full">
                            <TicketPercent className="h-6 w-6 text-primary" />
                          </div>
                          <div>
                            <SheetTitle className="text-xl">Create Promocode</SheetTitle>
                            <SheetDescription className="text-sm">
                              Configure a new discount coupon
                            </SheetDescription>
                          </div>
                        </div>
                      </SheetHeader>
                    </div>

                    <div className="flex-1 overflow-y-auto p-6 space-y-6">
                      <div className="space-y-2">
                        <Label htmlFor="code" className="text-sm font-medium">Coupon Code</Label>
                        <Input
                          id="code"
                          placeholder="e.g. SUMMER50"
                          value={newPromocode.code}
                          onChange={(e) => setNewPromocode({ ...newPromocode, code: e.target.value.toUpperCase() })}
                          className="h-10"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="type" className="text-sm font-medium">Coupon Type</Label>
                        <Select
                          value={newPromocode.type}
                          onValueChange={(val) => setNewPromocode({ ...newPromocode, type: val as "percentage" | "flat" })}
                        >
                          <SelectTrigger className="h-10">
                            <SelectValue placeholder="Select Type" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="percentage">Percentage (%)</SelectItem>
                            <SelectItem value="flat">Flat Amount ($)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="value" className="text-sm font-medium">Value</Label>
                        <Input
                          id="value"
                          type="number"
                          placeholder="0"
                          value={newPromocode.value}
                          onChange={(e) => setNewPromocode({ ...newPromocode, value: e.target.value })}
                          className="h-10"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="limit" className="text-sm font-medium">Limit (Usage)</Label>
                        <Input
                          id="limit"
                          type="number"
                          placeholder="0 for unlimited"
                          value={newPromocode.limit}
                          onChange={(e) => setNewPromocode({ ...newPromocode, limit: e.target.value })}
                          className="h-10"
                        />
                        <p className="text-[0.8rem] text-muted-foreground">Leave 0 for unlimited usage</p>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="expiry" className="text-sm font-medium">Expiry Date</Label>
                        <div className="relative">
                          <Input
                            id="expiry"
                            type="date"
                            value={newPromocode.expiryDate}
                            onChange={(e) => setNewPromocode({ ...newPromocode, expiryDate: e.target.value })}
                            className="pl-10 h-10"
                          />
                          <Calendar className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        </div>
                      </div>
                    </div>

                    <div className="p-6 border-t bg-muted/10 mt-auto">
                      <SheetFooter className="flex-col sm:flex-row gap-3 sm:space-x-0">
                        <Button variant="outline" onClick={() => setIsPromocodeDialogOpen(false)} className="w-full sm:w-1/2">
                          Cancel
                        </Button>
                        <Button onClick={handleCreatePromocode} className="w-full sm:w-1/2">
                          Save Promocode
                        </Button>
                      </SheetFooter>
                    </div>
                  </SheetContent>
                </Sheet>
              </CardHeader>
              <CardContent>
                {promocodes.length === 0 ? (
                  <div className="text-center py-10 text-muted-foreground">
                    No promocodes found. Create one to get started.
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>COUPON#</TableHead>
                        <TableHead>COUPON CODE</TableHead>
                        <TableHead>TYPE</TableHead>
                        <TableHead>LIMIT</TableHead>
                        <TableHead>USED</TableHead>
                        <TableHead>VALUE</TableHead>
                        <TableHead>EXP. DATE</TableHead>
                        <TableHead className="text-right">ACTION</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {promocodes.map((promo, index) => (
                        <TableRow key={promo._id}>
                          <TableCell className="font-medium">#{index + 1}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="font-mono">
                              {promo.code}
                            </Badge>
                          </TableCell>
                          <TableCell className="capitalize">{promo.type}</TableCell>
                          <TableCell>
                            {promo.limit === 0 ? <Badge variant="secondary">Unlimited</Badge> : promo.limit}
                          </TableCell>
                          <TableCell>{promo.usageCount || 0}</TableCell>
                          <TableCell>
                            {promo.type === 'percentage' ? `${promo.value}%` : `$${promo.value}`}
                          </TableCell>
                          <TableCell>
                            {promo.expiryDate ? format(new Date(promo.expiryDate), "MMM dd, yyyy") : "-"}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-destructive hover:text-destructive/90 hover:bg-destructive/10"
                              onClick={() => handleDeletePromocode(promo._id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="service-area">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div className="space-y-1.5">
                  <CardTitle>Service Area</CardTitle>
                  <CardDescription>
                    Manage your service zones and zip codes
                  </CardDescription>
                </div>
                <Sheet open={isZipCodeSheetOpen} onOpenChange={setIsZipCodeSheetOpen}>
                  <SheetTrigger asChild>
                    <Button>
                      <Plus className="mr-2 h-4 w-4" />
                      Add New Zip Code
                    </Button>
                  </SheetTrigger>
                  <SheetContent className="w-full sm:max-w-md flex flex-col h-full p-0 border-l shadow-2xl">
                    <div className="p-6 border-b bg-gradient-to-r from-muted/50 to-muted/20">
                      <SheetHeader className="space-y-4">
                        <div className="flex items-center gap-3">
                          <div className="p-2.5 bg-primary/10 rounded-full">
                            <MapPin className="h-6 w-6 text-primary" />
                          </div>
                          <div>
                            <SheetTitle className="text-xl">Add New Zip Code</SheetTitle>
                            <SheetDescription className="text-sm">
                              Configure a new service zone
                            </SheetDescription>
                          </div>
                        </div>
                      </SheetHeader>
                    </div>

                    <div className="flex-1 overflow-y-auto p-6 space-y-6">
                      <div className="space-y-2">
                        <Label htmlFor="zone" className="text-sm font-medium">Zone Name</Label>
                        <Select
                          value={newZipCode.zone}
                          onValueChange={(val) => setNewZipCode({ ...newZipCode, zone: val })}
                        >
                          <SelectTrigger className="w-full h-10">
                            <SelectValue placeholder="Select Zone" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Unassigned">Unassigned</SelectItem>
                            <SelectItem value="North Zone">North Zone</SelectItem>
                            <SelectItem value="South Zone">South Zone</SelectItem>
                            <SelectItem value="East Zone">East Zone</SelectItem>
                            <SelectItem value="West Zone">West Zone</SelectItem>
                            <SelectItem value="Central Zone">Central Zone</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="zipCode" className="text-sm font-medium">Zip Code</Label>
                        <Input
                          id="zipCode"
                          placeholder="Enter Zip Code"
                          value={newZipCode.code}
                          onChange={(e) => setNewZipCode({ ...newZipCode, code: e.target.value })}
                          className="h-10"
                        />
                      </div>
                    </div>

                    <div className="p-6 border-t bg-muted/10 mt-auto">
                      <SheetFooter className="flex-col sm:flex-row gap-3 sm:space-x-0">
                        <Button variant="outline" onClick={() => setIsZipCodeSheetOpen(false)} className="w-full sm:w-1/2">
                          Cancel
                        </Button>
                        <Button onClick={handleCreateZipCode} className="w-full sm:w-1/2 ">
                          Save
                        </Button>
                      </SheetFooter>
                    </div>
                  </SheetContent>
                </Sheet>
              </CardHeader>
              <CardContent>
                {zipCodes.length === 0 ? (
                  <div className="text-center py-10 text-muted-foreground">
                    No zip codes found. Add one to get started.
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>#</TableHead>
                        <TableHead>ZONE NAME</TableHead>
                        <TableHead>ZIP CODE</TableHead>
                        <TableHead className="text-right">ACTION</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {zipCodes.map((zip, index) => (
                        <TableRow key={zip._id}>
                          <TableCell className="font-medium">#{index + 1}</TableCell>
                          <TableCell className="font-medium">{zip.zone}</TableCell>
                          <TableCell>
                            <Badge variant="secondary" className="font-mono">
                              {zip.code}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-destructive hover:text-destructive/90 hover:bg-destructive/10"
                              onClick={() => handleDeleteZipCode(zip._id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs >
      </div >
    </>
  );
}
