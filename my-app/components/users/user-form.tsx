"use client";

import { useState } from "react";
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
import { X, Upload } from "lucide-react";

import { UserBookings } from "./user-bookings";
import { UserAvailability } from "./user-availability";
import { UserSecurity } from "./user-security";
import { UserReviews } from "./user-reviews";

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
  isActive: boolean;
  
  // Working Area
  zone?: string;
  workingZipCodes?: string[]; // stored as array
  timesheetEnabled?: boolean;
  bookingEnabled?: boolean;
  availabilityEnabled?: boolean;
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
  });
  const [newTag, setNewTag] = useState("");
  // Local state for zip codes area to handle text input
  const [zipCodesText, setZipCodesText] = useState(user.workingZipCodes?.join(", ") || "");

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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
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
            <TabsTrigger value="security">Security</TabsTrigger>
            <TabsTrigger value="review">Review</TabsTrigger>
        </TabsList>

        <TabsContent value="details">
          <Card>
            <CardHeader>
                <div className="flex justify-between items-center">
                    <div>
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
                <form onSubmit={handleSubmit}>
                    {/* Name & Email */}
                    <div className="grid grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <Label htmlFor="name">Name</Label>
                            <Input 
                                id="name" 
                                defaultValue={`${formData.firstName} ${formData.lastName}`} 
                                disabled 
                                className="bg-muted"
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
                    </div>

                    {/* Contact & Keap ID (Removed Keap ID as requested) */}
                    <div className="grid grid-cols-1 gap-6 mt-4">
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
                            <Label htmlFor="state">State</Label>
                            <Input 
                                id="state" 
                                value={formData.state || ""}
                                    onChange={(e) => handleChange("state", e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                                <Label htmlFor="city">City</Label>
                                <Input 
                                id="city" 
                                value={formData.city || ""}
                                    onChange={(e) => handleChange("city", e.target.value)}
                            />
                        </div>
                    </div>
                        <div className="grid grid-cols-2 gap-6 mt-4">
                            <div className="space-y-2">
                            <Label htmlFor="zipCode">Zip code</Label>
                            <Input 
                                id="zipCode" 
                                value={formData.zipCode || ""}
                                    onChange={(e) => handleChange("zipCode", e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                                <Label htmlFor="country">Country</Label>
                                <Input 
                                id="country" 
                                value={formData.country || "USA"}
                                    onChange={(e) => handleChange("country", e.target.value)}
                            />
                        </div>
                    </div>

                    {/* Services & Gender */}
                    <div className="grid grid-cols-2 gap-6 mt-4">
                        <div className="space-y-2">
                                <Label>Services</Label>
                                <div className="border rounded-md p-2 bg-muted/50 min-h-[40px] flex items-center text-sm text-muted-foreground">
                                Deluxe First Time Cleaning, General First Time Cleaning...
                                </div>
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
                        <div className="border rounded-md p-2 min-h-[42px] flex flex-wrap gap-2">
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
                                className="bg-transparent outline-none flex-1 text-sm min-w-[120px]"
                                placeholder="Choose a tags..."
                                value={newTag}
                                onChange={(e) => setNewTag(e.target.value)}
                                onKeyDown={handleAddTag}
                            />
                        </div>
                    </div>

                    {/* Working Area Section */}
                    <div className="mt-8 border-t pt-6">
                        <h3 className="text-lg font-medium mb-4">Working Area</h3>
                        
                        <div className="grid grid-cols-2 gap-6">
                                <div className="space-y-2">
                                <Label>Zone</Label>
                                <Select 
                                    value={formData.zone || "San Diego"} 
                                    onValueChange={(val) => handleChange("zone", val)}
                                >
                                    <SelectTrigger className="w-full">
                                        <SelectValue placeholder="Select Zone" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="San Diego">San Diego</SelectItem>
                                        <SelectItem value="Los Angeles">Los Angeles</SelectItem>
                                        <SelectItem value="San Francisco">San Francisco</SelectItem>
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

                        {/* Role Radio */}
                        <div className="space-y-2 mt-6">
                            <Label>Role</Label>
                            <div className="flex gap-6 items-center">
                                <div className="flex items-center space-x-2">
                                    <input 
                                        type="radio" 
                                        id="role-staff" 
                                        name="staffRole" 
                                        value="Staff"
                                        checked={formData.staffRole === "Staff"}
                                        onChange={() => handleChange("staffRole", "Staff")}
                                        className="accent-primary h-4 w-4"
                                    />
                                    <Label htmlFor="role-staff" className="font-normal cursor-pointer">Staff</Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <input 
                                        type="radio" 
                                        id="role-trainee" 
                                        name="staffRole" 
                                        value="Trainee"
                                        checked={formData.staffRole === "Trainee"}
                                        onChange={() => handleChange("staffRole", "Trainee")}
                                        className="accent-primary h-4 w-4"
                                    />
                                    <Label htmlFor="role-trainee" className="font-normal cursor-pointer">Trainee</Label>
                                </div>
                            </div>
                        </div>

                        {/* Upload Image */}
                        <div className="space-y-2 mt-6">
                            <Label>Upload Image</Label>
                            <div className="flex gap-2">
                                <Button type="button" variant="outline" className="w-auto">
                                    Choose File
                                </Button>
                                <div className="border rounded-md px-3 py-2 flex-1 bg-muted/20 text-sm text-muted-foreground flex items-center">
                                    {formData.avatarUrl ? "Image selected" : "No file chosen"}
                                </div>
                            </div>
                        </div>

                    </div>

                        <div className="mt-8 flex justify-end">
                        <Button type="submit" disabled={loading} className="w-32">
                            {loading ? "Saving..." : "Save"}
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
                <UserAvailability />
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
