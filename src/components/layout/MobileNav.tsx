"use client";

import { LogOut } from "lucide-react";
import { Logo } from "./Logo";
import { SidebarNavigation } from "./SidebarNavigation";
import { Sheet, SheetContent, SheetHeader } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import type { NavigationItem } from "@/lib/types/navigation.types";
import type { UserProfileDto } from "@/types";

interface MobileNavProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: UserProfileDto;
  briefCount: number;
  maxBriefs: number;
  navItems: NavigationItem[];
  onLogout: () => Promise<void>;
}

export function MobileNav({ open, onOpenChange, user, briefCount, maxBriefs, navItems, onLogout }: MobileNavProps) {
  const handleNavigate = () => {
    onOpenChange(false);
  };

  const handleLogout = async () => {
    onOpenChange(false);
    await onLogout();
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="left" className="flex w-72 flex-col p-0">
        {/* Header */}
        <SheetHeader className="flex h-16 items-center border-b px-6">
          <Logo size="lg" />
        </SheetHeader>

        {/* Navigation */}
        <div className="flex-1 overflow-y-auto px-4 py-4">
          <SidebarNavigation
            items={navItems}
            userRole={user.role}
            briefCount={briefCount}
            maxBriefs={maxBriefs}
            onNavigate={handleNavigate}
          />
        </div>

        {/* Footer */}
        <div className="border-t p-4">
          <Button variant="ghost" className="mt-2 w-full justify-start gap-2" onClick={handleLogout}>
            <LogOut className="h-4 w-4" aria-hidden="true" />
            Logout
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
