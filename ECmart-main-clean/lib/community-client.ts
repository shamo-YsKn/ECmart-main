import { createClient } from "@/lib/supabase/client"
import { GALLERY_PAGE_SIZE, parseGalleryWork } from "@/lib/community-model"

export async function communityRpc<T = unknown>(name: string, args: Record<string, unknown> = {}): Promise<T> {
  const client = await createClient()
  if (!client) throw { code: "P0001", message: "Supabaseの接続設定が必要です。" }
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 15000)
  try {
    const { data, error } = await client.rpc(name, args).abortSignal(controller.signal)
    if (error) throw error
    return data as T
  } finally { clearTimeout(timer) }
}
export async function loadGallery(args: { sort?: string; author?: string | null; offset?: number; id?: string | null } = {}) {
  const data = await communityRpc<unknown[]>("list_diorama_gallery", {
    sort_order: args.sort ?? "new", author_id: args.author ?? null, page_offset: args.offset ?? 0,
    page_size: GALLERY_PAGE_SIZE + 1, work_id: args.id ?? null,
  })
  return (data ?? []).map(parseGalleryWork).filter((row) => row !== null)
}
