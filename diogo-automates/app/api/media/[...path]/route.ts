import { NextResponse } from "next/server";
import fs from "node:fs";
import path from "node:path";
import { Readable } from "node:stream";
import { MEDIA_DIR } from "@/lib/db";

export const runtime = "nodejs";

const MIME: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
  mp4: "video/mp4",
  webm: "video/webm",
  wav: "audio/wav",
  mp3: "audio/mpeg",
};

/** Serves downloaded output from storage/media so the UI never depends on
 *  Higgsfield's URLs, which expire after about a week.
 *
 *  Honours byte ranges: Safari on iPhone won't play a video from a server that
 *  answers a range request with the whole file. */
export async function GET(req: Request, ctx: { params: Promise<{ path: string[] }> }) {
  const { path: segments } = await ctx.params;

  const target = path.resolve(MEDIA_DIR, ...segments);
  // Refuse anything that escapes the media directory.
  if (!target.startsWith(path.resolve(MEDIA_DIR) + path.sep)) {
    return NextResponse.json({ error: "Não encontrado." }, { status: 404 });
  }
  if (!fs.existsSync(target) || !fs.statSync(target).isFile()) {
    return NextResponse.json({ error: "Não encontrado." }, { status: 404 });
  }

  const ext = target.split(".").pop()?.toLowerCase() ?? "";
  const size = fs.statSync(target).size;
  const headers = {
    "Content-Type": MIME[ext] ?? "application/octet-stream",
    // private: behind a password, a shared cache (a tunnel or CDN) must not keep a copy.
    "Cache-Control": "private, max-age=31536000, immutable",
    "Accept-Ranges": "bytes",
  };

  // Single ranges only (`bytes=0-1`, `bytes=100-`, `bytes=-500`), which is
  // what media elements send; anything else gets the whole file.
  const range = /^bytes=(\d*)-(\d*)$/.exec(req.headers.get("range") ?? "");
  if (range && (range[1] || range[2])) {
    const start = range[1] ? Number(range[1]) : Math.max(0, size - Number(range[2]));
    const end = range[1] && range[2] ? Math.min(Number(range[2]), size - 1) : size - 1;
    if (start >= size || start > end) {
      return new NextResponse(null, {
        status: 416,
        headers: { ...headers, "Content-Range": `bytes */${size}` },
      });
    }
    const body = Readable.toWeb(fs.createReadStream(target, { start, end })) as ReadableStream;
    return new NextResponse(body, {
      status: 206,
      headers: {
        ...headers,
        "Content-Range": `bytes ${start}-${end}/${size}`,
        "Content-Length": String(end - start + 1),
      },
    });
  }

  return new NextResponse(fs.readFileSync(target) as unknown as BodyInit, {
    headers: { ...headers, "Content-Length": String(size) },
  });
}
