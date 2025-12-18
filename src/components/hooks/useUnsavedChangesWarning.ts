"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";

interface UseUnsavedChangesWarningReturn {
  showDialog: boolean;
  setShowDialog: (show: boolean) => void;
  confirmNavigation: () => void;
  pendingNavigation: string | null;
  handleNavigation: (href: string) => boolean;
}

export function useUnsavedChangesWarning(isDirty: boolean): UseUnsavedChangesWarningReturn {
  const router = useRouter();
  const [showDialog, setShowDialog] = useState(false);
  const [pendingNavigation, setPendingNavigation] = useState<string | null>(null);
  const isDirtyRef = useRef(isDirty);

  // Keep ref in sync with prop
  useEffect(() => {
    isDirtyRef.current = isDirty;
  }, [isDirty]);

  // Handle browser beforeunload event
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (!isDirtyRef.current) return;

      e.preventDefault();
      e.returnValue = "";
      return "";
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, []);

  const handleNavigation = useCallback((href: string): boolean => {
    if (!isDirtyRef.current) {
      return true; // Allow navigation
    }

    setPendingNavigation(href);
    setShowDialog(true);
    return false; // Block navigation
  }, []);

  const confirmNavigation = useCallback(() => {
    setShowDialog(false);
    if (pendingNavigation) {
      router.push(pendingNavigation);
      setPendingNavigation(null);
    }
  }, [pendingNavigation, router]);

  return {
    showDialog,
    setShowDialog,
    confirmNavigation,
    pendingNavigation,
    handleNavigation,
  };
}
