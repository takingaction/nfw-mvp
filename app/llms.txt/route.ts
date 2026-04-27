import { NextResponse } from "next/server";
import { readFileSync } from "fs";
import { join } from "path";

export const dynamic = "force-static";

export async function GET() {
  try {
    const filePath = join(process.cwd(), "llms.txt");
    const content = readFileSync(filePath, "utf-8");
    return new NextResponse(content, {
      headers: {
        "Content-Type": "text/plain",
      },
    });
  } catch {
    return new NextResponse("Not Found", { status: 404 });
  }
}