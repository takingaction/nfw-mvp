import { NextRequest, NextResponse } from "next/server";
import https from "https";

export async function GET(request: NextRequest) {
  try {
    const domain = process.env.FRESHDESK_DOMAIN;
    const apiKey = process.env.FRESHDESK_API_KEY;

    if (!domain || !apiKey) {
      return NextResponse.json(
        { error: "Freshdesk not configured" },
        { status: 500 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const startDate = searchParams.get("start_date");
    const endDate = searchParams.get("end_date");

    // Build query params for Freshdesk
    // Freshdesk only supports updated_since for date filtering (not created_after/before)
    const queryParts: string[] = [];
    if (startDate) {
      queryParts.push(`updated_since=${startDate}`);
    }
    // Note: Freshdesk doesn't support end date filtering, so we filter in code

    const queryString = queryParts.join("&");
    const path = `/api/v2/tickets${queryString ? `?${queryString}` : ""}`;

    console.log("[Freshdesk API] Path:", path);

    const credentials = Buffer.from(`${apiKey}:X`).toString("base64");

    // Use https module directly to avoid URL encoding issues with fetch
    const data = await new Promise<string>((resolve, reject) => {
      const options = {
        hostname: domain,
        path: path,
        method: "GET",
        headers: {
          Authorization: `Basic ${credentials}`,
        },
      };

      const req = https.request(options, (res) => {
        let body = "";
        res.on("data", (chunk) => (body += chunk));
        res.on("end", () => resolve(body));
      });
      req.on("error", reject);
      req.end();
    });

    const tickets = JSON.parse(data);

    if (tickets.errors) {
      return NextResponse.json(
        { error: `Freshdesk API error`, details: JSON.stringify(tickets) },
        { status: 400 }
      );
    }

    // Calculate stats - filter by end date client-side since Freshdesk doesn't support it
    const endDateObj = endDate ? new Date(endDate) : null;
    const filteredTickets = endDateObj
      ? tickets.filter((t: any) => new Date(t.created_at) <= endDateObj)
      : tickets;

    const totalTickets = filteredTickets.length;
    const openTickets = filteredTickets.filter(
      (t: any) => t.status === 2 || t.status === 3
    ).length; // Open = 2, Pending = 3
    const resolvedTickets = filteredTickets.filter((t: any) => t.status === 4).length; // Resolved = 4
    const closedTickets = filteredTickets.filter((t: any) => t.status === 5).length; // Closed = 5

    return NextResponse.json({
      total: totalTickets,
      open: openTickets,
      pending: filteredTickets.filter((t: any) => t.status === 3).length,
      resolved: resolvedTickets,
      closed: closedTickets,
      tickets: filteredTickets.slice(0, 20).map((t: any) => ({
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
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
