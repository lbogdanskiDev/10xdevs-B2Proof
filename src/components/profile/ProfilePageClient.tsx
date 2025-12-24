"use client";

import type { UserProfileDto } from "@/types";
import { AccountInfoCard } from "./AccountInfoCard";
import { ChangePasswordCard } from "./ChangePasswordCard";
import { DeleteAccountSection } from "./DeleteAccountSection";

interface ProfilePageClientProps {
  user: UserProfileDto;
}

export function ProfilePageClient({ user }: ProfilePageClientProps) {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Profile</h1>
        <p className="text-muted-foreground">Manage your account settings and preferences.</p>
      </div>

      <AccountInfoCard email={user.email} role={user.role} createdAt={user.createdAt} />

      <ChangePasswordCard />

      <DeleteAccountSection userEmail={user.email} />
    </div>
  );
}
