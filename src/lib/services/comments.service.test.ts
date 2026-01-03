import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";
import type { SupabaseClient } from "@/types";
import { DatabaseError } from "@/lib/errors/api-errors";
import {
  createMockFromChain,
  suppressConsole,
  createMockComment,
  createMockAuthorInfo,
  createMockCommentDto,
  createMockBrief,
} from "../helpers/test-helpers";

// Mock all utility modules BEFORE importing the service
vi.mock("@/lib/utils/mappers", () => ({
  mapCommentToDto: vi.fn(),
}));

vi.mock("@/lib/utils/authorization.utils", () => ({
  requireBriefAccess: vi.fn(),
  requireCommentAuthor: vi.fn(),
}));

vi.mock("@/lib/utils/audit.utils", () => ({
  auditCommentCreated: vi.fn(),
  auditCommentDeleted: vi.fn(),
}));

vi.mock("@/lib/utils/user-lookup.utils", () => ({
  getAuthorInfo: vi.fn(),
  batchGetAuthorInfo: vi.fn(),
}));

vi.mock("@/lib/utils/query.utils", () => ({
  calculateOffset: vi.fn(),
  calculatePagination: vi.fn(),
}));

// NOW import the service (after mocking dependencies)
import { createComment, getCommentsByBriefId, deleteComment } from "./comments.service";
import { mapCommentToDto } from "@/lib/utils/mappers";
import { requireBriefAccess, requireCommentAuthor } from "@/lib/utils/authorization.utils";
import { auditCommentCreated, auditCommentDeleted } from "@/lib/utils/audit.utils";
import { getAuthorInfo, batchGetAuthorInfo } from "@/lib/utils/user-lookup.utils";
import { calculateOffset, calculatePagination } from "@/lib/utils/query.utils";

describe("comments.service", () => {
  let mockSupabase: SupabaseClient;

  beforeEach(() => {
    // Reset all mocks before each test
    vi.clearAllMocks();

    // Create mock Supabase client
    mockSupabase = {
      from: vi.fn(() => createMockFromChain()),
    } as unknown as SupabaseClient;
  });

  describe("createComment", () => {
    it("should successfully create comment with audit trail", async () => {
      // Arrange
      const briefId = "brief-123";
      const authorId = "author-123";
      const authorEmail = "author@example.com";
      const content = "Test comment content";

      const mockNewComment = createMockComment({ brief_id: briefId, author_id: authorId, content });
      const mockAuthorInfo = createMockAuthorInfo({ email: authorEmail });
      const mockCommentDto = createMockCommentDto({ briefId, authorId, authorEmail, content });

      // Mock requireBriefAccess (authorization check)
      (requireBriefAccess as Mock).mockResolvedValue({ brief: { id: briefId }, hasAccess: true });

      // Mock comment insert
      const mockInsertSelect = vi.fn().mockReturnThis();
      const mockInsertSingle = vi.fn().mockResolvedValue({
        data: mockNewComment,
        error: null,
      });

      // Mock brief select for comment count
      const mockBriefSelect = vi.fn().mockReturnThis();
      const mockBriefEq = vi.fn().mockReturnThis();
      const mockBriefSingle = vi.fn().mockResolvedValue({
        data: { comment_count: 5 },
        error: null,
      });

      // Mock brief update for incrementing count
      const mockUpdate = vi.fn().mockReturnThis();
      const mockUpdateEq = vi.fn().mockResolvedValue({
        error: null,
      });

      (mockSupabase.from as Mock).mockImplementation((table: string) => {
        if (table === "comments") {
          return {
            insert: vi.fn(() => ({
              select: mockInsertSelect,
            })),
            delete: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
          };
        }
        if (table === "briefs") {
          return {
            select: mockBriefSelect,
            update: mockUpdate,
          };
        }
        return {};
      });

      mockInsertSelect.mockReturnValue({ single: mockInsertSingle });
      mockBriefSelect.mockReturnValue({
        eq: mockBriefEq,
      });
      mockBriefEq.mockReturnValue({ single: mockBriefSingle });
      mockUpdate.mockReturnValue({ eq: mockUpdateEq });

      // Mock audit and author info
      (auditCommentCreated as Mock).mockResolvedValue(undefined);
      (getAuthorInfo as Mock).mockResolvedValue(mockAuthorInfo);
      (mapCommentToDto as Mock).mockReturnValue(mockCommentDto);

      // Act
      const result = await createComment(mockSupabase, briefId, authorId, authorEmail, content);

      // Assert
      expect(requireBriefAccess).toHaveBeenCalledWith(mockSupabase, briefId, authorId, authorEmail);
      expect(mockSupabase.from).toHaveBeenCalledWith("comments");
      expect(mockSupabase.from).toHaveBeenCalledWith("briefs");
      expect(mockUpdateEq).toHaveBeenCalledWith("id", briefId);
      expect(auditCommentCreated).toHaveBeenCalledWith(mockSupabase, authorId, mockNewComment.id, {
        brief_id: mockNewComment.brief_id,
        author_id: mockNewComment.author_id,
        content: mockNewComment.content,
        created_at: mockNewComment.created_at,
      });
      expect(getAuthorInfo).toHaveBeenCalledWith(mockSupabase, authorId);
      expect(mapCommentToDto).toHaveBeenCalledWith(mockNewComment, mockAuthorInfo.email, mockAuthorInfo.role, authorId);
      expect(result).toEqual(mockCommentDto);
    });

    it("should throw DatabaseError when comment insert fails", async () => {
      // Arrange
      const briefId = "brief-123";
      const authorId = "author-123";
      const authorEmail = "author@example.com";
      const content = "Test comment";

      (requireBriefAccess as Mock).mockResolvedValue({ brief: { id: briefId }, hasAccess: true });

      const mockInsertSelect = vi.fn().mockReturnThis();
      const mockInsertSingle = vi.fn().mockResolvedValue({
        data: null,
        error: { message: "Insert failed" },
      });

      (mockSupabase.from as Mock).mockReturnValue({
        insert: vi.fn(() => ({
          select: mockInsertSelect,
        })),
      });

      mockInsertSelect.mockReturnValue({ single: mockInsertSingle });

      const consoleErrorSpy = suppressConsole("error");

      // Act & Assert
      await expect(createComment(mockSupabase, briefId, authorId, authorEmail, content)).rejects.toThrow(DatabaseError);
      await expect(createComment(mockSupabase, briefId, authorId, authorEmail, content)).rejects.toThrow(
        "Database error during comment creation: Insert failed"
      );

      expect(consoleErrorSpy).toHaveBeenCalledWith("[comments.service] Failed to create comment:", {
        message: "Insert failed",
      });

      consoleErrorSpy.mockRestore();
    });

    it("should throw DatabaseError when comment insert returns null data", async () => {
      // Arrange
      const briefId = "brief-123";
      const authorId = "author-123";
      const authorEmail = "author@example.com";
      const content = "Test comment";

      (requireBriefAccess as Mock).mockResolvedValue({ brief: { id: briefId }, hasAccess: true });

      const mockInsertSelect = vi.fn().mockReturnThis();
      const mockInsertSingle = vi.fn().mockResolvedValue({
        data: null,
        error: null,
      });

      (mockSupabase.from as Mock).mockReturnValue({
        insert: vi.fn(() => ({
          select: mockInsertSelect,
        })),
      });

      mockInsertSelect.mockReturnValue({ single: mockInsertSingle });

      const consoleErrorSpy = suppressConsole("error");

      // Act & Assert
      await expect(createComment(mockSupabase, briefId, authorId, authorEmail, content)).rejects.toThrow(DatabaseError);

      consoleErrorSpy.mockRestore();
    });

    it("should rollback comment when count update fails", async () => {
      // Arrange
      const briefId = "brief-123";
      const authorId = "author-123";
      const authorEmail = "author@example.com";
      const content = "Test comment";

      const mockNewComment = createMockComment({ brief_id: briefId, author_id: authorId, content });

      (requireBriefAccess as Mock).mockResolvedValue({ brief: { id: briefId }, hasAccess: true });

      const mockDeleteEq = vi.fn().mockResolvedValue({ error: null });

      const mockInsertSelect = vi.fn().mockReturnThis();
      const mockInsertSingle = vi.fn().mockResolvedValue({
        data: mockNewComment,
        error: null,
      });

      const mockBriefSelect = vi.fn().mockReturnThis();
      const mockBriefEq = vi.fn().mockReturnThis();
      const mockBriefSingle = vi.fn().mockResolvedValue({
        data: { comment_count: 5 },
        error: null,
      });

      const mockUpdate = vi.fn().mockReturnThis();
      const mockUpdateEq = vi.fn().mockResolvedValue({
        error: { message: "Update failed" },
      });

      (mockSupabase.from as Mock).mockImplementation((table: string) => {
        if (table === "comments") {
          return {
            insert: vi.fn(() => ({
              select: mockInsertSelect,
            })),
            delete: vi.fn(() => ({
              eq: mockDeleteEq,
            })),
          };
        }
        if (table === "briefs") {
          return {
            select: mockBriefSelect,
            update: mockUpdate,
          };
        }
        return {};
      });

      mockInsertSelect.mockReturnValue({ single: mockInsertSingle });
      mockBriefSelect.mockReturnValue({ eq: mockBriefEq });
      mockBriefEq.mockReturnValue({ single: mockBriefSingle });
      mockUpdate.mockReturnValue({ eq: mockUpdateEq });

      const consoleErrorSpy = suppressConsole("error");

      // Act & Assert
      await expect(createComment(mockSupabase, briefId, authorId, authorEmail, content)).rejects.toThrow(DatabaseError);
      await expect(createComment(mockSupabase, briefId, authorId, authorEmail, content)).rejects.toThrow(
        "Database error during comment count update: Update failed"
      );

      // Verify rollback was called
      expect(mockDeleteEq).toHaveBeenCalledWith("id", mockNewComment.id);

      consoleErrorSpy.mockRestore();
    });

    it("should handle null currentBrief when incrementing count", async () => {
      // Arrange
      const briefId = "brief-123";
      const authorId = "author-123";
      const authorEmail = "author@example.com";
      const content = "Test comment content";

      const mockNewComment = createMockComment({ brief_id: briefId, author_id: authorId, content });
      const mockAuthorInfo = createMockAuthorInfo({ email: authorEmail });
      const mockCommentDto = createMockCommentDto({ briefId, authorId, authorEmail, content });

      (requireBriefAccess as Mock).mockResolvedValue({ brief: { id: briefId }, hasAccess: true });

      const mockInsertSelect = vi.fn().mockReturnThis();
      const mockInsertSingle = vi.fn().mockResolvedValue({
        data: mockNewComment,
        error: null,
      });

      // Mock brief select returning null data (currentBrief is null)
      const mockBriefSelect = vi.fn().mockReturnThis();
      const mockBriefEq = vi.fn().mockReturnThis();
      const mockBriefSingle = vi.fn().mockResolvedValue({
        data: null, // Null currentBrief
        error: null,
      });

      const mockUpdate = vi.fn().mockReturnThis();
      const mockUpdateEq = vi.fn().mockResolvedValue({
        error: null,
      });

      (mockSupabase.from as Mock).mockImplementation((table: string) => {
        if (table === "comments") {
          return {
            insert: vi.fn(() => ({
              select: mockInsertSelect,
            })),
          };
        }
        if (table === "briefs") {
          return {
            select: mockBriefSelect,
            update: mockUpdate,
          };
        }
        return {};
      });

      mockInsertSelect.mockReturnValue({ single: mockInsertSingle });
      mockBriefSelect.mockReturnValue({ eq: mockBriefEq });
      mockBriefEq.mockReturnValue({ single: mockBriefSingle });
      mockUpdate.mockReturnValue({ eq: mockUpdateEq });

      (auditCommentCreated as Mock).mockResolvedValue(undefined);
      (getAuthorInfo as Mock).mockResolvedValue(mockAuthorInfo);
      (mapCommentToDto as Mock).mockReturnValue(mockCommentDto);

      // Act
      await createComment(mockSupabase, briefId, authorId, authorEmail, content);

      // Assert - should use 0 as default and increment to 1
      expect(mockUpdate).toHaveBeenCalledWith({ comment_count: 1 });
    });
  });

  describe("getCommentsByBriefId", () => {
    it("should return paginated comments with author info", async () => {
      // Arrange
      const params = {
        briefId: "brief-123",
        userId: "user-123",
        userEmail: "user@example.com",
        page: 1,
        limit: 10,
      };

      const mockBrief = createMockBrief({ id: params.briefId, comment_count: 25 });

      const mockComments = [
        createMockComment({
          id: "comment-1",
          brief_id: params.briefId,
          author_id: "author-1",
          content: "Comment 1",
          created_at: "2024-01-01T00:00:00Z",
        }),
        createMockComment({
          id: "comment-2",
          brief_id: params.briefId,
          author_id: "author-2",
          content: "Comment 2",
          created_at: "2024-01-02T00:00:00Z",
        }),
      ];

      const mockAuthorInfoMap = new Map([
        ["author-1", createMockAuthorInfo({ email: "author1@example.com", role: "client" })],
        ["author-2", createMockAuthorInfo({ email: "author2@example.com", role: "creator" })],
      ]);

      const mockCommentDtos = [
        createMockCommentDto({
          id: "comment-1",
          briefId: params.briefId,
          authorId: "author-1",
          authorEmail: "author1@example.com",
          authorRole: "client",
          content: "Comment 1",
          isOwn: false,
          createdAt: "2024-01-01T00:00:00Z",
        }),
        createMockCommentDto({
          id: "comment-2",
          briefId: params.briefId,
          authorId: "author-2",
          authorEmail: "author2@example.com",
          authorRole: "creator",
          content: "Comment 2",
          isOwn: false,
          createdAt: "2024-01-02T00:00:00Z",
        }),
      ];

      const mockPagination = {
        page: 1,
        limit: 10,
        total: 25,
        totalPages: 3,
      };

      (requireBriefAccess as Mock).mockResolvedValue({ brief: mockBrief, hasAccess: true });
      (calculateOffset as Mock).mockReturnValue(0);

      const mockSelect = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockReturnThis();
      const mockOrder = vi.fn().mockReturnThis();
      const mockRange = vi.fn().mockResolvedValue({
        data: mockComments,
        error: null,
      });

      (mockSupabase.from as Mock).mockReturnValue({
        select: mockSelect,
      });

      mockSelect.mockReturnValue({ eq: mockEq });
      mockEq.mockReturnValue({ order: mockOrder });
      mockOrder.mockReturnValue({ range: mockRange });

      (batchGetAuthorInfo as Mock).mockResolvedValue(mockAuthorInfoMap);
      (mapCommentToDto as Mock).mockReturnValueOnce(mockCommentDtos[0]).mockReturnValueOnce(mockCommentDtos[1]);
      (calculatePagination as Mock).mockReturnValue(mockPagination);

      // Act
      const result = await getCommentsByBriefId(mockSupabase, params);

      // Assert
      expect(requireBriefAccess).toHaveBeenCalledWith(mockSupabase, params.briefId, params.userId, params.userEmail);
      expect(calculateOffset).toHaveBeenCalledWith(params.page, params.limit);
      expect(mockSupabase.from).toHaveBeenCalledWith("comments");
      expect(mockSelect).toHaveBeenCalledWith("id, brief_id, author_id, content, created_at");
      expect(mockEq).toHaveBeenCalledWith("brief_id", params.briefId);
      expect(mockOrder).toHaveBeenCalledWith("created_at", { ascending: false });
      expect(mockRange).toHaveBeenCalledWith(0, 9);
      expect(batchGetAuthorInfo).toHaveBeenCalledWith(mockSupabase, ["author-1", "author-2"]);
      expect(calculatePagination).toHaveBeenCalledWith(params.page, params.limit, 25);
      expect(result).toEqual({
        data: mockCommentDtos,
        pagination: mockPagination,
      });
    });

    it("should throw DatabaseError when fetching comments fails", async () => {
      // Arrange
      const params = {
        briefId: "brief-123",
        userId: "user-123",
        userEmail: "user@example.com",
        page: 1,
        limit: 10,
      };

      (requireBriefAccess as Mock).mockResolvedValue({ brief: { id: params.briefId }, hasAccess: true });
      (calculateOffset as Mock).mockReturnValue(0);

      const mockSelect = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockReturnThis();
      const mockOrder = vi.fn().mockReturnThis();
      const mockRange = vi.fn().mockResolvedValue({
        data: null,
        error: { message: "Fetch failed" },
      });

      (mockSupabase.from as Mock).mockReturnValue({ select: mockSelect });
      mockSelect.mockReturnValue({ eq: mockEq });
      mockEq.mockReturnValue({ order: mockOrder });
      mockOrder.mockReturnValue({ range: mockRange });

      const consoleErrorSpy = suppressConsole("error");

      // Act & Assert
      await expect(getCommentsByBriefId(mockSupabase, params)).rejects.toThrow(DatabaseError);
      await expect(getCommentsByBriefId(mockSupabase, params)).rejects.toThrow(
        "Database error during comment fetch: Fetch failed"
      );

      expect(consoleErrorSpy).toHaveBeenCalledWith("[comments.service] Failed to fetch comments:", {
        message: "Fetch failed",
      });

      consoleErrorSpy.mockRestore();
    });

    it("should handle empty comments list", async () => {
      // Arrange
      const params = {
        briefId: "brief-123",
        userId: "user-123",
        userEmail: "user@example.com",
        page: 1,
        limit: 10,
      };

      const mockBrief = createMockBrief({ id: params.briefId, comment_count: 0 });

      const mockPagination = {
        page: 1,
        limit: 10,
        total: 0,
        totalPages: 0,
      };

      (requireBriefAccess as Mock).mockResolvedValue({ brief: mockBrief, hasAccess: true });
      (calculateOffset as Mock).mockReturnValue(0);

      const mockSelect = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockReturnThis();
      const mockOrder = vi.fn().mockReturnThis();
      const mockRange = vi.fn().mockResolvedValue({
        data: [],
        error: null,
      });

      (mockSupabase.from as Mock).mockReturnValue({ select: mockSelect });
      mockSelect.mockReturnValue({ eq: mockEq });
      mockEq.mockReturnValue({ order: mockOrder });
      mockOrder.mockReturnValue({ range: mockRange });

      (batchGetAuthorInfo as Mock).mockResolvedValue(new Map());
      (calculatePagination as Mock).mockReturnValue(mockPagination);

      // Act
      const result = await getCommentsByBriefId(mockSupabase, params);

      // Assert
      expect(result).toEqual({
        data: [],
        pagination: mockPagination,
      });
    });

    it("should handle null comments data from database", async () => {
      // Arrange
      const params = {
        briefId: "brief-123",
        userId: "user-123",
        userEmail: "user@example.com",
        page: 1,
        limit: 10,
      };

      const mockBrief = createMockBrief({ id: params.briefId, comment_count: 0 });

      const mockPagination = {
        page: 1,
        limit: 10,
        total: 0,
        totalPages: 0,
      };

      (requireBriefAccess as Mock).mockResolvedValue({ brief: mockBrief, hasAccess: true });
      (calculateOffset as Mock).mockReturnValue(0);

      const mockSelect = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockReturnThis();
      const mockOrder = vi.fn().mockReturnThis();
      const mockRange = vi.fn().mockResolvedValue({
        data: null, // Null data instead of empty array
        error: null,
      });

      (mockSupabase.from as Mock).mockReturnValue({ select: mockSelect });
      mockSelect.mockReturnValue({ eq: mockEq });
      mockEq.mockReturnValue({ order: mockOrder });
      mockOrder.mockReturnValue({ range: mockRange });

      (batchGetAuthorInfo as Mock).mockResolvedValue(new Map());
      (calculatePagination as Mock).mockReturnValue(mockPagination);

      // Act
      const result = await getCommentsByBriefId(mockSupabase, params);

      // Assert - should handle null as empty array
      expect(result).toEqual({
        data: [],
        pagination: mockPagination,
      });
      expect(batchGetAuthorInfo).toHaveBeenCalledWith(mockSupabase, []);
    });
  });

  describe("deleteComment", () => {
    it("should successfully delete comment and decrement count", async () => {
      // Arrange
      const commentId = "comment-123";
      const userId = "user-123";

      const mockComment = createMockComment({
        id: commentId,
        author_id: userId,
        content: "Test comment",
      });

      (requireCommentAuthor as Mock).mockResolvedValue(mockComment);

      const mockDeleteEq = vi.fn().mockResolvedValue({ error: null });

      const mockBriefSelect = vi.fn().mockReturnThis();
      const mockBriefEq = vi.fn().mockReturnThis();
      const mockBriefSingle = vi.fn().mockResolvedValue({
        data: { comment_count: 5 },
        error: null,
      });

      const mockUpdate = vi.fn().mockReturnThis();
      const mockUpdateEq = vi.fn().mockResolvedValue({ error: null });

      (mockSupabase.from as Mock).mockImplementation((table: string) => {
        if (table === "comments") {
          return {
            delete: vi.fn(() => ({ eq: mockDeleteEq })),
          };
        }
        if (table === "briefs") {
          return {
            select: mockBriefSelect,
            update: mockUpdate,
          };
        }
        return {};
      });

      mockBriefSelect.mockReturnValue({ eq: mockBriefEq });
      mockBriefEq.mockReturnValue({ single: mockBriefSingle });
      mockUpdate.mockReturnValue({ eq: mockUpdateEq });

      (auditCommentDeleted as Mock).mockResolvedValue(undefined);

      // Act
      await deleteComment(mockSupabase, commentId, userId);

      // Assert
      expect(requireCommentAuthor).toHaveBeenCalledWith(mockSupabase, commentId, userId);
      expect(mockDeleteEq).toHaveBeenCalledWith("id", commentId);
      expect(mockUpdateEq).toHaveBeenCalledWith("id", mockComment.brief_id);
      expect(auditCommentDeleted).toHaveBeenCalledWith(mockSupabase, userId, commentId, {
        id: mockComment.id,
        brief_id: mockComment.brief_id,
        author_id: mockComment.author_id,
        content: mockComment.content,
        created_at: mockComment.created_at,
      });
    });

    it("should throw DatabaseError when delete fails", async () => {
      // Arrange
      const commentId = "comment-123";
      const userId = "user-123";

      const mockComment = createMockComment({
        id: commentId,
        author_id: userId,
        content: "Test comment",
      });

      (requireCommentAuthor as Mock).mockResolvedValue(mockComment);

      const mockDeleteEq = vi.fn().mockResolvedValue({
        error: { message: "Delete failed" },
      });

      (mockSupabase.from as Mock).mockReturnValue({
        delete: vi.fn(() => ({ eq: mockDeleteEq })),
      });

      const consoleErrorSpy = suppressConsole("error");

      // Act & Assert
      await expect(deleteComment(mockSupabase, commentId, userId)).rejects.toThrow(DatabaseError);
      await expect(deleteComment(mockSupabase, commentId, userId)).rejects.toThrow(
        "Database error during comment deletion: Delete failed"
      );

      expect(consoleErrorSpy).toHaveBeenCalledWith("[comments.service] Failed to delete comment:", {
        message: "Delete failed",
      });

      consoleErrorSpy.mockRestore();
    });

    it("should handle count update error gracefully (comment already deleted)", async () => {
      // Arrange
      const commentId = "comment-123";
      const userId = "user-123";

      const mockComment = createMockComment({
        id: commentId,
        author_id: userId,
        content: "Test comment",
      });

      (requireCommentAuthor as Mock).mockResolvedValue(mockComment);

      const mockDeleteEq = vi.fn().mockResolvedValue({ error: null });

      const mockBriefSelect = vi.fn().mockReturnThis();
      const mockBriefEq = vi.fn().mockReturnThis();
      const mockBriefSingle = vi.fn().mockResolvedValue({
        data: { comment_count: 5 },
        error: null,
      });

      const mockUpdate = vi.fn().mockReturnThis();
      const mockUpdateEq = vi.fn().mockResolvedValue({
        error: { message: "Update failed" },
      });

      (mockSupabase.from as Mock).mockImplementation((table: string) => {
        if (table === "comments") {
          return {
            delete: vi.fn(() => ({ eq: mockDeleteEq })),
          };
        }
        if (table === "briefs") {
          return {
            select: mockBriefSelect,
            update: mockUpdate,
          };
        }
        return {};
      });

      mockBriefSelect.mockReturnValue({ eq: mockBriefEq });
      mockBriefEq.mockReturnValue({ single: mockBriefSingle });
      mockUpdate.mockReturnValue({ eq: mockUpdateEq });

      (auditCommentDeleted as Mock).mockResolvedValue(undefined);

      const consoleErrorSpy = suppressConsole("error");

      // Act - should NOT throw even though update fails
      await deleteComment(mockSupabase, commentId, userId);

      // Assert
      expect(consoleErrorSpy).toHaveBeenCalledWith("[comments.service] Failed to update comment count:", {
        message: "Update failed",
      });

      consoleErrorSpy.mockRestore();
    });

    it("should prevent comment count from going below zero", async () => {
      // Arrange
      const commentId = "comment-123";
      const userId = "user-123";

      const mockComment = createMockComment({
        id: commentId,
        author_id: userId,
        content: "Test comment",
      });

      (requireCommentAuthor as Mock).mockResolvedValue(mockComment);

      const mockDeleteEq = vi.fn().mockResolvedValue({ error: null });

      const mockBriefSelect = vi.fn().mockReturnThis();
      const mockBriefEq = vi.fn().mockReturnThis();
      const mockBriefSingle = vi.fn().mockResolvedValue({
        data: { comment_count: 0 }, // Already at 0
        error: null,
      });

      const mockUpdate = vi.fn().mockReturnThis();
      const mockUpdateEq = vi.fn().mockResolvedValue({ error: null });

      (mockSupabase.from as Mock).mockImplementation((table: string) => {
        if (table === "comments") {
          return {
            delete: vi.fn(() => ({ eq: mockDeleteEq })),
          };
        }
        if (table === "briefs") {
          return {
            select: mockBriefSelect,
            update: mockUpdate,
          };
        }
        return {};
      });

      mockBriefSelect.mockReturnValue({ eq: mockBriefEq });
      mockBriefEq.mockReturnValue({ single: mockBriefSingle });
      mockUpdate.mockReturnValue({ eq: mockUpdateEq });

      (auditCommentDeleted as Mock).mockResolvedValue(undefined);

      // Act
      await deleteComment(mockSupabase, commentId, userId);

      // Assert - should update with 0, not -1
      expect(mockUpdate).toHaveBeenCalledWith({ comment_count: 0 });
    });
  });
});
