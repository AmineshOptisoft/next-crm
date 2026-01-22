"use client";

import Link from "next/link";
import { Input } from "@/components/ui/input";
import { User } from "@/types/user";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

interface UserListSidebarProps {
  users: User[];
  selectedUserId?: string;
  onSearch: (query: string) => void;
}

export function UserListSidebar({ users, selectedUserId, onSearch }: UserListSidebarProps) {
  return (
    <div className="w-80 border-r bg-background flex flex-col h-full">
      <div className="p-4 border-b space-y-4">
        <h3 className="font-semibold text-sm text-muted-foreground">Technician Name</h3>
        <Input 
          placeholder="Keywords..." 
          onChange={(e) => onSearch(e.target.value)}
          className="bg-muted/50"
        />
      </div>
      <div className="flex-1 overflow-auto">
        <div className="flex flex-col">
          {users.map((user) => (
            <Link
              key={user._id}
              href={`/dashboard/users/${user._id}`}
              className={cn(
                "flex items-start gap-3 p-4 hover:bg-muted/50 transition-colors border-b",
                selectedUserId === user._id && "bg-muted border-l-4 border-l-primary"
              )}
            >
              <Avatar className="mt-1">
                <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${user.firstName}`} />
                <AvatarFallback>{user.firstName[0]}{user.lastName[0]}</AvatarFallback>
              </Avatar>
              <div className="space-y-1">
                <p className="font-medium text-sm">
                  {user.firstName} {user.lastName}
                </p>
                {/* 
                  Placeholder for 'Award-7, complaint-0' - 
                  assuming this data might come later or we mock it for now 
                */}
                <p className="text-xs text-muted-foreground">
                    {user.role === 'company_admin' ? 'Company Admin' : (user.customRoleId?.name || 'Technician')}
                </p>
                 <p className="text-xs text-muted-foreground">
                    Award- 0, complaint - 0 
                </p>
              </div>
            </Link>
          ))}
          {users.length === 0 && (
            <div className="p-4 text-center text-sm text-muted-foreground">
                No users found.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
