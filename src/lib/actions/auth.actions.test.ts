import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";
import type { SupabaseClient } from "@/types";

// Mock dependencies BEFORE importing the service
vi.mock("@/db/supabase.server", () => ({
  createSupabaseServerClient: vi.fn(),
}));

vi.mock("@/lib/services/brief.service", () => ({
  updatePendingRecipients: vi.fn(),
}));

// NOW import the functions to test
import { registerAction, loginAction, logoutAction } from "./auth.actions";
import { createSupabaseServerClient } from "@/db/supabase.server";
import { updatePendingRecipients } from "@/lib/services/brief.service";
import { AUTH_CONSTANTS } from "@/lib/constants/auth.constants";

describe("auth.actions", () => {
  let mockSupabase: SupabaseClient;

  beforeEach(() => {
    // Reset all mocks before each test
    vi.clearAllMocks();

    // Create mock Supabase client
    mockSupabase = {
      auth: {
        signUp: vi.fn(),
        signInWithPassword: vi.fn(),
        signOut: vi.fn(),
        getUser: vi.fn(),
      },
    } as unknown as SupabaseClient;

    // Mock createSupabaseServerClient to return our mock
    (createSupabaseServerClient as Mock).mockResolvedValue(mockSupabase);
  });

  // ============================================================================
  // REGISTER ACTION TESTS
  // ============================================================================

  describe("registerAction", () => {
    // TC-AUTH-001.1: Valid creator registration
    it("should successfully register a creator with valid data", async () => {
      // Arrange
      const formData = new FormData();
      formData.append("email", "creator@example.com");
      formData.append("password", "Password1");
      formData.append("role", "creator");

      const mockUser = {
        id: "user-123",
        email: "creator@example.com",
      };

      (mockSupabase.auth.signUp as Mock).mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      (mockSupabase.auth.getUser as Mock).mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      (updatePendingRecipients as Mock).mockResolvedValue(undefined);

      // Act
      const result = await registerAction(formData);

      // Assert
      expect(mockSupabase.auth.signUp).toHaveBeenCalledWith({
        email: "creator@example.com",
        password: "Password1",
        options: {
          data: { role: "creator" },
        },
      });

      expect(updatePendingRecipients).toHaveBeenCalledWith(mockSupabase, "user-123", "creator@example.com");

      expect(result).toEqual({
        success: true,
        redirectTo: AUTH_CONSTANTS.ROUTES.BRIEFS,
      });
    });

    // TC-AUTH-001.2: Valid client registration
    it("should successfully register a client with valid data", async () => {
      // Arrange
      const formData = new FormData();
      formData.append("email", "client@example.com");
      formData.append("password", "SecurePass123");
      formData.append("role", "client");

      const mockUser = {
        id: "user-456",
        email: "client@example.com",
      };

      (mockSupabase.auth.signUp as Mock).mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      (mockSupabase.auth.getUser as Mock).mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      (updatePendingRecipients as Mock).mockResolvedValue(undefined);

      // Act
      const result = await registerAction(formData);

      // Assert
      expect(mockSupabase.auth.signUp).toHaveBeenCalledWith({
        email: "client@example.com",
        password: "SecurePass123",
        options: {
          data: { role: "client" },
        },
      });

      expect(result).toEqual({
        success: true,
        redirectTo: AUTH_CONSTANTS.ROUTES.BRIEFS,
      });
    });

    // TC-AUTH-001.3: Duplicate email
    it("should return error when email already exists", async () => {
      // Arrange
      const formData = new FormData();
      formData.append("email", "existing@example.com");
      formData.append("password", "Password1");
      formData.append("role", "creator");

      (mockSupabase.auth.signUp as Mock).mockResolvedValue({
        data: { user: null },
        error: { message: "User already registered" },
      });

      // Act
      const result = await registerAction(formData);

      // Assert
      expect(result).toEqual({
        success: false,
        error: AUTH_CONSTANTS.MESSAGES.EMAIL_EXISTS,
      });
    });

    // TC-AUTH-001.4: Invalid email format (Zod validation)
    it("should return field error for invalid email format", async () => {
      // Arrange
      const formData = new FormData();
      formData.append("email", "invalid-email");
      formData.append("password", "Password1");
      formData.append("role", "creator");

      // Act
      const result = await registerAction(formData);

      // Assert
      expect(result.success).toBe(false);
      expect(result.fieldErrors).toBeDefined();
      expect(result.fieldErrors?.email).toBe(AUTH_CONSTANTS.MESSAGES.INVALID_EMAIL_FORMAT);
      expect(mockSupabase.auth.signUp).not.toHaveBeenCalled();
    });

    // TC-AUTH-001.5: Password too short
    it("should return field error when password is too short", async () => {
      // Arrange
      const formData = new FormData();
      formData.append("email", "test@example.com");
      formData.append("password", "Pass1");
      formData.append("role", "creator");

      // Act
      const result = await registerAction(formData);

      // Assert
      expect(result.success).toBe(false);
      expect(result.fieldErrors).toBeDefined();
      expect(result.fieldErrors?.password).toBe(AUTH_CONSTANTS.MESSAGES.PASSWORD_MIN_LENGTH);
      expect(mockSupabase.auth.signUp).not.toHaveBeenCalled();
    });

    // TC-AUTH-001.6: Password without digit
    it("should return field error when password lacks digit", async () => {
      // Arrange
      const formData = new FormData();
      formData.append("email", "test@example.com");
      formData.append("password", "Password");
      formData.append("role", "creator");

      // Act
      const result = await registerAction(formData);

      // Assert
      expect(result.success).toBe(false);
      expect(result.fieldErrors).toBeDefined();
      expect(result.fieldErrors?.password).toBe(AUTH_CONSTANTS.MESSAGES.PASSWORD_REQUIRE_DIGIT);
      expect(mockSupabase.auth.signUp).not.toHaveBeenCalled();
    });

    // TC-AUTH-001.7: Missing role selection
    it("should return field error when role is not selected", async () => {
      // Arrange
      const formData = new FormData();
      formData.append("email", "test@example.com");
      formData.append("password", "Password1");
      // No role field

      // Act
      const result = await registerAction(formData);

      // Assert
      expect(result.success).toBe(false);
      expect(result.fieldErrors).toBeDefined();
      expect(result.fieldErrors?.role).toBe(AUTH_CONSTANTS.MESSAGES.SELECT_ACCOUNT_TYPE);
      expect(mockSupabase.auth.signUp).not.toHaveBeenCalled();
    });

    it("should return field error when role is invalid", async () => {
      // Arrange
      const formData = new FormData();
      formData.append("email", "test@example.com");
      formData.append("password", "Password1");
      formData.append("role", "admin");

      // Act
      const result = await registerAction(formData);

      // Assert
      expect(result.success).toBe(false);
      expect(result.fieldErrors).toBeDefined();
      expect(result.fieldErrors?.role).toBeDefined();
      expect(mockSupabase.auth.signUp).not.toHaveBeenCalled();
    });

    it("should return multiple field errors when multiple fields are invalid", async () => {
      // Arrange
      const formData = new FormData();
      formData.append("email", "invalid");
      formData.append("password", "short");
      formData.append("role", "");

      // Act
      const result = await registerAction(formData);

      // Assert
      expect(result.success).toBe(false);
      expect(result.fieldErrors).toBeDefined();
      expect(result.fieldErrors?.email).toBeDefined();
      expect(result.fieldErrors?.password).toBeDefined();
      expect(result.fieldErrors?.role).toBeDefined();
      expect(mockSupabase.auth.signUp).not.toHaveBeenCalled();
    });

    it("should handle weak password error from Supabase", async () => {
      // Arrange
      const formData = new FormData();
      formData.append("email", "test@example.com");
      formData.append("password", "Password1");
      formData.append("role", "creator");

      (mockSupabase.auth.signUp as Mock).mockResolvedValue({
        data: { user: null },
        error: { message: "Password should be at least 8 characters" },
      });

      // Act
      const result = await registerAction(formData);

      // Assert
      expect(result).toEqual({
        success: false,
        error: AUTH_CONSTANTS.MESSAGES.WEAK_PASSWORD,
      });
    });

    it("should handle invalid email error from Supabase", async () => {
      // Arrange
      const formData = new FormData();
      formData.append("email", "test@example.com");
      formData.append("password", "Password1");
      formData.append("role", "creator");

      (mockSupabase.auth.signUp as Mock).mockResolvedValue({
        data: { user: null },
        error: { message: "Invalid email format" },
      });

      // Act
      const result = await registerAction(formData);

      // Assert
      expect(result).toEqual({
        success: false,
        error: AUTH_CONSTANTS.MESSAGES.INVALID_EMAIL_FORMAT,
      });
    });

    it("should handle unexpected errors gracefully", async () => {
      // Arrange
      const formData = new FormData();
      formData.append("email", "test@example.com");
      formData.append("password", "Password1");
      formData.append("role", "creator");

      (createSupabaseServerClient as Mock).mockRejectedValue(new Error("Network error"));

      // Act
      const result = await registerAction(formData);

      // Assert
      expect(result).toEqual({
        success: false,
        error: "An unexpected error occurred. Please try again.",
      });
    });

    it("should update pending recipients after successful registration", async () => {
      // Arrange
      const formData = new FormData();
      formData.append("email", "newuser@example.com");
      formData.append("password", "Password1");
      formData.append("role", "client");

      const mockUser = {
        id: "user-789",
        email: "newuser@example.com",
      };

      (mockSupabase.auth.signUp as Mock).mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      (mockSupabase.auth.getUser as Mock).mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      (updatePendingRecipients as Mock).mockResolvedValue(undefined);

      // Act
      await registerAction(formData);

      // Assert
      expect(updatePendingRecipients).toHaveBeenCalledWith(mockSupabase, "user-789", "newuser@example.com");
    });

    it("should handle case when user has no email after registration", async () => {
      // Arrange
      const formData = new FormData();
      formData.append("email", "test@example.com");
      formData.append("password", "Password1");
      formData.append("role", "creator");

      const mockUser = {
        id: "user-123",
        email: undefined,
      };

      (mockSupabase.auth.signUp as Mock).mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      (mockSupabase.auth.getUser as Mock).mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      // Act
      const result = await registerAction(formData);

      // Assert
      expect(updatePendingRecipients).not.toHaveBeenCalled();
      expect(result.success).toBe(true);
    });
  });

  // ============================================================================
  // LOGIN ACTION TESTS
  // ============================================================================

  describe("loginAction", () => {
    it("should successfully login with valid credentials", async () => {
      // Arrange
      const formData = new FormData();
      formData.append("email", "user@example.com");
      formData.append("password", "Password1");

      const mockUser = {
        id: "user-123",
        email: "user@example.com",
      };

      (mockSupabase.auth.signInWithPassword as Mock).mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      (mockSupabase.auth.signOut as Mock).mockResolvedValue({
        error: null,
      });

      (mockSupabase.auth.getUser as Mock).mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      (updatePendingRecipients as Mock).mockResolvedValue(undefined);

      // Act
      const result = await loginAction(formData);

      // Assert
      expect(mockSupabase.auth.signInWithPassword).toHaveBeenCalledWith({
        email: "user@example.com",
        password: "Password1",
      });

      expect(mockSupabase.auth.signOut).toHaveBeenCalledWith({ scope: "others" });

      expect(result).toEqual({
        success: true,
        redirectTo: AUTH_CONSTANTS.ROUTES.BRIEFS,
      });
    });

    it("should return error for invalid credentials", async () => {
      // Arrange
      const formData = new FormData();
      formData.append("email", "user@example.com");
      formData.append("password", "WrongPassword1");

      (mockSupabase.auth.signInWithPassword as Mock).mockResolvedValue({
        data: { user: null },
        error: { message: "Invalid login credentials" },
      });

      // Act
      const result = await loginAction(formData);

      // Assert
      expect(result).toEqual({
        success: false,
        error: AUTH_CONSTANTS.MESSAGES.INVALID_CREDENTIALS,
      });
    });

    it("should return field error for missing email", async () => {
      // Arrange
      const formData = new FormData();
      formData.append("password", "Password1");

      // Act
      const result = await loginAction(formData);

      // Assert
      expect(result.success).toBe(false);
      expect(result.fieldErrors).toBeDefined();
      expect(result.fieldErrors?.email).toBe(AUTH_CONSTANTS.MESSAGES.EMAIL_REQUIRED);
    });

    it("should return field error for missing password", async () => {
      // Arrange
      const formData = new FormData();
      formData.append("email", "user@example.com");

      // Act
      const result = await loginAction(formData);

      // Assert
      expect(result.success).toBe(false);
      expect(result.fieldErrors).toBeDefined();
      expect(result.fieldErrors?.password).toBe(AUTH_CONSTANTS.MESSAGES.PASSWORD_REQUIRED);
    });
  });

  // ============================================================================
  // LOGOUT ACTION TESTS
  // ============================================================================

  describe("logoutAction", () => {
    it("should successfully logout", async () => {
      // Arrange
      (mockSupabase.auth.signOut as Mock).mockResolvedValue({
        error: null,
      });

      // Act
      const result = await logoutAction();

      // Assert
      expect(mockSupabase.auth.signOut).toHaveBeenCalledOnce();
      expect(result).toEqual({
        success: true,
        redirectTo: AUTH_CONSTANTS.ROUTES.LOGIN,
      });
    });

    it("should return error when logout fails", async () => {
      // Arrange
      (mockSupabase.auth.signOut as Mock).mockResolvedValue({
        error: { message: "Session not found" },
      });

      // Act
      const result = await logoutAction();

      // Assert
      expect(result).toEqual({
        success: false,
        error: "Failed to sign out. Please try again.",
      });
    });

    it("should handle unexpected errors during logout", async () => {
      // Arrange
      (createSupabaseServerClient as Mock).mockRejectedValue(new Error("Network error"));

      // Act
      const result = await logoutAction();

      // Assert
      expect(result).toEqual({
        success: false,
        error: "An unexpected error occurred. Please try again.",
      });
    });
  });

  // ============================================================================
  // ERROR MAPPING TESTS
  // ============================================================================

  describe("Supabase error mapping", () => {
    it("should map 'Invalid login credentials' to user-friendly message", async () => {
      // Arrange
      const formData = new FormData();
      formData.append("email", "test@example.com");
      formData.append("password", "WrongPass1");

      (mockSupabase.auth.signInWithPassword as Mock).mockResolvedValue({
        data: { user: null },
        error: { message: "Invalid login credentials" },
      });

      // Act
      const result = await loginAction(formData);

      // Assert
      expect(result.error).toBe(AUTH_CONSTANTS.MESSAGES.INVALID_CREDENTIALS);
    });

    it("should map 'User already registered' to user-friendly message", async () => {
      // Arrange
      const formData = new FormData();
      formData.append("email", "existing@example.com");
      formData.append("password", "Password1");
      formData.append("role", "creator");

      (mockSupabase.auth.signUp as Mock).mockResolvedValue({
        data: { user: null },
        error: { message: "User already registered" },
      });

      // Act
      const result = await registerAction(formData);

      // Assert
      expect(result.error).toBe(AUTH_CONSTANTS.MESSAGES.EMAIL_EXISTS);
    });

    it("should map password validation errors to user-friendly message", async () => {
      // Arrange
      const formData = new FormData();
      formData.append("email", "test@example.com");
      formData.append("password", "Password1");
      formData.append("role", "creator");

      (mockSupabase.auth.signUp as Mock).mockResolvedValue({
        data: { user: null },
        error: { message: "Password should be at least 8 characters" },
      });

      // Act
      const result = await registerAction(formData);

      // Assert
      expect(result.error).toBe(AUTH_CONSTANTS.MESSAGES.WEAK_PASSWORD);
    });

    it("should map email validation errors to user-friendly message", async () => {
      // Arrange
      const formData = new FormData();
      formData.append("email", "test@example.com");
      formData.append("password", "Password1");
      formData.append("role", "creator");

      (mockSupabase.auth.signUp as Mock).mockResolvedValue({
        data: { user: null },
        error: { message: "Invalid email provided" },
      });

      // Act
      const result = await registerAction(formData);

      // Assert
      expect(result.error).toBe(AUTH_CONSTANTS.MESSAGES.INVALID_EMAIL_FORMAT);
    });

    it("should return generic message for unknown Supabase errors", async () => {
      // Arrange
      const formData = new FormData();
      formData.append("email", "test@example.com");
      formData.append("password", "Password1");
      formData.append("role", "creator");

      (mockSupabase.auth.signUp as Mock).mockResolvedValue({
        data: { user: null },
        error: { message: "Unknown database error" },
      });

      // Act
      const result = await registerAction(formData);

      // Assert
      expect(result.error).toBe("An unexpected error occurred. Please try again.");
    });
  });
});
