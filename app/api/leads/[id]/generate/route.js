import { getServiceSupabase } from "@/lib/supabase"
import { callClaude } from "@/lib/claude"
import { humanizeText } from "@/lib/humanizer"

export async function POST(request, { params }) {
  const { id } = await params
  const supabase = getServiceSupabase()

  // 1. Fetch the lead + its product
  const { data: lead, error: leadError } = await supabase
    .from("leads")
    .select("*, products(*)")
    .eq("id", id)
    .single()

  if (leadError || !lead) {
    return Response.json({ error: "Lead not found" }, { status: 404 })
  }

  const product = lead.products
  if (!product) {
    return Response.json({ error: "Product not found for lead" }, { status: 404 })
  }

  try {
    // 2. If no drafted_reply yet, generate one via Claude scoring
    let draftedReply = lead.drafted_reply
    if (!draftedReply) {
      const scoringPrompt = `You are evaluating a Reddit post to determine if the author has a problem that ${product.name} solves.

Product: ${product.name}
What it does: ${product.description}
Product URL: ${product.url}

Reddit Post:
Title: ${lead.post_title}
Body: ${lead.post_body || "(no body)"}
Subreddit: r/${lead.subreddit}

Return ONLY a raw JSON object. No markdown, no backticks:
{
  "drafted_reply": "<2-3 sentence Reddit reply that helps with their actual problem first, then mentions ${product.name} naturally>"
}`

      const result = await callClaude(scoringPrompt)
      const parsed = JSON.parse(result)
      draftedReply = parsed.drafted_reply
    }

    // 3. Humanize the reply
    const humanizedReply = await humanizeText(draftedReply, "reddit", "casual")

    // 4. Generate follow-up reply
    const followUpPrompt = `You are drafting a casual follow-up Reddit message. The person engaged with your first reply about their problem. Now lead with a casual product mention.

Product: ${product.name}
What it does: ${product.description}
Product URL: ${product.url}

Write a 2-3 sentence follow-up in this format:
"Hey — forgot to mention, I actually built a tool that handles this automatically — ${product.name}. [one sentence about what it does for their specific problem]. ${product.url} if you want to check it out."

Return ONLY the message text. No quotes, no explanation.`

    const rawFollowUp = await callClaude(followUpPrompt)
    const followUpReply = await humanizeText(rawFollowUp, "reddit", "casual")

    // 5. Update the lead
    const { data: updated, error: updateError } = await supabase
      .from("leads")
      .update({
        drafted_reply: draftedReply,
        humanized_reply: humanizedReply,
        follow_up_reply: followUpReply,
        humanizer_status: "done",
      })
      .eq("id", id)
      .select()
      .single()

    if (updateError) {
      return Response.json({ error: updateError.message }, { status: 500 })
    }

    return Response.json(updated)
  } catch (err) {
    console.error("Generate reply error:", err)
    return Response.json({ error: err.message }, { status: 500 })
  }
}
