"use client";

import { useState, useId, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Eye, EyeOff, Loader2, AlertCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { registerAction } from "@/lib/actions/auth.actions";
import { PasswordRequirements, type PasswordValidation } from "./PasswordRequirements";
import type { UserRole } from "@/types";

// ============================================================================
// Types
// ============================================================================

interface RegisterFormData {
  email: string;
  password: string;
  passwordConfirm: string;
  role: UserRole | "";
}

interface RegisterFormErrors {
  email?: string;
  password?: string;
  passwordConfirm?: string;
  role?: string;
  general?: string;
}

// ============================================================================
// Validation Functions
// ============================================================================

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validateEmail(email: string): string | undefined {
  if (!email.trim()) {
    return "Email is required";
  }
  if (!EMAIL_REGEX.test(email)) {
    return "Please enter a valid email address";
  }
  return undefined;
}

function validatePassword(password: string): string | undefined {
  if (!password) {
    return "Password is required";
  }
  if (password.length < 8) {
    return "Password must be at least 8 characters";
  }
  if (!/\d/.test(password)) {
    return "Password must contain at least one digit";
  }
  return undefined;
}

function validatePasswordConfirm(password: string, confirm: string): string | undefined {
  if (!confirm) {
    return "Password confirmation is required";
  }
  if (password !== confirm) {
    return "Passwords do not match";
  }
  return undefined;
}

function validateRole(role: string): string | undefined {
  if (!role || (role !== "creator" && role !== "client")) {
    return "Please select a role";
  }
  return undefined;
}

function validateForm(data: RegisterFormData): RegisterFormErrors {
  const errors: RegisterFormErrors = {};

  const emailError = validateEmail(data.email);
  if (emailError) {
    errors.email = emailError;
  }

  const passwordError = validatePassword(data.password);
  if (passwordError) {
    errors.password = passwordError;
  }

  const passwordConfirmError = validatePasswordConfirm(data.password, data.passwordConfirm);
  if (passwordConfirmError) {
    errors.passwordConfirm = passwordConfirmError;
  }

  const roleError = validateRole(data.role);
  if (roleError) {
    errors.role = roleError;
  }

  return errors;
}

// ============================================================================
// RegisterForm Component
// ============================================================================

export function RegisterForm() {
  const router = useRouter();

  // Generate unique IDs for accessibility
  const emailId = useId();
  const passwordId = useId();
  const passwordConfirmId = useId();
  const roleId = useId();
  const emailErrorId = useId();
  const passwordErrorId = useId();
  const passwordConfirmErrorId = useId();
  const roleErrorId = useId();
  const generalErrorId = useId();

  // Form state
  const [formData, setFormData] = useState<RegisterFormData>({
    email: "",
    password: "",
    passwordConfirm: "",
    role: "",
  });
  const [errors, setErrors] = useState<RegisterFormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showPasswordConfirm, setShowPasswordConfirm] = useState(false);

  // Real-time password validation for checklist
  const passwordValidation: PasswordValidation = useMemo(
    () => ({
      hasMinLength: formData.password.length >= 8,
      hasDigit: /\d/.test(formData.password),
    }),
    [formData.password]
  );

  // ============================================================================
  // Event Handlers
  // ============================================================================

  function handleEmailChange(e: React.ChangeEvent<HTMLInputElement>) {
    const value = e.target.value;
    setFormData((prev) => ({ ...prev, email: value }));
    if (errors.email) {
      setErrors((prev) => ({ ...prev, email: undefined }));
    }
  }

  function handleEmailBlur() {
    const emailError = validateEmail(formData.email);
    if (emailError) {
      setErrors((prev) => ({ ...prev, email: emailError }));
    }
  }

  function handlePasswordChange(e: React.ChangeEvent<HTMLInputElement>) {
    const value = e.target.value;
    setFormData((prev) => ({ ...prev, password: value }));
    if (errors.password) {
      setErrors((prev) => ({ ...prev, password: undefined }));
    }
    // Also re-validate password confirm if it's not empty
    if (formData.passwordConfirm && value !== formData.passwordConfirm) {
      setErrors((prev) => ({ ...prev, passwordConfirm: "Passwords do not match" }));
    } else if (formData.passwordConfirm && value === formData.passwordConfirm) {
      setErrors((prev) => ({ ...prev, passwordConfirm: undefined }));
    }
  }

  function handlePasswordBlur() {
    const passwordError = validatePassword(formData.password);
    if (passwordError) {
      setErrors((prev) => ({ ...prev, password: passwordError }));
    }
  }

  function handlePasswordConfirmChange(e: React.ChangeEvent<HTMLInputElement>) {
    const value = e.target.value;
    setFormData((prev) => ({ ...prev, passwordConfirm: value }));
    // Real-time validation for password match
    if (value && formData.password !== value) {
      setErrors((prev) => ({ ...prev, passwordConfirm: "Passwords do not match" }));
    } else {
      setErrors((prev) => ({ ...prev, passwordConfirm: undefined }));
    }
  }

  function handlePasswordConfirmBlur() {
    const error = validatePasswordConfirm(formData.password, formData.passwordConfirm);
    if (error) {
      setErrors((prev) => ({ ...prev, passwordConfirm: error }));
    }
  }

  function handleRoleChange(value: string) {
    setFormData((prev) => ({ ...prev, role: value as UserRole }));
    if (errors.role) {
      setErrors((prev) => ({ ...prev, role: undefined }));
    }
  }

  function togglePasswordVisibility() {
    setShowPassword((prev) => !prev);
  }

  function togglePasswordConfirmVisibility() {
    setShowPasswordConfirm((prev) => !prev);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    // Validate all fields (including client-side password confirmation)
    const validationErrors = validateForm(formData);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setIsSubmitting(true);
    setErrors({});

    try {
      // Call Server Action (confirmPassword is NOT sent - client-side validation only)
      const submitData = new FormData();
      submitData.append("email", formData.email);
      submitData.append("password", formData.password);
      submitData.append("role", formData.role);

      const result = await registerAction(submitData);

      if (result.success) {
        router.push(result.redirectTo || "/briefs");
      } else {
        // Handle field-specific errors
        if (result.fieldErrors) {
          setErrors(result.fieldErrors);
        } else if (result.error) {
          // Check for email already registered error
          if (result.error.includes("already registered")) {
            setErrors({ email: result.error });
          } else {
            setErrors({ general: result.error });
          }
        }
      }
    } catch {
      setErrors({ general: "An unexpected error occurred. Please try again." });
    } finally {
      setIsSubmitting(false);
    }
  }

  // ============================================================================
  // Render
  // ============================================================================

  return (
    <Card className="w-full max-w-[600px]">
      <CardHeader className="space-y-1 text-center">
        <div className="mb-2 text-2xl font-bold">B2Proof</div>
        <CardTitle className="text-xl">Create Account</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* General Error Alert */}
          {errors.general && (
            <Alert variant="destructive" id={generalErrorId}>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{errors.general}</AlertDescription>
            </Alert>
          )}

          {/* Email Field */}
          <div className="space-y-2">
            <Label htmlFor={emailId}>Email</Label>
            <Input
              id={emailId}
              name="email"
              type="email"
              placeholder="name@example.com"
              value={formData.email}
              onChange={handleEmailChange}
              onBlur={handleEmailBlur}
              disabled={isSubmitting}
              aria-describedby={errors.email ? emailErrorId : undefined}
              aria-invalid={errors.email ? true : undefined}
              className={errors.email ? "border-destructive" : ""}
            />
            {errors.email && (
              <p id={emailErrorId} className="text-sm text-destructive">
                {errors.email}
              </p>
            )}
          </div>

          {/* Password Field */}
          <div className="space-y-2">
            <Label htmlFor={passwordId}>Password</Label>
            <div className="relative">
              <Input
                id={passwordId}
                name="password"
                type={showPassword ? "text" : "password"}
                placeholder="Enter your password"
                value={formData.password}
                onChange={handlePasswordChange}
                onBlur={handlePasswordBlur}
                disabled={isSubmitting}
                aria-describedby={errors.password ? passwordErrorId : undefined}
                aria-invalid={errors.password ? true : undefined}
                className={`pr-10 ${errors.password ? "border-destructive" : ""}`}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                className="absolute right-1 top-1/2 -translate-y-1/2"
                onClick={togglePasswordVisibility}
                disabled={isSubmitting}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </Button>
            </div>
            {errors.password && (
              <p id={passwordErrorId} className="text-sm text-destructive">
                {errors.password}
              </p>
            )}
          </div>

          {/* Password Requirements Checklist */}
          <PasswordRequirements validation={passwordValidation} />

          {/* Password Confirm Field */}
          <div className="space-y-2">
            <Label htmlFor={passwordConfirmId}>Confirm Password</Label>
            <div className="relative">
              <Input
                id={passwordConfirmId}
                name="passwordConfirm"
                type={showPasswordConfirm ? "text" : "password"}
                placeholder="Confirm your password"
                value={formData.passwordConfirm}
                onChange={handlePasswordConfirmChange}
                onBlur={handlePasswordConfirmBlur}
                disabled={isSubmitting}
                aria-describedby={errors.passwordConfirm ? passwordConfirmErrorId : undefined}
                aria-invalid={errors.passwordConfirm ? true : undefined}
                className={`pr-10 ${errors.passwordConfirm ? "border-destructive" : ""}`}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                className="absolute right-1 top-1/2 -translate-y-1/2"
                onClick={togglePasswordConfirmVisibility}
                disabled={isSubmitting}
                aria-label={showPasswordConfirm ? "Hide password" : "Show password"}
              >
                {showPasswordConfirm ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </Button>
            </div>
            {errors.passwordConfirm && (
              <p id={passwordConfirmErrorId} className="text-sm text-destructive">
                {errors.passwordConfirm}
              </p>
            )}
          </div>

          {/* Role Select */}
          <div className="space-y-2">
            <Label htmlFor={roleId}>Role</Label>
            <Select value={formData.role} onValueChange={handleRoleChange} disabled={isSubmitting}>
              <SelectTrigger
                id={roleId}
                aria-describedby={errors.role ? roleErrorId : undefined}
                aria-invalid={errors.role ? true : undefined}
                className={errors.role ? "border-destructive" : ""}
              >
                <SelectValue placeholder="Select your role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="creator">I&apos;m a Creator</SelectItem>
                <SelectItem value="client">I&apos;m a Client</SelectItem>
              </SelectContent>
            </Select>
            {errors.role && (
              <p id={roleErrorId} className="text-sm text-destructive">
                {errors.role}
              </p>
            )}
          </div>

          {/* Submit Button */}
          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="animate-spin" />
                Creating Account...
              </>
            ) : (
              "Create Account"
            )}
          </Button>
        </form>
      </CardContent>
      <CardFooter className="justify-center">
        <p className="text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link href="/login" className="text-primary underline-offset-4 hover:underline">
            Sign in
          </Link>
        </p>
      </CardFooter>
    </Card>
  );
}
