import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { campaigns } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { updateStatus } from "@/lib/meta-api";

export async function GET(request: NextRequest) {
  const accountId = request.nextUrl.searchParams.get("accountId");
  if (!accountId) {
    return NextResponse.json({ error: "accountId required" }, { status: 400 });
  }

  try {
    const rows = await db
      .select()
      .from(campaigns)
      .where(eq(campaigns.accountId, accountId));
    return NextResponse.json(rows);
  } catch (error) {
    console.error("Failed to fetch campaigns:", error);
    return NextResponse.json({ error: "Failed to fetch campaigns" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { campaignId, status } = (await request.json()) as {
      campaignId: string;
      status: string;
    };

    // Update on Meta first
    await updateStatus(campaignId, status as "ACTIVE" | "PAUSED");

    // Then update local DB
    await db
      .update(campaigns)
      .set({ status, updatedAt: new Date() })
      .where(eq(campaigns.metaId, campaignId));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to update campaign:", error);
    const message = error instanceof Error ? error.message : "Failed to update campaign";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
