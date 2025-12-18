"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Pencil, Trash2, Share2 } from "lucide-react";
import { DeleteBriefDialog } from "./DeleteBriefDialog";
import type { BriefDetailDto } from "@/types";

interface OwnerActionsProps {
  brief: BriefDetailDto;
}

export function OwnerActions({ brief }: OwnerActionsProps) {
  const router = useRouter();

  const handleEdit = () => {
    router.push(`/briefs/${brief.id}/edit`);
  };

  return (
    <div className="flex flex-wrap gap-2">
      <Button variant="outline" onClick={handleEdit}>
        <Pencil className="mr-2 h-4 w-4" />
        Edit
      </Button>

      <DeleteBriefDialog
        briefId={brief.id}
        trigger={
          <Button variant="outline">
            <Trash2 className="mr-2 h-4 w-4" />
            Delete
          </Button>
        }
      />

      <Button variant="outline" disabled>
        <Share2 className="mr-2 h-4 w-4" />
        Share
      </Button>
    </div>
  );
}
