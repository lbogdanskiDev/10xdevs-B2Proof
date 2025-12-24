"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Trash2, Loader2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import type { CommentDto } from "@/types";

interface CommentItemProps {
  comment: CommentDto;
  onDelete: (commentId: string) => Promise<void>;
}

export function CommentItem({ comment, onDelete }: CommentItemProps) {
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await onDelete(comment.id);
    } finally {
      setIsDeleting(false);
    }
  };

  const roleLabel = comment.authorRole === "creator" ? "Creator" : "Client";
  const roleVariant = comment.authorRole === "creator" ? "default" : "secondary";

  return (
    <div className="border rounded-lg p-4 space-y-2">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm">{comment.authorEmail}</span>
          <Badge variant={roleVariant} className="text-xs">
            {roleLabel}
          </Badge>
        </div>

        {comment.isOwn && (
          <Button
            variant="ghost"
            size="icon"
            onClick={handleDelete}
            disabled={isDeleting}
            aria-label="Delete comment"
            className="h-8 w-8"
          >
            {isDeleting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Trash2 className="h-4 w-4 text-destructive" />
            )}
          </Button>
        )}
      </div>

      <p className="text-sm whitespace-pre-wrap">{comment.content}</p>

      <span className="text-xs text-muted-foreground">
        {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}
      </span>
    </div>
  );
}
