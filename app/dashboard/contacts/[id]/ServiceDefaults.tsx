import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus, Minus, Loader2 } from "lucide-react";

export function ServiceDefaults({ editorData, onChange }: { editorData: any, onChange: (data: any) => void }) {
    const [services, setServices] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchServices() {
            try {
                const res = await fetch("/api/services");
                if (res.ok) {
                    const data = await res.json();
                    setServices(data.filter((s: any) => !s.parentId)); // Only main services
                }
            } catch (err) {
                console.error("Failed to fetch services", err);
            } finally {
                setLoading(false);
            }
        }
        fetchServices();
    }, []);
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

    if (loading) {
        return (
            <div className="flex items-center justify-center p-8">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
        );
    }

    if (services.length === 0) {
        return (
            <div className="p-4 text-center text-muted-foreground italic text-sm">
                No services configured.
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {services.map((service) => (
                <div key={service._id} className="border-b pb-4 last:border-0 hover:bg-muted/5 transition-colors p-2 rounded-lg">
                    <h4 className="text-md font-bold text-primary mb-2 flex items-center justify-between">
                        Service: {service.name}
                    </h4>

                    {/* SubServices Section */}
                    {service.subServices && service.subServices.length > 0 && (
                        <div className="mb-2 bg-muted/30 p-2 rounded">
                            <h5 className="font-semibold text-primary/80 mb-2 text-xs uppercase tracking-wider">Sub Services</h5>
                            <div className="space-y-2">
                                {service.subServices.map((item: any) => (
                                    <div key={item.name} className="flex items-center justify-between bg-card p-2 rounded border shadow-sm">
                                        <div className="flex flex-col">
                                            <span className="text-sm font-medium text-foreground">{item.name}</span>
                                            {item.price && <span className="text-[10px] text-muted-foreground">${item.price}</span>}
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <Button
                                                size="icon"
                                                variant="outline"
                                                className="h-7 w-7 rounded-full bg-primary/10 hover:bg-primary text-primary hover:text-primary-foreground border-none transition-all"
                                                onClick={() => updateCount(service.name, 'sub', item.name, -1)}
                                            >
                                                <Minus className="h-3 w-3" />
                                            </Button>
                                            <span className="w-4 text-center font-bold text-sm">{getCount(service.name, 'sub', item.name)}</span>
                                            <Button
                                                size="icon"
                                                variant="outline"
                                                className="h-7 w-7 rounded-full bg-primary/10 hover:bg-primary text-primary hover:text-primary-foreground border-none transition-all"
                                                onClick={() => updateCount(service.name, 'sub', item.name, 1)}
                                            >
                                                <Plus className="h-3 w-3" />
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            ))}
        </div>
    );
}
