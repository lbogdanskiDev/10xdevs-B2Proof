import { http, HttpResponse } from "msw";

/**
 * MSW handlers for API mocking
 * Add your API handlers here
 */
export const handlers = [
  // Example: Mock Supabase auth endpoint
  http.post(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/token`, async () => {
    return HttpResponse.json({
      access_token: "mock-access-token",
      token_type: "bearer",
      expires_in: 3600,
      refresh_token: "mock-refresh-token",
      user: {
        id: "mock-user-id",
        email: "test@example.com",
      },
    });
  }),

  // Add more handlers as needed
];
