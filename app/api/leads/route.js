import { getServiceSupabase } from "@/lib/supabase"

export async function GET(request) {
  const supabase = getServiceSupabase()
  const { searchParams } = new URL(request.url)
  const productId = searchParams.get("product_id")
  const status = searchParams.get("status") || "pending"

  let query = supabase
    .from("leads")
    .select("*, products(name)")
    .order("relevance_score", { ascending: false })
    .order("created_at", { ascending: false })

  if (status !== "all") {
    query = query.eq("status", status)
  }

  if (productId && productId !== "all") {
    query = query.eq("product_id", productId)
  }

  const { data, error } = await query

  if (error) {
    return Response.json({ error: error.message }, { status: 500 })
  }

  return Response.json(data)
}
