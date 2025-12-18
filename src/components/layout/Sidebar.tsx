"use client";

import { LogOut } from "lucide-react";
import { Logo } from "./Logo";
import { SidebarNavigation } from "./SidebarNavigation";
import { ThemeToggle } from "./ThemeToggle";
import { Button } from "@/components/ui/button";
import type { NavigationItem } from "@/lib/types/navigation.types";
import type { UserProfileDto } from "@/types";

interface SidebarProps {
  user: UserProfileDto;
  briefCount: number;
  maxBriefs: number;
  navItems: NavigationItem[];
  onLogout: () => Promise<void>;
}

export function Sidebar({ user, briefCount, maxBriefs, navItems, onLogout }: SidebarProps) {
  return (
    <aside className="fixed left-0 top-0 z-40 hidden h-full w-64 flex-col border-r bg-background lg:flex">
      {/* Header */}
      <div className="flex h-16 items-center justify-between border-b px-6">
        <Logo size="lg" />
        <ThemeToggle />
      </div>

      {/* Navigation */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        <SidebarNavigation items={navItems} userRole={user.role} briefCount={briefCount} maxBriefs={maxBriefs} />
      </div>

      {/* Footer */}
      <div className="border-t p-4">
        <Button variant="ghost" className="mt-2 w-full justify-start gap-2" onClick={onLogout}>
          <LogOut className="h-4 w-4" aria-hidden="true" />
          Logout
        </Button>
      </div>
    </aside>
  );
}
