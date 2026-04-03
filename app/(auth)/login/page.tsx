"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import Link from "next/link";
import { zodResolver } from "@hookform/resolvers/zod";
import { loginSchema, type LoginInput } from "./schema";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form";
import { Loader2 } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sourceSubdomain = searchParams.get("subdomain") || "";
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const getDashboardPathByRole = (role?: string) => {
    if (role === "contact") return "/dashboard/client-bookings";
    // company_admin / super_admin / company_user / employee default to main dashboard
    return "/dashboard";
  };

  const form = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  async function onSubmit(values: LoginInput) {
    setLoading(true);
    setError(""); // Clear previous errors


    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...values,
          // Pass through originating subdomain (if any) so backend
          // can associate this login with the correct company contacts
          sourceSubdomain: sourceSubdomain || undefined,
        }),
        credentials: "include", // Important for cookies
      });


      const data = await res.json();

      if (!res.ok) {
        // Handle API errors
        const field = data.field as keyof LoginInput | undefined;
        if (field) {
          form.setError(field, { message: data.error });
        } else {
          setError(data.error || "Login failed");
        }
        return;
      }

      // SUCCESS: ensure session is readable before navigating, then route by role.
      // Using hard navigation avoids client-side race conditions with freshly set cookies.
      const meRes = await fetch("/api/auth/me", {
        credentials: "include",
        cache: "no-store",
      });
      const meData = await meRes.json().catch(() => ({}));
      const role = meData?.user?.role as string | undefined;
      const nextPath = getDashboardPathByRole(role);
      window.location.assign(nextPath);
    } catch (err) {
      console.error("Login fetch error:", err);
      setError("Network error - please try again");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      {/* Left panel – form */}
      <div className="flex flex-1 items-center justify-center px-8 lg:px-20">
        <div className="w-full max-w-md">
          {/* Logo */}
          <div className="mb-16 flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-black text-white text-xl font-semibold">
              m
            </div>
            <span className="text-xl font-semibold tracking-tight text-foreground">GreenFrog.</span>
          </div>

          <Button asChild variant="outline" className="mt-4 h-11 w-full rounded-lg">
                <Link href="/">Go To Website</Link>
              </Button>

          <Card className="border-none shadow-none bg-transparent p-0">
            <CardHeader className="px-0 pb-6 pt-0">
              <CardTitle className="text-3xl font-semibold text-foreground">
                Welcome back
              </CardTitle>
              <CardDescription className="mt-1 text-base text-muted-foreground">
                Welcome back! Please enter your details
              </CardDescription>
            </CardHeader>
            <CardContent className="px-0 pt-0">
              {error && (
                <div className="mb-4 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
                  {error}
                </div>
              )}

              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-medium text-foreground">
                          Email
                        </FormLabel>
                        <FormControl>
                          <Input
                            type="email"
                            placeholder="Enter your email"
                            className="h-11 rounded-lg border border-input bg-background text-sm text-foreground placeholder:text-muted-foreground"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-medium text-foreground">
                          Password
                        </FormLabel>
                        <FormControl>
                          <Input
                            type="password"
                            placeholder="Enter your password"
                            className="h-11 rounded-lg border border-input bg-background text-sm text-foreground placeholder:text-muted-foreground"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Remember / Forgot row */}
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <label className="flex items-center gap-2">
                      <Checkbox className="h-3.5 w-3.5" />
                      <span>Remember for 30 Days</span>
                    </label>
                    <Link
                      href="/forgot-password"
                      className="text-xs font-medium text-muted-foreground hover:text-foreground"
                    >
                      Forgot password
                    </Link>
                  </div>

                  {/* Primary sign in */}
                  <Button
                    type="submit"
                    className="mt-1 h-11 w-full rounded-lg bg-primary text-sm font-semibold text-secondary hover:bg-primary/90"
                    disabled={loading}
                  >
                    {loading && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    {loading ? "Signing in..." : "Sign in"}
                  </Button>

                  
                </form>
              </Form>

              {/* Bottom sign up text */}
              <p className="mt-8 text-center text-xs text-foreground">
                Don&apos;t have an account?
                <Link
                  href="/signup"
                  className="ml-1 text-xs font-medium text-foreground underline decoration-zinc-400 decoration-2 underline-offset-[6px]"
                >
                  Sign up for free
                </Link>
              </p>

              
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Right panel – illustration */}
      <div className="hidden w-1/2 items-center justify-center bg-[#e6e7f0] lg:flex">
        <div className="relative flex h-[70%] w-[70%] items-center justify-center rounded-t-full bg-[#f6dcd5]">
          <div className="absolute bottom-10 h-1.5 w-40 rounded-full bg-[#c9cbd6]" />
          <div className="relative -mt-24 flex flex-col items-center">
            {/* Simple hand silhouette using a tall rounded div */}
            <div className="mb-[-32px] h-44 w-20 rounded-full bg-[#d0d1da]" />
            {/* Clock */}
            <div className="flex h-40 w-40 items-center justify-center rounded-full bg-[#C7FF3D] shadow-lg">
              <div className="relative h-28 w-28 rounded-full border border-black/20">
                {/* Hour hand */}
                <div className="absolute left-1/2 top-1/2 h-10 w-[2px] -translate-x-1/2 -translate-y-full origin-bottom bg-black" />
                {/* Minute hand */}
                <div className="absolute left-1/2 top-1/2 h-12 w-[2px] -translate-x-1/2 -translate-y-full origin-bottom rotate-45 bg-black" />
                {/* Center dot */}
                <div className="absolute left-1/2 top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-black" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
