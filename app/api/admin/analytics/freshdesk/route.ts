import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  try {
    await createClient();

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
    const queryParams = new URLSearchParams();
    if (startDate) {
      queryParams.set("created_after", startDate);
    }
    if (endDate) {
      queryParams.set("created_before", endDate);
    }

    const queryString = queryParams.toString();
    const url = `https://${domain}/api/v2/tickets${queryString ? `?${queryString}` : ""}`;

    const credentials = Buffer.from(`${apiKey}:X`).toString("base64");

    const response = await fetch(url, {
      headers: {
        Authorization: `Basic ${credentials}`,
        "Content-Type": "application/json",
      },
      next: { revalidate: 300 }, // Cache for 5 minutes
    });

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json(
        { error: `Freshdesk API error: ${response.status}`, details: errorText },
        { status: response.status }
      );
    }

    const tickets = await response.json();

    // Calculate stats
    const totalTickets = tickets.length;
    const openTickets = tickets.filter(
      (t: any) => t.status === 2 || t.status === 3
    ).length; // Open = 2, Pending = 3
    const resolvedTickets = tickets.filter((t: any) => t.status === 4).length; // Resolved = 4
    const closedTickets = tickets.filter((t: any) => t.status === 5).length; // Closed = 5

    return NextResponse.json({
      total: totalTickets,
      open: openTickets,
      pending: tickets.filter((t: any) => t.status === 3).length,
      resolved: resolvedTickets,
      closed: closedTickets,
      tickets: tickets.slice(0, 20).map((t: any) => ({
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
