import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { adAccounts } from "@/lib/db/schema";

export async function GET() {
  try {
    const accounts = await db.select().from(adAccounts);
    return NextResponse.json(accounts);
  } catch (error) {
    console.error("Failed to fetch accounts:", error);
    return NextResponse.json({ error: "Failed to fetch accounts" }, { status: 500 });
  }
}
