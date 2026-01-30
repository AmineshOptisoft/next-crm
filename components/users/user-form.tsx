"use client";

import { useState, useEffect } from "react";
import { User } from "@/app/models/User";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { X, Upload, Check, ChevronsUpDown, Loader2 } from "lucide-react";
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

import { UserBookings } from "./user-bookings";
import { UserAvailability } from "./user-availability";
import { UserOffTime } from "./user-off-time";
import { UserSecurity } from "./user-security";
import { UserReviews } from "./user-reviews";
import { Country, State, City } from "country-state-city";

// Define a frontend interface that matches the API response
export interface UserData {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
    phoneNumber?: string;
    // keapId removed
    address?: string;
    city?: string;
    state?: string;
    zipCode?: string;
    country?: string;
    gender?: string;
    tags?: string[];
    description?: string;
    role: string;
    customRoleId?: string | { _id: string; name: string };
    isActive: boolean;
    services?: string[]; // Array of Service IDs

    // Working Area
    zone?: string;
    workingZipCodes?: string[]; // stored as array
    timesheetEnabled?: boolean;
    bookingEnabled?: boolean;
    availabilityEnabled?: boolean;
    availability?: {
        day: string;
        isOpen: boolean;
        startTime: string;
        endTime: string;
    }[];
    isTechnicianActive?: boolean;
    staffRole?: "Staff" | "Trainee";
    avatarUrl?: string;

    reviews?: {
        _id?: string;
        title: string;
        rating: number;
        text: string;
        reviewer: string;
        createdAt?: string;
    }[];
    password?: string;
}

interface UserFormProps {
    user: UserData;
    onSave: (data: Partial<UserData>) => void;
    loading?: boolean;
}

export function UserForm({ user, onSave, loading }: UserFormProps) {
    const [formData, setFormData] = useState<Partial<UserData>>({
        ...user,
        // Initialize toggles if undefined
        timesheetEnabled: user.timesheetEnabled ?? false,
        bookingEnabled: user.bookingEnabled ?? false,
        availabilityEnabled: user.availabilityEnabled ?? false,
        isTechnicianActive: user.isTechnicianActive ?? true,
        staffRole: user.staffRole ?? "Staff",
        // Handle customRoleId being an object (populated) or string or undefined
        customRoleId: (user.customRoleId && typeof user.customRoleId === 'object')
            ? (user.customRoleId as any)._id
            : (user.customRoleId || ""),
    });
    const [newTag, setNewTag] = useState("");
    const [roles, setRoles] = useState<{ _id: string; name: string }[]>([]);
    const [availableServices, setAvailableServices] = useState<{ _id: string; name: string }[]>([]);
    const [serviceAreas, setServiceAreas] = useState<{ _id: string; name: string }[]>([]);
    const [openServiceCombobox, setOpenServiceCombobox] = useState(false);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [isUploading, setIsUploading] = useState(false);

    useEffect(() => {
        const fetchRoles = async () => {
            try {
                const response = await fetch("/api/roles?creator=me");
                if (response.ok) {
                    const data = await response.json();
                    setRoles(data);
                }
            } catch (error) {
                console.error("Failed to fetch roles:", error);
            }
        };

        const fetchServices = async () => {
            try {
                const response = await fetch("/api/services");
                if (response.ok) {
                    const data = await response.json();
                    // Filter to show only main services (not sub-services or addons)
                    const mainServices = data.filter((service: any) => service.category === "main");
                    setAvailableServices(mainServices);
                }
            } catch (error) {
                console.error("Failed to fetch services:", error);
            }
        };

        const fetchServiceAreas = async () => {
            try {
                const response = await fetch("/api/service-areas");
                if (response.ok) {
                    const data = await response.json();
                    setServiceAreas(data);
                }
            } catch (error) {
                console.error("Failed to fetch service areas:", error);
            }
        };

        fetchRoles();
        fetchServices();
        fetchServiceAreas();
    }, []);
    // Local state for zip codes area to handle text input
    const [zipCodesText, setZipCodesText] = useState(user.workingZipCodes?.join(", ") || "");

    // Cascading Location Logic
    const countries = Country.getAllCountries();
    const selectedCountry = countries.find((c) => c.name === formData.country);
    const countryCode = selectedCountry?.isoCode;

    const states = countryCode ? State.getStatesOfCountry(countryCode) : [];
    const selectedState = states.find((s) => s.name === formData.state);
    const stateCode = selectedState?.isoCode;

    const cities = (countryCode && stateCode) ? City.getCitiesOfState(countryCode, stateCode) : [];

    const handleChange = (field: keyof UserData, value: any) => {
        setFormData((prev) => ({ ...prev, [field]: value }));
    };

    const handleZipCodeChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const val = e.target.value;
        setZipCodesText(val);
        // Parse into array
        const zips = val.split(",").map(s => s.trim()).filter(Boolean);
        handleChange("workingZipCodes", zips);
    };

    const handleAddTag = (e: React.KeyboardEvent) => {
        if (e.key === "Enter" && newTag.trim()) {
            e.preventDefault();
            const currentTags = formData.tags || [];
            if (!currentTags.includes(newTag.trim())) {
                handleChange("tags", [...currentTags, newTag.trim()]);
            }
            setNewTag("");
        }
    };

    const removeTag = (tagToRemove: string) => {
        const currentTags = formData.tags || [];
        handleChange(
            "tags",
            currentTags.filter((tag) => tag !== tagToRemove)
        );
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        let currentData = { ...formData };

        if (selectedFile) {
            setIsUploading(true);
            try {
                const uploadData = new FormData();
                uploadData.append("file", selectedFile);

                const userId = user._id || formData._id;

                if (userId) {
                    const res = await fetch(`/api/users/${userId}/upload-avatar`, {
                        method: "POST",
                        body: uploadData,
                    });

                    if (res.ok) {
                        const resData = await res.json();
                        currentData.avatarUrl = resData.url;
                    }
                }
            } catch (error) {
                console.error("Failed to upload image:", error);
            } finally {
                setIsUploading(false);
            }
        }

        onSave(currentData);
    };

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Edit User</h1>
                <p className="text-muted-foreground">
                    Manage user details, booking, and permissions
                </p>
            </div>

            <Tabs defaultValue="details" className="space-y-6">
                <TabsList>
                    <TabsTrigger value="details">Technician Details</TabsTrigger>
                    <TabsTrigger value="bookings">Technician Bookings</TabsTrigger>
                    <TabsTrigger value="availability">Technician Availability</TabsTrigger>
                    <TabsTrigger value="offtime">Technician Off Time</TabsTrigger>
                    <TabsTrigger value="security">Security</TabsTrigger>
                    <TabsTrigger value="review">Review</TabsTrigger>
                </TabsList>

                <TabsContent value="details">
                    <Card>
                        <CardHeader>
                            <div className="flex justify-between items-center">
                                <div className="flex flex-col gap-2">
                                    <CardTitle>Technician Details</CardTitle>
                                    <CardDescription>
                                        General information and configuration
                                    </CardDescription>
                                </div>
                                <div className="flex gap-2">
                                    <Button variant={formData.isTechnicianActive ? "default" : "secondary"} size="sm" onClick={() => handleChange("isTechnicianActive", !formData.isTechnicianActive)}>
                                        {formData.isTechnicianActive ? "Active" : "Inactive"}
                                    </Button>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <form onSubmit={handleSubmit} className="">
                                {/* Upload Image - Redesigned & Moved to Top */}
                                {/* Upload Image - Redesigned & Moved to Top */}
                                {/* Upload Image - Company Logo */}
                                <div className="space-y-2 mb-6 flex flex-col gap-2">
                                    <h3 className="font-semibold">Image</h3>
                                    <div className="flex items-center gap-6">
                                        {formData.avatarUrl ? (
                                            <div className="relative">
                                                <img
                                                    src={formData.avatarUrl}
                                                    alt="User Image"
                                                    className="h-24 w-24 rounded-lg object-cover border-2 border-gray-200"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => handleChange("avatarUrl", "")}
                                                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                                                >
                                                    <X className="h-4 w-4" />
                                                </button>
                                            </div>
                                        ) : (
                                            <div className="h-24 w-24 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center bg-gray-50">
                                                <Upload className="h-8 w-8 text-gray-400" />
                                            </div>
                                        )}
                                        <div className="flex-1">
                                            <Label htmlFor="avatar-upload" className="font-semibold">Upload Image</Label>
                                            <p className="text-sm text-muted-foreground mb-2">
                                                PNG, JPG up to 5MB
                                            </p>
                                            <Input
                                                id="avatar-upload"
                                                type="file"
                                                accept="image/png,image/jpeg,image/jpg"
                                                disabled={loading || isUploading}
                                                onChange={(e) => {
                                                    if (e.target.files?.[0]) {
                                                        const file = e.target.files[0];
                                                        if (file.size > 5 * 1024 * 1024) {
                                                            alert("File size must be less than 5MB");
                                                            return;
                                                        }
                                                        setSelectedFile(file);
                                                        handleChange("avatarUrl", URL.createObjectURL(file));
                                                    }
                                                }}
                                            />
                                        </div>
                                    </div>
                                </div>
                                {/* Name & Email */}
                                <div className="grid grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <Label htmlFor="firstName">First Name</Label>
                                        <Input
                                            id="firstName"
                                            value={formData.firstName || ""}
                                            onChange={(e) => handleChange("firstName", e.target.value)}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="lastName">Last Name</Label>
                                        <Input
                                            id="lastName"
                                            value={formData.lastName || ""}
                                            onChange={(e) => handleChange("lastName", e.target.value)}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="email">Email</Label>
                                        <Input
                                            id="email"
                                            value={formData.email}
                                            onChange={(e) => handleChange("email", e.target.value)}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="contact">Contact</Label>
                                        <Input
                                            id="contact"
                                            value={formData.phoneNumber || ""}
                                            onChange={(e) => handleChange("phoneNumber", e.target.value)}
                                            placeholder="(555) 555-5555"
                                        />
                                    </div>
                                </div>

                                {/* Contact & Keap ID (Removed Keap ID as requested) */}
                                <div className="grid grid-cols-1 gap-6 mt-4">


                                </div>

                                {/* Description */}
                                <div className="space-y-2 mt-4">
                                    <Label htmlFor="description">Description</Label>
                                    <Textarea
                                        id="description"
                                        value={formData.description || ""}
                                        onChange={(e) => handleChange("description", e.target.value)}
                                        className="min-h-[60px]"
                                    />
                                </div>

                                {/* Address */}
                                <div className="space-y-2 mt-4">
                                    <Label htmlFor="address">Address</Label>
                                    <Input
                                        id="address"
                                        value={formData.address || ""}
                                        onChange={(e) => handleChange("address", e.target.value)}
                                    />
                                </div>

                                {/* State, City, Zip, Country */}
                                <div className="grid grid-cols-2 gap-6 mt-4">

                                    <div className="space-y-2">
                                        <Label htmlFor="country">Country</Label>
                                        <Select
                                            value={formData.country || ""}
                                            onValueChange={(val) => {
                                                handleChange("country", val);
                                                handleChange("state", "");
                                                handleChange("city", "");
                                            }}
                                        >
                                            <SelectTrigger id="country" className="w-full">
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
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="state">State</Label>
                                        <Select
                                            value={formData.state || ""}
                                            onValueChange={(val) => {
                                                handleChange("state", val);
                                                handleChange("city", "");
                                            }}
                                            disabled={!countryCode}
                                        >
                                            <SelectTrigger id="state" className="w-full">
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
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="city">City</Label>
                                        <Select
                                            value={formData.city || ""}
                                            onValueChange={(val) => handleChange("city", val)}
                                            disabled={!stateCode}
                                        >
                                            <SelectTrigger id="city" className="w-full">
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
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="zipCode">Zip code</Label>
                                        <Input
                                            id="zipCode"
                                            value={formData.zipCode || ""}
                                            onChange={(e) => handleChange("zipCode", e.target.value)}
                                        />
                                    </div>

                                </div>

                                {/* Services & Gender */}
                                <div className="grid grid-cols-2 gap-6 mt-4">
                                    <div className="space-y-2">
                                        <Label>Services</Label>
                                        <Popover open={openServiceCombobox} onOpenChange={setOpenServiceCombobox}>
                                            <PopoverTrigger asChild>
                                                <div
                                                    role="combobox"
                                                    aria-expanded={openServiceCombobox}
                                                    className="flex h-auto min-h-[40px] w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
                                                    onClick={() => setOpenServiceCombobox(!openServiceCombobox)}
                                                >
                                                    <div className="flex flex-wrap gap-1 ">
                                                        {formData.services && formData.services.length > 0 ? (
                                                            formData.services.map((serviceId) => {
                                                                const service = availableServices.find((s) => s._id === serviceId);
                                                                return service ? (
                                                                    <Badge key={serviceId} variant="secondary" className="mr-1 mb-1 hover:bg-secondary/80">
                                                                        {service.name}
                                                                        <button
                                                                            type="button"
                                                                            className="ml-1 rounded-full outline-none ring-offset-background focus:ring-2 focus:ring-ring focus:ring-offset-2"
                                                                            onKeyDown={(e) => {
                                                                                if (e.key === "Enter") {
                                                                                    e.stopPropagation();
                                                                                    const newServices = formData.services?.filter((id) => id !== serviceId);
                                                                                    handleChange("services", newServices);
                                                                                }
                                                                            }}
                                                                            onMouseDown={(e) => {
                                                                                e.preventDefault();
                                                                                e.stopPropagation();
                                                                            }}
                                                                            onClick={(e) => {
                                                                                e.preventDefault();
                                                                                e.stopPropagation();
                                                                                const newServices = formData.services?.filter((id) => id !== serviceId);
                                                                                handleChange("services", newServices);
                                                                            }}
                                                                        >
                                                                            <X className="h-3 w-3 text-muted-foreground hover:text-foreground" />
                                                                        </button>
                                                                    </Badge>
                                                                ) : null;
                                                            })
                                                        ) : (
                                                            <span className="text-muted-foreground">Select services...</span>
                                                        )}
                                                    </div>
                                                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                                </div>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-[400px] p-0">
                                                <Command>
                                                    <CommandInput placeholder="Search service..." />
                                                    <CommandList>
                                                        <CommandEmpty>No service found.</CommandEmpty>
                                                        <CommandGroup>
                                                            {availableServices.map((service) => (
                                                                <CommandItem
                                                                    key={service._id}
                                                                    value={service.name}
                                                                    onSelect={() => {
                                                                        const currentServices = formData.services || [];
                                                                        const isSelected = currentServices.includes(service._id);
                                                                        let newServices;
                                                                        if (isSelected) {
                                                                            newServices = currentServices.filter((id) => id !== service._id);
                                                                        } else {
                                                                            newServices = [...currentServices, service._id];
                                                                        }
                                                                        handleChange("services", newServices);
                                                                    }}
                                                                >
                                                                    <Check
                                                                        className={cn(
                                                                            "mr-2 h-4 w-4",
                                                                            formData.services?.includes(service._id)
                                                                                ? "opacity-100"
                                                                                : "opacity-0"
                                                                        )}
                                                                    />
                                                                    {service.name}
                                                                </CommandItem>
                                                            ))}
                                                        </CommandGroup>
                                                    </CommandList>
                                                </Command>
                                            </PopoverContent>
                                        </Popover>
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="gender">Gender</Label>
                                        <Select
                                            value={formData.gender || "Prefer not to say"}
                                            onValueChange={(val) => handleChange("gender", val)}
                                        >
                                            <SelectTrigger className="w-full">
                                                <SelectValue placeholder="Select gender" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="Male">Male</SelectItem>
                                                <SelectItem value="Female">Female</SelectItem>
                                                <SelectItem value="Other">Other</SelectItem>
                                                <SelectItem value="Prefer not to say">Prefer not to say</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>

                                {/* Tags */}
                                <div className="space-y-2 mt-4">
                                    <Label htmlFor="tags">Tags</Label>
                                    <div className="border rounded-md p-2 min-h-[42px]  bg-muted/50 flex flex-wrap gap-2">
                                        {formData.tags?.map((tag, index) => (
                                            <Badge key={index} variant="secondary" className="gap-1">
                                                {tag}
                                                <X
                                                    className="h-3 w-3 cursor-pointer hover:text-destructive"
                                                    onClick={() => removeTag(tag)}
                                                />
                                            </Badge>
                                        ))}
                                        <input
                                            className="bg-transparent outline-none  flex-1 text-sm min-w-[120px]"
                                            placeholder="Choose a tags..."
                                            value={newTag}
                                            onChange={(e) => setNewTag(e.target.value)}
                                            onKeyDown={handleAddTag}
                                        />
                                    </div>
                                </div>

                                {/* Working Area Section */}
                                <div className="mt-4 pt-6">
                                    <h3 className="text-lg font-medium mb-4">Working Area</h3>

                                    <div className="grid grid-cols-2 gap-6">
                                        <div className="space-y-2">
                                            <Label>Zone</Label>
                                            <Select
                                                value={formData.zone || ""}
                                                onValueChange={(val) => handleChange("zone", val)}
                                            >
                                                <SelectTrigger className="w-full">
                                                    <SelectValue placeholder="Select Zone" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {serviceAreas.length === 0 ? (
                                                        <SelectItem value="no-areas" disabled>
                                                            No service areas available
                                                        </SelectItem>
                                                    ) : (
                                                        serviceAreas.map((area) => (
                                                            <SelectItem key={area._id} value={area.name}>
                                                                {area.name}
                                                            </SelectItem>
                                                        ))
                                                    )}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Zip Code</Label>
                                            <Textarea
                                                value={zipCodesText}
                                                onChange={handleZipCodeChange}
                                                className="h-24 font-mono text-xs"
                                                placeholder="Enter zip codes separated by commas..."
                                            />
                                        </div>
                                    </div>

                                    {/* Toggles */}
                                    <div className="space-y-4 mt-6 max-w-md">
                                        <div className="flex items-center space-x-2">
                                            <Switch
                                                id="timesheet"
                                                checked={formData.timesheetEnabled}
                                                onCheckedChange={(c) => handleChange("timesheetEnabled", c)}
                                            />
                                            <Label htmlFor="timesheet" className="font-normal">Timesheet Option For Teach.</Label>
                                        </div>
                                        <div className="flex items-center space-x-2">
                                            <Switch
                                                id="booking"
                                                checked={formData.bookingEnabled}
                                                onCheckedChange={(c) => handleChange("bookingEnabled", c)}
                                            />
                                            <Label htmlFor="booking" className="font-normal">Enable Booking</Label>
                                        </div>
                                        <div className="flex items-center space-x-2">
                                            <Switch
                                                id="availability"
                                                checked={formData.availabilityEnabled}
                                                onCheckedChange={(c) => handleChange("availabilityEnabled", c)}
                                            />
                                            <Label htmlFor="availability" className="font-normal">Enable Availability</Label>
                                        </div>
                                        <div className="flex items-center space-x-2">
                                            <Switch
                                                id="technicianStatus"
                                                checked={formData.isTechnicianActive}
                                                onCheckedChange={(c) => handleChange("isTechnicianActive", c)}
                                            />
                                            <Label htmlFor="technicianStatus" className="font-normal">Technician Status</Label>
                                        </div>
                                    </div>

                                    {/* Role Dropdown */}
                                    <div className="space-y-2 mt-6">
                                        <Label>Role</Label>
                                        <Select
                                            value={(formData.customRoleId as string) || ""}
                                            onValueChange={(val) => handleChange("customRoleId", val)}
                                        >
                                            <SelectTrigger className="w-full">
                                                <SelectValue placeholder="Select a role" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {roles.map((role) => (
                                                    <SelectItem key={role._id} value={role._id}>
                                                        {role.name}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>



                                </div>

                                <div className="mt-8 flex justify-end">
                                    <Button type="submit" disabled={loading || isUploading} className="w-32">
                                        {(loading || isUploading) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                        {loading || isUploading ? "Saving..." : "Save"}
                                    </Button>
                                </div>
                            </form>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="bookings">
                    <Card>
                        <CardHeader>
                            <CardTitle>Bookings</CardTitle>
                            <CardDescription>View and manage technician bookings</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <UserBookings />
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="availability">
                    <Card>
                        <CardHeader>
                            <CardTitle>Availability</CardTitle>
                            <CardDescription>Manage weekly working hours</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <UserAvailability
                                availability={formData.availability}
                                onChange={(newSchedule) => handleChange("availability", newSchedule)}
                                onSave={() => onSave(formData)}
                                loading={loading}
                            />
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="offtime">
                    <Card>
                        <CardHeader>
                            <div className="flex justify-between items-center">

                                <div className="flex flex-col gap-2">
                                    <CardTitle>Off Time</CardTitle>
                                    <CardDescription>Manage technician off-time requests</CardDescription>
                                </div>
                                <Button>Add Break</Button>
                            </div>

                        </CardHeader>
                        <CardContent>
                            <UserOffTime />
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="security">
                    <Card>
                        <CardHeader>
                            <CardTitle>Security</CardTitle>
                            <CardDescription>Update password and security settings</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <UserSecurity onSave={(pass) => onSave({ password: pass })} />
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="review">
                    <Card>
                        <CardHeader>
                            <CardTitle>Reviews</CardTitle>
                            <CardDescription>Customer reviews and ratings</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <UserReviews
                                reviews={formData.reviews || []}
                                onSave={(newReview) => handleChange("reviews", [...(formData.reviews || []), newReview])}
                            />
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
