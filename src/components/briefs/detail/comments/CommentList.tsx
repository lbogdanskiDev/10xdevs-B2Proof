"use client";

import { CommentItem } from "./CommentItem";
import type { CommentDto } from "@/types";

interface CommentListProps {
  comments: CommentDto[];
  onDelete: (commentId: string) => Promise<void>;
}

export function CommentList({ comments, onDelete }: CommentListProps) {
  if (comments.length === 0) {
    return <p className="text-sm text-muted-foreground py-8 text-center">No comments yet. Be the first to comment!</p>;
  }

  return (
    <div className="space-y-4">
      {comments.map((comment) => (
        <CommentItem key={comment.id} comment={comment} onDelete={onDelete} />
      ))}
    </div>
  );
}
