"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2, UserPlus } from "lucide-react";

interface RecipientAddFormProps {
  onAdd: (email: string) => Promise<void>;
  isLoading?: boolean;
  disabled?: boolean;
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function RecipientAddForm({ onAdd, isLoading, disabled }: RecipientAddFormProps) {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);

  const validateEmail = (value: string): string | null => {
    if (!value.trim()) {
      return "Email is required";
    }
    if (!EMAIL_REGEX.test(value)) {
      return "Please enter a valid email address";
    }
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const validationError = validateEmail(email);
    if (validationError) {
      setError(validationError);
      return;
    }

    setError(null);
    try {
      await onAdd(email.trim());
      setEmail("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add recipient");
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEmail(e.target.value);
    if (error) {
      setError(null);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-2">
      <div className="flex gap-2">
        <div className="flex-1">
          <Input
            type="email"
            placeholder="Enter email address"
            value={email}
            onChange={handleChange}
            disabled={isLoading || disabled}
            aria-label="Recipient email address"
            aria-invalid={!!error}
            aria-describedby={error ? "email-error" : undefined}
          />
        </div>
        <Button type="submit" disabled={isLoading || disabled || !email.trim()}>
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <>
              <UserPlus className="h-4 w-4 mr-2" />
              Add
            </>
          )}
        </Button>
      </div>
      {error && (
        <p id="email-error" className="text-sm text-destructive">
          {error}
        </p>
      )}
      {disabled && !error && <p className="text-sm text-muted-foreground">Maximum number of recipients reached.</p>}
    </form>
  );
}
