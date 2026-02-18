"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DateTimePicker } from "@/components/ui/date-time-picker";
import { format } from "date-fns";
import { X } from "lucide-react";

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
            status: "APPROVED",
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
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px] p-0 gap-0 overflow-hidden">
                <DialogHeader className=" p-4 text-white flex flex-row items-center justify-between space-y-0">
                    <DialogTitle className="text-lg font-semibold">
                        Add Break
                    </DialogTitle>
                    
                </DialogHeader>

                <div className="p-6 grid gap-4">
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
                            <SelectTrigger>
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

                <DialogFooter className="flex justify-center sm:justify-center gap-2 p-6 pt-0">
                    <Button 
                        // variant="destructive" 
                        onClick={() => onOpenChange(false)} 
                        className="min-w-[100px] bg-zinc-900 hover:bg-zinc-800 border text-white"
                    >
                        Cancel
                    </Button>
                    <Button 
                        onClick={handleSave} 
                        className=" hover:bg-zinc-300 text-black min-w-[100px]"
                        disabled={loading}
                    >
                        {loading ? "Saving..." : "Save"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
