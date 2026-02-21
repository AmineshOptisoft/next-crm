"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

interface UserSecurityProps {
  onSave: (password: string) => void;
  userEmail: string;
  companyId: string;
  firstName?: string;
  lastName?: string;
}

export function UserSecurity({
  onSave,
  userEmail,
  companyId,
  firstName,
  lastName,
}: UserSecurityProps) {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }
    if (password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }

    setIsSaving(true);
    try {
      // Save the new password
      onSave(password);

      // Send password reset confirmation email (non-blocking, best-effort)
      if (userEmail && companyId) {
        fetch("/api/users/send-password-reset-email", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: userEmail,
            companyId,
            firstName: firstName || "",
            lastName: lastName || "",
          }),
        })
          .then((res) => res.json())
          .then((data) => {
            if (data.sent) {
              console.log(
                `[Password Reset] Confirmation email sent to ${userEmail}`
              );
            } else {
              console.warn(
                `[Password Reset] Email not sent: ${data.error}`
              );
            }
          })
          .catch((err) => {
            console.error("[Password Reset] Failed to send email:", err);
          });
      }

      setPassword("");
      setConfirmPassword("");
      toast.success("Password saved successfully");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            placeholder="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="confirmPassword">Confirm Password</Label>
          <Input
            id="confirmPassword"
            type="password"
            placeholder="confirm password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
          />
        </div>
      </div>
      <div className="flex justify-end">
        <Button
          onClick={handleSave}
          disabled={!password || !confirmPassword || isSaving}
          className="w-24"
        >
          {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Save
        </Button>
      </div>
    </div>
  );
}
