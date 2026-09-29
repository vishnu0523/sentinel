import { NextRequest, NextResponse } from "next/server";
import { createHash, randomUUID } from "node:crypto";
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
      const configuredRoot = process.env.WORLDMONITOR_SOURCE?.trim();
      const demoRoot = path.join(
        process.cwd(),
        "tests",
        "fixtures",
        "target-source",
      );
      const review = configuredRoot
        ? await reviewSource(configuredRoot, {
            sourceMode: "configured",
            sourceLabel: "Configured World Monitor checkout",
          }).catch((error) => {
            if (
              error instanceof Error &&
              error.message.startsWith("Source checkout unavailable")
            ) {
              return reviewSource(demoRoot, {
                sourceMode: "demo",
                sourceLabel:
                  "Demo source fixture; configured checkout was unavailable",
              });
            }
            throw error;
          })
        : await reviewSource(demoRoot, {
            sourceMode: "demo",
            sourceLabel: "Demo source fixture",
          });
      return NextResponse.json(review, {
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
