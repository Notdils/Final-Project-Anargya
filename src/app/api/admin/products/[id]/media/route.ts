import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { guardApi } from "@/lib/admin-guard";
import { supabaseService } from "@/lib/supabase/server";
import { audit } from "@/lib/audit";

const BUCKET = "part-media";
const KINDS = {
  image: { max: 1024 * 1024, column: "image_url" },
  model: { max: 10 * 1024 * 1024, column: "model_url" },
} as const;

// Check the file content, not only its name: images by magic bytes, models by the binary glTF header.
function sniff(kind: keyof typeof KINDS, b: Uint8Array) {
  const s = (i: number, n: number) => String.fromCharCode(...b.slice(i, i + n));
  if (kind === "model") return s(0, 4) === "glTF" ? "glb" : null;
  if (s(0, 4) === "RIFF" && s(8, 4) === "WEBP") return "webp";
  if (b[0] === 0x89 && s(1, 3) === "PNG") return "png";
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "jpg";
  return null;
}

/** Upload a render image or a .glb model for a product (multipart: file, kind=image|model). */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const g = await guardApi("products.write");
  if (g.deny) return NextResponse.json({ error: "forbidden" }, { status: g.deny });
  const id = (await params).id;
  if (!/^[a-z0-9-]{3,60}$/.test(id)) return NextResponse.json({ error: "bad id" }, { status: 400 });
  const form = await req.formData().catch(() => null);
  const kind = form?.get("kind");
  const file = form?.get("file");
  if ((kind !== "image" && kind !== "model") || !(file instanceof File)) return NextResponse.json({ error: "Choose a file." }, { status: 400 });
  const k = KINDS[kind];
  if (file.size === 0 || file.size > k.max)
    return NextResponse.json({ error: kind === "image" ? "Images must be under 1 MB." : "Models must be under 10 MB." }, { status: 400 });
  const bytes = new Uint8Array(await file.arrayBuffer());
  const ext = sniff(kind, bytes);
  if (!ext) return NextResponse.json({ error: kind === "image" ? "Use a WebP, PNG or JPEG image." : "Use a binary glTF (.glb) file." }, { status: 400 });

  const sb = supabaseService();
  if (!sb) return NextResponse.json({ error: "Not configured." }, { status: 503 });
  const path = `products/${id}/${kind}-${Date.now()}.${ext}`;
  const contentType = kind === "model" ? "model/gltf-binary" : `image/${ext === "jpg" ? "jpeg" : ext}`;
  const up = await sb.storage.from(BUCKET).upload(path, bytes, { contentType, cacheControl: "31536000", upsert: false });
  if (up.error) return NextResponse.json({ error: "Upload failed. Is the part-media bucket created (SQL 0011)?" }, { status: 500 });
  const url = sb.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
  const { data, error } = await sb.from("products").update({ [k.column]: url }).eq("id", id).select("id").maybeSingle();
  if (error || !data) return NextResponse.json({ error: "Could not save the file on the product." }, { status: 500 });
  await audit(g.user!, `product.${kind}`, id, { path, size: file.size });
  revalidatePath("/", "layout");
  return NextResponse.json({ url, size: file.size, name: file.name });
}
