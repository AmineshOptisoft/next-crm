"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Globe2, Plus, Save } from "lucide-react";
import { toast } from "sonner";
import type { Company } from "@/components/company-settings/types";

type Props = {
  company: Company | null;
  mutateSettings: (data?: any, opts?: any) => Promise<any>;
};

export function CompanySubdomainSettings({ company, mutateSettings }: Props) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const [subdomain, setSubdomain] = useState(company?.subdomain || "");
  const [template, setTemplate] = useState<"templateA" | "templateB">(
    (company?.publicTemplate as any) || "templateA"
  );

  const sites = useMemo(
    () => {
      if (company?.publicSites && company.publicSites.length > 0) {
        return company.publicSites;
      }

      if (company?.subdomain) {
        return [
          {
            subdomain: company.subdomain,
            template: (company.publicTemplate as any) || "templateA",
          },
        ];
      }

      return [] as { subdomain: string; template: "templateA" | "templateB" }[];
    },
    [company]
  );

  const baseUrl = useMemo(
    () => (process.env.NEXT_PUBLIC_APP_URL || "").replace(/\/+$/, ""),
    []
  );

  const previewUrl = useMemo(() => {
    if (!subdomain) return "";
    if (!baseUrl) return `http://YOUR-IP:3000/${subdomain}`;
    return `${baseUrl}/${subdomain}`;
  }, [baseUrl, subdomain]);

  const openForEdit = () => {
    setSubdomain(company?.subdomain || "");
    setTemplate(((company?.publicTemplate as any) as "templateA" | "templateB") || "templateA");
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!subdomain) {
      toast.error("Subdomain is required");
      return;
    }

    setSaving(true);
    try {
      const normalized = subdomain.toLowerCase().trim();

      // Build updated list of public sites
      const currentSites =
        (company?.publicSites as { subdomain: string; template: "templateA" | "templateB" }[]) ||
        [];

      const existingIndex = currentSites.findIndex((s) => s.subdomain === normalized);
      let updatedSites: { subdomain: string; template: "templateA" | "templateB" }[];

      if (existingIndex >= 0) {
        updatedSites = currentSites.map((s, idx) =>
          idx === existingIndex ? { ...s, template } : s
        );
      } else {
        updatedSites = [
          ...currentSites,
          {
            subdomain: normalized,
            template,
          },
        ];
      }

      const body = {
        subdomain: normalized,
        publicTemplate: template,
        publicSites: updatedSites,
      };

      const response = await fetch("/api/company/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => null);
        toast.error(error?.error || "Failed to save subdomain");
        return;
      }

      const updated = await response.json();
      await mutateSettings(updated, { revalidate: false });
      toast.success("Subdomain saved");
      setDialogOpen(false);
    } catch (err) {
      console.error("Error saving subdomain", err);
      toast.error("Unexpected error while saving subdomain");
    } finally {
      setSaving(false);
    }
  };

  const currentTemplateLabel =
    company?.publicTemplate === "templateB" ? "Minimal booking page" : "Modern service landing";

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Sub Domain</CardTitle>
          <CardDescription>
            Manage the public URL for your company and choose which template visitors see.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Globe2 className="h-4 w-4 text-primary" />
                <span>Public URL</span>
              </div>
              {sites.length > 0 ? (
                <div className="text-sm text-muted-foreground">
                  <div className="space-y-2">
                    <div className="font-medium">Configured subdomains</div>
                    <div className="space-y-1 text-xs">
                      {sites.map((site) => (
                        <div
                          key={site.subdomain}
                          className="flex flex-wrap items-center gap-1.5"
                        >
                          <code className="rounded bg-muted px-1.5 py-0.5 text-[11px]">
                            {site.subdomain}
                          </code>
                          <span className="text-muted-foreground">
                            –{" "}
                            {site.template === "templateB"
                              ? "Minimal booking page"
                              : "Modern service landing"}
                          </span>
                        </div>
                      ))}
                    </div>
                    {subdomain && (
                      <div className="mt-1 text-xs">
                        Latest URL:{" "}
                        <code className="rounded bg-muted px-1 py-0.5 text-[11px]">
                          {previewUrl || `http://YOUR-IP:3000/${subdomain}`}
                        </code>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No subdomain is configured yet. Click &quot;Add new&quot; to create one.
                </p>
              )}
            </div>
            <Button size="sm" onClick={openForEdit}>
              <Plus className="mr-1 h-4 w-4" />
              Add new
            </Button>
          </div>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Configure public website</DialogTitle>
            <DialogDescription>
              Set the subdomain and choose which template to use for your public site.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="subdomain-input">Subdomain</Label>
              <Input
                id="subdomain-input"
                value={subdomain}
                onChange={(e) => setSubdomain(e.target.value.toLowerCase().trim())}
                placeholder="your-business"
              />
              <p className="text-xs text-muted-foreground">
                For local testing, your public URL will look like{" "}
                <code className="rounded bg-muted px-1 py-0.5 text-[11px]">
                  {previewUrl || "http://YOUR-IP:3000/your-business"}
                </code>
                . When you deploy, you can point a real domain to this app.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="publicTemplate-select">Website Template</Label>
              <Select
                value={template}
                onValueChange={(value) => setTemplate(value as "templateA" | "templateB")}
              >
                <SelectTrigger id="publicTemplate-select" className="w-full" >
                  <SelectValue placeholder="Choose a template" />
                </SelectTrigger>
                <SelectContent className="z-500" position="popper" sideOffset={5}>
                  <SelectItem value="templateA">Modern service landing</SelectItem>
                  <SelectItem value="templateB">Minimal booking page</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Each template has a different layout, but they all use your company information.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button type="button" onClick={handleSave} disabled={saving}>
              {saving && <Save className="mr-1 h-4 w-4 animate-spin" />}
              {saving ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

