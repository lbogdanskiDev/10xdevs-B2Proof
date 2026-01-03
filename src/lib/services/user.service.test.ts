import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";
import type { SupabaseClient } from "@/types";
import { UnauthorizedError, NotFoundError } from "@/lib/errors/api-errors";
import { createMockFromChain, suppressConsole, createMockUser, createMockProfile } from "../helpers/test-helpers";

// Mock the Supabase server module BEFORE importing the service
vi.mock("@/db/supabase.server", () => ({
  createSupabaseAdminClient: vi.fn(),
}));

// NOW import the service (after mocking dependencies)
import { getUserProfile, deleteUserAccount } from "./user.service";
import { createSupabaseAdminClient } from "@/db/supabase.server";

describe("user.service", () => {
  let mockSupabase: SupabaseClient;
  let mockAdminClient: SupabaseClient;

  beforeEach(() => {
    // Reset all mocks before each test
    vi.clearAllMocks();

    // Create mock Supabase client
    mockSupabase = {
      auth: {
        getUser: vi.fn(),
      },
      from: vi.fn(() => createMockFromChain()),
    } as unknown as SupabaseClient;

    // Create mock admin client
    mockAdminClient = {
      auth: {
        admin: {
          getUserById: vi.fn(),
          deleteUser: vi.fn(),
        },
      },
      from: vi.fn(() => createMockFromChain()),
    } as unknown as SupabaseClient;

    // Mock the createSupabaseAdminClient function to return our mock
    (createSupabaseAdminClient as Mock).mockReturnValue(mockAdminClient);
  });

  describe("getUserProfile", () => {
    it("should return user profile when user is authenticated and profile exists", async () => {
      // Arrange
      const mockUser = createMockUser();
      const mockProfile = createMockProfile();

      (mockSupabase.auth.getUser as Mock).mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      const mockChain = createMockFromChain({
        single: vi.fn().mockResolvedValue({
          data: mockProfile,
          error: null,
        }),
      });

      (mockSupabase.from as Mock).mockReturnValue(mockChain);

      // Act
      const result = await getUserProfile(mockSupabase);

      // Assert
      expect(mockSupabase.auth.getUser).toHaveBeenCalledOnce();
      expect(mockSupabase.from).toHaveBeenCalledWith("profiles");
      expect(mockChain.select).toHaveBeenCalledWith("id, role, created_at, updated_at");
      expect(mockChain.eq).toHaveBeenCalledWith("id", "user-123");
      expect(mockChain.single).toHaveBeenCalledOnce();

      expect(result).toEqual({
        id: "user-123",
        email: "test@example.com",
        role: "creator",
        createdAt: "2024-01-01T00:00:00Z",
        updatedAt: "2024-01-01T00:00:00Z",
      });
    });

    it("should throw UnauthorizedError when auth.getUser returns error", async () => {
      // Arrange
      (mockSupabase.auth.getUser as Mock).mockResolvedValue({
        data: { user: null },
        error: { message: "Invalid token" },
      });

      // Act & Assert
      await expect(getUserProfile(mockSupabase)).rejects.toThrow(UnauthorizedError);
      await expect(getUserProfile(mockSupabase)).rejects.toThrow("Not authenticated");
    });

    it("should throw UnauthorizedError when user is null", async () => {
      // Arrange
      (mockSupabase.auth.getUser as Mock).mockResolvedValue({
        data: { user: null },
        error: null,
      });

      // Act & Assert
      await expect(getUserProfile(mockSupabase)).rejects.toThrow(UnauthorizedError);
      await expect(getUserProfile(mockSupabase)).rejects.toThrow("Not authenticated");
    });

    it("should throw NotFoundError when profile fetch returns error", async () => {
      // Arrange
      const mockUser = createMockUser();

      (mockSupabase.auth.getUser as Mock).mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      const mockChain = createMockFromChain({
        single: vi.fn().mockResolvedValue({
          data: null,
          error: { message: "Profile not found" },
        }),
      });

      (mockSupabase.from as Mock).mockReturnValue(mockChain);

      // Act & Assert
      await expect(getUserProfile(mockSupabase)).rejects.toThrow(NotFoundError);
      await expect(getUserProfile(mockSupabase)).rejects.toThrow("Profile not found");
    });

    it("should throw NotFoundError when profile data is null", async () => {
      // Arrange
      const mockUser = createMockUser();

      (mockSupabase.auth.getUser as Mock).mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      const mockChain = createMockFromChain({
        single: vi.fn().mockResolvedValue({
          data: null,
          error: null,
        }),
      });

      (mockSupabase.from as Mock).mockReturnValue(mockChain);

      // Act & Assert
      await expect(getUserProfile(mockSupabase)).rejects.toThrow(NotFoundError);
      await expect(getUserProfile(mockSupabase)).rejects.toThrow("Profile not found");
    });

    it("should handle missing email gracefully with empty string", async () => {
      // Arrange
      const mockUser = createMockUser({ email: null });
      const mockProfile = createMockProfile({ role: "client" });

      (mockSupabase.auth.getUser as Mock).mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      const mockChain = createMockFromChain({
        single: vi.fn().mockResolvedValue({
          data: mockProfile,
          error: null,
        }),
      });

      (mockSupabase.from as Mock).mockReturnValue(mockChain);

      // Act
      const result = await getUserProfile(mockSupabase);

      // Assert
      expect(result.email).toBe("");
    });
  });

  describe("deleteUserAccount", () => {
    it("should successfully delete user account with full audit trail", async () => {
      // Arrange
      const userId = "user-123";
      const mockProfile = createMockProfile({ id: userId });
      const mockUser = createMockUser({ id: userId });

      // Mock profile fetch
      const mockProfileChain = createMockFromChain({
        single: vi.fn().mockResolvedValue({
          data: mockProfile,
          error: null,
        }),
      });

      // Mock audit log insert
      const mockAuditChain = createMockFromChain({
        insert: vi.fn().mockResolvedValue({
          data: null,
          error: null,
        }),
      });

      (mockSupabase.from as Mock).mockReturnValue(mockProfileChain);
      (mockAdminClient.from as Mock).mockReturnValue(mockAuditChain);

      // Mock admin getUserById
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      (mockAdminClient.auth.admin!.getUserById as Mock).mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      // Mock user deletion
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      (mockAdminClient.auth.admin!.deleteUser as Mock).mockResolvedValue({
        data: null,
        error: null,
      });

      // Suppress console.log for this test
      const consoleLogSpy = suppressConsole("log");

      // Act
      await deleteUserAccount(mockSupabase, userId);

      // Assert
      expect(createSupabaseAdminClient).toHaveBeenCalledOnce();
      expect(mockSupabase.from).toHaveBeenCalledWith("profiles");
      expect(mockProfileChain.select).toHaveBeenCalledWith("id, role, created_at");
      expect(mockProfileChain.eq).toHaveBeenCalledWith("id", userId);

      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      expect(mockAdminClient.auth.admin!.getUserById).toHaveBeenCalledWith(userId);

      expect(mockAdminClient.from).toHaveBeenCalledWith("audit_log");
      expect(mockAuditChain.insert).toHaveBeenCalledWith({
        user_id: userId,
        action: "user_deleted",
        entity_type: "user",
        entity_id: userId,
        old_data: {
          id: mockProfile.id,
          role: mockProfile.role,
          email: mockUser.email,
          created_at: mockProfile.created_at,
        },
        new_data: null,
      });

      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      expect(mockAdminClient.auth.admin!.deleteUser).toHaveBeenCalledWith(userId);
      expect(consoleLogSpy).toHaveBeenCalledWith(`User account deleted: ${userId}`);

      consoleLogSpy.mockRestore();
    });

    it("should throw error when profile is not found", async () => {
      // Arrange
      const userId = "user-123";

      const mockChain = createMockFromChain({
        single: vi.fn().mockResolvedValue({
          data: null,
          error: { message: "Profile not found" },
        }),
      });

      (mockSupabase.from as Mock).mockReturnValue(mockChain);

      // Act & Assert
      await expect(deleteUserAccount(mockSupabase, userId)).rejects.toThrow("User not found");
    });

    it("should throw error when profile data is null", async () => {
      // Arrange
      const userId = "user-123";

      const mockChain = createMockFromChain({
        single: vi.fn().mockResolvedValue({
          data: null,
          error: null,
        }),
      });

      (mockSupabase.from as Mock).mockReturnValue(mockChain);

      // Act & Assert
      await expect(deleteUserAccount(mockSupabase, userId)).rejects.toThrow("User not found");
    });

    it("should throw error when auth user is not found", async () => {
      // Arrange
      const userId = "user-123";
      const mockProfile = createMockProfile({ id: userId });

      const mockChain = createMockFromChain({
        single: vi.fn().mockResolvedValue({
          data: mockProfile,
          error: null,
        }),
      });

      (mockSupabase.from as Mock).mockReturnValue(mockChain);

      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      (mockAdminClient.auth.admin!.getUserById as Mock).mockResolvedValue({
        data: { user: null },
        error: { message: "User not found in auth" },
      });

      // Act & Assert
      await expect(deleteUserAccount(mockSupabase, userId)).rejects.toThrow("User not found in auth system");
    });

    it("should throw error when auth user data is null", async () => {
      // Arrange
      const userId = "user-123";
      const mockProfile = createMockProfile({ id: userId });

      const mockChain = createMockFromChain({
        single: vi.fn().mockResolvedValue({
          data: mockProfile,
          error: null,
        }),
      });

      (mockSupabase.from as Mock).mockReturnValue(mockChain);

      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      (mockAdminClient.auth.admin!.getUserById as Mock).mockResolvedValue({
        data: { user: null },
        error: null,
      });

      // Act & Assert
      await expect(deleteUserAccount(mockSupabase, userId)).rejects.toThrow("User not found in auth system");
    });

    it("should throw error when audit log creation fails", async () => {
      // Arrange
      const userId = "user-123";
      const mockProfile = createMockProfile({ id: userId });
      const mockUser = createMockUser({ id: userId });

      const mockProfileChain = createMockFromChain({
        single: vi.fn().mockResolvedValue({
          data: mockProfile,
          error: null,
        }),
      });

      const mockAuditChain = createMockFromChain({
        insert: vi.fn().mockResolvedValue({
          data: null,
          error: { message: "Audit insert failed" },
        }),
      });

      (mockSupabase.from as Mock).mockReturnValue(mockProfileChain);
      (mockAdminClient.from as Mock).mockReturnValue(mockAuditChain);

      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      (mockAdminClient.auth.admin!.getUserById as Mock).mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      // Suppress console.error for this test
      const consoleErrorSpy = suppressConsole("error");

      // Act & Assert
      await expect(deleteUserAccount(mockSupabase, userId)).rejects.toThrow("Failed to log account deletion");

      expect(consoleErrorSpy).toHaveBeenCalledWith("Failed to create audit log:", { message: "Audit insert failed" });

      consoleErrorSpy.mockRestore();
    });

    it("should throw error when user deletion fails", async () => {
      // Arrange
      const userId = "user-123";
      const mockProfile = createMockProfile({ id: userId });
      const mockUser = createMockUser({ id: userId });

      const mockProfileChain = createMockFromChain({
        single: vi.fn().mockResolvedValue({
          data: mockProfile,
          error: null,
        }),
      });

      const mockAuditChain = createMockFromChain({
        insert: vi.fn().mockResolvedValue({
          data: null,
          error: null,
        }),
      });

      (mockSupabase.from as Mock).mockReturnValue(mockProfileChain);
      (mockAdminClient.from as Mock).mockReturnValue(mockAuditChain);

      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      (mockAdminClient.auth.admin!.getUserById as Mock).mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      (mockAdminClient.auth.admin!.deleteUser as Mock).mockResolvedValue({
        data: null,
        error: { message: "Delete failed" },
      });

      // Suppress console.error for this test
      const consoleErrorSpy = suppressConsole("error");

      // Act & Assert
      await expect(deleteUserAccount(mockSupabase, userId)).rejects.toThrow("Failed to delete user account");

      expect(consoleErrorSpy).toHaveBeenCalledWith("Failed to delete user:", { message: "Delete failed" });

      consoleErrorSpy.mockRestore();
    });
  });
});
