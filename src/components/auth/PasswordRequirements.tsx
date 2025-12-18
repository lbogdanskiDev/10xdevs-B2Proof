"use client";

import { Check, X } from "lucide-react";

export interface PasswordValidation {
  hasMinLength: boolean;
  hasDigit: boolean;
}

interface PasswordRequirementsProps {
  validation: PasswordValidation;
}

export function PasswordRequirements({ validation }: PasswordRequirementsProps) {
  return (
    <ul aria-live="polite" aria-label="Password requirements" className="space-y-1 text-sm">
      <li className="flex items-center gap-2">
        {validation.hasMinLength ? (
          <Check className="size-4 text-green-600" aria-hidden="true" />
        ) : (
          <X className="size-4 text-muted-foreground" aria-hidden="true" />
        )}
        <span className={validation.hasMinLength ? "text-green-600" : "text-muted-foreground"}>
          Minimum 8 characters
        </span>
      </li>
      <li className="flex items-center gap-2">
        {validation.hasDigit ? (
          <Check className="size-4 text-green-600" aria-hidden="true" />
        ) : (
          <X className="size-4 text-muted-foreground" aria-hidden="true" />
        )}
        <span className={validation.hasDigit ? "text-green-600" : "text-muted-foreground"}>At least one digit</span>
      </li>
    </ul>
  );
}
