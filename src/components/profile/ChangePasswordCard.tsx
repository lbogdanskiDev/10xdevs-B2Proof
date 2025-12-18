"use client";

import { useId } from "react";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { useState } from "react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { PasswordRequirements } from "@/components/auth/PasswordRequirements";
import { useChangePassword } from "@/components/hooks/useChangePassword";

export function ChangePasswordCard() {
  const { formData, validation, isSubmitting, error, success, setField, handleSubmit } = useChangePassword();

  // Password visibility toggles
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Accessibility IDs
  const currentPasswordId = useId();
  const newPasswordId = useId();
  const confirmPasswordId = useId();
  const errorId = useId();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Change Password</CardTitle>
        <CardDescription>Update your password to keep your account secure.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Success message */}
          {success && (
            <Alert className="border-green-200 bg-green-50 text-green-800">
              <AlertDescription>Password updated successfully!</AlertDescription>
            </Alert>
          )}

          {/* Error message */}
          {error && (
            <Alert variant="destructive" id={errorId}>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Current Password */}
          <div className="space-y-2">
            <Label htmlFor={currentPasswordId}>Current Password</Label>
            <div className="relative">
              <Input
                id={currentPasswordId}
                type={showCurrentPassword ? "text" : "password"}
                value={formData.currentPassword}
                onChange={(e) => setField("currentPassword", e.target.value)}
                disabled={isSubmitting}
                placeholder="Enter your current password"
                className="pr-10"
                aria-describedby={error ? errorId : undefined}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-1 top-1/2 h-7 w-7 -translate-y-1/2"
                onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                disabled={isSubmitting}
                aria-label={showCurrentPassword ? "Hide current password" : "Show current password"}
              >
                {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
          </div>

          {/* New Password */}
          <div className="space-y-2">
            <Label htmlFor={newPasswordId}>New Password</Label>
            <div className="relative">
              <Input
                id={newPasswordId}
                type={showNewPassword ? "text" : "password"}
                value={formData.newPassword}
                onChange={(e) => setField("newPassword", e.target.value)}
                disabled={isSubmitting}
                placeholder="Enter your new password"
                className="pr-10"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-1 top-1/2 h-7 w-7 -translate-y-1/2"
                onClick={() => setShowNewPassword(!showNewPassword)}
                disabled={isSubmitting}
                aria-label={showNewPassword ? "Hide new password" : "Show new password"}
              >
                {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
          </div>

          {/* Password Requirements Checklist */}
          <PasswordRequirements validation={validation} />

          {/* Confirm Password */}
          <div className="space-y-2">
            <Label htmlFor={confirmPasswordId}>Confirm New Password</Label>
            <div className="relative">
              <Input
                id={confirmPasswordId}
                type={showConfirmPassword ? "text" : "password"}
                value={formData.confirmPassword}
                onChange={(e) => setField("confirmPassword", e.target.value)}
                disabled={isSubmitting}
                placeholder="Confirm your new password"
                className="pr-10"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-1 top-1/2 h-7 w-7 -translate-y-1/2"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                disabled={isSubmitting}
                aria-label={showConfirmPassword ? "Hide confirm password" : "Show confirm password"}
              >
                {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
            {formData.confirmPassword && formData.newPassword !== formData.confirmPassword && (
              <p className="text-sm text-destructive">Passwords do not match</p>
            )}
          </div>

          {/* Submit Button */}
          <Button type="submit" disabled={isSubmitting} className="w-full">
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Updating...
              </>
            ) : (
              "Update Password"
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
