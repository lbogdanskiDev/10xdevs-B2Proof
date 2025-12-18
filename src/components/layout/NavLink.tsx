"use client";

import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface NavLinkProps {
  href: string;
  icon: LucideIcon;
  label: string;
  isActive?: boolean;
  disabled?: boolean;
  disabledMessage?: string;
  badge?: React.ReactNode;
  onClick?: () => void;
}

export function NavLink({
  href,
  icon: Icon,
  label,
  isActive = false,
  disabled = false,
  disabledMessage = "This action is not available",
  badge,
  onClick,
}: NavLinkProps) {
  const baseClasses =
    "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2";

  const activeClasses = isActive
    ? "bg-accent text-accent-foreground"
    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground";

  const disabledClasses = disabled ? "cursor-not-allowed opacity-50 pointer-events-none" : "";

  if (disabled) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <span className={cn(baseClasses, activeClasses, disabledClasses)} aria-disabled="true">
            <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span className="flex-1">{label}</span>
            {badge}
          </span>
        </TooltipTrigger>
        <TooltipContent side="right">
          <p>{disabledMessage}</p>
        </TooltipContent>
      </Tooltip>
    );
  }

  return (
    <Link href={href} className={cn(baseClasses, activeClasses)} onClick={onClick}>
      <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
      <span className="flex-1">{label}</span>
      {badge}
    </Link>
  );
}
