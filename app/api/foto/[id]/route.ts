// GET /api/foto/:id → klinik fotoğrafı. Fotoğraflar değişmez (yeni yükleme yeni kimlik alır),
// bu yüzden tarayıcı ve CDN uzun süre önbellekte tutabilir.
import { getDb } from "@/lib/db";
import { getPhotoFile } from "@/lib/data/photos";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  if (!UUID.test(id)) return new Response("Bulunamadı", { status: 404 });
  const photo = await getPhotoFile(await getDb(), id);
  if (!photo) return new Response("Bulunamadı", { status: 404 });
  const body = new Uint8Array(photo.data);
  return new Response(body, {
    headers: {
      "Content-Type": photo.mimeType,
      "Content-Length": String(body.byteLength),
      "Cache-Control": "public, max-age=31536000, immutable",
      "Content-Security-Policy": "default-src 'none'; sandbox",
    },
  });
}
