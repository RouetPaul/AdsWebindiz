import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { adSets } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { updateStatus } from "@/lib/meta-api";

export async function GET(request: NextRequest) {
  const campaignId = request.nextUrl.searchParams.get("campaignId");
  if (!campaignId) {
    return NextResponse.json({ error: "campaignId required" }, { status: 400 });
  }

  try {
    const rows = await db
      .select()
      .from(adSets)
      .where(eq(adSets.campaignId, campaignId));
    return NextResponse.json(rows);
  } catch (error) {
    console.error("Failed to fetch ad sets:", error);
    return NextResponse.json({ error: "Failed to fetch ad sets" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { adSetId, status } = (await request.json()) as {
      adSetId: string;
      status: string;
    };

    await updateStatus(adSetId, status as "ACTIVE" | "PAUSED");

    await db
      .update(adSets)
      .set({ status })
      .where(eq(adSets.metaId, adSetId));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to update ad set:", error);
    const message = error instanceof Error ? error.message : "Failed to update ad set";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
