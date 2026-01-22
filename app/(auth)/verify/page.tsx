"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

function VerifyPageContent() {
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

    if (!token || !email) {
      setStatus("error");
      setMessage("Invalid verification link - missing token or email");
      setDebugInfo(`Token present: ${!!token}, Email present: ${!!email}`);
      return;
    }

    const verifyUrl = `/api/auth/verify?token=${encodeURIComponent(
      token
    )}&email=${encodeURIComponent(email)}`;

    const mydata = async () => {
      const res = await fetch(verifyUrl, {
        method: "GET",
        credentials: "include",
      })
        .then(async (res) => {
          const data = await res.json();

          if (res.ok) {
            setStatus("success");
            setMessage(
              "Account verified successfully! Redirecting to login..."
            );
            setTimeout(() => {
              router.push("/login");
              router.refresh();
            }, 2000);
          } else {
            setStatus("error");
            setMessage(data.error || "Verification failed");
            setDebugInfo(JSON.stringify(data, null, 2));
          }
        })
        .catch((error) => {
          setStatus("error");
          setMessage("Network error - please try again");
          setDebugInfo(String(error));
        });
    };

    mydata();
  }, [searchParams, router]);

  if (status === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted/30">
        <div className="rounded-md border bg-card px-8 py-6 text-center">
          <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <h1 className="mb-2 text-xl font-semibold">Verifying email...</h1>
          <p className="text-sm text-muted-foreground">
            Please wait while we verify your account.
          </p>
        </div>
      </div>
    );
  }

  const isSuccess = status === "success";

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30">
      <div className="mx-4 w-full max-w-md rounded-md border bg-card px-8 py-8">
        <h1 className="mb-4 text-center text-2xl font-semibold">
          {isSuccess ? "Verified" : "Verification failed"}
        </h1>
        <p className="mb-6 text-center text-sm text-muted-foreground">
          {message}
        </p>

        {!isSuccess && (
          <div className="mb-6 space-y-2">
            <details className="rounded-md bg-muted p-3 text-xs">
              <summary className="mb-1 cursor-pointer font-medium">
                Debug info
              </summary>
              <pre className="max-h-32 overflow-auto whitespace-pre-wrap">
                {debugInfo || "No additional info"}
              </pre>
            </details>
            <Button
              onClick={() => router.push("/login")}
              className="w-full"
              variant="outline"
            >
              Go to login
            </Button>
          </div>
        )}

        {isSuccess && (
          <Button onClick={() => router.push("/login")} className="w-full">
            Go to login
          </Button>
        )}
      </div>
    </div>
  );
}

export default function VerifyPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-muted/30">
          <div className="rounded-md border bg-card px-8 py-6 text-center">
            <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            <h1 className="mb-2 text-xl font-semibold">Loading...</h1>
          </div>
        </div>
      }
    >
      <VerifyPageContent />
    </Suspense>
  );
}
