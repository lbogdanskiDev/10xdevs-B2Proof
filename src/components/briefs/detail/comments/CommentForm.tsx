"use client";

import { useState, FormEvent } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { CharacterCounter } from "../../shared/CharacterCounter";
import { Loader2, Send } from "lucide-react";
import { BRIEF_CONSTANTS } from "@/lib/constants/brief.constants";

interface CommentFormProps {
  onSubmit: (content: string) => Promise<void>;
}

export function CommentForm({ onSubmit }: CommentFormProps) {
  const [content, setContent] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const trimmedContent = content.trim();
  const isValid = trimmedContent.length > 0 && trimmedContent.length <= BRIEF_CONSTANTS.MAX_COMMENT_LENGTH;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!isValid) return;

    setIsSubmitting(true);
    try {
      await onSubmit(trimmedContent);
      setContent("");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-2">
      <Textarea
        placeholder="Write a comment..."
        value={content}
        onChange={(e) => setContent(e.target.value)}
        rows={3}
        disabled={isSubmitting}
        className="resize-none"
      />

      <div className="flex items-center justify-between">
        <CharacterCounter current={trimmedContent.length} max={BRIEF_CONSTANTS.MAX_COMMENT_LENGTH} />

        <Button type="submit" disabled={!isValid || isSubmitting}>
          {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
          Add Comment
        </Button>
      </div>
    </form>
  );
}
