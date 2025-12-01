"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export default function VerifyPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [status, setStatus] = useState<"loading" | "success" | "error">(
    "loading"
  );
  const [message, setMessage] = useState("");
  const [debugInfo, setDebugInfo] = useState("");

  useEffect(() => {
    const token = searchParams.get("token");
    const email = searchParams.get("email");

    console.log("Verify params:", {
      token: token?.slice(0, 10) + "...",
      email,
    }); // Debug log

    if (!token || !email) {
      setStatus("error");
      setMessage("Invalid verification link - missing token or email");
      setDebugInfo(`Token: ${!!token}, Email: ${!!email}`);
      return;
    }

    const verifyUrl = `/api/auth/verify?token=${token}&email=${encodeURIComponent(
      email
    )}`;

    console.log("Calling verify API:", verifyUrl); // Debug log

    fetch(verifyUrl, {
      method: "GET",
      credentials: "include", // Important: include cookies if needed
    })
      .then(async (res) => {
        console.log("Verify response status:", res.status); // Debug log
        const data = await res.json();
        console.log("Verify response data:", data); // Debug log

        if (res.ok) {
          setStatus("success");
          setMessage(
            "✅ Account verified successfully! Redirecting to login..."
          );
          setTimeout(() => {
            router.push("/login");
            router.refresh(); // Refresh to clear any stale state
          }, 2000);
        } else {
          setStatus("error");
          setMessage(`❌ ${data.error || "Verification failed"}`);
        }
      })
      .catch((error) => {
        console.error("Verify fetch error:", error); // Debug log
        setStatus("error");
        setMessage("❌ Network error - please try again");
      });
  }, [searchParams, router]);

  if (status === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted/30">
        <div className="rounded-md border bg-card px-8 py-6 text-center">
          <div className="i-mdi-loading w-8 h-8 animate-spin mx-auto mb-4 text-primary" />
          <h1 className="mb-2 text-xl font-semibold">Verifying Email...</h1>
          <p>Please wait while we verify your account.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30">
      <div className="rounded-md border bg-card px-8 py-8 max-w-md w-full mx-4">
        <h1 className="mb-4 text-2xl font-semibold text-center">
          {status === "success" ? "✅ Verified!" : "❌ Verification Failed"}
        </h1>
        <p className="mb-6 text-center text-muted-foreground">{message}</p>

        {status === "error" && (
          <div className="space-y-2 mb-6">
            <details className="text-xs bg-muted p-3 rounded-md">
              <summary className="cursor-pointer font-medium mb-1">
                Debug Info
              </summary>
              <pre className="text-xs overflow-auto max-h-32">{debugInfo}</pre>
            </details>
            <Button
              onClick={() => router.push("/login")}
              className="w-full"
              variant="outline"
            >
              Go to Login
            </Button>
          </div>
        )}

        {status === "success" && (
          <Button onClick={() => router.push("/login")} className="w-full">
            Go to Login
          </Button>
        )}
      </div>
    </div>
  );
}
