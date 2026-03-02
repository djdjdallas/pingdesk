import { humanizeText } from "@/lib/humanizer"

export async function POST(request) {
  try {
    const { text, platform = "reddit", tone = "casual" } = await request.json()

    if (!text) {
      return Response.json({ error: "text is required" }, { status: 400 })
    }

    const humanized = await humanizeText(text, platform, tone)
    return Response.json({ humanized })
  } catch (err) {
    console.error("Humanize error:", err)
    return Response.json({ error: err.message }, { status: 500 })
  }
}
