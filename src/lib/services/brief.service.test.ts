import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";
import type { SupabaseClient } from "@/types";
import {
  DatabaseError,
  NotFoundError,
  ForbiddenError,
  UnauthorizedError,
  ConflictError,
} from "@/lib/errors/api-errors";
import {
  createMockFromChain,
  suppressConsole,
  createMockBrief,
  createMockBriefListItemDto,
  createMockBriefDetailDto,
  createMockRecipient,
  createMockRecipientDto,
  createMockComment,
  createMockCommentDto,
  createMockAuthorInfo,
} from "../helpers/test-helpers";

// Mock all utility modules BEFORE importing the service
vi.mock("@/lib/utils/mappers", () => ({
  mapBriefToListItem: vi.fn(),
  mapBriefToDetail: vi.fn(),
  mapCommentToDto: vi.fn(),
  mapRecipientToDto: vi.fn(),
}));

vi.mock("@/lib/utils/authorization.utils", () => ({
  checkBriefAccess: vi.fn(),
  requireBriefOwner: vi.fn(),
  requireRecipientAccess: vi.fn(),
}));

vi.mock("@/lib/utils/audit.utils", () => ({
  auditBriefCreated: vi.fn(),
  auditBriefDeleted: vi.fn(),
  auditStatusChanged: vi.fn(),
  auditBriefShared: vi.fn(),
  auditBriefUnshared: vi.fn(),
}));

vi.mock("@/lib/utils/query.utils", () => ({
  calculatePagination: vi.fn(),
  calculateOffset: vi.fn(),
  emptyPagination: vi.fn(),
}));

vi.mock("@/lib/utils/user-lookup.utils", () => ({
  getAuthorInfo: vi.fn(),
}));

// NOW import the service (after mocking dependencies)
import {
  getBriefs,
  getBriefById,
  createBrief,
  updateBriefContent,
  updateBriefStatus,
  deleteBrief,
  shareBriefWithRecipient,
  getBriefRecipients,
  revokeBriefRecipient,
  createCommentForStatusUpdate,
  updatePendingRecipients,
} from "./brief.service";
import { mapBriefToListItem, mapBriefToDetail, mapCommentToDto, mapRecipientToDto } from "@/lib/utils/mappers";
import { checkBriefAccess, requireBriefOwner, requireRecipientAccess } from "@/lib/utils/authorization.utils";
import {
  auditBriefCreated,
  auditBriefDeleted,
  auditStatusChanged,
  auditBriefShared,
  auditBriefUnshared,
} from "@/lib/utils/audit.utils";
import { calculatePagination, calculateOffset, emptyPagination } from "@/lib/utils/query.utils";
import { getAuthorInfo } from "@/lib/utils/user-lookup.utils";

describe("brief.service", () => {
  let mockSupabase: SupabaseClient;

  beforeEach(() => {
    // Reset all mocks before each test
    vi.clearAllMocks();

    // Create mock Supabase client
    mockSupabase = {
      from: vi.fn(() => createMockFromChain()),
      rpc: vi.fn(),
    } as unknown as SupabaseClient;
  });

  describe("getBriefs", () => {
    it("should return paginated list of briefs for user (owned + shared)", async () => {
      // Arrange
      const userId = "user-123";
      const userEmail = "user@example.com";
      const params = { page: 1, limit: 10 };

      const mockBriefs = [
        createMockBrief({ id: "brief-1", owner_id: userId }),
        createMockBrief({ id: "brief-2", owner_id: "other-user" }),
      ];

      const mockBriefDtos = [
        createMockBriefListItemDto({ id: "brief-1", isOwned: true }),
        createMockBriefListItemDto({ id: "brief-2", isOwned: false }),
      ];

      const mockPagination = {
        page: 1,
        limit: 10,
        total: 2,
        totalPages: 1,
      };

      // Mock owned briefs query
      const mockOwnedChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({
          data: [{ id: "brief-1" }],
          error: null,
        }),
      };

      // Mock shared briefs query
      const mockSharedChain = {
        select: vi.fn().mockReturnThis(),
        or: vi.fn().mockResolvedValue({
          data: [{ brief_id: "brief-2" }],
          error: null,
        }),
      };

      // Mock main briefs query
      const mockMainChain = {
        select: vi.fn().mockReturnThis(),
        in: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        range: vi.fn().mockResolvedValue({
          data: mockBriefs,
          error: null,
          count: 2,
        }),
      };

      // Setup mock implementation for sequential calls
      (mockSupabase.from as Mock)
        .mockImplementationOnce(() => mockOwnedChain) // First call: owned briefs
        .mockImplementationOnce(() => mockSharedChain) // Second call: shared briefs
        .mockImplementationOnce(() => mockMainChain); // Third call: main query

      // Chain the mocks
      mockOwnedChain.select.mockReturnValue(mockOwnedChain);
      mockSharedChain.select.mockReturnValue(mockSharedChain);
      mockMainChain.select.mockReturnValue(mockMainChain);
      mockMainChain.in.mockReturnValue(mockMainChain);
      mockMainChain.order.mockReturnValue(mockMainChain);

      (calculateOffset as Mock).mockReturnValue(0);
      (mapBriefToListItem as Mock).mockReturnValueOnce(mockBriefDtos[0]).mockReturnValueOnce(mockBriefDtos[1]);
      (calculatePagination as Mock).mockReturnValue(mockPagination);

      // Act
      const result = await getBriefs(mockSupabase, userId, userEmail, params);

      // Assert
      expect(calculateOffset).toHaveBeenCalledWith(1, 10);
      expect(mockSupabase.from).toHaveBeenCalledWith("briefs");
      expect(mockSupabase.from).toHaveBeenCalledWith("brief_recipients");
      expect(mapBriefToListItem).toHaveBeenCalledTimes(2);
      expect(calculatePagination).toHaveBeenCalledWith(1, 10, 2);
      expect(result).toEqual({
        data: mockBriefDtos,
        pagination: mockPagination,
      });
    });

    it("should return only owned briefs when filter is 'owned'", async () => {
      // Arrange
      const userId = "user-123";
      const userEmail = "user@example.com";
      const params = { page: 1, limit: 10, filter: "owned" as const };

      const mockBriefs = [createMockBrief({ id: "brief-1", owner_id: userId })];
      const mockBriefDtos = [createMockBriefListItemDto({ id: "brief-1", isOwned: true })];
      const mockPagination = { page: 1, limit: 10, total: 1, totalPages: 1 };

      // Mock owned briefs query
      const mockOwnedSelect = vi.fn().mockReturnThis();
      const mockOwnedEq = vi.fn().mockResolvedValue({
        data: [{ id: "brief-1" }],
        error: null,
      });

      // Mock main briefs query
      const mockSelect = vi.fn().mockReturnThis();
      const mockIn = vi.fn().mockReturnThis();
      const mockOrder = vi.fn().mockReturnThis();
      const mockRange = vi.fn().mockResolvedValue({
        data: mockBriefs,
        error: null,
        count: 1,
      });

      const mockOwnedBriefsChain = { select: mockOwnedSelect };
      const mockMainBriefsChain = { select: mockSelect };

      (mockSupabase.from as Mock)
        .mockImplementationOnce(() => mockOwnedBriefsChain) // First call: owned briefs
        .mockImplementationOnce(() => mockMainBriefsChain); // Second call: main query

      mockOwnedSelect.mockReturnValue({ eq: mockOwnedEq });
      mockSelect.mockReturnValue({ in: mockIn });
      mockIn.mockReturnValue({ order: mockOrder });
      mockOrder.mockReturnValue({ range: mockRange });

      (calculateOffset as Mock).mockReturnValue(0);
      (mapBriefToListItem as Mock).mockReturnValue(mockBriefDtos[0]);
      (calculatePagination as Mock).mockReturnValue(mockPagination);

      // Act
      const result = await getBriefs(mockSupabase, userId, userEmail, params);

      // Assert
      expect(mockSupabase.from).toHaveBeenCalledWith("briefs");
      expect(mockSupabase.from).not.toHaveBeenCalledWith("brief_recipients");
      expect(result.data).toHaveLength(1);
      expect(result.data[0].isOwned).toBe(true);
    });

    it("should return only shared briefs when filter is 'shared'", async () => {
      // Arrange
      const userId = "user-123";
      const userEmail = "user@example.com";
      const params = { page: 1, limit: 10, filter: "shared" as const };

      const mockBriefs = [createMockBrief({ id: "brief-2", owner_id: "other-user" })];
      const mockBriefDtos = [createMockBriefListItemDto({ id: "brief-2", isOwned: false })];
      const mockPagination = { page: 1, limit: 10, total: 1, totalPages: 1 };

      // Mock shared briefs query
      const mockSharedSelect = vi.fn().mockReturnThis();
      const mockSharedOr = vi.fn().mockResolvedValue({
        data: [{ brief_id: "brief-2" }],
        error: null,
      });

      // Mock main briefs query
      const mockSelect = vi.fn().mockReturnThis();
      const mockIn = vi.fn().mockReturnThis();
      const mockOrder = vi.fn().mockReturnThis();
      const mockRange = vi.fn().mockResolvedValue({
        data: mockBriefs,
        error: null,
        count: 1,
      });

      const mockSharedBriefsChain = { select: mockSharedSelect };
      const mockMainBriefsChain = { select: mockSelect };

      (mockSupabase.from as Mock)
        .mockImplementationOnce(() => mockSharedBriefsChain) // First call: shared briefs
        .mockImplementationOnce(() => mockMainBriefsChain); // Second call: main query

      mockSharedSelect.mockReturnValue({ or: mockSharedOr });
      mockSelect.mockReturnValue({ in: mockIn });
      mockIn.mockReturnValue({ order: mockOrder });
      mockOrder.mockReturnValue({ range: mockRange });

      (calculateOffset as Mock).mockReturnValue(0);
      (mapBriefToListItem as Mock).mockReturnValue(mockBriefDtos[0]);
      (calculatePagination as Mock).mockReturnValue(mockPagination);

      // Act
      const result = await getBriefs(mockSupabase, userId, userEmail, params);

      // Assert
      expect(mockSupabase.from).toHaveBeenCalledWith("brief_recipients");
      expect(result.data).toHaveLength(1);
      expect(result.data[0].isOwned).toBe(false);
    });

    it("should filter briefs by status when status parameter is provided", async () => {
      // Arrange
      const userId = "user-123";
      const userEmail = "user@example.com";
      const params = { page: 1, limit: 10, status: "sent" as const };

      const mockBriefs = [createMockBrief({ id: "brief-1", status: "sent" })];
      const mockBriefDtos = [createMockBriefListItemDto({ id: "brief-1" })];
      const mockPagination = { page: 1, limit: 10, total: 1, totalPages: 1 };

      const mockOwnedSelect = vi.fn().mockReturnThis();
      const mockOwnedEq = vi.fn().mockResolvedValue({
        data: [{ id: "brief-1" }],
        error: null,
      });

      const mockSharedSelect = vi.fn().mockReturnThis();
      const mockSharedOr = vi.fn().mockResolvedValue({
        data: [],
        error: null,
      });

      const mockSelect = vi.fn().mockReturnThis();
      const mockIn = vi.fn().mockReturnThis();
      const mockStatusEq = vi.fn().mockReturnThis();
      const mockOrder = vi.fn().mockReturnThis();
      const mockRange = vi.fn().mockResolvedValue({
        data: mockBriefs,
        error: null,
        count: 1,
      });

      const mockOwnedBriefsChain = { select: mockOwnedSelect };
      const mockSharedBriefsChain = { select: mockSharedSelect };
      const mockMainBriefsChain = { select: mockSelect };

      (mockSupabase.from as Mock)
        .mockImplementationOnce(() => mockOwnedBriefsChain) // First call: owned briefs
        .mockImplementationOnce(() => mockSharedBriefsChain) // Second call: shared briefs
        .mockImplementationOnce(() => mockMainBriefsChain); // Third call: main query

      mockOwnedSelect.mockReturnValue({ eq: mockOwnedEq });
      mockSharedSelect.mockReturnValue({ or: mockSharedOr });
      mockSelect.mockReturnValue({ in: mockIn });
      mockIn.mockReturnValue({ eq: mockStatusEq });
      mockStatusEq.mockReturnValue({ order: mockOrder });
      mockOrder.mockReturnValue({ range: mockRange });

      (calculateOffset as Mock).mockReturnValue(0);
      (mapBriefToListItem as Mock).mockReturnValue(mockBriefDtos[0]);
      (calculatePagination as Mock).mockReturnValue(mockPagination);

      // Act
      const result = await getBriefs(mockSupabase, userId, userEmail, params);

      // Assert
      expect(mockStatusEq).toHaveBeenCalledWith("status", "sent");
      expect(result.data).toHaveLength(1);
    });

    it("should return empty result when no accessible briefs", async () => {
      // Arrange
      const userId = "user-123";
      const userEmail = "user@example.com";
      const params = { page: 1, limit: 10 };
      const emptyPaginationResult = { page: 1, limit: 10, total: 0, totalPages: 0 };

      const mockOwnedSelect = vi.fn().mockReturnThis();
      const mockOwnedEq = vi.fn().mockResolvedValue({
        data: [],
        error: null,
      });

      const mockSharedSelect = vi.fn().mockReturnThis();
      const mockSharedOr = vi.fn().mockResolvedValue({
        data: [],
        error: null,
      });

      const mockOwnedBriefsChain = { select: mockOwnedSelect };
      const mockSharedBriefsChain = { select: mockSharedSelect };

      (mockSupabase.from as Mock)
        .mockImplementationOnce(() => mockOwnedBriefsChain) // First call: owned briefs
        .mockImplementationOnce(() => mockSharedBriefsChain); // Second call: shared briefs

      mockOwnedSelect.mockReturnValue({ eq: mockOwnedEq });
      mockSharedSelect.mockReturnValue({ or: mockSharedOr });
      (emptyPagination as Mock).mockReturnValue(emptyPaginationResult);

      // Act
      const result = await getBriefs(mockSupabase, userId, userEmail, params);

      // Assert
      expect(result).toEqual({
        data: [],
        pagination: emptyPaginationResult,
      });
      expect(emptyPagination).toHaveBeenCalledWith(1, 10);
    });

    it("should throw DatabaseError when owned briefs query fails", async () => {
      // Arrange
      const userId = "user-123";
      const userEmail = "user@example.com";
      const params = { page: 1, limit: 10 };

      const mockOwnedSelect = vi.fn().mockReturnThis();
      const mockOwnedEq = vi.fn().mockResolvedValue({
        data: null,
        error: { message: "Database error" },
      });

      (mockSupabase.from as Mock).mockReturnValue({
        select: mockOwnedSelect,
      });
      mockOwnedSelect.mockReturnValue({ eq: mockOwnedEq });

      const consoleErrorSpy = suppressConsole("error");

      // Act & Assert
      await expect(getBriefs(mockSupabase, userId, userEmail, params)).rejects.toThrow(DatabaseError);
      await expect(getBriefs(mockSupabase, userId, userEmail, params)).rejects.toThrow(
        "Database error during owned brief fetch: Database error"
      );

      expect(consoleErrorSpy).toHaveBeenCalledWith("[brief.service] Error fetching owned brief IDs:", {
        message: "Database error",
      });

      consoleErrorSpy.mockRestore();
    });

    it("should throw DatabaseError when main briefs query fails", async () => {
      // Arrange
      const userId = "user-123";
      const userEmail = "user@example.com";
      const params = { page: 1, limit: 10 };

      const mockOwnedSelect = vi.fn().mockReturnThis();
      const mockOwnedEq = vi.fn().mockResolvedValue({
        data: [{ id: "brief-1" }],
        error: null,
      });

      const mockSharedSelect = vi.fn().mockReturnThis();
      const mockSharedOr = vi.fn().mockResolvedValue({
        data: [],
        error: null,
      });

      const mockSelect = vi.fn().mockReturnThis();
      const mockIn = vi.fn().mockReturnThis();
      const mockOrder = vi.fn().mockReturnThis();
      const mockRange = vi.fn().mockResolvedValue({
        data: null,
        error: { message: "Query failed" },
      });

      (mockSupabase.from as Mock)
        .mockImplementationOnce(() => ({ select: mockOwnedSelect })) // First call: owned briefs
        .mockImplementationOnce(() => ({ select: mockSharedSelect })) // Second call: shared briefs
        .mockImplementationOnce(() => ({ select: mockSelect })); // Third call: main query

      mockOwnedSelect.mockReturnValue({ eq: mockOwnedEq });
      mockSharedSelect.mockReturnValue({ or: mockSharedOr });
      mockSelect.mockReturnValue({ in: mockIn });
      mockIn.mockReturnValue({ order: mockOrder });
      mockOrder.mockReturnValue({ range: mockRange });

      (calculateOffset as Mock).mockReturnValue(0);

      const consoleErrorSpy = suppressConsole("error");

      // Act & Assert
      await expect(getBriefs(mockSupabase, userId, userEmail, params)).rejects.toThrow(DatabaseError);

      consoleErrorSpy.mockRestore();
    });

    it("should return empty data array when briefs data is null", async () => {
      // Arrange
      const userId = "user-123";
      const userEmail = "user@example.com";
      const params = { page: 1, limit: 10 };
      const emptyPaginationResult = { page: 1, limit: 10, total: 0, totalPages: 0 };

      const mockOwnedSelect = vi.fn().mockReturnThis();
      const mockOwnedEq = vi.fn().mockResolvedValue({
        data: [{ id: "brief-1" }],
        error: null,
      });

      const mockSharedSelect = vi.fn().mockReturnThis();
      const mockSharedOr = vi.fn().mockResolvedValue({
        data: [],
        error: null,
      });

      const mockSelect = vi.fn().mockReturnThis();
      const mockIn = vi.fn().mockReturnThis();
      const mockOrder = vi.fn().mockReturnThis();
      const mockRange = vi.fn().mockResolvedValue({
        data: null,
        error: null,
      });

      (mockSupabase.from as Mock)
        .mockImplementationOnce(() => ({ select: mockOwnedSelect })) // First call: owned briefs
        .mockImplementationOnce(() => ({ select: mockSharedSelect })) // Second call: shared briefs
        .mockImplementationOnce(() => ({ select: mockSelect })); // Third call: main query

      mockOwnedSelect.mockReturnValue({ eq: mockOwnedEq });
      mockSharedSelect.mockReturnValue({ or: mockSharedOr });
      mockSelect.mockReturnValue({ in: mockIn });
      mockIn.mockReturnValue({ order: mockOrder });
      mockOrder.mockReturnValue({ range: mockRange });

      (calculateOffset as Mock).mockReturnValue(0);
      (emptyPagination as Mock).mockReturnValue(emptyPaginationResult);

      // Act
      const result = await getBriefs(mockSupabase, userId, userEmail, params);

      // Assert
      expect(result).toEqual({
        data: [],
        pagination: emptyPaginationResult,
      });
    });
  });

  describe("getBriefById", () => {
    it("should return brief when user has access and is owner", async () => {
      // Arrange
      const briefId = "brief-123";
      const userId = "user-123";
      const userEmail = "user@example.com";

      const mockBrief = createMockBrief({ id: briefId, owner_id: userId });
      const mockBriefDto = createMockBriefDetailDto({ id: briefId, isOwned: true });

      (checkBriefAccess as Mock).mockResolvedValue({
        brief: mockBrief,
        hasAccess: true,
        isOwner: true,
      });

      (mapBriefToDetail as Mock).mockReturnValue(mockBriefDto);

      // Act
      const result = await getBriefById(mockSupabase, briefId, userId, userEmail);

      // Assert
      expect(checkBriefAccess).toHaveBeenCalledWith(mockSupabase, briefId, userId, userEmail);
      expect(mapBriefToDetail).toHaveBeenCalledWith(mockBrief, true);
      expect(result).toEqual(mockBriefDto);
    });

    it("should return brief when user has access as recipient", async () => {
      // Arrange
      const briefId = "brief-123";
      const userId = "user-123";
      const userEmail = "user@example.com";

      const mockBrief = createMockBrief({ id: briefId, owner_id: "other-user" });
      const mockBriefDto = createMockBriefDetailDto({ id: briefId, isOwned: false });

      (checkBriefAccess as Mock).mockResolvedValue({
        brief: mockBrief,
        hasAccess: true,
        isOwner: false,
      });

      (mapBriefToDetail as Mock).mockReturnValue(mockBriefDto);

      // Act
      const result = await getBriefById(mockSupabase, briefId, userId, userEmail);

      // Assert
      expect(checkBriefAccess).toHaveBeenCalledWith(mockSupabase, briefId, userId, userEmail);
      expect(mapBriefToDetail).toHaveBeenCalledWith(mockBrief, false);
      expect(result).toEqual(mockBriefDto);
    });

    it("should return null when brief not found", async () => {
      // Arrange
      const briefId = "brief-123";
      const userId = "user-123";
      const userEmail = "user@example.com";

      (checkBriefAccess as Mock).mockResolvedValue(null);

      // Act
      const result = await getBriefById(mockSupabase, briefId, userId, userEmail);

      // Assert
      expect(result).toBeNull();
    });

    it("should throw ForbiddenError when user has no access", async () => {
      // Arrange
      const briefId = "brief-123";
      const userId = "user-123";
      const userEmail = "user@example.com";

      (checkBriefAccess as Mock).mockResolvedValue({
        brief: createMockBrief(),
        hasAccess: false,
        isOwner: false,
      });

      // Act & Assert
      await expect(getBriefById(mockSupabase, briefId, userId, userEmail)).rejects.toThrow(ForbiddenError);
      await expect(getBriefById(mockSupabase, briefId, userId, userEmail)).rejects.toThrow(
        "You do not have access to this brief"
      );
    });
  });

  describe("createBrief", () => {
    it("should successfully create brief with audit trail", async () => {
      // Arrange
      const userId = "user-123";
      const data = {
        header: "Test Header",
        content: "Test Content",
        footer: "Test Footer",
      };

      const mockProfile = { role: "creator" };
      const mockBrief = createMockBrief({
        owner_id: userId,
        header: data.header,
        content: data.content,
        footer: data.footer,
        status: "draft",
      });
      const mockBriefDto = createMockBriefDetailDto({ isOwned: true });

      // Mock profile check
      const mockProfileSelect = vi.fn().mockReturnThis();
      const mockProfileEq = vi.fn().mockReturnThis();
      const mockProfileSingle = vi.fn().mockResolvedValue({
        data: mockProfile,
        error: null,
      });

      // Mock brief count check
      const mockCountSelect = vi.fn().mockReturnThis();
      const mockCountEq = vi.fn().mockResolvedValue({
        count: 5,
        error: null,
      });

      // Mock brief insert
      const mockInsert = vi.fn().mockReturnThis();
      const mockInsertSelect = vi.fn().mockReturnThis();
      const mockInsertSingle = vi.fn().mockResolvedValue({
        data: mockBrief,
        error: null,
      });

      let callCount = 0;
      (mockSupabase.from as Mock).mockImplementation((table: string) => {
        if (table === "profiles") {
          return { select: mockProfileSelect };
        }
        if (table === "briefs") {
          callCount++;
          if (callCount === 1) {
            return { select: mockCountSelect };
          } else {
            return { insert: mockInsert };
          }
        }
        return createMockFromChain();
      });

      mockProfileSelect.mockReturnValue({ eq: mockProfileEq });
      mockProfileEq.mockReturnValue({ single: mockProfileSingle });
      mockCountSelect.mockReturnValue({ eq: mockCountEq });
      mockInsert.mockReturnValue({ select: mockInsertSelect });
      mockInsertSelect.mockReturnValue({ single: mockInsertSingle });

      (auditBriefCreated as Mock).mockResolvedValue(undefined);
      (mapBriefToDetail as Mock).mockReturnValue(mockBriefDto);

      // Act
      const result = await createBrief(mockSupabase, userId, data);

      // Assert
      expect(mockSupabase.from).toHaveBeenCalledWith("profiles");
      expect(mockSupabase.from).toHaveBeenCalledWith("briefs");
      expect(mockProfileEq).toHaveBeenCalledWith("id", userId);
      expect(mockCountEq).toHaveBeenCalledWith("owner_id", userId);
      expect(auditBriefCreated).toHaveBeenCalledWith(mockSupabase, userId, mockBrief.id, {
        header: mockBrief.header,
        content: mockBrief.content,
        footer: mockBrief.footer,
        status: mockBrief.status,
      });
      expect(mapBriefToDetail).toHaveBeenCalledWith(mockBrief, true);
      expect(result).toEqual(mockBriefDto);
    });

    it("should throw UnauthorizedError when profile not found", async () => {
      // Arrange
      const userId = "user-123";
      const data = {
        header: "Test Header",
        content: "Test Content",
      };

      const mockProfileSelect = vi.fn().mockReturnThis();
      const mockProfileEq = vi.fn().mockReturnThis();
      const mockProfileSingle = vi.fn().mockResolvedValue({
        data: null,
        error: { message: "Not found" },
      });

      (mockSupabase.from as Mock).mockReturnValue({
        select: mockProfileSelect,
      });
      mockProfileSelect.mockReturnValue({ eq: mockProfileEq });
      mockProfileEq.mockReturnValue({ single: mockProfileSingle });

      // Act & Assert
      await expect(createBrief(mockSupabase, userId, data)).rejects.toThrow(UnauthorizedError);
      await expect(createBrief(mockSupabase, userId, data)).rejects.toThrow("User profile not found");
    });

    it("should throw ForbiddenError when user is not creator", async () => {
      // Arrange
      const userId = "user-123";
      const data = {
        header: "Test Header",
        content: "Test Content",
      };

      const mockProfile = { role: "client" };

      const mockProfileSelect = vi.fn().mockReturnThis();
      const mockProfileEq = vi.fn().mockReturnThis();
      const mockProfileSingle = vi.fn().mockResolvedValue({
        data: mockProfile,
        error: null,
      });

      (mockSupabase.from as Mock).mockReturnValue({
        select: mockProfileSelect,
      });
      mockProfileSelect.mockReturnValue({ eq: mockProfileEq });
      mockProfileEq.mockReturnValue({ single: mockProfileSingle });

      // Act & Assert
      await expect(createBrief(mockSupabase, userId, data)).rejects.toThrow(ForbiddenError);
      await expect(createBrief(mockSupabase, userId, data)).rejects.toThrow("Only creators can create briefs");
    });

    it("should throw ForbiddenError when brief limit reached", async () => {
      // Arrange
      const userId = "user-123";
      const data = {
        header: "Test Header",
        content: "Test Content",
      };

      const mockProfile = { role: "creator" };

      const mockProfileSelect = vi.fn().mockReturnThis();
      const mockProfileEq = vi.fn().mockReturnThis();
      const mockProfileSingle = vi.fn().mockResolvedValue({
        data: mockProfile,
        error: null,
      });

      const mockCountSelect = vi.fn().mockReturnThis();
      const mockCountEq = vi.fn().mockResolvedValue({
        count: 20,
        error: null,
      });

      (mockSupabase.from as Mock)
        .mockImplementationOnce(() => ({ select: mockProfileSelect })) // First call: profile check
        .mockImplementationOnce(() => ({ select: mockCountSelect })); // Second call: brief count

      mockProfileSelect.mockReturnValue({ eq: mockProfileEq });
      mockProfileEq.mockReturnValue({ single: mockProfileSingle });
      mockCountSelect.mockReturnValue({ eq: mockCountEq });

      // Act & Assert
      const promise = createBrief(mockSupabase, userId, data);
      await expect(promise).rejects.toThrow(ForbiddenError);
      await expect(promise).rejects.toThrow("Brief limit of 20 reached. Please delete old briefs to create new ones.");
    });
  });

  describe("updateBriefContent", () => {
    it("should successfully update brief content", async () => {
      // Arrange
      const userId = "user-123";
      const userEmail = "user@example.com";
      const briefId = "brief-123";
      const data = {
        header: "Updated Header",
        content: "Updated Content",
      };

      const mockUpdatedBrief = createMockBrief({
        id: briefId,
        header: data.header,
        content: data.content,
      });
      const mockBriefDto = createMockBriefDetailDto({ isOwned: true });

      (requireBriefOwner as Mock).mockResolvedValue(undefined);

      const mockUpdate = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockReturnThis();
      const mockSelect = vi.fn().mockReturnThis();
      const mockSingle = vi.fn().mockResolvedValue({
        data: mockUpdatedBrief,
        error: null,
      });

      (mockSupabase.from as Mock).mockReturnValue({
        update: mockUpdate,
      });

      mockUpdate.mockReturnValue({ eq: mockEq });
      mockEq.mockReturnValue({ select: mockSelect });
      mockSelect.mockReturnValue({ single: mockSingle });

      (mapBriefToDetail as Mock).mockReturnValue(mockBriefDto);

      // Act
      const result = await updateBriefContent(mockSupabase, userId, userEmail, briefId, data);

      // Assert
      expect(requireBriefOwner).toHaveBeenCalledWith(mockSupabase, briefId, userId, userEmail);
      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          header: data.header,
          content: data.content,
          updated_at: expect.any(String),
        })
      );
      expect(mockEq).toHaveBeenCalledWith("id", briefId);
      expect(mapBriefToDetail).toHaveBeenCalledWith(mockUpdatedBrief, true);
      expect(result).toEqual(mockBriefDto);
    });

    it("should update only provided fields", async () => {
      // Arrange
      const userId = "user-123";
      const userEmail = "user@example.com";
      const briefId = "brief-123";
      const data = {
        header: "Updated Header",
      };

      const mockUpdatedBrief = createMockBrief({ id: briefId, header: data.header });
      const mockBriefDto = createMockBriefDetailDto({ isOwned: true });

      (requireBriefOwner as Mock).mockResolvedValue(undefined);

      const mockUpdate = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockReturnThis();
      const mockSelect = vi.fn().mockReturnThis();
      const mockSingle = vi.fn().mockResolvedValue({
        data: mockUpdatedBrief,
        error: null,
      });

      (mockSupabase.from as Mock).mockReturnValue({
        update: mockUpdate,
      });

      mockUpdate.mockReturnValue({ eq: mockEq });
      mockEq.mockReturnValue({ select: mockSelect });
      mockSelect.mockReturnValue({ single: mockSingle });

      (mapBriefToDetail as Mock).mockReturnValue(mockBriefDto);

      // Act
      await updateBriefContent(mockSupabase, userId, userEmail, briefId, data);

      // Assert
      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          header: data.header,
          updated_at: expect.any(String),
        })
      );
      expect(mockUpdate).toHaveBeenCalledWith(expect.not.objectContaining({ content: expect.anything() }));
    });
  });

  describe("updateBriefStatus", () => {
    it("should successfully update status to accepted", async () => {
      // Arrange
      const userId = "user-123";
      const userEmail = "user@example.com";
      const briefId = "brief-123";
      const data = {
        status: "accepted" as const,
      };

      const mockBrief = createMockBrief({ id: briefId, status: "sent" });
      const mockUpdatedBrief = {
        id: briefId,
        status: "accepted",
        status_changed_at: new Date().toISOString(),
        status_changed_by: userId,
        comment_count: 0,
        updated_at: new Date().toISOString(),
      };

      (requireRecipientAccess as Mock).mockResolvedValue({
        brief: mockBrief,
        hasAccess: true,
      });

      const mockUpdate = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockReturnThis();
      const mockSelect = vi.fn().mockReturnThis();
      const mockSingle = vi.fn().mockResolvedValue({
        data: mockUpdatedBrief,
        error: null,
      });

      (mockSupabase.from as Mock).mockReturnValue({
        update: mockUpdate,
      });

      mockUpdate.mockReturnValue({ eq: mockEq });
      mockEq.mockReturnValue({ select: mockSelect });
      mockSelect.mockReturnValue({ single: mockSingle });

      (auditStatusChanged as Mock).mockResolvedValue(undefined);

      // Act
      const result = await updateBriefStatus(mockSupabase, userId, userEmail, briefId, data);

      // Assert
      expect(requireRecipientAccess).toHaveBeenCalledWith(mockSupabase, briefId, userId, userEmail);
      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          status: "accepted",
          status_changed_at: expect.any(String),
          status_changed_by: userId,
          updated_at: expect.any(String),
        })
      );
      expect(auditStatusChanged).toHaveBeenCalledWith(mockSupabase, userId, briefId, "sent", "accepted", {
        status_changed_at: mockUpdatedBrief.status_changed_at,
        status_changed_by: mockUpdatedBrief.status_changed_by,
      });
      expect(result).toEqual({
        id: briefId,
        status: "accepted",
        statusChangedAt: mockUpdatedBrief.status_changed_at,
        statusChangedBy: userId,
        commentCount: 0,
        updatedAt: mockUpdatedBrief.updated_at,
      });
    });

    it("should throw ForbiddenError when brief status is already accepted", async () => {
      // Arrange
      const userId = "user-123";
      const userEmail = "user@example.com";
      const briefId = "brief-123";
      const data = {
        status: "needs_modification" as const,
        comment: "Please change this",
      };

      const mockBrief = createMockBrief({ id: briefId, status: "accepted" });

      (requireRecipientAccess as Mock).mockResolvedValue({
        brief: mockBrief,
        hasAccess: true,
      });

      // Act & Assert
      await expect(updateBriefStatus(mockSupabase, userId, userEmail, briefId, data)).rejects.toThrow(ForbiddenError);
      await expect(updateBriefStatus(mockSupabase, userId, userEmail, briefId, data)).rejects.toThrow(
        "Cannot change status from accepted"
      );
    });

    it("should throw ForbiddenError when brief status is not sent", async () => {
      // Arrange
      const userId = "user-123";
      const userEmail = "user@example.com";
      const briefId = "brief-123";
      const data = {
        status: "accepted" as const,
      };

      const mockBrief = createMockBrief({ id: briefId, status: "draft" });

      (requireRecipientAccess as Mock).mockResolvedValue({
        brief: mockBrief,
        hasAccess: true,
      });

      // Act & Assert
      await expect(updateBriefStatus(mockSupabase, userId, userEmail, briefId, data)).rejects.toThrow(ForbiddenError);
      await expect(updateBriefStatus(mockSupabase, userId, userEmail, briefId, data)).rejects.toThrow(
        "Brief status can only be changed when it is in 'sent' state"
      );
    });
  });

  describe("deleteBrief", () => {
    it("should successfully delete brief with audit trail", async () => {
      // Arrange
      const userId = "user-123";
      const briefId = "brief-123";

      const mockBrief = createMockBrief({ id: briefId, owner_id: userId });

      const mockSelect = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockReturnThis();
      const mockSingle = vi.fn().mockResolvedValue({
        data: mockBrief,
        error: null,
      });

      const mockDelete = vi.fn().mockReturnThis();
      const mockDeleteEq = vi.fn().mockResolvedValue({
        error: null,
      });

      (mockSupabase.from as Mock)
        .mockImplementationOnce(() => ({ select: mockSelect })) // First call: select brief
        .mockImplementationOnce(() => ({ delete: mockDelete })); // Second call: delete brief

      mockSelect.mockReturnValue({ eq: mockEq });
      mockEq.mockReturnValue({ single: mockSingle });
      mockDelete.mockReturnValue({ eq: mockDeleteEq });

      (auditBriefDeleted as Mock).mockResolvedValue(undefined);

      const consoleInfoSpy = suppressConsole("info");

      // Act
      await deleteBrief(mockSupabase, briefId, userId);

      // Assert
      expect(auditBriefDeleted).toHaveBeenCalledWith(mockSupabase, userId, briefId, {
        owner_id: mockBrief.owner_id,
        header: mockBrief.header,
        content: mockBrief.content,
        footer: mockBrief.footer,
        status: mockBrief.status,
        status_changed_at: mockBrief.status_changed_at,
        status_changed_by: mockBrief.status_changed_by,
        comment_count: mockBrief.comment_count,
        created_at: mockBrief.created_at,
        updated_at: mockBrief.updated_at,
      });
      expect(mockDeleteEq).toHaveBeenCalledWith("id", briefId);
      expect(consoleInfoSpy).toHaveBeenCalledWith(`[brief.service] Brief ${briefId} deleted by user ${userId}`);

      consoleInfoSpy.mockRestore();
    });

    it("should throw NotFoundError when brief not found", async () => {
      // Arrange
      const userId = "user-123";
      const briefId = "brief-123";

      const mockSelect = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockReturnThis();
      const mockSingle = vi.fn().mockResolvedValue({
        data: null,
        error: { message: "Not found" },
      });

      (mockSupabase.from as Mock).mockReturnValue({
        select: mockSelect,
      });

      mockSelect.mockReturnValue({ eq: mockEq });
      mockEq.mockReturnValue({ single: mockSingle });

      // Act & Assert
      await expect(deleteBrief(mockSupabase, briefId, userId)).rejects.toThrow(NotFoundError);
      await expect(deleteBrief(mockSupabase, briefId, userId)).rejects.toThrow(`Brief with ID ${briefId} not found`);
    });

    it("should throw ForbiddenError when user is not owner", async () => {
      // Arrange
      const userId = "user-123";
      const briefId = "brief-123";

      const mockBrief = createMockBrief({ id: briefId, owner_id: "other-user" });

      const mockSelect = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockReturnThis();
      const mockSingle = vi.fn().mockResolvedValue({
        data: mockBrief,
        error: null,
      });

      (mockSupabase.from as Mock).mockReturnValue({
        select: mockSelect,
      });

      mockSelect.mockReturnValue({ eq: mockEq });
      mockEq.mockReturnValue({ single: mockSingle });

      // Act & Assert
      await expect(deleteBrief(mockSupabase, briefId, userId)).rejects.toThrow(ForbiddenError);
      await expect(deleteBrief(mockSupabase, briefId, userId)).rejects.toThrow("You are not the owner of this brief");
    });
  });

  describe("shareBriefWithRecipient", () => {
    it("should successfully share brief with existing user", async () => {
      // Arrange
      const briefId = "brief-123";
      const recipientEmail = "recipient@example.com";
      const ownerId = "owner-123";
      const recipientId = "recipient-123";

      const mockBrief = { id: briefId, owner_id: ownerId, status: "draft" };
      const mockRecipient = createMockRecipient({
        brief_id: briefId,
        recipient_id: recipientId,
        recipient_email: recipientEmail,
        shared_by: ownerId,
      });

      // Mock brief fetch
      const mockBriefSelect = vi.fn().mockReturnThis();
      const mockBriefEq1 = vi.fn().mockReturnThis();
      const mockBriefEq2 = vi.fn().mockReturnThis();
      const mockBriefSingle = vi.fn().mockResolvedValue({
        data: mockBrief,
        error: null,
      });

      // Mock recipient count
      const mockCountSelect = vi.fn().mockReturnThis();
      const mockCountEq = vi.fn().mockResolvedValue({
        count: 5,
        error: null,
      });

      // Mock duplicate check
      const mockDuplicateSelect = vi.fn().mockReturnThis();
      const mockDuplicateEq1 = vi.fn().mockReturnThis();
      const mockDuplicateEq2 = vi.fn().mockReturnThis();
      const mockDuplicateSingle = vi.fn().mockResolvedValue({
        data: null,
        error: null,
      });

      // Mock recipient insert
      const mockInsert = vi.fn().mockReturnThis();
      const mockInsertSelect = vi.fn().mockReturnThis();
      const mockInsertSingle = vi.fn().mockResolvedValue({
        data: mockRecipient,
        error: null,
      });

      let callCount = 0;
      (mockSupabase.from as Mock).mockImplementation((table: string) => {
        if (table === "briefs") {
          return { select: mockBriefSelect };
        }
        if (table === "brief_recipients") {
          callCount++;
          if (callCount === 1) {
            return { select: mockCountSelect };
          } else if (callCount === 2) {
            return { select: mockDuplicateSelect };
          } else {
            return { insert: mockInsert };
          }
        }
        return createMockFromChain();
      });

      mockBriefSelect.mockReturnValue({ eq: mockBriefEq1 });
      mockBriefEq1.mockReturnValue({ eq: mockBriefEq2 });
      mockBriefEq2.mockReturnValue({ single: mockBriefSingle });

      mockCountSelect.mockReturnValue({ eq: mockCountEq });

      mockDuplicateSelect.mockReturnValue({ eq: mockDuplicateEq1 });
      mockDuplicateEq1.mockReturnValue({ eq: mockDuplicateEq2 });
      mockDuplicateEq2.mockReturnValue({ single: mockDuplicateSingle });

      mockInsert.mockReturnValue({ select: mockInsertSelect });
      mockInsertSelect.mockReturnValue({ single: mockInsertSingle });

      (mockSupabase.rpc as Mock).mockResolvedValue({
        data: [{ id: recipientId }],
        error: null,
      });

      (auditBriefShared as Mock).mockResolvedValue(undefined);

      // Act
      const result = await shareBriefWithRecipient(mockSupabase, briefId, recipientEmail, ownerId);

      // Assert
      expect(mockSupabase.rpc).toHaveBeenCalledWith("get_user_by_email", {
        email_param: recipientEmail,
      });
      expect(auditBriefShared).toHaveBeenCalledWith(mockSupabase, ownerId, mockRecipient.id, {
        brief_id: briefId,
        recipient_id: recipientId,
        recipient_email: recipientEmail,
        shared_by: ownerId,
        shared_at: mockRecipient.shared_at,
        user_exists: true,
      });
      expect(result).toEqual({
        id: mockRecipient.id,
        briefId: briefId,
        recipientId: recipientId,
        recipientEmail: recipientEmail,
        sharedBy: ownerId,
        sharedAt: mockRecipient.shared_at,
      });
    });

    it("should throw NotFoundError when brief not found", async () => {
      // Arrange
      const briefId = "brief-123";
      const recipientEmail = "recipient@example.com";
      const ownerId = "owner-123";

      const mockBriefSelect = vi.fn().mockReturnThis();
      const mockBriefEq1 = vi.fn().mockReturnThis();
      const mockBriefEq2 = vi.fn().mockReturnThis();
      const mockBriefSingle = vi.fn().mockResolvedValue({
        data: null,
        error: { message: "Not found" },
      });

      (mockSupabase.from as Mock).mockReturnValue({
        select: mockBriefSelect,
      });

      mockBriefSelect.mockReturnValue({ eq: mockBriefEq1 });
      mockBriefEq1.mockReturnValue({ eq: mockBriefEq2 });
      mockBriefEq2.mockReturnValue({ single: mockBriefSingle });

      // Act & Assert
      await expect(shareBriefWithRecipient(mockSupabase, briefId, recipientEmail, ownerId)).rejects.toThrow(
        NotFoundError
      );
    });

    it("should throw ForbiddenError when recipient limit exceeded", async () => {
      // Arrange
      const briefId = "brief-123";
      const recipientEmail = "recipient@example.com";
      const ownerId = "owner-123";

      const mockBrief = { id: briefId, owner_id: ownerId, status: "draft" };

      const mockBriefSelect = vi.fn().mockReturnThis();
      const mockBriefEq1 = vi.fn().mockReturnThis();
      const mockBriefEq2 = vi.fn().mockReturnThis();
      const mockBriefSingle = vi.fn().mockResolvedValue({
        data: mockBrief,
        error: null,
      });

      const mockCountSelect = vi.fn().mockReturnThis();
      const mockCountEq = vi.fn().mockResolvedValue({
        count: 10,
        error: null,
      });

      (mockSupabase.from as Mock).mockImplementation((table: string) => {
        if (table === "briefs") {
          return { select: mockBriefSelect };
        }
        if (table === "brief_recipients") {
          return { select: mockCountSelect };
        }
        return createMockFromChain();
      });

      mockBriefSelect.mockReturnValue({ eq: mockBriefEq1 });
      mockBriefEq1.mockReturnValue({ eq: mockBriefEq2 });
      mockBriefEq2.mockReturnValue({ single: mockBriefSingle });

      mockCountSelect.mockReturnValue({ eq: mockCountEq });

      // Act & Assert
      await expect(shareBriefWithRecipient(mockSupabase, briefId, recipientEmail, ownerId)).rejects.toThrow(
        ForbiddenError
      );
      await expect(shareBriefWithRecipient(mockSupabase, briefId, recipientEmail, ownerId)).rejects.toThrow(
        "Maximum of 10 recipients per brief exceeded"
      );
    });

    it("should throw ConflictError when email already shared", async () => {
      // Arrange
      const briefId = "brief-123";
      const recipientEmail = "recipient@example.com";
      const ownerId = "owner-123";

      const mockBrief = { id: briefId, owner_id: ownerId, status: "draft" };
      const existingRecipient = { id: "recipient-456" };

      const mockBriefSelect = vi.fn().mockReturnThis();
      const mockBriefEq1 = vi.fn().mockReturnThis();
      const mockBriefEq2 = vi.fn().mockReturnThis();
      const mockBriefSingle = vi.fn().mockResolvedValue({
        data: mockBrief,
        error: null,
      });

      const mockCountSelect = vi.fn().mockReturnThis();
      const mockCountEq = vi.fn().mockResolvedValue({
        count: 5,
        error: null,
      });

      const mockDuplicateSelect = vi.fn().mockReturnThis();
      const mockDuplicateEq1 = vi.fn().mockReturnThis();
      const mockDuplicateEq2 = vi.fn().mockReturnThis();
      const mockDuplicateSingle = vi.fn().mockResolvedValue({
        data: existingRecipient,
        error: null,
      });

      let callCount = 0;
      (mockSupabase.from as Mock).mockImplementation((table: string) => {
        if (table === "briefs") {
          return { select: mockBriefSelect };
        }
        if (table === "brief_recipients") {
          callCount++;
          if (callCount === 1) {
            return { select: mockCountSelect };
          } else {
            return { select: mockDuplicateSelect };
          }
        }
        return createMockFromChain();
      });

      mockBriefSelect.mockReturnValue({ eq: mockBriefEq1 });
      mockBriefEq1.mockReturnValue({ eq: mockBriefEq2 });
      mockBriefEq2.mockReturnValue({ single: mockBriefSingle });

      mockCountSelect.mockReturnValue({ eq: mockCountEq });

      mockDuplicateSelect.mockReturnValue({ eq: mockDuplicateEq1 });
      mockDuplicateEq1.mockReturnValue({ eq: mockDuplicateEq2 });
      mockDuplicateEq2.mockReturnValue({ single: mockDuplicateSingle });

      // Act & Assert
      await expect(shareBriefWithRecipient(mockSupabase, briefId, recipientEmail, ownerId)).rejects.toThrow(
        ConflictError
      );
      await expect(shareBriefWithRecipient(mockSupabase, briefId, recipientEmail, ownerId)).rejects.toThrow(
        `Brief already shared with ${recipientEmail}`
      );
    });
  });

  describe("getBriefRecipients", () => {
    it("should return list of recipients with email", async () => {
      // Arrange
      const briefId = "brief-123";

      const mockRecipients = [
        createMockRecipient({
          id: "recipient-1",
          recipient_id: "user-1",
          recipient_email: "user1@example.com",
        }),
        createMockRecipient({
          id: "recipient-2",
          recipient_id: null,
          recipient_email: "user2@example.com",
        }),
      ];

      const mockRecipientDtos = [
        createMockRecipientDto({
          id: "recipient-1",
          recipientId: "user-1",
          recipientEmail: "user1@example.com",
        }),
        createMockRecipientDto({
          id: "recipient-2",
          recipientId: "",
          recipientEmail: "user2@example.com",
        }),
      ];

      const mockSelect = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockReturnThis();
      const mockOrder = vi.fn().mockResolvedValue({
        data: mockRecipients,
        error: null,
      });

      (mockSupabase.from as Mock).mockReturnValue({
        select: mockSelect,
      });

      mockSelect.mockReturnValue({ eq: mockEq });
      mockEq.mockReturnValue({ order: mockOrder });

      (mapRecipientToDto as Mock).mockReturnValueOnce(mockRecipientDtos[0]).mockReturnValueOnce(mockRecipientDtos[1]);

      // Act
      const result = await getBriefRecipients(mockSupabase, briefId);

      // Assert
      expect(mockSupabase.from).toHaveBeenCalledWith("brief_recipients");
      expect(mockSelect).toHaveBeenCalledWith("id, recipient_id, recipient_email, shared_by, shared_at");
      expect(mockEq).toHaveBeenCalledWith("brief_id", briefId);
      expect(mockOrder).toHaveBeenCalledWith("shared_at", { ascending: false });
      expect(mapRecipientToDto).toHaveBeenCalledTimes(2);
      expect(result).toEqual(mockRecipientDtos);
    });

    it("should return empty array when no recipients", async () => {
      // Arrange
      const briefId = "brief-123";

      const mockSelect = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockReturnThis();
      const mockOrder = vi.fn().mockResolvedValue({
        data: [],
        error: null,
      });

      (mockSupabase.from as Mock).mockReturnValue({
        select: mockSelect,
      });

      mockSelect.mockReturnValue({ eq: mockEq });
      mockEq.mockReturnValue({ order: mockOrder });

      // Act
      const result = await getBriefRecipients(mockSupabase, briefId);

      // Assert
      expect(result).toEqual([]);
    });

    it("should throw DatabaseError when query fails", async () => {
      // Arrange
      const briefId = "brief-123";

      const mockSelect = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockReturnThis();
      const mockOrder = vi.fn().mockResolvedValue({
        data: null,
        error: { message: "Query failed" },
      });

      (mockSupabase.from as Mock).mockReturnValue({
        select: mockSelect,
      });

      mockSelect.mockReturnValue({ eq: mockEq });
      mockEq.mockReturnValue({ order: mockOrder });

      const consoleErrorSpy = suppressConsole("error");

      // Act & Assert
      await expect(getBriefRecipients(mockSupabase, briefId)).rejects.toThrow(DatabaseError);
      await expect(getBriefRecipients(mockSupabase, briefId)).rejects.toThrow(
        "Database error during retrieve recipients"
      );

      consoleErrorSpy.mockRestore();
    });
  });

  describe("revokeBriefRecipient", () => {
    it("should successfully revoke recipient access", async () => {
      // Arrange
      const briefId = "brief-123";
      const recipientRecordId = "recipient-record-123";
      const ownerId = "owner-123";

      const mockBrief = { id: briefId, owner_id: ownerId, status: "sent" };
      const mockRecipientAccess = createMockRecipient({
        id: recipientRecordId,
        brief_id: briefId,
        recipient_email: "recipient@example.com",
      });

      // Mock brief fetch
      const mockBriefSelect = vi.fn().mockReturnThis();
      const mockBriefEq1 = vi.fn().mockReturnThis();
      const mockBriefEq2 = vi.fn().mockReturnThis();
      const mockBriefSingle = vi.fn().mockResolvedValue({
        data: mockBrief,
        error: null,
      });

      // Mock recipient fetch
      const mockRecipientSelect = vi.fn().mockReturnThis();
      const mockRecipientEq1 = vi.fn().mockReturnThis();
      const mockRecipientEq2 = vi.fn().mockReturnThis();
      const mockRecipientSingle = vi.fn().mockResolvedValue({
        data: mockRecipientAccess,
        error: null,
      });

      // Mock recipient count
      const mockCountSelect = vi.fn().mockReturnThis();
      const mockCountEq = vi.fn().mockResolvedValue({
        count: 2,
        error: null,
      });

      // Mock delete
      const mockDelete = vi.fn().mockReturnThis();
      const mockDeleteEq = vi.fn().mockResolvedValue({
        error: null,
      });

      let callCount = 0;
      (mockSupabase.from as Mock).mockImplementation((table: string) => {
        if (table === "briefs") {
          return { select: mockBriefSelect };
        }
        if (table === "brief_recipients") {
          callCount++;
          if (callCount === 1) {
            return { select: mockRecipientSelect };
          } else if (callCount === 2) {
            return { select: mockCountSelect };
          } else {
            return { delete: mockDelete };
          }
        }
        return createMockFromChain();
      });

      mockBriefSelect.mockReturnValue({ eq: mockBriefEq1 });
      mockBriefEq1.mockReturnValue({ eq: mockBriefEq2 });
      mockBriefEq2.mockReturnValue({ single: mockBriefSingle });

      mockRecipientSelect.mockReturnValue({ eq: mockRecipientEq1 });
      mockRecipientEq1.mockReturnValue({ eq: mockRecipientEq2 });
      mockRecipientEq2.mockReturnValue({ single: mockRecipientSingle });

      mockCountSelect.mockReturnValue({ eq: mockCountEq });

      mockDelete.mockReturnValue({ eq: mockDeleteEq });

      (auditBriefUnshared as Mock).mockResolvedValue(undefined);

      const consoleInfoSpy = suppressConsole("info");

      // Act
      await revokeBriefRecipient(mockSupabase, briefId, recipientRecordId, ownerId);

      // Assert
      expect(auditBriefUnshared).toHaveBeenCalledWith(mockSupabase, ownerId, recipientRecordId, {
        brief_id: briefId,
        recipient_id: mockRecipientAccess.recipient_id,
        recipient_email: mockRecipientAccess.recipient_email,
        shared_by: mockRecipientAccess.shared_by,
        shared_at: mockRecipientAccess.shared_at,
        was_last_recipient: false,
      });
      expect(mockDeleteEq).toHaveBeenCalledWith("id", recipientRecordId);

      consoleInfoSpy.mockRestore();
    });

    it("should reset brief status to draft when last recipient removed", async () => {
      // Arrange
      const briefId = "brief-123";
      const recipientRecordId = "recipient-record-123";
      const ownerId = "owner-123";

      const mockBrief = { id: briefId, owner_id: ownerId, status: "sent" };
      const mockRecipientAccess = createMockRecipient({
        id: recipientRecordId,
        brief_id: briefId,
      });

      const mockBriefSelect = vi.fn().mockReturnThis();
      const mockBriefEq1 = vi.fn().mockReturnThis();
      const mockBriefEq2 = vi.fn().mockReturnThis();
      const mockBriefSingle = vi.fn().mockResolvedValue({
        data: mockBrief,
        error: null,
      });

      const mockRecipientSelect = vi.fn().mockReturnThis();
      const mockRecipientEq1 = vi.fn().mockReturnThis();
      const mockRecipientEq2 = vi.fn().mockReturnThis();
      const mockRecipientSingle = vi.fn().mockResolvedValue({
        data: mockRecipientAccess,
        error: null,
      });

      const mockCountSelect = vi.fn().mockReturnThis();
      const mockCountEq = vi.fn().mockResolvedValue({
        count: 1,
        error: null,
      });

      const mockDelete = vi.fn().mockReturnThis();
      const mockDeleteEq = vi.fn().mockResolvedValue({
        error: null,
      });

      const mockUpdate = vi.fn().mockReturnThis();
      const mockUpdateEq = vi.fn().mockResolvedValue({
        error: null,
      });

      let callCount = 0;
      let briefCallCount = 0;
      (mockSupabase.from as Mock).mockImplementation((table: string) => {
        if (table === "briefs") {
          briefCallCount++;
          if (briefCallCount === 1) {
            return { select: mockBriefSelect };
          } else {
            return { update: mockUpdate };
          }
        }
        if (table === "brief_recipients") {
          callCount++;
          if (callCount === 1) {
            return { select: mockRecipientSelect };
          } else if (callCount === 2) {
            return { select: mockCountSelect };
          } else {
            return { delete: mockDelete };
          }
        }
        return createMockFromChain();
      });

      mockBriefSelect.mockReturnValue({ eq: mockBriefEq1 });
      mockBriefEq1.mockReturnValue({ eq: mockBriefEq2 });
      mockBriefEq2.mockReturnValue({ single: mockBriefSingle });

      mockRecipientSelect.mockReturnValue({ eq: mockRecipientEq1 });
      mockRecipientEq1.mockReturnValue({ eq: mockRecipientEq2 });
      mockRecipientEq2.mockReturnValue({ single: mockRecipientSingle });

      mockCountSelect.mockReturnValue({ eq: mockCountEq });

      mockDelete.mockReturnValue({ eq: mockDeleteEq });

      mockUpdate.mockReturnValue({ eq: mockUpdateEq });

      (auditBriefUnshared as Mock).mockResolvedValue(undefined);

      const consoleInfoSpy = suppressConsole("info");

      // Act
      await revokeBriefRecipient(mockSupabase, briefId, recipientRecordId, ownerId);

      // Assert
      expect(mockUpdate).toHaveBeenCalledWith({
        status: "draft",
        status_changed_at: expect.any(String),
        status_changed_by: ownerId,
        updated_at: expect.any(String),
      });
      expect(mockUpdateEq).toHaveBeenCalledWith("id", briefId);

      consoleInfoSpy.mockRestore();
    });
  });

  describe("createCommentForStatusUpdate", () => {
    it("should successfully create comment with author info", async () => {
      // Arrange
      const briefId = "brief-123";
      const authorId = "author-123";
      const content = "Please make changes";

      const mockComment = createMockComment({
        brief_id: briefId,
        author_id: authorId,
        content,
      });
      const mockAuthorInfo = createMockAuthorInfo({ email: "author@example.com" });
      const mockCommentDto = createMockCommentDto({
        briefId,
        authorId,
        authorEmail: "author@example.com",
        content,
      });

      const mockInsert = vi.fn().mockReturnThis();
      const mockSelect = vi.fn().mockReturnThis();
      const mockSingle = vi.fn().mockResolvedValue({
        data: mockComment,
        error: null,
      });

      (mockSupabase.from as Mock).mockReturnValue({
        insert: mockInsert,
      });

      mockInsert.mockReturnValue({ select: mockSelect });
      mockSelect.mockReturnValue({ single: mockSingle });

      (getAuthorInfo as Mock).mockResolvedValue(mockAuthorInfo);
      (mapCommentToDto as Mock).mockReturnValue(mockCommentDto);

      // Act
      const result = await createCommentForStatusUpdate(mockSupabase, briefId, authorId, content);

      // Assert
      expect(mockSupabase.from).toHaveBeenCalledWith("comments");
      expect(mockInsert).toHaveBeenCalledWith({
        brief_id: briefId,
        author_id: authorId,
        content,
      });
      expect(getAuthorInfo).toHaveBeenCalledWith(mockSupabase, authorId);
      expect(mapCommentToDto).toHaveBeenCalledWith(mockComment, mockAuthorInfo.email, mockAuthorInfo.role, authorId);
      expect(result).toEqual(mockCommentDto);
    });
  });

  describe("updatePendingRecipients", () => {
    it("should update pending recipients and return count", async () => {
      // Arrange
      const userId = "user-123";
      const userEmail = "user@example.com";

      const mockUpdate = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockReturnThis();
      const mockIs = vi.fn().mockReturnThis();
      const mockSelect = vi.fn().mockResolvedValue({
        data: [{ id: "recipient-1" }, { id: "recipient-2" }],
        error: null,
      });

      (mockSupabase.from as Mock).mockReturnValue({
        update: mockUpdate,
      });

      mockUpdate.mockReturnValue({ eq: mockEq });
      mockEq.mockReturnValue({ is: mockIs });
      mockIs.mockReturnValue({ select: mockSelect });

      const consoleInfoSpy = suppressConsole("info");

      // Act
      const result = await updatePendingRecipients(mockSupabase, userId, userEmail);

      // Assert
      expect(mockSupabase.from).toHaveBeenCalledWith("brief_recipients");
      expect(mockUpdate).toHaveBeenCalledWith({ recipient_id: userId });
      expect(mockEq).toHaveBeenCalledWith("recipient_email", userEmail);
      expect(mockIs).toHaveBeenCalledWith("recipient_id", null);
      expect(result).toBe(2);
      expect(consoleInfoSpy).toHaveBeenCalledWith(
        `[brief.service] Updated 2 pending recipient(s) for user ${userId} (${userEmail})`
      );

      consoleInfoSpy.mockRestore();
    });

    it("should return 0 when no pending recipients found", async () => {
      // Arrange
      const userId = "user-123";
      const userEmail = "user@example.com";

      const mockUpdate = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockReturnThis();
      const mockIs = vi.fn().mockReturnThis();
      const mockSelect = vi.fn().mockResolvedValue({
        data: [],
        error: null,
      });

      (mockSupabase.from as Mock).mockReturnValue({
        update: mockUpdate,
      });

      mockUpdate.mockReturnValue({ eq: mockEq });
      mockEq.mockReturnValue({ is: mockIs });
      mockIs.mockReturnValue({ select: mockSelect });

      // Act
      const result = await updatePendingRecipients(mockSupabase, userId, userEmail);

      // Assert
      expect(result).toBe(0);
    });

    it("should return 0 and log error when update fails", async () => {
      // Arrange
      const userId = "user-123";
      const userEmail = "user@example.com";

      const mockUpdate = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockReturnThis();
      const mockIs = vi.fn().mockReturnThis();
      const mockSelect = vi.fn().mockResolvedValue({
        data: null,
        error: { message: "Update failed" },
      });

      (mockSupabase.from as Mock).mockReturnValue({
        update: mockUpdate,
      });

      mockUpdate.mockReturnValue({ eq: mockEq });
      mockEq.mockReturnValue({ is: mockIs });
      mockIs.mockReturnValue({ select: mockSelect });

      const consoleErrorSpy = suppressConsole("error");

      // Act
      const result = await updatePendingRecipients(mockSupabase, userId, userEmail);

      // Assert
      expect(result).toBe(0);
      expect(consoleErrorSpy).toHaveBeenCalledWith("[brief.service] Failed to update pending recipients:", {
        message: "Update failed",
      });

      consoleErrorSpy.mockRestore();
    });
  });
});
