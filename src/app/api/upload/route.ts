import { put } from "@vercel/blob";
import { NextResponse } from "next/server";

// POST /api/upload?filename=myfile.jpg
// Body: the raw file bytes (multipart not needed — stream directly)
export async function POST(req: Request) {
  const { searchParams } = new URL(req.url);
  const filename = searchParams.get("filename") ?? `file-${Date.now()}`;
  try {
    const blob = await put(filename, req.body!, {
      access: "public",
      contentType: req.headers.get("content-type") ?? "application/octet-stream",
    });
    return NextResponse.json({ url: blob.url, name: filename });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
