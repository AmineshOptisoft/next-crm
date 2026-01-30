"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";

function CallbackContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [status, setStatus] = useState("Processing...");
    const [processed, setProcessed] = useState(false);

    useEffect(() => {
        if (processed) return;

        const code = searchParams.get("code");
        const error = searchParams.get("error");

        if (error) {
            setStatus("Authentication failed: " + error);
            toast.error("Google authentication failed");
            setTimeout(() => router.push("/dashboard/company-settings?tab=mail-sending"), 3000);
            setProcessed(true);
            return;
        }

        if (code) {
            setProcessed(true);
            exchangeCode(code);
        } else {
            // No code yet, maybe loading or invalid access
        }
    }, [searchParams, processed]);

    const exchangeCode = async (code: string) => {
        try {
            const res = await fetch("/api/gmail/exchange", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ code }),
            });

            const data = await res.json();

            if (res.ok) {
                setStatus("Success! Redirecting...");
                toast.success(`Connected to Gmail as ${data.email}`);
                router.push("/dashboard/company-settings?tab=mail-sending");
            } else {
                throw new Error(data.error || "Failed to exchange token");
            }
        } catch (error: any) {
            console.error(error);
            setStatus("Error: " + error.message);
            toast.error("Failed to connect Gmail");
            setTimeout(() => router.push("/dashboard/company-settings?tab=mail-sending"), 3000);
        }
    };

    return (
        <div className="p-8 bg-white rounded-xl shadow-lg text-center max-w-md w-full">
            <h2 className="text-2xl font-bold mb-4">Connecting to Gmail</h2>
            <div className="flex justify-center mb-6">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-zinc-900"></div>
            </div>
            <p className="text-zinc-600">{status}</p>
        </div>
    );
}

export default function GmailCallbackPage() {
    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-zinc-50">
            <Suspense fallback={<div>Loading...</div>}>
                <CallbackContent />
            </Suspense>
        </div>
    );
}
