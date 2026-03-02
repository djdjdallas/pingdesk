import { getServiceSupabase } from "@/lib/supabase"

export async function GET() {
  const supabase = getServiceSupabase()

  const { data, error } = await supabase
    .from("composed_messages")
    .select("*, products(name)")
    .order("created_at", { ascending: false })
    .limit(10)

  if (error) {
    return Response.json({ error: error.message }, { status: 500 })
  }

  return Response.json(data)
}
