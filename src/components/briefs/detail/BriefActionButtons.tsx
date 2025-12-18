"use client";

import { OwnerActions } from "./OwnerActions";
import { RecipientActions } from "./RecipientActions";
import type { BriefDetailDto } from "@/types";

interface BriefActionButtonsProps {
  brief: BriefDetailDto;
  onStatusChange?: () => void;
}

export function BriefActionButtons({ brief, onStatusChange }: BriefActionButtonsProps) {
  if (brief.isOwned) {
    return <OwnerActions brief={brief} />;
  }

  if (brief.status === "sent") {
    return <RecipientActions briefId={brief.id} onStatusChange={onStatusChange} />;
  }

  return null;
}
