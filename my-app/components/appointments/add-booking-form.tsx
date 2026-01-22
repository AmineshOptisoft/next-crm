"use client";

import { useEvents } from "@/context/events-context";
import { Sheet, SheetContent, SheetHeader, SheetFooter, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Badge } from "@/components/ui/badge";
import { X, Calendar as CalendarIcon, DollarSign, Clock, ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";
import { format } from "date-fns";

// Exact Accordion Item component from dashboard/contacts/[id]/page.tsx
function AccordionItem({ title, isOpen, onToggle, children }: any) {
    return (
        <div className="border rounded-md bg-card mb-2 overflow-hidden">
            <button
                type="button"
                onClick={onToggle}
                className="w-full flex items-center justify-between p-4 bg-card hover:bg-muted/50 transition-colors"
            >
                <span className="font-medium text-foreground">{title}</span>
                {isOpen ? <ChevronUp className="h-4 w-4 text-primary" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
            </button>
            {isOpen && (
                <div className="p-4 border-t bg-card animate-in slide-in-from-top-1 duration-200">
                    {children}
                </div>
            )}
        </div>
    );
}

export function AddBookingForm({ open, onOpenChange, initialData }: { open: boolean, onOpenChange: (open: boolean) => void, initialData?: { start: Date, end: Date } }) {
    const [userType, setUserType] = useState("new");
    const [sections, setSections] = useState({
        personal: true,
        service: false
    });

    const toggleSection = (key: keyof typeof sections) => {
        setSections(prev => ({ ...prev, [key]: !prev[key] }));
    };

    const startDate = initialData?.start ? format(initialData.start, "dd-MM-yyyy HH:mm") : "";
    const endDate = initialData?.end ? format(initialData.end, "dd-MM-yyyy HH:mm a") : "";

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent side="right" className="sm:max-w-2xl w-full p-0 flex flex-col z-[100]">
                {/* Standard Header from dashboard/contacts/page.tsx */}
                <SheetHeader className="p-4 border-b gap-0">
                    <div className="text-xl font-semibold">Add Manual Booking</div>
                    <SheetDescription>Enter appointment and customer details below.</SheetDescription>
                </SheetHeader>

                <div className="flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar">
                    {/* 1. Your Personal Details (merged with Appointment Details) */}
                    <AccordionItem
                        title="Your Personal Details"
                        isOpen={sections.personal}
                        onToggle={() => toggleSection('personal')}
                    >
                        <div className="space-y-6">
                            <RadioGroup defaultValue="new" className="flex gap-6" onValueChange={setUserType}>
                                <div className="flex items-center space-x-2">
                                    <RadioGroupItem value="new" id="new-user" />
                                    <Label htmlFor="new-user" className="cursor-pointer font-medium">New User</Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <RadioGroupItem value="existing" id="existing-user" />
                                    <Label htmlFor="existing-user" className="cursor-pointer font-medium">Existing User</Label>
                                </div>
                            </RadioGroup>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-1"><Label>Preferred Email</Label><Input placeholder="Enter email" /></div>
                                <div className="space-y-1"><Label>Preferred Password</Label><Input type="password" placeholder="Enter password" /></div>
                                <div className="space-y-1"><Label>First Name</Label><Input placeholder="First Name" /></div>
                                <div className="space-y-1"><Label>Last Name</Label><Input placeholder="Last Name" /></div>
                                <div className="space-y-1"><Label>Phone Number</Label><Input placeholder="Phone Number" /></div>
                                <div className="space-y-1"><Label>Zone</Label><Input placeholder="Zone" className="bg-muted" readOnly /></div>
                            </div>
                            <div className="space-y-1"><Label>Street Address</Label><Input placeholder="Street Address" /></div>
                            <div className="grid grid-cols-3 gap-4">
                                <div className="space-y-1"><Label>City</Label><Input placeholder="City" /></div>
                                <div className="space-y-1"><Label>State</Label>
                                    <Select>
                                        <SelectTrigger className="w-full"><SelectValue placeholder="Select" /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="California">California</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-1"><Label>Zip Code</Label><Input placeholder="Zip" /></div>
                            </div>

                            {/* Appointment Details Section inside Personal Details Accordion */}
                            <div className="pt-4 border-t space-y-4">
                                <div className="font-semibold text-foreground">Appointment Details</div>
                                <div className="space-y-4">
                                    <div className="space-y-1">
                                        <Label>Select Default Shipping Address</Label>
                                        <Select>
                                            <SelectTrigger className="w-full"><SelectValue placeholder="Select Default Shipping Address" /></SelectTrigger>
                                            <SelectContent><SelectItem value="default">Default Address</SelectItem></SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-1"><Label>Street Address</Label><Input placeholder="Street Address" /></div>
                                    <div className="grid grid-cols-3 gap-4">
                                        <div className="space-y-1"><Label>City</Label><Input placeholder="City" /></div>
                                        <div className="space-y-1"><Label>State</Label>
                                            <Select>
                                                <SelectTrigger className="w-full"><SelectValue placeholder="State" /></SelectTrigger>
                                                <SelectContent><SelectItem value="California">California</SelectItem></SelectContent>
                                            </Select>
                                        </div>
                                        <div className="space-y-1"><Label>Zip Code</Label><Input placeholder="Zip" /></div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </AccordionItem>

                    {/* 2. Choose Service Accordion */}
                    <AccordionItem
                        title="Choose Service"
                        isOpen={sections.service}
                        onToggle={() => toggleSection('service')}
                    >
                        <div className="space-y-4">
                            <div className="space-y-3">
                                <Label className="text-primary ">Choose Service</Label>
                                <RadioGroup defaultValue="cleaning" className="flex flex-wrap gap-6">
                                    <div className="flex items-center space-x-2">
                                        <RadioGroupItem value="cleaning" id="service-cleaning" />
                                        <Label htmlFor="service-cleaning" className="cursor-pointer">House Cleaning</Label>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <RadioGroupItem value="training" id="service-training" />
                                        <Label htmlFor="service-training" className="cursor-pointer">Training</Label>
                                    </div>
                                </RadioGroup>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <Button variant="outline" className="border-primary text-primary font-bold bg-primary/5">Once</Button>
                                <Button variant="outline" className="font-medium">Recurring</Button>
                            </div>

                            <div className="space-y-2">
                                <Label className="text-primary text-md mb-1">Sub Services</Label>
                                {/* Sub services placeholder */}
                            </div>

                            <div className="space-y-2">
                                <Label className="text-primary">• Addons</Label>
                                {/* Addons placeholder */}
                            </div>

                            <div className="space-y-2 pt-2">
                                <Label>Please Select Technician</Label>
                                <div className="flex flex-wrap gap-2 p-2 border rounded-md min-h-[42px] bg-white items-center">
                                    <Badge variant="secondary" className="flex items-center gap-1.5">
                                        Ricky Brown <X className="h-3 w-3 cursor-pointer opacity-50 hover:opacity-100" />
                                    </Badge>
                                    <div className="flex-1"></div>
                                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                                </div>
                            </div>
                        </div>
                    </AccordionItem>

                    {/* 3. Appointment Notes (Plain section below accordions) */}
                    <div className="space-y-2 mt-3">
                        <Label className="text-md ">Appointment Notes</Label>
                        <Textarea placeholder="Add any special notes here..." className="min-h-[100px] resize-none shadow-none" />
                    </div>

                    {/* Estimated Price Section (Standard styling) */}
                    <div className="p-4 border rounded-md bg-card space-y-6 shadow-sm">
                        <h3 className="font-semibold text-md decoration-2">Estimated Price</h3>

                        <div className="space-y-8">
                            <div className="grid grid-cols-2 gap-6 pb-6 border-b border-dashed mb-4">
                                <div className="space-y-2">
                                    <Label>
                                        <CalendarIcon className="h-3.5 w-3.5" />
                                        Start Date/Time
                                    </Label>
                                    <div className="relative">
                                        <Input value={startDate} readOnly className="pr-10" />
                                        <CalendarIcon className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label>
                                        <Clock className="h-3.5 w-3.5" />
                                        End Date/Time
                                    </Label>
                                    <div className="relative">
                                        <Input value={endDate} readOnly className="pr-10" />
                                        <Clock className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-4 mb-2">
                                <div className="space-y-1"><Label >Change Billed Amount</Label><div className="relative"><span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span><Input defaultValue="0" className="pl-7" /></div></div>
                                <div className="space-y-1"><Label>Total Discount</Label><div className="relative"><span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span><Input defaultValue="0" className="pl-7" /></div></div>
                                <div className="space-y-1"><Label>Total Discount Billed Amount</Label><div className="relative"><span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span><Input defaultValue="0" className="pl-7 bg-muted" readOnly /></div></div>
                                <div className="space-y-1"><Label>Change Billed Hours</Label><Input defaultValue="00:00" /></div>
                            </div>

                            <div className="pt-4 border-t border-dashed space-y-4">
                                <div className="flex justify-between items-center">
                                    <span className="text-md font-semibold">Estimated Billed Amount:</span>
                                    <span className="text-md font-bold">$0 to $0</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-md font-semibold">Estimated Billed Hours:</span>
                                    <span className="text-md font-bold">00:00 to 00:00</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Standard Footer from dashboard/contacts/page.tsx */}
                <SheetFooter className="p-4 border-t bg-muted/30 flex-col sm:flex-row gap-2 sm:items-center shrink-0">
                    <div className="flex-1 flex items-center gap-2">
                        <DollarSign className="h-5 w-5 text-primary" />
                        <span className="font-semibold text-lg">Price Per hour : $0.00</span>
                    </div>
                    <div className="flex gap-2 w-full sm:w-auto">
                        <Button variant="default">Booking</Button>
                        <Button variant="secondary">Save Quote</Button>
                        <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                    </div>
                </SheetFooter>
            </SheetContent>
        </Sheet>
    );
}
