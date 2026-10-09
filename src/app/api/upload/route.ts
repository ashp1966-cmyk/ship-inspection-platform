import { put } from "@vercel/blob";
import { NextResponse } from "next/server";
import { getClaims } from "@/lib/db";
import { requireEditor } from "@/lib/authz";

// POST /api/upload?filename=myfile.jpg
// Body: the raw file bytes (multipart not needed — stream directly)
export async function POST(req: Request) {
  const guard = await requireEditor();
  if ("error" in guard) return guard.error;
  const { searchParams } = new URL(req.url);
  const filename = searchParams.get("filename") ?? `file-${Date.now()}`;
  const claims = await getClaims();
  if (!claims) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  // Namespace blobs per organization so tenants' files never share a path.
  const key = `${claims.organization_id}/${filename.replace(/^\/+/, "")}`;
  try {
    const blob = await put(key, req.body!, {
      access: "public",
      contentType: req.headers.get("content-type") ?? "application/octet-stream",
    });
    return NextResponse.json({ url: blob.url, name: filename });
  } catch (err: any) {
    console.error("Blob upload failed:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
