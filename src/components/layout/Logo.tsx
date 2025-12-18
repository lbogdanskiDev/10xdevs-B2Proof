import Link from "next/link";
import { cn } from "@/lib/utils";

interface LogoProps {
  className?: string;
  size?: "sm" | "md" | "lg";
}

const sizeClasses = {
  sm: "text-lg",
  md: "text-xl",
  lg: "text-2xl",
} as const;

export function Logo({ className, size = "md" }: LogoProps) {
  return (
    <Link
      href="/briefs"
      className={cn(
        "font-bold tracking-tight text-foreground transition-colors hover:text-foreground/80",
        sizeClasses[size],
        className
      )}
    >
      B2Proof
    </Link>
  );
}
