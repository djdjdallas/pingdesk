import { getServiceSupabase } from "@/lib/supabase"

export async function GET() {
  const supabase = getServiceSupabase()

  const { data: products, error } = await supabase
    .from("products")
    .select("*")
    .eq("is_active", true)
    .order("name")

  if (error) {
    return Response.json({ error: error.message }, { status: 500 })
  }

  // Get pending lead counts per product
  const { data: counts } = await supabase
    .from("leads")
    .select("product_id")
    .eq("status", "pending")

  const countMap = {}
  for (const row of counts || []) {
    countMap[row.product_id] = (countMap[row.product_id] || 0) + 1
  }

  const enriched = products.map((p) => ({
    ...p,
    pending_count: countMap[p.id] || 0,
  }))

  return Response.json(enriched)
}
