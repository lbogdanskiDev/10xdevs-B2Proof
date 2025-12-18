"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { AccountInfoCardProps } from "@/lib/types/profile.types";

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function getRoleBadgeVariant(role: string): "default" | "secondary" {
  return role === "creator" ? "default" : "secondary";
}

function formatRole(role: string): string {
  return role.charAt(0).toUpperCase() + role.slice(1);
}

export function AccountInfoCard({ email, role, createdAt }: AccountInfoCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Account Information</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-muted-foreground">Email</span>
          <span className="text-sm">{email}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-muted-foreground">Role</span>
          <Badge variant={getRoleBadgeVariant(role)}>{formatRole(role)}</Badge>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-muted-foreground">Member since</span>
          <span className="text-sm">{formatDate(createdAt)}</span>
        </div>
      </CardContent>
    </Card>
  );
}
