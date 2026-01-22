"use client";

import { useState } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

export function SettingsProfile() {
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    const formData = new FormData(e.currentTarget);
    // TODO: call your API to update profile
    setTimeout(() => setSaving(false), 800);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
          <CardDescription>
            This is how others will see you on the site.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="username">Username</Label>
            <Input id="username" name="username" defaultValue="shadcn" />
            <p className="text-xs text-muted-foreground">
              This is your public display name. You can only change this once every 30 days.
            </p>
          </div>

          <Separator />

          <div className="space-y-1">
            <Label htmlFor="primaryEmail">Email</Label>
            <Input
              id="primaryEmail"
              name="primaryEmail"
              type="email"
              defaultValue="user@example.com"
            />
            <p className="text-xs text-muted-foreground">
              You can manage verified email addresses in your email settings.
            </p>
          </div>

          <Separator />

          <div className="space-y-1">
            <Label htmlFor="bio">Bio</Label>
            <Textarea
              id="bio"
              name="bio"
              defaultValue="I own a computer."
              rows={3}
            />
            <p className="text-xs text-muted-foreground">
              You can @mention other users and organizations to link to them.
            </p>
          </div>

          <Separator />

          <div className="space-y-2">
            <Label>URLs</Label>
            <Input
              name="url1"
              defaultValue="https://shadcn.com"
              placeholder="https://example.com"
              className="mb-2"
            />
            <Input
              name="url2"
              defaultValue="http://twitter.com/shadcn"
              placeholder="https://twitter.com/username"
            />
          </div>
        </CardContent>
        <CardFooter>
          <Button type="submit" disabled={saving}>
            {saving ? "Saving..." : "Update profile"}
          </Button>
        </CardFooter>
      </Card>
    </form>
  );
}
