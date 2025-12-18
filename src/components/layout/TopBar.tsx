"use client";

import { Menu } from "lucide-react";
import { Logo } from "./Logo";
import { ThemeToggle } from "./ThemeToggle";
import { UserMenu } from "./UserMenu";
import { Button } from "@/components/ui/button";
import type { UserProfileDto } from "@/types";

interface TopBarProps {
  user: UserProfileDto;
  onMenuClick: () => void;
  onLogout: () => Promise<void>;
}

export function TopBar({ user, onMenuClick, onLogout }: TopBarProps) {
  return (
    <header className="sticky top-0 z-40 flex h-16 items-center justify-between border-b bg-background px-4 lg:hidden">
      {/* Mobile menu trigger */}
      <Button variant="ghost" size="icon" onClick={onMenuClick} className="h-9 w-9" aria-label="Open navigation menu">
        <Menu className="h-5 w-5" />
      </Button>

      {/* Logo (center) */}
      <Logo size="md" />

      {/* Actions (right) */}
      <div className="flex items-center gap-2">
        <ThemeToggle />
        <UserMenu user={user} onLogout={onLogout} />
      </div>
    </header>
  );
}
