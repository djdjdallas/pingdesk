import { getServiceSupabase } from "@/lib/supabase"
import { callClaude } from "@/lib/claude"
import { humanizeText } from "@/lib/humanizer"

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function fetchReddit(url) {
  // Reddit blocks datacenter IPs with minimal headers — use browser-like
  // headers and old.reddit.com which is less aggressive about blocking.
  const oldUrl = url.replace("https://www.reddit.com", "https://old.reddit.com")
  const response = await fetch(oldUrl, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,application/json;q=0.8,*/*;q=0.7",
      "Accept-Language": "en-US,en;q=0.9",
    },
  })
  if (!response.ok) {
    console.warn(`Reddit fetch failed (${response.status}): ${oldUrl}`)
    return []
  }
  const data = await response.json()
  return (data?.data?.children || []).map((c) => c.data)
}

export async function POST() {
  const supabase = getServiceSupabase()
  const errors = []
  let scanned = 0
  let inserted = 0

  try {
    // 1. Fetch all active products + keyword configs
    const { data: products } = await supabase
      .from("products")
      .select("*, keyword_configs(*)")
      .eq("is_active", true)

    if (!products || products.length === 0) {
      return Response.json({ scanned: 0, inserted: 0, errors: ["No active products found"] })
    }

    // 2. Get existing post_ids for dedup
    const { data: existingLeads } = await supabase
      .from("leads")
      .select("post_id")
    const existingPostIds = new Set((existingLeads || []).map((l) => l.post_id))

    for (const product of products) {
      const configs = product.keyword_configs || []
      const allPosts = []

      for (const config of configs) {
        // Search by keywords
        for (const keyword of config.keywords || []) {
          try {
            const posts = await fetchReddit(
              `https://www.reddit.com/search.json?q=${encodeURIComponent(keyword)}&sort=new&limit=25&t=week`
            )
            allPosts.push(...posts)
            scanned += posts.length
            await sleep(2000)
          } catch (err) {
            errors.push(`Keyword search error "${keyword}": ${err.message}`)
          }
        }

        // Search by subreddits
        for (const subreddit of config.subreddits || []) {
          try {
            const posts = await fetchReddit(
              `https://www.reddit.com/r/${subreddit}/new.json?limit=25`
            )
            allPosts.push(...posts)
            scanned += posts.length
            await sleep(2000)
          } catch (err) {
            errors.push(`Subreddit fetch error "r/${subreddit}": ${err.message}`)
          }
        }
      }

      // 3. Filter: post must contain all significant words from at least one keyword phrase
      // e.g. "facebook to ebay" matches if post contains both "facebook" and "ebay"
      const STOP_WORDS = new Set(["to", "a", "the", "for", "and", "or", "in", "on", "of", "is", "my", "i"])
      const allKeywords = configs.flatMap((c) => c.keywords || [])
      const keywordWordSets = allKeywords.map((kw) =>
        kw.toLowerCase().split(/\s+/).filter((w) => !STOP_WORDS.has(w) && w.length > 1)
      )
      const filtered = allPosts.filter((post) => {
        const text = `${post.title || ""} ${post.selftext || ""}`.toLowerCase()
        return keywordWordSets.some((words) => words.every((w) => text.includes(w)))
      })

      // 4. Deduplicate
      const uniquePosts = []
      const seenIds = new Set()
      for (const post of filtered) {
        if (!seenIds.has(post.id) && !existingPostIds.has(post.id)) {
          seenIds.add(post.id)
          uniquePosts.push(post)
        }
      }

      // 5. Score and draft replies
      for (const post of uniquePosts) {
        try {
          const scoringPrompt = `You are evaluating a Reddit post to determine if the author has a problem that ${product.name} solves.

Product: ${product.name}
What it does: ${product.description}
Product URL: ${product.url}

Reddit Post:
Title: ${post.title}
Body: ${post.selftext || "(no body)"}
Subreddit: r/${post.subreddit}

Return ONLY a raw JSON object. No markdown, no backticks:
{
  "relevance_score": <integer 1-10>,
  "relevance_reason": "<one sentence>",
  "should_reply": <true if score >= 7>,
  "drafted_reply": "<if should_reply true: 2-3 sentence Reddit reply that helps with their actual problem first, then mentions ${product.name} naturally. If false: empty string>"
}`

          const result = await callClaude(scoringPrompt)
          let parsed
          try {
            parsed = JSON.parse(result)
          } catch {
            errors.push(`JSON parse error for post ${post.id}: ${result.substring(0, 100)}`)
            continue
          }

          // Only insert if relevance_score >= 6
          if (parsed.relevance_score < 6) continue

          let humanizedReply = null
          let humanizerStatus = "skipped"

          if (parsed.should_reply && parsed.drafted_reply) {
            try {
              humanizedReply = await humanizeText(parsed.drafted_reply, "reddit", "casual")
              humanizerStatus = "done"
            } catch (err) {
              // Humanizer error — fall back to raw draft
              console.error("Humanizer error:", err.message)
              humanizedReply = parsed.drafted_reply
              humanizerStatus = "done"
              errors.push(`Humanizer fallback for post ${post.id}: ${err.message}`)
            }
          }

          const { error: insertError } = await supabase.from("leads").insert({
            product_id: product.id,
            platform: "reddit",
            post_id: post.id,
            post_url: `https://reddit.com${post.permalink}`,
            post_title: post.title,
            post_body: post.selftext || "",
            subreddit: post.subreddit,
            author: post.author,
            relevance_score: parsed.relevance_score,
            relevance_reason: parsed.relevance_reason,
            drafted_reply: parsed.drafted_reply || null,
            humanized_reply: humanizedReply,
            humanizer_status: humanizerStatus,
            status: "pending",
          })

          if (insertError) {
            errors.push(`Insert error for post ${post.id}: ${insertError.message}`)
          } else {
            inserted++
            existingPostIds.add(post.id)
          }
        } catch (err) {
          errors.push(`Processing error for post ${post.id}: ${err.message}`)
        }
      }
    }
  } catch (err) {
    errors.push(`Scan error: ${err.message}`)
  }

  return Response.json({ scanned, inserted, errors })
}
