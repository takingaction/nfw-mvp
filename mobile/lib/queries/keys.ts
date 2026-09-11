/** Centralised TanStack Query keys. */
export const queryKeys = {
  profile: (userId: string) => ["profile", userId] as const,
  dashboardSettings: ["dashboard-settings"] as const,
  savings: (userId: string) => ["savings", userId] as const,
  grantCycles: (includeTesting: boolean) => ["grant-cycles", { includeTesting }] as const,
  myGrants: (userId: string) => ["grants", "mine", userId] as const,
  grant: (grantId: string) => ["grants", grantId] as const,
  grantDocuments: (grantId: string) => ["grants", grantId, "documents"] as const,
  likedStoresCount: (userId: string) => ["liked-stores", "count", userId] as const,
  redemptionsCount: (userId: string) => ["redemptions", "count", userId] as const,
};
