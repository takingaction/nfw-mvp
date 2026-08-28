import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const SYSTEM_SETTINGS_ID = "00000000-0000-0000-0000-000000000002";

// In-memory cache for health check results (shared across function invocations in same instance)
// For Vercel/serverless, this resets on each cold start
let healthCheckCache: {
  status: string;
  message: string;
  timestamp: string;
} | null = null;

async function getShopifyToken(): Promise<string | null> {
  const supabaseAdmin = (await import("@/lib/supabase/admin")).default();
  
  // Try to get token from database first
  const storeDomain = process.env.SHOPIFY_SHOP_DOMAIN;
  
  if (!storeDomain) {
    return process.env.SHOPIFY_ACCESS_TOKEN || null;
  }

  const { data: tokenData } = await supabaseAdmin
    .from("shopify_tokens")
    .select("access_token")
    .eq("shop", storeDomain)
    .single();

  return tokenData?.access_token || process.env.SHOPIFY_ACCESS_TOKEN || null;
}

async function checkShopifyHealth(): Promise<{
  status: "healthy" | "unhealthy" | "error";
  message: string;
  responseTime?: number;
}> {
  const storeDomain = process.env.SHOPIFY_SHOP_DOMAIN;
  
  if (!storeDomain) {
    return {
      status: "error",
      message: "SHOPIFY_SHOP_DOMAIN not configured"
    };
  }

  const token = await getShopifyToken();
  
  if (!token) {
    return {
      status: "error",
      message: "No Shopify access token available"
    };
  }

  const startTime = Date.now();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000); // 5 second timeout

  try {
    const response = await fetch(
      `https://${storeDomain}/admin/api/2026-01/shop.json`,
      {
        method: "GET",
        headers: {
          "X-Shopify-Access-Token": token,
          "Content-Type": "application/json",
        },
        signal: controller.signal,
      }
    );

    clearTimeout(timeout);

    if (response.ok) {
      const responseTime = Date.now() - startTime;
      return {
        status: "healthy",
        message: `Response time: ${responseTime}ms`,
        responseTime,
      };
    } else if (response.status === 401) {
      return {
        status: "unhealthy",
        message: "401 Unauthorized - check your API token",
      };
    } else if (response.status === 429) {
      return {
        status: "unhealthy",
        message: "429 Too Many Requests",
      };
    } else {
      return {
        status: "unhealthy",
        message: `HTTP ${response.status}: ${response.statusText}`,
      };
    }
  } catch (err) {
    clearTimeout(timeout);
    
    if (err instanceof Error) {
      if (err.name === "AbortError") {
        return {
          status: "unhealthy",
          message: "Request timed out after 5s",
        };
      }
      return {
        status: "unhealthy",
        message: `Connection failed: ${err.message}`,
      };
    }
    
    return {
      status: "error",
      message: "Unknown error occurred",
    };
  }
}

export async function POST() {
  try {
    const supabase = await createClient();

    // Authenticate admin
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if admin
    const { data: profile } = await supabase
      .from("profiles")
      .select("is_admin")
      .eq("id", user.id)
      .single();

    if (!profile?.is_admin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Run health check
    const healthResult = await checkShopifyHealth();
    const timestamp = new Date().toISOString();

    // Update database
    const supabaseAdmin = (await import("@/lib/supabase/admin")).default();
    
    const { error } = await supabaseAdmin
      .from("system_settings")
      .update({
        shopify_last_health_check: timestamp,
        shopify_health_status: healthResult.status,
        shopify_health_message: healthResult.message,
        updated_at: timestamp,
      })
      .eq("id", SYSTEM_SETTINGS_ID);

    if (error) {
      console.error("Error updating health check in database:", error);
    }

    // Update cache
    healthCheckCache = {
      status: healthResult.status,
      message: healthResult.message,
      timestamp,
    };

    return NextResponse.json({
      status: healthResult.status,
      message: healthResult.message,
      timestamp,
      responseTime: healthResult.responseTime,
    });
  } catch (err) {
    console.error("Unexpected error in health check:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// Also support GET for cached results
export async function GET() {
  if (healthCheckCache) {
    return NextResponse.json(healthCheckCache);
  }
  
  return NextResponse.json({
    status: "unknown",
    message: "No health check run yet",
    timestamp: null,
  });
}
