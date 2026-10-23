import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function GET() {
  return NextResponse.json({ app: "diogo-automates", revision: "connection-recovery-v2", pid: process.pid });
}
