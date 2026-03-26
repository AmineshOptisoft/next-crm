"use client";

import { useState } from "react";
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetFooter,
    SheetHeader,
    SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DateTimePicker } from "@/components/ui/date-time-picker";
import { format } from "date-fns";
import { Loader2 } from "lucide-react";

interface AddBreakDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSave: (data: any) => void;
    loading?: boolean;
}

export function AddBreakDialog({ open, onOpenChange, onSave, loading }: AddBreakDialogProps) {
    const [startDate, setStartDate] = useState<Date>();
    const [endDate, setEndDate] = useState<Date>();
    const [reason, setReason] = useState<string>("");
    const [notes, setNotes] = useState<string>("");

    const handleSave = () => {
        if (!startDate || !endDate || !reason) {
            // Basic validation
            return;
        }

        const data = {
            startDate: startDate, // Send Date object for DB
            startTime: format(startDate, "hh:mm a"),
            endDate: endDate,     // Send Date object for DB
            endTime: format(endDate, "hh:mm a"),
            reason,
            status: "PENDING",
            notes
        };

        onSave(data);
        // Assuming parent handles closing after success, 
        // but if we are just optimistic:
        /*
        onOpenChange(false);
        setStartDate(undefined);
        setEndDate(undefined);
        setReason("");
        setNotes("");
        */
    };

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent side="right" className="sm:max-w-5xl w-full p-0 flex flex-col">
                <SheetHeader className="p-4 border-b gap-0">
                    <SheetTitle className="text-lg font-semibold">
                        Add Break
                    </SheetTitle>
                    <SheetDescription>Add technician off-time details and save.</SheetDescription>
                </SheetHeader>

                <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6">
                    {/* Date & Time Selection */}
                     <div className="flex flex-col gap-2">
                        <Label className=" font-semibold">Select Date & Time</Label>
                        <div className="flex flex-col sm:flex-row gap-2">
                             <div className="flex-1">
                                <Label className="text-xs text-muted-foreground mb-1 block">Start</Label>
                                <DateTimePicker 
                                    date={startDate} 
                                    setDate={setStartDate} 
                                />
                             </div>
                             <div className="flex-1">
                                <Label className="text-xs text-muted-foreground mb-1 block">End</Label>
                                <DateTimePicker 
                                    date={endDate} 
                                    setDate={setEndDate} 
                                />
                             </div>
                        </div>
                    </div>

                    {/* Off Time Request */}
                    <div className="flex flex-col gap-2">
                        <Label className="text-muted-foreground">Select Off Time Request</Label>
                        <Select onValueChange={setReason} value={reason}>
                            <SelectTrigger className="w-full">
                                <SelectValue placeholder="Select Off Time Request" />
                            </SelectTrigger>
                            <SelectContent className="z-[100]" position="popper">
                                <SelectItem value="Sick Time">Sick Time</SelectItem>
                                <SelectItem value="Unrequested Absence">Unrequested Absence</SelectItem>
                                <SelectItem value="Vacation Time">Vacation Time</SelectItem>
                                <SelectItem value="Unpaid Time Off">Unpaid Time Off</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Request Note */}
                    <div className="flex flex-col gap-2">
                        <Label className="text-muted-foreground">Request Note</Label>
                        <Textarea 
                            placeholder="Notes" 
                            className="min-h-[100px]"
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                        />
                    </div>
                </div>

                <SheetFooter className="p-4 border-t bg-muted/30 flex items-center flex-row justify-end gap-2">
                    <Button className="min-w-[100px]"
                        type="button"
                        variant="outline"
                        onClick={() => onOpenChange(false)} 
                    >
                        Cancel
                    </Button>
                    <Button 
                        className="min-w-[100px]"
                        type="button"
                        onClick={handleSave} 
                        disabled={loading}
                    >
                        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {loading ? "Saving..." : "Save"}
                    </Button>
                </SheetFooter>
            </SheetContent>
        </Sheet>
    );
}
