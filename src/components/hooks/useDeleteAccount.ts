"use client";

import { useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/db/supabase.client";

interface UseDeleteAccountProps {
  userEmail: string;
}

interface UseDeleteAccountReturn {
  // State
  confirmEmail: string;
  isDialogOpen: boolean;
  isDeleting: boolean;
  error: string | null;
  canDelete: boolean; // confirmEmail === userEmail

  // Actions
  setConfirmEmail: (email: string) => void;
  openDialog: () => void;
  closeDialog: () => void;
  handleDelete: () => Promise<void>;
}

export function useDeleteAccount({ userEmail }: UseDeleteAccountProps): UseDeleteAccountReturn {
  const [confirmEmail, setConfirmEmail] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  // Email validation for delete confirmation
  const canDelete = useMemo(() => confirmEmail.toLowerCase() === userEmail.toLowerCase(), [confirmEmail, userEmail]);

  const openDialog = useCallback(() => {
    setIsDialogOpen(true);
    setConfirmEmail("");
    setError(null);
  }, []);

  const closeDialog = useCallback(() => {
    if (!isDeleting) {
      setIsDialogOpen(false);
      setConfirmEmail("");
      setError(null);
    }
  }, [isDeleting]);

  const handleDelete = useCallback(async () => {
    if (!canDelete) {
      setError("Email address does not match");
      return;
    }

    setIsDeleting(true);
    setError(null);

    try {
      // Call API to delete user account
      const response = await fetch("/api/users/me", {
        method: "DELETE",
      });

      if (!response.ok) {
        if (response.status === 401) {
          // Redirect to login if unauthorized
          const supabase = createSupabaseBrowserClient();
          await supabase.auth.signOut();
          router.push("/login");
          return;
        }

        const errorData = await response.json().catch(() => ({ error: "Failed to delete account" }));
        throw new Error(errorData.error || "Failed to delete account");
      }

      // Sign out from Supabase and redirect to login
      const supabase = createSupabaseBrowserClient();
      await supabase.auth.signOut();
      router.push("/login");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete account. Please try again.");
      setIsDeleting(false);
    }
  }, [canDelete, router]);

  return {
    confirmEmail,
    isDialogOpen,
    isDeleting,
    error,
    canDelete,
    setConfirmEmail,
    openDialog,
    closeDialog,
    handleDelete,
  };
}
