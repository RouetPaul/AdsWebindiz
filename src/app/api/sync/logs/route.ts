import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { syncLog, syncSteps } from "@/lib/db/schema";
import { desc, eq } from "drizzle-orm";

export async function GET(request: NextRequest) {
  const syncId = request.nextUrl.searchParams.get("syncId");

  try {
    if (syncId) {
      // Get steps for a specific sync
      const steps = await db
        .select()
        .from(syncSteps)
        .where(eq(syncSteps.syncId, parseInt(syncId)))
        .orderBy(syncSteps.id);

      const [log] = await db
        .select()
        .from(syncLog)
        .where(eq(syncLog.id, parseInt(syncId)))
        .limit(1);

      return NextResponse.json({ log, steps });
    }

    // Get recent syncs
    const logs = await db
      .select()
      .from(syncLog)
      .orderBy(desc(syncLog.id))
      .limit(20);

    return NextResponse.json({ logs });
  } catch (error) {
    console.error("Failed to fetch sync logs:", error);
    return NextResponse.json({ error: "Failed to fetch logs" }, { status: 500 });
  }
}
