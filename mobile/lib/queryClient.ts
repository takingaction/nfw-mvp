import { QueryClient } from "@tanstack/react-query";

import { ApiError } from "@/lib/api";

/**
 * Shared TanStack Query client.
 * Server state (API responses) lives here; client/UI state lives in Zustand.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000,
      gcTime: 10 * 60 * 1000,
      retry: (failureCount, error) => {
        // Don't retry auth/permission failures or 4xx client errors.
        if (error instanceof ApiError && error.status >= 400 && error.status < 500) return false;
        return failureCount < 2;
      },
      refetchOnWindowFocus: false, // RN: handled by focusManager in _layout if needed
    },
  },
});
