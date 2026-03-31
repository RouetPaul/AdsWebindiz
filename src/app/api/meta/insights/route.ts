import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { dailyInsights } from "@/lib/db/schema";
import { eq, and, gte, lte } from "drizzle-orm";

export async function GET(request: NextRequest) {
  const objectId = request.nextUrl.searchParams.get("objectId");
  const since = request.nextUrl.searchParams.get("since");
  const until = request.nextUrl.searchParams.get("until");

  if (!objectId || !since || !until) {
    return NextResponse.json(
      { error: "objectId, since, and until required" },
      { status: 400 },
    );
  }

  try {
    const rows = await db
      .select()
      .from(dailyInsights)
      .where(
        and(
          eq(dailyInsights.objectId, objectId),
          gte(dailyInsights.date, since),
          lte(dailyInsights.date, until),
        ),
      );
    return NextResponse.json(rows);
  } catch (error) {
    console.error("Failed to fetch insights:", error);
    return NextResponse.json({ error: "Failed to fetch insights" }, { status: 500 });
  }
}
