"use client"

import { useState } from "react"
import { Check, Copy, RefreshCw, ThumbsUp, X, ChevronDown, ChevronUp, ExternalLink } from "lucide-react"
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

export function LeadCard({ lead, productIndex = 0, onStatusChange }) {
  const [expanded, setExpanded] = useState(false)
  const [showDraft, setShowDraft] = useState(false)
  const [humanizedText, setHumanizedText] = useState(lead.humanized_reply || "")
  const [copied, setCopied] = useState(false)
  const [humanizing, setHumanizing] = useState(false)

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(humanizedText)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error("Copy failed:", err)
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

  async function handleStatus(status) {
    try {
      await fetch(`/api/leads/${lead.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      })
      onStatusChange?.(lead.id, status)
    } catch (err) {
      console.error("Status update failed:", err)
    }
  }

  const truncatedBody = lead.post_body && lead.post_body.length > 150
    ? lead.post_body.substring(0, 150) + "..."
    : lead.post_body

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

      {/* Humanized reply (editable) */}
      {humanizedText && (
        <div>
          <p className="text-xs text-muted-foreground mb-1">Humanized</p>
          <Textarea
            value={humanizedText}
            onChange={(e) => setHumanizedText(e.target.value)}
            className="text-sm min-h-[80px]"
          />
        </div>
      )}

      {/* Action buttons */}
      <div className="flex items-center gap-2 flex-wrap">
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
          onClick={() => handleStatus("approved")}
        >
          <ThumbsUp className="h-3.5 w-3.5" />
          Approve
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="text-red-700 hover:bg-red-50"
          onClick={() => handleStatus("dismissed")}
        >
          <X className="h-3.5 w-3.5" />
          Dismiss
        </Button>
      </div>

      {/* Relevance reason */}
      {lead.relevance_reason && (
        <p className="text-xs italic text-muted-foreground">
          {lead.relevance_reason}
        </p>
      )}
    </div>
  )
}
