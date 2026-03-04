"use client"

import { useState } from "react"
import { Check, Copy, RefreshCw, X, ChevronDown, ChevronUp, ExternalLink, Send, Star, Sparkles, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/cn"
import { PRODUCT_COLORS } from "@/components/sidebar"

function getScoreColor(score) {
  if (score >= 8) return "bg-green-100 text-green-800 border-green-200"
  if (score >= 6) return "bg-yellow-100 text-yellow-800 border-yellow-200"
  return "bg-gray-100 text-gray-800 border-gray-200"
}

function getTouchBadge(touch) {
  if (touch === 2) return "bg-blue-100 text-blue-800 border-blue-200"
  return "bg-purple-100 text-purple-800 border-purple-200"
}

export function LeadCard({ lead, productIndex = 0, onStatusChange }) {
  const [expanded, setExpanded] = useState(false)
  const [showDraft, setShowDraft] = useState(false)
  const [humanizedText, setHumanizedText] = useState(lead.humanized_reply || "")
  const [followUpText, setFollowUpText] = useState(lead.follow_up_reply || "")
  const [copied, setCopied] = useState(false)
  const [copiedFollowUp, setCopiedFollowUp] = useState(false)
  const [humanizing, setHumanizing] = useState(false)
  const [generating, setGenerating] = useState(false)

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(humanizedText)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error("Copy failed:", err)
    }
  }

  async function handleCopyFollowUp() {
    try {
      await navigator.clipboard.writeText(followUpText)
      setCopiedFollowUp(true)
      setTimeout(() => setCopiedFollowUp(false), 2000)
      // Auto-advance to follow_up_ready on copy
      await patchLead({ status: "follow_up_ready", touch: 2 })
    } catch (err) {
      console.error("Copy follow-up failed:", err)
    }
  }

  async function handleReHumanize() {
    setHumanizing(true)
    try {
      const res = await fetch("/api/humanize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: humanizedText, platform: "reddit", tone: "casual" }),
      })
      const data = await res.json()
      if (data.humanized) {
        setHumanizedText(data.humanized)
      }
    } catch (err) {
      console.error("Re-humanize failed:", err)
    } finally {
      setHumanizing(false)
    }
  }

  async function handleGenerateReply() {
    setGenerating(true)
    try {
      const res = await fetch(`/api/leads/${lead.id}/generate`, { method: "POST" })
      const data = await res.json()
      if (data.humanized_reply) {
        setHumanizedText(data.humanized_reply)
      }
      if (data.follow_up_reply) {
        setFollowUpText(data.follow_up_reply)
      }
    } catch (err) {
      console.error("Generate reply failed:", err)
    } finally {
      setGenerating(false)
    }
  }

  async function patchLead(body) {
    try {
      await fetch(`/api/leads/${lead.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      onStatusChange?.(lead.id, body.status)
    } catch (err) {
      console.error("Lead update failed:", err)
    }
  }

  const truncatedBody = lead.post_body && lead.post_body.length > 150
    ? lead.post_body.substring(0, 150) + "..."
    : lead.post_body

  const status = lead.status
  const touch = lead.touch || 1

  return (
    <div className="border rounded-lg p-4 bg-card space-y-3">
      {/* Top row: badges */}
      <div className="flex items-center gap-2 flex-wrap">
        <Badge variant="outline" className="text-xs">
          r/{lead.subreddit}
        </Badge>
        <Badge
          className={cn(
            "text-xs",
            PRODUCT_COLORS[productIndex % PRODUCT_COLORS.length]
          )}
        >
          {lead.products?.name || "Unknown"}
        </Badge>
        <Badge className={cn("text-xs", getScoreColor(lead.relevance_score))}>
          {lead.relevance_score}/10
        </Badge>
        <Badge className={cn("text-xs", getTouchBadge(touch))}>
          Touch {touch}
        </Badge>
      </div>

      {/* Post title */}
      <a
        href={lead.post_url}
        target="_blank"
        rel="noopener noreferrer"
        className="font-medium text-sm hover:underline flex items-center gap-1"
      >
        {lead.post_title}
        <ExternalLink className="h-3 w-3 inline" />
      </a>

      {/* Post body */}
      {lead.post_body && (
        <div className="text-sm text-muted-foreground">
          {expanded ? lead.post_body : truncatedBody}
          {lead.post_body.length > 150 && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="ml-1 text-primary text-xs hover:underline inline-flex items-center gap-0.5"
            >
              {expanded ? (
                <>less <ChevronUp className="h-3 w-3" /></>
              ) : (
                <>more <ChevronDown className="h-3 w-3" /></>
              )}
            </button>
          )}
        </div>
      )}

      {/* AI Draft (collapsed) */}
      {lead.drafted_reply && (
        <div>
          <button
            onClick={() => setShowDraft(!showDraft)}
            className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
          >
            {showDraft ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            AI Draft
          </button>
          {showDraft && (
            <div className="mt-1 p-2 bg-muted rounded text-sm text-muted-foreground">
              {lead.drafted_reply}
            </div>
          )}
        </div>
      )}

      {/* === PENDING STATE: first touch reply === */}
      {status === "pending" && (
        <>
          {humanizedText && (
            <div>
              <p className="text-xs text-muted-foreground mb-1">Humanized Reply (Touch 1)</p>
              <Textarea
                value={humanizedText}
                onChange={(e) => setHumanizedText(e.target.value)}
                className="text-sm min-h-[80px]"
              />
            </div>
          )}

          <div className="flex items-center gap-2 flex-wrap">
            {!humanizedText && (
              <Button
                size="sm"
                variant="outline"
                onClick={handleGenerateReply}
                disabled={generating}
                className="text-purple-700 hover:bg-purple-50"
              >
                {generating ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Sparkles className="h-3.5 w-3.5" />
                )}
                {generating ? "Generating..." : "Generate Reply"}
              </Button>
            )}
            {humanizedText && (
              <>
                <Button size="sm" variant="outline" onClick={handleCopy}>
                  {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                  {copied ? "Copied" : "Copy"}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleReHumanize}
                  disabled={humanizing}
                >
                  <RefreshCw className={cn("h-3.5 w-3.5", humanizing && "animate-spin")} />
                  Re-Humanize
                </Button>
              </>
            )}
            <Button
              size="sm"
              variant="outline"
              className="text-green-700 hover:bg-green-50"
              onClick={() => patchLead({ status: "replied", touch: 1 })}
            >
              <Send className="h-3.5 w-3.5" />
              Mark as Replied
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="text-red-700 hover:bg-red-50"
              onClick={() => patchLead({ status: "dismissed" })}
            >
              <X className="h-3.5 w-3.5" />
              Dismiss
            </Button>
          </div>
        </>
      )}

      {/* === REPLIED STATE: show follow-up === */}
      {status === "replied" && (
        <>
          {followUpText && (
            <div>
              <p className="text-xs text-muted-foreground mb-1">Follow-up Reply (Touch 2)</p>
              <Textarea
                value={followUpText}
                onChange={(e) => setFollowUpText(e.target.value)}
                className="text-sm min-h-[80px]"
              />
            </div>
          )}

          <div className="flex items-center gap-2 flex-wrap">
            {followUpText && (
              <Button size="sm" variant="outline" onClick={handleCopyFollowUp}>
                {copiedFollowUp ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                {copiedFollowUp ? "Copied" : "Copy Follow-up"}
              </Button>
            )}
            <Button
              size="sm"
              variant="outline"
              className="text-green-700 hover:bg-green-50"
              onClick={() => patchLead({ status: "converted" })}
            >
              <Star className="h-3.5 w-3.5" />
              Mark Converted
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="text-red-700 hover:bg-red-50"
              onClick={() => patchLead({ status: "dismissed" })}
            >
              <X className="h-3.5 w-3.5" />
              Dismiss
            </Button>
          </div>
        </>
      )}

      {/* === FOLLOW_UP_READY STATE === */}
      {status === "follow_up_ready" && (
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="outline" className="text-xs text-blue-700">Follow-up sent</Badge>
          <Button
            size="sm"
            variant="outline"
            className="text-green-700 hover:bg-green-50"
            onClick={() => patchLead({ status: "converted" })}
          >
            <Star className="h-3.5 w-3.5" />
            Mark Converted
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="text-red-700 hover:bg-red-50"
            onClick={() => patchLead({ status: "dismissed" })}
          >
            <X className="h-3.5 w-3.5" />
            Dismiss
          </Button>
        </div>
      )}

      {/* === CONVERTED / DISMISSED: read-only === */}
      {(status === "converted" || status === "dismissed") && (
        <Badge variant="outline" className={cn("text-xs", status === "converted" ? "text-green-700" : "text-red-700")}>
          {status === "converted" ? "Converted" : "Dismissed"}
        </Badge>
      )}

      {/* Relevance reason */}
      {lead.relevance_reason && (
        <p className="text-xs italic text-muted-foreground">
          {lead.relevance_reason}
        </p>
      )}
    </div>
  )
}
