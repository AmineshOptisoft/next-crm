"use client";


import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { User } from "@/types/user";
import { UserForm, UserData } from "@/components/users/user-form";
// UserListSidebar import removed
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import useSWR from "swr";

const fetcher = (url: string) => fetch(url, { credentials: "include" }).then((res) => res.json());

export default function UserEditPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  // Unwrap params using React.use()
  const { id } = use(params);

  const { data: rawUsers, mutate: mutateUsers } = useSWR("/api/users", fetcher, { revalidateOnFocus: false });
  const users: User[] = rawUsers || [];

  const { data: currentUserData, isLoading: loadingUserDetails, mutate: mutateUser } = useSWR(
    id ? `/api/users/${id}` : null,
    fetcher,
    { revalidateOnFocus: false }
  );

  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const currentUser: User | null = currentUserData || null;
  const loading = loadingUserDetails;
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (users.length > 0) {
      setFilteredUsers(users);
    }
  }, [users]);

  const handleSearch = (query: string) => {
    if (!query) {
      setFilteredUsers(users);
      return;
    }
    const lower = query.toLowerCase();
    setFilteredUsers(
      users.filter(
        (u) =>
          u.firstName.toLowerCase().includes(lower) ||
          u.lastName.toLowerCase().includes(lower) ||
          u.email.toLowerCase().includes(lower)
      )
    );
  };

  const handleSave = async (data: Partial<UserData>) => {
    if (!currentUser) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/users/${currentUser._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (res.ok) {
        const updated = await res.json();
        await mutateUser(updated, { revalidate: false }); // Update local instance
        await mutateUsers(); // Update background list view
        toast.success("Changes saved successfully");
      } else {
        const error = await res.json();
        toast.error(error.error || "Failed to update user");
      }
    } catch (error) {
      console.error("Error saving user", error);
      toast.error("Failed to save changes");
    } finally {
      setSaving(false);
    }
  };

  if (loading && !currentUser) {
      return <div className="p-8 text-center text-muted-foreground">Loading...</div>
  }

  return (
    <div className="h-full overflow-hidden bg-muted/10"> 
        {currentUser ? (
             <div className="h-full"> 
                <UserForm 
                    user={currentUser as unknown as UserData} // Cast to compatible type
                    onSave={handleSave}
                    loading={saving}
                />
             </div>
        ) : (
             <div className="flex items-center justify-center h-full text-muted-foreground">
                <p>Loading user details...</p>
             </div>
        )}
    </div>
  );
}
