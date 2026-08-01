import { readFile, stat } from "fs/promises";
import path from "path";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ARTIFACT_ROOT = path.resolve(process.env.AGENTHUB_ARTIFACT_ROOT ?? path.join(process.cwd(), ".data", "artifacts"));
const MIME_TYPES: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".mp4": "video/mp4",
  ".webm": "video/webm",
  ".mov": "video/quicktime",
  ".pdf": "application/pdf",
  ".md": "text/markdown; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
  ".json": "application/json; charset=utf-8",
};

export async function GET(request: NextRequest, context: { params: { path: string[] } }) {
  const parts = context.params.path ?? [];
  const target = path.resolve(ARTIFACT_ROOT, ...parts);
  if (!target.startsWith(ARTIFACT_ROOT + path.sep)) {
    return NextResponse.json({ error: "非法文件路径" }, { status: 400 });
  }

  try {
    const fileStat = await stat(target);
    if (!fileStat.isFile()) throw new Error("not_file");
    const bytes = await readFile(target);
    const fileName = path.basename(target);
    const disposition = request.nextUrl.searchParams.get("download") === "1" ? "attachment" : "inline";

    return new NextResponse(bytes, {
      headers: {
        "Content-Type": MIME_TYPES[path.extname(fileName).toLowerCase()] ?? "application/octet-stream",
        "Content-Length": String(fileStat.size),
        "Content-Disposition": disposition + "; filename*=UTF-8''" + encodeURIComponent(fileName),
        "Cache-Control": "private, max-age=3600",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return NextResponse.json({ error: "文件不存在" }, { status: 404 });
  }
}