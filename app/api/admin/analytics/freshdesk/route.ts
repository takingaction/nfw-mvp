import { NextRequest, NextResponse } from "next/server";
import https from "https";
import { requireAdmin } from "@/lib/adminCheck";

// Freshdesk's list endpoint returns at most 100 tickets per page, and without
// updated_since it only returns tickets created in the last 30 days.
const PER_PAGE = 100;
// Stop after this many pages (5,000 tickets) so one request can't exhaust the
// account's per-minute rate limit. The response says when it was truncated.
const MAX_PAGES = 50;
// "All time" lower bound: earlier than any NFW ticket.
const ALL_TIME_SINCE = "2025-01-01T00:00:00Z";

type FreshdeskTicket = {
  id: number;
  subject: string;
  status: number;
  priority: number;
  created_at: string;
  updated_at: string;
};

function getJson(domain: string, path: string, credentials: string): Promise<{ status: number; body: string }> {
  // https module (not fetch) to keep the query string exactly as written.
  return new Promise((resolve, reject) => {
    const req = https.request(
      { hostname: domain, path, method: "GET", headers: { Authorization: `Basic ${credentials}` } },
      (res) => {
        let body = "";
        res.on("data", (chunk) => (body += chunk));
        res.on("end", () => resolve({ status: res.statusCode ?? 0, body }));
      },
    );
    req.on("error", reject);
    req.end();
  });
}

export async function GET(request: NextRequest) {
  const admin = await requireAdmin();
  if (!admin.authorized) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const domain = process.env.FRESHDESK_DOMAIN;
    const apiKey = process.env.FRESHDESK_API_KEY;
    if (!domain || !apiKey) {
      return NextResponse.json({ error: "Freshdesk not configured" }, { status: 500 });
    }

    const startDate = request.nextUrl.searchParams.get("start_date");
    const endDate = request.nextUrl.searchParams.get("end_date");
    const startObj = startDate ? new Date(startDate) : null;
    const endObj = endDate ? new Date(endDate) : null;

    // updated_since >= start returns every ticket created since start
    // (updated_at is never earlier than created_at). The range itself is
    // applied to created_at below.
    const since = startDate || ALL_TIME_SINCE;
    const credentials = Buffer.from(`${apiKey}:X`).toString("base64");

    const tickets: FreshdeskTicket[] = [];
    let truncated = false;
    for (let page = 1; ; page++) {
      if (page > MAX_PAGES) {
        truncated = true;
        break;
      }
      const path = `/api/v2/tickets?updated_since=${since}&per_page=${PER_PAGE}&page=${page}&order_by=created_at&order_type=desc`;
      const { status, body } = await getJson(domain, path, credentials);
      if (status < 200 || status >= 300) {
        console.error("[Freshdesk API] HTTP", status, body.slice(0, 500));
        return NextResponse.json(
          { error: status === 429 ? "Freshdesk rate limit reached, try again in a minute" : `Freshdesk API error (${status})` },
          { status: 502 },
        );
      }
      const batch = JSON.parse(body) as FreshdeskTicket[];
      tickets.push(...batch);
      if (batch.length < PER_PAGE) break;
    }

    const filtered = tickets.filter((t) => {
      const created = new Date(t.created_at);
      if (startObj && created < startObj) return false;
      if (endObj && created > endObj) return false;
      return true;
    });

    const countStatus = (s: number) => filtered.filter((t) => t.status === s).length;

    return NextResponse.json({
      total: filtered.length,
      open: countStatus(2),
      pending: countStatus(3),
      resolved: countStatus(4),
      closed: countStatus(5),
      truncated,
      fetchedAt: new Date().toISOString(),
      tickets: filtered.slice(0, 20).map((t) => ({
        id: t.id,
        subject: t.subject,
        status: t.status,
        priority: t.priority,
        created_at: t.created_at,
        updated_at: t.updated_at,
      })),
    });
  } catch (error) {
    console.error("Freshdesk API error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
