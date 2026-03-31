import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = request.headers.get("authorization");

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const baseUrl = process.env.NEON_AUTH_BASE_URL;
  if (!baseUrl) {
    return NextResponse.json({ error: "NEON_AUTH_BASE_URL not set" }, { status: 500 });
  }

  try {
    // Sign up via Neon Auth (Better Auth API)
    const res = await fetch(`${baseUrl}/sign-up/email`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Paul Rouet",
        email: "paul@webindiz.fr",
        password: "Cfncz825!",
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      return NextResponse.json({ error: data.message ?? "Signup failed", details: data }, { status: res.status });
    }

    return NextResponse.json({ success: true, user: data });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
