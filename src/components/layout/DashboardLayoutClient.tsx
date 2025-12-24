"use client";

import { useState, useCallback } from "react";
import { ThemeProvider } from "next-themes";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/components/hooks/useAuth";
import { useBriefCount } from "@/components/hooks/useBriefCount";
import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";
import { MobileNav } from "./MobileNav";
import { getNavigationItems, MAX_BRIEFS_PER_USER } from "@/lib/constants/navigation.constants";
import type { UserProfileDto } from "@/types";

interface DashboardLayoutClientProps {
  children: React.ReactNode;
  user: UserProfileDto;
  initialBriefCount: number;
}

function DashboardLayoutContent({
  children,
  initialBriefCount,
}: {
  children: React.ReactNode;
  initialBriefCount: number;
}) {
  const { user, logout } = useAuth();
  const { count: briefCount } = useBriefCount(initialBriefCount);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleMenuClick = useCallback(() => {
    setMobileMenuOpen(true);
  }, []);

  const handleLogout = useCallback(async () => {
    await logout();
  }, [logout]);

  if (!user) {
    return null;
  }

  const navItems = getNavigationItems(briefCount, MAX_BRIEFS_PER_USER);

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-background">
        {/* Desktop Sidebar */}
        <Sidebar
          user={user}
          briefCount={briefCount}
          maxBriefs={MAX_BRIEFS_PER_USER}
          navItems={navItems}
          onLogout={handleLogout}
        />

        {/* Mobile TopBar */}
        <TopBar user={user} onMenuClick={handleMenuClick} onLogout={handleLogout} />

        {/* Mobile Navigation Sheet */}
        <MobileNav
          open={mobileMenuOpen}
          onOpenChange={setMobileMenuOpen}
          user={user}
          briefCount={briefCount}
          maxBriefs={MAX_BRIEFS_PER_USER}
          navItems={navItems}
          onLogout={handleLogout}
        />

        {/* Main content */}
        <main className="lg:pl-64">
          <div className="container mx-auto px-4 py-8">{children}</div>
        </main>
      </div>

      <Toaster />
    </TooltipProvider>
  );
}

export function DashboardLayoutClient({ children, user, initialBriefCount }: DashboardLayoutClientProps) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      <AuthProvider initialUser={user}>
        <DashboardLayoutContent initialBriefCount={initialBriefCount}>{children}</DashboardLayoutContent>
      </AuthProvider>
    </ThemeProvider>
  );
}
