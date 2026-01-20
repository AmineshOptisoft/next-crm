"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface UserSecurityProps {
  onSave: (password: string) => void;
}

export function UserSecurity({ onSave }: UserSecurityProps) {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      alert("Passwords do not match");
      return;
    }
    if (password.length < 6) {
        alert("Password must be at least 6 characters");
        return;
    }
    onSave(password);
    setPassword("");
    setConfirmPassword("");
    alert("Password saved!"); 
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-6">
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
          disabled={!password || !confirmPassword}
          className="w-24"
        >
          Save
        </Button>
      </div>
    </div>
  );
}
