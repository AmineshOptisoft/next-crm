"use client"

import * as React from "react"
import { X, Check, ChevronsUpDown } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"
import { cn } from "@/lib/utils"

export type Option = {
    label: string
    value: string
    group?: string
}

interface MultiSelectProps {
    options: Option[]
    selected: string[]
    onChange: (selected: string[]) => void
    placeholder?: string
    className?: string
    disabled?: boolean
}

export function MultiSelect({
    options,
    selected,
    onChange,
    placeholder = "Select items...",
    className,
    disabled = false,
}: MultiSelectProps) {
    const [open, setOpen] = React.useState(false)
    const [searchTerm, setSearchTerm] = React.useState("")

    const handleUnselect = (itemValue: string, e: React.MouseEvent) => {
        e.stopPropagation()
        onChange(selected.filter((i) => i !== itemValue))
    }

    const handleSelect = (itemValue: string) => {
        if (selected.includes(itemValue)) {
            onChange(selected.filter((i) => i !== itemValue))
        } else {
            onChange([...selected, itemValue])
        }
    }

    // Group options if needed (flattened for now or use groups if provided)
    // The component assumes consumers handle grouping or we just list them.
    // We'll support simple list for now as per ShadCN Command structure.

    const selectedOptions = selected.map(id => options.find(o => o.value === id)).filter(Boolean) as Option[]

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <div
                    role="combobox"
                    aria-expanded={open}
                    aria-disabled={disabled}
                    className={cn(
                        "flex min-h-[44px] w-full flex-wrap items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer",
                        disabled && "opacity-50 cursor-not-allowed",
                        className
                    )}
                    onClick={() => !disabled && setOpen(!open)}
                >
                    <div className="flex flex-wrap gap-1">
                        {selectedOptions.length > 0 ? (
                            selectedOptions.map((option) => (
                                <Badge
                                    key={option.value}
                                    variant="secondary"
                                    className="mr-1 mb-1"
                                    onClick={(e) => handleUnselect(option.value, e)}
                                >
                                    {option.label}
                                    <div
                                        className="ml-1 ring-offset-background rounded-full outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                                        onKeyDown={(e) => {
                                            if (e.key === "Enter") {
                                                handleUnselect(option.value, e as any);
                                            }
                                        }}
                                        onMouseDown={(e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                        }}
                                        onClick={(e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            handleUnselect(option.value, e as any);
                                        }}
                                    >
                                        <X className="h-3 w-3 text-muted-foreground hover:text-foreground" />
                                    </div>
                                </Badge>
                            ))
                        ) : (
                            <span className="text-muted-foreground">{placeholder}</span>
                        )}
                    </div>
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </div>
            </PopoverTrigger>
            <PopoverContent className="w-full p-0 popover-content-width-same-as-trigger z-[200]" align="start">
                <Command shouldFilter={false}>
                    {/* Note: shouldFilter=false if we want to handle filtering manually or let Command handle it if we pass children. 
                         Standard Command filters children based on value. We'll let it filter. 
                         Wait, if we pass dynamic list, searching works on rendered items.
                         We'll let Command handle filtering.
                     */}
                    <CommandInput placeholder="Search..." onValueChange={setSearchTerm} />
                    <CommandList>
                        <CommandEmpty>No item found.</CommandEmpty>
                        <CommandGroup className="max-h-64 overflow-auto">
                            {options.map((option) => (
                                <CommandItem
                                    key={option.value}
                                    value={option.label} // Value for filtering
                                    onSelect={() => handleSelect(option.value)}
                                >
                                    <Check
                                        className={cn(
                                            "mr-2 h-4 w-4",
                                            selected.includes(option.value)
                                                ? "opacity-100"
                                                : "opacity-0"
                                        )}
                                    />
                                    {option.label}
                                    {option.group && (
                                        <span className="ml-2 text-xs text-muted-foreground">({option.group})</span>
                                    )}
                                </CommandItem>
                            ))}
                        </CommandGroup>
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    )
}
