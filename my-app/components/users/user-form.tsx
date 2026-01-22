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
import { X, Upload } from "lucide-react";

import { UserBookings } from "./user-bookings";
import { UserAvailability } from "./user-availability";
import { UserOffTime } from "./user-off-time";
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
  customRoleId?: string | { _id: string; name: string };
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
    // Handle customRoleId being an object (populated) or string or undefined
    customRoleId: (user.customRoleId && typeof user.customRoleId === 'object') 
      ? (user.customRoleId as any)._id 
      : (user.customRoleId || ""), 
  });
  const [newTag, setNewTag] = useState("");
  const [roles, setRoles] = useState<{ _id: string; name: string }[]>([]);

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
    fetchRoles();
  }, []);
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
                    <div className="flex w-full justify-center items-center mb-6">
                        <div className="w-1/2">
                        {/* <Label className="mb-2 block text-center">Upload Image</Label> */}
                        <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 flex flex-col items-center justify-center text-center hover:bg-muted/50 transition-colors cursor-pointer group">
                             <input 
                                type="file" 
                                className="hidden" 
                                id="avatar-upload"
                                accept="image/png, image/jpeg"
                                onChange={(e) => {
                                    // Handle file upload logic here (currently just a UI mock)
                                    if(e.target.files?.[0]) {
                                       handleChange("avatarUrl", URL.createObjectURL(e.target.files[0]));
                                    }
                                }}
                            />
                            <Label htmlFor="avatar-upload" className="cursor-pointer flex flex-col items-center">
                                <div className="bg-muted p-4 rounded-full mb-3 group-hover:scale-110 transition-transform">
                                    <Upload className="h-6 w-6 text-muted-foreground" />
                                </div>
                                <span className="text-sm font-medium mb-1">Click to upload or drag & drop</span>
                                <span className="text-xs text-muted-foreground">Best: Square JPG/PNG</span>
                            </Label>
                        </div>
                         {formData.avatarUrl && (
                            <div className="mt-2 text-sm text-green-600 flex justify-center items-center gap-2">
                                <span className="h-2 w-2 rounded-full bg-green-600"></span>
                                Image selected
                            </div>
                         )}
                    </div></div>
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
                                <Input 
                                id="country" 
                                value={formData.country}
                                    onChange={(e) => handleChange("country", e.target.value)}
                            />
                        </div>
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
