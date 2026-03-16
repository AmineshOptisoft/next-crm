"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form";
import { Loader2 } from "lucide-react";
import Link from "next/link";

const emailSchema = z.object({
  email: z.string().email("Enter a valid email"),
});

const otpSchema = z.object({
  otp: z
    .string()
    .min(6, "OTP must be 6 digits")
    .max(6, "OTP must be 6 digits"),
});

const passwordSchema = z
  .object({
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords do not match",
  });

type EmailInput = z.infer<typeof emailSchema>;
type OtpInput = z.infer<typeof otpSchema>;
type PasswordInput = z.infer<typeof passwordSchema>;

type Step = "email" | "otp" | "password" | "done";

export default function ForgotPasswordPage() {
  const [step, setStep] = useState<Step>("email");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [email, setEmail] = useState<string>("");
  const [otp, setOtp] = useState<string>("");

  const emailForm = useForm<EmailInput>({
    resolver: zodResolver(emailSchema),
    defaultValues: { email: "" },
  });

  const otpForm = useForm<OtpInput>({
    resolver: zodResolver(otpSchema),
    defaultValues: { otp: "" },
  });

  const passwordForm = useForm<PasswordInput>({
    resolver: zodResolver(passwordSchema),
    defaultValues: { password: "", confirmPassword: "" },
  });

  async function handleSendOtp(values: EmailInput) {
    setLoading(true);
    setError(null);
    setInfo(null);
    try {
      const res = await fetch("/api/auth/password-reset/request-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: values.email }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to send OTP");
        return;
      }
      setEmail(values.email);
      setStep("otp");
      setInfo("If this email exists in our system, an OTP has been sent.");
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyOtp(values: OtpInput) {
    setLoading(true);
    setError(null);
    setInfo(null);
    try {
      const res = await fetch("/api/auth/password-reset/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp: values.otp }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Invalid OTP");
        return;
      }
      setOtp(values.otp);
      setStep("password");
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleSetPassword(values: PasswordInput) {
    setLoading(true);
    setError(null);
    setInfo(null);
    try {
      const res = await fetch("/api/auth/password-reset/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp, newPassword: values.password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to reset password");
        return;
      }
      setStep("done");
      setInfo("Password updated successfully. You can now log in with your new password.");
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen bg-[#f7f7fb]">
      <div className="flex flex-1 items-center justify-center px-8 lg:px-20">
        <div className="w-full max-w-md">
          <div className="mb-16 flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-black text-white text-xl font-semibold">
              m
            </div>
            <span className="text-xl font-semibold tracking-tight text-secondary">
              GreenFrog.
            </span>
          </div>

          <Card className="border-none shadow-none bg-transparent p-0">
            <CardHeader className="px-0 pb-6 pt-0">
              <CardTitle className="text-3xl font-semibold text-secondary">
                Forgot password
              </CardTitle>
              <CardDescription className="mt-1 text-base text-muted-foreground">
                {step === "email" && "Enter your email to receive a 6 digit OTP."}
                {step === "otp" && "Enter the 6 digit OTP sent to your email."}
                {step === "password" && "Enter your new password."}
                {step === "done" && "Your password has been reset."}
              </CardDescription>
            </CardHeader>
            <CardContent className="px-0 pt-0">
              {error && (
                <div className="mb-4 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
                  {error}
                </div>
              )}
              {info && (
                <div className="mb-4 rounded-md border border-emerald-300/50 bg-emerald-50 p-3 text-sm text-emerald-700">
                  {info}
                </div>
              )}

              {step === "email" && (
                <Form {...emailForm}>
                  <form
                    onSubmit={emailForm.handleSubmit(handleSendOtp)}
                    className="space-y-4"
                  >
                    <FormField
                      control={emailForm.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm font-medium text-secondary">
                            Email
                          </FormLabel>
                          <FormControl>
                            <Input
                              type="email"
                              placeholder="Enter your email"
                              className="h-11 rounded-lg border border-[#b6b6bd] bg-white text-sm text-secondary"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Button
                      type="submit"
                      className="mt-1 h-11 w-full rounded-lg bg-[#C7FF3D] text-sm font-semibold text-black hover:bg-[#b8f232]"
                      disabled={loading}
                    >
                      {loading && (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      )}
                      {loading ? "Sending OTP..." : "Send OTP"}
                    </Button>
                  </form>
                </Form>
              )}

              {step === "otp" && (
                <Form {...otpForm}>
                  <form
                    onSubmit={otpForm.handleSubmit(handleVerifyOtp)}
                    className="space-y-4"
                  >
                    <FormField
                      control={otpForm.control}
                      name="otp"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm font-medium text-secondary">
                            6 digit OTP
                          </FormLabel>
                          <FormControl>
                            <Input
                              type="text"
                              inputMode="numeric"
                              maxLength={6}
                              placeholder="Enter OTP"
                              className="h-11 rounded-lg border border-[#b6b6bd] bg-white text-sm tracking-[0.3em] text-center text-secondary"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Button
                      type="submit"
                      className="mt-1 h-11 w-full rounded-lg bg-[#C7FF3D] text-sm font-semibold text-black hover:bg-[#b8f232]"
                      disabled={loading}
                    >
                      {loading && (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      )}
                      {loading ? "Verifying..." : "Verify OTP"}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      className="h-11 w-full rounded-lg border border-[#b6b6bd] bg-white text-sm text-secondary"
                      disabled={loading}
                      onClick={() => {
                        setStep("email");
                        setError(null);
                        setInfo(null);
                        emailForm.reset();
                        otpForm.reset();
                      }}
                    >
                      Resend OTP
                    </Button>
                  </form>
                </Form>
              )}

              {step === "password" && (
                <Form {...passwordForm}>
                  <form
                    onSubmit={passwordForm.handleSubmit(handleSetPassword)}
                    className="space-y-4"
                  >
                    <FormField
                      control={passwordForm.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm font-medium text-secondary">
                            New password
                          </FormLabel>
                          <FormControl>
                            <Input
                              type="password"
                              placeholder="Enter new password"
                              className="h-11 rounded-lg border border-[#b6b6bd] bg-white text-sm text-secondary"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={passwordForm.control}
                      name="confirmPassword"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm font-medium">
                            Confirm password
                          </FormLabel>
                          <FormControl>
                            <Input
                              type="password"
                              placeholder="Confirm new password"
                              className="h-11 rounded-lg border border-[#b6b6bd] bg-white text-sm text-secondary"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Button
                      type="submit"
                      className="mt-1 h-11 w-full rounded-lg bg-[#C7FF3D] text-sm font-semibold text-black hover:bg-[#b8f232]"
                      disabled={loading}
                    >
                      {loading && (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      )}
                      {loading ? "Updating..." : "Update password"}
                    </Button>
                  </form>
                </Form>
              )}

              {step === "done" && (
                <div className="space-y-4">
                  <Button
                    asChild
                    className="mt-1 h-11 w-full rounded-lg bg-[#C7FF3D] text-sm font-semibold text-black hover:bg-[#b8f232]"
                  >
                    <Link href="/login">Back to login</Link>
                  </Button>
                </div>
              )}

              <p className="mt-8 text-center text-xs text-muted-foreground">
                Remember your password?
                <Link
                  href="/login"
                  className="ml-1 text-xs font-medium text-black underline decoration-[#C7FF3D] decoration-2 underline-offset-[6px]"
                >
                  Back to login
                </Link>
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="hidden w-1/2 items-center justify-center bg-[#e6e7f0] lg:flex">
        <div className="relative flex h-[70%] w-[70%] items-center justify-center rounded-t-full bg-[#f6dcd5]">
          <div className="absolute bottom-10 h-1.5 w-40 rounded-full bg-[#c9cbd6]" />
          <div className="relative -mt-24 flex flex-col items-center">
            <div className="mb-[-32px] h-44 w-20 rounded-full bg-[#d0d1da]" />
            <div className="flex h-40 w-40 items-center justify-center rounded-full bg-[#C7FF3D] shadow-lg">
              <div className="relative h-28 w-28 rounded-full border border-black/20">
                <div className="absolute left-1/2 top-1/2 h-10 w-[2px] -translate-x-1/2 -translate-y-full origin-bottom bg-black" />
                <div className="absolute left-1/2 top-1/2 h-12 w-[2px] -translate-x-1/2 -translate-y-full origin-bottom rotate-45 bg-black" />
                <div className="absolute left-1/2 top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-black" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

