"use client";

import { Button } from "@/components/ui/button";
import { Plus, Minus } from "lucide-react";

// Configuration of services based on the user's screenshot
const SERVICES_CONFIG = [
    {
        name: "Deluxe First Time Cleaning",
        hasSubService: true,
        hasAddons: true,
        addons: []
    },
    {
        name: "General First Time Cleaning",
        hasSubService: true,
        hasAddons: true,
        addons: ["Fridge Cleaning", "Oven"]
    },
    {
        name: "House Cleaning",
        hasSubService: true,
        hasAddons: true,
        addons: ["Fridge Cleaning", "Oven Cleaning"]
    },
    {
        name: "Move In/Out Service",
        hasSubService: true,
        hasAddons: true,
        addons: []
    },
    {
        name: "Training - Meeting",
        hasSubService: true,
        subServices: ["Time"],
        hasAddons: true,
        addons: []
    },
    {
        name: "Window Cleaning",
        hasSubService: true,
        subServices: ["Standard Windows"],
        hasAddons: true,
        addons: []
    }
];

export function ServiceDefaults({ editorData, onChange }: { editorData: any, onChange: (data: any) => void }) {
    // Helper to update count safely
    const updateCount = (serviceName: string, type: 'sub' | 'addon', itemName: string, delta: number) => {
        const currentServiceData = editorData[serviceName] || {};
        const currentTypeData = currentServiceData[type] || {};
        const currentCount = currentTypeData[itemName] || 0;
        const newCount = Math.max(0, currentCount + delta);

        const newData = {
            ...editorData,
            [serviceName]: {
                ...currentServiceData,
                [type]: {
                    ...currentTypeData,
                    [itemName]: newCount
                }
            }
        };
        onChange(newData);
    };

    const getCount = (serviceName: string, type: 'sub' | 'addon', itemName: string) => {
        return editorData?.[serviceName]?.[type]?.[itemName] || 0;
    };

    return (
        <div className="space-y-6">
            {SERVICES_CONFIG.map((service) => (
                <div key={service.name} className="border-b pb-4 last:border-0">
                    <h4 className="text-md font-bold text-primary mb-2">Service: {service.name}</h4>

                    {/* SubService Section */}
                    {service.hasSubService && (
                        <div className="mb-2 bg-muted/30 p-2 rounded">
                            <h5 className="font-semibold text-primary/80 mb-2">SubService</h5>
                            {service.subServices ? (
                                <div className="space-y-2">
                                    {service.subServices.map(item => (
                                        <div key={item} className="flex items-center justify-between bg-card p-2 rounded border">
                                            <span className="text-sm font-medium text-foreground">{item}</span>
                                            <div className="flex items-center gap-3">
                                                <Button size="icon" variant="outline" className="h-8 w-8 rounded-full bg-lime-500 hover:bg-lime-600 text-white border-none" onClick={() => updateCount(service.name, 'sub', item, -1)}>
                                                    <Minus className="h-4 w-4" />
                                                </Button>
                                                <span className="w-4 text-center font-bold">{getCount(service.name, 'sub', item)}</span>
                                                <Button size="icon" variant="outline" className="h-8 w-8 rounded-full bg-lime-500 hover:bg-lime-600 text-white border-none" onClick={() => updateCount(service.name, 'sub', item, 1)}>
                                                    <Plus className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-xs text-muted-foreground italic pl-2"></div>
                            )}
                        </div>
                    )}

                    {/* Addons Section */}
                    {service.hasAddons && (
                        <div className="bg-muted/30 p-2 rounded">
                            <h5 className="font-semibold text-primary/80 mb-2">Addons Service</h5>
                            {service.addons && service.addons.length > 0 ? (
                                <div className="space-y-2">
                                    {service.addons.map(item => (
                                        <div key={item} className="flex items-center justify-between bg-card p-2 rounded border">
                                            <span className="text-sm font-medium text-foreground">{item}</span>
                                            <div className="flex items-center gap-3">
                                                <Button size="icon" variant="outline" className="h-8 w-8 rounded-full bg-lime-500 hover:bg-lime-600 text-white border-none" onClick={() => updateCount(service.name, 'addon', item, -1)}>
                                                    <Minus className="h-4 w-4" />
                                                </Button>
                                                <span className="w-4 text-center font-bold">{getCount(service.name, 'addon', item)}</span>
                                                <Button size="icon" variant="outline" className="h-8 w-8 rounded-full bg-lime-500 hover:bg-lime-600 text-white border-none" onClick={() => updateCount(service.name, 'addon', item, 1)}>
                                                    <Plus className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-xs text-muted-foreground italic pl-2"></div>
                            )}
                        </div>
                    )}
                </div>
            ))}
        </div>
    );
}
