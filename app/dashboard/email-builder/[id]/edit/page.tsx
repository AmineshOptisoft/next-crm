"use client";

import React, { useEffect, useState } from "react";
import { EmailEditor } from "@/components/email-builder/EmailEditor";
import { useParams } from "next/navigation";
import { toast } from "sonner";

export default function EditEmailBuilderPage() {
    const params = useParams();
    const id = params.id as string;
    const [loading, setLoading] = useState(true);
    const [initialData, setInitialData] = useState<any>(null);

    useEffect(() => {
        const fetchCampaign = async () => {
            try {
                const res = await fetch(`/api/email-campaigns/${id}`);
                const json = await res.json();

                if (json.success) {
                    setInitialData(json.data);
                } else {
                    // If not found in DB, we use mock data as fallback
                    // This allows the user to "edit" something that might just be a URL ID
                    setInitialData({
                        id,
                        name: "Sample Email",
                        subject: "Your subject here",
                        content: "",
                        design: null
                    });
                }
            } catch (error) {
                console.error("Fetch error:", error);
                toast.error("Failed to load campaign data");
            } finally {
                setLoading(false);
            }
        };

        fetchCampaign();
    }, [id]);

    if (loading) {
        return <div className="flex h-screen items-center justify-center">Loading campaign...</div>;
    }

    return <EmailEditor mode="edit" initialData={initialData} />;
}
