"use client"

import { useState, useEffect } from "react"
import { AppShell } from "@/components/app-shell"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select"
import {
  Copy,
  Check,
  RefreshCw,
  Save,
  Loader2,
  ChevronDown,
  ChevronUp,
} from "lucide-react"
import { cn } from "@/lib/cn"

const PLATFORMS = ["reddit", "twitter", "email", "instagram"]
const MESSAGE_TYPES = ["reply", "cold_outreach", "follow_up", "dm"]
const TONES = ["casual", "professional", "friendly", "direct"]

function formatRelativeTime(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

export default function ComposePage() {
  return (
    <AppShell>
      {({ products }) => <ComposeContent products={products} />}
    </AppShell>
  )
}

function ComposeContent({ products }) {
  const [productId, setProductId] = useState("")
  const [platform, setPlatform] = useState("reddit")
  const [messageType, setMessageType] = useState("reply")
  const [tone, setTone] = useState("casual")
  const [context, setContext] = useState("")
  const [generating, setGenerating] = useState(false)
  const [rawDraft, setRawDraft] = useState("")
  const [humanizedOutput, setHumanizedOutput] = useState("")
  const [showRawDraft, setShowRawDraft] = useState(false)
  const [copied, setCopied] = useState(false)
  const [humanizing, setHumanizing] = useState(false)
  const [recentMessages, setRecentMessages] = useState([])

  useEffect(() => {
    loadRecentMessages()
  }, [])

  async function loadRecentMessages() {
    try {
      const res = await fetch("/api/messages")
      if (res.ok) {
        const data = await res.json()
        setRecentMessages(data)
      }
    } catch (err) {
      console.error("Failed to load messages:", err)
    }
  }

  async function handleGenerate() {
    if (!context.trim()) return
    setGenerating(true)
    try {
      const res = await fetch("/api/compose", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          product_id: productId || null,
          platform,
          message_type: messageType,
          tone,
          context,
        }),
      })
      const data = await res.json()
      if (data.error) {
        console.error("Compose error:", data.error)
        return
      }
      setRawDraft(data.raw_draft)
      setHumanizedOutput(data.humanized_output)
      loadRecentMessages()
    } catch (err) {
      console.error("Generate failed:", err)
    } finally {
      setGenerating(false)
    }
  }

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(humanizedOutput)
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
        body: JSON.stringify({ text: humanizedOutput, platform, tone }),
      })
      const data = await res.json()
      if (data.humanized) {
        setHumanizedOutput(data.humanized)
      }
    } catch (err) {
      console.error("Re-humanize failed:", err)
    } finally {
      setHumanizing(false)
    }
  }

  function loadMessage(msg) {
    setHumanizedOutput(msg.humanized_output || "")
    setRawDraft(msg.raw_draft || "")
  }

  return (
    <div className="p-6">
      <h2 className="text-xl font-bold mb-6">Compose a Message</h2>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left panel — Inputs */}
        <div className="space-y-4">
          {/* Product selector */}
          <div>
            <label className="text-sm font-medium mb-1 block">Product (optional)</label>
            <Select value={productId} onValueChange={setProductId}>
              <SelectTrigger>
                <SelectValue placeholder="No specific product" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No specific product</SelectItem>
                {products.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Platform */}
          <div>
            <label className="text-sm font-medium mb-1 block">Platform</label>
            <div className="flex gap-1">
              {PLATFORMS.map((p) => (
                <Button
                  key={p}
                  size="sm"
                  variant={platform === p ? "default" : "outline"}
                  onClick={() => setPlatform(p)}
                  className="capitalize flex-1"
                >
                  {p === "twitter" ? "X (Twitter)" : p}
                </Button>
              ))}
            </div>
          </div>

          {/* Message type */}
          <div>
            <label className="text-sm font-medium mb-1 block">Message Type</label>
            <div className="flex gap-1">
              {MESSAGE_TYPES.map((t) => (
                <Button
                  key={t}
                  size="sm"
                  variant={messageType === t ? "default" : "outline"}
                  onClick={() => setMessageType(t)}
                  className="capitalize flex-1"
                >
                  {t.replace("_", " ")}
                </Button>
              ))}
            </div>
          </div>

          {/* Tone */}
          <div>
            <label className="text-sm font-medium mb-1 block">Tone</label>
            <div className="flex gap-1">
              {TONES.map((t) => (
                <Button
                  key={t}
                  size="sm"
                  variant={tone === t ? "default" : "outline"}
                  onClick={() => setTone(t)}
                  className="capitalize flex-1"
                >
                  {t}
                </Button>
              ))}
            </div>
          </div>

          {/* Context textarea */}
          <div>
            <label className="text-sm font-medium mb-1 block">What&apos;s the context?</label>
            <Textarea
              value={context}
              onChange={(e) => setContext(e.target.value)}
              placeholder='e.g. Found someone on r/Flipping asking about tools to check if Facebook items are worth flipping to eBay. Want to mention FlipChecker naturally.'
              className="min-h-[120px]"
            />
          </div>

          {/* Generate button */}
          <Button
            onClick={handleGenerate}
            disabled={generating || !context.trim()}
            className="w-full"
          >
            {generating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Generating...
              </>
            ) : (
              "Generate Message"
            )}
          </Button>
        </div>

        {/* Right panel — Output */}
        <div className="space-y-4">
          {humanizedOutput ? (
            <>
              <Textarea
                value={humanizedOutput}
                onChange={(e) => setHumanizedOutput(e.target.value)}
                className="min-h-[200px] text-sm"
              />

              {/* Raw draft collapsible */}
              {rawDraft && (
                <div>
                  <button
                    onClick={() => setShowRawDraft(!showRawDraft)}
                    className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
                  >
                    {showRawDraft ? (
                      <ChevronUp className="h-3 w-3" />
                    ) : (
                      <ChevronDown className="h-3 w-3" />
                    )}
                    See raw AI draft
                  </button>
                  {showRawDraft && (
                    <div className="mt-1 p-2 bg-muted rounded text-sm text-muted-foreground">
                      {rawDraft}
                    </div>
                  )}
                </div>
              )}

              {/* Action row */}
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={handleCopy}>
                  {copied ? (
                    <Check className="h-3.5 w-3.5" />
                  ) : (
                    <Copy className="h-3.5 w-3.5" />
                  )}
                  {copied ? "Copied" : "Copy Message"}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleReHumanize}
                  disabled={humanizing}
                >
                  <RefreshCw
                    className={cn("h-3.5 w-3.5", humanizing && "animate-spin")}
                  />
                  Re-Humanize
                </Button>
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center h-[200px] border rounded-md border-dashed text-muted-foreground text-sm">
              Generated message will appear here
            </div>
          )}

          {/* Recent Messages */}
          {recentMessages.length > 0 && (
            <>
              <hr className="my-4" />
              <h3 className="text-sm font-semibold">Recent Messages</h3>
              <div className="space-y-2">
                {recentMessages.map((msg) => (
                  <button
                    key={msg.id}
                    onClick={() => loadMessage(msg)}
                    className="w-full text-left p-3 border rounded-md hover:bg-muted transition-colors"
                  >
                    <div className="flex items-center gap-2 mb-1">
                      {msg.products?.name && (
                        <Badge variant="secondary" className="text-xs">
                          {msg.products.name}
                        </Badge>
                      )}
                      <Badge variant="outline" className="text-xs capitalize">
                        {msg.platform}
                      </Badge>
                      <Badge variant="outline" className="text-xs capitalize">
                        {msg.message_type?.replace("_", " ")}
                      </Badge>
                      <span className="text-xs text-muted-foreground ml-auto">
                        {formatRelativeTime(msg.created_at)}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground truncate">
                      {msg.humanized_output?.substring(0, 100)}...
                    </p>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
