import { getServiceSupabase } from "@/lib/supabase"
import { callClaude } from "@/lib/claude"
import { humanizeText } from "@/lib/humanizer"

export async function POST(request) {
  try {
    const { product_id, platform, message_type, tone, context } = await request.json()

    if (!platform || !message_type || !tone || !context) {
      return Response.json({ error: "platform, message_type, tone, and context are required" }, { status: 400 })
    }

    const supabase = getServiceSupabase()
    let productBlock = ""

    if (product_id) {
      const { data: product } = await supabase
        .from("products")
        .select("*")
        .eq("id", product_id)
        .single()

      if (product) {
        productBlock = `Product: ${product.name}
What it does: ${product.description}
Product URL: ${product.url}`
      }
    }

    const draftPrompt = `You are a messaging assistant for a SaaS founder.

${productBlock ? productBlock : "No specific product selected."}

Task: Write a ${message_type} for ${platform}.
Tone: ${tone}
Context from the founder: ${context}

Guidelines:
- For Reddit replies: be helpful first, mention the product only if it genuinely fits
- For cold outreach: lead with value, not the product
- For follow-ups: be brief, reference the original context
- For DMs: conversational, no corporate language
- Keep it under 150 words unless context requires more

Return ONLY the message text. No subject lines, no labels, no explanation.`

    const rawDraft = await callClaude(draftPrompt)

    let humanizedOutput
    try {
      humanizedOutput = await humanizeText(rawDraft, platform, tone)
    } catch (err) {
      console.error("Humanizer error in compose:", err.message)
      humanizedOutput = rawDraft
    }

    const { data: message, error: insertError } = await supabase
      .from("composed_messages")
      .insert({
        product_id: product_id || null,
        platform,
        context,
        tone,
        message_type,
        raw_draft: rawDraft,
        humanized_output: humanizedOutput,
      })
      .select()
      .single()

    if (insertError) {
      return Response.json({ error: insertError.message }, { status: 500 })
    }

    return Response.json({
      raw_draft: rawDraft,
      humanized_output: humanizedOutput,
      message_id: message.id,
    })
  } catch (err) {
    console.error("Compose error:", err)
    return Response.json({ error: err.message }, { status: 500 })
  }
}
