import { NextResponse } from "next/server";
import { get, put } from "@vercel/blob";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return NextResponse.json({ error: "Penyimpanan berkas belum dikonfigurasi." }, { status: 503 });
  }
  try {
    const form = await request.formData();
    const file = form.get("file");
    const folder = form.get("folder") === "brand" ? "brand" : "receipts";
    if (!(file instanceof File) || !file.type.startsWith("image/")) {
      return NextResponse.json({ error: "Unggah file gambar yang valid." }, { status: 400 });
    }
    if (file.size > 4 * 1024 * 1024) {
      return NextResponse.json({ error: "Ukuran gambar setelah kompresi maksimal 4 MB." }, { status: 413 });
    }
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "-").slice(-80);
    const uploaded = await put(`${folder}/${crypto.randomUUID()}-${safeName}`, file, {
      access: "private",
      addRandomSuffix: false,
      contentType: file.type,
    });
    return NextResponse.json({ path: uploaded.pathname }, { status: 201 });
  } catch (error) {
    console.error("Receipt upload failed", error);
    return NextResponse.json({ error: "Unggahan gagal. Coba lagi." }, { status: 500 });
  }
}

export async function GET(request: Request) {
  if (!process.env.BLOB_READ_WRITE_TOKEN) return new Response("File tidak tersedia", { status: 404 });
  const path = new URL(request.url).searchParams.get("path");
  if (!path || (!path.startsWith("receipts/") && !path.startsWith("brand/"))) return new Response("File tidak ditemukan", { status: 404 });
  try {
    const blob = await get(path, { access: "private" });
    if (!blob) return new Response("File tidak ditemukan", { status: 404 });
    return new Response(blob.stream, {
      headers: {
        "Content-Type": blob.blob.contentType || "application/octet-stream",
        "Cache-Control": "private, max-age=60",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return new Response("File tidak ditemukan", { status: 404 });
  }
}
