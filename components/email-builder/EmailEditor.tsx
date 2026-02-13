"use client";

import React, { useState, useRef, useEffect, Suspense } from "react";
import {
    Monitor,
    Smartphone,
    ChevronRight,
    Eye,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { useRouter, useSearchParams } from "next/navigation";
import { useTheme } from "next-themes";
import UnlayerEmailEditor, { EditorRef, EmailEditorProps } from 'react-email-editor';
import { toast } from "sonner";
import templates from "@/lib/greenfrog_templates_unlayer_format.json";

interface EmailEditorComponentProps {
    initialData?: any;
    mode?: "add" | "edit";
}

function EmailEditorInner({ initialData, mode = "add" }: EmailEditorComponentProps) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { resolvedTheme } = useTheme();
    const emailEditorRef = useRef<EditorRef>(null);
    const [viewMode, setViewMode] = useState<"desktop" | "mobile">("desktop");
    const [emailSubject, setEmailSubject] = useState(initialData?.subject || searchParams.get('subject') || "");
    const [emailSubjectError, setEmailSubjectError] = useState(false);
    const [loading, setLoading] = useState(false);

    const templateParam = searchParams.get('template');
    const templateKey = templateParam || null;
    
    // Debug logging
    console.log('[EmailEditor] Template param:', templateParam);
    console.log('[EmailEditor] Template key:', templateKey);
    console.log('[EmailEditor] Initial data templateId:', initialData?.templateId);

    const transformDesign = (design: any) => {
        // We are disabling the transformation logic that reverts Green Frog branding
        // to placeholders, as the user wants to hardcode the branding in the JSON.
        return design;
    };

    const onDesignLoad = (data: any) => {
        console.log('onDesignLoad', data);
    };

    const onLoad: EmailEditorProps['onLoad'] = (unlayer) => {
        unlayer.addEventListener('design:loaded', onDesignLoad);

        // Use templates from JSON if available and matching the key
        // @ts-ignore
        if (templateKey && templates[templateKey]) {
            // @ts-ignore
            const originalDesign = templates[templateKey];
            const transformedDesign = transformDesign(originalDesign);
            unlayer.loadDesign(transformedDesign);
        } else if (initialData?.design) {
            unlayer.loadDesign(initialData.design);
        }
    };

    const onReady: EmailEditorProps['onReady'] = (unlayer) => {
        console.log('onReady', unlayer);
    };

    const exportHtml = () => {
        if (!emailSubject.trim()) {
            setEmailSubjectError(true);
            toast.error("Email subject is required");
            return;
        }

        const unlayer = emailEditorRef.current?.editor;

        unlayer?.exportHtml(async (data: any) => {
            const { design, html } = data;

            if (!html) {
                toast.error("Failed to generate email content");
                return;
            }

            setLoading(true);

            try {
                const campaignId = initialData?.id || initialData?._id;
                const url = campaignId ? `/api/email-campaigns/${campaignId}` : '/api/email-campaigns';
                const method = campaignId ? 'PATCH' : 'POST';

                const finalTemplateId = templateKey || initialData?.templateId || null;
                console.log(`[EmailEditor] Saving with templateId:`, finalTemplateId);
                console.log(`[EmailEditor] Saving via ${method} to ${url}`);

                let response = await fetch(url, {
                    method: method,
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        name: emailSubject,
                        subject: emailSubject,
                        design: design,
                        content: html,
                        status: "draft",
                        templateId: finalTemplateId
                    })
                });

                let result = await response.json();

                // If PATCH fails because the campaign doesn't exist, fallback to POST (create new)
                if (method === 'PATCH' && (response.status === 404 || result.error === "Campaign not found")) {
                    console.log("[EmailEditor] Campaign not found for update, falling back to create...");
                    response = await fetch('/api/email-campaigns', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            name: emailSubject,
                            subject: emailSubject,
                            design: design,
                            content: html,
                            status: "draft",
                            templateId: finalTemplateId
                        })
                    });
                    result = await response.json();
                }

                if (!response.ok) {
                    throw new Error(result.error || 'Failed to save template');
                }

                toast.success("Template saved successfully!");
                router.push("/dashboard/email-builder");
            } catch (error: any) {
                console.error("Save error:", error);
                toast.error(error.message || "Failed to save template");
            } finally {
                setLoading(false);
            }
        });
    };

    return (
        <div className="flex flex-col h-[calc(100vh-140px)] -m-4">
            {/* Builder Top Bar */}
            <div className="border-b bg-background px-6 py-3 flex items-center justify-between shadow-sm z-10">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="sm" onClick={() => router.push("/dashboard/email-builder")}>
                        <ChevronRight className="h-4 w-4 rotate-180 mr-2" />
                        Back
                    </Button>
                    <Separator orientation="vertical" className="h-6" />
                    <h2 className="text-lg font-bold tracking-tight">
                        {mode === "add" ? "Create New Email" : "Edit Email"}
                    </h2>
                    <Separator orientation="vertical" className="h-6" />
                    <div className="flex items-center gap-1 bg-muted p-1 rounded-md">
                        <Button
                            variant={viewMode === "desktop" ? "secondary" : "ghost"}
                            size="icon"
                            onClick={() => {
                                setViewMode("desktop");
                                // @ts-ignore
                                emailEditorRef.current?.editor?.setDevice('desktop');
                            }}
                            className="h-8 w-8"
                        >
                            <Monitor className="h-4 w-4" />
                        </Button>
                        <Button
                            variant={viewMode === "mobile" ? "secondary" : "ghost"}
                            size="icon"
                            onClick={() => {
                                setViewMode("mobile");
                                // @ts-ignore
                                emailEditorRef.current?.editor?.setDevice('tablet');
                            }}
                            className="h-8 w-8"
                        >
                            <Smartphone className="h-4 w-4" />
                        </Button>
                    </div>
                </div>

                <div className="flex items-center gap-4 flex-1 max-w-md mx-8">
                    <div className="w-full relative">
                        <Input
                            placeholder="Email Subject"
                            value={emailSubject}
                            onChange={(e) => {
                                setEmailSubject(e.target.value);
                                setEmailSubjectError(false);
                            }}
                            className={emailSubjectError ? "border-red-500" : ""}
                        />
                        {emailSubjectError && <p className="text-[10px] text-red-500 absolute mt-1">Email subject is required</p>}
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <Button variant="outline" size="sm" onClick={() => {
                        // @ts-ignore
                        emailEditorRef.current?.editor?.showPreview('desktop');
                    }}>
                        <Eye className="mr-2 h-4 w-4" />
                        Preview
                    </Button>
                    <Button size="sm" onClick={exportHtml} disabled={loading} className="bg-zinc-900 hover:bg-zinc-800 text-white px-6">
                        {loading ? "Saving..." : "Save Template"}
                    </Button>
                </div>
            </div>

            <div className="flex-1 flex flex-col overflow-hidden relative">
                <UnlayerEmailEditor
                    ref={emailEditorRef}
                    onLoad={onLoad}
                    onReady={onReady}
                    style={{ height: "100%", minHeight: "calc(100vh - 200px)" }}
                    options={{
                        appearance: {
                            theme: resolvedTheme === 'dark' ? 'modern_dark' : 'modern_light',
                        },
                        mergeTags: {
                            booking_date: { name: 'booking_date', value: '{{booking_date}}' },
                            booking_id: { name: 'booking_id', value: '{{booking_id}}' },
                            booking_time: { name: 'booking_time', value: '{{booking_time}}' },
                            service_name: { name: 'service_name', value: '{{service_name}}' },
                            client_name: { name: 'client_name', value: '{{client_name}}' },
                            methodname: { name: 'methodname', value: '{{methodname}}' },
                            units: { name: 'units', value: '{{units}}' },
                            addons: { name: 'addons', value: '{{addons}}' },
                            firstname: { name: 'firstname', value: '{{firstname}}' },
                            lastname: { name: 'lastname', value: '{{lastname}}' },
                            client_email: { name: 'client_email', value: '{{client_email}}' },
                            client_phone: { name: 'client_phone', value: '{{client_phone}}' },
                            special_instructions: { name: 'special_instructions', value: '{{special_instructions}}' },
                            price: { name: 'price', value: '{{price}}' },
                            client_address: { name: 'client_address', value: '{{client_address}}' },
                            client_city: { name: 'client_city', value: '{{client_city}}' },
                            client_state: { name: 'client_state', value: '{{client_state}}' },
                            business_logo: { name: 'business_logo', value: '{{business_logo}}' },
                            company_name: { name: 'company_name', value: '{{company_name}}' },
                            company_address: { name: 'company_address', value: '{{company_address}}' },
                            company_city: { name: 'company_city', value: '{{company_city}}' },
                            company_state: { name: 'company_state', value: '{{company_state}}' },
                            company_zip: { name: 'company_zip', value: '{{company_zip}}' },
                            company_country: { name: 'company_country', value: '{{company_country}}' },
                            company_phone: { name: 'company_phone', value: '{{company_phone}}' },
                            company_email: { name: 'company_email', value: '{{company_email}}' },
                            technitian_name: { name: 'technitian_name', value: '{{technitian_name}}' },
                            invoice_list: { name: 'invoice_list', value: '{{invoice_list}}' },
                        }
                    }}
                />
                <style>
                    {`
                        .blockbuilder-branding {
                            display: none !important;
                        }
                    `}
                </style>
            </div>
        </div>
    );
}

export function EmailEditor(props: EmailEditorComponentProps) {
    return (
        <Suspense fallback={<div>Loading editor...</div>}>
            <EmailEditorInner {...props} />
        </Suspense>
    );
}
