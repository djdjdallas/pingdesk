import { getServiceSupabase } from "@/lib/supabase"

export async function PATCH(request, { params }) {
  try {
    const { id } = await params
    const body = await request.json()
    const supabase = getServiceSupabase()

    const updates = {}
    if (body.status) updates.status = body.status
    if (body.humanized_reply !== undefined) updates.humanized_reply = body.humanized_reply
    if (body.touch !== undefined) updates.touch = body.touch
    if (body.follow_up_reply !== undefined) updates.follow_up_reply = body.follow_up_reply

    if (Object.keys(updates).length === 0) {
      return Response.json({ error: "No valid fields to update" }, { status: 400 })
    }

    const { data, error } = await supabase
      .from("leads")
      .update(updates)
      .eq("id", id)
      .select()
      .single()

    if (error) {
      return Response.json({ error: error.message }, { status: 500 })
    }

    return Response.json(data)
  } catch (err) {
    console.error("Lead update error:", err)
    return Response.json({ error: err.message }, { status: 500 })
  }
}
