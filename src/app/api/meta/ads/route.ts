import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { ads } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { updateStatus } from "@/lib/meta-api";

export async function GET(request: NextRequest) {
  const adSetId = request.nextUrl.searchParams.get("adSetId");
  if (!adSetId) {
    return NextResponse.json({ error: "adSetId required" }, { status: 400 });
  }

  try {
    const rows = await db
      .select()
      .from(ads)
      .where(eq(ads.adSetId, adSetId));
    return NextResponse.json(rows);
  } catch (error) {
    console.error("Failed to fetch ads:", error);
    return NextResponse.json({ error: "Failed to fetch ads" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { adId, status } = (await request.json()) as {
      adId: string;
      status: string;
    };

    await updateStatus(adId, status as "ACTIVE" | "PAUSED");

    await db
      .update(ads)
      .set({ status })
      .where(eq(ads.metaId, adId));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to update ad:", error);
    const message = error instanceof Error ? error.message : "Failed to update ad";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
