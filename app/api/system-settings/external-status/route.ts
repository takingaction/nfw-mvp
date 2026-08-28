import { NextResponse } from "next/server";

// Simple in-memory cache with TTL
let externalStatusCache: {
  data: {
    status: string;
    description: string;
    components: Array<{
      id: string;
      name: string;
      status: string;
    }>;
    updated_at: string;
  };
  cachedAt: number;
} | null = null;

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

interface ShopifyStatusComponent {
  id: string;
  name: string;
  status: string;
  created_at: string;
  updated_at: string;
  position: number;
  description: string | null;
  showcase: boolean;
  group_id: string | null;
  page_id: string;
  group: boolean;
  only_show_if_degraded: boolean;
  start_date: string | null;
}

interface ShopifyStatusResponse {
  page: {
    id: string;
    name: string;
    url: string;
    time_zone: string;
    updated_at: string;
  };
  status: {
    indicator: string;
    description: string;
  };
}

interface ShopifyComponentsResponse {
  page: {
    id: string;
    name: string;
    url: string;
    time_zone: string;
    updated_at: string;
  };
  components: ShopifyStatusComponent[];
}

function getStatusEmoji(status: string): string {
  switch (status) {
    case "operational":
      return "🟢";
    case "degraded_performance":
      return "🟡";
    case "partial_outage":
      return "🟠";
    case "major_outage":
      return "🔴";
    case "maintenance":
      return "🔵";
    default:
      return "⚪";
  }
}

export async function GET() {
  // Check cache first
  if (externalStatusCache && Date.now() - externalStatusCache.cachedAt < CACHE_TTL_MS) {
    return NextResponse.json(externalStatusCache.data);
  }

  try {
    // Fetch both status and components in parallel
    const [statusRes, componentsRes] = await Promise.all([
      fetch("https://shopifystatus.com/api/v2/status.json", {
        next: { revalidate: 60 }, // Vercel cache for 60 seconds
      }),
      fetch("https://shopifystatus.com/api/v2/components.json", {
        next: { revalidate: 60 },
      }),
    ]);

    if (!statusRes.ok || !componentsRes.ok) {
      const errorData = {
        status: "unknown" as const,
        description: "Failed to fetch Shopify status",
        components: [],
        updated_at: new Date().toISOString(),
      };
      
      externalStatusCache = { data: errorData, cachedAt: Date.now() };
      return NextResponse.json(errorData);
    }

    const statusData: ShopifyStatusResponse = await statusRes.json();
    const componentsData: ShopifyComponentsResponse = await componentsRes.json();

    // Extract the components we care about
    const keyComponents = ["Admin", "Checkout", "Storefront", "API & Mobile"];
    const filteredComponents = componentsData.components
      .filter((c) => keyComponents.includes(c.name))
      .map((c) => ({
        id: c.id,
        name: c.name,
        status: c.status,
      }));

    const result = {
      status: statusData.status.indicator === "none" ? "operational" : statusData.status.indicator,
      description: statusData.status.description,
      components: filteredComponents,
      updated_at: statusData.page.updated_at,
    };

    // Update cache
    externalStatusCache = {
      data: result,
      cachedAt: Date.now(),
    };

    return NextResponse.json(result);
  } catch (err) {
    console.error("Error fetching Shopify external status:", err);
    
    const errorData = {
      status: "unknown" as const,
      description: "Failed to connect to Shopify Status API",
      components: [],
      updated_at: new Date().toISOString(),
    };

    return NextResponse.json(errorData);
  }
}
