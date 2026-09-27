import { NextRequest, NextResponse } from "next/server";
import { createHash, randomUUID } from "node:crypto";
import { homedir } from "node:os";
import path from "node:path";
import { executeLab } from "@/lib/lab";
import { reviewSource } from "@/lib/source-review";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
let scanning = false;
export async function POST(request: NextRequest) {
  const origin = request.headers.get("origin");
  if (origin !== request.nextUrl.origin)
    return NextResponse.json(
      { error: "Same-origin request required." },
      { status: 403 },
    );
  const data = await request.json().catch(() => null);
  if (data?.action === "run" && ["baseline", "hardened"].includes(data.mode)) {
    const record = {
      id: randomUUID(),
      mode: data.mode,
      createdAt: new Date().toISOString(),
      results: executeLab(data.mode),
      provenance:
        "In-process educational fixtures v1. These tests do not execute World Monitor code or contact any network target.",
    };
    const digest = createHash("sha256")
      .update(JSON.stringify(record))
      .digest("hex");
    return NextResponse.json(
      { ...record, digest },
      { headers: { "Cache-Control": "no-store" } },
    );
  }
  if (data?.action === "source") {
    if (scanning)
      return NextResponse.json(
        { error: "A source review is already running." },
        { status: 409 },
      );
    scanning = true;
    try {
      const root =
        process.env.WORLDMONITOR_SOURCE ||
        path.join(
          homedir(),
          "OneDrive",
          "Documents",
          "ChatGPT",
          "Earn",
          "worldmonitor",
        );
      return NextResponse.json(await reviewSource(root), {
        headers: { "Cache-Control": "no-store" },
      });
    } catch (error) {
      return NextResponse.json(
        {
          error:
            error instanceof Error ? error.message : "Source review failed.",
        },
        { status: 422 },
      );
    } finally {
      scanning = false;
    }
  }
  return NextResponse.json(
    { error: "Invalid action or fixture mode." },
    { status: 400 },
  );
}
