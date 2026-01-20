"use client";


import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { User } from "@/types/user";
import { UserForm, UserData } from "@/components/users/user-form";
// UserListSidebar import removed
import { Button } from "@/components/ui/button";

export default function UserEditPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  // Unwrap params using React.use()
  const { id } = use(params);

  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    if (id && users.length > 0) {
      const found = users.find((u) => u._id === id);
      if (found) {
         // Fetch full details for the selected user to ensure we have all fields
         fetchUserDetails(id);
      }
    }
  }, [id, users]);

  const fetchUsers = async () => {
    try {
      const res = await fetch("/api/users");
      if (res.ok) {
        const data = await res.json();
        setUsers(data);
        setFilteredUsers(data);
      }
    } catch (err) {
      console.error("Failed to fetch users", err);
    } finally {
        if (!currentUser && !id) setLoading(false);
    }
  };

  const fetchUserDetails = async (userId: string) => {
      setLoading(true);
      try {
          const res = await fetch(`/api/users/${userId}`);
          if (res.ok) {
              const data = await res.json();
              setCurrentUser(data);
          }
      } catch (err) {
          console.error("Failed to fetch user details", err);
      } finally {
          setLoading(false);
      }
  }

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
        setCurrentUser(updated);
        // Update user in the list as well
        setUsers(users.map(u => u._id === updated._id ? updated : u));
        setFilteredUsers(filteredUsers.map(u => u._id === updated._id ? updated : u));
        // Show success message (optional)
      } else {
        alert("Failed to update user");
      }
    } catch (error) {
      console.error("Error saving user", error);
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
