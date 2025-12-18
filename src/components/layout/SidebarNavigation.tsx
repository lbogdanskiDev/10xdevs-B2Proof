"use client";

import { usePathname } from "next/navigation";
import { NavLink } from "./NavLink";
import { BriefCountBadge } from "./BriefCountBadge";
import type { NavigationItem } from "@/lib/types/navigation.types";
import type { UserRole } from "@/types";

interface SidebarNavigationProps {
  items: NavigationItem[];
  userRole: UserRole;
  briefCount: number;
  maxBriefs: number;
  onNavigate?: () => void;
}

export function SidebarNavigation({ items, userRole, briefCount, maxBriefs, onNavigate }: SidebarNavigationProps) {
  const pathname = usePathname();

  // Filter items based on user role
  const visibleItems = items.filter((item) => {
    if (item.creatorOnly && userRole !== "creator") {
      return false;
    }
    return true;
  });

  return (
    <nav aria-label="Main navigation">
      <ul className="flex flex-col gap-1">
        {visibleItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
          const isNewBrief = item.name === "New Brief";

          return (
            <li key={item.name}>
              <NavLink
                href={item.href}
                icon={item.icon}
                label={item.name}
                isActive={isActive}
                disabled={item.disabled}
                disabledMessage={
                  isNewBrief && item.disabled ? `You have reached the limit of ${maxBriefs} briefs` : undefined
                }
                badge={
                  isNewBrief && userRole === "creator" ? (
                    <BriefCountBadge current={briefCount} max={maxBriefs} />
                  ) : undefined
                }
                onClick={onNavigate}
              />
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
