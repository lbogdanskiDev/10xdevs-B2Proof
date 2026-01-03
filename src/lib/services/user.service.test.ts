import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import type { SupabaseClient } from '@/types';
import { UnauthorizedError, NotFoundError } from '@/lib/errors/api-errors';

// Mock the Supabase server module BEFORE importing the service
vi.mock('@/db/supabase.server', () => ({
  createSupabaseAdminClient: vi.fn(),
}));

// NOW import the service (after mocking dependencies)
import { getUserProfile, deleteUserAccount } from './user.service';
import { createSupabaseAdminClient } from '@/db/supabase.server';

describe('user.service', () => {
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
      from: vi.fn(() => ({
        select: vi.fn().mockReturnThis(),
        insert: vi.fn().mockReturnThis(),
        update: vi.fn().mockReturnThis(),
        delete: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn(),
      })),
    } as unknown as SupabaseClient;

    // Create mock admin client
    mockAdminClient = {
      auth: {
        admin: {
          getUserById: vi.fn(),
          deleteUser: vi.fn(),
        },
      },
      from: vi.fn(() => ({
        insert: vi.fn().mockReturnThis(),
      })),
    } as unknown as SupabaseClient;

    // Mock the createSupabaseAdminClient function to return our mock
    (createSupabaseAdminClient as Mock).mockReturnValue(mockAdminClient);
  });

  describe('getUserProfile', () => {
    it('should return user profile when user is authenticated and profile exists', async () => {
      // Arrange
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
      };

      const mockProfile = {
        id: 'user-123',
        role: 'creator',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      };

      (mockSupabase.auth.getUser as Mock).mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      const mockSelect = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockReturnThis();
      const mockSingle = vi.fn().mockResolvedValue({
        data: mockProfile,
        error: null,
      });

      (mockSupabase.from as Mock).mockReturnValue({
        select: mockSelect,
        eq: mockEq,
        single: mockSingle,
      });

      // Act
      const result = await getUserProfile(mockSupabase);

      // Assert
      expect(mockSupabase.auth.getUser).toHaveBeenCalledOnce();
      expect(mockSupabase.from).toHaveBeenCalledWith('profiles');
      expect(mockSelect).toHaveBeenCalledWith('id, role, created_at, updated_at');
      expect(mockEq).toHaveBeenCalledWith('id', 'user-123');
      expect(mockSingle).toHaveBeenCalledOnce();

      expect(result).toEqual({
        id: 'user-123',
        email: 'test@example.com',
        role: 'creator',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      });
    });

    it('should throw UnauthorizedError when auth.getUser returns error', async () => {
      // Arrange
      (mockSupabase.auth.getUser as Mock).mockResolvedValue({
        data: { user: null },
        error: { message: 'Invalid token' },
      });

      // Act & Assert
      await expect(getUserProfile(mockSupabase)).rejects.toThrow(UnauthorizedError);
      await expect(getUserProfile(mockSupabase)).rejects.toThrow('Not authenticated');
    });

    it('should throw UnauthorizedError when user is null', async () => {
      // Arrange
      (mockSupabase.auth.getUser as Mock).mockResolvedValue({
        data: { user: null },
        error: null,
      });

      // Act & Assert
      await expect(getUserProfile(mockSupabase)).rejects.toThrow(UnauthorizedError);
      await expect(getUserProfile(mockSupabase)).rejects.toThrow('Not authenticated');
    });

    it('should throw NotFoundError when profile fetch returns error', async () => {
      // Arrange
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
      };

      (mockSupabase.auth.getUser as Mock).mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      const mockSelect = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockReturnThis();
      const mockSingle = vi.fn().mockResolvedValue({
        data: null,
        error: { message: 'Profile not found' },
      });

      (mockSupabase.from as Mock).mockReturnValue({
        select: mockSelect,
        eq: mockEq,
        single: mockSingle,
      });

      // Act & Assert
      await expect(getUserProfile(mockSupabase)).rejects.toThrow(NotFoundError);
      await expect(getUserProfile(mockSupabase)).rejects.toThrow('Profile not found');
    });

    it('should throw NotFoundError when profile data is null', async () => {
      // Arrange
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
      };

      (mockSupabase.auth.getUser as Mock).mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      const mockSelect = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockReturnThis();
      const mockSingle = vi.fn().mockResolvedValue({
        data: null,
        error: null,
      });

      (mockSupabase.from as Mock).mockReturnValue({
        select: mockSelect,
        eq: mockEq,
        single: mockSingle,
      });

      // Act & Assert
      await expect(getUserProfile(mockSupabase)).rejects.toThrow(NotFoundError);
      await expect(getUserProfile(mockSupabase)).rejects.toThrow('Profile not found');
    });

    it('should handle missing email gracefully with empty string', async () => {
      // Arrange
      const mockUser = {
        id: 'user-123',
        email: null,
      };

      const mockProfile = {
        id: 'user-123',
        role: 'client',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      };

      (mockSupabase.auth.getUser as Mock).mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      const mockSelect = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockReturnThis();
      const mockSingle = vi.fn().mockResolvedValue({
        data: mockProfile,
        error: null,
      });

      (mockSupabase.from as Mock).mockReturnValue({
        select: mockSelect,
        eq: mockEq,
        single: mockSingle,
      });

      // Act
      const result = await getUserProfile(mockSupabase);

      // Assert
      expect(result.email).toBe('');
    });
  });

  describe('deleteUserAccount', () => {
    it('should successfully delete user account with full audit trail', async () => {
      // Arrange
      const userId = 'user-123';
      const mockProfile = {
        id: userId,
        role: 'creator',
        created_at: '2024-01-01T00:00:00Z',
      };

      const mockUser = {
        id: userId,
        email: 'test@example.com',
      };

      // Mock profile fetch
      const mockProfileSelect = vi.fn().mockReturnThis();
      const mockProfileEq = vi.fn().mockReturnThis();
      const mockProfileSingle = vi.fn().mockResolvedValue({
        data: mockProfile,
        error: null,
      });

      (mockSupabase.from as Mock).mockReturnValue({
        select: mockProfileSelect,
        eq: mockProfileEq,
        single: mockProfileSingle,
      });

      // Mock admin getUserById
      (mockAdminClient.auth.admin!.getUserById as Mock).mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      // Mock audit log insert
      const mockAuditInsert = vi.fn().mockResolvedValue({
        data: null,
        error: null,
      });

      (mockAdminClient.from as Mock).mockReturnValue({
        insert: mockAuditInsert,
      });

      // Mock user deletion
      (mockAdminClient.auth.admin!.deleteUser as Mock).mockResolvedValue({
        data: null,
        error: null,
      });

      // Suppress console.log for this test
      const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      // Act
      await deleteUserAccount(mockSupabase, userId);

      // Assert
      expect(createSupabaseAdminClient).toHaveBeenCalledOnce();
      expect(mockSupabase.from).toHaveBeenCalledWith('profiles');
      expect(mockProfileSelect).toHaveBeenCalledWith('id, role, created_at');
      expect(mockProfileEq).toHaveBeenCalledWith('id', userId);

      expect(mockAdminClient.auth.admin!.getUserById).toHaveBeenCalledWith(userId);

      expect(mockAdminClient.from).toHaveBeenCalledWith('audit_log');
      expect(mockAuditInsert).toHaveBeenCalledWith({
        user_id: userId,
        action: 'user_deleted',
        entity_type: 'user',
        entity_id: userId,
        old_data: {
          id: mockProfile.id,
          role: mockProfile.role,
          email: mockUser.email,
          created_at: mockProfile.created_at,
        },
        new_data: null,
      });

      expect(mockAdminClient.auth.admin!.deleteUser).toHaveBeenCalledWith(userId);
      expect(consoleLogSpy).toHaveBeenCalledWith(`User account deleted: ${userId}`);

      consoleLogSpy.mockRestore();
    });

    it('should throw error when profile is not found', async () => {
      // Arrange
      const userId = 'user-123';

      const mockProfileSelect = vi.fn().mockReturnThis();
      const mockProfileEq = vi.fn().mockReturnThis();
      const mockProfileSingle = vi.fn().mockResolvedValue({
        data: null,
        error: { message: 'Profile not found' },
      });

      (mockSupabase.from as Mock).mockReturnValue({
        select: mockProfileSelect,
        eq: mockProfileEq,
        single: mockProfileSingle,
      });

      // Act & Assert
      await expect(deleteUserAccount(mockSupabase, userId)).rejects.toThrow('User not found');
    });

    it('should throw error when profile data is null', async () => {
      // Arrange
      const userId = 'user-123';

      const mockProfileSelect = vi.fn().mockReturnThis();
      const mockProfileEq = vi.fn().mockReturnThis();
      const mockProfileSingle = vi.fn().mockResolvedValue({
        data: null,
        error: null,
      });

      (mockSupabase.from as Mock).mockReturnValue({
        select: mockProfileSelect,
        eq: mockProfileEq,
        single: mockProfileSingle,
      });

      // Act & Assert
      await expect(deleteUserAccount(mockSupabase, userId)).rejects.toThrow('User not found');
    });

    it('should throw error when auth user is not found', async () => {
      // Arrange
      const userId = 'user-123';
      const mockProfile = {
        id: userId,
        role: 'creator',
        created_at: '2024-01-01T00:00:00Z',
      };

      const mockProfileSelect = vi.fn().mockReturnThis();
      const mockProfileEq = vi.fn().mockReturnThis();
      const mockProfileSingle = vi.fn().mockResolvedValue({
        data: mockProfile,
        error: null,
      });

      (mockSupabase.from as Mock).mockReturnValue({
        select: mockProfileSelect,
        eq: mockProfileEq,
        single: mockProfileSingle,
      });

      (mockAdminClient.auth.admin!.getUserById as Mock).mockResolvedValue({
        data: { user: null },
        error: { message: 'User not found in auth' },
      });

      // Act & Assert
      await expect(deleteUserAccount(mockSupabase, userId)).rejects.toThrow('User not found in auth system');
    });

    it('should throw error when auth user data is null', async () => {
      // Arrange
      const userId = 'user-123';
      const mockProfile = {
        id: userId,
        role: 'creator',
        created_at: '2024-01-01T00:00:00Z',
      };

      const mockProfileSelect = vi.fn().mockReturnThis();
      const mockProfileEq = vi.fn().mockReturnThis();
      const mockProfileSingle = vi.fn().mockResolvedValue({
        data: mockProfile,
        error: null,
      });

      (mockSupabase.from as Mock).mockReturnValue({
        select: mockProfileSelect,
        eq: mockProfileEq,
        single: mockProfileSingle,
      });

      (mockAdminClient.auth.admin!.getUserById as Mock).mockResolvedValue({
        data: { user: null },
        error: null,
      });

      // Act & Assert
      await expect(deleteUserAccount(mockSupabase, userId)).rejects.toThrow('User not found in auth system');
    });

    it('should throw error when audit log creation fails', async () => {
      // Arrange
      const userId = 'user-123';
      const mockProfile = {
        id: userId,
        role: 'creator',
        created_at: '2024-01-01T00:00:00Z',
      };

      const mockUser = {
        id: userId,
        email: 'test@example.com',
      };

      const mockProfileSelect = vi.fn().mockReturnThis();
      const mockProfileEq = vi.fn().mockReturnThis();
      const mockProfileSingle = vi.fn().mockResolvedValue({
        data: mockProfile,
        error: null,
      });

      (mockSupabase.from as Mock).mockReturnValue({
        select: mockProfileSelect,
        eq: mockProfileEq,
        single: mockProfileSingle,
      });

      (mockAdminClient.auth.admin!.getUserById as Mock).mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      const mockAuditInsert = vi.fn().mockResolvedValue({
        data: null,
        error: { message: 'Audit insert failed' },
      });

      (mockAdminClient.from as Mock).mockReturnValue({
        insert: mockAuditInsert,
      });

      // Suppress console.error for this test
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      // Act & Assert
      await expect(deleteUserAccount(mockSupabase, userId)).rejects.toThrow('Failed to log account deletion');

      expect(consoleErrorSpy).toHaveBeenCalledWith('Failed to create audit log:', { message: 'Audit insert failed' });

      consoleErrorSpy.mockRestore();
    });

    it('should throw error when user deletion fails', async () => {
      // Arrange
      const userId = 'user-123';
      const mockProfile = {
        id: userId,
        role: 'creator',
        created_at: '2024-01-01T00:00:00Z',
      };

      const mockUser = {
        id: userId,
        email: 'test@example.com',
      };

      const mockProfileSelect = vi.fn().mockReturnThis();
      const mockProfileEq = vi.fn().mockReturnThis();
      const mockProfileSingle = vi.fn().mockResolvedValue({
        data: mockProfile,
        error: null,
      });

      (mockSupabase.from as Mock).mockReturnValue({
        select: mockProfileSelect,
        eq: mockProfileEq,
        single: mockProfileSingle,
      });

      (mockAdminClient.auth.admin!.getUserById as Mock).mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      const mockAuditInsert = vi.fn().mockResolvedValue({
        data: null,
        error: null,
      });

      (mockAdminClient.from as Mock).mockReturnValue({
        insert: mockAuditInsert,
      });

      (mockAdminClient.auth.admin!.deleteUser as Mock).mockResolvedValue({
        data: null,
        error: { message: 'Delete failed' },
      });

      // Suppress console.error for this test
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      // Act & Assert
      await expect(deleteUserAccount(mockSupabase, userId)).rejects.toThrow('Failed to delete user account');

      expect(consoleErrorSpy).toHaveBeenCalledWith('Failed to delete user:', { message: 'Delete failed' });

      consoleErrorSpy.mockRestore();
    });
  });
});
